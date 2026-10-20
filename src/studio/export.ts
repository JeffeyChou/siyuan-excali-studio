/**
 * 2026-10-15 阶段 A：多格式导出（PNG/JPEG/WebP/SVG）。
 *
 * 与落盘用的 sceneToSvgText 分工：那个产出「内嵌 scene 的可编辑 SVG」走保存链路；
 * 这里产出「给外部用的位图/普通 SVG」，不落盘、不进文档，只下载或复制到剪贴板。
 */

import { exportToBlob, exportToSvg } from "@excalidraw/excalidraw";
import type { AppState, BinaryFiles } from "@excalidraw/excalidraw/types";
import type { NonDeletedExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import { ensureSvgBackground } from "./svg";
import { themeDefaultCanvasColor } from "./theme";

export type ExportFormat = "png" | "jpeg" | "webp" | "svg";

export interface ExportOptions {
  format: ExportFormat;
  /** 1 / 2 / 3 倍（位图生效） */
  scale: number;
  /** 仅导出选中元素 */
  selectionOnly: boolean;
  /** 透明背景（位图生效；JPEG 不支持透明，强制白底） */
  transparent: boolean;
  /** 用暗色主题导出（当前亮色时） */
  dark: boolean;
  /** SVG 内嵌可编辑 scene（仅 svg 格式） */
  embedScene: boolean;
}

export const DEFAULT_EXPORT_OPTIONS: ExportOptions = {
  format: "png",
  scale: 2,
  selectionOnly: false,
  transparent: false,
  dark: false,
  embedScene: true,
};

export type ExportScene = {
  elements: readonly NonDeletedExcalidrawElement[];
  appState: Partial<AppState>;
  files: BinaryFiles;
};

/** MIME 与扩展名 */
const MIME: Record<ExportFormat, string> = {
  png: "image/png",
  jpeg: "image/jpeg",
  webp: "image/webp",
  svg: "image/svg+xml",
};

export function exportExt(format: ExportFormat): string {
  return format === "svg" ? "svg" : format;
}

/** 把场景按选项导出为 Blob（svg 返回 image/svg+xml 文本 blob） */
export async function exportScene(scene: ExportScene, opts: ExportOptions): Promise<Blob> {
  if (scene.elements.length === 0) throw new Error("画板为空，无可导出的内容");
  const exportBackground = opts.format === "jpeg" ? true : !opts.transparent;
  const appState = {
    ...scene.appState,
    exportBackground,
    exportEmbedScene: opts.format === "svg" ? opts.embedScene : false,
    exportScale: opts.scale,
    exportSelection: opts.selectionOnly,
    exportWithDarkMode: opts.dark,
  };
  if (opts.format === "svg") {
    const svg = await exportToSvg({
      elements: scene.elements,
      appState: appState as Parameters<typeof exportToSvg>[1],
      files: scene.files,
      exportPadding: 10,
    });
    // 「默认」背景（空串）导出时没有 CSS 兜底：手动补一块底（payload 里的空串不动，
    // 再次打开这份导出物仍是「跟随主题」）
    ensureSvgBackground(svg, scene.appState.viewBackgroundColor, opts.dark);
    const body = `<?xml version="1.0" encoding="UTF-8"?>\n${new XMLSerializer().serializeToString(svg)}\n`;
    return new Blob([body], { type: MIME.svg });
  }
  // 位图没有内嵌 payload 可污染：把空串「默认」落成具体色，否则导出的是透明底。
  // 暗色导出（dark）给 #121212；否则给当前思源主题的默认色（亮 #ffffff / 暗 #121212）。
  if (exportBackground && !appState.viewBackgroundColor) {
    appState.viewBackgroundColor = opts.dark ? "#121212" : themeDefaultCanvasColor();
  }
  return exportToBlob({
    elements: scene.elements,
    appState,
    files: scene.files,
    mimeType: MIME[opts.format],
    quality: opts.format === "png" ? undefined : 0.92,
    exportPadding: 10,
  });
}

/** 触发浏览器下载（a[download] 点击；Electron 下即存到默认下载目录） */
export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

/** 复制位图到剪贴板（PNG/JPEG/WebP；SVG 不可复制调用方先拦） */
export async function copyBlobToClipboard(blob: Blob): Promise<void> {
  const type = blob.type || "image/png";
  if (!navigator.clipboard || typeof ClipboardItem === "undefined") {
    throw new Error("当前环境不支持剪贴板图片");
  }
  await navigator.clipboard.write([new ClipboardItem({ [type]: blob })]);
}

/** 默认导出文件名（与保存同名基座） */
export function exportFileName(base: string, format: ExportFormat): string {
  const clean = base.replace(/[\\/:*?"<>|]/g, "").replace(/\.(svg|png|jpe?g|webp)$/i, "") || "excali-board";
  return `${clean}.${exportExt(format)}`;
}
