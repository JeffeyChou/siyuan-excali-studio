/**
 * 图片转素材（2026-10-21 P1/P2）：把画布上选中的位图转成原生元素，可替换回画布、
 * 也可打包成素材库条目。两条互补路线：
 * - 笔画（轻量）：描成 freedraw，元素多、细节少，适合线稿/简笔；
 * - 轮廓（高保真）：按墨色浓淡分层 keyhole 填充，元素少、还原度高，适合毛笔字/图标。
 *
 * 分层：
 * - 本文件是纯逻辑（选区判定 / 裁切换算 / 场景替换 / 素材库打包 / 两条路线分发）；
 * - ink-trace 管「RGBA → 笔画元素」；ink-outline 管「RGBA → 轮廓填充元素」；
 * - ImageToMaterialDialog 负责 DOM 解码、预览与按钮；
 * - 画布与宿主的接线在 StudioApp / index.ts。
 *
 * 纯逻辑不 import vendor / React / 思源，node 单测可直接跑。
 */

import {
  traceImageToFreedraws,
  type RgbaImage,
  type TraceImageElement,
  type TraceOptions,
} from "./ink-trace.ts";
import {
  outlineImageToShapes,
  makeOutlineRecipe,
  OUTLINE_LAYERS,
  type OutlineBuild,
  type OutlineLayerSpec,
  type OutlineOptions,
} from "./ink-outline.ts";

export type ImageCropLike = {
  x: number;
  y: number;
  width: number;
  height: number;
  naturalWidth: number;
  naturalHeight: number;
};

/** 只声明转换需要读的字段；真实元素可以多带东西 */
export type ImageLike = {
  id: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  angle?: number;
  index?: string;
  frameId?: string | null;
  link?: string | null;
  groupIds?: readonly string[] | null;
  fileId?: string | null;
  scale?: readonly [number, number] | null;
  crop?: ImageCropLike | null;
  isDeleted?: boolean;
};

export type ImageTarget =
  | { kind: "ok"; image: ImageLike }
  | { kind: "none" }
  | { kind: "not-image"; selected: number }
  | { kind: "multiple"; selected: number };

/**
 * 选区判定：选中项里必须恰好一张**未删除**的图片。
 * 允许同组其他元素一起被选中（点组里的图片会整组选中）；但出现第二张图片就拒绝——
 * 宁可提示，也不猜用户想转哪一张。
 */
export function pickImageTarget(
  elements: readonly ImageLike[],
  selectedIds: readonly string[],
): ImageTarget {
  const selected = new Set(selectedIds);
  const hits = elements.filter((e) => !e.isDeleted && selected.has(e.id));
  if (hits.length === 0) return { kind: "none" };
  const images = hits.filter((e) => e.type === "image");
  if (images.length > 1) return { kind: "multiple", selected: images.length };
  if (images.length === 0) return { kind: "not-image", selected: hits.length };
  return { kind: "ok", image: images[0] };
}

/** 给 StudioApp 的提示文案 key（纯模块不引 i18n，翻译由调用方 t()） */
export function imageTargetMessageKey(target: ImageTarget): string | null {
  if (target.kind === "none") return "请先选中一张图片，再使用这个动作";
  if (target.kind === "multiple") return "一次只能转换一张图片";
  if (target.kind === "not-image") return "选中项不是图片";
  return null;
}

/* ------------------------------ 细节档位 ------------------------------ */

export type TraceDetail = "simple" | "standard" | "fine";

export type TraceDetailMeta = {
  id: TraceDetail;
  /** i18n key：中文原文即 key */
  label: string;
  params: TraceOptions;
};

/**
 * 三档只动「保留多少笔 / 采样多密」，不动颜色与几何。
 * 默认标准档沿用毛笔实测参数（ALPHA=32、MINLEN=4、MINAREA=12 的量级）。
 */
export const TRACE_DETAILS: readonly TraceDetailMeta[] = [
  {
    id: "simple",
    label: "简洁",
    params: { maxStrands: 36, minStrandLength: 8, minStrandArea: 36, maxPoints: 32, alphaThreshold: 32 },
  },
  {
    id: "standard",
    label: "标准",
    params: { maxStrands: 80, minStrandLength: 5, minStrandArea: 16, maxPoints: 48, alphaThreshold: 32 },
  },
  {
    id: "fine",
    label: "精细",
    params: { maxStrands: 160, minStrandLength: 3, minStrandArea: 8, maxPoints: 64, alphaThreshold: 24 },
  },
];

export function traceDetailOf(id: TraceDetail): TraceDetailMeta {
  return TRACE_DETAILS.find((d) => d.id === id) ?? TRACE_DETAILS[1];
}

/* ------------------------------ 解码换算 ------------------------------ */

export type SourceRect = { x: number; y: number; width: number; height: number };

/**
 * 元素裁切框 → 原图像素源矩形。crop 的 x/y/width/height 都是**原图像素**
 * （vendor 的裁剪 UI 直接拿它跟 naturalWidth 比），这里再夹一次边界防脏值。
 */
export function sourceRectOf(
  image: Pick<ImageLike, "crop"> | null | undefined,
  naturalWidth: number,
  naturalHeight: number,
): SourceRect {
  const nw = Math.max(1, naturalWidth);
  const nh = Math.max(1, naturalHeight);
  const crop = image?.crop;
  if (!crop || !(crop.width > 0) || !(crop.height > 0)) {
    return { x: 0, y: 0, width: nw, height: nh };
  }
  const x = Math.min(Math.max(0, crop.x), nw - 1);
  const y = Math.min(Math.max(0, crop.y), nh - 1);
  const width = Math.max(1, Math.min(crop.width, nw - x));
  const height = Math.max(1, Math.min(crop.height, nh - y));
  return { x, y, width, height };
}

function loadImage(dataURL: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("decode-failed"));
    img.src = dataURL;
  });
}

/**
 * dataURL → RGBA。按裁切取源矩形、按 scale 翻转、按最长边缩到 maxDim——
 * 缩的是采样分辨率，不是元素尺寸；描迹坐标后续仍按原元素宽高映射。
 */
export async function decodeImageForTrace(
  dataURL: string,
  image: Pick<ImageLike, "crop" | "scale"> | null,
  maxDim = 1024,
): Promise<RgbaImage> {
  const img = await loadImage(dataURL);
  const nw = img.naturalWidth || img.width;
  const nh = img.naturalHeight || img.height;
  if (!(nw > 0) || !(nh > 0)) throw new Error("decode-failed");
  const src = sourceRectOf(image, nw, nh);
  const ratio = Math.min(1, maxDim / Math.max(src.width, src.height));
  const w = Math.max(1, Math.round(src.width * ratio));
  const h = Math.max(1, Math.round(src.height * ratio));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("decode-failed");

  const flipX = (image?.scale?.[0] ?? 1) < 0;
  const flipY = (image?.scale?.[1] ?? 1) < 0;
  ctx.translate(flipX ? w : 0, flipY ? h : 0);
  ctx.scale(flipX ? -1 : 1, flipY ? -1 : 1);
  ctx.drawImage(img, src.x, src.y, src.width, src.height, 0, 0, w, h);
  return { width: w, height: h, data: ctx.getImageData(0, 0, w, h).data };
}

/* ------------------------------ 描迹与打包 ------------------------------ */

export type TraceMeta = {
  groupId?: string;
  idPrefix?: string;
  seedBase?: number;
  now?: number;
  outerGroupIds?: string[];
};

export type TraceStats = {
  strokes: number;
  points: number;
  strokeColor: string;
};

export type TraceBuild = {
  elements: Record<string, unknown>[];
  stats: TraceStats;
};

function pointsOf(el: Record<string, unknown>): number {
  return Array.isArray(el.points) ? el.points.length : 0;
}

function statOf(elements: Record<string, unknown>[]): TraceStats {
  const points = elements.reduce((n, el) => n + pointsOf(el), 0);
  const color = elements[0]?.strokeColor;
  return {
    strokes: elements.length,
    points,
    strokeColor: typeof color === "string" ? color : "",
  };
}

/** RGBA → 笔画 + 统计（预览、按钮文案共用一份数据） */
export function traceImageToStrokes(
  img: RgbaImage,
  image: ImageLike,
  detail: TraceDetail,
  meta: TraceMeta = {},
): TraceBuild {
  const el: TraceImageElement = {
    id: image.id,
    x: image.x,
    y: image.y,
    width: image.width,
    height: image.height,
    angle: image.angle,
    index: image.index,
    frameId: image.frameId ?? null,
    link: image.link ?? null,
  };
  const elements = traceImageToFreedraws(img, el, {
    ...traceDetailOf(detail).params,
    outerGroupIds: meta.outerGroupIds ?? [...(image.groupIds ?? [])],
    groupId: meta.groupId,
    idPrefix: meta.idPrefix,
    seedBase: meta.seedBase,
    now: meta.now,
  });
  return { elements, stats: statOf(elements) };
}

function idOf(el: unknown): string {
  return el && typeof el === "object" && typeof (el as { id?: unknown }).id === "string"
    ? (el as { id: string }).id
    : "";
}

/** 场景替换：删原图，笔画插回原图层位置（其余元素原样、顺序不动） */
export function canvasReplacement(
  scene: readonly unknown[],
  imageId: string,
  strokes: readonly unknown[],
): unknown[] {
  const at = scene.findIndex((el) => idOf(el) === imageId);
  const out = scene.filter((el) => idOf(el) !== imageId);
  out.splice(at >= 0 && at <= out.length ? at : out.length, 0, ...strokes);
  return out;
}

export type LibraryItemLike = {
  id: string;
  status: "unpublished";
  elements: Record<string, unknown>[];
  created: number;
  name?: string;
  /** 配方素材会挂 excaliRecipe（分层参数 + 墨色 + 原图），随条目往返存活 */
  excaliRecipe?: unknown;
};

function token(): string {
  return Math.random().toString(36).slice(2, 8);
}

/**
 * 转换产物 → 素材库条目（笔画与轮廓两条路线共用）：
 * - 单组（入库后拖出来整幅一起选）；
 * - 断掉 frameId / link / 外层分组（素材库条目不该继承某块画布的归属）；
 * - 重发 id/index/seed（同一次转换可能在画布上也留了一份，id 不能撞）；
 * - status 用 vendor「Add to library」同款 unpublished；
 * - 带配方时把 excaliRecipe 挂在条目上——vendor 的 restoreLibraryItem 返回
 *   `{...libraryItem, elements}`，条目级自定义字段双向存活，脚本侧据此重生成。
 */
export function libraryItemFromStrokes(
  strokes: readonly Record<string, unknown>[],
  opts: {
    name?: string;
    now?: number;
    itemId?: string;
    groupId?: string;
    idPrefix?: string;
    seedBase?: number;
    recipe?: unknown;
  } = {},
): LibraryItemLike {
  if (strokes.length === 0) throw new Error("empty-strokes");
  const now = opts.now ?? Date.now();
  const itemId = opts.itemId ?? `lib-i2m-${now.toString(36)}-${token()}`;
  const groupId = opts.groupId ?? `g-lib-${now.toString(36)}-${token()}`;
  const idPrefix = opts.idPrefix ?? `fr-lib-${now.toString(36)}-${token()}`;
  const seedBase = opts.seedBase ?? Math.floor(Math.random() * 2 ** 31);

  const elements = strokes.map((el, i) => ({
    ...el,
    id: `${idPrefix}-${i}`,
    groupIds: [groupId],
    frameId: null,
    link: null,
    locked: false,
    index: `a${i.toString(36).padStart(2, "0")}`,
    seed: seedBase + i * 7919,
    versionNonce: seedBase + i * 7919,
    updated: now,
  }));

  return {
    id: itemId,
    status: "unpublished",
    elements,
    created: now,
    ...(opts.name ? { name: opts.name } : {}),
    ...(opts.recipe ? { excaliRecipe: opts.recipe } : {}),
  };
}

/* ------------------------------------------------------------------ */
/* 轮廓（高保真）路线                                                  */
/* ------------------------------------------------------------------ */

export type MaterialMode = "stroke" | "outline";

export type MaterialModeMeta = {
  id: MaterialMode;
  /** i18n key：中文原文即 key */
  label: string;
  /** 一句话说明这个档位换来什么（弹窗顶部提示用） */
  hint: string;
};

/**
 * 两条路线并列，不是档位高低：笔画按笔触描线（元素多、适合简笔），
 * 轮廓按墨色浓淡分层填充（元素少、还原度高、适合毛笔字与实心图形）。
 */
export const MATERIAL_MODES: readonly MaterialModeMeta[] = [
  {
    id: "stroke",
    label: "笔画（轻量）",
    hint: "把选中的图片描成一组原生笔画：可改描边色、可进素材库。只保留墨迹形状，不保留照片细节。",
  },
  {
    id: "outline",
    label: "轮廓（高保真）",
    hint: "按墨色浓淡分层填充整幅图：可改填充色、可缩放、可进素材库，还原度最高，适合毛笔字、图标与实心图形。",
  },
];

export function materialModeOf(id: MaterialMode): MaterialModeMeta {
  return MATERIAL_MODES.find((m) => m.id === id) ?? MATERIAL_MODES[0];
}

/** 轮廓档的细节档位：只动「分几层 / 每层多浓 / 简化多狠」，不动墨色与几何 */
export type OutlineDetail = "soft" | "standard" | "sharp";

export type OutlineDetailMeta = {
  id: OutlineDetail;
  /** i18n key：中文原文即 key */
  label: string;
  layers: readonly OutlineLayerSpec[];
};

const L = OUTLINE_LAYERS;

export const OUTLINE_DETAILS: readonly OutlineDetailMeta[] = [
  // 柔和：三层、简化狠 → 元素少、点少，适合当图标素材反复复用
  { id: "soft", label: "柔和", layers: [L[0], L[1], L[3]] },
  // 标准：四层全上（实测 IoU 0.958 的那一组）
  { id: "standard", label: "标准", layers: L },
  // 锐利：五层加密 + 简化更轻 → 细节多、点数多
  {
    id: "sharp",
    label: "锐利",
    layers: [
      L[0],
      { threshold: 0.22, opacity: 36, smooth: 0.6, tolerance: 0.7, minArea: 1 },
      L[1],
      L[2],
      { threshold: 0.68, opacity: 82, smooth: 0.85, tolerance: 0.9, minArea: 4 },
      L[3],
    ],
  },
];

export function outlineDetailOf(id: OutlineDetail): OutlineDetailMeta {
  return OUTLINE_DETAILS.find((d) => d.id === id) ?? OUTLINE_DETAILS[1];
}

/** 两条路线统一的产物形状（弹窗一套代码两用） */
export type MaterialBuild = {
  elements: Record<string, unknown>[];
  /** 笔画路线的统计口径 */
  stats: { strokes: number; points: number; strokeColor: string };
  /** 轮廓路线的统计口径 */
  outline?: OutlineBuild["stats"];
  /** 轮廓路线带的配方（入库时挂到条目上，脚本侧据此重生成） */
  recipe?: unknown;
};

/** RGBA → 轮廓填充元素 + 统计 + 配方 */
export function traceImageToOutline(
  img: RgbaImage,
  image: ImageLike,
  detail: OutlineDetail,
  meta: TraceMeta = {},
  extra: { strokeColor?: string; dataURL?: string } = {},
): MaterialBuild {
  const spec = outlineDetailOf(detail);
  // 配方先造：它要挂到每个元素上（脚本读元素上的 excaliRecipe）
  const recipe = makeOutlineRecipe({
    layers: spec.layers,
    strokeColor: extra.strokeColor,
    sourceWidth: img.width,
    sourceHeight: img.height,
    dataURL: extra.dataURL,
    now: meta.now,
  });
  const build: OutlineBuild = outlineImageToShapes(img, image, {
    layers: spec.layers,
    strokeColor: extra.strokeColor,
    recipe,
    outerGroupIds: meta.outerGroupIds ?? [...(image.groupIds ?? [])],
    groupId: meta.groupId,
    idPrefix: meta.idPrefix,
    seedBase: meta.seedBase,
    now: meta.now,
  } satisfies OutlineOptions);
  return {
    elements: build.elements,
    stats: {
      strokes: build.elements.length,
      points: build.elements.reduce((n, el) => n + ((el.points as unknown[] | undefined)?.length ?? 0), 0),
      strokeColor: build.stats.strokeColor,
    },
    outline: build.stats,
    recipe,
  };
}
