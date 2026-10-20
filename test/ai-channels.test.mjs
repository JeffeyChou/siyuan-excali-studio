/**
 * 第四十四轮：AI 通道面板 + 四道门。
 *
 * ① 数据层真跑（归一 + 元数据自洽）；② 分层红线（channels.ts 纯数据）；
 * ③ 四道门契约：注册门 / 调用门 / 软门 / 入口门——面板承诺什么，代码就得做到什么；
 * ④ 文案双语齐备 + 样式类名与组件一字不差。
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  CHANNEL_IDS,
  CHANNEL_META,
  DEFAULT_AI_CHANNELS,
  channelMetaOf,
  normalizeAiChannels,
} from "../src/studio/ai/channels.ts";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function src(rel) {
  return readFileSync(resolve(ROOT, "src", rel), "utf8");
}
function file(rel) {
  return readFileSync(resolve(ROOT, rel), "utf8");
}
function json(rel) {
  return JSON.parse(file(rel));
}
function stripComments(code) {
  return code.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'\\])\/\/[^\n]*/g, "$1");
}

const APP = stripComments(src("studio/StudioApp.tsx"));
const TAB = stripComments(src("studio/tab.tsx"));
const MENU = stripComments(src("studio/StudioMenu.tsx"));
const PANEL = stripComments(src("studio/AiChannelsPanel.tsx"));
const INDEX = stripComments(src("index.ts"));
const KERNEL = stripComments(src("kernel/index.ts"));
const CLI = stripComments(file("scripts/excali-board.mjs"));
const SETTINGS = stripComments(src("studio/settings.ts"));
const CSS = src("index.css");

/* ---------------- ① 数据层 ---------------- */

test("归一：缺键默认全开；显式 false 保留；脏值按默认", () => {
  assert.deepEqual(normalizeAiChannels(undefined), DEFAULT_AI_CHANNELS, "老 data.json 没这个键 → 全开");
  assert.deepEqual(normalizeAiChannels(null), DEFAULT_AI_CHANNELS);
  assert.deepEqual(normalizeAiChannels({ mcp: false }), { agent: true, mcp: false, cli: true, script: true });
  assert.deepEqual(normalizeAiChannels({ agent: false, mcp: false, cli: false, script: false }), {
    agent: false, mcp: false, cli: false, script: false,
  }, "全关是合法状态（退回纯手动）");
  assert.deepEqual(normalizeAiChannels({ mcp: "off", cli: 0, script: {} }), DEFAULT_AI_CHANNELS, "字符串/0/对象都不算关闭");
  assert.deepEqual(normalizeAiChannels("nope"), DEFAULT_AI_CHANNELS, "整值不是对象 → 默认");
  assert.deepEqual(normalizeAiChannels({ unknown: false }), DEFAULT_AI_CHANNELS, "未知 id 丢弃");
});

test("元数据：四 id 与通道表一一对应，文案非空，图标是 24 网格路径", () => {
  assert.deepEqual(CHANNEL_IDS, ["agent", "mcp", "cli", "script"], "面板顺序即此顺序");
  assert.equal(CHANNEL_META.length, 4);
  const ids = CHANNEL_META.map((m) => m.id);
  assert.deepEqual([...ids].sort(), [...CHANNEL_IDS].sort(), "id 不许重复或缺位");
  for (const m of CHANNEL_META) {
    assert.ok(m.title && m.desc && m.gate, `${m.id} 文案缺项`);
    assert.match(m.icon, /^M/, `${m.id} 图标得是 svg path`);
    assert.equal(channelMetaOf(m.id), m, "按 id 查得回来");
  }
});

test("settings 接线：aiChannels 进接口、默认值与归一", () => {
  assert.match(SETTINGS, /aiChannels: AiChannels;/, "接口字段");
  assert.match(SETTINGS, /aiChannels: \{ \.\.\.DEFAULT_AI_CHANNELS \}/, "默认全开");
  assert.match(SETTINGS, /aiChannels: normalizeAiChannels\(r\.aiChannels\)/, "归一走 channels.ts");
});

/* ---------------- ② 分层 ---------------- */

test("分层：channels.ts 是纯数据模块（只依赖菜单图标表）", () => {
  const RAW = src("studio/ai/channels.ts");
  assert.equal(/\bfrom\s+["'](siyuan|react|@excalidraw)/.test(RAW), false, "不许 import 思源 / React / vendor");
  assert.match(RAW, /from "\.\.\/menu-icons\.ts"/, "图标查菜单表（路径带 .ts，node 侧能直接跑）");
  assert.equal(RAW.includes('from "../i18n"'), false, "存 i18n key 不存译文");
});

/* ---------------- ③ 接线与四道门 ---------------- */

test("菜单 → 画布状态 → 面板：三条通道齐", () => {
  assert.match(MENU, /onAiChannels: \(\) => void/, "菜单收打开回调");
  assert.match(APP, /const \[aiOpen, setAiOpen\] = useState\(false\)/, "面板开关是画布本地状态");
  assert.match(APP, /setAiChannels\(getAiChannels\(\)\)/, "打开与翻转都从宿主快照重拉（真源在设置）");
  assert.match(APP, /<AiChannelsPanel channels=\{aiChannels\} onToggle=\{toggleAiChannel\} onClose=\{\(\) => setAiOpen\(false\)\}/, "面板渲染");
  assert.match(TAB, /getAiChannels=\{host\.getAiChannels\}\s*\n\s*onAiChannel=\{host\.onAiChannel\}/, "tab 透传宿主两条通道");
});

test("面板契约：文案全查 CHANNEL_META，门语义不许抄第二份", () => {
  assert.match(PANEL, /CHANNEL_META\.map\(\(m\) =>/, "整表渲染");
  for (const field of ["m\\.title", "m\\.desc", "m\\.gate"]) {
    assert.match(PANEL, new RegExp(`t\\(${field}\\)`), `${field} 必须过 t()`);
  }
  assert.match(PANEL, /document\.addEventListener\("keydown", onKey, true\)/, "Escape 捕获层（画布快捷键不该抢）");
  assert.match(PANEL, /onPointerDown=\{\(e\) => e\.target === e\.currentTarget && onClose\(\)\}/, "点底关闭、点面板不关");
  assert.match(PANEL, /role="switch"/, "开关是 switch 语义");
});

test("宿主：写设置即时落盘，只有 agent 一栏弹重载提示", () => {
  assert.match(INDEX, /getAiChannels: \(\) => this\.settings\.aiChannels/, "同步快照");
  assert.match(INDEX, /onAiChannel: \(id, on\) => this\.setAiChannel\(id, on\)/);
  assert.match(INDEX, /if \(this\.settings\.aiChannels\[id\] === on\) return;/, "同值不落盘");
  assert.match(INDEX, /aiChannels: \{ \.\.\.this\.settings\.aiChannels, \[id\]: on \}/, "不可变更新");
  assert.match(INDEX, /this\.persist\(\);\s*\n\s*if \(id === "agent"\)/, "agent 之外不落 toast（其余即时生效，别瞎提醒）");
});

test("注册门：agent 关闭 = onload 不注册四能力", () => {
  const at = INDEX.indexOf("if (!this.settings.aiChannels.agent) return;");
  assert.ok(at > -1, "早退语句在");
  assert.ok(INDEX.indexOf("addAgentCapability", at) > at, "早退之后才是注册调用（承诺一致）");
});

test("入口门：选择器与执行口成对拒开，共用同一句提示", () => {
  assert.equal((INDEX.match(/脚本通道已在「AI 通道」面板里关闭/g) ?? []).length, 2, "openScriptPicker 与 runScriptOnActiveBoard 各一处");
  const picker = INDEX.slice(INDEX.indexOf("private openScriptPicker"), INDEX.indexOf("private async runScriptOnActiveBoard"));
  assert.match(picker, /aiChannels\.script/, "☰ 入口先被拦");
  assert.match(INDEX.slice(INDEX.indexOf("private async runScriptOnActiveBoard"), INDEX.indexOf("private async runScriptOnActiveBoard") + 500), /aiChannels\.script/, "唯一执行口也被拦（竖条/库/右键全走这里）");
});

test("调用门：内核四工具共用 settingsForCall，工具仍在列表", () => {
  assert.match(KERNEL, /if \(!settings\.aiChannels\.mcp\)/, "读设置后先验门");
  assert.match(KERNEL, /throw new Error\("内核 MCP 通道已在「AI 通道」面板里关闭"\)/, "拒因回给调用方");
  assert.equal((KERNEL.match(/await settingsForCall\(\)/g) ?? []).length, 4, "四个 handler 全走这道门");
  assert.equal((KERNEL.match(/await loadSettings\(\)/g) ?? []).length, 1, "loadSettings 只剩 settingsForCall 内部一处（绕开门的写法清零）");
});

test("软门：CLI 写 create/append 前读 petal 设置；读命令与 --dry-run 不拦", () => {
  assert.match(CLI, /\?\.settings\?\.aiChannels\?\.cli === false/, "只有显式 false 才关门（读不到/解析失败=开启）");
  assert.match(CLI, /"storage", "petal", "siyuan-excali-studio", "excali-studio"/, "petal 文件不带 .json 后缀（真机实测）");
  assert.equal((CLI.match(/await assertCliWritable\(workspace, "(?:create|append)"\)/g) ?? []).length, 2, "create 与 append 各拦一次");
  for (const cmd of ["create", "append"]) {
    const at = CLI.indexOf(`await assertCliWritable(workspace, "${cmd}")`);
    const dry = CLI.indexOf(`action: "${cmd}", dryRun: true`, at - 2000);
    assert.ok(dry > -1 && dry < at, `${cmd} 的 --dry-run 早退应排在软门之前`);
  }
  const list = CLI.slice(CLI.indexOf('if (command === "list")'), CLI.indexOf('if (command === "create")'));
  assert.equal(list.includes("assertCliWritable"), false, "list 是读命令，不拦");
});

/* ---------------- ④ 文案与样式 ---------------- */

test("i18n：面板与门提示双语齐备，中文原文即 key", () => {
  const zh = json("i18n/zh_CN.json");
  const en = json("i18n/en_US.json");
  const keys = [
    "AI 通道…",
    "AI 通道",
    "四条通道共用同一套计划 DSL 与风格包",
    "关闭",
    "复制",
    "已复制",
    "已开启",
    "已关闭",
    "全关 = 白板退回纯手动模式；开关即时写入插件设置（内置智能体一栏需重载生效）",
    "内置智能体通道已开启：重载思源后注册生效",
    "内置智能体通道已关闭：重载思源后彻底摘除",
    "脚本通道已在「AI 通道」面板里关闭",
    ...CHANNEL_META.flatMap((m) => [m.title, m.desc, m.gate]),
  ];
  for (const k of keys) {
    assert.ok(k in zh, `zh_CN 缺键：${k}`);
    assert.equal(zh[k], k, `值必须等于键：${k}`);
    assert.ok(en[k] && en[k] !== k, `en_US 该是真英文：${k}`);
  }
});

test("样式：面板类名齐全，组件用到的 exs-ai-* 一个样式都不许缺", () => {
  for (const cls of ["exs-ai-scrim", "exs-ai-panel__head", "exs-ai-panel__close", "exs-ai-panel__foot",
    "exs-ai-row__nm", "exs-ai-row__ds", "exs-ai-row__gate", "exs-ai-row__sample",
    "exs-ai-badge--off", "exs-ai-sw--on"]) {
    assert.ok(CSS.includes(`.${cls}`), `样式缺：.${cls}`);
  }
  assert.match(CSS, /\.exs-root \.exs-ai-scrim \{[\s\S]{0,120}position: fixed/, "底是 fixed 全屏（零位移：不动画布布局）");
  assert.match(CSS, /\.exs-root \.exs-ai-sw--on::after \{[\s\S]{0,60}transform: translateX\(16px\)/, "开态钮右移");
  assert.match(CSS, /\.exs-root \.exs-ai-badge--off \{[\s\S]{0,160}text-decoration: line-through/, "关态徽标划掉");
  for (const cls of new Set(PANEL.match(/exs-ai-[a-z_-]+/g) ?? [])) {
    assert.ok(CSS.includes(cls), `组件用了 .${cls} 但样式没有`);
  }
});
