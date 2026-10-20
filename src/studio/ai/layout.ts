/**
 * 2026-10-18 A：计划 DSL 的布局器（纯函数，node 可直接跑）。
 *
 * 输入归一化计划，输出**本地坐标**的节点盒 + 连线走线；渲染层统一平移 origin。
 * 四种布局只解决「节点摆哪」：lr/tb 按 DAG 分层，grid 方阵，radial 以度数最高的
 * 节点为中心。尺寸/间距是 token（风格包的 space 覆盖），缺省沿用「至少 24px 呼吸」
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
  return groups;
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
  const start = leaves.length <= 2 ? 0 : -Math.PI / 2;
  const step = (Math.PI * 2) / leaves.length;
  leaves.forEach((node, i) => {
    const angle = start + step * i;
    node.x = Math.cos(angle) * radius - node.width / 2;
    node.y = Math.sin(angle) * radius - node.height / 2;
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

function routeEdges(nodes: NodeBox[], edges: PlanEdge[], preset: PlanPresetSpec): EdgeRoute[] {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const routes: EdgeRoute[] = [];
  for (const edge of edges) {
    const a = byId.get(edge.from);
    const b = byId.get(edge.to);
    if (!a || !b) continue;
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
      from: edge.from,
      to: edge.to,
      ...(edge.label ? { label: edge.label } : {}),
      side1,
      side2,
      p1,
      p2,
      points,
      ...(labelAt ? { labelAt } : {}),
    });
  }
  return routes;
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
  const routes = routeEdges(nodes, plan.edges, preset);
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
