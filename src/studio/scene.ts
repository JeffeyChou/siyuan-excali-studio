/**
 * 内嵌 scene 的解码（SVG → 可直接喂给画板的数据）
 *
 * 解码本身在 scene-codec.ts（纯逻辑、可单测）；这里多一步 `restore()` 归一：
 * 补默认值、修绑定（容器/箭头），与 Excalidraw 自己「打开文件」走同一条路，
 * 于是外部 excalidraw.com 导出的、版本略有差异的图也能直接编辑。
 *
 * 第二十六轮 T1（图片外置）：载荷里的 files 可能只有 path 引用没有 dataURL。
 * 本模块不碰文件系统——hydrate 回调由宿主传入（读 assets/excali-media 字节 →
 * 拼 dataURL），注水完再 restore。第二十六轮起本函数是 async（注水要读盘）。
 */

import { restore } from "@excalidraw/excalidraw";
import { decodeSvgPayload } from "./scene-codec.ts";

export { SceneError, hasEmbeddedScene, hasNonEmptyScene, decodeSvgPayload, encodeSvgPayload, SCENE_MARKER } from "./scene-codec.ts";
export type { SceneFailReason, ScenePayload } from "./scene-codec.ts";

export type LoadedScene = {
  elements: ReturnType<typeof restore>["elements"];
  appState: ReturnType<typeof restore>["appState"];
  files: ReturnType<typeof restore>["files"];
};

/**
 * 图片引用注水回调：吃解码出的 files 表，返回补好 dataURL 的表。
 * 宿主实现（index.ts）：有 path 没 dataURL 的条目读盘注水；读不回的条目原样
 * 保留（缺图不挡开板，画布上该图渲染为空框）。
 */
export type SceneFilesHydrate = (files: Record<string, unknown>) => Promise<Record<string, unknown>>;

export async function decodeSvgScene(svgText: string, hydrate?: SceneFilesHydrate): Promise<LoadedScene> {
  const scene = decodeSvgPayload(svgText);
  const files = hydrate ? await hydrate(scene.files) : scene.files;
  const restored = restore(
    {
      elements: scene.elements as never,
      appState: scene.appState as never,
      files: files as never,
    },
    null,
    null,
    { repairBindings: true },
  );
  return { elements: restored.elements, appState: restored.appState, files: restored.files };
}
