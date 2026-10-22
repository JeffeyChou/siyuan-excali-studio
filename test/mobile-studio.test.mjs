// 移动端画板通道（iPad / 手机）。
//
// 背景：思源移动端前端没有自定义页签——Plugin.addTab 是空实现，
// window.siyuan.openTab 也是空函数。桌面那条「addTab 注册模型 → openTab(custom)」
// 在 iPad 上会静默什么都不做：白板文件建好了，画板永远不出现。
//
// 必须钉住的不变量：
//   ① 移动端判定只看宿主 siyuan.mobile，不靠 UA 猜；
//   ② openStudioTab 在调用 openTab 之前分流到移动浮层；
//   ③ 浮层仍复用 attachStudioTab（关闭冲刷/脏点/重命名跟标题一条链路不丢）；
//   ④ 宿主 bundle 不能静态 import tab.tsx 的运行时（会把 8MB 引擎提前拉进来）。
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const src = (rel) => readFileSync(resolve(ROOT, "src/" + rel), "utf8");
const stripComments = (code) => code.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'\\])\/\/[^\n]*/g, "$1");

const INDEX = stripComments(src("index.ts"));
const MOBILE = stripComments(src("studio/mobile-studio.ts"));
const TAB = stripComments(src("studio/tab.tsx"));
const CSS = readFileSync(resolve(ROOT, "src/index.css"), "utf8");

test("移动端判定：读宿主 siyuan.mobile，不按 UA 猜", () => {
  assert.match(MOBILE, /siyuan\?: \{ mobile\?: unknown \}/, "类型上承认 siyuan.mobile");
  assert.match(MOBILE, /return !!host\?\.mobile;/, "有 siyuan.mobile 才是移动端前端");
  assert.equal(/navigator\.userAgent/.test(MOBILE), false, "不要用 UA 判断移动端（桌面浏览器也能带 iPad UA）");
});

test("分流：移动端必须在 openTab 之前走浮层", () => {
  const at = INDEX.indexOf("private async openStudioTab");
  const end = INDEX.indexOf("private openMobileStudio");
  assert.ok(at > 0 && end > at, "两段入口都要在");
  const body = INDEX.slice(at, end);
  const branch = body.indexOf("if (isMobileFrontend())");
  const desktop = body.indexOf("await openTab(");
  assert.ok(branch > 0, "openStudioTab 缺移动端分流");
  assert.ok(desktop > branch, "必须先分流；移动端走到 openTab 就是静默失败");
  assert.match(body.slice(branch, branch + 160), /this\.openMobileStudio\(target, docId\);/, "分流后调移动浮层");
});

test("浮层复用 attachStudioTab，且保留页签会话语义", () => {
  assert.match(INDEX, /const provisional: StudioTabSession = \{[\s\S]*?this\.tabs\.set\(custom, provisional\);/, "引擎装载期间先占位，去重/关闭/卸载不空窗");
  assert.match(INDEX, /const session = m\.attachStudioTab\(custom, this\.studioHost\(\)\);/, "移动浮层必须复用同一套画板挂载");
  assert.match(INDEX, /this\.tabs\.set\(custom, session\);/, "装载完成后换成真会话");
  assert.match(INDEX, /requestClose: \(\) => shell\.close\(\)/, "关闭走同一个 requestClose（冲刷后关）");
  assert.match(INDEX, /closeForDelete: \(\) => shell\.close\(\)/, "删除白板跳过冲刷的通道也要接上");
});

test("浮层替身：element/data/tab 三件套齐全，标题栏就是 headElement", () => {
  assert.match(MOBILE, /className = "exs-mobile-shell"/, "浮层根节点类名稳定（CSS 与切前台都认它）");
  assert.match(MOBILE, /className = "exs-mobile-header"/, "标题栏存在");
  assert.match(MOBILE, /bodyEl\.className = "exs-mobile-body exs-panel"/, "内容区要带 exs-panel，撑满高度链");
  assert.match(MOBILE, /headElement: header/, "tab.headElement 指向标题栏，脏点/关闭捕获才生效");
  assert.match(MOBILE, /element: bodyEl,[\s\S]{0,80}data: opts\.data,[\s\S]{0,80}tab,/, "custom = element + data + tab");
  assert.match(MOBILE, /updateTitle: \(next: string\)/, "重命名/首存后标题要跟位");
  assert.match(MOBILE, /parent: \{ switchTab: \(\) => show\(\) \}/, "去重命中要有切前台动作");
  assert.match(MOBILE, /querySelectorAll<HTMLElement>\("\.exs-mobile-shell"\)/, "同时只显示一块白板");
  assert.match(MOBILE, /classList\.add\("exs-mobile-open"\)/, "打开时锁底层滚动");
  assert.match(MOBILE, /classList\.remove\("exs-mobile-open"\)/, "关闭后解锁");
});

test("关闭识别：tab.tsx 同时认桌面 .item__close 与移动 .exs-mobile-close", () => {
  assert.match(TAB, /closest\("\.item__close, \.exs-mobile-close"\)/, "移动浮层的关闭按钮要能被捕获阶段拦住");
});

test("宿主 bundle 不静态拉引擎：mobile-studio 里没有 tab.tsx 运行时 import", () => {
  assert.match(MOBILE, /import type \{ StudioTabSession \} from "\.\/tab";/, "只允许 import type（构建后擦除）");
  const runtimeTabImport = MOBILE.split("\n").some(
    (line) => line.startsWith("import ") && !line.startsWith("import type ") && line.includes('from "./tab"'),
  );
  assert.equal(runtimeTabImport, false, "静态 import tab.tsx 会把 vendor 拉回主包");
  assert.equal(MOBILE.includes("attachStudioTab"), false, "挂载动作必须从 lazyMod() 的返回值里取");
});

test("文档打开：移动端走 openMobileFileById，桌面保持 openTab", () => {
  const at = INDEX.indexOf("private openDocumentById");
  assert.ok(at > 0, "缺 openDocumentById");
  const body = INDEX.slice(at, at + 1200);
  assert.match(body, /host\.siyuan\?\.mobile && typeof mobileOpen === "function"/, "只有移动端才走移动 API");
  assert.match(body, /mobileOpen\(this\.app, docId, \[\], "start"\)/, "移动端打开文档的参数口径");
  assert.match(body, /void openTab\(\{ app: this\.app, doc: \{ id: docId \} \}\)/, "桌面/浏览器保持原链路");
});

test("样式：全屏浮层 + 安全区 + 压过侧栏", () => {
  const shell = CSS.slice(CSS.indexOf(".exs-mobile-shell {"), CSS.indexOf("body.exs-mobile-open"));
  assert.match(shell, /position: fixed;/, "移动浮层必须脱离页签布局");
  assert.match(shell, /inset: 0;/, "铺满安全区");
  assert.match(shell, /z-index: 900;/, "压过思源移动端侧栏/顶栏，仍在 Dialog 之下");
  assert.match(shell, /env\(safe-area-inset-top/, "iPad 状态栏安全区");
  const body = CSS.slice(CSS.indexOf(".exs-mobile-body {"), CSS.indexOf(".exs-root {"));
  assert.match(body, /padding-bottom: env\(safe-area-inset-bottom/, "iPad Home 指示条安全区");
  assert.match(CSS, /body\.exs-mobile-open \{\s*overflow: hidden;/, "打开时锁底层滚动");
});
