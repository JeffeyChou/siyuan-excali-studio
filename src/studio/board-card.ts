/**
 * 第四十轮：白板卡片（画布上「一块白板」的门面）。
 *
 * 形态 = 圆角矩形 + 标题 + 路径两行文字，三者同组（groupIds 一致，拖动/缩放
 * 整体走），只有矩形带 `link: siyuan:excali/<ref>`——link 是 vendor 已有的字段，
 * 随 scene 存进 SVG 载荷（scene-codec 原样 stringify），所以卡片不需要额外的
 * 持久化通道；↗ 徽标、onLinkOpen 拦截都是它自带的。
 *
 * 配色按主题分两套固定值（不跟画布背景走）：卡片是「一张浮在画布上的纸」，
 * 底色跟着背景变色就看不出边界了。
 */

import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
// 相对导入带 .ts 后缀（node --experimental-strip-types 不认无后缀相对路径；Vite 两边都认）
import { boardLinkOf, boardRefFromLink } from "./board-lib.ts";
import { elementBounds, estimateTextWidth, makeElement, nextId, wrapTextByWidth } from "./ea-element.ts";
import type { Point } from "./scene-point.ts";

export const CARD_W = 260;
export const CARD_H = 84;

const PAD = 14;
const TITLE_SIZE = 16;
const SUB_SIZE = 11;
const TITLE_MAX_LINES = 2;
const LINE_HEIGHT = 1.25;
const GAP = 5;

type Palette = { border: string; surface: string; title: string; sub: string };

/**
 * vendor 的 CaptureUpdateAction.IMMEDIATELY。这里写字符串而不是 import 那个枚举：
 * 运行时导入会把 8MB 引擎拖进 node 单测（本模块的几何与命中测试要能裸跑），
 * 而 dist 里那个枚举就是同名字符串（`IMMEDIATELY: "IMMEDIATELY"`）。
 */
const CAPTURE_IMMEDIATELY = "IMMEDIATELY";

const LIGHT: Palette = { border: "#3b3b3b", surface: "#ffffff", title: "#1e1e1e", sub: "#6b6b76" };
const DARK: Palette = { border: "#c9c9d1", surface: "#232329", title: "#e8e8e8", sub: "#9a9aa4" };

/** 超长行截断加省略号；多行标题最多 TITLE_MAX_LINES 行 */
export function clipLines(text: string, maxWidth: number, fontSize: number, maxLines: number): string[] {
  const out: string[] = [];
  let truncated = false;
  for (const raw of String(text ?? "").split("\n")) {
    const wrapped = wrapTextByWidth(raw, maxWidth, fontSize);
    for (const line of wrapped) {
      if (out.length >= maxLines) {
        truncated = true;
        break;
      }
      out.push(line);
    }
    if (truncated) break;
  }
  if (out.length === 0) out.push("");
  if (truncated) out[out.length - 1] = `${out[out.length - 1]}…`;
  return out;
}

/**
 * 卡片元素组（矩形 + 标题 + 路径）。返回顺序固定：[0] 是带 link 的矩形，
 * 命中测试与「改标题」都按它找。
 */
export function boardCardElements(
  o: { ref: string; title: string; path: string; x: number; y: number; dark?: boolean },
): Record<string, unknown>[] {
  const pal = o.dark ? DARK : LIGHT;
  const gid = nextId("card");
  const innerW = CARD_W - PAD * 2;
  const titleLines = clipLines(o.title, innerW, TITLE_SIZE, TITLE_MAX_LINES);
  const subLines = clipLines(o.path, innerW, SUB_SIZE, 1);
  const blockH =
    titleLines.length * TITLE_SIZE * LINE_HEIGHT + GAP + subLines.length * SUB_SIZE * LINE_HEIGHT;
  const top = o.y + (CARD_H - blockH) / 2;
  const subY = top + titleLines.length * TITLE_SIZE * LINE_HEIGHT + GAP;

  const rect = makeElement({
    type: "rectangle",
    x: o.x,
    y: o.y,
    width: CARD_W,
    height: CARD_H,
    strokeColor: pal.border,
    backgroundColor: pal.surface,
    fillStyle: "solid",
    strokeWidth: 1,
    roughness: 0,
    groupIds: [gid],
    link: boardLinkOf(o.ref),
  });
  const title = makeElement({
    type: "text",
    x: o.x + PAD,
    y: top,
    width: Math.max(...titleLines.map((l) => estimateTextWidth(l, TITLE_SIZE))),
    height: titleLines.length * TITLE_SIZE * LINE_HEIGHT,
    text: titleLines.join("\n"),
    fontSize: TITLE_SIZE,
    strokeColor: pal.title,
    groupIds: [gid],
  });
  const sub = makeElement({
    type: "text",
    x: o.x + PAD,
    y: subY,
    width: Math.max(...subLines.map((l) => estimateTextWidth(l, SUB_SIZE))),
    height: subLines.length * SUB_SIZE * LINE_HEIGHT,
    text: subLines.join("\n"),
    fontSize: SUB_SIZE,
    strokeColor: pal.sub,
    groupIds: [gid],
  });
  return [rect, title, sub];
}

/** 在场景坐标 at（卡片左上角）插入一张白板卡片，返回选中用的元素 id */
export function insertBoardCard(
  api: ExcalidrawImperativeAPI,
  o: { ref: string; title: string; at: Point },
): string[] {
  const state = api.getAppState() as unknown as { theme?: string; viewBackgroundColor?: string };
  const dark = state.theme === "dark";
  const els = boardCardElements({
    ref: o.ref,
    title: o.title,
    path: o.ref,
    x: o.at.x,
    y: o.at.y,
    dark,
  });
  const ids: string[] = [];
  for (const el of els) ids.push(String(el.id));
  api.updateScene({
    elements: [...api.getSceneElements(), ...(els as never[])],
    appState: { selectedElementIds: Object.fromEntries(ids.map((id) => [id, true])) } as never,
    captureUpdate: CAPTURE_IMMEDIATELY as never,
  });
  return ids;
}

/**
 * ⌘/Ctrl 点整卡：命中带白板链接的元素（点在标题/路径文字上也落在矩形包围盒里，
 * 所以只有矩形带 link 就够）。参数收 unknown[]——vendor 的元素类型在本仓库走
 * 结构子集，不必为一次命中测试拉整条类型链。
 */
export function boardRefAtPoint(elements: readonly unknown[], p: Point): string | null {
  type Hit = { x: number; y: number; width: number; height: number; angle?: number; points?: Array<[number, number]>; link?: unknown };
  for (let i = elements.length - 1; i >= 0; i--) {
    const el = elements[i] as Hit | undefined;
    if (!el) continue;
    const ref = boardRefFromLink(el.link);
    if (!ref) continue;
    const b = elementBounds(el);
    if (p.x >= b.minX && p.x <= b.maxX && p.y >= b.minY && p.y <= b.maxY) return ref;
  }
  return null;
}
