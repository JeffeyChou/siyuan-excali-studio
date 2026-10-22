/**
 * 计划 DSL 的连线走线（纯函数，node 可直接跑）。
 *
 * 旧口径是「中点折一次」的三段折线：只看起止两个盒，不看路上有什么，所以跨层的线会
 * 直接穿过中间层的节点（比如 folio → 内核穿过隧道菱形）。这里换成**正交避障**：
 *
 * - 每个节点按 `margin` 外扩成障碍；线段不得进入任何障碍的内部（贴边可以）
 * - 网格线 = 障碍边界 + 节点中线 + 相邻网格线之间的中线（通道），在这张稀疏网格上跑 A*。
 *   出入桩点（锚点外推 `margin`）恰好落在「边界 × 中线」上，所以**一张网格供全图所有边共用**，
 *   障碍判定只预算一次
 * - 代价 = 长度 + 每次拐弯 `bendPenalty` + 走在已有线上的长度 × `overlapPenalty`，
 *   所以能直走不拐、能分开不叠
 * - 起止边先试「朝向对方」的两边 × 两边，全都走不通再试全部 16 种；再不行由调用方退回旧折线
 * - 同一个口尽量不既进线又出线（`portPenalty`）；同向的多条线共用一个口是允许的，看起来像汇流
 *
 * 标签放在走线最长的一段上，避开节点和已放好的标签。
 */

import type { Side } from "../ea-element.ts";

export interface RouteBox {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  /** diamond/ellipse 只有中线碰得到边框；缺省按矩形 */
  shape?: string;
}

export interface RouteOptions {
  /** 障碍外扩距离，也是出入桩的长度 */
  margin: number;
  /** 每次拐弯折算的长度 */
  bendPenalty: number;
  /** 走在已有线上时，每单位长度的额外代价 */
  overlapPenalty: number;
  /** 出线占用一个已有进线的口（或反过来）时的额外代价 */
  portPenalty: number;
}

export const DEFAULT_ROUTE_OPTIONS: RouteOptions = { margin: 20, bendPenalty: 48, overlapPenalty: 2, portPenalty: 160 };

/** 每个节点每条边上的进出线数，键为 `${id}:${side}` */
export type PortUsage = Map<string, { in: number; out: number }>;

export interface OrthoRoute {
  side1: Side;
  side2: Side;
  /** 绝对坐标折点，首尾是两个锚点 */
  path: Array<{ x: number; y: number }>;
}

interface Rect {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/** 一条已布好的线段（水平或竖直） */
export interface Segment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/** 全图共用的走线网格。`hUse`/`vUse` 记录每段单位网格边被几条线走过，用于分开平行线 */
export interface RouteGrid {
  boxes: RouteBox[];
  margin: number;
  xs: number[];
  ys: number[];
  /** 网格点在某个障碍内部 */
  blocked: Uint8Array;
  /** (i,j)→(i+1,j) 这段水平边穿过障碍 */
  hBlocked: Uint8Array;
  /** (i,j)→(i,j+1) 这段竖直边穿过障碍 */
  vBlocked: Uint8Array;
  hUse: Uint16Array;
  vUse: Uint16Array;
}

const SIDES: Side[] = ["top", "right", "bottom", "left"];
const DIR: Record<Side, [number, number]> = { top: [0, -1], right: [1, 0], bottom: [0, 1], left: [-1, 0] };
// 方向 0..3 = SIDES 的顺序：上、右、下、左
const DX = [0, 1, 0, -1];
const DY = [-1, 0, 1, 0];
const EPS = 0.01;

function rectOf(b: RouteBox, m: number): Rect {
  return { minX: b.x - m, minY: b.y - m, maxX: b.x + b.width + m, maxY: b.y + b.height + m };
}

function anchorOf(b: RouteBox, side: Side): { x: number; y: number } {
  switch (side) {
    case "top":
      return { x: b.x + b.width / 2, y: b.y };
    case "bottom":
      return { x: b.x + b.width / 2, y: b.y + b.height };
    case "left":
      return { x: b.x, y: b.y + b.height / 2 };
    case "right":
      return { x: b.x + b.width, y: b.y + b.height / 2 };
  }
}

function sortedUnique(values: number[]): number[] {
  const out: number[] = [];
  for (const v of [...values].sort((a, b) => a - b)) {
    if (!out.length || v - out[out.length - 1] > 0.5) out.push(v);
  }
  return out;
}

/** 网格线 = 给定线 + 相邻线的中线：中线让线走在两排节点的正中间，而不是贴着一边 */
function withMidlines(lines: number[]): number[] {
  const base = sortedUnique(lines);
  const mids: number[] = [];
  for (let i = 0; i + 1 < base.length; i++) mids.push((base[i] + base[i + 1]) / 2);
  return sortedUnique([...base, ...mids]);
}

/** 一次算好全图的网格与障碍；之后每条边的 A* 只查表 */
export function buildRouteGrid(boxes: RouteBox[], margin: number = DEFAULT_ROUTE_OPTIONS.margin): RouteGrid {
  const rects = boxes.map((b) => rectOf(b, margin));
  const minX = Math.min(...rects.map((r) => r.minX)) - margin;
  const maxX = Math.max(...rects.map((r) => r.maxX)) + margin;
  const minY = Math.min(...rects.map((r) => r.minY)) - margin;
  const maxY = Math.max(...rects.map((r) => r.maxY)) + margin;
  const xs = withMidlines([minX, maxX, ...rects.flatMap((r) => [r.minX, r.maxX]), ...boxes.map((b) => b.x + b.width / 2)]);
  const ys = withMidlines([minY, maxY, ...rects.flatMap((r) => [r.minY, r.maxY]), ...boxes.map((b) => b.y + b.height / 2)]);
  const W = xs.length;
  const H = ys.length;
  const blocked = new Uint8Array(W * H);
  const hBlocked = new Uint8Array(W * H);
  const vBlocked = new Uint8Array(W * H);
  for (const r of rects) {
    // 只扫落在这个障碍范围内的网格线
    for (let j = 0; j < H; j++) {
      const y = ys[j];
      if (y < r.minY - EPS || y > r.maxY + EPS) continue;
      const insideY = y > r.minY + EPS && y < r.maxY - EPS;
      for (let i = 0; i < W; i++) {
        const x = xs[i];
        if (x < r.minX - EPS || x > r.maxX + EPS) continue;
        const insideX = x > r.minX + EPS && x < r.maxX - EPS;
        const k = j * W + i;
        if (insideX && insideY) blocked[k] = 1;
        // 水平边 (i,j)→(i+1,j)：行在障碍内部、且这段与障碍的 x 区间有交叠
        if (insideY && i + 1 < W && xs[i + 1] > r.minX + EPS && x < r.maxX - EPS) hBlocked[k] = 1;
        if (insideX && j + 1 < H && ys[j + 1] > r.minY + EPS && y < r.maxY - EPS) vBlocked[k] = 1;
      }
      // 起点在障碍左侧、跨进障碍的那一段
      for (let i = 0; i + 1 < W; i++) {
        if (insideY && xs[i] <= r.minX + EPS && xs[i + 1] > r.minX + EPS) hBlocked[j * W + i] = 1;
      }
    }
    for (let i = 0; i < W; i++) {
      const x = xs[i];
      if (!(x > r.minX + EPS && x < r.maxX - EPS)) continue;
      for (let j = 0; j + 1 < H; j++) {
        if (ys[j] <= r.minY + EPS && ys[j + 1] > r.minY + EPS) vBlocked[j * W + i] = 1;
      }
    }
  }
  return {
    boxes,
    margin,
    xs,
    ys,
    blocked,
    hBlocked,
    vBlocked,
    hUse: new Uint16Array(W * H),
    vUse: new Uint16Array(W * H),
  };
}

/** 最小堆（A* 开放表） */
class Heap {
  private keys: number[] = [];
  private values: number[] = [];
  get size(): number {
    return this.keys.length;
  }
  push(key: number, value: number): void {
    const k = this.keys;
    const v = this.values;
    k.push(key);
    v.push(value);
    let i = k.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (k[p] <= k[i]) break;
      [k[p], k[i]] = [k[i], k[p]];
      [v[p], v[i]] = [v[i], v[p]];
      i = p;
    }
  }
  pop(): number {
    const k = this.keys;
    const v = this.values;
    const top = v[0];
    const lk = k.pop()!;
    const lv = v.pop()!;
    if (k.length) {
      k[0] = lk;
      v[0] = lv;
      let i = 0;
      for (;;) {
        const l = i * 2 + 1;
        const r = l + 1;
        let m = i;
        if (l < k.length && k[l] < k[m]) m = l;
        if (r < k.length && k[r] < k[m]) m = r;
        if (m === i) break;
        [k[m], k[i]] = [k[i], k[m]];
        [v[m], v[i]] = [v[i], v[m]];
        i = m;
      }
    }
    return top;
  }
}

interface Search {
  cost: number;
  /** 网格下标序列 */
  cells: Array<[number, number]>;
}

function indexOf(lines: number[], value: number): number {
  let lo = 0;
  let hi = lines.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (Math.abs(lines[mid] - value) < 0.5) return mid;
    if (lines[mid] < value) lo = mid + 1;
    else hi = mid - 1;
  }
  return -1;
}

/**
 * 在网格上从 (sx,sy)（离开方向 dirS）走到 (tx,ty)（以方向 dirT 进入目标）。
 * 状态 = 网格点 × 当前行进方向，这样拐弯代价才算得出来。
 */
function search(grid: RouteGrid, sx: number, sy: number, dirS: number, tx: number, ty: number, dirT: number, opt: RouteOptions): Search | null {
  const { xs, ys, blocked, hBlocked, vBlocked, hUse, vUse } = grid;
  const W = xs.length;
  const H = ys.length;
  const best = new Float64Array(W * H * 4).fill(Infinity);
  const prev = new Int32Array(W * H * 4).fill(-1);
  const heap = new Heap();
  const h = (i: number, j: number) => Math.abs(xs[i] - xs[tx]) + Math.abs(ys[j] - ys[ty]);

  const start = (sy * W + sx) * 4 + dirS;
  best[start] = 0;
  heap.push(h(sx, sy), start);
  let goal = -1;
  let goalCost = Infinity;

  while (heap.size) {
    const cur = heap.pop();
    const d = cur & 3;
    const cell = cur >> 2;
    const i = cell % W;
    const j = (cell - i) / W;
    const g = best[cur];
    if (g + h(i, j) >= goalCost) break;
    if (i === tx && j === ty) {
      const total = g + (d === dirT ? 0 : opt.bendPenalty * (d === ((dirT + 2) & 3) ? 2 : 1));
      if (total < goalCost) {
        goalCost = total;
        goal = cur;
      }
      continue;
    }
    for (let nd = 0; nd < 4; nd++) {
      if (nd === ((d + 2) & 3)) continue; // 不掉头
      const ni = i + DX[nd];
      const nj = j + DY[nd];
      if (ni < 0 || nj < 0 || ni >= W || nj >= H) continue;
      const nk = nj * W + ni;
      if (blocked[nk]) continue;
      // 这段单位边的「左/上」端点下标
      const ek = nd === 1 ? cell : nd === 3 ? nk : nd === 2 ? cell : nk;
      const horizontal = nd === 1 || nd === 3;
      if (horizontal ? hBlocked[ek] : vBlocked[ek]) continue;
      const len = horizontal ? Math.abs(xs[ni] - xs[i]) : Math.abs(ys[nj] - ys[j]);
      const reuse = horizontal ? hUse[ek] : vUse[ek];
      const cost = g + len + (nd === d ? 0 : opt.bendPenalty) + (reuse ? len * opt.overlapPenalty : 0);
      const ns = nk * 4 + nd;
      if (cost < best[ns]) {
        best[ns] = cost;
        prev[ns] = cur;
        heap.push(cost + h(ni, nj), ns);
      }
    }
  }
  if (goal < 0) return null;

  const cells: Array<[number, number]> = [];
  for (let cur = goal; cur >= 0; cur = prev[cur]) {
    const cell = cur >> 2;
    const i = cell % W;
    cells.push([i, (cell - i) / W]);
  }
  cells.reverse();
  return { cost: goalCost, cells };
}

/** 去掉重复点与共线中间点 */
export function simplifyPath(path: Array<{ x: number; y: number }>): Array<{ x: number; y: number }> {
  const out: Array<{ x: number; y: number }> = [];
  for (const p of path) {
    const last = out[out.length - 1];
    if (last && Math.abs(last.x - p.x) < EPS && Math.abs(last.y - p.y) < EPS) continue;
    out.push(p);
    while (out.length >= 3) {
      const [a, b, c] = out.slice(-3);
      const collinear = (Math.abs(a.x - b.x) < EPS && Math.abs(b.x - c.x) < EPS) || (Math.abs(a.y - b.y) < EPS && Math.abs(b.y - c.y) < EPS);
      if (!collinear) break;
      out.splice(out.length - 2, 1);
    }
  }
  return out;
}

/** 朝向对方的两条边：主方向在前 */
function facingSides(from: RouteBox, to: RouteBox): Side[] {
  const dx = to.x + to.width / 2 - (from.x + from.width / 2);
  const dy = to.y + to.height / 2 - (from.y + from.height / 2);
  const h: Side = dx >= 0 ? "right" : "left";
  const v: Side = dy >= 0 ? "bottom" : "top";
  return Math.abs(dx) >= Math.abs(dy) ? [h, v] : [v, h];
}

/**
 * 一条边的正交避障走线。
 *
 * `grid` 由 `buildRouteGrid` 一次建好、全图共用（并记录走过的线，用于分开平行线）；
 * 不传则就地建一张。`used` 会被追加本条的线段，供调用方自己使用。
 * 返回 null = 网格上找不到路（极端拥挤），调用方退回旧折线。
 */
export function routeOrthogonal(
  boxes: RouteBox[],
  fromId: string,
  toId: string,
  used: Segment[] = [],
  opt: RouteOptions = DEFAULT_ROUTE_OPTIONS,
  ports: PortUsage = new Map(),
  grid: RouteGrid = buildRouteGrid(boxes, opt.margin),
): OrthoRoute | null {
  const a = boxes.find((b) => b.id === fromId);
  const b = boxes.find((x) => x.id === toId);
  if (!a || !b || a === b) return null;
  const m = grid.margin;

  let bestRoute: OrthoRoute | null = null;
  let bestCells: Array<[number, number]> = [];
  const tryPairs = (pairs: Array<[Side, Side]>) => {
    let bestCost = Infinity;
    for (const [s1, s2] of pairs) {
      const p1 = anchorOf(a, s1);
      const p2 = anchorOf(b, s2);
      const [d1x, d1y] = DIR[s1];
      const [d2x, d2y] = DIR[s2];
      const sx = indexOf(grid.xs, p1.x + d1x * m);
      const sy = indexOf(grid.ys, p1.y + d1y * m);
      const tx = indexOf(grid.xs, p2.x + d2x * m);
      const ty = indexOf(grid.ys, p2.y + d2y * m);
      if (sx < 0 || sy < 0 || tx < 0 || ty < 0) continue;
      const dirS = SIDES.indexOf(s1);
      const dirT = (SIDES.indexOf(s2) + 2) & 3; // 进入 b = 与 b 的出边方向相反
      const found = search(grid, sx, sy, dirS, tx, ty, dirT, opt);
      if (!found) continue;
      const outPort = ports.get(`${a.id}:${s1}`);
      const inPort = ports.get(`${b.id}:${s2}`);
      const conflicts = (outPort?.in ? 1 : 0) + (inPort?.out ? 1 : 0);
      const cost = found.cost + 2 * m + conflicts * opt.portPenalty;
      if (cost < bestCost) {
        bestCost = cost;
        bestCells = found.cells;
        const mid = found.cells.map(([i, j]) => ({ x: grid.xs[i], y: grid.ys[j] }));
        bestRoute = { side1: s1, side2: s2, path: simplifyPath([p1, ...mid, p2]) };
      }
    }
  };

  // 两个盒子在某个方向上有重叠区间时，先试一条穿过重叠区中点的直线：锚点不必在边的
  // 正中，这样中心差十几像素的两个节点之间不会多出一个小台阶
  const direct = straightThroughOverlap(a, b, grid, ports);
  if (direct) {
    record(direct, [], a, b, grid, ports, used);
    return direct;
  }

  const f1 = facingSides(a, b);
  const f2 = facingSides(b, a);
  tryPairs(f1.flatMap((s1) => f2.map((s2) => [s1, s2] as [Side, Side])));
  if (!bestRoute) tryPairs(SIDES.flatMap((s1) => SIDES.map((s2) => [s1, s2] as [Side, Side])));
  const route = bestRoute as OrthoRoute | null;
  if (!route) return null;
  record(route, bestCells, a, b, grid, ports, used);
  return route;
}

/** 记账：口的进出、网格边的占用、对外的线段 */
function record(
  route: OrthoRoute,
  cells: Array<[number, number]>,
  a: RouteBox,
  b: RouteBox,
  grid: RouteGrid,
  ports: PortUsage,
  used: Segment[],
): void {
  const outKey = `${a.id}:${route.side1}`;
  const inKey = `${b.id}:${route.side2}`;
  ports.set(outKey, { in: ports.get(outKey)?.in ?? 0, out: (ports.get(outKey)?.out ?? 0) + 1 });
  ports.set(inKey, { in: (ports.get(inKey)?.in ?? 0) + 1, out: ports.get(inKey)?.out ?? 0 });
  const W = grid.xs.length;
  for (let k = 0; k + 1 < cells.length; k++) {
    const [i1, j1] = cells[k];
    const [i2, j2] = cells[k + 1];
    if (j1 === j2) grid.hUse[j1 * W + Math.min(i1, i2)]++;
    else grid.vUse[Math.min(j1, j2) * W + i1]++;
  }
  for (let i = 0; i + 1 < route.path.length; i++) {
    const p = route.path[i];
    const q = route.path[i + 1];
    used.push({ x1: p.x, y1: p.y, x2: q.x, y2: q.y });
  }
}

/**
 * 上下（或左右）相对、且在另一轴上有可落线重叠的两个盒子：一条直线连过去。
 * 线放在重叠区中点；路上碰到别的盒子、或会让一个口既进又出，就返回 null 交给 A*。
 */
function straightThroughOverlap(a: RouteBox, b: RouteBox, grid: RouteGrid, ports: PortUsage): OrthoRoute | null {
  const m = grid.margin;
  // 每个盒子在某条轴上「线能垂直落上去」的区间：矩形避开两端圆角各 12px；
  // 菱形和椭圆只有中线那一点真的碰到外框
  const span = (box: RouteBox, axis: "x" | "y"): [number, number] => {
    const start = axis === "x" ? box.x : box.y;
    const size = axis === "x" ? box.width : box.height;
    if (box.shape === "diamond" || box.shape === "ellipse") return [start + size / 2, start + size / 2];
    return [start + 12, start + size - 12];
  };
  const candidates: OrthoRoute[] = [];
  const [ax0, ax1] = span(a, "x");
  const [bx0, bx1] = span(b, "x");
  const ox0 = Math.max(ax0, bx0);
  const ox1 = Math.min(ax1, bx1);
  if (ox1 >= ox0) {
    const x = (ox0 + ox1) / 2;
    if (a.y + a.height + 2 * m <= b.y) candidates.push({ side1: "bottom", side2: "top", path: [{ x, y: a.y + a.height }, { x, y: b.y }] });
    else if (b.y + b.height + 2 * m <= a.y) candidates.push({ side1: "top", side2: "bottom", path: [{ x, y: a.y }, { x, y: b.y + b.height }] });
  }
  const [ay0, ay1] = span(a, "y");
  const [by0, by1] = span(b, "y");
  const oy0 = Math.max(ay0, by0);
  const oy1 = Math.min(ay1, by1);
  if (oy1 >= oy0) {
    const y = (oy0 + oy1) / 2;
    if (a.x + a.width + 2 * m <= b.x) candidates.push({ side1: "right", side2: "left", path: [{ x: a.x + a.width, y }, { x: b.x, y }] });
    else if (b.x + b.width + 2 * m <= a.x) candidates.push({ side1: "left", side2: "right", path: [{ x: a.x, y }, { x: b.x + b.width, y }] });
  }
  for (const c of candidates) {
    const [p, q] = c.path;
    const blocked = grid.boxes.some((o) => o !== a && o !== b && segmentHitsRect(p, q, rectOf(o, m / 2)));
    if (blocked) continue;
    if (ports.get(`${a.id}:${c.side1}`)?.in || ports.get(`${b.id}:${c.side2}`)?.out) continue;
    return c;
  }
  return null;
}

/**
 * 直线连接：从两个盒子的中心连线、裁到各自边框上。中途碰到别的盒子（外扩 `pad`）就返回 null。
 * radial 布局用它：叶子围着中心排，直线放射比正交折线自然得多。
 */
export function routeStraight(boxes: RouteBox[], fromId: string, toId: string, pad = 8): Array<{ x: number; y: number }> | null {
  const a = boxes.find((b) => b.id === fromId);
  const b = boxes.find((x) => x.id === toId);
  if (!a || !b || a === b) return null;
  const ca = { x: a.x + a.width / 2, y: a.y + a.height / 2 };
  const cb = { x: b.x + b.width / 2, y: b.y + b.height / 2 };
  const dx = cb.x - ca.x;
  const dy = cb.y - ca.y;
  if (Math.abs(dx) < EPS && Math.abs(dy) < EPS) return null;
  // 中心沿方向走多远到达自己的边框
  const exit = (box: RouteBox, sign: number) => {
    const tx = Math.abs(dx) < EPS ? Infinity : box.width / 2 / Math.abs(dx);
    const ty = Math.abs(dy) < EPS ? Infinity : box.height / 2 / Math.abs(dy);
    const t = Math.min(tx, ty);
    const c = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    return { x: c.x + sign * dx * t, y: c.y + sign * dy * t };
  };
  const p1 = exit(a, 1);
  const p2 = exit(b, -1);
  for (const o of boxes) {
    if (o === a || o === b) continue;
    if (segmentHitsRect(p1, p2, rectOf(o, pad))) return null;
  }
  return [p1, p2];
}

/** 任意线段与轴对齐矩形是否相交（Liang–Barsky 裁剪） */
function segmentHitsRect(p: { x: number; y: number }, q: { x: number; y: number }, r: Rect): boolean {
  let t0 = 0;
  let t1 = 1;
  const dx = q.x - p.x;
  const dy = q.y - p.y;
  const edges: Array<[number, number]> = [
    [-dx, p.x - r.minX],
    [dx, r.maxX - p.x],
    [-dy, p.y - r.minY],
    [dy, r.maxY - p.y],
  ];
  for (const [pp, qq] of edges) {
    if (Math.abs(pp) < 1e-9) {
      if (qq < 0) return false;
      continue;
    }
    const t = qq / pp;
    if (pp < 0) t0 = Math.max(t0, t);
    else t1 = Math.min(t1, t);
    if (t0 > t1) return false;
  }
  return true;
}

/**
 * 标签左上角：放在最长一段的中点旁，避开节点（外扩 4px）与已放好的标签。
 * 水平段放上方、再试下方；竖直段放右侧、再试左侧；都挤就沿段挪到 1/3、2/3 处。
 */
export function placeLabel(
  path: Array<{ x: number; y: number }>,
  width: number,
  height: number,
  boxes: RouteBox[],
  placed: Rect[],
): { x: number; y: number } {
  let longest = 0;
  let seg = 0;
  for (let i = 0; i + 1 < path.length; i++) {
    const len = Math.abs(path[i + 1].x - path[i].x) + Math.abs(path[i + 1].y - path[i].y);
    if (len > longest) {
      longest = len;
      seg = i;
    }
  }
  const p = path[seg] ?? { x: 0, y: 0 };
  const q = path[seg + 1] ?? p;
  const horizontal = Math.abs(q.x - p.x) >= Math.abs(q.y - p.y);
  const blockers = [...boxes.map((b) => rectOf(b, 4)), ...placed];
  const free = (x: number, y: number) =>
    !blockers.some((r) => x < r.maxX && x + width > r.minX && y < r.maxY && y + height > r.minY);

  const candidates: Array<{ x: number; y: number }> = [];
  for (const t of [0.5, 0.33, 0.67, 0.2, 0.8]) {
    const mx = p.x + (q.x - p.x) * t;
    const my = p.y + (q.y - p.y) * t;
    if (horizontal) {
      candidates.push({ x: mx - width / 2, y: my - height - 6 }, { x: mx - width / 2, y: my + 6 });
    } else {
      candidates.push({ x: mx + 8, y: my - height / 2 }, { x: mx - width - 8, y: my - height / 2 });
    }
  }
  const pick = candidates.find((c) => free(c.x, c.y)) ?? candidates[0];
  placed.push({ minX: pick.x - 4, minY: pick.y - 2, maxX: pick.x + width + 4, maxY: pick.y + height + 2 });
  return pick;
}
