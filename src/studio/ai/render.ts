/**
 * 2026-10-18 A：计划 → 元素规格（前端画布与无头 CLI 共用）。
 *
 * 输出**不包含箭头**：前端走 handle.connectObjects（vendor 的绑定连接），无头侧由
 * headless.ts 按 routes 自建 arrow。两边共用同一份 node 盒与走线，视觉口径一致。
 */

import { boundingBoxOf, estimateTextWidth, type Box, type ElementSpec } from "../ea-element.ts";
import { layoutPlan, type EdgeRoute, type NodeBox } from "./layout.ts";
import { normalizePlan, type DrawingPlan, type NormalizeOptions } from "./plan.ts";
import { presetOf, type PlanPresetSpec } from "./preset.ts";

export interface RenderedEdgeRoute extends EdgeRoute {
  fromElementId: string;
  toElementId: string;
}

export interface NodeLayout extends NodeBox {
  elementId: string;
}

export interface RenderedPlan {
  plan: DrawingPlan;
  preset: PlanPresetSpec;
  /** 节点/标题/说明/边标签（箭头之外的全部元素） */
  specs: ElementSpec[];
  nodes: NodeLayout[];
  routes: RenderedEdgeRoute[];
  bbox: Box;
  background: string;
  /** 本次绘制的元素 id 前缀（无头侧建箭头、追加避重都用它） */
  idPrefix: string;
}

export interface RenderOptions extends NormalizeOptions {
  /** 追加到已有白板时的落位偏移（缺省原点） */
  origin?: { x: number; y: number };
  /** 元素 id 前缀，保证同一场景多次绘制不撞 id（缺省 ai） */
  idPrefix?: string;
}

function safePrefix(raw: string | undefined): string {
  const cleaned = (raw ?? "ai").trim().replace(/[^\w.-]+/g, "_").replace(/^_+|_+$/g, "");
  return cleaned || "ai";
}

function textSpec(
  id: string,
  text: string,
  x: number,
  y: number,
  fontSize: number,
  fontFamily: number,
  color: string,
  align: "left" | "center",
): ElementSpec {
  const lines = text.split("\n");
  return {
    type: "text",
    id,
    x,
    y,
    width: Math.max(1, ...lines.map((line) => estimateTextWidth(line, fontSize))),
    height: Math.max(1, Math.ceil(lines.length * fontSize * 1.25)),
    text,
    fontSize,
    fontFamily,
    strokeColor: color,
    textAlign: align,
  };
}

function nodeSpecOf(
  node: NodeBox,
  elementId: string,
  prefix: string,
  preset: PlanPresetSpec,
  left: number,
  top: number,
): ElementSpec {
  const type: ElementSpec["type"] =
    node.shape === "ellipse" ? "ellipse" : node.shape === "diamond" ? "diamond" : node.shape === "text" ? "text" : "rectangle";
  const spec: ElementSpec = {
    type,
    id: elementId,
    x: left + node.x,
    y: top + node.y,
    width: node.width,
    height: node.height,
    text: node.label,
    fontSize: preset.fontSizes.node,
    fontFamily: preset.fontFamily,
    strokeColor: preset.ink,
    textAlign: node.shape === "text" ? "left" : "center",
  };
  if (node.shape !== "text") {
    spec.backgroundColor = node.fill;
    spec.fillStyle = preset.fillStyle;
    spec.strokeWidth = preset.strokeWidth;
    spec.strokeStyle = preset.strokeStyle;
    spec.roughness = preset.roughness;
    if (node.shape === "rectangle") spec.roundness = null;
    else if (preset.nodeRoundness) spec.roundness = preset.nodeRoundness;
  }
  if (node.group) spec.groupIds = [`${prefix}-group-${node.group.replace(/[^\w.-]+/g, "_")}`];
  return spec;
}

/**
 * 松散计划 → 可直接落场景的规格。opts.preset/layout/title 覆盖计划内同名字段，
 * origin 让 CLI 追加绘制时整体平移；idPrefix 避免同一白板多次绘制的 id 冲突。
 */
export function renderPlan(raw: unknown, opts: RenderOptions = {}): RenderedPlan {
  const plan = normalizePlan(raw, opts);
  const preset = presetOf(plan.preset);
  const layout = layoutPlan(plan);
  const prefix = safePrefix(opts.idPrefix);
  const origin = { x: opts.origin?.x ?? 0, y: opts.origin?.y ?? 0 };
  const left = origin.x + 40;
  const top = origin.y + (plan.title ? 96 : 40);

  const nodeSpecs: ElementSpec[] = [];
  const nodes: NodeLayout[] = layout.nodes.map((node) => {
    const elementId = `${prefix}-${node.id}`;
    nodeSpecs.push(nodeSpecOf(node, elementId, prefix, preset, left, top));
    return { ...node, elementId };
  });

  const routes: RenderedEdgeRoute[] = layout.routes.map((route) => ({
    ...route,
    fromElementId: `${prefix}-${route.from}`,
    toElementId: `${prefix}-${route.to}`,
    p1: { x: left + route.p1.x, y: top + route.p1.y },
    p2: { x: left + route.p2.x, y: top + route.p2.y },
    ...(route.labelAt ? { labelAt: { x: left + route.labelAt.x, y: top + route.labelAt.y } } : {}),
  }));

  const titleSpecs: ElementSpec[] = plan.title
    ? [
        textSpec(
          `${prefix}-title`,
          plan.title,
          origin.x + 40,
          origin.y + 24,
          preset.fontSizes.title,
          preset.fontFamily,
          preset.ink,
          "left",
        ),
      ]
    : [];

  const labelSpecs: ElementSpec[] = [];
  routes.forEach((route, i) => {
    if (!route.label || !route.labelAt) return;
    labelSpecs.push(
      textSpec(
        `${prefix}-edge-${i + 1}`,
        route.label,
        route.labelAt.x,
        route.labelAt.y,
        preset.fontSizes.edge,
        preset.fontFamily,
        preset.muted,
        "center",
      ),
    );
  });

  const captionSpecs: ElementSpec[] = plan.caption
    ? [
        textSpec(
          `${prefix}-caption`,
          plan.caption,
          left,
          top + layout.contentBox.maxY + 44,
          preset.fontSizes.caption,
          preset.fontFamily,
          preset.muted,
          "left",
        ),
      ]
    : [];

  const specs = [...titleSpecs, ...nodeSpecs, ...labelSpecs, ...captionSpecs];
  const bbox =
    boundingBoxOf(specs.map((s) => ({ x: s.x, y: s.y, width: s.width ?? 0, height: s.height ?? 0 }))) ?? {
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
    plan,
    preset,
    specs,
    nodes,
    routes,
    bbox,
    background: preset.background,
    idPrefix: prefix,
  };
}
