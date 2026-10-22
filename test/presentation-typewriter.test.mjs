/**
 * 第五十三轮·批 1C/1D/1E：逐条出场 + 打字机 + 放映偏好。
 *
 * ① 纯逻辑真跑：字素切分、逐字前缀、光标闪烁、可打字目标、新露出条目、
 *    文本补丁幂等与快照回填；设置归一的夹取区间；
 * ② 接线：只有前进/进场打字，跳页后退直接给全文；打字中按 next 先补完；
 *    自动前进在打字期间暂停；退出一次回填 opacity + text；
 * ③ 红线：文本补丁只碰 text（width/height/originalText 原样），永远不进撤销栈；
 * ④ 抽屉：设置面板与页级逐条 mini 按钮只发意图；样式与双语词条齐备。
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  TYPEWRITER_CURSOR,
  buildTextPatches,
  buildTextRestorePatches,
  cursorVisible,
  graphemes,
  newlyRevealedIds,
  snapshotText,
  typedPrefix,
  typingTargets,
} from "../src/studio/presentation-typewriter.ts";
import { DEFAULT_PRESENTATION, normalizePresentationSettings, normalizeSettings } from "../src/studio/settings.ts";
import { planPage } from "../src/studio/presentation-run.ts";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const src = (rel) => readFileSync(resolve(ROOT, "src/" + rel), "utf8");
const json = (rel) => JSON.parse(readFileSync(resolve(ROOT, rel), "utf8"));
const stripComments = (code) => code.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'\\])\/\/[^\n]*/g, "$1");
const APP = stripComments(src("studio/StudioApp.tsx"));
const DRAWER = stripComments(src("studio/PresentationDrawer.tsx"));
const TYPE = src("studio/presentation-typewriter.ts");
const CSS = src("index.css");

const frame = (id, x = 0, y = 0) => ({ id, type: "frame", x, y, width: 400, height: 300 });
const el = (id, over = {}) => ({ id, type: "rectangle", x: 0, y: 0, width: 100, height: 50, frameId: "f1", ...over });
const text = (id, content, over = {}) => ({ id, type: "text", x: 0, y: 0, width: 100, height: 24, frameId: "f1", text: content, ...over });

const plan = {
  frameId: "f1",
  box: { x: 0, y: 0, w: 400, h: 300 },
  units: [
    { key: "e:t1", ids: ["t1"] },
    { key: "g:G1", ids: ["t2", "label"] },
  ],
  memberIds: ["t1", "t2", "label"],
};

/* ------------------------------ ① 纯逻辑 ------------------------------ */

test("字素切分：中文按字、emoji 组合与音标不被劈开；前缀越界自动夹紧", () => {
  assert.deepEqual(graphemes("白板演示"), ["白", "板", "演", "示"]);
  assert.deepEqual(graphemes("👨‍👩‍👧"), ["👨‍👩‍👧"], "家庭 emoji 是一个字素");
  assert.deepEqual(graphemes("e\u0301"), ["e\u0301"], "组合音标跟着基字走");
  assert.equal(typedPrefix(graphemes("你好世界"), 2), "你好");
  assert.equal(typedPrefix(graphemes("你好"), -3), "");
  assert.equal(typedPrefix(graphemes("你好"), 99), "你好");
});

test("光标：530ms 一换；可打字目标跳过绑定文字、非文本与空文", () => {
  assert.equal(cursorVisible(0), true);
  assert.equal(cursorVisible(529), true);
  assert.equal(cursorVisible(530), false);
  assert.equal(cursorVisible(1060), true);
  assert.equal(TYPEWRITER_CURSOR, "▌");

  const all = [
    text("t1", "第一段"),
    text("label", "绑定文字", { containerId: "rect" }),
    text("empty", ""),
    { id: "r", type: "rectangle", frameId: "f1" },
    text("gone", "删掉了", { isDeleted: true }),
  ];
  assert.deepEqual(typingTargets(all, ["t1", "label", "empty", "r", "gone", "missing"]), [{ id: "t1", text: "第一段" }]);
});

test("新露出条目：进场整页/第一条，同页前进只打新增，后退不打", () => {
  assert.deepEqual(newlyRevealedIds(plan, null, { page: 0, step: -1 }), ["t1", "t2", "label"], "整页模式全打");
  assert.deepEqual(newlyRevealedIds(plan, null, { page: 0, step: 0 }), ["t1"], "逐条进场只打第一条");
  assert.deepEqual(newlyRevealedIds(plan, { page: 0, step: 1 }, { page: 1, step: -1 }), ["t1", "t2", "label"], "换页整页");
  assert.deepEqual(newlyRevealedIds(plan, { page: 0, step: 0 }, { page: 0, step: 1 }), ["t2", "label"], "同页前进只打新增");
  assert.deepEqual(newlyRevealedIds(plan, { page: 0, step: -1 }, { page: 0, step: 0 }), ["t1"], "从整页跳回第一条不重打全页");
  assert.deepEqual(newlyRevealedIds(plan, { page: 0, step: 1 }, { page: 0, step: 0 }), [], "后退不打字");
  assert.deepEqual(newlyRevealedIds(undefined, null, { page: 0, step: 0 }), [], "没有计划时安全返回");
});

test("文本补丁：只算差异（每帧幂等）；退出只回改过的", () => {
  const all = [text("t1", ""), text("t2", "已经完整"), text("gone", "", { isDeleted: true })];
  const desired = new Map([
    ["t1", "你"],
    ["t2", "已经完整"],
    ["gone", "别碰"],
  ]);
  assert.deepEqual(buildTextPatches(all, desired), [{ id: "t1", text: "你" }], "相同文本不产生补丁；已删除的跳过");
  const live = all.map((e) => (e.id === "t1" ? { ...e, text: "你" } : e));
  assert.deepEqual(buildTextPatches(live, desired), [], "状态已到位就不再写场景");

  const original = snapshotText(all);
  assert.deepEqual(original, new Map([["t1", ""], ["t2", "已经完整"]]), "快照只收活着的文本");
  assert.deepEqual(buildTextRestorePatches([{ ...all[0], text: "打到一半" }, ...all.slice(1)], original), [
    { id: "t1", text: "" },
  ], "打字打到一半也回全文快照");
});

test("设置归一：缺键回落默认，速度/留白/自动前进夹在合法区间", () => {
  assert.deepEqual(DEFAULT_PRESENTATION, {
    scrim: true,
    reveal: true,
    typewriter: false,
    cursor: false,
    speed: 28,
    fit: 0.95,
    autoAdvance: 0,
    // 第七十六轮：全屏 + 方向键沿边导航（Advanced Canvas 同款）
    fullscreen: true,
    directional: false,
  });
  assert.deepEqual(normalizePresentationSettings(undefined), DEFAULT_PRESENTATION, "老设置没有这一段也能用");
  const dirty = normalizePresentationSettings({
    scrim: "yes",
    reveal: 0,
    typewriter: false,
    cursor: true,
    speed: 1,
    fit: 4,
    autoAdvance: -9,
  });
  assert.deepEqual(
    dirty,
    { ...DEFAULT_PRESENTATION, typewriter: false, cursor: true, speed: 8, fit: 1, autoAdvance: 0 },
    "脏值夹回",
  );
  assert.equal(normalizePresentationSettings({ speed: 999 }).speed, 200, "速度上限");
  assert.equal(normalizePresentationSettings({ fit: 0.1 }).fit, 0.5, "留白下限");
  assert.equal(normalizePresentationSettings({ autoAdvance: 999 }).autoAdvance, 300, "自动前进上限");
  assert.deepEqual(
    normalizeSettings({ presentation: { speed: 40 } }).presentation,
    { ...DEFAULT_PRESENTATION, speed: 40 },
    "宿主整份设置归一也走这条",
  );
  assert.equal(normalizeSettings({}).presentation.typewriter, false, "缺省关打字机（文字立即可见，更稳）");
});

/* ------------------------------ ② 接线 ------------------------------ */

test("进片场：逐条开关 + 页级例外一起决定 units", () => {
  const all = [frame("f1"), el("a"), el("b", { y: 100 })];
  assert.equal(planPage(all, "f1", true).units.length, 2);
  assert.equal(planPage(all, "f1", false).units.length, 0);
  assert.match(
    APP,
    /plans: shown\.map\(\(s\) => planPage\(all, s\.id, ps\.reveal && s\.reveal !== "all"\)\)/,
    "全局逐条关或这一页 all 时，plan 不分条",
  );
});

test("打字机：只给新露出条目开；先清空再逐帧补，光标只挂最后一条", () => {
  const start = APP.slice(APP.indexOf("const startTyping"), APP.indexOf("const presentGo = useCallback"));
  assert.match(start, /if \(!snap \|\| !api \|\| !snap\.typewriter \|\| ids\.length === 0\) return false;/, "打字机开关在快照里定格");
  assert.match(start, /typingTargets\(all, ids\)/, "绑定文字/非文本不参加");
  assert.match(start, /graphemes\(t\.text\)/, "按字素切，不劈 emoji");
  assert.match(start, /if \(snap\.cursor\) targets\[targets\.length - 1\]\.withCursor = true;/, "光标只跟最后一条");
  assert.match(
    start,
    /applyTextPatches\(buildTextPatches\(all, new Map\(targets\.map\(\(t\) => \[t\.id, ""\]\)\)\)\)/,
    "开打前先清空（与透明度同一事件循环）",
  );
  assert.match(start, /window\.requestAnimationFrame\(tick\)/, "逐字用 rAF，不新开 interval");
  assert.match(start, /Math\.max\(TYPEWRITER_MIN_MS, snap\.speed\)/, "速度有下限兜底");
  assert.match(start, /bumpAutoDeadline\(\);\s*\n\s*return;/, "打完重新开始自动前进计时");
});

test("只有前进/进场打字；跳页、后退、Home/End 直接全文", () => {
  const go = APP.slice(APP.indexOf("const presentGo = useCallback"), APP.indexOf("presentGoRef.current = presentGo"));
  assert.match(go, /if \(kind === "advance" \|\| kind === "enter"\)/, "只有向前推进才打");
  assert.match(go, /startTyping\(newlyRevealedIds\(snap\.plans\[next\.page\], prev, next\)\)/, "算这一步新露出谁");
  assert.match(go, /if \(!started\) bumpAutoDeadline\(\);/, "没有文本目标时直接开始自动前进");
  assert.match(go, /presentPendingRef\.current = \{ nav, kind \};/, "飞行窗内连出场方式一起排队");
  for (const fn of ["presentPrev", "presentHome", "presentEnd", "presentJump"]) {
    const at = APP.indexOf("const " + fn + " = useCallback");
    const body = APP.slice(at, APP.indexOf("}, [", at) + 4);
    assert.match(body, /finishTyping\(\)/, `${fn} 前先补完，别留半截字`);
  }
});

test("打字中按 next：第一下补完不翻页；自动前进在打字/飞行/排队时暂停", () => {
  const next = APP.slice(APP.indexOf("const presentNext = useCallback"), APP.indexOf("presentNextRef.current = presentNext"));
  const typing = next.indexOf("if (typingRef.current) {");
  const finish = next.indexOf("finishTyping();", typing);
  const ret = next.indexOf("return;", finish);
  const advance = next.indexOf("navNext(snap.plans, snap.graph, cur, direction)", ret);
  assert.ok(typing > 0 && finish > typing && ret > finish && advance > ret, "先补完 → return → 第二下才翻页");

  const timer = APP.slice(APP.indexOf("const timer = window.setInterval"), APP.indexOf("}, [presenting]);"));
  assert.match(timer, /if \(typingRef\.current \|\| presentPendingRef\.current\) return;/, "打字中 / 有排队不走自动前进");
  assert.match(timer, /if \(!snap \|\| snap\.autoAdvance <= 0\) return;/, "自动前进关闭时什么都不做");
  assert.match(timer, /if \(now < presentCamUntilRef\.current\) return;/, "镜头还在飞时不抢跑");
  assert.match(timer, /presentNextRef\.current\(\);/, "到点走一步");
});

/* ------------------------------ ③ 红线 ------------------------------ */

test("文本补丁只碰 text：width/height/originalText 原样；永不进撤销栈", () => {
  const apply = APP.slice(APP.indexOf("const applyTextPatches"), APP.indexOf("const presentApply"));
  assert.match(apply, /captureUpdate: CaptureUpdateAction\.NEVER/, "不进撤销栈");
  assert.match(apply, /byId\.has\(e\.id\) \? \{ \.\.\.e, text: byId\.get\(e\.id\) as string \} : e/, "只改 text");
  assert.equal(apply.includes("originalText"), false, "不许动度量源");
  assert.equal(/width\s*:/.test(apply), false, "不许重量宽");
  assert.equal(/height\s*:/.test(apply), false);

  const exit = APP.slice(APP.indexOf("const exitPresentation"), APP.indexOf("const presentNext = useCallback"));
  assert.match(exit, /buildTextRestorePatches\(all, snap\.textOriginal\)/);
  assert.match(exit, /text = textById\.get\(e\.id\)/, "退出把 text 与 opacity 合并成一次更新");
  assert.match(exit, /cancelAnimationFrame\(typingRef\.current\.raf\)/, "退出先停打字帧");
});

test("分层：打字机纯逻辑零 React / 思源 / vendor 依赖", () => {
  for (const banned of ['from "react"', 'from "siyuan"', "@excalidraw", "../i18n"]) {
    assert.equal(TYPE.includes(banned), false, `不许依赖 ${banned}`);
  }
  const imports = [...TYPE.matchAll(/^import .* from "([^"]+)";$/gm)].map((m) => m[1]);
  assert.deepEqual(imports, ["./presentation-run.ts"], "只借游标/计划类型");
});

/* ------------------------------ ④ 抽屉与样式 ------------------------------ */

test("抽屉：设置区只发意图；打字机关闭时速度/光标一起禁用", () => {
  assert.match(DRAWER, /props\.onSetting\("scrim", v\)/);
  assert.match(DRAWER, /props\.onSetting\("reveal", v\)/);
  assert.match(DRAWER, /props\.onSetting\("typewriter", v\)/);
  assert.match(DRAWER, /props\.onSetting\("speed", Number\(e\.currentTarget\.value\)\)/);
  assert.match(DRAWER, /props\.onSetting\("fit", Number\(e\.currentTarget\.value\)\)/);
  assert.match(DRAWER, /props\.onSetting\("autoAdvance", Number\(e\.currentTarget\.value\)\)/);
  assert.match(DRAWER, /disabled=\{!st\.typewriter\}/, "打字机关时禁用");
  assert.match(DRAWER, /aria-expanded=\{showSettings\}/, "设置开关对读屏可见");
  assert.match(DRAWER, /st\.autoAdvance === 0 \? t\("关"\)/, "0 显示「关」而不是 0 秒");
  assert.equal(/from "siyuan"|updateScene|\.persist\(/.test(DRAWER), false, "不碰宿主/磁盘");
});

test("样式：新增开关/设置行/页级 mini 都有类，且用 accent 不用硬编码品牌色", () => {
  for (const cls of [
    ".exs-present-settings",
    ".exs-present-set",
    ".exs-present-set__label",
    ".exs-present-set__val",
    ".exs-present-switch",
    ".exs-present-mini--muted",
    ".exs-present-close--on",
    ".exs-present-set--disabled",
  ]) {
    assert.ok(CSS.includes(cls + " {") || CSS.includes(cls + ":"), `缺样式：${cls}`);
  }
  assert.match(CSS, /\.exs-present-switch:checked \{[^}]*background: var\(--exs-accent\)/, "开关用主题强调色");
  assert.match(CSS, /\.exs-present-set--range input\[type="range"\] \{[^}]*accent-color: var\(--exs-accent\)/, "滑杆同色");
});

test("i18n：设置面板与页级开关词条双语齐备", () => {
  const zh = json("i18n/zh_CN.json");
  const en = json("i18n/en_US.json");
  for (const k of [
    "演示设置",
    "幕布",
    "逐条出场",
    "打字机",
    "打字光标",
    "打字速度",
    "镜头留白",
    "自动前进",
    "关",
    "{n} 毫秒/字",
    "{n} 秒",
    "这一页整页一起出",
    "这一页逐条出场",
  ]) {
    assert.equal(zh[k], k, `zh 缺词条或值不等于 key：${k}`);
    assert.ok(typeof en[k] === "string" && en[k] !== k && en[k].length > 0, `en 缺词条：${k}`);
  }
  const used = [...DRAWER.matchAll(/\bt\("([^"]+)"/g)].map((m) => m[1]);
  for (const k of used) {
    assert.ok(k in zh, `zh_CN 缺键：${k}`);
    assert.ok(k in en, `en_US 缺键：${k}`);
  }
});
