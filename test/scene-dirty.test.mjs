// 第十五轮「流畅度第二批 ③」：dirty 判据从「收到过 onChange」换成「场景指纹 ≠ 落盘那份」。
//
// 必须钉住的不变量：
//   ① 指纹只覆盖会写进文件的东西（元素版本号 / 图片集合 / 内嵌 scene 那四个 appState 键）；
//      换工具色板、平移缩放、选中移动都不该变脏。
//   ② 基线取 vendor 现场场景，不是 initial prop——restore 会补默认 appState、
//      repairBindings 会动版本号，拿未归一的 initial 比会把「打开没动」判成脏。
//   ③ 落盘后是「设基线 → 复算」，不是硬清脏：导出异步期间用户又画几笔不能被吞掉。
//   ④ 指纹只在干净态算；一脏就不再算，拖拽时每帧成本为零。
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { canvasBitsOf, dirtyFromStamp, filesStampOf, sceneStampOf } from "../src/studio/scene-dirty.ts";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const src = (rel) => readFileSync(resolve(ROOT, "src/" + rel), "utf8");
const stripComments = (code) => code.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'\\])\/\/[^\n]*/g, "$1");

const APP = stripComments(src("studio/StudioApp.tsx"));
const DIRTY_SRC = src("studio/scene-dirty.ts");

/**
 * handleChange 函数体。依赖数组会随功能长（第五十三轮加了 syncDeck），
 * 拿整串字面量当尾哨兵会让每次正常加依赖都变成「断言漂移」，这里按行认哨兵。
 */
const HANDLE_CHANGE = (() => {
  const at = APP.indexOf("const handleChange = useCallback");
  const rel = APP.slice(at).search(/\n\s*\[onBoardActive,[^\n]*\],/);
  assert.ok(at > -1 && rel > -1, "handleChange 的头尾哨兵都要找得到");
  return APP.slice(at, at + rel);
})();

const parts = (over = {}) => ({
  elementsHash: 1234,
  files: "a:100:image/png",
  canvas: { background: "#f8f5ee", grid: false, gridSize: 20, gridStep: 5 },
  ...over,
});

/* --------------------------- 行为：指纹层（真导入） --------------------------- */

test("filesStampOf：认 id 集合、字节数与类型，不认键的顺序", () => {
  assert.equal(filesStampOf(undefined), "", "没有图片时给个空串而不是崩");
  const a = { "b.png": { dataURL: "data:12345", mimeType: "image/png" }, "a.png": { dataURL: "data:1", mimeType: "image/svg+xml" } };
  const b = { "a.png": { dataURL: "data:1", mimeType: "image/svg+xml" }, "b.png": { dataURL: "data:12345", mimeType: "image/png" } };
  assert.equal(filesStampOf(a), filesStampOf(b), "同一组图换顺序不该算改动");
  assert.notEqual(filesStampOf(a), filesStampOf({ ...a, "c.png": { dataURL: "x", mimeType: "image/png" } }), "加了图要算改动");
});

test("canvasBitsOf：缺省与显式默认归一到同一个值", () => {
  assert.deepEqual(canvasBitsOf({}), { background: "", grid: false, gridSize: 20, gridStep: 5 });
  assert.deepEqual(canvasBitsOf(null), canvasBitsOf({}), "拿不到 appState 也有一份可用的默认");
  assert.deepEqual(
    canvasBitsOf({ viewBackgroundColor: "", gridModeEnabled: false, gridSize: 20, gridStep: 5 }),
    canvasBitsOf({}),
    "vendor 补齐的默认值不该被读成改动",
  );
  assert.equal(canvasBitsOf({ gridModeEnabled: undefined }).grid, false, "undefined 归成布尔");
});

test("sceneStampOf：三部分任一变化，串就不同", () => {
  const base = sceneStampOf(parts());
  assert.equal(sceneStampOf(parts()), base, "同样的部件必须给同样的串");
  const changed = [
    { elementsHash: 1235 },
    { files: "a:101:image/png" },
    { canvas: { background: "#ffffff", grid: false, gridSize: 20, gridStep: 5 } },
    { canvas: { background: "#f8f5ee", grid: true, gridSize: 20, gridStep: 5 } },
    { canvas: { background: "#f8f5ee", grid: false, gridSize: 40, gridStep: 5 } },
    { canvas: { background: "#f8f5ee", grid: false, gridSize: 20, gridStep: 10 } },
  ];
  for (const over of changed) {
    assert.notEqual(sceneStampOf(parts(over)), base, JSON.stringify(over) + " 变了必须落到串上");
  }
});

test("dirtyFromStamp：两种 null 的含义相反", () => {
  assert.equal(dirtyFromStamp("x", null), false, "基线还没建立：挂载初期的回调不算用户改过");
  assert.equal(dirtyFromStamp(null, "x"), true, "指纹算不出来就当脏，宁可多存一次");
  assert.equal(dirtyFromStamp(null, null), false, "基线都没建立时无从判起");
  assert.equal(dirtyFromStamp("x", "x"), false, "同一个指纹就是没改");
  assert.equal(dirtyFromStamp("x", "y"), true, "不同就是改了");
});

test("scene-dirty.ts 零依赖：node 测试能直接 import 跑真断言", () => {
  assert.equal(/(^|\n)\s*import\s/.test(DIRTY_SRC), false, "纯函数层不许 import 任何东西");
  assert.equal(/require\(/.test(DIRTY_SRC), false);
});

/* ------------------------------ 接线：指纹层 ------------------------------ */

test("指纹只覆盖会落盘的东西：元素版本号 + 图片集合 + 那四个 appState 键", () => {
  assert.match(APP, /import \{[^}]*\bhashElementsVersion\b[^}]*\} from "@excalidraw\/excalidraw";/, "元素指纹用 vendor 的 hashElementsVersion（getSceneVersion 已废弃）");
  assert.match(APP, /import \{ canvasBitsOf, dirtyFromStamp, filesStampOf, sceneStampOf \} from "\.\/scene-dirty";/);
  const at = APP.indexOf("const stampOf = useCallback");
  const body = APP.slice(at, APP.indexOf("}, []);", at));
  assert.match(body, /elementsHash: hashElementsVersion\(scene\.elements\)/);
  assert.match(body, /files: filesStampOf\(scene\.files\)/);
  assert.match(body, /canvas: canvasBitsOf\(scene\.appState\)/);
  assert.match(body, /try \{[\s\S]*\} catch \{\s*return null;/, "算不出指纹要返回 null，交给 dirtyFromStamp 判脏");
  // 画笔颜色那类纯 UI 状态不落盘，进指纹就等于回到「换个颜色也变脏」
  assert.equal(/currentItem/.test(body), false, "指纹里不许出现不落盘的 UI 字段");
});

test("handleChange：收到回调不再一律置脏，比过指纹才脏", () => {
  const body = HANDLE_CHANGE;
  assert.match(
    body,
    /if \(!presentingRef\.current && !dirtyRef\.current\) \{[\s\S]{0,200}if \(dirtyFromStamp\(stampOf\(sceneRef\.current\), baselineRef\.current\)\) \{[\s\S]{0,120}dirtyRef\.current = true;\s*setDirty\(true\);/,
    "指纹比较必须套在「当前干净且没在放映」的分支里，且只有判脏才置脏",
  );
  assert.ok(body.indexOf("sceneRef.current = {") < body.indexOf("dirtyFromStamp("), "影子快照仍是最先写的那一步，flush 才有场景可用");
  assert.ok(body.indexOf("dirtyFromStamp(") < body.indexOf("dirtyRef.current = true"), "置脏排在指纹比较之后");
  assert.ok(body.indexOf("onBoardActive();") > body.indexOf("const grid = !!appState.gridModeEnabled"), "活动位上报在脏判定之外：dock 仍要每帧拿到当前板");
  assert.match(body, /scheduleAutoSave\(\);/, "第二十一轮：每次回调都重排防抖（松手约 1 秒落盘）");
});

test("干净态才算指纹：一脏就不再算，拖拽时每帧成本为零", () => {
  const body = HANDLE_CHANGE;
  assert.equal((body.match(/dirtyFromStamp\(/g) || []).length, 1, "onChange 里只有一处指纹比较");
  assert.equal(/if \(dirtyRef\.current\)/.test(body), false, "不该反过来在脏态算指纹");
  // 第五十三轮：片单同步也走「自己那份签名去重」，不许蹭 dirty 通道（放映器只读，不落盘）
  assert.equal((body.match(/syncDeck\(/g) || []).length, 1, "每帧只调一次片单同步");
  assert.ok(body.indexOf("syncDeck(") > body.indexOf("dirtyFromStamp("), "片单同步在脏判定之后：它是只读副产物");
});

test("基线取 vendor 现场场景，不取 initial prop", () => {
  const at = APP.indexOf("baselineRef.current = stampOf({");
  const effectStart = APP.lastIndexOf("useEffect(", at);
  const effect = APP.slice(effectStart, APP.indexOf("}, [api, stampOf]);", at) + 19);
  assert.match(effect, /if \(!api\) return;/, "没有 api 时不建立基线");
  assert.match(effect, /elements: api\.getSceneElements\(\),[\s\S]*appState: api\.getAppState\(\),[\s\S]*files: api\.getFiles\(\)/);
  assert.match(effect, /\}, \[api, stampOf\]\);/, "只在拿到 api 那一刻建一次");
  assert.equal(/initial/.test(effect), false, "initial 没经 restore 归一，拿它当基线会把「打开没动」判成脏");
});

/* --------------------------- 接线：落盘后的收口 --------------------------- */

test("落盘收口是先设基线再复算，不是硬清脏", () => {
  const at = APP.indexOf("const applySavedBaseline = useCallback");
  const body = APP.slice(at, APP.indexOf("[grabScene, stampOf],", at));
  assert.match(body, /const baseline = stampOf\(savedScene\);\s*baselineRef\.current = baseline;/, "基线换成刚写进文件那份场景");
  assert.match(body, /const current = grabScene\(\);/, "复算读现场，保存期间的新笔画不会被吞掉");
  assert.match(body, /dirtyFromStamp\(current \? stampOf\(current\) : null, baseline\)/);
  assert.match(body, /dirtyRef\.current = stillDirty;\s*setDirty\(stillDirty\);/, "ref 与 state 一起改，dock 同帧读得到");
  assert.ok(body.indexOf("baselineRef.current = baseline") < body.indexOf("const current = grabScene()"), "顺序反了就把「刚保存的内容」当成了用户的改动");
});

test("唯一落盘路径（flush）统一走 applySavedBaseline，硬清脏全部消失", () => {
  // 第二十一轮：saveFlow / saveAsFlow 删除，只剩 flush 一条（防抖 / ⌘S / 关页签 / ea.save 共用）
  assert.equal((APP.match(/applySavedBaseline\(scene\);/g) || []).length, 1, "只剩 flush 一处落盘收口");
  assert.equal((APP.match(/\[[^\]]*applySavedBaseline[^\]]*\]/g) || []).length, 1, "flush 的依赖数组带上它（applySavedBaseline 自身定义的依赖是 grabScene/stampOf，不含自己）");
  assert.equal(/dirtyRef\.current = false/.test(APP), false, "残留的硬清脏会绕过基线，把未保存的改动说成已保存");
  assert.equal(/setDirty\(false\)/.test(APP), false, "同上：state 侧也不许再无条件清脏");
});

test("flush 把落盘那份场景提成 grabScene 快照，指纹取自真正写进文件的那份", () => {
  const sites = APP.match(/const scene: ExportScene = \{[\s\S]{0,140}?\};\s*const svgText = await sceneToSvgText\(scene\);/g) || [];
  assert.equal(sites.length, 0, "第二十一轮后不存在「现读 api 组 scene」的旧保存路径");
  assert.match(
    APP,
    // 第十九轮：快照与导出之间多了两道避让闸（空场景/活跃笔迹）。
    // 第二十六轮 T1/T4：两道闸 + 落盘补主题槽位（sceneOut 块）+ saveMedia，窗口放宽到 900。
    /const scene = grabScene\(\);[\s\S]{0,900}const svgText = await sceneToSvgText\(sceneOut, \{ saveMedia \}\);/,
    "flush 沿用 grabScene 的快照（保存期间用户又画几笔也按快照落盘，复算会判脏带走）",
  );
  assert.match(APP, /const sceneOut: ExportScene = \{[\s\S]{0,200}withThemeBgSlot\(/, "落盘场景先补双主题背景槽位再导出");
});

test("不误伤既有行为：flush 的干净早退、renameFlow 不清脏", () => {
  const at = APP.indexOf("const flush = useCallback");
  const body = APP.slice(at, APP.indexOf("[applySavedBaseline, grabScene, onSave, saveMedia]", at));
  assert.match(body, /if \(busyRef\.current\) return !dirtyRef\.current;/);
  assert.match(body, /if \(!dirtyRef\.current\) return true;/, "干净就直接返回——本轮让这条早退真的能命中");
  const ren = APP.slice(APP.indexOf("const renameFlow = useCallback"), APP.indexOf("[api, notify, onRename, promptFileName]", APP.indexOf("const renameFlow")));
  assert.equal(/applySavedBaseline|setDirty/.test(ren), false, "重命名换了路径没换内容，基线仍有效，画布上的改动还得是脏的");
});
