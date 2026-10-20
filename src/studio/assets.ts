/**
 * Excalidraw 离线资源基址。
 *
 * 为什么需要它：dist/prod 里字体加载器（FontsWatcher.createUrls）**惰性**读取
 * `window.EXCALIDRAW_ASSET_PATH`，用它把 `./fonts/<家族>/<文件>.woff2` 拼成绝对 URL；
 * 未设置时回落 `ASSETS_FALLBACK_URL = https://esm.sh/@excalidraw/excalidraw@<版本>/dist/prod/`，
 * 即断网就没有手绘字体（思源桌面端常年离线）。
 *
 * 因为是惰性读取，本函数在 onload() 里调用即可，不必抢在 import Excalidraw 之前；
 * 但必须早于首次渲染画板。
 */

/** 思源把 data/plugins/<name>/ 挂在 web 根的 /plugins/<name>/ 下（与 /api/file/* 同一套根路径约定） */
export const PLUGIN_WEB_DIR = "siyuan-excali-studio";

/**
 * 归一化成「以 / 结尾的绝对 URL」——createUrls 内部按 base 做 new URL(rel, base)。
 *
 * 用 location.origin 而不是 document.baseURI：baseURI 是**当前页面 URL**，
 * 深一层（如 /xxx/index.html）时 `new URL("plugins/…", baseURI)` 会拼到 /xxx/ 下面去；
 * 插件资源的真根永远是 origin 根。
 */
export function excalidrawAssetBase(): string {
  return new URL(`plugins/${PLUGIN_WEB_DIR}/`, `${location.origin}/`).href;
}

export function installExcalidrawAssetPath(): string {
  const base = excalidrawAssetBase();
  (window as unknown as { EXCALIDRAW_ASSET_PATH: string }).EXCALIDRAW_ASSET_PATH = base;
  return base;
}
