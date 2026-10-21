// 第四十六轮 B2 批：底栏 Obsidian 化·flex 流版（返工）。
//
// 调研结论（fork TrayMenu.tsx + obsidianStylingOverrides.css）：Obsidian 底栏没有
// transition——中段 [🎨⧉🗑] 与 ↶↷ 在同一条 flex 流里，按钮出现时 pill 自然长宽、
// zoom Island 被推走；🎨 是真开关（toggleTrayEditMenu，checked 态），面板 = 开关开
// 且有选中；无选中时 fork 渲染空占位靠 :empty 隐藏，我们等价换成 max-width 收展。
//
// 本文件锁五条最容易被改坏的不变量：
//   ① 所有 vendor 布局覆盖必须带 .exs-root 命名空间；
//   ② ☰ 的搬家用「包裹 div 绝对定位」而不是 position:static——后者会让
//     dropdown-menu 失去定位锚；
//   ③ 底栏是一条 flex 流（exs-bottom-dock > exs-bottom-bar + exs-zoom-pill），
//     vendor footer 左列退役——绝对定位中段 + 魔法 margin 的旧拼法不许回流；
//   ④ 🎨 必须是真开关（propsOpen state + exs-props-open 根类），面板不能只跟选中走；
//   ⑤ 五键全部走合成键盘事件进 vendor action 通道（撤销栈/缩放锚点原生完整）。
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  ICON_PALETTE,
  ICON_DUPLICATE,
  ICON_DELETE,
  ICON_UNDO,
  ICON_REDO,
  ICON_MINUS,
  ICON_PLUS,
} from "../src/studio/menu-icons.ts";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(resolve(ROOT, rel), "utf8");
const src = (rel) => read("src/" + rel);
const stripComments = (code) => code.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'\\])\/\/[^\n]*/g, "$1");

const CSS = stripComments(src("index.css"));
const APP = stripComments(src("studio/StudioApp.tsx"));

/* ------------------------------ CSS 覆盖段 ------------------------------ */

test("CSS：☰ 搬左下（包裹 div 绝对定位）、下拉朝上、面板沉底，vendor 类名全带 .exs-root 命名空间", () => {
  assert.match(
    CSS,
    /\.exs-root \.excalidraw \.App-menu_top__left > div:first-child \{[^}]*position: absolute !important;[^}]*bottom: 0 !important;/,
    "☰ 搬家必须用包裹 div 绝对定位（position:static 会弄丢 dropdown 的定位锚）",
  );
  assert.match(
    CSS,
    /\.exs-root \.excalidraw \.App-menu_top__left > div:first-child \.dropdown-menu \{[^}]*top: auto;[^}]*bottom: calc\(100% \+ 8px\);/,
    "底部 ☰ 的下拉菜单必须朝上开",
  );
  assert.match(
    CSS,
    /\.exs-root \.excalidraw \.App-menu__left \{[^}]*top: auto;[^}]*left: 0;[^}]*bottom: 3\.75rem;/,
    "属性面板要沉到左下、底栏上方",
  );

  for (const cls of ["App-menu__left", "App-menu_top__left", "layer-ui__wrapper__footer-left", "dropdown-menu", "main-menu-trigger"]) {
    for (const line of CSS.split("\n").filter((l) => l.includes(cls))) {
      if (line.includes("{") || line.includes(",")) {
        assert.ok(/\.exs-root/.test(line), `vendor 类名 ${cls} 的覆盖必须带 .exs-root 命名空间：${line.trim()}`);
      }
    }
  }
});

test("CSS：底栏 flex 流 + 中段 max-width 收展 + vendor footer 左列退役", () => {
  // vendor footer 左列整体退役（zoom/undo/redo 收进自家底栏）
  assert.match(
    CSS,
    /\.exs-root \.excalidraw \.layer-ui__wrapper__footer-left \{[^}]*display: none !important;/,
    "vendor footer 左列必须退役（zoom/undo/redo 全在自家底栏）",
  );
  // dock 双 Island：主 pill + zoom pill，flex 行排（zoom 被自然推走，无魔法 margin）
  assert.match(
    CSS,
    /\.exs-root \.exs-bottom-dock \{[^}]*display: flex;[^}]*align-items: center;[^}]*gap: 8px;/,
    "dock 要双 pill flex 行排",
  );
  // ☰ 左帽：wrapper 出帽（描边在帽上、右边无边框），trigger 缩成帽内灰块（质感轮口径）
  assert.match(
    CSS,
    /\.exs-root \.excalidraw \.App-menu_top__left > div:first-child \{[^}]*border-right: none;[^}]*background: var\(--island-bg-color\);/,
    "☰ wrapper 出左帽且底色对齐 island",
  );
  // 主 pill 右半：左缘开口接 ☰ 帽，右边自带圆角（12px 圆角 token）
  assert.match(
    CSS,
    /\.exs-root \.exs-bottom-bar \{[^}]*border-left: none;[^}]*border-radius: 0 var\(--exs-pill-radius\) var\(--exs-pill-radius\) 0;/,
    "bar 本体出右半 pill（左边不画边框）",
  );
  // 中段收展：max-width 0→6.75rem（3 键 × 2.25rem），带过渡
  assert.match(
    CSS,
    /\.exs-root \.exs-sel-group \{[^}]*max-width: 0;[^}]*transition: max-width 180ms ease, opacity 140ms ease;/,
    "中段默认收起（max-width:0）且带过渡",
  );
  assert.match(
    CSS,
    /\.exs-root\.exs-selection \.exs-sel-group \{[^}]*max-width: 6\.75rem;/,
    "选中态中段展开到三键宽度",
  );
  // 旧拼法不许回流
  assert.equal(CSS.includes("exs-sel-actions"), false, "绝对定位中段 .exs-sel-actions 已退役");
  assert.equal(CSS.includes("margin-left: calc(2.25rem + 7.75rem)"), false, "undo 魔法 margin 已退役");
  assert.equal(CSS.includes("zoom-actions"), false, "vendor zoom-actions 改装已退役");
  // 面板显隐门：🎨 开关关着时收起面板
  assert.match(
    CSS,
    /\.exs-root:not\(\.exs-props-open\) \.excalidraw \.App-menu__left \{[^}]*display: none;/,
    "面板要受 exs-props-open 根类门控",
  );
  // footer-left 藏掉后 footer-right（帮助 ?）是 space-between 唯一子元素，会被排到
  // 最左盖住 ☰——必须 margin-left:auto 推回右缘
  assert.match(
    CSS,
    /\.exs-root \.excalidraw \.layer-ui__wrapper__footer-right \{[^}]*margin-left: auto;/,
    "帮助 ? 按钮必须推回右缘（不许盖住左下的 ☰）",
  );
  // pill 描边走 --exs-pill-border（--color-surface-lowest=#ffffff 在白底画布上不可见）
  assert.equal(CSS.includes("--exs-pill-border: rgba(0, 0, 0, 0.12)"), true, "亮色 pill 描边 token");
  assert.equal(CSS.includes("--exs-pill-border: rgba(255, 255, 255, 0.16)"), true, "暗色 pill 描边 token");
  for (const sel of ["exs-bottom-bar", "exs-zoom-pill"]) {
    const block = CSS.match(new RegExp(`[^}]*${sel}[^{]*\\{[^}]*\\}`));
    assert.ok(block && block[0].includes("var(--exs-pill-border)"), `${sel} 的描边必须用 --exs-pill-border`);
  }
});

test("CSS：质感轮——帽/双 pill 吃 --shadow-island 同款阴影，☰ 缩成帽内灰块（fork 同构）", () => {
  // 阴影 token：值抄 fork theme.scss 的 --shadow-island
  assert.equal(
    CSS.includes("--exs-pill-shadow: 0 0 1px 0 rgba(0, 0, 0, 0.17)"),
    true,
    "亮色阴影 token（--shadow-island 同值）",
  );
  // ☰ 帽双层结构：wrapper 出帽（描边+内衬+阴影），trigger 缩成灰块
  assert.match(
    CSS,
    /\.exs-root \.excalidraw \.App-menu_top__left > div:first-child \{[^}]*padding: 3px;[^}]*border-right: none;[^}]*box-shadow: var\(--exs-pill-shadow\);/,
    "☰ wrapper 出白 pill 左帽（内衬+描边+阴影）",
  );
  const tile = CSS.match(/[^}]*\.exs-root \.excalidraw \.main-menu-trigger \{[^}]*\}/);
  assert.ok(tile && tile[0].includes("var(--exs-pill-tile)"), "☰ trigger 缩成帽内灰块");
  assert.equal(tile[0].includes("border-right: none"), false, "描边归帽管，trigger 不再拼段");
  // 三段 pill 统一 3px 内衬（帽与双 pill 同高：calc(2.25rem + 6px)）
  const bar = CSS.match(/[^}]*\.exs-root \.exs-bottom-bar \{[^}]*\}/);
  const zoom = CSS.match(/[^}]*\.exs-root \.exs-zoom-pill \{[^}]*\}/);
  for (const [name, block] of [["bar", bar], ["zoom", zoom]]) {
    assert.ok(block && block[0].includes("padding: 3px;"), `${name} pill 要有 3px 内衬`);
    assert.ok(block && block[0].includes("height: calc(2.25rem + 6px)"), `${name} pill 高度含内衬`);
  }
});

/* ------------------------------ StudioApp 接线 ------------------------------ */

test("StudioApp：hasSelection + propsOpen 双门控，五键全走合成键盘事件", () => {
  assert.match(APP, /const \[hasSelection, setHasSelection\] = useState\(false\)/, "选中态默认 false");
  assert.match(APP, /const \[propsOpen, setPropsOpen\] = useState\(false\)/, "🎨 开关默认关");
  assert.match(APP, /const \[zoomPercent, setZoomPercent\] = useState\(100\)/, "zoom 百分比默认 100");
  assert.match(APP, /hasSel !== hasSelectionRef\.current/, "选中态翻转才渲染");
  assert.match(APP, /zoomPct !== zoomPercentRef\.current/, "zoom 翻转才渲染");
  // 双根类：exs-selection 门中段、exs-props-open 门面板（= 开关开 且 有选中）
  assert.match(APP, /hasSelection \? "exs-selection" : ""/, "根类拼 exs-selection");
  assert.match(APP, /propsOpen && hasSelection \? "exs-props-open" : ""/, "exs-props-open = 开关开 且 有选中");
  // 结构：dock > bar(中段组 + undo/redo) + zoom pill
  assert.match(APP, /<div className="exs-bottom-dock">/, "dock 容器");
  assert.match(APP, /<div className="exs-bottom-bar">/, "主 pill");
  assert.match(APP, /<div className="exs-sel-group">/, "中段组");
  assert.match(APP, /<div className="exs-zoom-pill">/, "zoom pill");
  assert.match(APP, /aria-pressed=\{propsOpen\}/, "🎨 是 aria-pressed 的真开关");
  assert.match(APP, /onClick=\{\(\) => setPropsOpen\(!propsOpen\)\}/, "🎨 点击翻转开关");
  assert.match(APP, /className=\{propsOpen \? "exs-bar-btn exs-bar-btn--on" : "exs-bar-btn"\}/, "🎨 checked 态走 --on 类");
  // 合成键盘事件通道（keyTest 抄 fork actionCanvas/actionHistory）
  assert.match(APP, /fireVendorAction\("d", "KeyD"\)/, "复制 = ⌘D");
  assert.match(APP, /fireVendorAction\("Delete", "Delete"\)/, "删除 = Delete");
  assert.match(APP, /fireVendorAction\("z", "KeyZ"\)/, "撤销 = ⌘Z");
  assert.match(APP, /fireVendorAction\("z", "KeyZ", \{ shift: true \}\)/, "重做 = ⌘⇧Z");
  assert.match(APP, /fireVendorAction\("=", "Equal"\)/, "放大 = ⌘=");
  assert.match(APP, /fireVendorAction\("-", "Minus"\)/, "缩小 = ⌘−");
  assert.match(APP, /fireVendorAction\("0", "Digit0"\)/, "重置缩放 = ⌘0");
  assert.match(APP, /shiftKey: opts\?\.shift \?\? false/, "合成事件要带 shiftKey");
  assert.match(APP, /document\.dispatchEvent\(/, "事件派发到 document（vendor 监听处）");
  // 图标走线性体系（底栏七枚带 strokeWidth=2，对齐 vendor 的粗描边）
  for (const icon of ["ICON_PALETTE", "ICON_DUPLICATE", "ICON_DELETE", "ICON_UNDO", "ICON_REDO", "ICON_MINUS", "ICON_PLUS"]) {
    assert.match(APP, new RegExp(`<LineIcon[^>]*d=\\{${icon}\\}`), `${icon} 用线性图标体系`);
  }
  assert.match(APP, /strokeWidth=\{2\} d=\{ICON_UNDO\}/, "底栏图标描边加粗到 2（vendor 同款）");
  // 不许在 React 里摸 vendor footer 类名
  assert.equal(APP.includes("App-menu__left"), false, "不许在 React 里摸 vendor 类名");
  assert.equal(APP.includes("undo-redo-buttons"), false, "vendor undo-redo 改装已退役");
});

test("底栏图标：24 网格、绝对坐标，改坏会被卡住", () => {
  for (const [name, d] of Object.entries({ ICON_PALETTE, ICON_DUPLICATE, ICON_DELETE, ICON_UNDO, ICON_REDO, ICON_MINUS, ICON_PLUS })) {
    assert.match(d, /^M/, `${name} 必须以 M 起笔`);
    assert.equal(/[a-z]/.test(d.replace(/M|L|Q|T|A|C|S|Z|H|V/g, "")), false, `${name} 混进了相对命令`);
    for (const n of d.match(/-?\d+(?:\.\d+)?/g) ?? []) {
      const v = Number(n);
      assert.ok(v >= 0 && v <= 24, `${name} 坐标 ${v} 越界（0..24）`);
    }
  }
});

/* ------------------------------ i18n ------------------------------ */

test("底栏文案两份语言包都有，且中文原文即 key", () => {
  const zh = JSON.parse(read("i18n/zh_CN.json"));
  const en = JSON.parse(read("i18n/en_US.json"));
  for (const k of ["样式面板", "复制", "删除", "撤销", "重做", "缩小", "放大", "重置缩放"]) {
    assert.ok(k in zh, `zh_CN 缺键：${k}`);
    assert.ok(k in en, `en_US 缺键：${k}`);
    assert.equal(zh[k], k, `值必须等于键：${k}`);
  }
  assert.equal("收起样式面板" in zh, false, "「收起样式面板」已随 A 批开关退役");
  assert.equal("收起样式面板" in en, false, "en_US 同步退役");
});
