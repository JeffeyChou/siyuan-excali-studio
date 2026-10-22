/**
 * 2026-10-18 A：AI 绘图的**计划 DSL**（模型只写结构，不写元素坐标）。
 *
 * 输入是松散的 JSON：节点可以写成字符串/对象，边可以写成 "a->b"/元组/对象；
 * 归一化后给出稳定形状（DrawingPlan），布局与渲染只认归一化结果。
 * 结构错误抛 PlanError（带 reason，CLI/智能体可据此改计划）；可局部修复的问题
 * （未知端点的边、自环、重复边）记进 warnings 后丢弃，不整单失败。
 *
 * 第六十轮：可选的布局提示，全都不写时行为与以前完全一样。模型仍然不写坐标，只写意图：
 * - `node.rank`：lr/tb 里钉在第几层（0 起）
 * - `node.order`：层内（grid 里是格子、radial 里是环上）的先后，与位次比较，0 = 最前
 * - `groups`：给 `node.group` 起显示名；列出的组画一个带标题的虚线框，同组节点在层内挨着放
 */

import { normalizePresetName, styleNames } from "./preset.ts";

export type PlanLayout = "lr" | "tb" | "grid" | "radial";
export type PlanShape = "rounded" | "rectangle" | "ellipse" | "diamond" | "text";

export interface PlanNode {
  id: string;
  label: string;
  shape: PlanShape;
  group?: string;
  /** lr/tb：钉在第几层（0 起）；其他布局忽略 */
  rank?: number;
  /** 层内/格内/环上的先后，与位次比较（0 = 最前） */
  order?: number;
}

/** 画框的分组：`id` 对应 `node.group`，`label` 是框上的标题 */
export interface PlanGroup {
  id: string;
  label: string;
}

export interface PlanEdge {
  from: string;
  to: string;
  label?: string;
}

export interface DrawingPlan {
  title?: string;
  caption?: string;
  /** 内置预设名或已注册的风格包名（normalizePresetName 归一） */
  preset: string;
  layout: PlanLayout;
  nodes: PlanNode[];
  edges: PlanEdge[];
  /** 要画框的分组（只含至少有一个成员的组） */
  groups: PlanGroup[];
  /** 归一化时丢弃/修复的内容（CLI 与智能体原样回传） */
  warnings: string[];
}

export type PlanErrorReason =
  | "bad-plan"
  | "empty-plan"
  | "too-many-nodes"
  | "too-many-edges"
  | "bad-preset"
  | "bad-layout"
  | "bad-shape"
  | "duplicate-node-id";

export class PlanError extends Error {
  readonly reason: PlanErrorReason;
  readonly detail?: string;

  constructor(reason: PlanErrorReason, detail?: string) {
    super(`plan:${reason}${detail ? ` (${detail})` : ""}`);
    this.reason = reason;
    this.detail = detail;
    this.name = "PlanError";
  }
}

export const PLAN_LIMITS = {
  maxNodes: 40,
  maxEdges: 80,
  maxLabel: 200,
  maxNote: 120,
  maxTitle: 120,
  maxCaption: 300,
  maxEdgeLabel: 60,
  maxGroups: 12,
  maxGroupLabel: 60,
  maxRank: 39,
} as const;

export interface NormalizeOptions {
  preset?: unknown;
  layout?: unknown;
  title?: unknown;
}

const LAYOUT_ALIASES: Record<string, PlanLayout> = {
  lr: "lr",
  horizontal: "lr",
  "left-right": "lr",
  tb: "tb",
  vertical: "tb",
  "top-down": "tb",
  grid: "grid",
  matrix: "grid",
  radial: "radial",
  mindmap: "radial",
  circle: "radial",
};

const SHAPE_ALIASES: Record<string, PlanShape> = {
  rounded: "rounded",
  round: "rounded",
  card: "rounded",
  rectangle: "rectangle",
  rect: "rectangle",
  square: "rectangle",
  box: "rectangle",
  ellipse: "ellipse",
  oval: "ellipse",
  circle: "ellipse",
  diamond: "diamond",
  decision: "diamond",
  rhombus: "diamond",
  text: "text",
  plain: "text",
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function str(v: unknown): string {
  if (typeof v === "string") return v;
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  return "";
}

function clip(s: string, max: number): string {
  const t = s.trim().replace(/\r\n?/g, "\n");
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

function normalizeLayoutName(raw: unknown): PlanLayout | null {
  if (typeof raw !== "string") return null;
  const key = raw.trim().toLowerCase();
  return LAYOUT_ALIASES[key] ?? null;
}

function normalizeShapeName(raw: string): PlanShape | null {
  if (raw === "") return "rounded";
  return SHAPE_ALIASES[raw.trim().toLowerCase()] ?? null;
}

function normalizeId(raw: string): string {
  return raw
    .trim()
    .replace(/[^\w.-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48);
}

function parseNodes(rawNodes: unknown[], warnings: string[]): PlanNode[] {
  const nodes: PlanNode[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < rawNodes.length; i++) {
    const raw = rawNodes[i];
    let id = "";
    let label = "";
    let shapeRaw = "";
    let group = "";
    let rankRaw: unknown;
    let orderRaw: unknown;
    if (typeof raw === "string") {
      label = raw;
    } else if (isRecord(raw)) {
      id = str(raw.id);
      label = str(raw.label ?? raw.text ?? raw.title);
      shapeRaw = str(raw.shape);
      group = str(raw.group);
      rankRaw = raw.rank ?? raw.layer;
      orderRaw = raw.order;
      const note = str(raw.note ?? raw.description);
      if (note) label = label ? `${label}\n${note}` : note;
    } else {
      warnings.push(`nodes[${i}] 不是字符串或对象，已忽略`);
      continue;
    }
    label = clip(label, PLAN_LIMITS.maxLabel + PLAN_LIMITS.maxNote + 1);
    if (!label.trim()) {
      warnings.push(`nodes[${i}] 没有 label，已忽略`);
      continue;
    }
    const shape = normalizeShapeName(shapeRaw);
    if (!shape) {
      throw new PlanError("bad-shape", `nodes[${i}].shape=${shapeRaw}`);
    }
    id = normalizeId(id) || `n${i + 1}`;
    if (seen.has(id)) throw new PlanError("duplicate-node-id", id);
    seen.add(id);
    const rank = intHint(rankRaw, 0, PLAN_LIMITS.maxRank, `nodes[${i}].rank`, warnings);
    const order = numHint(orderRaw, `nodes[${i}].order`, warnings);
    nodes.push({
      id,
      label,
      shape,
      ...(group.trim() ? { group: clip(group, 40) } : {}),
      ...(rank !== undefined ? { rank } : {}),
      ...(order !== undefined ? { order } : {}),
    });
  }
  return nodes;
}

/** 可选整数提示：缺省 = undefined；写错不整单失败，记 warning 后当没写 */
function intHint(raw: unknown, min: number, max: number, where: string, warnings: string[]): number | undefined {
  if (raw === undefined || raw === null || raw === "") return undefined;
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isInteger(n) || n < min || n > max) {
    warnings.push(`${where}=${str(raw) || typeof raw} 不是 ${min}–${max} 的整数，已忽略`);
    return undefined;
  }
  return n;
}

function numHint(raw: unknown, where: string, warnings: string[]): number | undefined {
  if (raw === undefined || raw === null || raw === "") return undefined;
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n)) {
    warnings.push(`${where}=${str(raw) || typeof raw} 不是数字，已忽略`);
    return undefined;
  }
  return n;
}

/**
 * `groups` 可以写成 `{ "core": "服务器" }`，也可以写成 `[{ id, label }]`（`name` 同 `id`）。
 * 没有成员的组记 warning 后丢弃；只写了 `node.group` 没列进来的组照旧只上底色、不画框。
 */
function parseGroups(raw: unknown, nodes: PlanNode[], warnings: string[]): PlanGroup[] {
  if (raw === undefined || raw === null) return [];
  const entries: Array<[string, string]> = [];
  if (Array.isArray(raw)) {
    raw.forEach((g, i) => {
      if (typeof g === "string") entries.push([g, g]);
      else if (isRecord(g)) entries.push([str(g.id ?? g.name), str(g.label ?? g.title ?? g.id ?? g.name)]);
      else warnings.push(`groups[${i}] 不是字符串或对象，已忽略`);
    });
  } else if (isRecord(raw)) {
    for (const [k, v] of Object.entries(raw)) entries.push([k, str(v) || k]);
  } else {
    warnings.push("groups 必须是对象或数组，已忽略");
    return [];
  }
  const used = new Set(nodes.map((n) => n.group).filter(Boolean));
  const out: PlanGroup[] = [];
  for (const [rawId, rawLabel] of entries) {
    const id = clip(rawId, 40);
    if (!id) continue;
    if (!used.has(id)) {
      warnings.push(`groups 里的「${id}」没有任何节点使用（node.group），已忽略`);
      continue;
    }
    if (out.some((g) => g.id === id)) continue;
    if (out.length >= PLAN_LIMITS.maxGroups) {
      warnings.push(`groups 超过 ${PLAN_LIMITS.maxGroups} 个，其余不画框`);
      break;
    }
    out.push({ id, label: clip(rawLabel || id, PLAN_LIMITS.maxGroupLabel) });
  }
  return out;
}

/** 端点解析：先按 id，再按 label（不区分大小写），便于模型用中文名直接连边 */
function resolveEndpoint(raw: string, nodes: PlanNode[]): string | null {
  const text = raw.trim();
  if (!text) return null;
  const byId = nodes.find((n) => n.id === text || n.id === normalizeId(text));
  if (byId) return byId.id;
  const lower = text.toLowerCase();
  const byLabel = nodes.filter((n) => n.label.toLowerCase() === lower);
  return byLabel.length === 1 ? byLabel[0].id : null;
}

function parseEdges(rawEdges: unknown[], nodes: PlanNode[], warnings: string[]): PlanEdge[] {
  const edges: PlanEdge[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < rawEdges.length; i++) {
    const raw = rawEdges[i];
    let from = "";
    let to = "";
    let label = "";
    if (typeof raw === "string") {
      const parts = raw.split(/\s*->\s*/);
      if (parts.length !== 2) {
        warnings.push(`edges[${i}] 不是 "a->b" 形式，已忽略`);
        continue;
      }
      [from, to] = parts;
    } else if (Array.isArray(raw)) {
      from = str(raw[0]);
      to = str(raw[1]);
      label = str(raw[2]);
    } else if (isRecord(raw)) {
      from = str(raw.from ?? raw.source ?? raw.start);
      to = str(raw.to ?? raw.target ?? raw.end);
      label = str(raw.label ?? raw.text);
    } else {
      warnings.push(`edges[${i}] 不是字符串/数组/对象，已忽略`);
      continue;
    }
    const f = resolveEndpoint(from, nodes);
    const t = resolveEndpoint(to, nodes);
    if (!f || !t) {
      warnings.push(`edges[${i}] 端点不存在（${from || "?"} -> ${to || "?"}），已忽略`);
      continue;
    }
    if (f === t) {
      warnings.push(`edges[${i}] 是自环（${f}），已忽略`);
      continue;
    }
    label = clip(label, PLAN_LIMITS.maxEdgeLabel);
    const key = `${f}\u0000${t}\u0000${label}`;
    if (seen.has(key)) {
      warnings.push(`edges[${i}] 与前面的边重复，已忽略`);
      continue;
    }
    seen.add(key);
    edges.push({ from: f, to: t, ...(label ? { label } : {}) });
  }
  return edges;
}

/**
 * 松散输入 → DrawingPlan。opts 是命令行/智能体参数的覆盖层（优先于计划内字段）。
 * 未知字段一律忽略；nodes/edges 缺省视为空数组，但节点为空会报 empty-plan。
 */
export function normalizePlan(raw: unknown, opts: NormalizeOptions = {}): DrawingPlan {
  if (!isRecord(raw)) throw new PlanError("bad-plan", "计划必须是 JSON 对象");
  const warnings: string[] = [];

  const rawNodes = raw.nodes;
  if (!Array.isArray(rawNodes)) throw new PlanError("bad-plan", "缺少 nodes 数组");
  if (rawNodes.length > PLAN_LIMITS.maxNodes) {
    throw new PlanError("too-many-nodes", `${rawNodes.length} > ${PLAN_LIMITS.maxNodes}，请拆成多张白板`);
  }
  const nodes = parseNodes(rawNodes, warnings);
  if (nodes.length === 0) throw new PlanError("empty-plan", "没有可用节点");

  const rawEdges = raw.edges ?? [];
  if (!Array.isArray(rawEdges)) throw new PlanError("bad-plan", "edges 必须是数组");
  if (rawEdges.length > PLAN_LIMITS.maxEdges) {
    throw new PlanError("too-many-edges", `${rawEdges.length} > ${PLAN_LIMITS.maxEdges}`);
  }
  const edges = parseEdges(rawEdges, nodes, warnings);

  const presetRaw = opts.preset !== undefined && opts.preset !== "" ? opts.preset : raw.preset;
  let preset = "pencil";
  if (presetRaw !== undefined && presetRaw !== null && presetRaw !== "") {
    const normalized = normalizePresetName(presetRaw);
    if (!normalized) {
      throw new PlanError("bad-preset", `${str(presetRaw)}（可选 ${styleNames().join("/")}）`);
    }
    preset = normalized;
  }

  const layoutRaw = opts.layout !== undefined && opts.layout !== "" ? opts.layout : raw.layout;
  let layout: PlanLayout = edges.length > 0 ? "lr" : "grid";
  if (layoutRaw !== undefined && layoutRaw !== null && layoutRaw !== "") {
    const normalized = normalizeLayoutName(layoutRaw);
    if (!normalized) throw new PlanError("bad-layout", `${str(layoutRaw)}（可选 lr/tb/grid/radial）`);
    layout = normalized;
  }

  const titleSource = opts.title !== undefined && opts.title !== "" ? opts.title : raw.title;
  const title = clip(str(titleSource), PLAN_LIMITS.maxTitle) || undefined;
  const caption = clip(str(raw.caption), PLAN_LIMITS.maxCaption) || undefined;
  const groups = parseGroups(raw.groups, nodes, warnings);
  if ((layout === "grid" || layout === "radial") && nodes.some((n) => n.rank !== undefined)) {
    warnings.push(`rank 只对 lr/tb 生效，${layout} 布局下已忽略`);
  }

  return {
    ...(title ? { title } : {}),
    ...(caption ? { caption } : {}),
    preset,
    layout,
    nodes,
    edges,
    groups,
    warnings,
  };
}
