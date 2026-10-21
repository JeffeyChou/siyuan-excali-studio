/**
 * 图片转笔画（2026-10-21）：把位图描成原生 freedraw。
 *
 * 为什么需要：vendor 的 image 元素没有描边/背景色字段，属性面板改不了颜色；
 * 内置素材库又硬编码拒收 image/iframe/embeddable（vRe），所以「毛笔画」这类
 * 位图既不能像矩形那样换色，也进不了素材库。freedraw 是原生矢量笔画：描边色
 * 可改、可缩放、素材库接收，是这类装饰笔画唯一能两全的落点。
 *
 * 做法不是完整矢量化（0.18.1 没有任意 path 元素），而是按列切「墨迹带」：
 * 每一列取连续的 ink run，跨列按重叠接成一根横向笔画，笔宽取 run 的厚度。
 * 毛笔的飞白/毛边会自然拆成多根细带，厚实核心是一根宽带；分组后一起改色。
 *
 * 纯逻辑模块：不碰 canvas、不 import vendor，node 测试可直接喂 RGBA 像素。
 */

import { extractSkeletonStrands, pickTraceMethod } from "./ink-skeleton.ts";

export type RgbaImage = {
  width: number;
  height: number;
  data: Uint8ClampedArray | Uint8Array;
};

export type InkMask = {
  width: number;
  height: number;
  /** 1 = 墨迹，0 = 背景；索引 = y * width + x */
  bits: Uint8Array;
};

export type TracePoint = { x: number; y: number; thickness: number };
export type TraceStrand = TracePoint[];

export type TraceImageElement = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  angle?: number;
  index?: string;
  frameId?: string | null;
  link?: string | null;
};

export type TraceOptions = {
  /** 最多保留多少根笔画（按墨量排序；0 = 不限） */
  maxStrands?: number;
  /** 低于这个列数（px）的碎带丢弃 */
  minStrandLength?: number;
  /** 低于这个墨量（px²）的碎带丢弃 */
  minStrandArea?: number;
  /** 单根笔画最多采多少点（横向每隔几列取一个） */
  maxPoints?: number;
  /** 不透明背景的键色阈值：与背景色的曼哈顿距离（0..765） */
  backgroundThreshold?: number;
  /** 透明背景的 alpha 阈值（0..255） */
  alphaThreshold?: number;
  /** 指定描边色；缺省取墨迹平均色 */
  strokeColor?: string;
  /** 原图所在的外层分组（替换到画布时沿用；素材库条目会剥掉） */
  outerGroupIds?: string[];
  /** 描迹方式：auto = 横长笔触走列扫、方图/转弯走骨架（默认） */
  method?: "auto" | "column" | "skeleton";
  /** 测试注入：固定分组 id / id 前缀 / 种子 / 时间 */
  groupId?: string;
  idPrefix?: string;
  seedBase?: number;
  now?: number;
};

const DEFAULTS = {
  maxStrands: 60,
  minStrandLength: 6,
  minStrandArea: 24,
  maxPoints: 48,
  backgroundThreshold: 96,
  alphaThreshold: 64,
};

const FREEDRAW_SIZE_FACTOR = 4.25;
/** vendor freedraw 的 thinning 固定 0.6；压力 0.5 时直径 = size */
const THINNING = 0.6;

function px(img: RgbaImage, x: number, y: number): number {
  return (y * img.width + x) * 4;
}

/**
 * 背景判定：
 * - 边缘多数透明 → 按 alpha 抠图（PNG/WebP 的常规形态）；
 * - 边缘不透明 → 取边缘出现最多的量化色当底色，按颜色距离抠图。
 *   毛笔这张的 SVG 外壳带一层白底，单看 alpha 会得到整块矩形，必须走这一支。
 */
export function buildInkMask(img: RgbaImage, opts: TraceOptions = {}): InkMask {
  const alphaThreshold = opts.alphaThreshold ?? DEFAULTS.alphaThreshold;
  const bgThreshold = opts.backgroundThreshold ?? DEFAULTS.backgroundThreshold;
  const { width: w, height: h, data } = img;
  const bits = new Uint8Array(w * h);
  if (w <= 0 || h <= 0) return { width: w, height: h, bits };

  const samples: Array<{ r: number; g: number; b: number; a: number }> = [];
  const step = Math.max(1, Math.floor(Math.min(w, h) / 32));
  const push = (x: number, y: number): void => {
    const i = px(img, x, y);
    samples.push({ r: data[i], g: data[i + 1], b: data[i + 2], a: data[i + 3] });
  };
  for (let x = 0; x < w; x += step) {
    push(x, 0);
    push(x, h - 1);
  }
  for (let y = 0; y < h; y += step) {
    push(0, y);
    push(w - 1, y);
  }

  const transparent = samples.filter((s) => s.a < 24).length;
  const transparentBg = samples.length > 0 && transparent / samples.length >= 0.35;

  if (transparentBg) {
    for (let i = 0, n = w * h; i < n; i++) bits[i] = data[i * 4 + 3] >= alphaThreshold ? 1 : 0;
    return { width: w, height: h, bits };
  }

  // 量化到 4bit/通道，取众数桶的平均色（对纯色底/白底最稳；渐变底取主色）
  const buckets = new Map<number, { n: number; r: number; g: number; b: number }>();
  for (const s of samples) {
    if (s.a < 24) continue;
    const key = ((s.r >> 4) << 8) | ((s.g >> 4) << 4) | (s.b >> 4);
    const cur = buckets.get(key) ?? { n: 0, r: 0, g: 0, b: 0 };
    cur.n += 1;
    cur.r += s.r;
    cur.g += s.g;
    cur.b += s.b;
    buckets.set(key, cur);
  }
  let bg = { r: 255, g: 255, b: 255 };
  let best = 0;
  for (const b of buckets.values()) {
    if (b.n > best) {
      best = b.n;
      bg = { r: Math.round(b.r / b.n), g: Math.round(b.g / b.n), b: Math.round(b.b / b.n) };
    }
  }

  for (let i = 0, n = w * h; i < n; i++) {
    const p = i * 4;
    if (data[p + 3] < 16) continue;
    const dist = Math.abs(data[p] - bg.r) + Math.abs(data[p + 1] - bg.g) + Math.abs(data[p + 2] - bg.b);
    bits[i] = dist >= bgThreshold ? 1 : 0;
  }
  return { width: w, height: h, bits };
}

type Run = { y0: number; y1: number; cy: number; th: number };

function runsAt(mask: InkMask, x: number): Run[] {
  const runs: Run[] = [];
  let start = -1;
  for (let y = 0; y < mask.height; y++) {
    const ink = mask.bits[y * mask.width + x] === 1;
    if (ink && start < 0) start = y;
    if (!ink && start >= 0) {
      const y1 = y - 1;
      runs.push({ y0: start, y1, cy: (start + y1) / 2, th: y1 - start + 1 });
      start = -1;
    }
  }
  if (start >= 0) {
    const y1 = mask.height - 1;
    runs.push({ y0: start, y1, cy: (start + y1) / 2, th: y1 - start + 1 });
  }
  return runs;
}

function overlap(a: Run, b: Run): number {
  const ov = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0) + 1;
  if (ov > 0) return ov;
  // 斜向细笔相邻两列常常差 1px；不桥一下会碎成很多短带
  return Math.max(a.y0, b.y0) - Math.min(a.y1, b.y1) <= 1 ? 0.5 : 0;
}

/**
 * 按列切带、跨列接续。一个 run 只接一根父带（分叉的孩子从分叉列另起一根），
 * 这样不会在同一个 x 上把父带的点重复写乱。
 */
export function extractStrands(mask: InkMask, opts: TraceOptions = {}): TraceStrand[] {
  const minLen = opts.minStrandLength ?? DEFAULTS.minStrandLength;
  const minArea = opts.minStrandArea ?? DEFAULTS.minStrandArea;
  const maxStrands = opts.maxStrands ?? DEFAULTS.maxStrands;

  const all: TraceStrand[] = [];
  let active: Array<{ points: TraceStrand; last: Run }> = [];

  for (let x = 0; x < mask.width; x++) {
    const runs = runsAt(mask, x);
    const used = new Set<number>();
    const next: Array<{ points: TraceStrand; last: Run }> = [];
    const nextSet = new Set<(typeof next)[number]>();
    for (const r of runs) {
      let bestIdx = -1;
      let bestOverlap = 0;
      for (let i = 0; i < active.length; i++) {
        if (used.has(i)) continue;
        const ov = overlap(active[i].last, r);
        if (ov > bestOverlap) {
          bestOverlap = ov;
          bestIdx = i;
        }
      }
      if (bestIdx >= 0) {
        used.add(bestIdx);
        const s = active[bestIdx];
        s.points.push({ x, y: r.cy, thickness: r.th });
        s.last = r;
        next.push(s);
        nextSet.add(s);
      } else {
        const s = { points: [{ x, y: r.cy, thickness: r.th }], last: r };
        next.push(s);
        nextSet.add(s);
      }
    }
    for (const s of active) if (!nextSet.has(s)) all.push(s.points);
    active = next;
  }
  for (const s of active) all.push(s.points);

  const kept = all.filter((s) => {
    if (s.length < minLen) return false;
    const area = s.reduce((n, p) => n + p.thickness, 0);
    return area >= minArea;
  });
  kept.sort((a, b) => {
    const area = (s: TraceStrand): number => s.reduce((n, p) => n + p.thickness, 0);
    return area(b) - area(a);
  });
  return maxStrands > 0 ? kept.slice(0, maxStrands) : kept;
}

function smoothValues(values: number[]): number[] {
  return values.map((v, i) => {
    const a = values[Math.max(0, i - 1)];
    const b = values[Math.min(values.length - 1, i + 1)];
    return (a + v * 2 + b) / 4;
  });
}

function samplePoints(points: TracePoint[], maxPoints: number): TracePoint[] {
  // 0/1 会让 stepLen 除零或产生 NaN；至少两点（只有一个点时上面已提前返回）
  const cap = Math.max(2, Math.floor(maxPoints));
  if (points.length <= cap) return points;
  const out: TracePoint[] = [];
  const stepLen = (points.length - 1) / (cap - 1);
  for (let i = 0; i < cap; i++) out.push(points[Math.round(i * stepLen)]);
  return out;
}

function averageInkColor(img: RgbaImage, mask: InkMask): string {
  const { data } = img;
  let r = 0;
  let g = 0;
  let b = 0;
  let n = 0;
  for (let i = 0, len = mask.width * mask.height; i < len; i++) {
    if (mask.bits[i] !== 1) continue;
    const p = i * 4;
    const a = data[p + 3] / 255;
    r += data[p] * a;
    g += data[p + 1] * a;
    b += data[p + 2] * a;
    n += a;
  }
  if (n <= 0) return "#1e1e1e";
  const hex = (v: number): string => Math.round(Math.min(255, Math.max(0, v / n))).toString(16).padStart(2, "0");
  // 原样保留墨色：浅色墨迹回填墨黑会指鹿为马，用户改描边色即可
  return `#${hex(r)}${hex(g)}${hex(b)}`;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function pad(n: number, width = 2): string {
  return n.toString(36).padStart(width, "0");
}

/** perfect-freehand 的 easing 作用在整个半径系数上，不是只作用于压力 */
const MAX_RADIUS_FACTOR = Math.sin((Math.PI / 2) * (0.5 + THINNING / 2));

/**
 * 一根墨迹带 → 一根 freedraw。笔宽按 vendor 的 perfect-freehand 口径反算：
 * 直径 = 2×size×sin(π/2×(0.2 + 0.6×压力))，size = strokeWidth×4.25。
 * easing 会让压力 0.5 时的直径变成 1.41×size——早先按线性反算，每一笔都胖了 41%。
 * 这里让压力 1 对应「该带的最大厚度」，再按每点厚度反解压力。
 */
function strandToFreedraw(
  strand: TraceStrand,
  el: TraceImageElement,
  imgW: number,
  imgH: number,
  opts: {
    strokeColor: string;
    groupSeed: string;
    idPrefix: string;
    seedBase: number;
    now: number;
    outerGroupIds: string[];
    index: string;
    ordinal: number;
  },
): Record<string, unknown> {
  const ys = smoothValues(strand.map((p) => p.y));
  const ths = smoothValues(strand.map((p) => p.thickness));
  const sx = el.width / Math.max(1, imgW);
  const sy = el.height / Math.max(1, imgH);
  const scale = (sx + sy) / 2;
  const angle = el.angle ?? 0;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const cx = el.width / 2;
  const cy = el.height / 2;

  const scenePoints = strand.map((p, i) => {
    const lx = p.x * sx;
    const ly = ys[i] * sy;
    const dx = lx - cx;
    const dy = ly - cy;
    return {
      x: el.x + cx + dx * cos - dy * sin,
      y: el.y + cy + dx * sin + dy * cos,
      thickness: Math.max(0.5, ths[i] * scale),
    };
  });

  const maxTh = Math.max(...scenePoints.map((p) => p.thickness));
  const size = maxTh / (2 * MAX_RADIUS_FACTOR);
  const width = Math.max(0.1, size / FREEDRAW_SIZE_FACTOR);
  const pressures = scenePoints.map((p) => {
    const ratio = clamp(p.thickness / (2 * size), 0, 0.999);
    const eased = clamp(Math.asin(ratio) / (Math.PI / 2), 0, 1);
    // 反解 0.5 - thinning×(0.5 - p) = eased
    return clamp((eased - (1 - THINNING) / 2) / THINNING, 0, 1);
  });

  const minX = Math.min(...scenePoints.map((p) => p.x));
  const maxX = Math.max(...scenePoints.map((p) => p.x));
  const minY = Math.min(...scenePoints.map((p) => p.y));
  const maxY = Math.max(...scenePoints.map((p) => p.y));
  const padPx = maxTh / 2 + 1;
  const x = minX - padPx;
  const y = minY - padPx;
  const w = Math.max(1, maxX - minX + padPx * 2);
  const h = Math.max(1, maxY - minY + padPx * 2);
  const seed = opts.seedBase + opts.ordinal * 7919;

  return {
    id: `${opts.idPrefix}-${opts.ordinal}`,
    type: "freedraw",
    x,
    y,
    width: w,
    height: h,
    angle: 0,
    strokeColor: opts.strokeColor,
    backgroundColor: "transparent",
    fillStyle: "solid",
    strokeWidth: width,
    strokeStyle: "solid",
    roughness: 0,
    opacity: 100,
    groupIds: [...opts.outerGroupIds, opts.groupSeed],
    frameId: el.frameId ?? null,
    roundness: null,
    seed,
    version: 1,
    versionNonce: seed,
    index: opts.index,
    isDeleted: false,
    boundElements: null,
    updated: opts.now,
    link: el.link ?? null,
    locked: false,
    points: scenePoints.map((p) => [p.x - x, p.y - y] as [number, number]),
    pressures,
    simulatePressure: false,
    lastCommittedPoint: null,
  };
}

/**
 * 一张图片 → 一组同组 freedraw。返回值可直接替换 scene 里的原 image 元素；
 * 分组让用户点任意一笔都选中整幅，改色/加素材库不会漏笔。
 */
export function traceImageToFreedraws(
  img: RgbaImage,
  el: TraceImageElement,
  opts: TraceOptions = {},
): Record<string, unknown>[] {
  const mask = buildInkMask(img, opts);
  const method = opts.method ?? "auto";
  const useSkeleton = method === "skeleton" || (method === "auto" && pickTraceMethod(mask) === "skeleton");
  const strands = useSkeleton ? extractSkeletonStrands(mask, opts) : extractStrands(mask, opts);
  if (strands.length === 0) return [];

  const now = opts.now ?? Date.now();
  const groupSeed = opts.groupId ?? `g-${now.toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const idPrefix = opts.idPrefix ?? `fr-${now.toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  const seedBase = opts.seedBase ?? Math.floor(Math.random() * 2 ** 31);
  const strokeColor = opts.strokeColor ?? averageInkColor(img, mask);
  const baseIndex = el.index && el.index.length > 0 ? el.index : "a";
  const maxPoints = opts.maxPoints ?? DEFAULTS.maxPoints;
  const outerGroupIds = opts.outerGroupIds ?? [];

  return strands.map((strand, i) => {
    const sampled = samplePoints(strand, maxPoints);
    return strandToFreedraw(sampled, el, mask.width, mask.height, {
      strokeColor,
      groupSeed,
      idPrefix,
      seedBase,
      now,
      outerGroupIds,
      // 拼在图片原 index 之后：新笔画留在原图层附近，不会整批跳到最顶层
      index: `${baseIndex}${pad(i)}`,
      ordinal: i,
    });
  });
}
