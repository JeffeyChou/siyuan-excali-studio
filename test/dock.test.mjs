/**
 * 2026-10-16 S2：左 Dock 契约测试（静态断言，与既有风格一致）。
 * 关注点：dock 注册参数、宿主路由（活动画布）、画布侧动作接口、分层不越界。
 * 2026-10-17 第二十轮：dock 改纯白板库——画布操作区/页脚/色板整块删除。
 * 2026-10-17 第二十二轮：复刻 kmind-zen 原生形态——头部/列表全穿思源原生类，
 * 搜索框按用户拍板删除（查询词与内存过滤一并退役），行内加悬停重命名/删除。
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const read = (rel) => readFileSync(join(HERE, "..", rel), "utf-8");

const INDEX = read("src/index.ts");
const TAB = read("src/studio/tab.tsx");
const APP = read("src/studio/StudioApp.tsx");
const DOCK = read("src/siyuan/ExcaliDock.ts");
const ACTIONS = read("src/studio/board-actions.ts");

test("index.ts：addDock 注册在同步区，位置 LeftBottom、宽度 300", () => {
  assert.match(INDEX, /this\.registerDock\(\);/, "onload 同步区要注册 dock（addDock 要求先于 await）");
  assert.match(INDEX, /position: "LeftBottom"/, "dock 停靠左下");
  assert.match(INDEX, /width: 300/, "dock 宽度 300");
  assert.match(INDEX, /type: "excali_studio_dock"/, "dock type 稳定 id");
});

test("index.ts：宿主维护活动画布路由表，页签销毁要出账", () => {
  assert.match(INDEX, /private boardActions = new Map<Custom, BoardActions>\(\)/, "每页签一份动作接口");
  assert.match(INDEX, /private activeCustom: Custom \| null = null/, "当前活动页签");
  assert.match(INDEX, /onBoardActions: \(custom, actions\)/, "注册/注销入口");
  assert.match(INDEX, /onBoardActive: \(custom\)/, "交互激活入口");
  assert.match(INDEX, /plugin\.boardActions\.delete\(this\);/, "页签销毁清动作表");
  assert.match(INDEX, /plugin\.activeCustom = null;/, "页签销毁清活动位");
});

test("dock 面板：原生形态复刻 kmind-zen（第二十二轮：原生头部 + 原生列表）", () => {
  // 头部：block__icons / block__logo / block__icon + 思源精灵图标（与 kmind-zen 同款）
  assert.match(DOCK, /block__icons/, "头部穿原生 block__icons（照 kmind-zen）");
  assert.match(DOCK, /block__logo/, "标题穿原生 block__logo");
  assert.match(DOCK, /block__icon block__icon--show/, "头部按钮穿原生 block__icon--show（常显）");
  for (const icon of ["iconAdd", "iconTrashcan", "iconRefresh", "iconEdit"]) {
    assert.match(DOCK, new RegExp(`#${icon}`), `图标走全局精灵 #${icon}（不自带 SVG）`);
  }
  // 列表：b3-list / b3-list-item--narrow / --hide-action（行内动作悬停才显）
  assert.match(DOCK, /b3-list b3-list--background/, "列表穿原生 b3-list--background");
  assert.match(DOCK, /b3-list-item--narrow/, "行穿原生窄行（通铺）");
  assert.match(DOCK, /b3-list-item--hide-action/, "行内动作悬停才显（原生行为）");
  assert.match(DOCK, /b3-list-item__text/, "行标题穿原生 __text（截断走原生 ellipsis）");
  // 三个头部动作 + 两个行内动作
  for (const act of ["new", "delete-active", "lib-refresh", "row-rename", "row-delete"]) {
    assert.match(DOCK, new RegExp(`data-act="${act}"`), `缺动作入口：${act}`);
  }
  // 搜索框按用户拍板删除（纯复刻）：输入框、查询词、内存过滤一并退役
  assert.equal(DOCK.includes("lib-search"), false, "搜索框已删（纯复刻 kmind-zen）");
  assert.equal(DOCK.includes("libQuery"), false, "查询词状态随搜索框删除");
  assert.equal(DOCK.includes("filterBoardFiles"), false, "dock 不再内存过滤（board-lib 死函数一并删）");
  // 旧自绘部件不回归
  assert.equal(DOCK.includes("exs-dock__libhead"), false, "旧自绘头部已删");
  assert.equal(DOCK.includes("exs-lib__title"), false, "旧两行排版已删");
  assert.equal(DOCK.includes("exs-dock__swatch"), false, "背景色板已删（☰ 有内置 ChangeCanvasBackground）");
  assert.equal(DOCK.includes('data-act="insertDoc"'), false, "插入到当前文档随功能删除");
  assert.equal(DOCK.includes('data-act="insertCard"'), false, "插入文档卡随功能删除");
  assert.equal(DOCK.includes('data-act="reset"'), false, "重置画布随画布区删除（☰ 有内置 ClearCanvas）");
  assert.equal(DOCK.includes("exs-dock__foot"), false, "页脚已删：脚本/帮助进 ☰，设置留在顶栏菜单");
});

test("dock 面板：行内重命名/删除复用右键菜单的宿主链路（不另起炉灶）", () => {
  assert.match(DOCK, /renameBoardFile: \(item: BoardFileItem\) => void;/, "DockHost 声明行内重命名通道");
  assert.match(DOCK, /deleteBoardFile: \(item: BoardFileItem\) => void;/, "DockHost 声明行内删除通道");
  assert.match(INDEX, /renameBoardFile: \(item\) => void plugin\.renameFromDock\(item\)/, "行内重命名 = 右键菜单同一条链路");
  assert.match(INDEX, /deleteBoardFile: \(item\) => void plugin\.deleteBoardFile\(item\)/, "行内删除 = 右键菜单同一条链路");
  // 点击路由：按钮必须先于行拦下来，否则点行内按钮会顺手把画板也开了
  assert.match(DOCK, /const btn = target\.closest<HTMLElement>\("\[data-act\]"\);/, "点击先认按钮");
  assert.match(DOCK, /const row = target\.closest<HTMLElement>\("\.exs-lib__item"\);/, "再落到行（开画板）");
});

test("画布侧：BoardActions 窄接口只剩 getEaHandle/flush/insertBoardCard + 注册/激活两通道", () => {
  for (const m of ["getEaHandle:", "flush:", "insertBoardCard:"]) {
    assert.ok(ACTIONS.includes(m), `BoardActions 缺方法：${m}`);
  }
  for (const gone of [
    "save:",
    "saveToDoc:",
    "exportImage:",
    "insertToActiveDoc:",
    "insertCard:",
    "resetCanvas:",
    "setBackground:",
    "getBackground:",
    "getTitle:",
    "getStatus:",
  ]) {
    assert.equal(ACTIONS.includes(gone), false, `BoardActions 多出死方法：${gone}`);
  }
  assert.match(INDEX, /save: \(\) => void plugin\.activeActions\(\)\?\.flush\(\)/, "ea 脚本的保存通道 = 立即冲刷（第二十一轮起无保存菜单）");
  assert.match(APP, /registerActions\(actions\)/, "挂载即注册");
  assert.match(APP, /return \(\) => registerActions\(null\)/, "卸载即注销");
  assert.match(APP, /onBoardActive\(\);/, "每次 onChange 上报活跃");
  assert.match(
    TAB,
    /registerActions=\{\(actions\) => \{[\s\S]*?actionsRef\.current = actions;[\s\S]*?host\.onBoardActions\(custom, actions\);/,
    "页签层转注册（第十二轮起另留 holder，供关前冲刷）",
  );
  assert.match(TAB, /onBoardActive=\{\(\) => host\.onBoardActive\(custom\)\}/, "页签层转激活");
});

test("分层：dock/宿主不 import 画布组件，画布不 import 思源 API", () => {
  assert.equal(DOCK.includes('from "@excalidraw'), false, "dock 层不依赖 Excalidraw");
  assert.equal(APP.includes('from "siyuan"'), false, "React 树零思源 API 的约定不变");
});
