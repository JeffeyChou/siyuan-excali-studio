import { exportToSvg } from "@excalidraw/excalidraw";
import type { AppState, BinaryFiles } from "@excalidraw/excalidraw/types";
import type { NonDeletedExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import { SCENE_MARKER, encodeSvgPayload } from "./scene-codec.ts";
import { parseDataUrl } from "./media-ref";
import { themeDefaultCanvasColor } from "./theme";

export { SCENE_MARKER };

export type ExportScene = {
  elements: readonly NonDeletedExcalidrawElement[];
  appState: Partial<AppState>;
  files: BinaryFiles;
};

/**
 * 第二十六轮 T1：落盘时的图片外置通道——宿主实现（dataURL → 写 assets/excali-media/
 * 内容寻址文件 → 返回相对路径）。传了就把载荷里的 files 换成 path 引用；
 * 不传（测试/极端场景）保持 dataURL 内嵌，行为与 T1 之前一致。
 */
export type SaveMedia = (dataURL: string, mime: string) => Promise<string>;

/**
 * 给导出树补一块背景底。
 *
 * vendor 只在 viewBackgroundColor 为真值时画底（空串 = 「默认」，屏幕上靠 CSS
 * var(--default-bg-color) 兜底），导出物没有 CSS 可依 ⇒ 透明。
 * 只动渲染树：payload 里的空串保持不动，再次编辑时继续跟随主题。
 * dark 仅用于外部导出对话框：dark 导出时 vendor 在 <svg> 上挂了 invert 滤镜，
 * fill 要预补偿成浅色，滤镜翻出来才是深底。
 */
export function ensureSvgBackground(svg: SVGSVGElement, viewBackgroundColor: string | undefined, dark: boolean): void {
  if (viewBackgroundColor) return;
  const vb = svg.viewBox.baseVal;
  const rect = svg.ownerDocument.createElementNS("http://www.w3.org/2000/svg", "rect");
  rect.setAttribute("x", `${vb.x}`);
  rect.setAttribute("y", `${vb.y}`);
  rect.setAttribute("width", `${vb.width}`);
  rect.setAttribute("height", `${vb.height}`);
  rect.setAttribute("fill", dark ? "#ffffff" : themeDefaultCanvasColor());
  svg.insertBefore(rect, svg.firstChild);
}

/**
 * 画板场景 → 「可再次编辑的 SVG」文本。
 *
 * 第二十六轮 T1 起分两段：
 * ① 预览树仍由 vendor 的 exportToSvg 画（<image> 预览、背景、字体都在），
 *    但**不再**让 vendor 内嵌 scene（exportEmbedScene 摘掉）——它会把 files 的
 *    dataURL 原样塞进载荷，图片内嵌正是文件膨胀 2.1 倍的根源（压测数据见
 *    scripts/bench-large-scene-baseline.json）；
 * ② 载荷由 encodeSvgPayload 自己编（与 vendor/excalidraw.com 同构、互认不破），
 *    saveMedia 传入时 files 换成 path 引用（图片外置），appState 走白名单。
 * 旧文件（vendor 载荷 / v1 / 内嵌 dataURL）解码侧全部兼容，读到什么存什么。
 */
export async function sceneToSvgText(scene: ExportScene, opts?: { saveMedia?: SaveMedia }): Promise<string> {
  const svg = await exportToSvg({
    elements: scene.elements,
    appState: { ...scene.appState, exportBackground: true },
    files: scene.files,
  });
  ensureSvgBackground(svg, scene.appState.viewBackgroundColor, false);

  let payloadFiles: Record<string, unknown> = scene.files as unknown as Record<string, unknown>;
  if (opts?.saveMedia) {
    payloadFiles = {};
    for (const [id, f] of Object.entries(scene.files)) {
      const dataURL = (f as { dataURL?: unknown }).dataURL;
      if (typeof dataURL !== "string" || dataURL === "") {
        payloadFiles[id] = f; // 没有内容的条目原样保留（不该出现，防御）
        continue;
      }
      const parsed = parseDataUrl(dataURL);
      if (!parsed) {
        payloadFiles[id] = f; // 解不出字节的 dataURL（非 base64 形态）只能内嵌
        continue;
      }
      const path = await opts.saveMedia(dataURL, parsed.mime);
      payloadFiles[id] = {
        id,
        mimeType: (f as { mimeType?: string }).mimeType || parsed.mime,
        created: (f as { created?: number }).created,
        path,
      };
    }
  }

  const payload = encodeSvgPayload({
    elements: scene.elements as unknown as unknown[],
    appState: scene.appState as unknown as Record<string, unknown>,
    files: payloadFiles,
  });

  const body = new XMLSerializer().serializeToString(svg);
  // 注入点对齐 vendor 产物：<svg ...> 开标签之后紧跟标记注释 + <metadata>
  const openTag = /^<svg[^>]*>/.exec(body);
  if (!openTag) throw new Error("导出的 SVG 形态异常（找不到 <svg> 开标签）");
  const withPayload = body.replace(openTag[0], openTag[0] + payload);
  if (!withPayload.includes(SCENE_MARKER)) {
    throw new Error("导出的 SVG 未内嵌可编辑 scene（缺 svg-source:excalidraw 标记）");
  }
  return `<?xml version="1.0" encoding="UTF-8"?>\n${withPayload}\n`;
}
