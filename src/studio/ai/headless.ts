/**
 * 2026-10-18 B：无头场景构建 + SVG 落盘（Node/CLI 与前端共用同一份元素规格）。
 *
 * 前端有 vendor 的 connectObjects/exportToSvg；Node 里两样都没有（DOM/canvas 依赖），
 * 所以这里自己建绑定箭头、自己拼一份**可被 Excalidraw 打开**的 SVG：
 * - 载荷仍走 encodeSvgPayload（与插件/Excalidraw 同构，互认）；
 * - 预览是简化的 SVG（矩形/椭圆/菱形/折线/文字），只保证肉眼能看，打开后由
 *   Excalidraw 按 scene 重绘——形状/绑定/字体都在载荷里。
 */

import { boundingBoxOf, expandElementSpecs, makeElement, type Box } from "../ea-element.ts";
import { encodeSvgPayload } from "../scene-codec.ts";
import type { RenderedPlan } from "./render.ts";

export interface BuiltScene {
  elements: Record<string, unknown>[];
  appState: Record<string, unknown>;
  files: Record<string, unknown>;
}

export interface HeadlessSceneOptions {
  appState?: Record<string, unknown>;
  files?: Record<string, unknown>;
}

function reindex(elements: Record<string, unknown>[]): void {
  elements.forEach((el, i) => {
    el.index = `a${String(i + 1).padStart(8, "0")}`;
  });
}

function sortByIndex(elements: Record<string, unknown>[]): Record<string, unknown>[] {
  return [...elements].sort((a, b) =>
    String(a.index ?? "").localeCompare(String(b.index ?? ""), undefined, { numeric: true }),
  );
}

/**
 * RenderedPlan → 完整场景。箭头按 routes 建，startBinding/endBinding 指到节点，
 * 并把箭头挂进两端节点的 boundElements（与 ea-handle.connectObjects 同口径）。
 */
export function buildHeadlessScene(rendered: RenderedPlan, opts: HeadlessSceneOptions = {}): BuiltScene {
  const elements = expandElementSpecs(rendered.specs);
  const byId = new Map(elements.map((el) => [String(el.id), el]));

  rendered.routes.forEach((route, i) => {
    const arrowId = `${rendered.idPrefix}-arrow-${i + 1}`;
    const arrow = makeElement({
      type: "arrow",
      id: arrowId,
      x: route.p1.x,
      y: route.p1.y,
      points: route.points,
      strokeColor: rendered.preset.edge,
      strokeWidth: rendered.preset.strokeWidth,
      strokeStyle: rendered.preset.strokeStyle,
      roughness: rendered.preset.roughness,
      endArrowhead: "arrow",
    }) as Record<string, unknown>;
    arrow.startBinding = { elementId: route.fromElementId, focus: 0, gap: 4 };
    arrow.endBinding = { elementId: route.toElementId, focus: 0, gap: 4 };
    const attach = (id: string) => {
      const el = byId.get(id);
      if (!el) return;
      const bound = Array.isArray(el.boundElements) ? (el.boundElements as Array<Record<string, unknown>>) : [];
      el.boundElements = [...bound, { id: arrowId, type: "arrow" }];
    };
    attach(route.fromElementId);
    attach(route.toElementId);
    elements.push(arrow);
  });

  reindex(elements);
  const appState: Record<string, unknown> = { ...(opts.appState ?? {}) };
  if (appState.viewBackgroundColor === undefined || appState.viewBackgroundColor === "") {
    appState.viewBackgroundColor = rendered.background;
  }
  return { elements, appState, files: opts.files ?? {} };
}

/**
 * 追加任意元素（内核生图用）：现有元素按 index 排序后接在新元素前面，
 * 再整体重排 index。files 由调用方合并后传入；不传则沿用现有 files。
 */
export function appendHeadlessElements(
  existing: { elements: unknown[]; appState: Record<string, unknown>; files: Record<string, unknown> } | null,
  added: Record<string, unknown>[],
  files?: Record<string, unknown>,
): BuiltScene {
  const old = existing
    ? sortByIndex(existing.elements.filter((el): el is Record<string, unknown> => !!el && typeof el === "object"))
    : [];
  const elements = [...old, ...added];
  reindex(elements);
  return {
    elements,
    appState: { ...(existing?.appState ?? {}) },
    files: files ?? existing?.files ?? {},
  };
}

/** 追加绘制：现有场景 + 新计划，按 index 排序后重排（数组顺序 = z 序） */
export function composeHeadlessScene(
  existing: { elements: unknown[]; appState: Record<string, unknown>; files: Record<string, unknown> } | null,
  rendered: RenderedPlan,
): BuiltScene {
  if (!existing) return buildHeadlessScene(rendered);
  const built = buildHeadlessScene(rendered, { appState: existing.appState, files: existing.files });
  return { ...appendHeadlessElements(existing, built.elements, built.files), appState: built.appState };
}

const XML_ESCAPES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" };

function esc(value: unknown): string {
  return String(value ?? "").replace(/[&<>"']/g, (c) => XML_ESCAPES[c] ?? c);
}

function num(value: unknown): string {
  const n = Number(value);
  return Number.isFinite(n) ? String(Math.round(n * 100) / 100) : "0";
}

function fontFamilyOf(value: unknown): string {
  switch (Number(value)) {
    case 3:
      return "'Cascadia Code', 'Cascadia Mono', Consolas, monospace";
    case 6:
      return "Nunito, 'Segoe UI', sans-serif";
    case 1:
      return "Virgil, 'Xiaolai', cursive, sans-serif";
    default:
      return "Excalifont, 'Xiaolai', Virgil, cursive, sans-serif";
  }
}

function strokeAttrs(el: Record<string, unknown>, extra = ""): string {
  const stroke = el.strokeColor === "transparent" ? "none" : String(el.strokeColor ?? "#1e1e1e");
  const style = String(el.strokeStyle ?? "solid");
  const dash = style === "dashed" ? ' stroke-dasharray="8 5"' : style === "dotted" ? ' stroke-dasharray="2 4"' : "";
  const opacity = Number(el.opacity ?? 100);
  const op = Number.isFinite(opacity) && opacity < 100 ? ` opacity="${num(opacity / 100)}"` : "";
  return `stroke="${esc(stroke)}" stroke-width="${num(el.strokeWidth ?? 2)}"${dash} stroke-linecap="round" stroke-linejoin="round"${op}${extra}`;
}

function fillOf(el: Record<string, unknown>): string {
  const fill = String(el.backgroundColor ?? "transparent");
  return fill === "transparent" ? "none" : esc(fill);
}

function textSvg(el: Record<string, unknown>): string {
  const x = Number(el.x ?? 0);
  const y = Number(el.y ?? 0);
  const width = Number(el.width ?? 0);
  const fontSize = Number(el.fontSize ?? 20);
  const align = String(el.textAlign ?? "left");
  const anchor = align === "center" ? "middle" : align === "right" ? "end" : "start";
  const tx = align === "center" ? x + width / 2 : align === "right" ? x + width : x;
  const lineHeight = fontSize * Number(el.lineHeight ?? 1.25);
  const fill = el.strokeColor === "transparent" ? "#1e1e1e" : String(el.strokeColor ?? "#1e1e1e");
  const lines = String(el.text ?? "").split("\n");
  const spans = lines
    .map(
      (line, i) =>
        `<tspan x="${num(tx)}" y="${num(y + fontSize * 0.95 + lineHeight * i)}">${esc(line) || " "}</tspan>`,
    )
    .join("");
  return `<text font-family="${esc(fontFamilyOf(el.fontFamily))}" font-size="${num(fontSize)}" fill="${esc(fill)}" text-anchor="${anchor}">${spans}</text>`;
}

function lineSvg(el: Record<string, unknown>): string {
  const x = Number(el.x ?? 0);
  const y = Number(el.y ?? 0);
  const points = Array.isArray(el.points) ? (el.points as unknown[]) : [];
  const coords = points
    .map((p) => (Array.isArray(p) ? `${num(x + Number(p[0] ?? 0))},${num(y + Number(p[1] ?? 0))}` : ""))
    .filter(Boolean)
    .join(" ");
  if (!coords) return "";
  const start = el.startArrowhead ? ' marker-start="url(#exs-arrow)"' : "";
  const end = el.endArrowhead ? ' marker-end="url(#exs-arrow)"' : "";
  return `<polyline points="${coords}" fill="none" ${strokeAttrs(el, `${start}${end}`)}/>`;
}

function elementSvg(el: Record<string, unknown>, files: Record<string, unknown>): string {
  const type = String(el.type ?? "");
  const x = Number(el.x ?? 0);
  const y = Number(el.y ?? 0);
  const width = Number(el.width ?? 0);
  const height = Number(el.height ?? 0);
  switch (type) {
    case "rectangle": {
      const roundness = el.roundness;
      const rx = roundness && typeof roundness === "object" ? Math.min(24, Math.min(width, height) / 4) : 0;
      return `<rect x="${num(x)}" y="${num(y)}" width="${num(width)}" height="${num(height)}" rx="${num(rx)}" fill="${fillOf(el)}" ${strokeAttrs(el)}/>`;
    }
    case "ellipse":
      return `<ellipse cx="${num(x + width / 2)}" cy="${num(y + height / 2)}" rx="${num(width / 2)}" ry="${num(height / 2)}" fill="${fillOf(el)}" ${strokeAttrs(el)}/>`;
    case "diamond":
      return `<polygon points="${num(x + width / 2)},${num(y)} ${num(x + width)},${num(y + height / 2)} ${num(x + width / 2)},${num(y + height)} ${num(x)},${num(y + height / 2)}" fill="${fillOf(el)}" ${strokeAttrs(el)}/>`;
    case "text":
      return textSvg(el);
    case "arrow":
    case "line":
      return lineSvg(el);
    case "image": {
      const file = files[String(el.fileId ?? "")];
      const dataURL =
        file && typeof file === "object" && typeof (file as { dataURL?: unknown }).dataURL === "string"
          ? (file as { dataURL: string }).dataURL
          : "";
      if (!dataURL) return "";
      return `<image href="${esc(dataURL)}" x="${num(x)}" y="${num(y)}" width="${num(width)}" height="${num(height)}" preserveAspectRatio="none"/>`;
    }
    case "frame":
      return `<rect x="${num(x)}" y="${num(y)}" width="${num(width)}" height="${num(height)}" fill="none" ${strokeAttrs({ ...el, strokeStyle: "dashed" })}/>`;
    default:
      return "";
  }
}

function contentBounds(elements: Record<string, unknown>[]): Box {
  const shapes = elements.map((el) => ({
    x: Number(el.x ?? 0),
    y: Number(el.y ?? 0),
    width: Number(el.width ?? 0),
    height: Number(el.height ?? 0),
    angle: Number(el.angle ?? 0),
    points: Array.isArray(el.points) ? (el.points as Array<[number, number]>) : undefined,
  }));
  return (
    boundingBoxOf(shapes) ?? { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0, cx: 0, cy: 0 }
  );
}

/**
 * 场景 → SVG 文本。预览只画几何，真正的 scene 在 encodeSvgPayload 的 <metadata> 里；
 * viewBox 取内容包围盒 + 32px 留白，空白板给 1×1 兜底。
 */
export function sceneToSvgHeadless(scene: BuiltScene, padding = 32): string {
  const elements = scene.elements.filter((el) => el.isDeleted !== true);
  const box = contentBounds(elements);
  const vx = box.minX - padding;
  const vy = box.minY - padding;
  const vw = Math.max(1, box.width + padding * 2);
  const vh = Math.max(1, box.height + padding * 2);
  const background = String(scene.appState.viewBackgroundColor ?? "#ffffff");
  const meta = encodeSvgPayload({ elements: scene.elements, appState: scene.appState, files: scene.files });
  const preview = elements.map((el) => elementSvg(el, scene.files)).join("");
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="${num(vx)} ${num(vy)} ${num(vw)} ${num(vh)}" width="${num(vw)}" height="${num(vh)}">` +
    meta +
    `<rect x="${num(vx)}" y="${num(vy)}" width="${num(vw)}" height="${num(vh)}" fill="${esc(background)}"/>` +
    `<defs><marker id="exs-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="context-stroke"/></marker></defs>` +
    preview +
    `</svg>`
  );
}

/** 计划 → SVG 文本（CLI 的单步入口；现有场景为 null = 新建） */
export function planToSvg(
  rendered: RenderedPlan,
  existing: { elements: unknown[]; appState: Record<string, unknown>; files: Record<string, unknown> } | null,
): { svgText: string; scene: BuiltScene } {
  const scene = composeHeadlessScene(existing, rendered);
  return { svgText: sceneToSvgHeadless(scene), scene };
}
