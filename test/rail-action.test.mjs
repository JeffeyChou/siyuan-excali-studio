/**
 * 第四十一轮：画布动作（住进右缘竖条的内置能力）。
 *
 * 这轮的坑都长在「共用」两个字上，所以断言分四段：
 * ① 数据层真跑（id 唯一、图标非空、归一保序去重、显式空数组不被默认值回填）；
 * ② 分层红线：rail-actions 必须是纯数据——它被 settings.ts 用，一旦 import 了
 *    i18n/React/siyuan，设置归一就会牵动语言包、node 侧也读不了；
 * ③ 接线：竖条渲染、画布本地执行、宿主钉子落盘广播、脚本库小节，四条通道一条不能少；
 * ④ 文案双语齐备（中文原文即 key）。
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  DEFAULT_PINNED_ACTIONS,
  INSERT_BOARD_CARD,
  RAIL_ACTIONS,
  isRailActionId,
  normalizePinnedActions,
  railActionOf,
} from "../src/studio/rail-actions.ts";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function src(rel) {
  return readFileSync(resolve(ROOT, "src", rel), "utf8");
}
function json(rel) {
  return JSON.parse(readFileSync(resolve(ROOT, rel), "utf8"));
}
function stripComments(code) {
  return code.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'\\])\/\/[^\n]*/g, "$1");
}

const APP = stripComments(src("studio/StudioApp.tsx"));
const RAIL = stripComments(src("studio/ScriptRail.tsx"));
const TAB = stripComments(src("studio/tab.tsx"));
const INDEX = stripComments(src("index.ts"));
const MENU = stripComments(src("studio/StudioMenu.tsx"));
const CSS = src("index.css");

/* ------------------------------ ① 数据层 ------------------------------ */

test("动作元数据：id 唯一、标题/说明是 i18n key、图标是非空 24 网格路径", () => {
  assert.ok(RAIL_ACTIONS.length > 0, "至少一枚动作");
  const ids = RAIL_ACTIONS.map((a) => a.id);
  assert.equal(new Set(ids).size, ids.length, "id 不许重复");
  for (const a of RAIL_ACTIONS) {
    assert.ok(a.title.length > 0 && a.desc.length > 0, `${a.id} 缺标题或说明`);
    assert.match(a.icon, /^M/, `${a.id} 图标得是 svg path 数据`);
    assert.equal(railActionOf(a.id), a, "按 id 查得回来");
    assert.ok(isRailActionId(a.id));
  }
  assert.equal(railActionOf("run-any-script"), null, "未知 id 返回 null，不抛");
  assert.equal(isRailActionId(undefined), false, "脏值（含 undefined）一律不认");
});

test("归一：白名单 + 去重 + 保序；显式空数组原样保留", () => {
  assert.deepEqual(normalizePinnedActions(undefined), DEFAULT_PINNED_ACTIONS, "键缺失回落默认（升级即看得见）");
  assert.deepEqual(normalizePinnedActions([]), [], "显式取消固定落成空数组，回填等于固定不住");
  assert.deepEqual(normalizePinnedActions("insert-board-card"), DEFAULT_PINNED_ACTIONS, "不是数组就回落默认");
  assert.deepEqual(normalizePinnedActions([INSERT_BOARD_CARD, INSERT_BOARD_CARD]), [INSERT_BOARD_CARD], "重复去重");
  assert.deepEqual(normalizePinnedActions(["删掉的脚本", 1, null, INSERT_BOARD_CARD]), [INSERT_BOARD_CARD], "未知 id 丢弃且保序");
});

/* ------------------------------ ② 分层 ------------------------------ */

test("分层：rail-actions 是纯数据模块（只有图标依赖），宿主与面板各自查表", () => {
  const RAW = src("studio/rail-actions.ts");
  assert.equal(/\bfrom\s+["'](siyuan|react)/.test(RAW), false, "不许 import 思源或 React");
  assert.match(RAW, /from "\.\/menu-icons\.ts"/, "图标沿用菜单图标表（路径带 .ts，node 侧要能直接跑）");
  assert.equal(RAW.includes('from "../i18n"'), false, "存 i18n key 不存译文，settings.ts 用它是纯归一");
  // 消费方一律按 id 查表，不许把元数据抄成第二份
  assert.match(APP, /listPinnedActions\(\)\.map\(\(id\) => railActionOf\(id\)\)/, "画布侧按 id 查表");
  assert.match(INDEX, /RAIL_ACTIONS\.map\(actionRow\)/, "面板渲染整份动作表");
});

/* ------------------------------ ③ 接线 ------------------------------ */

test("竖条：动作排在固定脚本上面，点=执行、右键=取消固定（与脚本同一枚钉子菜单）", () => {
  assert.match(RAIL, /actions: RailActionMeta\[\];/, "动作清单是正式 prop");
  assert.match(RAIL, /onRunAction: \(id: RailActionId\) => void/, "执行通道");
  assert.match(RAIL, /onUnpinAction: \(id: RailActionId\) => void/, "取消固定通道");
  assert.match(RAIL, /props\.actions\.map\(\(a\) => \(/, "渲染动作按钮");
  const atActions = RAIL.indexOf("props.actions.map");
  const atPinned = RAIL.indexOf("props.pinned.map");
  assert.ok(atActions > -1 && atPinned > atActions, "内置能力排在用户自己钉的之前");
  assert.match(RAIL, /onContextMenu=\{\(e\) => openMenu\(e, "action", a\.id\)\}/, "右键走菜单");
  assert.match(RAIL, /if \(menu\.kind === "action"\) props\.onUnpinAction\(menu\.name as RailActionId\);/, "菜单按 kind 分流");
  assert.match(RAIL, /props\.actions\.length \+ props\.pinned\.length > 0/, "两组都空时不出现空分组线");
});

test("画布：动作在自己那块画布里本地执行，钉子清单跟广播重拉", () => {
  assert.match(APP, /listPinnedActions: \(\) => RailActionId\[\];/, "StudioProps 同步读设置通道");
  assert.match(APP, /onPinAction: \(id: RailActionId, pinned: boolean\) => void/, "固定/取消固定通道");
  assert.match(APP, /const \[railActions, setRailActions\] = useState<RailActionMeta\[\]>\(\[\]\);/, "动作清单进本地状态");
  assert.match(APP, /addEventListener\(SCRIPT_PIN_EVENT, refreshPinned\)/, "沿用固定脚本那份广播（不新增事件名）");
  assert.match(APP, /\}, \[listPinnedScripts, listPinnedActions\]\);/, "重拉回调把两个通道都列进依赖");
  assert.match(APP, /actions=\{railActions\}/, "传给竖条");
  assert.match(APP, /onUnpinAction=\{\(id\) => onPinAction\(id, false\)\}/, "取消固定翻回宿主");
  assert.match(APP, /onRunAction=\{runRailAction\}/, "执行走本地通道，不绕宿主活动画布");
});

test("宿主：钉子清单落 pinnedActions 并广播；面板点动作 = 对活动画布执行", () => {
  assert.match(INDEX, /listPinnedActions: \(\) => this\.settings\.pinnedActions/, "同步读设置");
  assert.match(INDEX, /onPinAction: \(id, pinned\) => this\.rememberActionPin\(id, pinned\)/);
  assert.match(INDEX, /const next = pinned \? \(cur\.includes\(id\) \? cur : \[\.\.\.cur, id\]\) : cur\.filter\(\(x\) => x !== id\);/, "翻转钉子清单");
  assert.match(INDEX, /pinnedActions: next/, "落盘");
  assert.match(INDEX, /dispatchEvent\(new CustomEvent\(SCRIPT_PIN_EVENT\)\)/, "改完广播（所有已开画布跟着重拉）");
  assert.match(INDEX, /const ref = await this\.pickBoardRef\(\);[\s\S]{0,120}actions\.insertBoardCard\(ref,/, "面板动作接宿主选择器");
  assert.match(INDEX, /showMessage\(t\("先打开一块白板，再往里插卡片"\)\)/, "没有活动画布时提示，不静默");
});

test("脚本库：画布动作小节在说明块之上，行结构照抄脚本行（样式零分叉）", () => {
  assert.match(INDEX, /const actionBlock = `<div class="exs-picker__group">\$\{t\("画布动作"\)\}<\/div>/, "分组标题");
  assert.match(INDEX, /data-rail-action="\$\{escapeAttr\(/, "行标自己的 id");
  assert.match(INDEX, /const pinnedActions = new Set<string>\(this\.settings\.pinnedActions\);/, "行首固定态实时读设置");
  assert.match(INDEX, /outdatedBar\}\$\{actionBlock\}\$\{hint\}/, "小节排在说明块之上（动作是入口，说明是脚注）");
  // 分流顺序是硬约束：动作行照抄了脚本行的类名，但没有 data-idx
  const clickBody = INDEX.slice(INDEX.indexOf('dialog.element.addEventListener("click", (e)'), INDEX.indexOf('dialog.element.addEventListener("contextmenu"'));
  assert.ok(clickBody.indexOf("[data-rail-action]") > -1 && clickBody.indexOf('closest?.(".exs-script-item")') > clickBody.indexOf("[data-rail-action]"), "点击：动作分支必须先于脚本分支");
  const ctxBody = INDEX.slice(INDEX.indexOf('dialog.element.addEventListener("contextmenu"'));
  assert.ok(ctxBody.indexOf("[data-rail-action]") > -1 && ctxBody.indexOf('closest?.(".exs-script-item")') > ctxBody.indexOf("[data-rail-action]"), "右键：同样先认动作行");
  assert.match(INDEX, /if \(!isRailActionId\(id\)\) return;/, "脏 id 直接放掉");
  assert.match(INDEX, /dialog\.destroy\(\);\s*\n\s*void this\.runRailAction\(id\);/, "点动作行 = 关面板再执行（与点脚本同手感）");
  assert.match(INDEX, /const markPinned = \(item: HTMLElement, pinned: boolean\): void => \{/, "就地刷新固定态（脚本行与动作行共用一份）");
  assert.equal((INDEX.match(/toggle\("exs-script-item--pinned"/g) ?? []).length, 1, "固定态 paint 只有一份，抄第二遍迟早分叉");
  assert.match(CSS, /\.exs-picker__group \{/, "分组标题有样式");
});

test("菜单：☰ 里的插入白板卡片撤干净，入口只剩竖条与脚本库", () => {
  assert.equal(MENU.includes("onInsertBoardCard"), false, "回调通道已删");
  assert.equal(MENU.includes("ICON_BOARD_CARD"), false, "菜单不再引卡片图标");
  assert.equal(APP.includes("onInsertBoardCard"), false, "StudioApp 不再传这条 prop");
});

/* ------------------------------ ④ 文案 ------------------------------ */

test("i18n：画布动作词条双语齐备，中文原文即 key", () => {
  const zh = json("i18n/zh_CN.json");
  const en = json("i18n/en_US.json");
  const keys = ["画布动作", ...RAIL_ACTIONS.flatMap((a) => [a.title, a.desc])];
  for (const k of keys) {
    assert.ok(k in zh, `zh_CN 缺键：${k}`);
    assert.equal(zh[k], k, `值必须等于键：${k}`);
    assert.ok(en[k] && en[k] !== k, `en_US 该是真英文：${k}`);
  }
  assert.equal("插入白板卡片…" in zh, false, "带省略号的旧菜单词条已随 ☰ 入口退出");
  assert.equal("插入白板卡片…" in en, false, "en_US 同样不留旧词条");
});
