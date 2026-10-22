/**
 * 2026-10-16 S3：ea 脚本引擎的元素工厂（纯函数，无值依赖，可 node 单测）。
 *
 * 与 image-import.ts 里手写 image 元素同源的问题：0.18.1 的 exports 只给子路径开
 * types 条件、root 也未再导出 newElement 一族，所以这里按 ExcalidrawElement 的
 * 字段形状统一构造（结构跨版本稳定；index/seed 取安全默认，restore/normalize 会重排）。
 *
 * 只覆盖 ea API v1 用到的 8 种类型：rect/diamond/ellipse/arrow/line/text/frame/image。
 * 刻意不做容器绑定文字（bound text）——v1 的文本都是独立元素，脚本要组合自己摆位。
 */

export type EaElementType = "rectangle" | "diamond" | "ellipse" | "arrow" | "line" | "text" | "frame" | "image";

export interface ElementSpec {
  type: EaElementType;
  id?: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  angle?: number;
  /** 文本元素的文字 */
  text?: string;
  fontSize?: number;
  fontFamily?: number;
  textAlign?: "left" | "center" | "right";
  strokeColor?: string;
  backgroundColor?: string;
  fillStyle?: "solid" | "hachure" | "cross-hatch";
  strokeWidth?: number;
  strokeStyle?: "solid" | "dashed" | "dotted";
  roughness?: number;
  opacity?: number;
  /** arrow/line：相对折点（默认 [[0,0],[width,height]]） */
  points?: Array<[number, number]>;
  /** 圆角策略：缺省按类型默认；null = 直角；{type:3} = 大圆角 */
  roundness?: { type: number } | null;
  startArrowhead?: string | null;
  endArrowhead?: string | null;
  /** frame 名称 */
  name?: string;
  link?: string | null;
  groupIds?: string[];
  /** 归属画框（frame-collapse 展开还原用：普通 add* 缺省 null 不进框） */
  frameId?: string | null;
  /** image：二进制文件 id（handle.addFiles 注册过的） */
  fileId?: string;
}

let seq = 0;
/** 稳定自增 id（脚本内每次调用都不同；同一次 addElements 批量也有区分） */
export function nextId(prefix = "ea"): string {
  seq += 1;
  return `${prefix}-${Date.now().toString(36)}-${seq.toString(36)}`;
}

/** 重置 id 序号（仅测试用） */
export function __resetIdSeq(): void {
  seq = 0;
}

function roundnessOf(type: EaElementType): { type: number } | null {
  if (type === "rectangle") return { type: 3 };
  if (type === "diamond" || type === "ellipse") return { type: 2 };
  return null;
}

/** 构造完整元素（返回 unknown record，由调用方 cast 进 scene） */
export function makeElement(spec: ElementSpec): Record<string, unknown> {
  const type = spec.type;
  const width = spec.width ?? (type === "text" ? estimateTextWidth(spec.text ?? "", spec.fontSize ?? 20) : 100);
  const height = spec.height ?? (type === "text" ? (spec.fontSize ?? 20) * 1.25 : type === "line" || type === "arrow" ? 0 : 100);
  const seed = 1_000_000 + (seq % 1_000_000);
  const now = Date.now();
  const el: Record<string, unknown> = {
    id: spec.id ?? nextId(),
    type,
    x: spec.x,
    y: spec.y,
    width,
    height,
    angle: spec.angle ?? 0,
    strokeColor: spec.strokeColor ?? "#1e1e1e",
    backgroundColor: spec.backgroundColor ?? "transparent",
    fillStyle: spec.fillStyle ?? "solid",
    strokeWidth: spec.strokeWidth ?? 2,
    strokeStyle: spec.strokeStyle ?? "solid",
    roughness: spec.roughness ?? 1,
    opacity: spec.opacity ?? 100,
    groupIds: spec.groupIds ?? [],
    frameId: spec.frameId ?? null,
    roundness: spec.roundness !== undefined ? spec.roundness : roundnessOf(type),
    seed,
    version: 1,
    versionNonce: seed,
    index: `a${seq}`,
    isDeleted: false,
    boundElements: null,
    updated: now,
    link: spec.link ?? null,
    locked: false,
  };
  if (type === "text") {
    el.text = spec.text ?? "";
    el.fontSize = spec.fontSize ?? 20;
    el.fontFamily = spec.fontFamily ?? 1;
    el.textAlign = spec.textAlign ?? "left";
    el.verticalAlign = "top";
    el.containerId = null;
    el.originalText = spec.text ?? "";
    el.autoResize = true;
    el.lineHeight = 1.25;
  }
  if (type === "arrow" || type === "line") {
    el.points = spec.points ?? [
      [0, 0],
      [width, height],
    ];
    el.lastCommittedPoint = null;
    el.startBinding = null;
    el.endBinding = null;
    el.startArrowhead = spec.startArrowhead ?? (type === "arrow" ? null : null);
    el.endArrowhead = spec.endArrowhead ?? (type === "arrow" ? "arrow" : null);
    el.elbowed = false;
  }
  if (type === "frame") {
    el.name = spec.name ?? "框架";
  }
  if (type === "image") {
    el.status = "saved";
    el.fileId = spec.fileId ?? null;
    el.scale = [1, 1];
    el.crop = null;
  }
  return el;
}

/** 图形容器 + 绑定文字（rect/diamond/ellipse 且带 text） */
export function hasBoundText(spec: ElementSpec): boolean {
  return !!spec.text && (spec.type === "rectangle" || spec.type === "diamond" || spec.type === "ellipse");
}

/**
 * 一批 ElementSpec → Excalidraw 元素记录。
 *
 * 带 text 的图形按 vendor 的 bound text 形状展开成两个元素（图形 + 居中文字，
 * containerId 回指图形、图形 boundElements 挂文字）。文字继承图形的 fontFamily/
 * strokeColor——预设风格里这两项不是默认值，漏传会让节点变成黑字 Virgil。
 * 返回顺序与 specs 一一对应（容器占两项），调用方按 hasBoundText 对齐 id。
 */
export function expandElementSpecs(specs: ElementSpec[]): Record<string, unknown>[] {
  const els: Record<string, unknown>[] = [];
  for (const s of specs) {
    if (!hasBoundText(s)) {
      els.push(makeElement(s));
      continue;
    }
    const main = makeElement({ ...s, text: undefined });
    const textId = nextId("text");
    const fontSize = s.fontSize ?? 20;
    const innerW = (typeof s.width === "number" ? s.width : 100) - 8;
    const lines = wrapTextByWidth(s.text ?? "", Math.max(20, innerW), fontSize);
    const textW = Math.max(...lines.map((line) => estimateTextWidth(line, fontSize)));
    const textH = Math.ceil(lines.length * fontSize * 1.25);
    const textEl = makeElement({
      type: "text",
      id: textId,
      x: (main.x as number) + (main.width as number) / 2 - textW / 2,
      y: (main.y as number) + (main.height as number) / 2 - textH / 2,
      width: textW,
      height: textH,
      text: lines.join("\n"),
      fontSize,
      fontFamily: s.fontFamily,
      strokeColor: s.strokeColor,
      textAlign: "center",
    }) as Record<string, unknown>;
    textEl.containerId = main.id;
    textEl.verticalAlign = "middle";
    main.boundElements = [{ id: textId, type: "text" }];
    els.push(main, textEl);
  }
  return els;
}

/** 文本宽度粗估（与 Excalidraw 的 measureText 量级一致即可，脚本布局用） */
export function estimateTextWidth(text: string, fontSize: number): number {
  let units = 0;
  for (const ch of text) units += /[\u4e00-\u9fff\uff00-\uffef\u3000-\u303f]/.test(ch) ? 1 : 0.56;
  return Math.ceil(units * fontSize);
}

/* ------------------------------------------------------------------ */
/* 第三十二轮：几何纯函数（getBoundingBox / connectObjects 的底层）      */
/* ------------------------------------------------------------------ */

export type Box = { minX: number; minY: number; maxX: number; maxY: number; width: number; height: number; cx: number; cy: number };

/** 单元素的轴对齐包围盒（angle 旋转后取四角；line/arrow 按 points 偏移算） */
export function elementBounds(el: {
  x: number; y: number; width: number; height: number; angle?: number;
  points?: Array<[number, number]>;
}): Box {
  let minX = el.x;
  let minY = el.y;
  let maxX = el.x + el.width;
  let maxY = el.y + el.height;
  if (el.points && el.points.length > 0) {
    minX = minY = Infinity;
    maxX = maxY = -Infinity;
    for (const [px, py] of el.points) {
      minX = Math.min(minX, el.x + px);
      minY = Math.min(minY, el.y + py);
      maxX = Math.max(maxX, el.x + px);
      maxY = Math.max(maxY, el.y + py);
    }
  }
  const angle = el.angle ?? 0;
  if (angle !== 0) {
    // 四角绕元素中心旋转后再取包围盒
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const corners: Array<[number, number]> = [
      [minX, minY],
      [maxX, minY],
      [minX, maxY],
      [maxX, maxY],
    ];
    let rx1 = Infinity;
    let ry1 = Infinity;
    let rx2 = -Infinity;
    let ry2 = -Infinity;
    for (const [px, py] of corners) {
      const dx = px - cx;
      const dy = py - cy;
      const nx = cx + dx * cos - dy * sin;
      const ny = cy + dx * sin + dy * cos;
      rx1 = Math.min(rx1, nx);
      ry1 = Math.min(ry1, ny);
      rx2 = Math.max(rx2, nx);
      ry2 = Math.max(ry2, ny);
    }
    minX = rx1;
    minY = ry1;
    maxX = rx2;
    maxY = ry2;
  }
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY, cx: (minX + maxX) / 2, cy: (minY + maxY) / 2 };
}

/** 多元素的公共包围盒（空集返回 null） */
export function boundingBoxOf(els: Array<{ x: number; y: number; width: number; height: number; angle?: number; points?: Array<[number, number]> }>): Box | null {
  if (els.length === 0) return null;
  const boxes = els.map(elementBounds);
  const minX = Math.min(...boxes.map((b) => b.minX));
  const minY = Math.min(...boxes.map((b) => b.minY));
  const maxX = Math.max(...boxes.map((b) => b.maxX));
  const maxY = Math.max(...boxes.map((b) => b.maxY));
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY, cx: (minX + maxX) / 2, cy: (minY + maxY) / 2 };
}

export type Side = "top" | "bottom" | "left" | "right";

/** 元素某侧边的锚点（连接线端点用；angle 非 0 时取包围盒中心兜底） */
export function anchorPoint(el: { x: number; y: number; width: number; height: number; angle?: number }, side: Side): { x: number; y: number } {
  if ((el.angle ?? 0) !== 0) {
    return { x: el.x + el.width / 2, y: el.y + el.height / 2 };
  }
  switch (side) {
    case "top":
      return { x: el.x + el.width / 2, y: el.y };
    case "bottom":
      return { x: el.x + el.width / 2, y: el.y + el.height };
    case "left":
      return { x: el.x, y: el.y + el.height / 2 };
    case "right":
      return { x: el.x + el.width, y: el.y + el.height / 2 };
  }
}

/** 几何最近侧（"auto" 连接用）：从本元素中心指向对方中心的方位 */
export function nearestSide(from: { x: number; y: number; width: number; height: number }, to: { x: number; y: number; width: number; height: number }): Side {
  const dx = to.x + to.width / 2 - (from.x + from.width / 2);
  const dy = to.y + to.height / 2 - (from.y + from.height / 2);
  if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? "right" : "left";
  return dy >= 0 ? "bottom" : "top";
}

/** 按显示宽度把文本分行（中文按 1、英文按 0.56 个字宽计，超宽即换行） */
export function wrapTextByWidth(text: string, maxWidth: number, fontSize: number): string[] {
  const lines: string[] = [];
  for (const raw of text.split("\n")) {
    let line = "";
    let width = 0;
    for (const ch of raw) {
      const w = /[\u4e00-\u9fff\uff00-\uffef\u3000-\u303f]/.test(ch) ? 1 : 0.56;
      if (line !== "" && width + w > maxWidth / fontSize) {
        lines.push(line);
        line = ch;
        width = w;
      } else {
        line += ch;
        width += w;
      }
    }
    lines.push(line);
  }
  return lines;
}
