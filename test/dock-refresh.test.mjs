// 第二十轮「dock 纯库化」：刷新路径只剩结构事件。
//
// 背景（对照第十四~十八轮的演进）：dock 曾经带「活动画布状态行 + 背景色板」，
// vendor 的 onChange 拖拽时每帧回调，于是有了 sameDockState 同值跳过 + 合帧两套机制。
// 第二十轮把画布操作区整块删掉后，dock 只剩「白板库列表 + －删除置灰态」——
// 两者都只随**结构事件**变（开/关页签、保存、删除、重命名、建档、⟳、搜索过滤），
// 每帧路径整个消失，合帧与状态比较随 dock-state.ts 一起退役。
//
// 必须钉住的不变量：
//   ① onBoardActive 每帧进来只更新活动位，不触发任何刷新（没有每帧呈现的内容）；
//   ② 结构事件（注册/注销/关页签）仍然立即刷新——列表的「已打开」徽标与
//      －删除的置灰态慢一帧就是可见的错误状态；
//   ③ 保存落盘后新文件即时进库（rememberBoardFile + refreshBoardLib）——
//      「保存 → 库中立即可见 → 点条目再次进入」的闭环，慢一拍用户就以为没存上。
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const src = (rel) => readFileSync(resolve(ROOT, "src/" + rel), "utf8");
const stripComments = (code) => code.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'\\])\/\/[^\n]*/g, "$1");

const DOCK = stripComments(src("siyuan/ExcaliDock.ts"));
const INDEX = stripComments(src("index.ts"));

/* ------------------------------ 每帧路径已整个退役 ------------------------------ */

test("宿主：onBoardActive 每帧只更新活动位，不触发刷新", () => {
  const active = INDEX.slice(INDEX.indexOf("onBoardActive: (custom) =>"), INDEX.indexOf("copyBoardRef:"));
  assert.match(active, /this\.activeCustom = custom;/, "活动位照旧每帧更新（删除当前白板/ea save 要用）");
  assert.equal(/scheduleDockRefresh|dockRefresh\?\.\(\)/.test(active), false, "没有每帧刷新路径了：合帧机制已删");
  assert.equal(INDEX.includes("scheduleDockRefresh"), false, "合帧入口整个删除，别留死代码");
  assert.equal(INDEX.includes("dockRefreshQueued"), false, "合帧排队标记一并删除");
  assert.equal(INDEX.includes("onBoardDirty"), false, "脏翻转通道删除：没有状态行要跟着翻了");
  assert.equal(INDEX.includes("dock-state"), false, "dock-state.ts 已删，宿主不再 import 它");
});

test("面板：refresh 只刷库 + －删除置灰态，没有状态早退那套", () => {
  const body = DOCK.slice(DOCK.indexOf("const refresh = "), DOCK.indexOf("element.addEventListener"));
  assert.match(body, /renderLib\(\);/, "先刷库");
  assert.match(body, /delActiveBtn\.disabled = !host\.hasActiveBoard\(\);/, "再置 －删除的灰");
  assert.equal(body.includes("getState"), false, "getState 通道已删（没有画布状态行）");
  assert.equal(DOCK.includes("sameDockState"), false, "面板不再 import 状态比较");
});

/* ------------------------------ 结构事件仍立即刷新 ------------------------------ */

test("宿主：结构事件（注册/注销/关页签）保持立即刷新", () => {
  const wire = INDEX.slice(INDEX.indexOf("onBoardActions: (custom"), INDEX.indexOf("onBoardActive: (custom) =>"));
  assert.match(wire, /this\.dockRefresh\?\.\(\);/, "注册/注销决定「已打开」徽标与 －删除置灰，必须当场见效");
  assert.match(
    INDEX,
    /if \(plugin\.activeCustom === this\) plugin\.activeCustom = null;[\s\S]{0,80}plugin\.dockRefresh\?\.\(\);/,
    "关页签后立即重算，不能等下一帧",
  );
});

/* ------------------------------ 创建/保存即入库（闭环） ------------------------------ */

test("宿主：创建/保存落盘后新文件即时进库缓存 + 全量对齐", () => {
  assert.match(INDEX, /this\.rememberBoardFile\(target, docId \?\? undefined/, "createBoardFile 建文件即补缓存（第二十一轮文件先行）：库里立即可见");
  assert.match(INDEX, /this\.rememberBoardFile\(saved\);/, "saveSvg 覆盖保存时项已在，空操作");
  assert.match(INDEX, /void this\.refreshBoardLib\(\);/, "再跑全量对齐（libLoading 在途时跳过也不怕，缓存已补）");
  const at = INDEX.indexOf("private rememberBoardFile");
  assert.ok(at > 0, "rememberBoardFile 入口存在");
  const helper = INDEX.slice(at, at + 700);
  assert.match(helper, /if \(this\.boardFiles\.some\(\(f\) => f\.dataPath === normalized\)\) return;/, "已存在的项不动");
  assert.match(helper, /updated: Date\.now\(\)/, "新项带当前时间，列表排序不飘");
});
