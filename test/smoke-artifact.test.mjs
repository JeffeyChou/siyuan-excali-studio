// 产物体检：思源加载的是插件**根目录**的 index.js / index.css，不是 dist/。
// 这一组断言把三条已知踩坑点钉住：
//   ① 只跑 `npx vite build` 忘了 copy-dist ⇒ 改动进不了运行时；
//   ② cjs 单文件里残留 `import.meta` 或相对路径动态 import ⇒ 经典脚本直接语法错误；
//   ③ vite 把 Excalidraw 样式里的 url(./fonts/**) 改写并 hash ⇒ 根样式指不到插件根 fonts/。
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const JS = resolve(ROOT, "index.js");
const ENGINE = resolve(ROOT, "engine.js");
const KERNEL = resolve(ROOT, "kernel.js");
const CSS = resolve(ROOT, "index.css");
const VENDOR = resolve(ROOT, "node_modules/@excalidraw/excalidraw/dist/prod");

/** 主包 + 引擎拼一起的产物全文（第二十六轮 T3 起 vendor 内容在 engine.js，功能内容断言用） */
function jsAll() {
  return readFileSync(JS, "utf8") + "\n" + readFileSync(ENGINE, "utf8");
}

test("产物存在且与 dist 逐字节一致（copy-dist 真的跑过）", () => {
  for (const p of [
    JS,
    ENGINE,
    KERNEL,
    CSS,
    resolve(ROOT, "dist/index.js"),
    resolve(ROOT, "dist/style.css"),
    resolve(ROOT, "dist-engine/engine.js"),
    resolve(ROOT, "dist-kernel/kernel.js"),
  ]) {
    assert.ok(existsSync(p), `缺 ${p}：跑 npm run build（含 copy-dist）`);
  }
  const same = readFileSync(JS).equals(readFileSync(resolve(ROOT, "dist/index.js")));
  assert.ok(same, "根 index.js 与 dist/index.js 不一致：改动没进运行时，需重跑 npm run build");
  const engineSame = readFileSync(ENGINE).equals(readFileSync(resolve(ROOT, "dist-engine/engine.js")));
  assert.ok(engineSame, "根 engine.js 与 dist-engine/engine.js 不一致：改动没进运行时，需重跑 npm run build");
  const kernelSame = readFileSync(KERNEL).equals(readFileSync(resolve(ROOT, "dist-kernel/kernel.js")));
  assert.ok(kernelSame, "根 kernel.js 与 dist-kernel/kernel.js 不一致：改动没进运行时，需重跑 npm run build");
});

test("三个产物里都没有 import.meta（cjs 经典脚本会语法错误）", () => {
  assert.equal(readFileSync(JS, "utf8").includes("import.meta"), false);
  assert.equal(readFileSync(ENGINE, "utf8").includes("import.meta"), false);
  assert.equal(readFileSync(KERNEL, "utf8").includes("import.meta"), false);
});

test("两个产物里都没有残留的动态 import（locales/subset/chunk 都被 inlineDynamicImports 吃掉）", () => {
  // 主包与引擎各自单文件构建；vendor 的 locale/mermaid 等动态导入必须被内联进 engine.js，
  // 不能在运行时取相对 chunk（思源的加载环境拿不到）。
  for (const [name, code] of [
    ["index.js", readFileSync(JS, "utf8")],
    ["engine.js", readFileSync(ENGINE, "utf8")],
    ["kernel.js", readFileSync(KERNEL, "utf8")],
  ]) {
    // 不能直接搜 "import("：React lazy() 的报错文案里就写着 import('./MyComponent')，会误报。
    // 只盯真正会漏的 vendor chunk 前缀。
    const leftovers = [
      /import\(\s*["'`]\.\/locales/,
      /import\(\s*["'`]\.\/subset-/,
      /import\(\s*["'`]\.\/chunk-/,
      /import\(\s*["'`]\.\/data\//,
    ].filter((re) => re.test(code));
    assert.deepEqual(leftovers, [], `${name} 还有运行时取不到的 vendor chunk import`);
  }
  const engine = readFileSync(ENGINE, "utf8");
  assert.ok(engine.includes('"./locales/zh-CN.json"'), "语言映射表被整体摇掉了：inlineDynamicImports 可能没生效");
  assert.ok(engine.includes("打开白板") || engine.includes("画布与形状属性"), "zh-CN 语言包没内联进引擎产物（界面会退回英文）");
});

test("产物分工：主包带壳（字体基址/落盘/存档层），引擎带画布（scene 标记/脏点）", () => {
  const main = readFileSync(JS, "utf8");
  assert.ok(main.includes("EXCALIDRAW_ASSET_PATH"), "字体基址赋值被 tree-shake 掉了");
  assert.ok(main.includes("siyuan-excali-studio"), "插件目录名不在主包里，拼出的基址会指错位置");
  assert.ok(main.includes("/api/file/putFile"), "落盘调用没进主包");
  assert.ok(main.includes("custom-excali-svg"), "存档层（建档/绑定/SQL）没进主包");
  assert.ok(main.includes("/api/block/appendBlock"), "建档插图调用没进主包");
  assert.ok(main.includes("已建档《"), "建档成功提示的文案没进主包");
  const engine = readFileSync(ENGINE, "utf8");
  assert.ok(engine.includes("svg-source:excalidraw"), "scene 标记校验不在引擎产物里");
  assert.ok(engine.includes("exs-tab-dirty"), "页签脏点的类名不在引擎产物里");
});

test("根 index.js 带上第二十四/二十五轮白板库修复（SQL 无 b.refs + 专属目录 + 迁移）", () => {
  const code = readFileSync(JS, "utf8");
  // b.refs 是本回归的元凶：当前内核 blocks 表没有这列，SQL 带上它整条查询就炸，库永不刷新
  assert.equal(code.includes("b.refs"), false, "产物 SQL 还带着不存在的 b.refs 列——白板消失 bug 原样复发");
  assert.ok(code.includes("a.name = 'custom-excali-svg'"), "绑定查询没进产物");
  assert.ok(code.includes("assets/excali"), "专属目录默认值没进产物（新建仍会落回公共 assets）");
  assert.ok(code.includes("已把 {n} 块白板迁入 {dir}"), "旧白板迁移的入口/提示没进产物（存量板会留在 assets 里隐身）");
  assert.ok(code.includes("/api/block/getBlockKramdown"), "迁移/改名后改正文图片引用的通道没进产物（建档文档会断图）");
  assert.ok(code.includes("白板文档查询失败"), "SQL 分段容错的告警文案没进产物（失败会吞整库的旧结构复发？）");
});

test("根 index.js 带上了 zh-CN 汉化补丁（快捷键列表/右键菜单不再回落英文）", () => {
  const code = jsAll();
  // 每类 UI 抽查一条。这些中文句子不可能是别的语言包里误入的，命中即补丁生效。
  const spots = [
    "从通用元素创建流程图", // 快捷键列表（helpDialog 原地补键）
    "切换网格", // 画布右键菜单（labels 原地补键；en 已改名 toggleGrid）
    "画布与形状属性", // 画布右键菜单（stats 原地补键）
    "将选区包裹进画框", // 元素右键菜单（labels 原地补键）
    "复制对象链接", // 元素右键菜单（labels 原地补键）
    "在画布上查找", // 画布搜索（search：zh 整组缺席，靠改写 export 新增导出）
    "命令面板", // 命令面板（commandPalette：同上）
  ];
  const missing = spots.filter((s) => !code.includes(s));
  assert.deepEqual(
    missing,
    [],
    "汉化补丁没进产物：检查 scripts/build.mjs 的 excalidrawZhCnPatch 插件与 npm run build（两趟构建都要过补丁）",
  );
});

test("根 index.js 带上了引导画面（纸飞机路径 + 文案 + 设置项）", () => {
  const code = jsAll();
  // 路径常量与文案都是写死的字面量：命中即 StudioWelcome 整棵进了产物、没被 tree-shake。
  assert.ok(code.includes("168,52Q150,73.3"), "纸飞机机身路径常量没进产物（引导画面会是一只空白 Logo）");
  assert.ok(code.includes("79,125 63,124"), "虚线尾迹圈没进产物");
  assert.ok(code.includes("画几笔，文件自动跟着存"), "上手提示文案没进产物（第二十一轮改为自动保存口径）");
  assert.ok(code.includes("空画板显示引导画面"), "设置项没进产物");
  assert.ok(code.includes("Ctrl+Alt+E"), "boardHotkey 没进产物（菜单行的快捷键提示会缺）");
});

test("根 index.js 带上了 ☰ 主菜单（自绘项文案 + 图标路径）", () => {
  const code = jsAll();
  // 注意：别拿 json-export-button 判劫持是否还在——那是 vendor 自己的 Export 组件里的字符串，
  // 内联进产物就抹不掉。源码侧的断言在 menu.test.mjs / smoke-wiring.test.mjs。
  // 菜单项文案与图标路径都是写死的字面量：命中即 StudioMenu 整棵进了产物、没被 tree-shake。
  for (const s of ["导出图片…", "重命名", "Excalidraw 链接", "缩放适应", "帮助", "L15.5,20.5A1,1"]) {
    assert.ok(code.includes(s), `没进产物：${s}`);
  }
  // 第七轮改名：「适应视图」→「缩放适应」，旧文案再出现说明产物是旧的
  assert.equal(
    code.includes("适应视图"),
    false,
    "产物里还有旧菜单文案「适应视图」：跑 npm run build（含 copy-dist），别只跑 vite build",
  );
  // 第二十/二十一轮删掉的功能的入口文案不该还在产物里
  assert.equal(code.includes("保存到文档…"), false, "「保存到文档…」已删，产物里还有说明构建没重跑");
  assert.equal(code.includes("插入文档卡…"), false, "「插入文档卡…」已删，产物里还有说明构建没重跑");
  assert.equal(code.includes("保存副本…"), false, "「保存副本…」已删（第二十一轮），产物里还有说明构建没重跑");
  assert.equal(code.includes("M4,14L4,18.5"), false, "「保存」图标路径（ICON_SAVE）已删，产物里还有说明构建没重跑");
});

test("根 index.js 带上了网格全局记忆（设置项 + 覆盖 + 回写）", () => {
  const code = readFileSync(JS, "utf8");
  // 设置项文案与 appState 覆盖都是写死的字面量：命中即整条链路进了产物、没被 tree-shake。
  for (const s of ["默认显示网格", "gridModeEnabled"]) {
    assert.ok(code.includes(s), `没进产物：${s}`);
  }
});

test("根 index.css 里没有右上角工具条残留（第六轮把动作挪进了 ☰ 菜单）", () => {
  const css = readFileSync(CSS, "utf8");
  for (const gone of ["exs-topright", "exs-tr-btn"]) {
    assert.equal(css.includes(gone), false, `${gone} 已经不再渲染，样式还留在产物里`);
  }
});

test("根 index.css 里没有右下角 FAB 残留（第十一轮删掉，它会压住 vendor 的帮助「?」）", () => {
  const css = readFileSync(CSS, "utf8");
  for (const gone of ["exs-fab-wrap", "exs-fab-menu", "exs-fab-mask"]) {
    assert.equal(css.includes(gone), false, `${gone} 对应的组件已删，样式还留在产物里`);
  }
  // 但 .exs-root 的定位上下文要留着：导出遮罩靠它铺满画板
  assert.match(css, /\.exs-root\s*\{[^}]*position:\s*relative/, "exs-root 丢了 position:relative，导出遮罩会盖不住画板");
});

test("根 index.js / index.css 带上第十二轮手感修复 + 第二十一轮文件先行（未命名白板 / 新建建档）", () => {
  const code = readFileSync(JS, "utf8");
  // 文案都是写死的字面量（函数名会被压缩器重命名，不查函数名）：命中即整条链路进了产物
  for (const s of [
    "未命名白板", // openNew 默认名 + 页签标题兜底
    "新建时自动建档", // 设置项（第二十一轮从「首次保存时」改名）
    "创建白板失败：{msg}", // 新建链路失败提示
  ]) {
    assert.ok(code.includes(s), `没进产物：${s}`);
  }
  // 旧口径「切换页签时自动保存」「60 秒自动保存设置项」不该再出现在任何文案里
  assert.equal(code.includes("切换页签时自动保存"), false, "旧的自动保存口径还留在产物文案里");
  assert.equal(code.includes("每 60 秒、窗口失焦"), false, "自动保存设置项描述已删（第二十一轮：防抖成为唯一形态），产物里还有说明构建没重跑");
});

test("根 index.js / index.css 带上第十三轮入口增强（选择器搜索 / 清空最近）", () => {
  const code = readFileSync(JS, "utf8");
  const css = readFileSync(CSS, "utf8");
  // 全是写死的字面量（函数名会被压缩器重命名，不查函数名）：命中即整条链路进了产物
  for (const s of ["搜索文件名…", "已打开", "没有匹配的白板", "清空最近记录"]) {
    assert.ok(code.includes(s), `没进产物：${s}`);
  }
  assert.match(css, /\.exs-picker__badge/, "「已打开」角标样式没进产物");
  // 旧的自拼列表样式要随重写一起消失
  assert.equal(css.includes("exs-board-item"), false, "旧的 .exs-board-item 样式残留（重写后没人用了）");
  // 第二十一轮删除的保存文案不许在产物里复活
  for (const gone of ["已保存副本 {name}", "画板为空，先画几笔再保存"]) {
    assert.equal(code.includes(gone), false, `已删文案还在产物里：${gone}`);
  }
});

test("根 index.js 带上第十五轮的脏指纹（属性名没被压缩，可作判据）", () => {
  const code = jsAll();
  // 同第十四轮的口径：函数名与局部变量会被重命名，对象属性名不会。SceneStampParts 的
  // elementsHash 是我们自己造的键，vendor 没有这个名字，命中即 scene-dirty + StudioApp 接线都进了产物。
  assert.ok(code.includes("elementsHash"), "场景指纹层没进产物：StudioApp 改动没走 npm run build");
  assert.match(code, /\.elementsHash\b/, "指纹部件建不出来");
});

test("根 index.css 拼上了 Excalidraw 样式，且字体仍按相对路径指向插件根 fonts/", () => {
  const css = readFileSync(CSS, "utf8");
  assert.ok(css.includes(".excalidraw{"), "缺少 Excalidraw 样式：页签里的画板会没有布局");
  assert.ok(css.includes('url("./fonts/Assistant/'), "字体 url 被改写/hash 了，根样式指不到插件根 fonts/");
  assert.equal(/url\(["']?\.?\/?assets\/[^)"']*woff2/i.test(css), false, "样式指向了 vite hash 出来的 assets/，思源不会加载它");
  assert.equal(css.includes("@import"), false, "@import 在思源的主题样式之后加载，会盖不住");
});

test("根 index.css 有线性图标反制 + 页签面板样式（缺了图标变实心黑 / 画布塌成 0 高）", () => {
  const css = readFileSync(CSS, "utf8");
  // 思源 base.css 的全局 `svg{fill:currentColor}` 会把 Excalidraw 图标的 fill="none"
  // 呈现属性压掉；压缩器可能把 [fill="none"] 压成 [fill=none]，两种都要认。
  assert.match(css, /\.exs-root svg\[fill="?none"?\]\s*\{\s*fill:\s*none/, "缺反制规则：工具栏图标会变实心黑");
  assert.match(css, /\.exs-panel\s*\{[^}]*flex-direction:\s*column/, "页签面板缺纵向 flex：画布高度链会断");
  assert.match(css, /\.exs-loading/, "缺加载占位样式（读盘期间页签里是一片空白）");
  assert.match(css, /\.exs-tab-dirty::?after/, "缺页签脏点样式：有未保存改动时页签上看不出来（压缩器会把 ::after 压成 :after，两种都认）");
  assert.match(css, /\.exs-picker/, "缺「打开白板…」选择器样式（列表会没有滚动区）");
});

test("根 index.css 带上引导画面样式（缺了飞机不居中、窄页签会溢出、矮窗口会挤爆画面）", () => {
  const css = readFileSync(CSS, "utf8");
  assert.match(
    css,
    /\.exs-root \.welcome-screen-center__logo\s*\{\s*width:\s*min\(320px,\s*26vh\)/,
    "纸飞机尺寸没进产物：画面里它还是那只小图标",
  );
  assert.match(
    css,
    /\.exs-root \.exs-welcome__spacer\s*\{\s*flex:\s*0 0 15%;\s*min-height:\s*0/,
    "顶部百分比留白没进产物：飞机又会回到画布正中（真机反馈太低）",
  );
  assert.match(
    css,
    /\.exs-root \.welcome-screen-menu-item\s*\{\s*min-width:\s*min\(300px,\s*100%\)/,
    "菜单行的 min-width 兜底没进产物：分屏压窄会横向溢出",
  );
  assert.match(css, /\.excalidraw--mobile \.exs-welcome__tips\s*\{\s*display:\s*none/, "移动端收起提示行的规则没进产物");
  assert.match(css, /@media\s*\(max-height:\s*760px\)\s*\{\.exs-welcome__tips\s*\{\s*display:\s*none/, "矮窗口的提示行让位规则没进产物");
});

test("根 index.css 里没有第二十轮删掉的 dock 画布区 / 页脚 / 色板样式", () => {
  const css = readFileSync(CSS, "utf8");
  for (const gone of [
    "exs-dock__canvas",
    "exs-dock__swatch",
    "exs-dock__colors",
    "exs-dock__actions",
    "exs-dock__foot",
    "exs-dock__status",
    "exs-dock__file",
    "exs-dock__btn--primary",
  ]) {
    assert.equal(css.includes(gone), false, `${gone} 已随 dock 纯库化删除，样式还留在产物里`);
  }
  assert.match(css, /\.exs-dock__liblist/, "白板库列表样式没进产物");
  // 选择器样式是 board-picker 的（「打开白板…」），不随选文档框一起删
  assert.match(css, /\.exs-picker__list/, "「打开白板…」选择器列表样式没进产物");
});

test("根 index.js / index.css 带上第二十二轮 dock 原生复刻（block__icons + b3-list）", () => {
  const code = readFileSync(JS, "utf8");
  const css = readFileSync(CSS, "utf8");
  // 全是写死的字面量（模板串里的类名/动作名不进运行时变量）：命中即原生结构进了产物
  for (const s of ["block__icons", "block__logo", "block__icon--show", "b3-list--background", "b3-list-item--narrow", "b3-list-item--hide-action", 'data-act="row-rename"', 'data-act="row-delete"']) {
    assert.ok(code.includes(s), `没进产物：${s}`);
  }
  assert.match(css, /\.exs-dock__count/, "头部数量灰字样式没进产物");
  assert.match(css, /\.exs-lib__badge/, "行内徽标样式没进产物");
  assert.match(css, /\.exs-lib__meta/, "行右侧 meta 样式没进产物");
  // 第二十三轮：dock 行排版复刻 kmind-zen（缩进圆角行 + 标题按钮字体继承）
  assert.match(css, /\.exs-lib__item\.b3-list-item\s*\{[^}]*margin:\s*1px 6px/, "行缩进圆角参数没进产物（文字又会贴左缘）");
  assert.match(css, /\.exs-lib__text\.b3-list-item__text\s*\{[^}]*font:\s*inherit/, "行标题按钮的字体重置没进产物（列表字还是按钮 UA 字）");
  // 搜索框与旧自绘部件（第二十二轮按用户拍板删除）不许在产物里复活
  for (const gone of ["exs-dock__libhead", "exs-dock__search", "exs-lib__title", "exs-lib__name"]) {
    assert.equal(css.includes(gone), false, `${gone} 已随原生复刻删除，样式还留在产物里`);
    assert.equal(code.includes(gone), false, `${gone} 已随原生复刻删除，脚本里还有`);
  }
  assert.equal(code.includes("搜索白板"), false, "搜索框占位文案已删（i18n 键也删了），产物里还有");
});

test("插件根 fonts/ 覆盖手绘字体与中文字体", () => {
  const dir = resolve(ROOT, "fonts");
  assert.ok(existsSync(dir), "缺 fonts/：copy-dist 没拷 @excalidraw/excalidraw 的 dist/prod/fonts");
  const families = readdirSync(dir);
  for (const need of ["Assistant", "Excalifont", "Xiaolai", "Cascadia", "Nunito", "Lilita", "Virgil"]) {
    assert.ok(families.includes(need), `缺字体家族 ${need}（离线状态会回落 esm.sh）`);
  }
});

test("集市图标 icon.png 在插件根且是 160×160 PNG", () => {
  const p = resolve(ROOT, "icon.png");
  assert.ok(existsSync(p), "缺 icon.png：集市列表与插件卡片用它");
  const buf = readFileSync(p);
  assert.equal(buf.subarray(1, 4).toString("latin1"), "PNG", "不是 PNG（脚本/编辑器可能改了文件）");
  const w = buf.readUInt32BE(16);
  const h = buf.readUInt32BE(20);
  assert.equal(`${w}x${h}`, "160x160", `集市口径为 160×160，实际 ${w}×${h}`);
});

test("Excalidraw 样式里引用的每个字体文件都真的存在", () => {
  const css = readFileSync(CSS, "utf8");
  const refs = [...css.matchAll(/url\("\.\/(fonts\/[^"]+)"\)/g)].map((m) => m[1]);
  assert.ok(refs.length >= 4, `只抓到 ${refs.length} 条样式字体引用，正则或样式结构变了`);
  const missing = [...new Set(refs)].filter((r) => !existsSync(resolve(ROOT, r)));
  assert.deepEqual(missing, [], "样式引用了但插件根没有的字体");
});

test("Excalidraw 运行时引用的每个字体文件也都在插件根（样式只覆盖 Assistant，其余靠 JS）", () => {
  // 文件名带 content hash，随包版本变，所以不写死名单，改从 vendor 产物里把引用抓全再逐个核对。
  const refs = new Set();
  for (const f of readdirSync(VENDOR).filter((x) => x.endsWith(".js"))) {
    const s = readFileSync(resolve(VENDOR, f), "utf8");
    for (const m of s.matchAll(/"\.\/(fonts\/[^"]+\.woff2)"/g)) refs.add(m[1]);
  }
  assert.ok(refs.size >= 20, `只抓到 ${refs.size} 条运行时字体引用，抓法失效了`);
  const missing = [...refs].filter((r) => !existsSync(resolve(ROOT, r))).sort().slice(0, 5);
  assert.deepEqual(missing, [], "这些字体不在插件根 fonts/ ⇒ 离线时回落 esm.sh，手绘字会丢");
});

test("根 index.js / index.css 带上第十九轮 BAK 纪律 + 恢复入口（备份链文案 / 恢复按钮 / 避让提示）", () => {
  const code = jsAll();
  const css = readFileSync(CSS, "utf8");
  for (const s of [
    "滚进备份链",
    ".bak2、.bak3，最多三份",
    "从备份恢复",
    "没有找到可用的备份",
    "已从备份恢复",
    "自动保存失败：",
  ]) {
    assert.ok(code.includes(s), `没进产物：${s}`);
  }
  assert.match(css, /\.exs-loaderror__act/, "恢复按钮的排版样式没进产物");
  // 旧的单份口径文案不该再出现在产物里
  assert.equal(code.includes("只保留最新一份"), false, "单份备份的旧口径还留在产物文案里");
});

test("内核产物：四个能力、注册接口、设置读取与 plugin.json kernels 声明", () => {
  const code = readFileSync(KERNEL, "utf8");
  for (const name of [
    "excali_file_list_boards",
    "excali_file_read_board",
    "excali_file_draw_board",
    "excali_file_generate_image",
  ]) {
    assert.ok(code.includes(name), `内核产物缺能力：${name}`);
  }
  assert.ok(code.includes("registerCapability"), "agent.registerCapability 没进内核产物（能力进不了共享工具表）");
  assert.ok(code.includes("registerTool"), "旧内核回退（mcp.registerTool）没进产物");
  assert.ok(code.includes("/api/file/putFile"), "内核落盘调用没进产物");
  assert.ok(code.includes("/api/network/forwardProxy"), "内核 forwardProxy 没进产物（生图/外部 API 会失效）");
  assert.ok(code.includes("excali-studio"), "设置槽位名不在内核产物里（读不到保存目录与 API 配置）");
  assert.equal(code.includes("require("), false, "goja 里没有 require：内核必须是自包含单文件");
  assert.equal(code.includes("import.meta"), false);
  const manifest = JSON.parse(readFileSync(resolve(ROOT, "plugin.json"), "utf8"));
  assert.deepEqual(manifest.kernels, ["all"], "plugin.json 没声明 kernels，思源不会加载 kernel.js");
});
