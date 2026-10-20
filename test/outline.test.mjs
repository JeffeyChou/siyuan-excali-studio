/**
 * 第四十五轮：「仅外框颜色」色板。
 *
 * 这轮的关键不是 UI 而是**选中口径**：vendor 属性面板改外框色会把绑定文字一起染色
 * （changeProperty 的 includeBoundText），这里只对非文字图元打 strokeColor 补丁。
 * 断言分四段：
 * ① 纯函数：图形命中、绑定文字折算容器、独立文字/图片/frame 不命中、去重保序；
 * ② 数据层：动作注册、默认不钉（用户在脚本库按需固定）、色板色值唯一；
 * ③ 接线：竖条开色板、画布打补丁、脚本库行经宿主窄接口开色板；
 * ④ 文案：颜色名与提示双语齐备（中文原文即 key）。
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { OUTLINE_COLORS, outlineTargets } from "../src/studio/outline.ts";
import {
  DEFAULT_PINNED_ACTIONS,
  INSERT_BOARD_CARD,
  OUTLINE_COLOR,
  RAIL_ACTIONS,
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
const PALETTE = stripComments(src("studio/OutlinePalette.tsx"));
const INDEX = stripComments(src("index.ts"));
const CSS = src("index.css");

/* ------------------------------ ① 选中口径 ------------------------------ */

test("选中口径：图形命中；绑定文字折算容器；独立文字/图片/frame 不碰", () => {
  const elements = [
    { id: "box", type: "rectangle" },
    { id: "label", type: "text", containerId: "box" },
    { id: "free", type: "text", containerId: null },
    { id: "pic", type: "image" },
    { id: "arrow", type: "arrow" },
    { id: "frame", type: "frame" },
  ];
  assert.deepEqual(outlineTargets(elements, ["box"]), ["box"], "选中图形 → 直接命中");
  assert.deepEqual(outlineTargets(elements, ["label"]), ["box"], "选中绑定文字 → 改它所在图形的外框");
  assert.deepEqual(outlineTargets(elements, ["box", "label"]), ["box"], "容器与绑定文字同时选中 → 去重");
  assert.deepEqual(outlineTargets(elements, ["free", "pic", "frame"]), [], "没有外框概念的元素一律跳过");
  assert.deepEqual(outlineTargets(elements, ["ghost", "arrow"]), ["arrow"], "未知 id 丢弃，其余保序");
  assert.deepEqual(outlineTargets(elements, ["arrow", "box", "label"]), ["arrow", "box"], "多选保序、末尾去重");
});

/* ------------------------------ ② 数据层 ------------------------------ */

test("动作注册：仅外框颜色在白名单里、默认不钉（脚本库里按需固定）", () => {
  const meta = railActionOf(OUTLINE_COLOR);
  assert.ok(meta, "动作已登记");
  assert.equal(meta.title, "仅外框颜色");
  assert.match(meta.desc, /文字颜色保持不变/);
  assert.match(meta.icon, /^M/);
  assert.deepEqual(DEFAULT_PINNED_ACTIONS, [INSERT_BOARD_CARD], "有选中对象才用的工具，不占默认竖条");
  assert.equal(RAIL_ACTIONS.some((a) => a.id === OUTLINE_COLOR), true);
});

test("色板：白/黑/透明齐备、色值唯一、label 是 i18n key", () => {
  const values = OUTLINE_COLORS.map((c) => c.value);
  assert.equal(new Set(values).size, values.length, "色值不许重复");
  assert.ok(values.includes("#ffffff") && values.includes("#1e1e1e"), "白/黑是最高频的两次修补");
  assert.ok(values.includes("transparent"), "透明 = 去掉边框");
  for (const c of OUTLINE_COLORS) assert.ok(c.label.length > 0, `${c.value} 缺 label`);
});

/* ------------------------------ ③ 接线 ------------------------------ */

test("竖条：仅外框按钮开本地色板，脚本库请求经 nonce 开同一块", () => {
  assert.match(RAIL, /import \{ OUTLINE_COLOR, type RailActionId, type RailActionMeta \}/, "按 id 分流");
  assert.match(RAIL, /outlineRequest: number;/, "外部开色板通道");
  assert.match(RAIL, /onOutlineColor: \(color: string\) => void;/, "选色回调");
  assert.match(RAIL, /if \(a\.id === OUTLINE_COLOR\) \{[\s\S]{0,120}openOutline\(e\.currentTarget\)/, "点动作 = 开色板，不是立即执行");
  assert.match(RAIL, /props\.outlineRequest === outlineReqRef\.current/, "请求号变化才开（挂载不误开）");
  assert.match(RAIL, /<OutlinePalette[\s\S]{0,200}onPick=\{props\.onOutlineColor\}/, "色板选色交给画布");
  assert.match(PALETTE, /position|exs-outline-palette/, "色板自带定位壳");
  assert.match(CSS, /\.exs-outline-palette \{[\s\S]{0,200}position: fixed/, "不占位浮层");
  assert.match(CSS, /\.exs-outline-sw--none/, "透明色块有专属棋盘格");
});

test("画布：只对筛选出的目标打 strokeColor 补丁（可撤销），不碰文字", () => {
  assert.match(APP, /const selected = Object\.keys\(api\.getAppState\(\)\.selectedElementIds \?\? \{\}\)/, "读当前选中");
  assert.match(APP, /const ids = outlineTargets\(api\.getSceneElements\(\), selected\)/, "选中集合过筛选");
  assert.match(APP, /eaHandleRef\.current\?\.patchElements\(ids, \{ strokeColor: color \}\)/, "只补边框色");
  assert.match(APP, /notify\(t\("请先选中要改外框的图形（文字颜色不会被改动）"\)\)/, "没目标时不静默");
  assert.match(APP, /notify\(t\("已改 \{n\} 个外框", \{ n: ids\.length \}\)\)/, "改完报数量");
  assert.match(APP, /outlineRequest=\{outlineRequest\}/, "请求号传给竖条");
  assert.match(APP, /onOutlineColor=\{applyOutlineColor\}/, "选色回调接到补丁");
});

test("宿主：脚本库行 → 活动画布开色板；无画布时提示", () => {
  assert.match(INDEX, /import \{ INSERT_BOARD_CARD, OUTLINE_COLOR, RAIL_ACTIONS/, "宿主认识这个动作");
  assert.match(INDEX, /if \(id === OUTLINE_COLOR\) \{[\s\S]{0,160}this\.activeActions\(\)/, "先找活动画布");
  assert.match(INDEX, /actions\.openOutlinePalette\(\)/, "开色板走窄接口");
  assert.match(INDEX, /showMessage\(t\("先打开一块白板，再改外框颜色"\)\)/, "没有画布不装死");
  assert.match(APP, /openOutlinePalette: requestOutline/, "画布把窄接口注册给宿主");
  assert.match(APP, /registerActions\(actions\)/, "注册/注销沿用同一条通道");
});

/* ------------------------------ ④ 文案 ------------------------------ */

test("i18n：色名、提示、结果词条双语齐备，中文原文即 key", () => {
  const zh = json("i18n/zh_CN.json");
  const en = json("i18n/en_US.json");
  const meta = railActionOf(OUTLINE_COLOR);
  const keys = [
    meta.title,
    meta.desc,
    ...OUTLINE_COLORS.map((c) => c.label),
    "只改边框颜色，文字颜色保持不变",
    "可连续换色",
    "完成",
    "请先选中要改外框的图形（文字颜色不会被改动）",
    "已改 {n} 个外框",
    "先打开一块白板，再改外框颜色",
  ];
  for (const k of keys) {
    assert.ok(k in zh, `zh_CN 缺键：${k}`);
    assert.equal(zh[k], k, `值必须等于键：${k}`);
    assert.ok(en[k] && en[k] !== k, `en_US 该是真英文：${k}`);
  }
});
