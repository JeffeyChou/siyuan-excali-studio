/**
 * 2026-10-16 S3：EaBoardHandle 工厂——把 Excalidraw imperative api 包成脚本引擎的画布句柄。
 *
 * 独立成文件的原因：① StudioApp 不出现 viewModeEnabled 等自动化字段（menu.test 的
 * 架构契约——UI 层不碰只读开关，ea 的 setViewMode 是脚本自动化接口，不算 UI 开关）；
 * ② 句柄构造逻辑复杂（元素工厂/CaptureUpdateAction/导出复用），不该挤在组件里。
 */

import { CaptureUpdateAction } from "@excalidraw/excalidraw";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { DEFAULT_EXPORT_OPTIONS, exportScene } from "./export";
import { imageNaturalSize } from "./image-import";
import { makeElement, nextId, anchorPoint, nearestSide, expandElementSpecs, hasBoundText, type ElementSpec, type Side } from "./ea-element";
import { makeEmbeddableElement } from "./embeddable";
import type { PenSnapshot, PenStyle } from "./pens.ts";
import type { EaBoardHandle } from "./ea-api";

/** 画布明暗主题的读写器（StudioApp 用 React 状态实现；theme 的出口给脚本） */
export type ThemeControl = {
  getTheme: () => "light" | "dark";
  setTheme: (mode: "light" | "dark") => void;
};

export function createEaBoardHandle(api: ExcalidrawImperativeAPI, theme?: ThemeControl): EaBoardHandle {
  return {
    getElements: () => api.getSceneElements(),
    getAppState: () => api.getAppState(),
    addElements: (specs: ElementSpec[]) => {
      const els = expandElementSpecs(specs);
      const ids: string[] = [];
      let cursor = 0;
      for (const s of specs) {
        const el = els[cursor];
        if (!el) break;
        ids.push(String(el.id));
        cursor += hasBoundText(s) ? 2 : 1;
      }
      api.updateScene({
        elements: [...api.getSceneElements(), ...(els as never[])],
        captureUpdate: CaptureUpdateAction.IMMEDIATELY,
      });
      return ids;
    },
    patchElements: (ids: string[], patch: Record<string, unknown>) => {
      const set = new Set(ids);
      api.updateScene({
        elements: api.getSceneElements().map((e) => (set.has(e.id) ? { ...e, ...patch } : e)) as never,
        captureUpdate: CaptureUpdateAction.IMMEDIATELY,
      });
    },
    deleteElements: (ids: string[]) => {
      const set = new Set(ids);
      api.updateScene({
        elements: api.getSceneElements().filter((e) => !set.has(e.id)) as never,
        captureUpdate: CaptureUpdateAction.IMMEDIATELY,
      });
    },
    clear: () => api.resetScene({}),
    selectElements: (ids: string[]) => {
      const sel: Record<string, true> = {};
      ids.forEach((id) => (sel[id] = true));
      api.updateScene({ appState: { selectedElementIds: sel } });
    },
    updateScene: (appState) => api.updateScene({ appState: appState as never }),
    scrollToContent: () => api.scrollToContent(),
    scrollToElement: (id: string) => {
      if (api.getSceneElements().some((e) => e.id === id)) api.scrollToContent();
    },
    setViewMode: (on: boolean) => api.updateScene({ appState: { viewModeEnabled: on } as never }),
    addImage: async (dataURL: string, at: { x: number; y: number; width?: number; height?: number }) => {
      const dim = await imageNaturalSize(dataURL);
      const fileId = `file-${nextId()}`;
      const mime = dataURL.match(/^data:([^;]+)/)?.[1] || "image/png";
      api.addFiles([{ id: fileId as never, dataURL: dataURL as never, mimeType: mime as never, created: Date.now() }]);
      const el = makeElement({
        type: "image",
        fileId: fileId as never,
        x: at.x,
        y: at.y,
        width: at.width ?? dim.width,
        height: at.height ?? dim.height,
      });
      api.updateScene({
        elements: [...api.getSceneElements(), el as never],
        captureUpdate: CaptureUpdateAction.IMMEDIATELY,
      });
      return String(el.id);
    },
    exportImage: async (format: "png" | "svg", scale?: number, subset?: string[]) => {
      const all = api.getSceneElements();
      const set = subset ? new Set(subset) : null;
      const scene = {
        elements: set ? all.filter((e) => set.has(e.id)) : all,
        appState: api.getAppState(),
        files: api.getFiles(),
      };
      return exportScene(scene, { ...DEFAULT_EXPORT_OPTIONS, format, scale: scale ?? 2 });
    },
    /* 第三十二轮：图形绑定连接（EA connectObjects 的子集）。
       写 startBinding/endBinding + 维护两端 boundElements；箭头初值按锚点直线给出，
       vendor 的 binding 机制在场景更新时刷新端点位置。 */
    connectObjects: (id1: string, side1: Side | "auto", id2: string, side2: Side | "auto", padding = 4) => {
      const elements = api.getSceneElements();
      const a = elements.find((e) => e.id === id1);
      const b = elements.find((e) => e.id === id2);
      if (!a || !b || id1 === id2) return null;
      const s1: Side = side1 === "auto" ? nearestSide(a, b) : side1;
      const s2: Side = side2 === "auto" ? nearestSide(b, a) : side2;
      const p1 = anchorPoint(a, s1);
      const p2 = anchorPoint(b, s2);
      const arrow = makeElement({
        type: "arrow",
        x: p1.x,
        y: p1.y,
        points: [
          [0, 0],
          [p2.x - p1.x, p2.y - p1.y],
        ],
      }) as Record<string, unknown>;
      arrow.startBinding = { elementId: id1, focus: 0, gap: padding };
      arrow.endBinding = { elementId: id2, focus: 0, gap: padding };
      // 两端图形的 boundElements 必须挂上箭头 id，vendor 才会在图形移动时更新这条线
      const attach = (el: typeof a) => {
        const bound = Array.isArray(el.boundElements) ? el.boundElements : [];
        return [...bound, { id: String(arrow.id), type: "arrow" }];
      };
      api.updateScene({
        elements: [
          ...elements.map((e) =>
            e.id === id1
              ? { ...e, boundElements: attach(e) }
              : e.id === id2
                ? { ...e, boundElements: attach(e) }
                : e,
          ),
          arrow as never,
        ],
        captureUpdate: CaptureUpdateAction.IMMEDIATELY,
      });
      return String(arrow.id);
    },
    /* 第三十二轮：嵌入元素（复用第三十一轮 embeddable.ts 的元素工厂） */
    addEmbeddable: (link: string, at: { x: number; y: number; width?: number; height?: number }) => {
      const el = makeEmbeddableElement({
        id: `emb-${nextId()}`,
        link,
        x: at.x,
        y: at.y,
        width: at.width ?? 600,
        height: at.height ?? 420,
        index: "a0",
        seed: 1_000_000 + Math.floor(Math.random() * 1_000_000),
      });
      api.updateScene({
        elements: [...api.getSceneElements(), el as never],
        captureUpdate: CaptureUpdateAction.IMMEDIATELY,
      });
      return String(el.id);
    },
    getTheme: () => theme?.getTheme() ?? "light",
    setTheme: (mode: "light" | "dark") => theme?.setTheme(mode),
    /* 第三十八轮：笔刷四键 + 可选切工具。
       四键走 updateScene 的 appState 通道（不改场景元素，因此不进脏指纹）；
       setActiveTool 单独调——vendor 只有它能干净地切活动工具，updateScene 里写
       activeTool 会被自己的 reconcile 覆盖回去。 */
    applyPen: (pen: PenStyle, tool?: "freedraw" | "selection") => {
      api.updateScene({
        appState: {
          currentItemStrokeColor: pen.color,
          currentItemStrokeWidth: pen.width,
          currentItemRoughness: pen.roughness,
          currentItemOpacity: pen.opacity,
        } as never,
      });
      if (tool) api.setActiveTool({ type: tool });
    },
    getPen: (): PenSnapshot => {
      const s = api.getAppState();
      return {
        tool: String(s.activeTool?.type ?? "selection"),
        color: String(s.currentItemStrokeColor ?? ""),
        width: Number(s.currentItemStrokeWidth ?? 0),
        opacity: Number(s.currentItemOpacity ?? 100),
        roughness: Number(s.currentItemRoughness ?? 1),
      };
    },
  };
}
