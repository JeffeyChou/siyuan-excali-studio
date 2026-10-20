/**
 * 第四十轮：白板链接与画布卡片。
 *
 * 分三段（沿用本仓库口径）：
 * ① 协议编解码 + 卡片几何是纯函数，node 里真断言（转义、目录白名单、备份档排除、
 *    命中测试这些判错都是无声 bug）；
 * ② 跨层接线盯**接线点**（dock 写 MIME、画布读 MIME、宿主分发白板链接、☰ 项接选择器），
 *    断言跑在去注释后的源码上；
 * ③ 文案双语齐备（中文原文即 key）。
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  BOARD_DRAG_MIME,
  BOARD_LINK_PREFIX,
  boardDisplayName,
  boardLinkOf,
  boardPathFromLink,
  boardRefFromLink,
  boardRefFromText,
  boardRefOf,
  decodeBoardDrag,
  dirRef,
  docIdFromLink,
  refInDir,
} from "../src/studio/board-lib.ts";
import {
  CARD_H,
  CARD_W,
  boardCardElements,
  boardRefAtPoint,
  clipLines,
} from "../src/studio/board-card.ts";

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
const TAB = stripComments(src("studio/tab.tsx"));
const INDEX = stripComments(src("index.ts"));
const DOCK = stripComments(src("siyuan/ExcaliDock.ts"));
const ACTIONS = stripComments(src("studio/board-actions.ts"));

/* ------------------------------ ① 协议 ------------------------------ */

test("协议：链接可逆（中文、空格、% 都要原样回来）", () => {
  for (const ref of ["assets/excali/a.svg", "assets/excali/我的 白板.svg", "assets/excali-100%.svg"]) {
    const link = boardLinkOf(ref);
    assert.ok(link.startsWith(BOARD_LINK_PREFIX), `链接前缀丢了：${link}`);
    assert.equal(boardRefFromLink(link), ref, `往返不等：${ref}`);
    assert.equal(boardPathFromLink(link), `/data/${ref}`);
  }
});

test("协议：只认 excali 族，文档链接与 http 一律 null（不许串台）", () => {
  assert.equal(boardRefFromLink("siyuan:doc/20240101120000-abcdefg"), null);
  assert.equal(docIdFromLink(boardLinkOf("assets/excali/a.svg")), null, "白板链接不能被文档解析吃掉");
  assert.equal(boardRefFromLink("https://excalidraw.com"), null);
  assert.equal(boardRefFromLink(undefined), null);
  assert.equal(boardRefFromLink(""), null);
  // 容忍 siyuan://excali/ 手写形式
  assert.equal(boardRefFromLink("siyuan://excali/assets/excali/a.svg"), "assets/excali/a.svg");
});

test("协议：boardRefOf 的结构判据（非 svg / 备份档 / 越界都拒）", () => {
  assert.equal(boardRefOf("/data/assets/excali/a.svg"), "assets/excali/a.svg");
  assert.equal(boardRefOf("assets\\excali\\a.svg"), "assets/excali/a.svg");
  assert.equal(boardRefOf("assets/excali/a.bak1.svg"), null, "备份档不该成为卡片");
  assert.equal(boardRefOf("assets/excali/a.png"), null);
  assert.equal(boardRefOf("assets/excali/../secret.svg"), null);
  assert.equal(boardRefOf(""), null);
});

test("协议：目录判据（dirRef 归一 + refInDir）", () => {
  assert.equal(dirRef("/data/assets/excali/"), "assets/excali");
  assert.equal(dirRef("assets/excali"), "assets/excali");
  assert.equal(refInDir("assets/excali/a.svg", "assets/excali"), true);
  assert.equal(refInDir("assets/other/a.svg", "assets/excali"), false);
  assert.equal(refInDir("assets/excaliali/a.svg", "assets/excali"), false, "前缀相似不算在目录内");
});

test("文本转卡片：路径 / /data 绝对 / [[…]] 都认，多行与库外不认", () => {
  const dir = "assets/excali";
  assert.equal(boardRefFromText("assets/excali/a.svg", dir), "assets/excali/a.svg");
  assert.equal(boardRefFromText("  /data/assets/excali/a.svg  ", dir), "assets/excali/a.svg");
  assert.equal(boardRefFromText("[[assets/excali/a.svg]]", dir), "assets/excali/a.svg");
  assert.equal(boardRefFromText("assets/other/a.svg", dir), null, "库外 svg 保持纯文本");
  assert.equal(boardRefFromText("第一行\nassets/excali/a.svg", dir), null, "段落不是路径");
  assert.equal(boardRefFromText(undefined, dir), null);
});

test("拖拽载荷：JSON 与裸路径都解，坏载荷回 null 交回原分支", () => {
  assert.deepEqual(decodeBoardDrag(JSON.stringify({ ref: "assets/excali/a.svg", title: "我的板" })), {
    ref: "assets/excali/a.svg",
    title: "我的板",
  });
  const bare = decodeBoardDrag("/data/assets/excali/a.svg");
  assert.equal(bare?.ref, "assets/excali/a.svg");
  assert.equal(bare?.title, "a", "标题缺失回落文件名（剥 .svg，与 boardDisplayName 同口径）");
  assert.equal(decodeBoardDrag(JSON.stringify({ ref: "a.png" })), null);
  assert.equal(decodeBoardDrag("{坏掉的 json"), null);
  assert.equal(decodeBoardDrag(""), null);
  assert.equal(decodeBoardDrag(undefined), null);
});

test("MIME 与链接前缀是常量串（外部约定，改了就断链）", () => {
  assert.equal(BOARD_DRAG_MIME, "application/x-siyuan-excali-board");
  assert.equal(BOARD_LINK_PREFIX, "siyuan:excali/");
});

/* ------------------------------ ① 卡片几何 ------------------------------ */

test("卡片：一枚带链接的矩形 + 两行无链接文字，同组", () => {
  const els = boardCardElements({ ref: "assets/excali/a.svg", title: "标题", path: "assets/excali/a.svg", x: 100, y: 50 });
  assert.equal(els.length, 3);
  const [rect, title, sub] = els;
  assert.equal(rect.type, "rectangle");
  assert.equal(rect.width, CARD_W);
  assert.equal(rect.height, CARD_H);
  assert.equal(rect.roughness, 0, "卡片是 UI 不是手绘，roughness 必须为 0");
  assert.equal(rect.link, boardLinkOf("assets/excali/a.svg"), "只有矩形带链接（↗ 徽标只出一枚）");
  assert.equal(title.link, null);
  assert.equal(sub.link, null);
  assert.equal(title.type, "text");
  assert.equal(title.text, "标题");
  const gid = String(rect.groupIds[0]);
  assert.ok(gid, "分组 id 必须有");
  for (const el of els) assert.deepEqual(el.groupIds, [gid], "三元素同组，拖动整体走");
});

test("卡片：标题最多两行、路径一行，超长处截断加省略号", () => {
  const long = "这是一块名字非常非常长的白板，长到一行放不下、两行也未必放得下";
  const els = boardCardElements({ ref: "assets/excali/a.svg", title: long, path: long, x: 0, y: 0 });
  const title = String(els[1].text);
  const sub = String(els[2].text);
  assert.equal(title.split("\n").length, 2, "标题压到两行");
  assert.ok(title.endsWith("…"), "截断要看得见：\n" + title);
  assert.equal(sub.split("\n").length, 1, "路径只给一行");
  assert.ok(sub.endsWith("…"));
  assert.equal(clipLines("短", 200, 16, 2).length, 1);
});

test("命中测试：卡片包围盒内返回 ref，盒外与非卡片元素返回 null", () => {
  const els = boardCardElements({ ref: "assets/excali/a.svg", title: "标题", path: "assets/excali/a.svg", x: 100, y: 50 });
  assert.equal(boardRefAtPoint(els, { x: 120, y: 60 }), "assets/excali/a.svg");
  assert.equal(boardRefAtPoint(els, { x: 100 + CARD_W / 2, y: 50 + CARD_H - 1 }), "assets/excali/a.svg", "点在文字行上也算命中卡片");
  assert.equal(boardRefAtPoint(els, { x: 99, y: 60 }), null);
  assert.equal(boardRefAtPoint([{ type: "rectangle", x: 0, y: 0, width: 10, height: 10, link: "https://x.com" }], { x: 5, y: 5 }), null);
  assert.equal(boardRefAtPoint([], { x: 5, y: 5 }), null);
});

/* ------------------------------ ② 接线 ------------------------------ */

test("dock：行是拖拽源，载荷写自己的 MIME + 一份 text/plain 路径", () => {
  assert.match(DOCK, /exs-lib__item\$\{open \? " is-open" : ""\}" data-file="\$\{esc\(f\.dataPath\)\}" title="\$\{esc\(f\.dataPath\)\}" draggable="true">/, "行本身可拖");
  assert.match(DOCK, /element\.addEventListener\("dragstart"/, "拖拽源用委托监听（列表每次重渲染）");
  assert.match(DOCK, /dt\.setData\("text\/plain", ref\)/, "拖去别处落下仍是可读路径");
  assert.match(DOCK, /dt\.setData\(BOARD_DRAG_MIME, JSON\.stringify\(\{ ref, title: boardDisplayName\(file\) \}\)\)/, "画布读的载荷带行上显示名");
  assert.match(DOCK, /dt\.effectAllowed = "copy"/);
});

test("画布：drop 先认白板载荷，再走图片；粘贴路径转卡片；⌘ 点整卡走链接分发", () => {
  assert.match(APP, /decodeBoardDrag\(e\.dataTransfer\?\.getData\(BOARD_DRAG_MIME\)/, "drop 的白板分支必须先于文件分支");
  assert.match(APP, /boardRefFromText\(e\.clipboardData\?\.getData\("text\/plain"\) \?\? "", boardDir\)/, "粘贴文本只在落在库内时才转卡片");
  assert.match(APP, /const ref = boardCardAt\(api\.getSceneElements\(\), at\);[\s\S]{0,160}onOpenDocLink\(boardLinkOf\(ref\)\)/, "⌘ 命中卡片后交回宿主分发");
  assert.match(APP, /window\.addEventListener\("pointerdown", onPointerDown, true\)/, "捕获阶段拦 ⌘ 点");
  assert.match(APP, /if \(!\(canvas instanceof HTMLCanvasElement\)\) return;/, "只认画布 canvas，工具条/面板不误触");
  assert.match(APP, /insertBoardCard: \(ref, title\) => \{/, "BoardActions 的插入通道接的是本地 insertCard");
  assert.match(APP, /onRunAction=\{runRailAction\}/, "右缘竖条的动作按钮接本地执行通道");
  assert.match(APP, /if \(id === INSERT_BOARD_CARD\) void insertBoardCardFlow\(\);/, "插入白板卡片在画布本地跑（自带宿主选择器）");
  assert.equal(APP.includes("onInsertBoardCard"), false, "☰ 菜单通道已撤，卡片入口只剩竖条/脚本库");
});

test("宿主：siyuan:excali 链接 → 验存在后开页签；没有活动画布时不静默", () => {
  assert.match(INDEX, /const boardPath = boardPathFromLink\(link\);[\s\S]{0,120}openLinkedBoard\(boardPath\)/, "链接分发先认白板再认文档");
  assert.match(INDEX, /if \(!\(await fileExists\(dataPath\)\)\)[\s\S]{0,160}这块白板已经不在了/, "文件没了要给明确提示");
  assert.match(INDEX, /await this\.openExisting\(dataPath\)/, "开板走 openExisting（自带去重聚焦）");
  assert.match(INDEX, /label: t\("插入到当前画布"\), click: \(\) => this\.insertBoardCardToActive\(item\)/, "行菜单入口");
  assert.match(INDEX, /actions\.insertBoardCard\(toAssetRef\(item\.dataPath\), boardDisplayName\(item\)\)/, "行菜单只传 ref + 显示名");
  assert.match(INDEX, /if \(!actions\) \{[\s\S]{0,120}先打开一块白板/, "没有活动画布时提示，不吞动作");
  assert.match(INDEX, /get boardDir\(\)[\s\S]{0,80}plugin\.settings\.saveDir/, "目录实时读设置");
  assert.match(INDEX, /pickBoardPath: \(\) => this\.pickBoardRef\(\)/, "画布用的选择器与「打开白板…」共用一条链路");
});

test("分层：白板卡片元素在 studio 层构造，宿主不碰 vendor 形状", () => {
  assert.match(ACTIONS, /insertBoardCard: \(ref: string, title: string\) => void/, "窄接口只给两个字符串参数");
  assert.equal(INDEX.includes("boardCardElements"), false, "宿主不该 import 卡片几何");
  assert.equal(TAB.includes("boardCardElements"), false, "页签层同样不碰");
  assert.match(TAB, /\| "boardDir"\n\s*\| "pickBoardPath"/, "两个新通道走 StudioProps 的 Pick");
});

/* ------------------------------ ③ 文案 ------------------------------ */

test("i18n：白板卡片词条双语齐备，中文原文即 key", () => {
  const zh = json("i18n/zh_CN.json");
  const en = json("i18n/en_US.json");
  for (const k of [
    "插入白板卡片",
    "已把路径换成白板卡片",
    "插入到当前画布",
    "先打开一块白板，再往里插卡片",
    "这块白板已经不在了：{path}",
  ]) {
    assert.ok(k in zh, `zh_CN 缺键：${k}`);
    assert.equal(zh[k], k, `值必须等于键：${k}`);
    assert.ok(en[k] && en[k] !== k, `en_US 该是真英文：${k}`);
  }
});

test("卡片显示名口径：建档用文档标题，未建档剥 .svg", () => {
  const item = { dataPath: "/data/assets/excali/a.svg", name: "a.svg", docId: "", docTitle: "", updated: 0 };
  assert.equal(boardDisplayName(item), "a");
  assert.equal(boardDisplayName({ ...item, docId: "x", docTitle: "看板" }), "看板");
});
