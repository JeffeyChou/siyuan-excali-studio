// 纯函数单元测试：离线字体基址、主题判定、i18n 回落、落盘路径归一。
// 这四个都是「错了就整条链路哑」的小函数，且能在无思源环境下跑，所以给真断言而不是文本契约。
import { test } from "node:test";
import assert from "node:assert/strict";
import { resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const load = (rel) => import(pathToFileURL(resolve(ROOT, rel)).href);

/**
 * 桩：思源桌面端就是 http://127.0.0.1:6806/。
 * origin 与 baseURI 分开传，才能测出「基址不该跟着页面路径走」这条回归。
 */
function setEnv(overrides = {}) {
  const { origin = "http://127.0.0.1:6806", baseURI = `${origin}/index.html`, ...docRest } = overrides;
  globalThis.window = globalThis.window || {};
  globalThis.document = { baseURI, ...docRest };
  globalThis.location = { origin };
}
setEnv();

const { excalidrawAssetBase, installExcalidrawAssetPath } = await load("src/studio/assets.ts");
const { toDataPath, stampFileName } = await load("src/studio/storage.ts");
const { initI18n, t } = await load("src/i18n.ts");
const { readSiyuanThemeMode } = await load("src/studio/theme.ts");

test("字体基址：绝对 URL、以 / 结尾、指向 origin 根下的插件目录", () => {
  const base = excalidrawAssetBase();
  assert.equal(base, "http://127.0.0.1:6806/plugins/siyuan-excali-studio/");
  assert.ok(base.endsWith("/"), "基址必须以 / 结尾，否则 new URL 会吃掉最后一段目录");
});

test("字体基址：跟着 origin 走，不受页面路径深浅影响", () => {
  setEnv({ origin: "https://example.test:6806", baseURI: "https://example.test:6806/some/deep/index.html" });
  assert.equal(excalidrawAssetBase(), "https://example.test:6806/plugins/siyuan-excali-studio/");
  setEnv();
});

test("字体基址：与 Excalidraw 的拼址方式对齐（./fonts/<家族>/<文件>.woff2）", () => {
  // createUrls 只做 t.replace(/^\/+/,"") —— 保留前导 "./"，再 new URL(rel, base)
  const url = new URL("./fonts/Excalifont/Excalifont-Regular.woff2", excalidrawAssetBase());
  assert.equal(url.href, "http://127.0.0.1:6806/plugins/siyuan-excali-studio/fonts/Excalifont/Excalifont-Regular.woff2");
});

test("installExcalidrawAssetPath：写全局并回传同一基址", () => {
  const base = installExcalidrawAssetPath();
  assert.equal(globalThis.window.EXCALIDRAW_ASSET_PATH, base);
  assert.equal(globalThis.window.EXCALIDRAW_ASSET_PATH, excalidrawAssetBase());
});

test("toDataPath：putFile 的 /data 前缀归一", () => {
  assert.equal(toDataPath("assets/a.svg"), "/data/assets/a.svg");
  assert.equal(toDataPath("/assets/a.svg"), "/data/assets/a.svg");
  assert.equal(toDataPath("data/assets/a.svg"), "/data/assets/a.svg");
  assert.equal(toDataPath("/data/assets/a.svg"), "/data/assets/a.svg");
  assert.equal(toDataPath("data"), "/data");
});

test("stampFileName：excali-YYYYMMDD-HHmmss.svg", () => {
  assert.equal(stampFileName(new Date(2026, 9, 15, 9, 4, 7)), "excali-20261015-090407.svg");
});

test("t()：无语言包回落中文；有包则查表并插值", () => {
  initI18n(undefined);
  assert.equal(t("已导出 {path}"), "已导出 {path}");
  initI18n({ "已导出 {path}": "Exported to {path}", 关闭: "Close" });
  assert.equal(t("已导出 {path}", { path: "/data/assets/a.svg" }), "Exported to /data/assets/a.svg");
  assert.equal(t("关闭"), "Close");
  assert.equal(t("没有这条"), "没有这条", "未翻译必须回落中文原文，不能显示 key 或空白");
  assert.equal(t("已导出 {path}", {}), "Exported to {path}", "缺变量要原样保留占位，不能替换成 undefined");
});

/** 造一份只够 readSiyuanThemeMode 用的 <html>/<body> */
const doc = (attrs, cls = "", bodyCls = "") => ({
  documentElement: { getAttribute: (n) => attrs[n] ?? null, className: cls },
  body: bodyCls === null ? null : { className: bodyCls },
});

test("readSiyuanThemeMode：主钩子 data-theme-mode 优先", () => {
  setEnv(doc({ "data-theme-mode": "dark" }));
  assert.equal(readSiyuanThemeMode(), "dark");
  setEnv(doc({ "data-theme-mode": "light" }, "theme--dark"));
  assert.equal(readSiyuanThemeMode(), "light", "主钩子给了 light 就不能被类名反着带跑");
});

test("readSiyuanThemeMode：部分版本只在 html/body 挂 theme--dark 类", () => {
  setEnv(doc({}, "foo theme--dark"));
  assert.equal(readSiyuanThemeMode(), "dark", "<html> 上挂类");
  setEnv(doc({}, "", "theme--dark"));
  assert.equal(readSiyuanThemeMode(), "dark", "<body> 上挂类");
});

test("readSiyuanThemeMode：两个钩子都缺时按浅色，且不抛错", () => {
  setEnv(doc({}));
  assert.equal(readSiyuanThemeMode(), "light");
  setEnv(doc({}, "", null));
  assert.equal(readSiyuanThemeMode(), "light", "<body> 还不存在（早期调用）");
  setEnv();
});
