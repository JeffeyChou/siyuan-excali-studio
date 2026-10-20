/**
 * 第二十六轮 T3（分包加载）：vendor 引擎的懒加载边界。
 *
 * index.ts 只 import 本模块的**动态** import()——vite/rollup 据此把 @excalidraw/excalidraw
 * （含 React 渲染层、scene/svg/export 这些直连 vendor 的模块）拆进独立 chunk，
 * 插件启动不再解析 8MB 级引擎，首次开画板页签才 require 进来（CJS 产物里
 * import() 编译成 Promise.resolve().then(() => require('./chunk.js'))）。
 *
 * 边界纪律：进这里的模块必须（传递地）依赖 vendor；纯逻辑（scene-codec / board-lib /
 * storage / media-ref / theme / settings / icons / hotkeys…）留在 index.ts 静态导入，
 * 别把小文件也拖进大 chunk。
 */

export { attachStudioTab, STUDIO_TAB_TYPE, parseTabData, type StudioTabData, type StudioTabHost, type StudioTabSession } from "./tab";
export { decodeSvgScene, type LoadedScene, type SceneFilesHydrate } from "./scene";
export { sceneToSvgText, type ExportScene, type SaveMedia } from "./svg";
