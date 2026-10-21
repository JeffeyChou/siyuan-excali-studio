/**
 * 骨架线描迹（2026-10-21 P1 补强）：任意朝向的墨迹 → 中心线 + 垂直笔宽。
 *
 * 按列切带只适合横长的笔触：遇到转弯、近垂直、实心箭头时，一列会跨过整个
 * 斜向墨迹，厚度被高估成楔形。这里改用「距离场 + Zhang-Suen 细化」拿中心线，
 * 笔宽取 2×最近背景距离，方向不再受限；横长的毛笔仍走原列扫法（保留飞白）。
 *
 * 纯逻辑：不碰 canvas / vendor，node 单测直接喂 InkMask。
 */

import type { InkMask, TraceOptions, TracePoint, TraceStrand } from "./ink-trace.ts";

/** 骨架细化的最大边长；大图先降采样，坐标与厚度按比例还原 */
const SKELETON_MAX_DIM = 640;
/** 最粗列 / 中位列厚超过这个倍数 → 列扫法已失真 */
const COLUMN_THICKNESS_RATIO = 2.4;
/** 墨迹包围盒宽高比低于这个值 → 不是横长笔触，优先骨架 */
const COLUMN_ASPECT_MIN = 2.2;

type ColumnStats = {
  aspect: number;
  medianHeight: number;
  maxHeight: number;
};

/** 只看「按列切带」是否还站得住：横长且各列厚度均匀才算合适 */
export function pickTraceMethod(mask: InkMask): "column" | "skeleton" {
  const { width: w, height: h, bits } = mask;
  if (w <= 0 || h <= 0) return "column";
  const heights: number[] = [];
  let minX = w;
  let maxX = -1;
  let minY = h;
  let maxY = -1;
  for (let x = 0; x < w; x++) {
    let start = -1;
    for (let y = 0; y < h; y++) {
      const ink = bits[y * w + x] === 1;
      if (ink) {
        if (start < 0) start = y;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      } else if (start >= 0) {
        heights.push(y - start);
        start = -1;
      }
    }
    if (start >= 0) heights.push(h - start);
  }
  if (heights.length === 0) return "column";
  heights.sort((a, b) => a - b);
  const stats: ColumnStats = {
    aspect: (maxX - minX + 1) / Math.max(1, maxY - minY + 1),
    medianHeight: heights[heights.length >> 1],
    maxHeight: heights[heights.length - 1],
  };
  if (stats.aspect < COLUMN_ASPECT_MIN) return "skeleton";
  if (stats.maxHeight / Math.max(1, stats.medianHeight) > COLUMN_THICKNESS_RATIO) return "skeleton";
  return "column";
}

/* ------------------------------ 距离场 ------------------------------ */

/** Felzenszwalb 一维平方距离变换 */
function dt1d(f: Float64Array, n: number, d: Float64Array, v: Int32Array, z: Float64Array): void {
  const INF = 1e20;
  let k = 0;
  v[0] = 0;
  z[0] = -INF;
  z[1] = INF;
  for (let q = 1; q < n; q++) {
    let s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    while (s <= z[k]) {
      k--;
      s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    }
    k++;
    v[k] = q;
    z[k] = s;
    z[k + 1] = INF;
  }
  k = 0;
  for (let q = 0; q < n; q++) {
    while (z[k + 1] < q) k++;
    d[q] = (q - v[k]) * (q - v[k]) + f[v[k]];
  }
}

/** 每个墨迹像素到最近背景的欧氏距离（背景为 0） */
function distanceField(mask: InkMask): Float64Array {
  const { width: w, height: h, bits } = mask;
  const INF = 1e20;
  const max = Math.max(w, h);
  const f = new Float64Array(max);
  const d = new Float64Array(max);
  const v = new Int32Array(max);
  const z = new Float64Array(max + 1);
  const grid = new Float64Array(w * h);
  for (let i = 0; i < w * h; i++) grid[i] = bits[i] ? INF : 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) f[x] = grid[y * w + x];
    dt1d(f, w, d, v, z);
    for (let x = 0; x < w; x++) grid[y * w + x] = d[x];
  }
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) f[y] = grid[y * w + x];
    dt1d(f, h, d, v, z);
    for (let y = 0; y < h; y++) grid[y * w + x] = d[y];
  }
  const dist = new Float64Array(w * h);
  for (let i = 0; i < w * h; i++) dist[i] = bits[i] ? Math.sqrt(grid[i]) : 0;
  return dist;
}

/* ------------------------------ 细化 ------------------------------ */

function neighborCount(bits: Uint8Array, w: number, h: number, x: number, y: number): number {
  let n = 0;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      const nx = x + dx;
      const ny = y + dy;
      if (nx >= 0 && ny >= 0 && nx < w && ny < h && bits[ny * w + nx]) n++;
    }
  }
  return n;
}

/**
 * Zhang-Suen 细化。逐像素不分配数组（大图上这是数量级差异），
 * 并且只在墨迹包围盒里扫。
 */
function thin(mask: InkMask): Uint8Array {
  const { width: w, height: h, bits } = mask;
  const sk = new Uint8Array(bits);
  for (let i = 0; i < w * h; i++) sk[i] = bits[i] ? 1 : 0;
  let minX = w;
  let minY = h;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!bits[y * w + x]) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  if (maxX < 0) return sk;
  const x0 = Math.max(1, minX);
  const x1 = Math.min(w - 2, maxX);
  const y0 = Math.max(1, minY);
  const y1 = Math.min(h - 2, maxY);
  const get = (x: number, y: number): number => sk[y * w + x];
  let changed = true;
  let guard = 0;
  while (changed && guard++ < 400) {
    changed = false;
    for (let step = 0; step < 2; step++) {
      const del: number[] = [];
      for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
          if (!sk[y * w + x]) continue;
          const p2 = get(x, y - 1);
          const p3 = get(x + 1, y - 1);
          const p4 = get(x + 1, y);
          const p5 = get(x + 1, y + 1);
          const p6 = get(x, y + 1);
          const p7 = get(x - 1, y + 1);
          const p8 = get(x - 1, y);
          const p9 = get(x - 1, y - 1);
          const b = p2 + p3 + p4 + p5 + p6 + p7 + p8 + p9;
          if (b < 2 || b > 6) continue;
          const a =
            (!p2 && p3 ? 1 : 0) +
            (!p3 && p4 ? 1 : 0) +
            (!p4 && p5 ? 1 : 0) +
            (!p5 && p6 ? 1 : 0) +
            (!p6 && p7 ? 1 : 0) +
            (!p7 && p8 ? 1 : 0) +
            (!p8 && p9 ? 1 : 0) +
            (!p9 && p2 ? 1 : 0);
          if (a !== 1) continue;
          if (step === 0) {
            if (p2 * p4 * p6 !== 0) continue;
            if (p4 * p6 * p8 !== 0) continue;
          } else {
            if (p2 * p4 * p8 !== 0) continue;
            if (p2 * p6 * p8 !== 0) continue;
          }
          del.push(y * w + x);
        }
      }
      if (del.length > 0) {
        changed = true;
        for (const i of del) sk[i] = 0;
      }
    }
  }
  return sk;
}

/* ------------------------------ 路径提取 ------------------------------ */

const N8: Array<[number, number]> = [
  [-1, -1], [0, -1], [1, -1],
  [-1, 0], [1, 0],
  [-1, 1], [0, 1], [1, 1],
];

type SkelEdge = { a: number; b: number; pts: number[] };

function endKey(edge: number, atStart: boolean): number {
  return edge * 2 + (atStart ? 0 : 1);
}

/**
 * 骨架 → 中心线。先把骨架拆成「节点（端点/分叉）之间的边」，再在分叉处按
 * 方向把近似共线的两条边接起来：
 * 主干穿过交汇处继续走（箭头的主干接尖头），倒刺因为拐角大而留成独立短笔。
 * 早先的贪心走线在实心箭头里会把主干拐进上倒刺，只看一步投票怎么调都难稳。
 */
function pathsOf(sk: Uint8Array, w: number, h: number, dist: Float64Array): number[][] {
  const deg = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (sk[y * w + x]) deg[y * w + x] = neighborCount(sk, w, h, x, y);
    }
  }

  // 相邻的端点/分叉像素归成同一个节点，避免阶梯伪分叉把一条线切碎
  const clusterOf = new Int32Array(w * h).fill(-1);
  let clusterCount = 0;
  for (let i = 0; i < w * h; i++) {
    if (!sk[i] || deg[i] === 2 || clusterOf[i] >= 0) continue;
    const stack = [i];
    clusterOf[i] = clusterCount;
    while (stack.length > 0) {
      const cur = stack.pop() as number;
      const cx = cur % w;
      const cy = Math.floor(cur / w);
      for (const [ox, oy] of N8) {
        const nx = cx + ox;
        const ny = cy + oy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const ni = ny * w + nx;
        if (!sk[ni] || deg[ni] === 2 || clusterOf[ni] >= 0) continue;
        clusterOf[ni] = clusterCount;
        stack.push(ni);
      }
    }
    clusterCount++;
  }

  const interiorUsed = new Uint8Array(w * h);
  const edges: SkelEdge[] = [];
  for (let p = 0; p < w * h; p++) {
    if (!sk[p] || clusterOf[p] < 0) continue;
    const px = p % w;
    const py = Math.floor(p / w);
    for (const [ox, oy] of N8) {
      const nx = px + ox;
      const ny = py + oy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const q = ny * w + nx;
      if (!sk[q] || clusterOf[q] === clusterOf[p]) continue;
      if (clusterOf[q] < 0 && interiorUsed[q]) continue;
      const pts = [p];
      let prev = p;
      let cur = q;
      let end = -1;
      while (true) {
        if (clusterOf[cur] >= 0) {
          pts.push(cur);
          end = clusterOf[cur];
          break;
        }
        if (interiorUsed[cur]) {
          pts.length = 0;
          break;
        }
        pts.push(cur);
        interiorUsed[cur] = 1;
        const cx = cur % w;
        const cy = Math.floor(cur / w);
        let next = -1;
        for (const [dx, dy] of N8) {
          const tx = cx + dx;
          const ty = cy + dy;
          if (tx < 0 || ty < 0 || tx >= w || ty >= h) continue;
          const ti = ty * w + tx;
          if (!sk[ti] || ti === prev) continue;
          next = ti;
          break;
        }
        if (next < 0) break;
        prev = cur;
        cur = next;
      }
      if (pts.length < 2 || end < 0) continue;
      // 两个节点直接相邻时会在两个方向各走一次，只留一次
      if (pts.length === 2 && clusterOf[p] > end) continue;
      edges.push({ a: clusterOf[p], b: end, pts });
    }
  }

  // 与节点无关的闭合环（圆环类图形）：单独走一圈
  const loops: number[][] = [];
  for (let i = 0; i < w * h; i++) {
    if (!sk[i] || clusterOf[i] >= 0 || interiorUsed[i]) continue;
    const pts = [i];
    interiorUsed[i] = 1;
    let prev = -1;
    let cur = i;
    while (true) {
      const cx = cur % w;
      const cy = Math.floor(cur / w);
      let next = -1;
      for (const [dx, dy] of N8) {
        const tx = cx + dx;
        const ty = cy + dy;
        if (tx < 0 || ty < 0 || tx >= w || ty >= h) continue;
        const ti = ty * w + tx;
        if (!sk[ti] || ti === prev) continue;
        if (ti === i) {
          pts.push(i);
          next = -1;
          break;
        }
        if (!interiorUsed[ti]) {
          next = ti;
          break;
        }
      }
      if (next < 0) break;
      pts.push(next);
      interiorUsed[next] = 1;
      prev = cur;
      cur = next;
    }
    if (pts.length >= 4) loops.push(pts);
  }

  // 2px 短边在台阶状骨架里是「两个分叉簇之间的真实连接」，早先一律丢掉会把
  // 钩尖、箭尖切成孤立碎片，主链停在分叉处再被补尖，画出重复的尖。
  // 毛刺改由「只对度为 1 的真正端点补尖」来兜住。
  const kept = edges.filter((e) => e.pts.length >= 2);

  // 每个分叉节点上，把方向最接近相反的两条边接起来（主干直行，倒刺不接）
  const dirs: Array<[number, number]> = [];
  const endWidths: number[] = [];
  for (let i = 0; i < kept.length; i++) {
    const pts = kept[i].pts;
    const k = Math.min(10, pts.length - 1);
    const first = pts[0];
    const last = pts[pts.length - 1];
    const fx = (pts[k] % w) - (first % w);
    const fy = Math.floor(pts[k] / w) - Math.floor(first / w);
    const fl = Math.hypot(fx, fy) || 1;
    const lx = (pts[pts.length - 1 - k] % w) - (last % w);
    const ly = Math.floor(pts[pts.length - 1 - k] / w) - Math.floor(last / w);
    const ll = Math.hypot(lx, ly) || 1;
    dirs[endKey(i, true)] = [fx / fl, fy / fl];
    dirs[endKey(i, false)] = [lx / ll, ly / ll];
    // 分叉配对还要看「这根分支另一端有多粗」：主干与尖头都粗、倒刺较细。
    // 只靠方向时，上倒刺与尖头也能形成 120° 钝角，会把主干留在原地。
    endWidths[endKey(i, true)] = dist[last] * 2;
    endWidths[endKey(i, false)] = dist[first] * 2;
  }

  const incident = new Map<number, number[]>();
  for (let i = 0; i < kept.length; i++) {
    for (const atStart of [true, false]) {
      const cluster = atStart ? kept[i].a : kept[i].b;
      const list = incident.get(cluster) ?? [];
      list.push(endKey(i, atStart));
      incident.set(cluster, list);
    }
  }

  const pair = new Int32Array(kept.length * 2).fill(-1);
  for (const ends of incident.values()) {
    const used = new Set<number>();
    while (true) {
      let bestI = -1;
      let bestJ = -1;
      let bestScore = 0;
      for (let i = 0; i < ends.length; i++) {
        if (used.has(ends[i])) continue;
        for (let j = i + 1; j < ends.length; j++) {
          if (used.has(ends[j])) continue;
          const a = dirs[ends[i]];
          const b = dirs[ends[j]];
          const dot = a[0] * b[0] + a[1] * b[1];
          if (dot > -0.35) continue;
          const score =
            Math.min(endWidths[ends[i]], endWidths[ends[j]]) * (0.55 + 0.45 * -dot);
          if (score > bestScore) {
            bestScore = score;
            bestI = ends[i];
            bestJ = ends[j];
          }
        }
      }
      if (bestI < 0) break;
      pair[bestI] = bestJ;
      pair[bestJ] = bestI;
      used.add(bestI);
      used.add(bestJ);
    }
  }

  const usedEdge = new Uint8Array(kept.length);
  const chains: number[][] = [];
  function walkChain(edgeIndex: number, fromStart: boolean): number[] {
    const out: number[] = [];
    let e = edgeIndex;
    let atStart = fromStart;
    while (e >= 0 && !usedEdge[e]) {
      usedEdge[e] = 1;
      const pts = atStart ? kept[e].pts : [...kept[e].pts].reverse();
      for (const p of pts) if (out[out.length - 1] !== p) out.push(p);
      const exit = endKey(e, !atStart);
      const next = pair[exit];
      if (next < 0) break;
      e = next >> 1;
      atStart = (next & 1) === 0;
    }
    return out;
  }

  for (let e = 0; e < kept.length; e++) {
    if (usedEdge[e]) continue;
    if (pair[endKey(e, true)] < 0) chains.push(walkChain(e, true));
    else if (pair[endKey(e, false)] < 0) chains.push(walkChain(e, false));
  }
  for (let e = 0; e < kept.length; e++) if (!usedEdge[e]) chains.push(walkChain(e, true));
  chains.push(...loops);
  return chains.filter((p) => p.length >= 2);
}

/**
 * 细化会在尖角附近留一串度为 3 的台阶，它们被聚成同一簇，图提取只能走到
 * 簇的入口，箭尖那 3~4px 的小刺因此丢失，画出来是圆头。这里沿骨架做一次
 * 短 BFS，找最近的度为 1 的端点；第一步必须和链的走向同向，避免在分叉处
 * 拐进旁边的倒钩。距离限 12px，主干/倒钩的圆头不会互相认领。
 */
function clusterTipPath(
  sk: Uint8Array,
  w: number,
  h: number,
  start: number,
  ox: number,
  oy: number,
): number[] {
  if (neighborCount(sk, w, h, start % w, Math.floor(start / w)) <= 1) return [];
  const prev = new Map<number, number>();
  const first = new Map<number, [number, number]>();
  const seen = new Set<number>([start]);
  const queue = [start];
  for (let qi = 0; qi < queue.length; qi++) {
    const cur = queue[qi];
    const cx = cur % w;
    const cy = Math.floor(cur / w);
    if (cur !== start && neighborCount(sk, w, h, cx, cy) === 1) {
      const f = first.get(cur) as [number, number];
      const fl = Math.hypot(f[0], f[1]) || 1;
      if ((f[0] / fl) * ox + (f[1] / fl) * oy < 0.35) continue;
      const out: number[] = [];
      for (let p = cur; p !== start; p = prev.get(p) as number) out.push(p);
      return out.reverse();
    }
    if (Math.hypot(cx - (start % w), cy - Math.floor(start / w)) >= 12) continue;
    for (const [dx, dy] of N8) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const ni = ny * w + nx;
      if (!sk[ni] || seen.has(ni)) continue;
      seen.add(ni);
      prev.set(ni, cur);
      first.set(ni, cur === start ? [dx, dy] : (first.get(cur) as [number, number]));
      queue.push(ni);
    }
  }
  return [];
}

/** 把链两端的簇内小刺接回链上 */
function recoverClusterTips(chains: number[][], sk: Uint8Array, w: number, h: number): number[][] {
  return chains.map((pts) => {
    if (pts.length < 3) return pts;
    const n = pts.length;
    const k = Math.min(4, n - 1);
    const kx = k;
    const headOutX = (pts[0] % w) - (pts[kx] % w);
    const headOutY = Math.floor(pts[0] / w) - Math.floor(pts[kx] / w);
    const headLen = Math.hypot(headOutX, headOutY) || 1;
    const head = clusterTipPath(sk, w, h, pts[0], headOutX / headLen, headOutY / headLen);
    const tailOutX = (pts[n - 1] % w) - (pts[n - 1 - kx] % w);
    const tailOutY = Math.floor(pts[n - 1] / w) - Math.floor(pts[n - 1 - kx] / w);
    const tailLen = Math.hypot(tailOutX, tailOutY) || 1;
    const tail = clusterTipPath(sk, w, h, pts[n - 1], tailOutX / tailLen, tailOutY / tailLen);
    return [...head.slice().reverse(), ...pts, ...tail];
  });
}

/* ------------------------------ 采样与平滑 ------------------------------ */

/**
 * 端点补尖：细化会把实心三角头的角「吃」掉，骨架停在头内部，端点还剩十几像素
 * 的厚度，画出来就是圆头。沿路径方向一直走到墨迹边界，厚度取该点的距离场，
 * 尖端自然收到 1~2px。
 *
 * 但不是所有端点都该补：毛笔的起笔/收笔是圆头，补了反而变成尖尾巴。
 * 判据是「边界在多远」——圆头的骨架端点离边界约半个笔宽；尖角会明显更远。
 */
function extendTip(
  path: number[],
  sk: Uint8Array,
  ink: Uint8Array,
  dist: Float64Array,
  w: number,
  h: number,
  fromStart: boolean,
): number[] {
  const n = path.length;
  if (n < 2) return [];
  const end = fromStart ? path[0] : path[n - 1];
  // 只有真正的骨架端点才补尖；链尾落在分叉处时，沿切线走出去会冲到别的分支上
  const ex = end % w;
  const ey = Math.floor(end / w);
  if (neighborCount(sk, w, h, ex, ey) > 1) return [];
  const endWidth = Math.max(2, dist[end] * 2);
  const back = fromStart ? path[Math.min(n - 1, 4)] : path[n - 1 - Math.min(n - 1, 4)];
  const bx = back % w;
  const by = Math.floor(back / w);
  const len = Math.hypot(ex - bx, ey - by);
  if (!(len > 0)) return [];
  const dx = (ex - bx) / len;
  const dy = (ey - by) / len;

  // 骨架末端的切线常被旁边的倒刺带偏；在 ±30° 里挑「往前墨迹最长」的方向，
  // 箭头尖端才能真正走到边界，而圆头无论怎么转都只多出半个笔宽。
  const walk = (ux: number, uy: number): number[] => {
    const extra: number[] = [];
    let x = ex;
    let y = ey;
    // 半像素步进：整数步在斜方向会「原地踏步」而提前断线，选不出真正的尖端
    for (let step = 0; step < 128; step++) {
      x += ux * 0.5;
      y += uy * 0.5;
      const nx = Math.round(x);
      const ny = Math.round(y);
      if (nx <= 0 || ny <= 0 || nx >= w - 1 || ny >= h - 1) break;
      const ni = ny * w + nx;
      // 走墨迹（不是骨架）：骨架在实心头部会提前收线
      if (!ink[ni]) break;
      if (!extra.includes(ni)) {
        extra.push(ni);
        if (dist[ni] <= 1.2) break;
      }
    }
    return extra;
  };
  const base = Math.atan2(dy, dx);
  let extra: number[] = [];
  for (let k = -5; k <= 5; k++) {
    const a = base + k * 0.1;
    const candidate = walk(Math.cos(a), Math.sin(a));
    if (candidate.length > extra.length) extra = candidate;
  }
  // 圆头的骨架端点离边界正好半个笔宽（≈0.5×endWidth），半像素步进后还会多探
  // 一点；实测圆头/倒钩尖在 0.8~1.0，箭尖能到 1.7 以上。1.25 只放行真尖角，
  // 保住毛笔起收笔的圆头。
  if (extra.length < endWidth * 1.25) return [];
  return extra;
}

/** 在原始采样分辨率上把端点延伸到边界（含厚度） */
function withTips(
  path: number[],
  sk: Uint8Array,
  ink: Uint8Array,
  dist: Float64Array,
  w: number,
  h: number,
): TracePoint[] {
  const closed = path.length > 2 && path[0] === path[path.length - 1];
  const head = closed ? [] : extendTip(path, sk, ink, dist, w, h, true);
  const tail = closed ? [] : extendTip(path, sk, ink, dist, w, h, false);
  const indices = [...head.slice().reverse(), ...path, ...tail];
  const out: TracePoint[] = [];
  for (const i of indices) {
    const x = i % w;
    const y = Math.floor(i / w);
    const point = { x, y, thickness: Math.max(1, dist[i] * 2) };
    const prev = out[out.length - 1];
    if (prev && prev.x === point.x && prev.y === point.y) continue;
    out.push(point);
  }
  return out;
}

function smooth(values: number[]): number[] {
  return values.map((v, i) => {
    const a = values[Math.max(0, i - 1)];
    const b = values[Math.min(values.length - 1, i + 1)];
    return (a + v * 2 + b) / 4;
  });
}

function sampleByArc(points: TracePoint[], maxPoints: number): TracePoint[] {
  const cap = Math.max(2, Math.floor(maxPoints));
  if (points.length <= cap) return points;
  const acc = [0];
  for (let i = 1; i < points.length; i++) {
    acc.push(acc[i - 1] + Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y));
  }
  const total = acc[acc.length - 1];
  if (!(total > 0)) return points.slice(0, cap);
  const out: TracePoint[] = [];
  let j = 0;
  for (let k = 0; k < cap; k++) {
    const target = (total * k) / (cap - 1);
    while (j < acc.length - 2 && acc[j + 1] < target) j++;
    const t = (target - acc[j]) / Math.max(1e-9, acc[j + 1] - acc[j]);
    const a = points[j];
    const b = points[j + 1];
    out.push({
      x: a.x + (b.x - a.x) * t,
      y: a.y + (b.y - a.y) * t,
      thickness: a.thickness + (b.thickness - a.thickness) * t,
    });
  }
  return out;
}

/**
 * perfect-freehand 一笔的直径 = size×(0.4 + 1.2×压力)，峰值只能到 size：
 * 单笔的最小直径是峰宽的 40%，细尖在一条笔画里收不出来（会被圆帽撑成球）。
 * 按宽窄把中心线切成小段、每段重新定峰宽，尖端就能细到 1~2px；
 * 相邻段共用切点，圆帽相互盖住，接缝看不出来。
 */
const SEGMENT_WIDTH_RATIO = 2.2;

function splitByWidth(points: TracePoint[]): TraceStrand[] {
  const n = points.length;
  if (n < 2) return [];
  const ths = points.map((p) => Math.max(1, p.thickness));
  const out: TraceStrand[] = [];
  let start = 0;
  while (start < n - 1) {
    let maxTh = ths[start];
    let minTh = ths[start];
    let end = start;
    for (let i = start + 1; i < n; i++) {
      const th = ths[i];
      const nextMax = Math.max(maxTh, th);
      const nextMin = Math.min(minTh, th);
      if (nextMax / nextMin > SEGMENT_WIDTH_RATIO) break;
      maxTh = nextMax;
      minTh = nextMin;
      end = i;
    }
    if (end === start) end = start + 1;
    out.push(points.slice(start, end + 1));
    if (end >= n - 1) break;
    start = end;
  }
  return out;
}

/** 大图先按整块「有墨即墨」降采样，细化代价降到可交互范围 */
function downsample(mask: InkMask, maxDim: number): { mask: InkMask; scale: number } {
  const { width: w, height: h } = mask;
  const scale = Math.min(1, maxDim / Math.max(w, h));
  if (scale >= 1) return { mask, scale: 1 };
  const nw = Math.max(1, Math.round(w * scale));
  const nh = Math.max(1, Math.round(h * scale));
  const bits = new Uint8Array(nw * nh);
  for (let y = 0; y < nh; y++) {
    const sy0 = Math.floor((y * h) / nh);
    const sy1 = Math.max(sy0 + 1, Math.floor(((y + 1) * h) / nh));
    for (let x = 0; x < nw; x++) {
      const sx0 = Math.floor((x * w) / nw);
      const sx1 = Math.max(sx0 + 1, Math.floor(((x + 1) * w) / nw));
      let ink = 0;
      for (let sy = sy0; sy < sy1 && !ink; sy++) {
        for (let sx = sx0; sx < sx1; sx++) {
          if (mask.bits[sy * w + sx]) {
            ink = 1;
            break;
          }
        }
      }
      if (ink) bits[y * nw + x] = 1;
    }
  }
  return { mask: { width: nw, height: nh, bits }, scale };
}

/* ------------------------------ 入口 ------------------------------ */

/**
 * 骨架描迹：返回与列扫法同口径的 TraceStrand（点坐标在原图采样分辨率下，
 * 厚度是垂直笔宽）。排序、截断、采样参数都沿用 TraceOptions。
 */
export function extractSkeletonStrands(mask: InkMask, opts: TraceOptions = {}): TraceStrand[] {
  const minLen = opts.minStrandLength ?? 6;
  const minArea = opts.minStrandArea ?? 24;
  const maxStrands = opts.maxStrands ?? 60;
  const maxPoints = opts.maxPoints ?? 48;
  if (mask.width <= 0 || mask.height <= 0) return [];

  const { mask: small, scale } = downsample(mask, SKELETON_MAX_DIM);
  const dist = distanceField(small);
  const sk = thin(small);
  const paths = recoverClusterTips(
    pathsOf(sk, small.width, small.height, dist),
    sk,
    small.width,
    small.height,
  );

  const strands: TraceStrand[] = [];
  const minPathLen = Math.max(2, minLen / scale);
  for (const path of paths) {
    let pathLen = 0;
    for (let i = 1; i < path.length; i++) {
      pathLen += Math.hypot((path[i] % small.width) - (path[i - 1] % small.width), Math.floor(path[i] / small.width) - Math.floor(path[i - 1] / small.width));
    }
    // 按弧长而不是点数过滤：台阶状骨架的点很密，箭尖小刺只有 3~4 个点却能走 10px；
    // 真正的 2px 飞点弧长也短，仍会被丢掉。
    if (pathLen < minPathLen) continue;
    const raw = withTips(path, sk, small.bits, dist, small.width, small.height);
    // 笔宽直接取 2×内切圆半径：扫过的圆盘都在墨迹内，三根中心线拼起来
    // 就是原图的实心轮廓（交汇处变粗正是为了填满箭头三角）。
    const pts = raw.map((p) => ({
      x: p.x / scale,
      y: p.y / scale,
      thickness: Math.max(1, p.thickness / scale),
    }));
    const px = pts.map((p) => p.x);
    const py = pts.map((p) => p.y);
    if (Math.hypot(Math.max(...px) - Math.min(...px), Math.max(...py) - Math.min(...py)) < 3) continue;
    const area = pts.reduce((n, p) => n + p.thickness, 0);
    if (area < minArea) continue;
    const xs = smooth(smooth(pts.map((p) => p.x)));
    const ys = smooth(smooth(pts.map((p) => p.y)));
    const rawTh = pts.map((p) => p.thickness);
    const ths = smooth(rawTh);
    // 端点不做平滑，否则补尖/圆头会被邻居带偏；坐标同理，尖会缩回几像素
    if (ths.length > 0) {
      const last = ths.length - 1;
      xs[0] = px[0];
      ys[0] = py[0];
      xs[last] = px[last];
      ys[last] = py[last];
      ths[0] = rawTh[0];
      ths[last] = rawTh[last];
    }
    const smoothed: TracePoint[] = pts.map((p, i) => ({ x: xs[i], y: ys[i], thickness: ths[i] }));
    for (const segment of splitByWidth(smoothed)) {
      strands.push(sampleByArc(segment, maxPoints));
    }
  }

  strands.sort((a, b) => {
    const area = (s: TraceStrand): number => s.reduce((n, p) => n + p.thickness, 0);
    return area(b) - area(a);
  });
  return maxStrands > 0 ? strands.slice(0, maxStrands) : strands;
}
