/**
 * 图片转「轮廓素材」（2026-10-21 P2）：RGBA → 分层 keyhole 填充元素。
 *
 * 与 ink-trace 的 freedraw 路线互补：
 * - ink-trace 按笔触描线，元素多、细节少，适合「线稿/简笔」；
 * - 本模块按墨色浓淡分层填充，**元素少、还原度高**，适合「毛笔字/图标/实心图形」。
 *
 * 关键约束（全部对照 vendor 0.18.1 与 rough.js 4.6.4 源码核实）：
 * ① 填充只在 line/freedraw 且「首尾点距 ≤ LINE_CONFIRM_THRESHOLD(8px)」时触发
 *    （chunk-4FTI6OG3.js isPathALoop）⇒ 交付的 points 必须首点重复一次闭合；
 * ② shape 走 polygon 的前提是 roundness 为 null（generateLinearElementShape）；
 * ③ rough.js 的 polygon → solidFillPolygon([points]) 只产**单子路径**，
 *    canvas/svg 两路都按 evenodd 填充（bin/canvas.js:31、bin/svg.js:38）
 *    ⇒ 同一元素里要挖孔，只能靠 keyhole 桥段技巧。
 *
 * keyhole 桥段必须**精确重合**：去程 B→A 与回程 B→A 是同一条线段反向，
 * evenodd 下两次穿越互相抵消 ⇒ 桥宽为零、视觉不可见。
 * 若两端分别去接不同端点，会围出一个楔形区域被填充（实测 IoU 0.958 → 0.858）。
 *
 * 纯逻辑模块：不碰 canvas / DOM / vendor，前端弹窗与 ea 脚本共用，
 * node 单测直接喂 RGBA 像素。
 */

import type { RgbaImage } from "./ink-trace.ts";

/* ------------------------------------------------------------------ */
/* 分层参数                                                            */
/* ------------------------------------------------------------------ */

/**
 * 一层填充的五个旋钮：
 * - threshold：墨量阈值（coverage ≥ 该值的像素进本层），越大越淡；
 * - opacity：本层不透明度（0..100），越大越浓；
 * - smooth：沿轮廓点列的高斯平滑 σ（px），压掉二值场的锯齿；
 * - tolerance：Douglas-Peucker 简化容差（px），控制点数与还原度的取舍；
 * - minArea：外轮廓最小面积（px²），低于此值丢弃（去噪点）。
 *
 * 四层由淡到浓叠出「墨色浓淡」，与 2026-10-21 实测的四层参数一致。
 */
export type OutlineLayerSpec = {
  threshold: number;
  opacity: number;
  smooth: number;
  tolerance: number;
  minArea: number;
};

export const OUTLINE_LAYERS: readonly OutlineLayerSpec[] = [
  { threshold: 0.12, opacity: 28, smooth: 0.55, tolerance: 0.75, minArea: 1 },
  { threshold: 0.32, opacity: 45, smooth: 0.7, tolerance: 0.85, minArea: 2 },
  { threshold: 0.55, opacity: 60, smooth: 0.85, tolerance: 0.95, minArea: 3 },
  { threshold: 0.8, opacity: 100, smooth: 0.8, tolerance: 1, minArea: 6 },
];

/** 引擎硬约束：line 走 polygon 填充要求 roundness 为 null（显式写死，别改） */
const OUTLINE_DEFAULTS = {
  strokeColor: "#1e1e1e",
  strokeWidth: 1,
  fillStyle: "solid" as const,
  strokeStyle: "solid" as const,
  roughness: 0,
  /** 不透明底的键色距离阈值（0..765 曼哈顿） */
  backgroundThreshold: 96,
  /** 每层最多取几条外轮廓（按面积降序）；1 = 只要最大那条（实测最稳） */
  maxContours: 1,
  /** 孔洞最小面积（px²）：太小的是抗锯齿碎屑，挖了反而脏 */
  minHoleArea: 3,
};

/* ------------------------------------------------------------------ */
/* 墨量场                                                              */
/* ------------------------------------------------------------------ */

/**
 * RGBA → 墨量场（0..1 浮点，1 = 满墨）。
 * 背景判定沿用 ink-trace 的口径：边缘多数透明 → 按 alpha 抠图；
 * 否则取边缘众数色当底色，按颜色距离给连续墨量（阈值分层才拉得开）。
 */
export function inkCoverage(img: RgbaImage, backgroundThreshold = OUTLINE_DEFAULTS.backgroundThreshold): Float32Array {
  const { width: w, height: h, data } = img;
  const out = new Float32Array(Math.max(0, w * h));
  if (w <= 0 || h <= 0) return out;

  const samples: Array<{ r: number; g: number; b: number; a: number }> = [];
  const step = Math.max(1, Math.floor(Math.min(w, h) / 32));
  const push = (x: number, y: number): void => {
    const i = (y * w + x) * 4;
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
  if (samples.length > 0 && transparent / samples.length >= 0.35) {
    for (let i = 0, n = w * h; i < n; i++) out[i] = data[i * 4 + 3] / 255;
    return out;
  }

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
  const span = Math.max(1, backgroundThreshold);
  for (let i = 0, n = w * h; i < n; i++) {
    const p = i * 4;
    if (data[p + 3] < 16) continue;
    const dist = Math.abs(data[p] - bg.r) + Math.abs(data[p + 1] - bg.g) + Math.abs(data[p + 2] - bg.b);
    out[i] = Math.min(1, dist / span);
  }
  return out;
}

/** coverage ≥ threshold → 0/1 位场（marching squares 的输入） */
export function thresholdField(coverage: Float32Array, w: number, h: number, threshold: number): Uint8Array {
  const bits = new Uint8Array(Math.max(0, w * h));
  for (let i = 0, n = w * h; i < n; i++) bits[i] = coverage[i] >= threshold ? 1 : 0;
  return bits;
}

/* ------------------------------------------------------------------ */
/* marching squares：位场 → 闭合轮廓                                    */
/* ------------------------------------------------------------------ */

/**
 * 边编号：0=top 1=right 2=bottom 3=left；角 c 夹住边 c 与边 (c+3)%4。
 * case = tl*8 + tr*4 + br*2 + bl*1。
 *
 * 每条有向段都让**高值区在左**——这是相邻 cell 能首尾对接的前提，
 * 遍历这张表即可把位场拆成若干闭合环（saddle 按格心平均值消歧）。
 */
const MS_TABLE: readonly (readonly (readonly [number, number])[])[] = [
  [], // 0
  [[2, 3]], // 1  bl
  [[1, 2]], // 2  br
  [[1, 3]], // 3  bl+br
  [[0, 1]], // 4  tr
  [], // 5  tr+bl（saddle，运行时填）
  [[0, 2]], // 6  tr+br
  [[0, 3]], // 7  只有 tl 低
  [[3, 0]], // 8  tl
  [[2, 0]], // 9  tl+bl
  [], // 10 tl+br（saddle，运行时填）
  [[1, 0]], // 11 只有 tr 低
  [[3, 1]], // 12 tl+tr
  [[2, 1]], // 13 只有 br 低
  [[3, 2]], // 14 只有 bl 低
  [], // 15
];

/** saddle 消歧：格心为高 ⇒ 两个高角连通、两低角成岛；反之亦然 */
function segmentsOfCase(k: number, centerHigh: boolean): readonly (readonly [number, number])[] {
  if (k === 5) return centerHigh ? [[0, 3], [2, 1]] : [[0, 1], [2, 3]];
  if (k === 10) return centerHigh ? [[1, 0], [3, 2]] : [[3, 0], [1, 2]];
  return MS_TABLE[k];
}

export type Contour = Array<[number, number]>;

/**
 * 位场 → 闭合轮廓（不含重复末点）。
 *
 * 走「边 ID」而不是浮点坐标做连接：相邻 cell 共享同一条边、同一组角点值，
 * 插值结果逐位一致，ID 对接既无浮点容差也无哈希碰撞。
 */
export function findContours(bits: Uint8Array, w: number, h: number, level = 0.5): Contour[] {
  if (w < 2 || h < 2) return [];
  const hCount = (w - 1) * h; // 水平边：连接 (j,i)-(j,i+1)
  const next = new Map<number, number>();
  const cell = (j: number, i: number): number => j * w + i;

  for (let j = 0; j < h - 1; j++) {
    for (let i = 0; i < w - 1; i++) {
      const a = bits[cell(j, i)];
      const b = bits[cell(j, i + 1)];
      const c = bits[cell(j + 1, i + 1)];
      const d = bits[cell(j + 1, i)];
      const k = (a >= level ? 8 : 0) | (b >= level ? 4 : 0) | (c >= level ? 2 : 0) | (d >= level ? 1 : 0);
      if (k === 0 || k === 15) continue;
      const centerHigh = (a + b + c + d) / 4 >= level;
      for (const [from, to] of segmentsOfCase(k, centerHigh)) {
        // 边 ID：水平边 = 行号*(w-1)+列号；垂直边 = hCount + 行号*w+列号（列号即端点 x）
        const f = from === 0 ? j * (w - 1) + i : from === 2 ? (j + 1) * (w - 1) + i : from === 1 ? hCount + j * w + i + 1 : hCount + j * w + i;
        const t = to === 0 ? j * (w - 1) + i : to === 2 ? (j + 1) * (w - 1) + i : to === 1 ? hCount + j * w + i + 1 : hCount + j * w + i;
        next.set(f, t);
      }
    }
  }
  if (next.size === 0) return [];

  const pointOf = (id: number): [number, number] => {
    if (id < hCount) {
      const j = Math.floor(id / (w - 1));
      const i = id - j * (w - 1);
      const a = bits[cell(j, i)];
      const b = bits[cell(j, i + 1)];
      const t = b === a ? 0.5 : (level - a) / (b - a);
      return [i + t, j];
    }
    const k = id - hCount;
    const j = Math.floor(k / w);
    const i = k - j * w;
    const a = bits[cell(j, i)];
    const b = bits[cell(j + 1, i)];
    const t = b === a ? 0.5 : (level - a) / (b - a);
    return [i, j + t];
  };

  const seen = new Set<number>();
  const contours: Contour[] = [];
  for (const start of next.keys()) {
    if (seen.has(start)) continue;
    const ring: Contour = [];
    let cur: number | undefined = start;
    while (cur !== undefined && !seen.has(cur)) {
      seen.add(cur);
      ring.push(pointOf(cur));
      cur = next.get(cur);
    }
    // 回到起点 ⇒ 闭合；去掉与首点重复的末点
    if (ring.length >= 4) {
      const last = ring[ring.length - 1];
      const first = ring[0];
      if (Math.abs(last[0] - first[0]) < 1e-9 && Math.abs(last[1] - first[1]) < 1e-9) ring.pop();
      if (ring.length >= 3) contours.push(ring);
    }
  }
  return contours;
}

/* ------------------------------------------------------------------ */
/* 轮廓后处理：平滑 / 简化 / 面积 / 孔洞                                */
/* ------------------------------------------------------------------ */

/**
 * 沿闭合点列的高斯平滑（循环边界）。
 *
 * 核宽口径对齐 scipy.ndimage.gaussian_filter1d 默认 truncate=4.0：
 * radius = int(4σ + 0.5)。别写成 ceil(4σ)——σ=0.55 时前者半径 2、后者 3，
 * 对**点数少**的轮廓差别很大（4 点方块实测面积 100 → 62 vs → 52）。
 * 点数多的真实轮廓两者接近，但参数要与 2026-10-21 实测那组严格对齐，就按 scipy 的式子。
 */
export function smoothContour(pts: Contour, sigma: number): Contour {
  if (!(sigma > 0) || pts.length < 3) return pts.map((p) => [p[0], p[1]] as [number, number]);
  const radius = Math.max(1, Math.floor(sigma * 4 + 0.5));
  const kernel: number[] = [];
  let sum = 0;
  for (let k = -radius; k <= radius; k++) {
    const v = Math.exp((-0.5 * k * k) / (sigma * sigma));
    kernel.push(v);
    sum += v;
  }
  for (let k = 0; k < kernel.length; k++) kernel[k] /= sum;
  const n = pts.length;
  const out: Contour = new Array(n);
  for (let i = 0; i < n; i++) {
    let sx = 0;
    let sy = 0;
    for (let k = -radius; k <= radius; k++) {
      const weight = kernel[k + radius];
      const p = pts[((i + k) % n + n) % n];
      sx += p[0] * weight;
      sy += p[1] * weight;
    }
    out[i] = [sx, sy];
  }
  return out;
}

/** Douglas-Peucker 简化（首尾点固定），与 skimage.approximate_polygon 同族 */
export function simplifyContour(pts: Contour, tolerance: number): Contour {
  if (!(tolerance > 0) || pts.length < 3) return pts.map((p) => [p[0], p[1]] as [number, number]);
  const keep = new Uint8Array(pts.length);
  keep[0] = 1;
  keep[pts.length - 1] = 1;
  const stack: Array<[number, number]> = [[0, pts.length - 1]];
  while (stack.length > 0) {
    const [lo, hi] = stack.pop() as [number, number];
    if (hi <= lo + 1) continue;
    const [ax, ay] = pts[lo];
    const [bx, by] = pts[hi];
    const dx = bx - ax;
    const dy = by - ay;
    const len = Math.hypot(dx, dy);
    let best = -1;
    let bestDist = tolerance;
    for (let i = lo + 1; i < hi; i++) {
      const [px, py] = pts[i];
      const dist =
        len < 1e-9
          ? Math.hypot(px - ax, py - ay)
          : Math.abs(dy * px - dx * py + bx * ay - by * ax) / len;
      if (dist > bestDist) {
        bestDist = dist;
        best = i;
      }
    }
    if (best < 0) continue;
    keep[best] = 1;
    stack.push([lo, best], [best, hi]);
  }
  const out: Contour = [];
  for (let i = 0; i < pts.length; i++) if (keep[i] === 1) out.push(pts[i]);
  return out.length >= 3 ? out : pts.map((p) => [p[0], p[1]] as [number, number]);
}

/** shoelace 有向面积（取绝对值） */
export function contourArea(pts: Contour): number {
  let sum = 0;
  for (let i = 0, n = pts.length; i < n; i++) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[(i + 1) % n];
    sum += x0 * y1 - x1 * y0;
  }
  return Math.abs(sum) / 2;
}

/** 从图像边界洪泛背景；未被访问到的背景即孔洞（binary_fill_holes 的逆运算） */
export function fillHoles(bits: Uint8Array, w: number, h: number): Uint8Array {
  const outside = new Uint8Array(w * h);
  const stack: number[] = [];
  const visit = (x: number, y: number): void => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const i = y * w + x;
    if (bits[i] === 1 || outside[i] === 1) return;
    outside[i] = 1;
    stack.push(i);
  };
  for (let x = 0; x < w; x++) {
    visit(x, 0);
    visit(x, h - 1);
  }
  for (let y = 0; y < h; y++) {
    visit(0, y);
    visit(w - 1, y);
  }
  while (stack.length > 0) {
    const i = stack.pop() as number;
    const x = i % w;
    const y = (i - x) / w;
    visit(x + 1, y);
    visit(x - 1, y);
    visit(x, y + 1);
    visit(x, y - 1);
  }
  const filled = new Uint8Array(w * h);
  for (let i = 0, n = w * h; i < n; i++) filled[i] = bits[i] === 1 || outside[i] === 0 ? 1 : 0;
  return filled;
}

/** 扫描线（even-odd）把闭合多边形栅格化成位场 */
export function polygonMask(pts: Contour, w: number, h: number): Uint8Array {
  const bits = new Uint8Array(w * h);
  const n = pts.length;
  if (n < 3) return bits;
  for (let y = 0; y < h; y++) {
    const sy = y + 0.5;
    const xs: number[] = [];
    for (let i = 0; i < n; i++) {
      const [x0, y0] = pts[i];
      const [x1, y1] = pts[(i + 1) % n];
      if (y0 === y1) continue;
      if (sy < Math.min(y0, y1) || sy >= Math.max(y0, y1)) continue;
      xs.push(x0 + ((sy - y0) / (y1 - y0)) * (x1 - x0));
    }
    if (xs.length < 2) continue;
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const from = Math.max(0, Math.ceil(xs[k] - 0.5));
      const to = Math.min(w - 1, Math.floor(xs[k + 1] - 0.5));
      for (let x = from; x <= to; x++) bits[y * w + x] = 1;
    }
  }
  return bits;
}

function andField(a: Uint8Array, b: Uint8Array, n: number): Uint8Array {
  const out = new Uint8Array(n);
  for (let i = 0; i < n; i++) out[i] = a[i] === 1 && b[i] === 1 ? 1 : 0;
  return out;
}

function notField(a: Uint8Array, n: number): Uint8Array {
  const out = new Uint8Array(n);
  for (let i = 0; i < n; i++) out[i] = a[i] === 1 ? 0 : 1;
  return out;
}

/** 轮廓清理管线：平滑 → 简化 → 面积过滤（阈值与容差都来自分层参数） */
export function cleanContours(
  raw: Contour[],
  spec: Pick<OutlineLayerSpec, "smooth" | "tolerance" | "minArea">,
): Contour[] {
  const out: Contour[] = [];
  for (const c of raw) {
    if (c.length < 8) continue;
    const smoothed = smoothContour(c, spec.smooth);
    const simplified = simplifyContour(smoothed, spec.tolerance);
    if (simplified.length < 4) continue;
    if (contourArea(simplified) < spec.minArea) continue;
    out.push(simplified);
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* keyhole：外轮廓 + 孔洞 → 单条闭合折线                               */
/* ------------------------------------------------------------------ */

/**
 * 外轮廓 + 若干孔洞 → 一条闭合折线（引擎只会把它当单子路径 evenodd 填充）。
 *
 * 走一遍的形状：outer → (A→B) → 孔洞闭合回路 → (B→A) → 回到 outer 首点。
 * 两段桥是**同一条线段反向**（都接在同一个点 B 上），evenodd 下互相抵消。
 */
export function keyholeSequence(outer: Contour, holes: Contour[]): Contour {
  const seq: Contour = outer.map((p) => [p[0], p[1]] as [number, number]);
  if (holes.length === 0) return seq;
  const A = seq[seq.length - 1];
  for (const hole of holes) {
    const B: [number, number] = [hole[0][0], hole[0][1]];
    seq.push([B[0], B[1]], [A[0], A[1]]);
    for (const p of hole) seq.push([p[0], p[1]]);
    seq.push([B[0], B[1]], [B[0], B[1]], [A[0], A[1]]);
  }
  return seq;
}

/* ------------------------------------------------------------------ */
/* 元素构造                                                            */
/* ------------------------------------------------------------------ */

export type OutlineImageElement = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  index?: string;
  frameId?: string | null;
  link?: string | null;
};

export type OutlineOptions = {
  /** 分层参数；缺省用 OUTLINE_LAYERS */
  layers?: readonly OutlineLayerSpec[];
  /** 墨色（同时是填充色；用户改素材时改的就是它） */
  strokeColor?: string;
  /** 每层最多取几条外轮廓 */
  maxContours?: number;
  /** 孔洞最小面积 */
  minHoleArea?: number;
  backgroundThreshold?: number;
  /**
   * 配方（分层参数 + 墨色 + 原图）。会原样挂到**每个**生成元素的 excaliRecipe 上——
   * 画布元素不像库条目那样有「条目级字段」可挂，只能逐元素带，脚本才读得到配方。
   */
  recipe?: unknown;
  /** 原图所在的外层分组（替换到画布时沿用；入库会剥掉） */
  outerGroupIds?: string[];
  groupId?: string;
  idPrefix?: string;
  seedBase?: number;
  now?: number;
};

export type OutlineStats = {
  /** 生成的填充元素数 */
  shapes: number;
  /** points 总数 */
  points: number;
  /** 实际生效的层数 */
  layers: number;
  /** 挖出的孔洞总数 */
  holes: number;
  strokeColor: string;
};

export type OutlineBuild = {
  elements: Record<string, unknown>[];
  stats: OutlineStats;
};

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function pad(n: number, width = 2): string {
  return n.toString(36).padStart(width, "0");
}

/**
 * 一条 keyhole 折线 → 一个 line 元素。
 *
 * 相对坐标 + **首点重复一次**（isPathALoop 的首尾距必须 ≤ 8px，否则引擎完全不填充）；
 * strokeColor 写 transparent：只要填充、不要描边，改色时用户改 backgroundColor 即可。
 */
export function makeOutlineElement(
  seq: Contour,
  opts: {
    id: string;
    index: string;
    seed: number;
    now: number;
    strokeColor: string;
    opacity: number;
    groupIds: string[];
    frameId: string | null;
    link: string | null;
  },
): Record<string, unknown> {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [px, py] of seq) {
    if (px < minX) minX = px;
    if (px > maxX) maxX = px;
    if (py < minY) minY = py;
    if (py > maxY) maxY = py;
  }
  const points: Array<[number, number]> = seq.map(([px, py]) => [round2(px - minX), round2(py - minY)] as [number, number]);
  points.push([points[0][0], points[0][1]]);
  return {
    id: opts.id,
    type: "line",
    x: round2(minX),
    y: round2(minY),
    width: round2(maxX - minX),
    height: round2(maxY - minY),
    angle: 0,
    strokeColor: "transparent",
    backgroundColor: opts.strokeColor,
    fillStyle: OUTLINE_DEFAULTS.fillStyle,
    strokeWidth: OUTLINE_DEFAULTS.strokeWidth,
    strokeStyle: OUTLINE_DEFAULTS.strokeStyle,
    roughness: OUTLINE_DEFAULTS.roughness,
    opacity: opts.opacity,
    groupIds: [...opts.groupIds],
    frameId: opts.frameId,
    roundness: null,
    seed: opts.seed,
    version: 1,
    versionNonce: opts.seed,
    index: opts.index,
    isDeleted: false,
    boundElements: null,
    updated: opts.now,
    link: opts.link,
    locked: false,
    points,
    lastCommittedPoint: null,
    startBinding: null,
    endBinding: null,
    startArrowhead: null,
    endArrowhead: null,
  };
}

/* ------------------------------------------------------------------ */
/* 主流程                                                              */
/* ------------------------------------------------------------------ */

/**
 * 一张 RGBA → 分层 keyhole 填充元素（已按原图的缩放与位置映射到画布坐标）。
 *
 * 每层：阈值二值化 → 轮廓提取 → 平滑简化 → 取最大若干条外轮廓 →
 * 对每条外轮廓挖出内部孔洞 → keyhole 合成一个元素。
 */
export function outlineImageToShapes(
  img: RgbaImage,
  image: OutlineImageElement,
  opts: OutlineOptions = {},
): OutlineBuild {
  const w = img.width;
  const h = img.height;
  const layers = opts.layers ?? OUTLINE_LAYERS;
  const strokeColor = opts.strokeColor ?? OUTLINE_DEFAULTS.strokeColor;
  const maxContours = Math.max(1, opts.maxContours ?? OUTLINE_DEFAULTS.maxContours);
  const minHoleArea = opts.minHoleArea ?? OUTLINE_DEFAULTS.minHoleArea;
  const now = opts.now ?? Date.now();
  const groupId = opts.groupId ?? `g-out-${now.toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const idPrefix = opts.idPrefix ?? `ln-out-${now.toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  const seedBase = opts.seedBase ?? Math.floor(Math.random() * 2 ** 31);
  const outerGroupIds = opts.outerGroupIds ?? [];
  const baseIndex = image.index && image.index.length > 0 ? image.index : "a";

  // 原图像素 → 画布坐标
  const sx = w > 0 ? image.width / w : 1;
  const sy = h > 0 ? image.height / h : 1;
  const toScene = (c: Contour): Contour => c.map(([px, py]) => [image.x + px * sx, image.y + py * sy] as [number, number]);

  const coverage = inkCoverage(img, opts.backgroundThreshold ?? OUTLINE_DEFAULTS.backgroundThreshold);
  const n = w * h;
  const elements: Record<string, unknown>[] = [];
  let holes = 0;
  let usedLayers = 0;

  for (let li = 0; li < layers.length; li++) {
    const spec = layers[li];
    const layerBits = thresholdField(coverage, w, h, spec.threshold);
    const outers = cleanContours(findContours(layerBits, w, h), spec)
      .sort((a, b) => contourArea(b) - contourArea(a))
      .slice(0, maxContours);
    if (outers.length === 0) continue;

    const filled = fillHoles(layerBits, w, h);
    const holeBits = andField(filled, notField(layerBits, n), n);

    for (const outer of outers) {
      const inside = polygonMask(outer, w, h);
      const holeContours = cleanContours(findContours(andField(holeBits, inside, n), w, h), {
        smooth: spec.smooth,
        tolerance: spec.tolerance,
        minArea: minHoleArea,
      });
      holes += holeContours.length;
      usedLayers += 1;
      const seq = keyholeSequence(outer, holeContours);
      const ordinal = elements.length;
      const el = makeOutlineElement(toScene(seq), {
        id: `${idPrefix}-${ordinal}`,
        index: `${baseIndex}${pad(ordinal)}`,
        seed: seedBase + ordinal * 7919,
        now,
        strokeColor,
        opacity: Math.max(1, Math.min(100, Math.round(spec.opacity))),
        groupIds: [...outerGroupIds, groupId],
        frameId: image.frameId ?? null,
        link: image.link ?? null,
      });
      if (opts.recipe) el.excaliRecipe = opts.recipe;
      elements.push(el);
    }
  }

  const points = elements.reduce((acc, el) => acc + ((el.points as unknown[] | undefined)?.length ?? 0), 0);
  return {
    elements,
    stats: { shapes: elements.length, points, layers: usedLayers, holes, strokeColor },
  };
}

/* ------------------------------------------------------------------ */
/* 配方（挂库条目，随素材往返）                                        */
/* ------------------------------------------------------------------ */

export const OUTLINE_RECIPE_KIND = "excali-outline";

export type OutlineRecipe = {
  kind: typeof OUTLINE_RECIPE_KIND;
  v: 1;
  layers: OutlineLayerSpec[];
  strokeColor: string;
  maxContours: number;
  /** 原图内嵌 dataURL（有上限，超限则只留尺寸，脚本侧提示重插原图） */
  source?: { width: number; height: number; dataURL?: string };
  createdAt: number;
};

/** 内嵌原图的体积上限（base64 字符数）；超限不嵌，免得素材库文件膨胀 */
export const RECIPE_SOURCE_MAX = 240_000;

export function makeOutlineRecipe(
  opts: OutlineOptions & { sourceWidth: number; sourceHeight: number; dataURL?: string },
): OutlineRecipe {
  const recipe: OutlineRecipe = {
    kind: OUTLINE_RECIPE_KIND,
    v: 1,
    layers: (opts.layers ?? OUTLINE_LAYERS).map((l) => ({ ...l })),
    strokeColor: opts.strokeColor ?? OUTLINE_DEFAULTS.strokeColor,
    maxContours: opts.maxContours ?? OUTLINE_DEFAULTS.maxContours,
    createdAt: opts.now ?? Date.now(),
    source: { width: opts.sourceWidth, height: opts.sourceHeight },
  };
  const url = opts.dataURL ?? "";
  const source = { width: opts.sourceWidth, height: opts.sourceHeight };
  if (url && url.length <= RECIPE_SOURCE_MAX) recipe.source = { ...source, dataURL: url };
  return recipe;
}

/** 从任意对象里读回配方（外来数据不可信，逐字段夹紧） */
export function parseOutlineRecipe(raw: unknown): OutlineRecipe | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (o.kind !== OUTLINE_RECIPE_KIND) return null;
  const layers: OutlineLayerSpec[] = [];
  if (Array.isArray(o.layers)) {
    for (const item of o.layers) {
      if (!item || typeof item !== "object") continue;
      const l = item as Record<string, unknown>;
      const threshold = Number(l.threshold);
      const opacity = Number(l.opacity);
      if (!Number.isFinite(threshold) || !Number.isFinite(opacity)) continue;
      layers.push({
        threshold: Math.min(1, Math.max(0, threshold)),
        opacity: Math.min(100, Math.max(1, opacity)),
        smooth: Math.max(0, Number(l.smooth) || 0),
        tolerance: Math.max(0, Number(l.tolerance) || 0),
        minArea: Math.max(0, Number(l.minArea) || 0),
      });
    }
  }
  if (layers.length === 0) layers.push(...OUTLINE_LAYERS.map((l) => ({ ...l })));
  const color = typeof o.strokeColor === "string" && /^#[0-9a-fA-F]{3,8}$/.test(o.strokeColor) ? o.strokeColor : OUTLINE_DEFAULTS.strokeColor;
  const sourceRaw = (o.source ?? {}) as Record<string, unknown>;
  const source = {
    width: Math.max(0, Number(sourceRaw.width) || 0),
    height: Math.max(0, Number(sourceRaw.height) || 0),
    ...(typeof sourceRaw.dataURL === "string" && sourceRaw.dataURL.startsWith("data:image/") ? { dataURL: sourceRaw.dataURL } : {}),
  };
  return {
    kind: OUTLINE_RECIPE_KIND,
    v: 1,
    layers,
    strokeColor: color,
    maxContours: Math.max(1, Math.min(8, Math.round(Number(o.maxContours) || OUTLINE_DEFAULTS.maxContours))),
    source,
    createdAt: Math.max(0, Number(o.createdAt) || 0),
  };
}