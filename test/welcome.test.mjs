// 引导画面（第五轮）：数据层纯函数 + 接线契约。
// 口径与其他 smoke 测试一致：行为断言跑在**去注释后**的源码上，涉及注释的断言跑原文。
//
// 三条最容易被后来者改坏的不变量：
//   ① 引导画面是 Excalidraw 的 **children**，不是自己往 DOM 上插一层（插进去就吃不到
//      App 的「空板 + 选择工具 + 非禅模式」判定，也不会落笔即消失）；
//   ② 关掉设置 = 不传 children（appState.showWelcomeScreen 被 App 在空板时强翻回 true，
//      改那个开关是无效努力）；
//   ③ 入口只用思源的通道（promptOpenPath / openNew），不碰官方 MenuItemLoadScene——
//      它走 Excalidraw 自己的文件选择器，绕开思源落盘与插图链路。
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  ICON_NEW_BOARD,
  ICON_OPEN_BOARD,
  PLANE_BODY,
  PLANE_CREASE,
  PLANE_FIN,
  PLANE_TRAIL,
} from "../src/studio/welcome.ts";
import { boardHotkey } from "../src/studio/hotkeys.ts";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function read(rel) {
  return readFileSync(resolve(ROOT, rel), "utf8");
}
function json(rel) {
  return JSON.parse(read(rel));
}
function src(rel) {
  return read("src/" + rel);
}

function stripComments(code) {
  return code.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'\\])\/\/[^\n]*/g, "$1");
}

const WELCOME = stripComments(src("studio/welcome.ts"));
const WELCOME_TSX = stripComments(src("studio/StudioWelcome.tsx"));
const LINE_ICON = stripComments(src("studio/line-icon.tsx"));
const APP = stripComments(src("studio/StudioApp.tsx"));
const TAB = stripComments(src("studio/tab.tsx"));
const INDEX = stripComments(src("index.ts"));
const SETTINGS = stripComments(src("studio/settings.ts"));
const CSS = stripComments(read("src/index.css"));

/* ------------------------------ 数据层：纯函数 ------------------------------ */

test("boardHotkey：Mac 系给符号，其余给 Ctrl+Alt；不做运行时猜测", () => {
  const mac = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36";
  const iphone = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15";
  const win = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";
  const linux = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36";
  assert.equal(boardHotkey(mac), "⌘⌥E");
  assert.equal(boardHotkey(iphone), "⌘⌥E", "iOS 上思源也是符号快捷键");
  assert.equal(boardHotkey(win), "Ctrl+Alt+E");
  assert.equal(boardHotkey(linux), "Ctrl+Alt+E");
  // 与 addCommand 注册的 hotkey 必须是同一个绑定，否则画面在骗人
  assert.match(INDEX, /hotkey:\s*"⌘⌥E"/, "index.ts 注册的快捷键应与 boardHotkey 的 Mac 分支一致");
});

test("纸飞机路径：轮廓闭合，四段都在 200 见方的 viewBox 里", () => {
  const inBox = (d, max) => {
    const nums = d.match(/-?\d+(?:\.\d+)?/g) ?? [];
    assert.ok(nums.length > 0, "路径里一个数都没有？");
    for (const n of nums) {
      const v = Number(n);
      assert.ok(v >= 0 && v <= max, `坐标 ${v} 越界（0..${max}）：${d}`);
    }
  };
  assert.match(PLANE_BODY, /^M/, "轮廓必须以 M 起笔");
  assert.match(PLANE_BODY, /Z$/, "轮廓要闭合，描边与填充才不会开口");
  inBox(PLANE_BODY, 200);
  inBox(PLANE_CREASE, 200);
  inBox(PLANE_FIN, 200);
  inBox(PLANE_TRAIL, 200);
  // 折痕与尾翼接在尾凹 (110,112) 上：改轮廓不改这里就会断开
  assert.match(PLANE_CREASE, /110,112$/, "折痕终点必须落在尾凹");
  assert.match(PLANE_FIN, /^M110,112/, "尾翼必须从尾凹起笔");
  assert.equal(/Math\.random|Date\.now/.test(WELCOME), false, "抖点写死在常量里，不许运行时生成（产物要能 grep、画面要稳定）");
});

test("菜单小图标：24 网格、线性，与顶栏图标同一口径", () => {
  for (const [name, d] of [["ICON_OPEN_BOARD", ICON_OPEN_BOARD], ["ICON_NEW_BOARD", ICON_NEW_BOARD]]) {
    assert.match(d, /^M/, `${name} 必须以 M 起笔`);
    for (const n of d.match(/-?\d+(?:\.\d+)?/g) ?? []) {
      const v = Number(n);
      assert.ok(v >= 0 && v <= 24, `${name} 坐标 ${v} 越界（0..24）`);
    }
  }
  assert.match(WELCOME_TSX, /import \{ LineIcon \} from "\.\/line-icon"/, "图标渲染器与 ☰ 菜单共用一个，口径才不会分叉");
  assert.match(LINE_ICON, /strokeWidth="1\.8"/, "16px 档图标统一 stroke 1.8");
  assert.match(LINE_ICON, /stroke="currentColor"/, "线条吃 currentColor 才能跟主题");
  assert.match(LINE_ICON, /viewBox="0 0 24 24"/, "统一 24 网格");
});

/* ------------------------------ 接线契约 ------------------------------ */

test("StudioWelcome 用官方组件树，且绕开 Excalidraw 自己的载入", () => {
  assert.match(WELCOME_TSX, /import \{ WelcomeScreen \} from "@excalidraw\/excalidraw"/, "必须用包导出的 WelcomeScreen");
  assert.match(WELCOME_TSX, /<WelcomeScreen>/, "根节点是 WelcomeScreen");
  assert.match(WELCOME_TSX, /<Center>/, "内容挂在 Center（它才走 WelcomeScreenCenterTunnel）");
  assert.match(WELCOME_TSX, /<Center\.Logo>/, "纸飞机占 Logo 位");
  assert.match(WELCOME_TSX, /<Center\.Heading>/, "标题与提示占 Heading 位");
  assert.match(WELCOME_TSX, /<Center\.Menu>/, "入口占 Menu 位");
  assert.match(WELCOME_TSX, /<Center\.MenuItemHelp \/>/, "帮助入口用官方项（跟 ? 弹窗同一动作）");
  assert.equal(WELCOME_TSX.includes("MenuItemLoadScene"), false, "不许用官方载入项：它会弹 Excalidraw 的文件选择器，绕开思源落盘+插图");
  assert.equal(WELCOME_TSX.includes("Hints"), false, "三个箭头提示在移动端被 vendor display:none 收掉，这里不挂");
});

test("StudioApp：引导画面是 Excalidraw 的 children，关掉 = 不传", () => {
  assert.match(APP, /showWelcome: boolean/, "StudioProps 要有 showWelcome");
  assert.match(APP, /onOpenExisting: \(\) => void/, "两个入口回调要进 props");
  assert.match(APP, /onNewBoard: \(\) => void/);
  assert.match(APP, /\{showWelcome \? <StudioWelcome/, "关设置时必须整棵不传，而不是渲染完再藏");
  assert.equal(/querySelector\([^)]*welcome/.test(APP), false, "不许自己往 DOM 插引导层：那样吃不到 App 的空板判定");
});

test("tab.tsx：宿主通道进 StudioTabHost，并透传给 StudioApp", () => {
  assert.match(
    TAB,
    /"accent"[\s\S]*?"showWelcome"[\s\S]*?"onOpenExisting"[\s\S]*?"onNewBoard"/,
    "StudioTabHost 的 Pick 必须包含引导画面三项",
  );
  assert.match(TAB, /"promptFileName"/, "阶段 A：命名通道进 Pick");
  assert.match(TAB, /"onRename"/, "阶段 A：重命名通道进 Pick");
  assert.equal(TAB.includes('"autoSave"'), false, "第二十一轮：自动保存成为唯一形态，开关从 Pick 删除");
  assert.match(TAB, /showWelcome=\{host\.showWelcome\}/);
  assert.match(TAB, /onOpenExisting=\{host\.onOpenExisting\}/);
  assert.match(TAB, /onNewBoard=\{host\.onNewBoard\}/);
  assert.match(TAB, /promptFileName=\{host\.promptFileName\}/, "命名通道透传到 StudioApp");
  assert.match(TAB, /onRename=\{async \(oldPath, newName\)/, "重命名 wrapper 更新 data/标题");
});

test("index.ts：host 用 getter 读设置，入口复用已有动作", () => {
  assert.match(INDEX, /get showWelcome\(\)\s*\{\s*return plugin\.settings\.showWelcome;/, "getter 与 accent 同风格，改设置不用重开页签之外的路径保持一致");
  assert.match(INDEX, /onOpenExisting: \(\) => this\.promptOpenPath\(\)/, "入口直接复用顶栏右键的「按路径打开…」");
  assert.match(INDEX, /onNewBoard: \(\) => void this\.openNew\(\)/, "入口直接复用新建，void 掉 Promise 免 unhandled rejection");
  assert.match(INDEX, /title: t\("空画板显示引导画面"\)/, "设置页要有开关行");
  assert.match(INDEX, /showWelcome: welcomeEl\?\.checked \?\? this\.settings\.showWelcome/, "确认按钮也要收口一次");
});

test("settings：默认开，脏值归一认布尔", () => {
  assert.match(SETTINGS, /showWelcome: boolean/);
  const def = SETTINGS.match(/DEFAULT_SETTINGS[^}]*\}/)?.[0] ?? "";
  assert.match(def, /showWelcome: true/, "引导画面默认开（用户确认过的决策）");
  assert.match(SETTINGS, /showWelcome: typeof r\.showWelcome === "boolean" \? r\.showWelcome : DEFAULT_SETTINGS\.showWelcome/);
});

test("布局：飞机中心落在画布约 1/3 高度处（参照 Obsidian 那把剑的构图）", () => {
  const spacer = WELCOME_TSX.indexOf("exs-welcome__spacer");
  const logo = WELCOME_TSX.indexOf("<Center.Logo>");
  const below = WELCOME_TSX.indexOf("exs-welcome__below");
  const heading = WELCOME_TSX.indexOf("<Center.Heading>");
  const menu = WELCOME_TSX.indexOf("<Center.Menu>");
  assert.ok(spacer >= 0 && logo >= 0 && below >= 0, "留白层与下方块都要在 Center 里");
  assert.ok(spacer < logo && logo < below, `顺序必须是 留白 → 飞机 → 下方块 (spacer=${spacer}, logo=${logo}, below=${below})`);
  assert.ok(below < heading && heading < menu, "标题与菜单必须在下方块之内（飞机之下）");
  // 顶部留白按容器高取百分比、下方块 grow 吃掉剩余 ⇒ 飞机偏上、空白落在底部。
  // 等分两侧留白会把飞机压到画布正中（真机反馈「太低」），别改回去。
  assert.match(CSS, /\.exs-root \.welcome-screen-center\s*\{[^}]*justify-content:\s*flex-start/, "整组必须从顶部排，否则 vendor 的 center 会把空白分到两侧");
  assert.match(CSS, /\.exs-root \.exs-welcome__spacer\s*\{[^}]*flex:\s*0 0 15%/, "顶部留白按容器高取比例（不是等分）");
  assert.match(CSS, /\.exs-root \.exs-welcome__below\s*\{[^}]*flex:\s*1 1 auto/, "下方块撑满剩余，文字才贴着飞机");
  // 下方块刻意不写 min-height:0：内容装不下时它不缩，缩的是顶部留白，文字不会压到飞机上
  assert.equal(/\.exs-root \.exs-welcome__below\s*\{[^}]*min-height:\s*0/.test(CSS), false, "下方块不许 min-height:0");
});

test("CSS：飞机尺寸封顶 320px 且按窗口高收，窄页签不溢出；矮窗口与移动端收起提示行", () => {
  assert.match(CSS, /\.exs-root \.welcome-screen-center__logo\s*\{[^}]*width:\s*min\(320px,\s*26vh\)/, "飞机尺寸给外层 div，svg 铺满：百分比宽度落在内容宽度的 flex 项上会解析出偏左的盒子");
  assert.match(CSS, /\.exs-root \.welcome-screen-center__logo\s*\{[^}]*justify-content:\s*center/, "logo 是 flex 行，默认 flex-start 会让飞机偏左");
  assert.match(CSS, /\.exs-root \.welcome-screen-center__logo svg\s*\{[^}]*width:\s*100%/, "svg 铺满外层盒子");
  assert.match(CSS, /\.exs-root \.welcome-screen-menu-item\s*\{[^}]*min-width:\s*min\(300px,\s*100%\)/, "vendor 写死 300px，分屏压窄会横向溢出");
  assert.match(CSS, /\.exs-welcome__title\s*\{[^}]*var\(--b3-theme-on-background/, "标题用思源正文色，深色主题不糊");
  assert.match(CSS, /\.excalidraw--mobile \.exs-welcome__tips\s*\{\s*display:\s*none/, "移动端只留菜单入口");
  assert.match(CSS, /@media\s*\(max-height:\s*760px\)\s*\{\s*\.exs-welcome__tips\s*\{\s*display:\s*none/, "矮窗口先让提示行，文字块才顶得住、不会把菜单推到画面外");
});

test("引导画面文案全部在两份语言包里", () => {
  const zh = json("i18n/zh_CN.json");
  const en = json("i18n/en_US.json");
  const used = [...WELCOME_TSX.matchAll(/\bt\("([^"]+)"/g)].map((m) => m[1]);
  assert.ok(used.length >= 5, `至少抓到 5 处 t()，实得 ${used.length}`);
  for (const k of used) {
    assert.ok(k in zh, `zh_CN 缺键：${k}`);
    assert.ok(k in en, `en_US 缺键：${k}`);
    assert.equal(zh[k], k, "中文原文即 key");
  }
});
