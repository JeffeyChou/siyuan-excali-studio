// 第七轮·网格记忆（2026-10-16）。
// 背景：网格状态其实**已经进文件**了——vendor 内嵌 scene 的 appState 只留 4 个键
// （gridSize / gridStep / gridModeEnabled / viewBackgroundColor），实测 32 张真图都带。
// 但空白板根本存不下来（saveFlow 有空板拦截），所以「退出再进来网格没了」只能靠
// 插件级的全局记忆来治。口径：网格是**视图偏好**，打开时覆盖文件里的值。
//
// 三条最容易被后来者改坏的不变量：
//   ① 两个分支（新建 / 打开文件）都要带 gridModeEnabled，漏一个就又开始「打开就丢」；
//   ② 回写只在真的翻转时发生——onChange 是拖拽每帧的高频回调，无条件回写等于每帧一次 saveData；
//   ③ 记忆值用 getter 读设置（与 accent/showWelcome 同风格），不做成挂载时快照的常量。
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { DEFAULT_SETTINGS, normalizeSettings } from "../src/studio/settings.ts";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function read(rel) {
  return readFileSync(resolve(ROOT, rel), "utf8");
}
function src(rel) {
  return read("src/" + rel);
}
function stripComments(code) {
  return code.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'\\])\/\/[^\n]*/g, "$1");
}

const SETTINGS = stripComments(src("studio/settings.ts"));
const APP = stripComments(src("studio/StudioApp.tsx"));
const TAB = stripComments(src("studio/tab.tsx"));
const INDEX = stripComments(src("index.ts"));

/* ------------------------------ 数据层：设置 ------------------------------ */

test("gridModeEnabled：默认关（不悄悄改变视觉基线），开一次就被记住", () => {
  assert.equal(DEFAULT_SETTINGS.gridModeEnabled, false, "默认应与 Excalidraw 自己的默认一致");
  assert.match(SETTINGS, /gridModeEnabled:\s*boolean/, "接口里要有这一项");
});

test("归一：只认布尔，脏值回落默认", () => {
  assert.equal(normalizeSettings({ gridModeEnabled: true }).gridModeEnabled, true);
  assert.equal(normalizeSettings({ gridModeEnabled: false }).gridModeEnabled, false);
  // 老配置没这一项 / 存成字符串或数字 ⇒ 都不能把 undefined 漏进运行时
  assert.equal(normalizeSettings({}).gridModeEnabled, false);
  assert.equal(normalizeSettings({ gridModeEnabled: "true" }).gridModeEnabled, false);
  assert.equal(normalizeSettings({ gridModeEnabled: 1 }).gridModeEnabled, false);
  assert.equal(normalizeSettings(null).gridModeEnabled, false);
});

/* ------------------------------ 接线契约 ------------------------------ */

test("initialData：新建与打开两个分支都必须带上记忆值", () => {
  assert.match(APP, /const grid = \{ gridModeEnabled \};/, "记忆值要先收成 appState 里的一项");
  // 空板分支（!initial）——正是「空白板存不下来」那条路径
  assert.match(APP, /if \(!initial\) return \{ appState: \{ \.\.\.stroke, \.\.\.grid \} \}/, "空板分支漏掉 grid 就等于没做这个功能");
  // 有文件分支：grid 必须在 ...initial.appState **之后**，否则文件的值赢过记忆值
  assert.match(APP, /appState: \{ \.\.\.initial\.appState,.*\.\.\.grid, viewBackgroundColor: bg \}/, "记忆值必须覆盖文件里的网格（T4 的背景槽位在 grid 之后覆盖背景）");
  assert.match(APP, /\[initial, accent, gridModeEnabled, mode\]/, "useMemo 依赖漏 gridModeEnabled/mode，改设置或切主题后开的新页签会拿旧值");
});

/* ---------------- 第二十六轮 T4：双主题背景槽位（读写两侧） ---------------- */

test("T4：打开按主题挑槽位背景，落盘补当前主题槽位", () => {
  // 打开侧：initialData 里先读槽位、再按 mode 挑背景
  assert.match(APP, /readThemeBgSlots\(rawState\)/, "打开时读载荷里的双主题槽位");
  assert.match(APP, /themeBgForMode\(slots, mode, rawState\.viewBackgroundColor as string \| undefined\)/, "槽位有值用槽位，没存过的主题回落 viewBackgroundColor");
  // 落盘侧：flush 的场景补当前主题槽位（另一主题的槽位原样保留）
  assert.match(APP, /withThemeBgSlot\(\s*scene\.appState as unknown as Record<string, unknown>,\s*modeRef\.current,\s*bgSlotsRef\.current,\s*\)/, "落盘的 appState 先补当前主题背景槽位（另一主题槽位从 bgSlotsRef 带过去）");
  // 切主题时画布背景换到另一槽位（槽位为空 = 保持现状）
  assert.match(APP, /const slot = mode === "dark" \? bgSlotsRef\.current\.dark : bgSlotsRef\.current\.light;/, "明暗切换走槽位换背景");
});

test("onChange 回写：只在网格真的翻转时发生", () => {
  assert.match(APP, /const gridRef = useRef\(gridModeEnabled\)/, "要用 ref 记住上次看到的值");
  assert.match(APP, /if \(grid !== gridRef\.current\)/, "无条件回写 = 拖拽每帧一次 saveData");
  assert.match(APP, /gridRef\.current = grid;\s*onGridChange\(grid\);/, "翻转后先记再写，避免同值重入");
  assert.match(APP, /const grid = !!appState\.gridModeEnabled/, "缺省值要归成布尔，别把 undefined 写进设置");
  // onChange 的第二形参就是 appState（vendor 签名 (elements, appState, files)）
  assert.match(APP, /onChange=\{handleChange\}/, "回写必须挂在画布的 onChange 上");
});

test("tab.tsx：两项通道都进 Pick 并透传", () => {
  assert.match(TAB, /"gridModeEnabled"[\s\S]*?"onGridChange"/, "StudioTabHost 的 Pick 必须包含网格两项");
  assert.match(TAB, /gridModeEnabled=\{host\.gridModeEnabled\}/);
  assert.match(TAB, /onGridChange=\{host\.onGridChange\}/);
});

test("index.ts：getter 读设置，回写同值早退", () => {
  assert.match(INDEX, /get gridModeEnabled\(\)\s*\{\s*return plugin\.settings\.gridModeEnabled;/, "与 accent 同风格，用 getter 读");
  assert.match(INDEX, /onGridChange: \(enabled\) => this\.rememberGrid\(enabled\)/, "回写口收在宿主，React 树里不许出现思源 API");
  assert.match(INDEX, /if \(this\.settings\.gridModeEnabled === enabled\) return;/, "同值直接返回，别刷 saveData");
  assert.match(INDEX, /private rememberGrid\(enabled: boolean\): void/, "回写要自己的私有方法");
  assert.match(INDEX, /this\.settings = \{ \.\.\.this\.settings, gridModeEnabled: enabled \};\s*this\.persist\(\);/, "改完立即落盘");
});

test("设置页有「默认显示网格」这一行，且确认按钮也收口一次", () => {
  assert.match(INDEX, /title: t\("默认显示网格"\)/, "设置页要有这一行");
  assert.match(INDEX, /let gridEl: HTMLInputElement \| null = null;/, "createActionElement 的节点要用闭包变量接住");
  assert.match(INDEX, /gridEl = el;/);
  assert.match(INDEX, /gridModeEnabled: gridEl\?\.checked \?\? this\.settings\.gridModeEnabled/, "confirmCallback 漏收会在点保存时把记忆值冲掉");
});

test("两份语言包都有网格设置行的文案，中文原文即 key", () => {
  const zh = JSON.parse(read("i18n/zh_CN.json"));
  const en = JSON.parse(read("i18n/en_US.json"));
  const used = [...INDEX.matchAll(/\bt\(\s*"([^"]+)"/g)].map((m) => m[1]);
  const keys = ["默认显示网格"].concat(
    // 描述整句（含中文逗号与括号）必须原样进两份包，否则切英文会露出中文 key
    INDEX.match(/t\(\s*\n?\s*"(在任意白板里切换网格[^"]+)"/)?.slice(1) ?? [],
  );
  assert.equal(keys.length, 2, "应抓到标题 + 描述两条");
  for (const k of keys) {
    assert.ok(used.includes(k), `index.ts 里没引用到：${k}`);
    assert.ok(k in zh, `zh_CN 缺键：${k}`);
    assert.ok(k in en, `en_US 缺键：${k}`);
    assert.equal(zh[k], k, "中文原文即 key");
  }
});

test("第三十四轮·pinnedScripts：脏数据归一（侧边栏固定清单只收非空字符串）", () => {
  assert.deepEqual(normalizeSettings({}).pinnedScripts, []);
  assert.deepEqual(normalizeSettings(null).pinnedScripts, []);
  assert.deepEqual(normalizeSettings({ pinnedScripts: ["a.md", "b.md"] }).pinnedScripts, ["a.md", "b.md"]);
  assert.deepEqual(normalizeSettings({ pinnedScripts: ["a.md", 1, null, "", "b.md"] }).pinnedScripts, ["a.md", "b.md"]);
  assert.deepEqual(normalizeSettings({ pinnedScripts: "a.md" }).pinnedScripts, [], "字符串不是数组，整份丢弃");
  assert.deepEqual(normalizeSettings({ pinnedScripts: [] }).pinnedScripts, []);
});

test("第四十一轮·pinnedActions：默认钉住白板卡片，取消固定不许被默认值回填", () => {
  assert.deepEqual(normalizeSettings({}).pinnedActions, ["insert-board-card"], "老设置没这个键 → 补默认（撤了 ☰ 入口后必须保证找得到）");
  assert.deepEqual(normalizeSettings(null).pinnedActions, ["insert-board-card"]);
  assert.deepEqual(normalizeSettings({ pinnedActions: [] }).pinnedActions, [], "显式取消固定落成空数组，原样保留");
  assert.deepEqual(normalizeSettings({ pinnedActions: ["insert-board-card"] }).pinnedActions, ["insert-board-card"]);
  assert.deepEqual(normalizeSettings({ pinnedActions: ["insert-board-card", "insert-board-card"] }).pinnedActions, ["insert-board-card"], "重复 id 去重");
  assert.deepEqual(normalizeSettings({ pinnedActions: ["删除脚本", 1, null, ""] }).pinnedActions, [], "未知 id / 脏值全丢，只剩认识的");
  assert.deepEqual(normalizeSettings({ pinnedActions: "insert-board-card" }).pinnedActions, ["insert-board-card"], "字符串不是数组，回落默认");
  assert.deepEqual(DEFAULT_SETTINGS.pinnedActions, ["insert-board-card"]);
});

test("第三十四轮·scriptRailCollapsed：脏数据归一（视图偏好；第三十五轮删图钉，仅手动收起）", () => {
  assert.equal(normalizeSettings(null).scriptRailCollapsed, false);
  assert.equal(normalizeSettings({ scriptRailCollapsed: true }).scriptRailCollapsed, true);
  assert.equal(normalizeSettings({ scriptRailCollapsed: 1 }).scriptRailCollapsed, false);
  // 删除的键不再回归设置面（旧存档里的 scriptRailPinned 被白名单丢弃）
  assert.ok(!("scriptRailPinned" in normalizeSettings({ scriptRailPinned: false })));
});

test("第三十四轮·scriptRailTop：脏数据归一（拖拽位置按画布高度百分比记忆）", () => {
  assert.equal(normalizeSettings({}).scriptRailTop, 0.09);
  assert.equal(normalizeSettings({ scriptRailTop: 0.4 }).scriptRailTop, 0.4);
  assert.equal(normalizeSettings({ scriptRailTop: -1 }).scriptRailTop, 0.09);
  assert.equal(normalizeSettings({ scriptRailTop: 2 }).scriptRailTop, 0.09);
  assert.equal(normalizeSettings({ scriptRailTop: "0.4" }).scriptRailTop, 0.09);
  assert.equal(normalizeSettings({ scriptRailTop: NaN }).scriptRailTop, 0.09);
});

test("P2·scriptSettings：脏数据归一（分桶结构校验 + 限量 + 三元组过滤）", () => {
  assert.deepEqual(normalizeSettings({}).scriptSettings, {});
  assert.deepEqual(normalizeSettings(null).scriptSettings, {});
  assert.deepEqual(normalizeSettings({ scriptSettings: "x" }).scriptSettings, {}, "非对象整份丢弃");
  assert.deepEqual(
    normalizeSettings({ scriptSettings: { "text-numbering.md": { format: "3" }, bad: null, other: { x: 1 } } }).scriptSettings,
    { "text-numbering.md": { format: "3" }, other: { x: 1 } },
    "桶非对象跳过",
  );
  const messy = normalizeSettings({
    scriptSettings: { "a.md": { s: "1", n: 2, b: true, bad: {}, arr: [1], u: undefined } },
  }).scriptSettings;
  assert.deepEqual(messy["a.md"], { s: "1", n: 2, b: true }, "只留 string/number/boolean 三元组");
  const many = {};
  for (let i = 0; i < 60; i++) many["s" + i + ".md"] = { k: i };
  assert.equal(Object.keys(normalizeSettings({ scriptSettings: many }).scriptSettings).length, 50, "桶上限 50");
  const deep = { "a.md": {} };
  for (let i = 0; i < 30; i++) deep["a.md"]["k" + i] = i;
  assert.equal(Object.keys(normalizeSettings({ scriptSettings: deep }).scriptSettings["a.md"]).length, 20, "单桶键上限 20");
});

test("P2v4·builtinSnapshot：脏数据归一（文件名 → 数字哈希）", () => {
  assert.deepEqual(normalizeSettings({}).builtinSnapshot, {});
  assert.deepEqual(normalizeSettings(null).builtinSnapshot, {});
  assert.deepEqual(normalizeSettings({ builtinSnapshot: "x" }).builtinSnapshot, {}, "非对象整份丢弃");
  assert.deepEqual(
    normalizeSettings({
      builtinSnapshot: { "text-numbering.md": 123, bad: null, "": 5, s: "1", nan: Number.NaN, inf: Infinity },
    }).builtinSnapshot,
    { "text-numbering.md": 123 },
    "只留非空文件名 + 有限数字（NaN/Infinity/非数字都丢）",
  );
  const many = {};
  for (let i = 0; i < 120; i++) many["f" + i + ".md"] = i;
  assert.equal(Object.keys(normalizeSettings({ builtinSnapshot: many }).builtinSnapshot).length, 100, "键上限 100");
});
