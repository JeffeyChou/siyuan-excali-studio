// 「打开白板…」选择器（第十三轮）：搜索文件名 + 修改时间 + 已打开标记。
//
// 分层：纯逻辑（时间文案 / 关键字过滤）在 studio/board-list.ts，node 直接 import 跑真断言；
// 对话框接线（siyuan/board-picker.ts 带 Dialog 依赖）只能文本扫描。
// 三个最容易改坏的不变量：
//   ① 过滤是纯内存的（列表传进来就是完整一份），别在这里偷加内核查询；
//   ② IME 守卫 + 120ms 防抖与选文档框同手感：组字期不重渲染、组字结束补一次；
//   ③ 「已打开」判定必须把条目路径归一（toDataPath）再比会话表——页签里的
//      data.dataPath 是 /data/... 形式，两边不归一就永远标不上。
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { boardTimeText, filterBoardEntries } from "../src/studio/board-list.ts";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const src = (rel) => readFileSync(resolve(ROOT, "src/" + rel), "utf8");
const stripComments = (code) => code.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'\\])\/\/[^\n]*/g, "$1");

const BOARD_LIST = stripComments(src("studio/board-list.ts"));
const BOARD_PICKER = stripComments(src("siyuan/board-picker.ts"));
const STORAGE = stripComments(src("studio/storage.ts"));

/* ------------------------------ 行为：时间文案 ------------------------------ */

test("boardTimeText：今天/昨天说人话，旧事给日期，跨年补年份", () => {
  const now = new Date(2026, 9, 16, 12, 0, 0);
  assert.equal(boardTimeText(new Date(2026, 9, 16, 9, 5).getTime(), now), "今天 09:05");
  assert.equal(boardTimeText(new Date(2026, 9, 16, 0, 0).getTime(), now), "今天 00:00", "当天零点也算今天");
  assert.equal(boardTimeText(new Date(2026, 9, 15, 23, 59).getTime(), now), "昨天 23:59");
  assert.equal(boardTimeText(new Date(2026, 9, 1, 8, 30).getTime(), now), "10-01 08:30", "补零：09 不能显示成 9");
  assert.equal(boardTimeText(new Date(2025, 11, 31, 8, 30).getTime(), now), "2025-12-31", "跨年必须带年份，否则会被读成今年");
  assert.equal(boardTimeText(0, now), "", "内核没给时间（updated=0）就不显示，不硬造一个 1970");
});

/* ------------------------------ 行为：关键字过滤 ------------------------------ */

test("filterBoardEntries：文件名子串、大小写不敏感、空词原样", () => {
  const entries = [
    { path: "assets/Alpha.svg", updated: 3 },
    { path: "assets/beta-board.svg", updated: 2 },
    { path: "assets/子目录/alpha.svg", updated: 1 },
  ];
  assert.deepEqual(
    filterBoardEntries(entries, "alpha").map((e) => e.path),
    ["assets/Alpha.svg", "assets/子目录/alpha.svg"],
    "大小写不敏感；子目录里的同名文件按文件名匹配",
  );
  assert.deepEqual(filterBoardEntries(entries, "  BETA ").map((e) => e.path), ["assets/beta-board.svg"], "要 trim");
  assert.equal(filterBoardEntries(entries, ""), entries, "空关键词原样返回（保持调用方排好的新→旧序）");
  assert.deepEqual(filterBoardEntries(entries, "不存在"), [], "无匹配给空数组，渲染层负责空态文案");
});

/* ------------------------------ 接线：选择器模块 ------------------------------ */

test("board-picker：Dialog + IME 守卫 + 防抖 + 键盘导航 + 已打开角标", () => {
  assert.match(BOARD_PICKER, /new Dialog\(\{/, "用思源原生 Dialog：遮罩 / ✕ / Esc 都归它管");
  assert.match(BOARD_PICKER, /destroyCallback: \(\) => finish\(null\)/, "✕ / 遮罩 / Esc 关闭 = 取消");
  assert.match(BOARD_PICKER, /if \(settled\) return;/, "finish 幂等：destroyCallback 与列表点击可能同时到");
  assert.match(BOARD_PICKER, /compositionstart/, "中文 IME 组字守卫：拼音串期间不重渲染");
  assert.match(BOARD_PICKER, /compositionend/, "组字结束补一次过滤");
  assert.match(BOARD_PICKER, /\}, 120\)/, "120ms 防抖：与选文档框同一手感");
  assert.match(BOARD_PICKER, /event\.isComposing \|\| event\.keyCode === 229/, "组字期间与老内核的 229 都要挡");
  assert.match(BOARD_PICKER, /choose\(focusIdx >= 0 \? focusIdx : 0\)/, "回车：有焦点选焦点，没有就选第一行");
  assert.match(BOARD_PICKER, /b3-list-item--focus/, "↑↓ 焦点态用思源的类");
  assert.match(BOARD_PICKER, /scrollIntoView\(\{ block: "nearest" \}\)/, "焦点移出视口要滚回来");
  assert.match(BOARD_PICKER, /filterBoardEntries\(entries, input\.value\)/, "过滤走纯函数层，数据一次读好不重查");
  assert.match(BOARD_PICKER, /boardTimeText\(r\.updated\)/, "时间文案走纯函数层");
  assert.match(BOARD_PICKER, /escapeHtml\(/, "文件名/路径先转义再拼 innerHTML，防 XSS");
  assert.equal(BOARD_PICKER.includes("fetch"), false, "选择器不做任何网络/内核查询");
});

test("board-picker：已打开判定与行内 tooltip", () => {
  assert.match(
    BOARD_PICKER,
    /openPaths\.has\(toDataPath\(r\.path\)\)/,
    "两边归一后比对：页签会话里是 /data/...，readDir 给的是 assets/...",
  );
  assert.match(BOARD_PICKER, /exs-picker__badge/, "「已打开」角标要有样式钩子");
  assert.match(BOARD_PICKER, /t\("已打开"\)/, "角标文案走 i18n");
  assert.match(BOARD_PICKER, /title="\$\{escapeHtml\(r\.path\)\}"/, "每行挂完整路径 tooltip：子目录同名文件可辨");
  assert.match(BOARD_PICKER, /t\("没有匹配的白板"\)/, "空结果文案");
});

/* ------------------------------ 接线：数据层 ------------------------------ */

test("storage：listBoardEntries 带 updated 且新→旧；listBoardFiles 只做投影", () => {
  assert.match(STORAGE, /export type BoardFileEntry = \{ path: string; updated: number \}/);
  assert.match(STORAGE, /updated: readDirTimeMs\(r\.updated\)/, "readDir 的秒换成毫秒，没给时间回落 0");
  assert.match(STORAGE, /\.sort\(\(a, b\) => b\.updated - a\.updated\)/, "修改时间新的在前");
  assert.match(
    STORAGE,
    /return \(await listBoardEntries\(dir\)\)\.map\(\(e\) => e\.path\)/,
    "脚本 API 的 listFiles 继续吃 string[]，投影自同一次 readDir",
  );
});

/* ------------------------------ 纯逻辑模块的依赖纪律 ------------------------------ */

test("board-list：零外部依赖（i18n + storage 除外），node 可直接 import", () => {
  assert.match(BOARD_LIST, /import \{ t \} from "\.\.\/i18n\.ts"/, "相对导入带 .ts：node --strip-types 只认显式后缀");
  assert.match(BOARD_LIST, /from "\.\/storage\.ts"/);
  const imports = [...BOARD_LIST.matchAll(/^import .*$/gm)].map((m) => m[0]);
  assert.equal(imports.length, 2, "只允许 i18n + storage 两条导入");
});
