/**
 * 2026-10-18 A：计划 DSL 的布局器（纯函数，node 可直接跑）。
 *
 * 输入归一化计划，输出**本地坐标**的节点盒 + 连线走线；渲染层统一平移 origin。
 * 四种布局只解决「节点摆哪」：lr/tb 按 DAG 分层，grid 方阵，radial 以度数最高的
 * 节点为中心。lr/tb 分层后有两步收拾：源点下沉到最近后继的上一层（不再顶着整层跨线），
 * 层内按邻居重心排序（减少交叉）。走线交给 route.ts 的正交避障。尺寸/间距是 token（风格包的 space 覆盖），缺省沿用「至少 24px 呼吸」
 * 的房屋口径，模型不再碰坐标。
 */

import {
  anchorPoint,
  boundingBoxOf,
  estimateTextWidth,
  nearestSide,
  wrapTextByWidth,
  type Box,
  type Side,
} from "../ea-element.ts";
import type { DrawingPlan, PlanEdge, PlanNode, PlanShape } from "./plan.ts";
import { fillFor, presetOf, type PlanPresetSpec, type PlanSpace } from "./preset.ts";
import { DEFAULT_ROUTE_OPTIONS, buildRouteGrid, placeLabel, routeOrthogonal, routeStraight, type PortUsage, type Segment } from "./route.ts";

/** 历史硬编码口径 = 缺省间距；风格包的 space 只覆盖写了的字段 */
const DEFAULT_SPACE: PlanSpace = {
  minW: 160,
  minH: 90,
  padX: 64,
  padY: 40,
  gapX: 110,
  gapY: 64,
  gridGapX: 90,
  gridGapY: 72,
  radialMinRadius: 240,
  radialGap: 120,
  maxGridCols: 4,
  textWrap: 200,
};

function spaceOf(preset: PlanPresetSpec): PlanSpace {
  return { ...DEFAULT_SPACE, ...preset.space };
}

export interface NodeBox {
  id: string;
  label: string;
  shape: PlanShape;
  group?: string;
  index: number;
  fill: string;
  lines: string[];
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface EdgeRoute {
  from: string;
  to: string;
  label?: string;
  side1: Side;
  side2: Side;
  /** 起点锚点（本地坐标） */
  p1: { x: number; y: number };
  /** 终点锚点（本地坐标） */
  p2: { x: number; y: number };
  /** 相对 p1 的折点（Excalidraw arrow.points 口径） */
  points: Array<[number, number]>;
  /** 标签左上角（本地坐标；无标签时缺省） */
  labelAt?: { x: number; y: number };
}

export interface PlanLayoutResult {
  nodes: NodeBox[];
  routes: EdgeRoute[];
  titleBox: Box | null;
  contentBox: Box;
  preset: PlanPresetSpec;
}

function measureNode(node: PlanNode, preset: PlanPresetSpec, index: number, space: PlanSpace): NodeBox {
  const fontSize = preset.fontSizes.node;
  const lines = wrapTextByWidth(node.label, space.textWrap, fontSize);
  const textW = Math.max(1, ...lines.map((line) => estimateTextWidth(line, fontSize)));
  const textH = Math.ceil(lines.length * fontSize * 1.25);

  let width: number;
  let height: number;
  if (node.shape === "text") {
    width = Math.max(textW, 24);
    height = Math.max(textH, fontSize);
  } else {
    width = Math.max(space.minW, textW + space.padX);
    height = Math.max(space.minH, textH + space.padY);
  }
  if (node.shape === "ellipse") {
    width = Math.ceil(width * 1.1);
    height = Math.ceil(height * 1.12);
  } else if (node.shape === "diamond") {
    width = Math.ceil(width * 1.24);
    height = Math.ceil(height * 1.32);
  }

  return {
    id: node.id,
    label: node.label,
    shape: node.shape,
    ...(node.group ? { group: node.group } : {}),
    index,
    fill: node.shape === "text" ? "transparent" : fillFor(preset, index, node.group),
    lines,
    x: 0,
    y: 0,
    width,
    height,
  };
}

/** DAG 分层（Kahn）。有环时按输入顺序挑一个未处理节点强行开层，保证收敛。 */
function ranksOf(nodes: NodeBox[], edges: PlanEdge[]): Map<string, number> {
  const order = new Map(nodes.map((n) => [n.id, n.index]));
  const indeg = new Map<string, number>(nodes.map((n) => [n.id, 0]));
  const out = new Map<string, string[]>(nodes.map((n) => [n.id, []]));
  for (const e of edges) {
    out.get(e.from)?.push(e.to);
    indeg.set(e.to, (indeg.get(e.to) ?? 0) + 1);
  }
  const rank = new Map<string, number>(nodes.map((n) => [n.id, 0]));
  const done = new Set<string>();
  const queue: string[] = nodes.filter((n) => (indeg.get(n.id) ?? 0) === 0).map((n) => n.id);

  while (done.size < nodes.length) {
    if (queue.length === 0) {
      const rest = nodes.filter((n) => !done.has(n.id)).sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
      const pick = rest[0];
      let forced = 0;
      for (const e of edges) {
        if (e.to === pick.id && done.has(e.from)) forced = Math.max(forced, (rank.get(e.from) ?? 0) + 1);
      }
      rank.set(pick.id, forced);
      queue.push(pick.id);
    }
    const id = queue.shift();
    if (!id || done.has(id)) continue;
    done.add(id);
    for (const v of out.get(id) ?? []) {
      if (done.has(v)) continue;
      rank.set(v, Math.max(rank.get(v) ?? 0, (rank.get(id) ?? 0) + 1));
      const next = (indeg.get(v) ?? 1) - 1;
      indeg.set(v, next);
      if (next <= 0) queue.push(v);
    }
  }

  // 源点下沉：没有入边的节点紧挨着最近的后继，而不是一律顶在第 0 层。否则一个只连
  // 到第 2 层的源点，它的线要横穿整个第 1 层。
  const incoming = new Set(edges.map((e) => e.to));
  for (const n of nodes) {
    if (incoming.has(n.id)) continue;
    const succ = (out.get(n.id) ?? []).map((v) => rank.get(v) ?? 0);
    if (succ.length) rank.set(n.id, Math.max(rank.get(n.id) ?? 0, Math.min(...succ) - 1));
  }
  return rank;
}

function groupByRank(nodes: NodeBox[], edges: PlanEdge[]): Map<number, NodeBox[]> {
  const ranks = ranksOf(nodes, edges);
  const groups = new Map<number, NodeBox[]>();
  for (const node of nodes) {
    const rank = ranks.get(node.id) ?? 0;
    const list = groups.get(rank) ?? [];
    list.push(node);
    groups.set(rank, list);
  }
  orderByBarycenter(groups, edges);
  return groups;
}

/**
 * 层内排序（重心法，上下各扫两遍）：每个节点排到相邻层邻居位置的平均值处。
 * 没有邻居的节点保持原位次；排序稳定，所以重心相同时仍按输入顺序，模型写的顺序
 * 在不影响交叉的地方照旧生效。
 */
function orderByBarycenter(groups: Map<number, NodeBox[]>, edges: PlanEdge[]): void {
  const ranks = [...groups.keys()].sort((a, b) => a - b);
  if (ranks.length < 2) return;
  const neighbors = new Map<string, string[]>();
  for (const e of edges) {
    if (e.from === e.to) continue;
    neighbors.set(e.from, [...(neighbors.get(e.from) ?? []), e.to]);
    neighbors.set(e.to, [...(neighbors.get(e.to) ?? []), e.from]);
  }
  const sweep = (order: number[], refOf: (i: number) => number | undefined) => {
    order.forEach((rank, i) => {
      const ref = refOf(i);
      if (ref === undefined) return;
      const pos = new Map((groups.get(ref) ?? []).map((n, k) => [n.id, k]));
      const list = groups.get(rank) ?? [];
      const keyed = list.map((n, k) => {
        const ps = (neighbors.get(n.id) ?? []).map((v) => pos.get(v)).filter((v): v is number => v !== undefined);
        const scale = Math.max(1, (groups.get(ref)?.length ?? 1) - 1) / Math.max(1, list.length - 1);
        return { n, k, key: ps.length ? ps.reduce((a, b) => a + b, 0) / ps.length / scale : k };
      });
      keyed.sort((x, y) => x.key - y.key || x.k - y.k);
      groups.set(rank, keyed.map((x) => x.n));
    });
  };
  for (let pass = 0; pass < 2; pass++) {
    sweep(ranks, (i) => (i > 0 ? ranks[i - 1] : undefined));
    const up = [...ranks].reverse();
    sweep(up, (i) => (i > 0 ? up[i - 1] : undefined));
  }
}

function layoutLr(nodes: NodeBox[], edges: PlanEdge[], space: PlanSpace): void {
  const groups = groupByRank(nodes, edges);
  const ranks = [...groups.keys()].sort((a, b) => a - b);
  const widths = ranks.map((r) => Math.max(...(groups.get(r) ?? []).map((n) => n.width)));
  const heights = ranks.map((r) => {
    const list = groups.get(r) ?? [];
    return list.reduce((sum, n) => sum + n.height, 0) + space.gapY * Math.max(0, list.length - 1);
  });
  const maxH = Math.max(0, ...heights);
  let x = 0;
  ranks.forEach((rank, ci) => {
    const list = groups.get(rank) ?? [];
    let y = Math.max(0, (maxH - heights[ci]) / 2);
    for (const node of list) {
      node.x = x + (widths[ci] - node.width) / 2;
      node.y = y;
      y += node.height + space.gapY;
    }
    x += widths[ci] + space.gapX;
  });
}

function layoutTb(nodes: NodeBox[], edges: PlanEdge[], space: PlanSpace): void {
  const groups = groupByRank(nodes, edges);
  const ranks = [...groups.keys()].sort((a, b) => a - b);
  const rowHeights = ranks.map((r) => Math.max(...(groups.get(r) ?? []).map((n) => n.height)));
  const rowWidths = ranks.map((r) => {
    const list = groups.get(r) ?? [];
    return list.reduce((sum, n) => sum + n.width, 0) + space.gapX * Math.max(0, list.length - 1);
  });
  const maxW = Math.max(0, ...rowWidths);
  let y = 0;
  ranks.forEach((rank, ri) => {
    const list = groups.get(rank) ?? [];
    let x = Math.max(0, (maxW - rowWidths[ri]) / 2);
    for (const node of list) {
      node.x = x;
      node.y = y + (rowHeights[ri] - node.height) / 2;
      x += node.width + space.gapX;
    }
    y += rowHeights[ri] + space.gapY;
  });
}

function layoutGrid(nodes: NodeBox[], space: PlanSpace): void {
  const cols = Math.max(1, Math.min(space.maxGridCols, Math.ceil(Math.sqrt(nodes.length))));
  const rows = Math.ceil(nodes.length / cols);
  const colWidths = Array.from({ length: cols }, (_, c) =>
    Math.max(0, ...nodes.filter((_, i) => i % cols === c).map((n) => n.width)),
  );
  const rowHeights = Array.from({ length: rows }, (_, r) =>
    Math.max(0, ...nodes.slice(r * cols, r * cols + cols).map((n) => n.height)),
  );
  const colX: number[] = [];
  let x = 0;
  for (let c = 0; c < cols; c++) {
    colX.push(x);
    x += colWidths[c] + space.gridGapX;
  }
  const rowY: number[] = [];
  let y = 0;
  for (let r = 0; r < rows; r++) {
    rowY.push(y);
    y += rowHeights[r] + space.gridGapY;
  }
  nodes.forEach((node, i) => {
    const c = i % cols;
    const r = Math.floor(i / cols);
    node.x = colX[c] + (colWidths[c] - node.width) / 2;
    node.y = rowY[r] + (rowHeights[r] - node.height) / 2;
  });
}

function layoutRadial(nodes: NodeBox[], edges: PlanEdge[], space: PlanSpace): void {
  if (nodes.length === 1) {
    nodes[0].x = 0;
    nodes[0].y = 0;
    return;
  }
  const degree = new Map<string, number>(nodes.map((n) => [n.id, 0]));
  for (const e of edges) {
    degree.set(e.from, (degree.get(e.from) ?? 0) + 1);
    degree.set(e.to, (degree.get(e.to) ?? 0) + 1);
  }
  const center = [...nodes].sort((a, b) => (degree.get(b.id) ?? 0) - (degree.get(a.id) ?? 0) || a.index - b.index)[0];
  const leaves = nodes.filter((n) => n.id !== center.id);
  const maxLeafW = Math.max(...leaves.map((n) => n.width));
  const maxLeafH = Math.max(...leaves.map((n) => n.height));
  const radius = Math.max(
    space.radialMinRadius,
    center.width / 2 + maxLeafW / 2 + space.radialGap,
    center.height / 2 + maxLeafH / 2 + space.radialGap,
  );
  center.x = -center.width / 2;
  center.y = -center.height / 2;

  // 同一圈上相邻两个节点的弦长不得小于「节点对角线 + 间距」，否则会叠在一起。
  // 以前所有叶子都挤在一圈、半径只看节点大小不看个数，12 个以上就开始互相重叠。
  // 一圈放不下就往外再开一圈；放得下时与以前完全一样（单圈、等分、起始角不变）。
  const pitch = Math.hypot(maxLeafW, maxLeafH) + space.radialGap / 2;
  const capacity = (r: number) => Math.max(1, Math.floor(Math.PI / Math.asin(Math.min(1, pitch / (2 * r)))));
  const rings: Array<{ r: number; nodes: NodeBox[] }> = [];
  let rest = leaves;
  let r = radius;
  while (rest.length) {
    const take = rings.length === 0 && rest.length <= capacity(r) ? rest.length : Math.min(rest.length, capacity(r));
    rings.push({ r, nodes: rest.slice(0, take) });
    rest = rest.slice(take);
    r += Math.max(maxLeafW, maxLeafH) + space.radialGap;
  }
  // 每圈的角度：第一圈等分（与以前一致）。外圈只用「从中心直线看得见」的方向：
  // 按角度采样，去掉射线会碰到已放好节点、或节点本身会压到别人的方向，再把这一圈的
  // 节点均匀铺在剩下的方向上。这样放射线不用绕行；采样不够时退回等分错半格。
  const baseStart = leaves.length <= 2 ? 0 : -Math.PI / 2;
  const placed: NodeBox[] = [center];
  const hits = (x1: number, y1: number, x2: number, y2: number, b: NodeBox, pad: number) => {
    const minX = b.x - pad, maxX = b.x + b.width + pad, minY = b.y - pad, maxY = b.y + b.height + pad;
    let t0 = 0;
    let t1 = 1;
    const dx = x2 - x1;
    const dy = y2 - y1;
    for (const [pp, qq] of [[-dx, x1 - minX], [dx, maxX - x1], [-dy, y1 - minY], [dy, maxY - y1]] as Array<[number, number]>) {
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
  };
  // 在半径 r 上给 count 个节点挑方向：以等分角为目标，挑最近的、与已选方向间距够的
  // 可见方向。挑不齐返回 null。
  const pickAngles = (r: number, count: number): number[] | null => {
    const SAMPLES = 720;
    const free: number[] = [];
    for (let i = 0; i < SAMPLES; i++) {
      const a = baseStart + (i / SAMPLES) * Math.PI * 2;
      const x = Math.cos(a) * r;
      const y = Math.sin(a) * r;
      const bx = x - maxLeafW / 2;
      const by = y - maxLeafH / 2;
      const blocked = placed.some(
        (b) =>
          b !== center &&
          (hits(0, 0, x, y, b, 12) ||
            (bx < b.x + b.width + 12 && b.x < bx + maxLeafW + 12 && by < b.y + b.height + 12 && b.y < by + maxLeafH + 12)),
      );
      if (!blocked) free.push(a);
    }
    if (free.length < count) return null;
    const minSep = 2 * Math.asin(Math.min(1, pitch / (2 * r)));
    const dist = (x: number, y: number) => {
      const d = Math.abs(x - y) % (Math.PI * 2);
      return Math.min(d, Math.PI * 2 - d);
    };
    const chosen: number[] = [];
    for (let i = 0; i < count; i++) {
      const target = baseStart + ((i + 0.5) / count) * Math.PI * 2;
      let best: number | null = null;
      for (const a of free) {
        if (chosen.some((c) => dist(a, c) < minSep - 1e-6)) continue;
        if (best === null || dist(a, target) < dist(best, target)) best = a;
      }
      if (best === null) return null;
      chosen.push(best);
    }
    return chosen;
  };

  let bump = 0;
  rings.forEach((ring, k) => {
    const count = ring.nodes.length;
    const step = (Math.PI * 2) / count;
    ring.r += bump;
    let angles = ring.nodes.map((_, i) => baseStart + step * i + (k > 0 ? step / 2 : 0));
    if (k > 0) {
      // 可见方向不够就把这一圈推远一点再挑；后面的圈跟着整体外移
      for (let attempt = 0; attempt < 4; attempt++) {
        const picked = pickAngles(ring.r, count);
        if (picked) {
          angles = picked;
          break;
        }
        const grow = ring.r * 0.15;
        ring.r += grow;
        bump += grow;
      }
    }
    ring.nodes.forEach((node, i) => {
      node.x = Math.cos(angles[i]) * ring.r - node.width / 2;
      node.y = Math.sin(angles[i]) * ring.r - node.height / 2;
      placed.push(node);
    });
  });
  const minX = Math.min(...nodes.map((n) => n.x));
  const minY = Math.min(...nodes.map((n) => n.y));
  nodes.forEach((node) => {
    node.x -= minX;
    node.y -= minY;
  });
}

function dedupePoints(points: Array<[number, number]>): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  for (const point of points) {
    const last = out[out.length - 1];
    if (!last || Math.abs(last[0] - point[0]) > 0.01 || Math.abs(last[1] - point[1]) > 0.01) out.push(point);
  }
  return out.length >= 2 ? out : [[0, 0], [0, 0]];
}

function routeEdges(nodes: NodeBox[], edges: PlanEdge[], preset: PlanPresetSpec, straight = false): EdgeRoute[] {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const routes: Array<{ index: number; route: EdgeRoute }> = [];
  const used: Segment[] = [];
  const ports: PortUsage = new Map();
  const grid = buildRouteGrid(nodes, DEFAULT_ROUTE_OPTIONS.margin);
  const labels: Array<{ minX: number; minY: number; maxX: number; maxY: number }> = [];
  // 短边先走：它们的选择余地小，先占住最直的通道
  const ordered = edges.map((edge, index) => ({ edge, index })).sort((x, y) => span(byId, x.edge) - span(byId, y.edge));
  for (const { edge, index } of ordered) {
    const a = byId.get(edge.from);
    const b = byId.get(edge.to);
    if (!a || !b) continue;
    // radial 先试直线放射；被挡住（或其他布局）才走正交避障
    const line = straight ? routeStraight(nodes, a.id, b.id) : null;
    const ortho = line
      ? { side1: nearestSide(a, b), side2: nearestSide(b, a), path: line }
      : a === b ? null : routeOrthogonal(nodes, a.id, b.id, used, DEFAULT_ROUTE_OPTIONS, ports, grid);
    if (ortho) {
      const p1 = ortho.path[0];
      const p2 = ortho.path[ortho.path.length - 1];
      const points = dedupePoints(ortho.path.map((p) => [p.x - p1.x, p.y - p1.y] as [number, number]));
      let labelAt: { x: number; y: number } | undefined;
      if (edge.label) {
        const fontSize = preset.fontSizes.edge;
        labelAt = placeLabel(ortho.path, estimateTextWidth(edge.label, fontSize), Math.ceil(fontSize * 1.25), nodes, labels);
      }
      routes.push({
        index,
        route: {
          from: edge.from,
          to: edge.to,
          ...(edge.label ? { label: edge.label } : {}),
          side1: ortho.side1,
          side2: ortho.side2,
          p1,
          p2,
          points,
          ...(labelAt ? { labelAt } : {}),
        },
      });
      continue;
    }
    // 退路：网格上走不通（或自环），沿用旧的中点折线
    const side1 = nearestSide(a, b);
    const side2 = nearestSide(b, a);
    const p1 = anchorPoint(a, side1);
    const p2 = anchorPoint(b, side2);
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const horizontal = side1 === "left" || side1 === "right";
    const raw = horizontal
      ? [[0, 0], [dx / 2, 0], [dx / 2, dy], [dx, dy]]
      : [[0, 0], [0, dy / 2], [dx, dy / 2], [dx, dy]];
    const points = dedupePoints(raw as Array<[number, number]>);

    let labelAt: { x: number; y: number } | undefined;
    if (edge.label) {
      const fontSize = preset.fontSizes.edge;
      const width = estimateTextWidth(edge.label, fontSize);
      const height = Math.ceil(fontSize * 1.25);
      const mx = (p1.x + p2.x) / 2;
      const my = (p1.y + p2.y) / 2;
      labelAt =
        Math.abs(dx) >= Math.abs(dy)
          ? { x: mx - width / 2, y: my - height - 8 }
          : { x: mx + 10, y: my - height / 2 };
    }
    routes.push({
      index,
      route: {
        from: edge.from,
        to: edge.to,
        ...(edge.label ? { label: edge.label } : {}),
        side1,
        side2,
        p1,
        p2,
        points,
        ...(labelAt ? { labelAt } : {}),
      },
    });
  }
  // 输出仍按计划里的边序：渲染层的 edge-N 编号不随走线顺序变
  return routes.sort((x, y) => x.index - y.index).map((x) => x.route);
}

function span(byId: Map<string, NodeBox>, e: PlanEdge): number {
  const a = byId.get(e.from);
  const b = byId.get(e.to);
  if (!a || !b) return Infinity;
  return Math.abs(a.x + a.width / 2 - (b.x + b.width / 2)) + Math.abs(a.y + a.height / 2 - (b.y + b.height / 2));
}

function textBox(text: string, fontSize: number): Box {
  const lines = text.split("\n");
  const width = Math.max(1, ...lines.map((line) => estimateTextWidth(line, fontSize)));
  const height = Math.max(1, Math.ceil(lines.length * fontSize * 1.25));
  return { minX: 0, minY: 0, maxX: width, maxY: height, width, height, cx: width / 2, cy: height / 2 };
}

export function layoutPlan(plan: DrawingPlan): PlanLayoutResult {
  const preset = presetOf(plan.preset);
  const space = spaceOf(preset);
  const nodes = plan.nodes.map((node, i) => measureNode(node, preset, i, space));
  switch (plan.layout) {
    case "tb":
      layoutTb(nodes, plan.edges, space);
      break;
    case "grid":
      layoutGrid(nodes, space);
      break;
    case "radial":
      layoutRadial(nodes, plan.edges, space);
      break;
    case "lr":
    default:
      layoutLr(nodes, plan.edges, space);
      break;
  }
  const routes = routeEdges(nodes, plan.edges, preset, plan.layout === "radial");
  const contentBox = boundingBoxOf(nodes) ?? {
    minX: 0,
    minY: 0,
    maxX: 0,
    maxY: 0,
    width: 0,
    height: 0,
    cx: 0,
    cy: 0,
  };
  return {
    nodes,
    routes,
    titleBox: plan.title ? textBox(plan.title, preset.fontSizes.title) : null,
    contentBox,
    preset,
  };
}
