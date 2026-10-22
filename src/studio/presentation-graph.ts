/**
 * 第七十六轮：放映的**有向图模型**（照搬 Advanced Canvas 的演示路线）。
 *
 * 背景：Advanced Canvas 的演示不是「一页一页按序翻」，而是**沿箭头在节点间游走**
 * ——幻灯片是画布上的分组节点，用户用箭头把幻灯片连起来，放映时镜头沿着箭头走。
 * 这样演示流可以是**非线性**的（A→B 或 A→C 分叉、结尾还能绕回首页）。
 *
 * 映射到 Excalidraw：
 * - **节点 = 画框（frame）**：画框本来就是「一块有名字的版面」，且能被箭头绑定
 *   （vendor 的 ExcalidrawBindableElement 含 ExcalidrawFrameElement，已查证）。
 * - **边 = 画框之间的箭头**：从画框 A 指向画框 B 的箭头 = 一条 A→B 的边。
 *
 * 边的识别用**双通道**（任一命中即算）：
 * 1. **引擎绑定**：arrow 的 startBinding/endBinding.elementId 指向画框 id（最准）；
 * 2. **几何判定**：箭头起点落在画框 A 的矩形内、终点落在画框 B 的矩形内。
 *    第 2 条是必须的——用户随手画的箭头常常没被引擎识别成绑定（尤其跨画框拖的），
 *    只认绑定会让「画了箭头却不走」这种最伤人的现象出现。
 *
 * 排序语义照搬 Advanced Canvas（presentation-canvas-extension.ts）：
 * - 出边按**箭头文字（label）字母序**排，没文字的排后面；有文字的在前。
 * - 取「第一条**没走过**的边」，全走过了就退回**最后一条**（于是可以绕回）。
 * - 反向导航沿**访问栈**回退（不是「反向找边」），与它一致。
 *
 * 本模块是纯逻辑：不 import React / vendor / 思源，node 侧能直接跑单测。
 */

import { compareReadingOrder } from "./presentation-plan.ts";

/** 边的方位：照搬 Advanced Canvas 的 NodeSide（right/bottom/left/top） */
export type GraphSide = "right" | "bottom" | "left" | "top";

/** 一条边：从 from 画框指向 to 画框 */
export type GraphEdge = {
  /** 边 id（= 箭头元素 id，同一箭头只算一条边） */
  id: string;
  from: string;
  to: string;
  /** 箭头文字：出边排序用（Advanced Canvas 语义：有文字的排前面并按字母序） */
  label: string;
  /** 相对方位：从 from 看向 to 的方向 */
  side: GraphSide;
};

/** 一张放映图 */
export type SlideGraph = {
  /** 节点顺序 = 入片页在片单里的顺序（下标 = deck.slides 下标） */
  nodes: readonly string[];
  /** 全部边（已按 from 分组排序） */
  edges: readonly GraphEdge[];
  /** 每个节点的出边（按 label 字母序，无 label 在后） */
  out: ReadonlyMap<string, readonly GraphEdge[]>;
  /** 起点画框 id */
  start: string;
  /** 起点是不是显式指定的（用户标了「起始页」） */
  startExplicit: boolean;
};

/** 场景元素里本模块要用的字段（结构兼容即可，node 侧能直接喂假对象） */
export type GraphElement = {
  id: string;
  type?: string;
  isDeleted?: boolean;
  x: number;
  y: number;
  width?: number;
  height?: number;
  points?: readonly (readonly number[])[];
  label?: string | null;
  text?: string | null;
  startBinding?: { elementId: string } | null;
  endBinding?: { elementId: string } | null;
};

/**
 * 画框（= 节点）的最小信息。
 *
 * 字段名**故意跟 Excalidraw 元素一致**（width/height 而不是 w/h）：
 * 调用方多半是直接把 frame 元素喂进来的，改名就得在两边各写一次转换，
 * 而那种转换一旦写错（w/h 传成 undefined）症状是「边全都不认」，很难查。
 */
export type GraphFrame = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

/** 端点落进画框的容差（px）：端点压在框线上也算命中 */
const EDGE_TOLERANCE = 4;

/** 箭头文字：优先 label 字段，没有就用 text */
function arrowLabel(e: GraphElement): string {
  const raw = e.label ?? e.text ?? "";
  return typeof raw === "string" ? raw.trim() : "";
}

/** 点是否落在矩形内（含容差） */
function inRect(px: number, py: number, f: GraphFrame): boolean {
  return (
    px >= f.x - EDGE_TOLERANCE &&
    px <= f.x + f.width + EDGE_TOLERANCE &&
    py >= f.y - EDGE_TOLERANCE &&
    py <= f.y + f.height + EDGE_TOLERANCE
  );
}

/** 箭头的起点/终点（绝对场景坐标）。多段折线取首尾两点。 */
export function arrowEndpoints(e: GraphElement): { sx: number; sy: number; ex: number; ey: number } | null {
  const pts = e.points;
  if (!pts || pts.length < 2) return null;
  const first = pts[0];
  const last = pts[pts.length - 1];
  if (!first || !last || first.length < 2 || last.length < 2) return null;
  return {
    sx: e.x + (first[0] as number),
    sy: e.y + (first[1] as number),
    ex: e.x + (last[0] as number),
    ey: e.y + (last[1] as number),
  };
}

/** 两个画框的相对方位（以 from 为中心看 to） */
export function sideBetween(from: GraphFrame, to: GraphFrame): GraphSide {
  const dcx = to.x + to.width / 2 - (from.x + from.width / 2);
  const dcy = to.y + to.height / 2 - (from.y + from.height / 2);
  if (Math.abs(dcx) >= Math.abs(dcy)) return dcx >= 0 ? "right" : "left";
  return dcy >= 0 ? "bottom" : "top";
}

/**
 * 出边排序（Advanced Canvas 同款）：有文字的在前并按字母序，没文字的排后面。
 * 文字相同的再按边 id 定全序——排序必须稳定，不能靠引擎 sort 的运气。
 */
export function compareOutgoingEdges(a: GraphEdge, b: GraphEdge): number {
  if (!a.label && !b.label) return a.id.localeCompare(b.id);
  if (!a.label) return 1;
  if (!b.label) return -1;
  const byLabel = a.label.localeCompare(b.label);
  return byLabel !== 0 ? byLabel : a.id.localeCompare(b.id);
}

/**
 * 建图。
 *
 * @param elements 场景元素（找箭头 + 找画框）
 * @param frames   入片页的画框（= 节点），顺序即片单顺序
 * @param startId  显式指定的起始页画框 id（没有就空串）
 */
export function buildSlideGraph(
  elements: readonly GraphElement[],
  frames: readonly GraphFrame[],
  startId = "",
): SlideGraph {
  const frameById = new Map<string, GraphFrame>();
  for (const f of frames) frameById.set(f.id, f);

  const edges: GraphEdge[] = [];
  const seen = new Set<string>();

  const pushEdge = (id: string, from: string, to: string, label: string): void => {
    if (from === to) return; // 自环没有意义
    if (!frameById.has(from) || !frameById.has(to)) return;
    const key = id + ">" + from + ">" + to;
    if (seen.has(key)) return;
    seen.add(key);
    edges.push({ id, from, to, label, side: sideBetween(frameById.get(from) as GraphFrame, frameById.get(to) as GraphFrame) });
  };

  for (const e of elements) {
    if (e.isDeleted) continue;
    if (e.type !== "arrow" && e.type !== "line") continue;
    const label = arrowLabel(e);

    // 通道 1：引擎绑定
    const sb = e.startBinding?.elementId;
    const eb = e.endBinding?.elementId;
    if (sb && eb && frameById.has(sb) && frameById.has(eb)) {
      pushEdge(e.id, sb, eb, label);
      continue;
    }

    // 通道 2：几何判定
    const ep = arrowEndpoints(e);
    if (!ep) continue;
    // 起点落在哪个画框、终点落在哪个画框
    let fromFrame: GraphFrame | null = null;
    let toFrame: GraphFrame | null = null;
    for (const f of frameById.values()) {
      if (!fromFrame && inRect(ep.sx, ep.sy, f)) fromFrame = f;
      if (!toFrame && inRect(ep.ex, ep.ey, f)) toFrame = f;
    }
    if (fromFrame && toFrame && fromFrame.id !== toFrame.id) {
      pushEdge(e.id, fromFrame.id, toFrame.id, label);
    }
  }

  const out = new Map<string, GraphEdge[]>();
  for (const e of edges) {
    const list = out.get(e.from) ?? [];
    list.push(e);
    out.set(e.from, list);
  }
  for (const [k, list] of out) out.set(k, list.sort(compareOutgoingEdges));

  const start = startId && frameById.has(startId) ? startId : (frames[0]?.id ?? "");
  return {
    nodes: frames.map((f) => f.id),
    edges,
    out,
    start,
    startExplicit: !!startId && frameById.has(startId),
  };
}

/**
 * 选下一条边（Advanced Canvas 的 getNextUntraveledEdge 同款）：
 * 先取「第一条没走过的」；全走过了就退回**最后一条**（于是能绕回，形成环）。
 *
 * @param direction 给了就只看该方位的出边（Advanced Canvas 的方向键导航）
 */
export function pickNextEdge(
  graph: SlideGraph,
  from: string,
  traveled: readonly string[],
  direction?: GraphSide,
): GraphEdge | null {
  const all = graph.out.get(from) ?? [];
  const pool = direction ? all.filter((e) => e.side === direction) : all;
  if (pool.length === 0) return null;
  const fresh = pool.filter((e) => !traveled.includes(e.id));
  return fresh.length > 0 ? (fresh[0] as GraphEdge) : (pool[pool.length - 1] as GraphEdge);
}

/** 沿图能到达的全部节点（从 start 出发，广度优先）——用于「是不是有路」的自检 */
export function reachableFrom(graph: SlideGraph, start: string): Set<string> {
  const seen = new Set<string>();
  if (!start) return seen;
  const queue = [start];
  seen.add(start);
  while (queue.length > 0) {
    const cur = queue.shift() as string;
    for (const e of graph.out.get(cur) ?? []) {
      if (!seen.has(e.to)) {
        seen.add(e.to);
        queue.push(e.to);
      }
    }
  }
  return seen;
}

/**
 * 图是否「可用」：有边、且边连着的节点都在片单里。
 * 没边的板子仍能放映（退回线性页序），所以这只是给 UI 提示用。
 */
export function graphUsable(graph: SlideGraph): boolean {
  return graph.edges.length > 0;
}

/**
 * 给 UI 用的**图状态**：面板上要告诉用户「现在是走图还是按顺序翻」。
 *
 * - `linked` = 板子上有画框之间的箭头 → 放映沿箭头走（可分叉、可绕圈）；
 * - `linear` = 没有箭头 → 按片单顺序翻（零配置）。
 * - `partial` = 有箭头，但有画框没被连上 → 提示用户「这几页没连上，
 *   放映到那儿会按顺序继续」（Advanced Canvas 也是「没边就停住」的语义，
 *   这里改成「按顺序兜底」更符合 excali studio 的零配置定位）。
 */
export type GraphState = {
  kind: "linked" | "linear" | "partial";
  /** 连上的画框 id */
  linkedIds: readonly string[];
  /** 没被任何箭头连上的画框 id */
  unlinkedIds: readonly string[];
  /** 边总数 */
  edgeCount: number;
};

/** 算图状态（给面板提示用） */
export function graphState(graph: SlideGraph): GraphState {
  const linked = new Set<string>();
  for (const e of graph.edges) {
    linked.add(e.from);
    linked.add(e.to);
  }
  const unlinked = graph.nodes.filter((id) => !linked.has(id));
  const kind: GraphState["kind"] =
    graph.edges.length === 0 ? "linear" : unlinked.length === 0 ? "linked" : "partial";
  return { kind, linkedIds: [...linked], unlinkedIds: unlinked, edgeCount: graph.edges.length };
}

/** 节点在片单里的下标（找不到给 -1） */
export function nodeIndex(graph: SlideGraph, id: string): number {
  return graph.nodes.indexOf(id);
}

/**
 * 没有图可走时的**线性兜底顺序**：片单顺序（阅读顺序兜底由 deckOf 负责）。
 * 抽成函数是为了让「有图走图、没图走线」在同一个地方判定。
 */
export function linearFallbackOrder(graph: SlideGraph): string[] {
  return [...graph.nodes];
}

/** 按阅读顺序给画框排（给「起始页自动挑第一个」用） */
export function firstByReadingOrder(frames: readonly GraphFrame[]): string {
  if (frames.length === 0) return "";
  const sorted = [...frames].sort((a, b) => compareReadingOrder(a, b));
  return (sorted[0] as GraphFrame).id;
}
