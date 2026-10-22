/**
 * 2026-10-17 第十八轮：白板库（文件形态）+ 建档门控 + 删除链路。
 * 纯函数（文件↔文档绑定/显示名/指纹/删除计划）在 studio/board-lib.ts 真断言；
 * 宿主与 dock 的接线（门控、菜单、缓存、删除顺序）照本仓惯例文本扫描。
 * 2026-10-17 第二十二轮：dock 搜索框删除，filterBoardFiles（内存过滤）随之退役。
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  boardDisplayName,
  boardDocPath,
  countBacklinks,
  deletePlanOf,
  embedRef,
  fileLibViewKey,
  inlineRef,
  parseSiyuanStamp,
  toBoardDocItem,
  toBoardFileItems,
} from "../src/studio/board-lib.ts";
import { DEFAULT_SETTINGS, normalizeSettings } from "../src/studio/settings.ts";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(resolve(ROOT, rel), "utf8");
const stripComments = (code) => code.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'\\])\/\/[^\n]*/g, "$1");

const INDEX = stripComments(read("src/index.ts"));
const DOCK = stripComments(read("src/siyuan/ExcaliDock.ts"));
const DOC = stripComments(read("src/siyuan/doc.ts"));
const TAB = stripComments(read("src/studio/tab.tsx"));
const IO = stripComments(read("src/kernel/io.ts"));

/* ------------------------------ 行为：纯函数 ------------------------------ */

test("parseSiyuanStamp：14 位给时刻、8 位给零点、其余归 0", () => {
  const full = parseSiyuanStamp(20261016123045);
  const d = new Date(full);
  assert.equal(`${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`, "20261016");
  assert.equal(d.getHours(), 12);
  assert.equal(d.getMinutes(), 30);
  const day = parseSiyuanStamp(20261016);
  const dd = new Date(day);
  assert.equal(dd.getDate(), 16);
  assert.equal(dd.getHours(), 0);
  // epoch 毫秒误传、0、NaN 都不算号
  assert.equal(parseSiyuanStamp(1760000000000), 0);
  assert.equal(parseSiyuanStamp(0), 0);
  assert.equal(parseSiyuanStamp(Number.NaN), 0);
});

test("countBacklinks：按去重 root_id 计，脏输入一律 0", () => {
  const same = JSON.stringify({ blocks: { a: { root_id: "r1" }, b: { root_id: "r1" } } });
  assert.equal(countBacklinks(same), 1, "同一篇文档引三个块也只算一篇");
  const two = JSON.stringify({ blocks: { a: { root_id: "r1" }, b: { root_id: "r2" } } });
  assert.equal(countBacklinks(two), 2);
  assert.equal(countBacklinks(""), 0);
  assert.equal(countBacklinks("{oops"), 0);
  assert.equal(countBacklinks(JSON.stringify({ blocks: { a: {} } })), 0, "缺 root_id 不计");
});

test("toBoardDocItem：标题回落、时间解析、引用数换算一步到位", () => {
  const item = toBoardDocItem({
    id: "doc1",
    content: "",
    hpath: "/Excali 白板/架构",
    updated: 20261016123045,
    refs: JSON.stringify({ blocks: { a: { root_id: "x" } } }),
    svg: "assets/excali-1.svg",
  });
  assert.equal(item.docId, "doc1");
  assert.equal(item.title, "无标题");
  assert.equal(item.refs, 1);
  assert.ok(item.updated > 0);
});

test("toBoardFileItems：按 /data 归一路径配文档，保序；未绑定 docId 为空", () => {
  const entries = [
    { path: "assets/a.svg", updated: 3 },
    { path: "assets/b.svg", updated: 2 },
    { path: "/data/assets/c.svg", updated: 1 },
  ];
  const docs = [
    { docId: "d1", title: "架构图", hpath: "", svg: "assets/a.svg", updated: 0, refs: 0 },
    { docId: "d2", title: "丢了", hpath: "", svg: "assets/gone.svg", updated: 0, refs: 0 },
  ];
  const items = toBoardFileItems(entries, docs);
  assert.deepEqual(
    items.map((x) => [x.dataPath, x.docId, x.docTitle]),
    [
      ["/data/assets/a.svg", "d1", "架构图"],
      ["/data/assets/b.svg", "", ""],
      ["/data/assets/c.svg", "", ""],
    ],
  );
  assert.deepEqual(
    items.map((x) => x.updated),
    [3, 2, 1],
    "保持 readDir 的新→旧序，不做二次排序",
  );
  // 绑定失效（文档在、文件不在）不该把文件从库里抹掉
  assert.equal(items.length, 3);
});

test("boardDisplayName：已建档用文档标题，未建档剥 .svg 用文件名", () => {
  assert.equal(
    boardDisplayName({ dataPath: "/data/assets/a.svg", name: "a.svg", docId: "d", docTitle: "架构 总览", updated: 0 }),
    "架构 总览",
  );
  assert.equal(
    boardDisplayName({ dataPath: "/data/assets/b.svg", name: "excali-1016.svg", docId: "", docTitle: "", updated: 0 }),
    "excali-1016",
  );
});

test("fileLibViewKey：打开态/绑定/时间任一变化都要变；同名不同路径不撞", () => {
  const item = { dataPath: "/data/assets/a.svg", name: "a.svg", docId: "", docTitle: "", updated: 1 };
  const k1 = fileLibViewKey([item], new Set());
  assert.notEqual(k1, fileLibViewKey([item], new Set(["/data/assets/a.svg"])), "已打开徽标翻转必须触发重渲染");
  assert.notEqual(k1, fileLibViewKey([{ ...item, docId: "d1" }], new Set()), "建档徽标翻转也要变");
  assert.notEqual(k1, fileLibViewKey([{ ...item, updated: 2 }], new Set()), "修改时间变化也要变");
  assert.notEqual(
    fileLibViewKey([item], new Set()),
    fileLibViewKey([{ ...item, dataPath: "/data/assets/b.svg" }], new Set()),
    "不同路径是同值跳过的底线，不能撞指纹",
  );
});

test("boardDocPath：目录写法归一；空标题回落未命名白板", () => {
  assert.equal(boardDocPath("/Excali 白板", "架构"), "/Excali 白板/架构");
  assert.equal(boardDocPath("Excali 白板/", "架构"), "/Excali 白板/架构");
  assert.equal(boardDocPath("", "架构"), "/架构");
  assert.equal(boardDocPath("/Excali 白板", "  "), "/Excali 白板/未命名白板");
});

test("deletePlanOf：删文件 + 备份 + 绑定文档；未建档没有文档项", () => {
  const bound = deletePlanOf({
    dataPath: "/data/assets/a.svg",
    name: "a.svg",
    docId: "d1",
    docTitle: "架构图",
    updated: 0,
  });
  assert.equal(bound.svgPath, "/data/assets/a.svg");
  assert.deepEqual(
    bound.bakPaths,
    ["/data/assets/a.svg.bak.svg", "/data/assets/a.svg.bak2.svg", "/data/assets/a.svg.bak3.svg"],
    "第十九轮：备份滚动三份，删除计划列全链条",
  );
  assert.deepEqual(bound.doc, { id: "d1", title: "架构图" });
  const loose = deletePlanOf({ dataPath: "/data/assets/b.svg", name: "b.svg", docId: "", docTitle: "", updated: 0 });
  assert.equal(loose.doc, null, "未建档的板只删文件，不动文档树");
});

test("embedRef/inlineRef：嵌入只能裸 id，别名只进行内引用且剥引号换行", () => {
  // 内核事实：块嵌入 ![[块ID]] 不支持自定义显示文本（demo 里 ![[id "标题"]] 是假口径）
  assert.equal(embedRef("20261016123045-abc123"), "![[20261016123045-abc123]]");
  assert.equal(inlineRef("doc1", "架构 总览"), '((doc1 "架构 总览"))');
  assert.equal(inlineRef("doc1", '带"引号\n和换行'), '((doc1 "带 引号 和换行"))', "别名里的引号/换行会截断 md 解析，必须先洗掉");
  assert.equal(inlineRef("doc1", ""), '((doc1 ""))');
  assert.ok(!embedRef("x").includes("x "), "嵌入形式不带任何多余字符");
});

/* ------------------------------ 行为：设置默认值 ------------------------------ */

test("第十八轮默认值：建档关、自动开板关（文档树弱化为存档层）", () => {
  assert.equal(DEFAULT_SETTINGS.autoCreateDoc, false, "首存不再自动建文档，文档树零痕迹");
  assert.equal(DEFAULT_SETTINGS.autoOpenBoard, false, "切文档安安静静看文档，不弹画板页签");
  assert.equal(normalizeSettings({}).autoCreateDoc, false, "脏数据/空数据都归一到关");
  assert.equal(normalizeSettings({ autoCreateDoc: true }).autoCreateDoc, true, "用户开过就尊重");
  assert.equal(normalizeSettings({ autoOpenBoard: true }).autoOpenBoard, true, "老用户存过的 true 不被默认值覆盖");
});

/* ------------------------------ 接线：宿主 ------------------------------ */

test("宿主：库缓存两条腿——SQL 取绑定、readDir 取文件，合并喂 dock；两段容错互不牵连", () => {
  assert.match(DOC, /a\.name = 'custom-excali-svg'/, "listBoardDocs 走 attributes JOIN");
  assert.match(DOC, /b\.type = 'd'/, "只取文档块");
  assert.equal(/b\.refs/.test(DOC), false, "第二十四轮回归锁：当前内核 blocks 没有 refs 列，SQL 带上它整条查询就炸，白板库从此不刷新（真机日志实锤 ×19）");
  assert.match(INDEX, /docs = \(await listBoardDocs\(\)\)\.map\(toBoardDocItem\);/, "SQL 行 → 文档项在纯模块做");
  assert.match(INDEX, /entries = await listBoardEntries\(this\.settings\.saveDir\);/, "文件列表读保存目录");
  assert.match(INDEX, /this\.boardFiles = toBoardFileItems\(entries, docs\);/, "目录扫描结果 + 绑定 = 库列表（第二十五轮：目录即库，无登记表）");
  assert.match(INDEX, /this\.boardSvgByDocId = new Map\(docs\.map\(\(d\) => \[d\.docId, d\.svg\]\)\);/, "文档→svg 反查表同步重建");
  // 容错分层：SQL 挂只伤徽标层，readDir 挂保留上一次列表——两者都不许再打死整条刷新
  const at = INDEX.indexOf("private async refreshBoardLib");
  assert.ok(at > 0, "refreshBoardLib 入口存在");
  const body = INDEX.slice(at, at + 1600);
  assert.match(body, /白板文档查询失败[\s\S]*?白板库读保存目录失败/, "两段各有 catch，顺序：先 SQL 后 readDir");
  assert.match(body, /docs = this\.boardDocs;/, "SQL 挂就沿用上次绑定，不是清空");
  assert.match(body, /if \(entries\) this\.boardFiles =/, "readDir 挂就不动列表（entries 为 null 不赋值）");
  assert.match(body, /finally \{\s*this\.libLoading = false;/, "防重入标志整轮结束才复位");
});

test("宿主：新建建档受 autoCreateDoc 门控（默认关 = 只落空文件）", () => {
  assert.match(INDEX, /this\.settings\.autoCreateDoc\s*\n?\s*\? await this\.adoptBoardFile\(\{/, "createBoardFile 里按开关走 adoptBoardFile（第二十一轮：建档语义从首存变新建）");
  assert.match(INDEX, /const title = item\.name\.replace\(\/\\\.svg\$\/i, ""\)/, "文档标题从文件名剥 .svg（避重后缀一并带上，与文件名成对）");
  assert.match(INDEX, /boardDocPath\(this\.settings\.boardDir, title\)/);
  assert.match(INDEX, /currentNotebook\(\)\) \?\? \(await firstNotebook\(\)\)/, "当前文档查不到就回落第一个笔记本");
  assert.match(INDEX, /建档失败：\{msg\}/, "建档失败只提示，不崩创建流程（文件照样落盘）");
});

test("宿主：建档手工记账进缓存，文件项同步补「已建档」", () => {
  assert.match(INDEX, /rememberBoardDoc\(docId, title, ref\);/, "建档后记账（不等即时 SQL）");
  assert.match(INDEX, /f\.dataPath === dataPath \? \{ \.\.\.f, docId, docTitle: title \|\| t\("无标题"\) \} : f/, "文件项补绑定，徽标即时可见");
});

test("宿主：删除链路 = 先关页签（不冲刷）→ 删文件/备份/文档 → 缓存出账", () => {
  assert.match(INDEX, /if \(s\.data\.dataPath === item\.dataPath\) s\.closeForDelete\(\);/, "开着的页签先关，且不等冲刷");
  assert.match(INDEX, /await removeSvg\(plan\.svgPath\);/, "删工程文件");
  assert.match(INDEX, /for \(const bak of plan\.bakPaths\)[\s\S]{0,120}await removeSvg\(bak\);/, "第十九轮：备份逐档删，每档都可能不存在");
  assert.match(INDEX, /await removeDoc\(plan\.doc\.id\);/, "有绑定文档时连文档一起删");
  assert.match(INDEX, /this\.boardFiles = this\.boardFiles\.filter\(\(f\) => f\.dataPath !== item\.dataPath\);/, "文件列表出账");
  assert.match(INDEX, /this\.boardDocs = this\.boardDocs\.filter\(\(d\) => d\.docId !== plan\.doc\?\.id\);/, "文档列表出账");
  assert.match(INDEX, /deletePlanOf\(item\)/, "确认框列单走纯函数，删前列全");
  assert.match(INDEX, /删除不可恢复/, "确认框明示不可恢复");
  assert.match(DOC, /export async function removeDoc/, "removeDoc 封装在 doc.ts");
});

test("宿主：页签侧 closeForDelete 不冲刷、不弹确认（删除已确认过）", () => {
  assert.match(TAB, /closeForDelete: \(\) => void/, "会话暴露删除用关闭");
  assert.match(TAB, /skipDisposeFlush = true;[\s\S]{0,60}tab\.close\(\);/, "跳过 dispose 兜底 flush，避免把场景写回即将删除的文件");
});

test("宿主：deleteActiveBoard 只对活动画布有意义，其余现刷库再找", () => {
  assert.match(INDEX, /private deleteActiveBoard\(\): void \{/, "dock 头部「－」入口");
  assert.match(INDEX, /this\.tabs\.get\(this\.activeCustom\)\?\.data\.dataPath/, "当前活动画布的路径");
  assert.match(INDEX, /没有可删除的白板：当前没有打开已保存的白板/, "没开板时给提示，不静默");
  assert.match(INDEX, /void this\.refreshBoardLib\(\)\.then\(\(\) => \{/, "缓存没命中（刚保存的板）现刷一次再找");
});

test("宿主：行右键菜单 = siyuan Menu 全套动作，面板零 siyuan import", () => {
  assert.match(INDEX, /import \{[^}]*\bMenu\b[^}]*\} from "siyuan"/, "Menu 从 siyuan 导入");
  assert.match(INDEX, /new Menu\("excali-file-menu"\)/);
  assert.match(INDEX, /label: t\("建档"\), click: \(\) => void this\.adoptBoardFile\(item\)/, "未建档给建档");
  assert.match(INDEX, /label: t\("打开存档文档"\)/, "已建档给打开文档");
  assert.match(INDEX, /embedRef\(item\.docId\)/, "嵌入项复制裸 ![[id]]");
  assert.match(INDEX, /inlineRef\(item\.docId, item\.docTitle\)/, "行内项带标题别名");
  assert.match(INDEX, /label: t\("删除…"\), click: \(\) => void this\.deleteBoardFile\(item\)/, "删除走确认框");
  assert.equal(DOCK.includes('from "siyuan"'), false, "库数据与菜单全走 DockHost 接口，面板不 import 思源 API");
});

test("宿主：重命名后同步 custom-excali-svg + 开着的页签会话跟位", () => {
  assert.match(INDEX, /renameBoard[\s\S]*?重命名后同步白板绑定失败/, "renameBoard 里有 setBlockAttrs 兜同步");
  assert.match(INDEX, /renameBoard[\s\S]*?void this\.refreshBoardLib\(\);/, "改名后全量重同步列表");
  assert.match(INDEX, /private applyRenameToSession\(oldPath: string, newPath: string\): void \{/, "dock 发起改名要自己接住会话");
  assert.match(INDEX, /s\.data\.dataPath = newPath;[\s\S]{0,80}s\.tab\.updateTitle\(fileNameOf\(newPath\)\);/, "页签 data/标题跟上，去重才继续成立");
});

test("批3 守卫：总开关 + 每会话一次（先占位）+ 负缓存", () => {
  assert.match(INDEX, /if \(!this\.settings\.autoOpenBoard\) return;/, "守卫①设置开关");
  assert.match(INDEX, /if \(this\.autoOpenedDocs\.has\(rootID\)\) return;[\s\S]*?this\.autoOpenedDocs\.add\(rootID\);/, "守卫②先占位：失败也不再重来");
  assert.match(INDEX, /getBlockAttrs\(rootID\)\)\["custom-excali-svg"\] \|\| "";/, "现查一次并写负缓存");
  assert.match(INDEX, /boardSvgByDocId\.set\(rootID, svg\);/, "非白板文档记成空串，只查一次");
});

test("批3 注入：doctree 走元素属性判型，filetab 强转 + try/catch", () => {
  assert.match(INDEX, /"switch-protyle"/, "切文档事件");
  assert.match(INDEX, /"open-menu-doctree"/);
  assert.match(INDEX, /getAttribute\("data-type"\) !== "navigation-file"/, "B94 教训：detail.type 不可靠");
  assert.match(INDEX, /getAttribute\("data-node-id"\)/);
  assert.match(INDEX, /"open-menu-filetab"/, "文件页签右键（不在 siyuan.d.ts，强转挂）");
  assert.match(INDEX, /文件页签菜单注入失败/, "filetab 整体 try/catch");
  assert.match(INDEX, /open-menu-doctree[\s\S]*?在画板中打开/, "菜单项同步 addItem，label 过 t()");
});

test("批3 设置页：白板目录 + 自动开板 + 自动建档，confirmCallback 统一收口", () => {
  assert.match(INDEX, /boardDir: boardDirEl\?\.value \?\? this\.settings\.boardDir,/);
  assert.match(INDEX, /autoOpenBoard: autoOpenEl\?\.checked \?\? this\.settings\.autoOpenBoard,/);
  assert.match(INDEX, /autoCreateDoc: autoCreateDocEl\?\.checked \?\? this\.settings\.autoCreateDoc,/);
  assert.match(INDEX, /t\("新建时自动建档"\)/, "设置项标题（第二十一轮随文件先行改名）");
});

/* ------------------------------ 接线：dock 面板 ------------------------------ */

test("dock：原生形态复刻 kmind-zen——原生头部 + 原生列表（搜索框已删）", () => {
  assert.match(DOCK, /data-act="new"/, "＋新建在库头部");
  assert.match(DOCK, /data-act="delete-active"/, "删除当前白板在库头部");
  assert.match(DOCK, /data-act="lib-refresh"/, "⟳刷新");
  assert.match(DOCK, /data-role="liblist"/);
  assert.equal(DOCK.includes('data-role="lib-search"'), false, "第二十二轮：搜索框按用户拍板删除（纯复刻）");
  assert.equal(DOCK.includes("filterBoardFiles"), false, "内存过滤随搜索框退役，board-lib 不留死函数");
  assert.equal(DOCK.includes('data-role="canvas"'), false, "第二十轮：画布操作区整块删除");
  assert.equal(DOCK.includes("exs-dock__foot"), false, "页脚（脚本/设置/帮助）已移出：脚本进 ☰、帮助进 ☰、设置在顶栏");
  assert.equal(DOCK.includes("exs-dock__swatch"), false, "背景色板已删（☰ 有 ChangeCanvasBackground）");
  assert.match(DOCK, /data-role="del-active"[\s\S]*?disabled/, "删除按钮初始禁用（没有打开的白板）");
  assert.match(DOCK, /delActiveBtn\.disabled = !host\.hasActiveBoard\(\);/, "置灰态走窄接口，只随结构事件变");
  assert.match(DOCK, /t\("已建档"\)/, "建档徽标");
  assert.match(DOCK, /fileLibViewKey\(view\.files, view\.opened\)/, "指纹含打开态与绑定");
  assert.match(DOCK, /t\("已打开"\)/);
  assert.match(DOCK, /const refresh = \(\): void => \{\s*renderLib\(\);/, "refresh 只刷库 + 置灰态，没有每帧状态路径");
});

test("dock：单击开画板、右键行进宿主菜单、双击开文档，均经窄接口", () => {
  assert.match(DOCK, /host\.openBoardFile\(file\)/);
  assert.match(DOCK, /host\.openFileMenu\(file, e\.clientX, e\.clientY\)/);
  assert.match(DOCK, /e\.preventDefault\(\);/, "挡掉浏览器/dock 默认上下文菜单");
  assert.match(DOCK, /libFiles\.find\(\(f\) => f\.dataPath === row\.dataset\.file\)\?\.docId/, "双击只对已建档的行开文档");
  assert.match(DOCK, /host\.deleteActiveBoard\(\)/);
  assert.equal(DOCK.includes('from "@excalidraw'), false);
});

/* ------------------------------ 接线：批4 复制引用 + 体检 ------------------------------ */

test("批4 ☰ 复制引用：docId 先取页签数据、缺了按 svg 反查；未建档只提示不静默", () => {
  assert.match(TAB, /onCopyBoardRef=\{\(\) => host\.copyBoardRef\(custom\)\}/, "渲染时闭包补 custom");
  assert.match(INDEX, /session\.data\.docId \?\? \(path \? this\.boardDocs\.find\(\(d\) => toDataPath\(d\.svg\) === path\)\?\.docId : undefined\)/, "旧会话恢复的页签没存 docId → 反查库缓存");
  assert.match(INDEX, /还没建档，复制不了引用：在白板行右键「建档」/, "未建档给出可操作的提示");
});

test("批4 体检：防重入 + 先刷库 + fileExists 逐个查；只报断链（未建档不是问题）", () => {
  assert.match(INDEX, /if \(this\.checkupRunning\) return;/);
  assert.match(INDEX, /runCheckup[\s\S]*?await this\.refreshBoardLib\(\);/, "体检先全量刷新库");
  assert.match(INDEX, /if \(!\(await fileExists\(toDataPath\(d\.svg\)\)\)\) missing\.push\(d\);/, "断链 = 绑定的 svg 读不到");
  assert.match(INDEX, /断链文档：\{n\}/);
  assert.match(INDEX, /体检完成：没有断链的白板文档/, "全好的口径");
  assert.equal(INDEX.includes("孤儿 SVG"), false, "文件即白板，没有孤儿概念了");
  assert.match(INDEX, /t\("开始体检"\)/, "设置页按钮");
});

/* ------------------------------ 第二十五轮：专属目录 ------------------------------ */

test("专属目录：默认 assets/excali，库只扫这个目录；登记表退役", () => {
  assert.equal(DEFAULT_SETTINGS.saveDir, "assets/excali", "默认落点必须是专属目录（assets 根目录是所有图片的公共池）");
  assert.equal(INDEX.includes("boardRegistry"), false, "登记表已退役：宿主不许再有登记表");
  assert.equal(INDEX.includes("boards: [...this.boardRegistry]"), false, "持久化不再写 boards");
  assert.match(INDEX, /this\.settings = \{ \.\.\.this\.settings, saveDir: DEDICATED_BOARD_DIR \};/, "迁移完成把保存目录指到专属目录");
  assert.match(INDEX, /this\.dirMigrated = failed\.length === 0;/, "部分失败不置完成标记，下次启动补搬");
  assert.match(INDEX, /migrationCandidates\(\{/, "候选只走四条真源");
  assert.match(INDEX, /recent: this\.recent,[\s\S]{0,120}registry: this\.legacyBoards,[\s\S]{0,120}docSvgs:/, "recent/旧登记表/文档绑定都进候选");
  assert.match(INDEX, /isAutoNamedBoard\(fileNameOf\(p\)\)/, "自动命名扫描");
  assert.match(INDEX, /renameSvg\(old, await uniqueTargetPath\(DEDICATED_BOARD_DIR, fileNameOf\(old\)\)\)/, "搬文件带 .bak 链、撞名避重");
  assert.match(INDEX, /await setBlockAttrs\(d\.id, \{ "custom-excali-svg": toAssetRef\(next\) \}\)/, "文档绑定跟到新路径");
  assert.match(INDEX, /this\.recent = remapPaths\(this\.recent, remap\)/, "recent 跟到新路径");
});

test("恢复页签旧路径：读盘失败换到保存目录同名文件，并把页签数据跟位", () => {
  assert.match(TAB, /const remapped = await host\.remapPath\(data\.dataPath\);/, "只在读盘失败后试新路径");
  assert.match(TAB, /data\.dataPath = remapped;/, "页签数据跟位（否则下次保存写回旧路径）");
  assert.match(INDEX, /remapPath: \(dataPath\) => this\.remapBoardPath\(dataPath\)/, "宿主窄接口接线");
  assert.match(INDEX, /joinSavePath\(this\.settings\.saveDir, fileNameOf\(old\)\)/, "按文件名到保存目录找");
});

test("第二十五轮：搬家/改名把正文里的图片引用一起改（否则建档文档断图）", () => {
  assert.match(DOC, /export async function rewriteAssetRefs\(oldRef: string, newRef: string\)/, "文档层提供引用改写");
  assert.match(DOC, /content LIKE '\$\{sq\(pattern\)\}' ESCAPE/, "按 blocks.content 找引用，LIKE 通配符要转义");
  assert.match(DOC, /getBlockKramdown/, "取正文再替换（updateBlock 只吃 markdown）");
  assert.match(DOC, /kramdown\.split\(oldRef\)\.join\(newRef\)/, "全量替换同一路径的每处引用");
  assert.match(INDEX, /rewriteAssetRefs\(toAssetRef\(old\), toAssetRef\(saved\)\)/, "迁移搬完文件即改正文引用");
  assert.match(INDEX, /rewriteAssetRefs\(toAssetRef\(oldData\), toAssetRef\(saved\)\)/, "重命名同样改正文引用（老缺口一并补上）");
});

/* ------------------------------ 接线：第十九轮 BAK 纪律 + 恢复入口 ------------------------------ */

test("第五十四轮：备份链退役——写侧不再产生 .bak，读侧留着收拾存量", () => {
  const STORAGE = stripComments(read("src/studio/storage.ts"));
  assert.equal(
    /writeBackup/.test(STORAGE + stripComments(read("src/kernel/io.ts")) + stripComments(INDEX)),
    false,
    "写备份的出口整个删掉，不留调用不到的死代码",
  );
  assert.equal(
    /keepBackup/.test(read("src/studio/settings.ts") + stripComments(INDEX)),
    false,
    "设置项一并撤掉（normalizeSettings 是白名单，旧档里的 keepBackup 键会被静默丢掉）",
  );
  assert.match(STORAGE, /export const BACKUP_KEEP = 3;/, "链条命名口径留着，服务老用户库里的存量档");
  assert.match(STORAGE, /!isBackupPath\(r\.name\)/, "白板库列表仍排除备份档");
  assert.match(STORAGE, /for \(let slot = 1; slot <= BACKUP_KEEP; slot\+\+\)/, "重命名仍把存量链整排搬走（留下就是孤档）");
  assert.match(INDEX, /for \(const bak of plan\.bakPaths\)/, "删除白板仍扫一遍存量档");
});

test("保存去重：正文逐字 + 载荷语义两道门（前端 + 内核同口径）", () => {
  assert.match(
    INDEX,
    /if \(current !== null && sceneTextsEquivalent\(current, svgText\)\) return \{ path: currentPath \};/,
    "自动保存：语义等价就不落盘（归一化的字节差不再刷 mtime / 惊动同步）",
  );
  assert.match(IO, /if \(current !== null && sceneTextsEquivalent\(current, text\)\) return;/, "内核写盘同口径");
  const CODEC = stripComments(read("src/studio/scene-codec.ts"));
  assert.match(CODEC, /export function sceneTextsEquivalent/, "比较是纯函数，能真断言");
  assert.match(CODEC, /if \(a === b\) return true;/, "逐字相等先短路，不白解两次载荷");
  assert.match(CODEC, /key === "boundElements" && Array\.isArray\(v\) && v\.length === 0/, "归一化主产物：空 boundElements 等同缺键");
});

test("第十九轮 D·重名避重：探重逻辑在 storage.ts，两条可输名的路径都走它", () => {
  const STORAGE = stripComments(read("src/studio/storage.ts"));
  assert.match(STORAGE, /for \(let i = 0; i < 50; i\+\+\)/, "逐档探存在性");
  assert.match(STORAGE, /i === 0 \? fileName : `\$\{base\}_\$\{i - 1\}\.svg`/, "Obsidian getNewUniqueFilepath 的 _0/_1 语义（首撞是 _0 不是 _1）");
  assert.match(STORAGE, /if \(exclude && cand === exclude\) return cand;/, "改名撞自己不算撞");
  assert.match(STORAGE, /if \(!\(await fileExists\(cand\)\)\) return cand;/, "第一个空位即停");
  // 第二十一轮：新建（createBoardFile）与改名（renameBoard）都接上；覆盖保存只盖自己，不探重
  assert.match(INDEX, /const target = await uniqueTargetPath\(this\.settings\.saveDir, sanitizeFileName\(name, t\("未命名白板"\)\)\);/);
  assert.match(INDEX, /const target = await uniqueTargetPath\(this\.settings\.saveDir, sanitizeFileName\(newName\), oldData\);/);
  assert.equal(INDEX.includes("const target = currentPath ?? joinSavePath"), false, "旧的直拼路径不许残落在保存链路上，否则避重被旁路");
});

test("第十九轮：宿主恢复通道按链新→旧走，验过内容才盖回", () => {
  assert.match(INDEX, /restoreFromBackup: \(dataPath\) => this\.restoreFromBackup\(dataPath\)/, "host 接线在页签注册处");
  assert.match(INDEX, /for \(const bak of backupChainOf\(target\)\)/, "新→旧逐档试");
  assert.match(INDEX, /if \(!hasNonEmptyScene\(text\)\) continue;/, "坏档也滚动得进来：拿到不等于能用");
  assert.match(INDEX, /putSvg\(target, text\);[\s\S]{0,120}return true;/, "写回原路径才算恢复");
});

test("第十九轮：解码失败页有「从备份恢复」，恢复成功重走同一条 open", () => {
  assert.match(TAB, /restoreFromBackup: \(dataPath: string\) => Promise<boolean>;/, "宿主窄接口");
  assert.match(TAB, /host\.restoreFromBackup\(data\.dataPath\)/);
  assert.match(TAB, /t\("从备份恢复"\)/);
  assert.match(TAB, /t\("没有找到可用的备份"\)/, "全链没好档要给可见提示");
  assert.match(TAB, /await open\(\);/, "恢复后不用关页签重开");
  assert.match(TAB, /if \(!data\.dataPath \|\| restoring\) return;/, "新建板没路径不显按钮，点击不重入");
});
