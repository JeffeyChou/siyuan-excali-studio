/**
 * 第五十三轮·批 0：演示模式的片单（画框 → 幻灯片）。
 *
 * 四段断言，顺序即这轮的风险排序：
 * ① 纯逻辑真跑：谁能进片单、没排序时按什么排、排序语义（整份重编）、
 *    排除页、空名回落、签名去重——这几条决定了用户改画框名/挪位置会不会跳页；
 * ② 分层红线：presentation-plan 必须零 React/思源/vendor 依赖（node 侧直接跑），
 *    rail-actions 里演示那颗钉子的落点是 top-right、且不进默认清单；
 * ③ 接线：onChange 同步片单、元数据写回走正常场景更新、镜头收成 focusFrame
 *    （自算 fit 直接写 appState，避开 scrollToContent 在嵌入环境的不稳）、抽屉与右上角按钮的通道；
 * ④ 文案：本片新增词条双语齐备，且两份语言包都没有重复键。
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  DECK_ROW_TOLERANCE,
  PRESENTATION_KEY,
  deckOf,
  deckSignature,
  moveSlide,
  slideTitle,
  toggleSlide,
  toggleSlideReveal,
  visibleSlides,
} from "../src/studio/presentation-plan.ts";
import { DEFAULT_PINNED_ACTIONS, PRESENTATION, RAIL_ACTIONS, railActionMount, railActionOf } from "../src/studio/rail-actions.ts";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function src(rel) {
  return readFileSync(resolve(ROOT, "src", rel), "utf8");
}
const stripComments = (code) => code.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'\\])\/\/[^\n]*/g, "$1");
function json(rel) {
  return JSON.parse(readFileSync(resolve(ROOT, rel), "utf8"));
}

const APP = stripComments(src("studio/StudioApp.tsx"));
const INDEX = stripComments(src("index.ts"));
const DRAWER = stripComments(src("studio/PresentationDrawer.tsx"));
const CSS = src("index.css");

/** 造一块画框：默认 400×300，name/meta 按需覆盖 */
function frame(id, x, y, over = {}) {
  return { id, type: "frame", x, y, width: 400, height: 300, name: "", ...over };
}
const meta = (order, included, reveal) => ({
  customData: {
    [PRESENTATION_KEY]: {
      ...(order === null ? {} : { order }),
      ...(included === undefined ? {} : { included }),
      ...(reveal === undefined ? {} : { reveal }),
    },
  },
});

/* ------------------------------ ① 纯逻辑 ------------------------------ */

test("片单只认活着的画框", () => {
  const deck = deckOf([
    frame("a", 0, 0),
    { id: "r", type: "rectangle", x: 10, y: 10, width: 20, height: 20 },
    frame("gone", 500, 0, { isDeleted: true }),
    frame("b", 900, 0),
  ]);
  assert.deepEqual(deck.slides.map((s) => s.id), ["a", "b"], "非 frame 与已删除的不进片单");
  assert.equal(deck.hasOrdered, false, "没写过 order = 没排过序");
  assert.equal(deck.slides.every((s) => s.included), true, "入片是默认态，历史画框不用补数据");
  assert.equal(deck.slides[0].w, 400, "宽高拿来算中心点");
});

test("没排过序按阅读顺序：先上后下，同一行先左后右", () => {
  const deck = deckOf([
    frame("右下", 800, 700),
    frame("左上", 0, 0),
    frame("右上", 800, 0),
    frame("左下", 0, 700),
  ]);
  assert.deepEqual(deck.slides.map((s) => s.id), ["左上", "右上", "左下", "右下"], "z 字形阅读顺序");
  // 行判定用中心点差 + 容差：差在容差之内算同一行，比 x；超出才分行
  const tol = DECK_ROW_TOLERANCE;
  const near = deckOf([frame("右边", 500, 300 + tol - 1), frame("左边", 0, 300)]);
  assert.deepEqual(near.slides.map((s) => s.id), ["左边", "右边"], "中心差在容差内 = 同一行，按左右");
  const far = deckOf([frame("下面", 500, 300 + tol + 1), frame("上面", 0, 300)]);
  assert.deepEqual(far.slides.map((s) => s.id), ["上面", "下面"], "超出容差 = 换行，谁在上面谁先放");
});

test("排过序之后：认 order，挪位置和改名都不跳页", () => {
  const deck = deckOf([
    frame("第一页", 900, 900, meta(0)),
    frame("第二页", 0, 0, meta(1)),
    frame("没排过", 400, 400, meta(null)),
  ]);
  assert.equal(deck.hasOrdered, true, "只要有一个显式 order 就按 order 走");
  assert.deepEqual(deck.slides.map((s) => s.id), ["第一页", "第二页", "没排过"], "没写过 order 的兜底落末尾");
  // 同值 order 也要定全序，不然同一份数据两次算出的片单会抖
  const tie = deckOf([frame("zz", 0, 0, meta(3)), frame("aa", 0, 0, meta(3))]);
  assert.deepEqual(tie.slides.map((s) => s.id), ["aa", "zz"], "order 同值按 id 定序，不靠数组顺序的运气");
});

test("排序：一次显式排序就整份重编，此后 order 是唯一真源", () => {
  const deck = deckOf([frame("a", 0, 0), frame("b", 400, 0), frame("c", 800, 0)]);
  const patches = moveSlide(deck, 0, 2);
  assert.deepEqual(patches.map((p) => p.id), ["b", "c", "a"], "移动后按新顺序返回每一页");
  assert.deepEqual(
    patches.map((p) => p.patch[PRESENTATION_KEY].order),
    [0, 1, 2],
    "整份重编：不是只给动过的那页写 order",
  );
  assert.equal(patches.every((p) => p.patch[PRESENTATION_KEY].included === true), true, "重编时把入片态一起写回，别把排除页洗回来");
  assert.deepEqual(moveSlide(deck, 1, 1), [], "原地不动不产生写入（省一次可撤销的场景更新）");
  assert.deepEqual(moveSlide(deck, 0, 9), [], "越界不写");
  assert.deepEqual(moveSlide(deck, -1, 0), [], "负下标不写");
});

test("逐条出场：默认跟随全局（auto），整页是页级例外且只写这一页", () => {
  const deck = deckOf([
    frame("a", 0, 0),
    frame("b", 400, 0, meta(null, undefined, "all")),
    frame("c", 800, 0, meta(null, undefined, "乱写的值")),
  ]);
  assert.deepEqual(deck.slides.map((s) => [s.id, s.reveal]), [
    ["a", "auto"],
    ["b", "all"],
    ["c", "auto"],
  ], "缺省 auto；只有明确 all 才整页；脏值回落 auto");

  const toAll = toggleSlideReveal(deck, "a");
  assert.deepEqual(toAll, [{ id: "a", patch: { [PRESENTATION_KEY]: { reveal: "all" } } }], "只写这一页的 reveal（不动页序）");
  assert.deepEqual(toggleSlideReveal(deck, "b"), [{ id: "b", patch: { [PRESENTATION_KEY]: { reveal: "auto" } } }], "再点一次切回逐条");
  assert.deepEqual(toggleSlideReveal(deck, "不存在"), [], "片单里没有的 id 不写");

  const patches = moveSlide(deck, 0, 2);
  assert.deepEqual(patches.map((p) => p.patch[PRESENTATION_KEY].reveal), ["all", "auto", "auto"], "排序整份重编时页级例外不许丢");
  const excluded = toggleSlide(deck, "a");
  assert.deepEqual(excluded.map((p) => p.patch[PRESENTATION_KEY].reveal), ["auto", "all", "auto"], "入片开关同样保留例外");
  assert.notEqual(deckSignature(deck), deckSignature(deckOf([frame("a", 0, 0), frame("b", 400, 0), frame("c", 800, 0)])), "reveal 变化要进签名");
});

test("排除一页：只翻目标页，其它页的入片态与顺序保住", () => {
  const deck = deckOf([frame("a", 0, 0, meta(0)), frame("b", 400, 0, meta(1, false)), frame("c", 800, 0, meta(2))]);
  const patches = toggleSlide(deck, "a");
  assert.deepEqual(
    patches.map((p) => [p.id, p.patch[PRESENTATION_KEY].included]),
    [["a", false], ["b", false], ["c", true]],
    "b 原本就是排除页，不该被这次操作洗成入片",
  );
  assert.deepEqual(
    patches.map((p) => p.patch[PRESENTATION_KEY].order),
    [0, 1, 2],
    "顺序跟着片单当前顺序落定，排除不会把页序打乱",
  );
  assert.deepEqual(toggleSlide(deck, "不存在"), [], "片单里没有的 id 不写");
  const shown = visibleSlides(deckOf([{ ...frame("a", 0, 0), ...meta(0, true) }, { ...frame("b", 400, 0), ...meta(1, false) }]));
  assert.deepEqual(shown.map((s) => s.id), ["a"], "放映用的那份剔掉排除页");
});

test("空画框名回落成可翻译的 key，签名能抓到挪动和改名", () => {
  assert.equal(slideTitle(frame("a", 0, 0)), "未命名页", "空名返回 i18n key，由消费方 t()");
  assert.equal(slideTitle({ ...frame("a", 0, 0), name: "  标题  " }), "标题", "首尾空白不吃进来");
  const base = deckOf([frame("a", 0, 0)]);
  assert.equal(deckSignature(base), deckSignature(deckOf([frame("a", 0, 0)])), "同数据同签名（onChange 每帧都算，靠它去重）");
  assert.notEqual(deckSignature(base), deckSignature(deckOf([frame("a", 10, 0)])), "挪了位置要变：面板得跟着重排");
  assert.notEqual(deckSignature(base), deckSignature(deckOf([{ ...frame("a", 0, 0), name: "改名" }])), "改名要变");
  assert.notEqual(deckSignature(base), deckSignature(deckOf([{ ...frame("a", 0, 0), ...meta(0) }])), "排序状态要变");
});

/* ------------------------------ ② 分层红线 ------------------------------ */

test("presentation-plan 是纯逻辑：零 React / 思源 / vendor 依赖", () => {
  const PLAN = src("studio/presentation-plan.ts");
  for (const banned of ['from "react"', 'from "siyuan"', "@excalidraw", "../i18n"]) {
    assert.equal(PLAN.includes(banned), false, `不许依赖 ${banned}（node 侧要能直接 import 跑单测）`);
  }
  assert.equal(PRESENTATION_KEY, "presentation", "元数据命名空间就是这一个键，别开第二个");
});

test("演示那颗钉子：落点在右上角，且不进默认清单", () => {
  const action = railActionOf(PRESENTATION);
  assert.ok(action, "动作表里得有演示模式");
  assert.equal(railActionMount(action), "top-right", "落点：钉上以后进画布右上角，不占右缘竖条");
  assert.ok(action.icon.length > 0, "图标非空");
  assert.equal(DEFAULT_PINNED_ACTIONS.includes(PRESENTATION), false, "默认不钉（入口越少越好，用户拍板）");
  assert.equal(RAIL_ACTIONS.filter((a) => railActionMount(a) === "top-right").length, 1, "右上角只此一枚");
});

/* ------------------------------ ③ 接线 ------------------------------ */

test("画布：片单跟着 onChange 走，元数据写回走正常场景更新", () => {
  assert.match(APP, /syncDeck\(elements as readonly FrameLike\[\]\);/, "onChange 里同步片单");
  // 第七十六轮：页序签名去重 + 图状态**独立**签名去重（边来自箭头，页序签名看不见它）
  assert.match(
    APP,
    /const sig = deckSignature\(next\);\s*\n\s*if \(sig !== deckSigRef\.current\) \{/,
    "页序签名变了才 setDeck（抽屉开着也别每帧 setState）",
  );
  assert.match(APP, /if \(gsSig === graphSigRef\.current\) return;/, "图状态另用自己的签名去重（箭头变了路线才变）");
  assert.match(APP, /captureUpdate: CaptureUpdateAction\.IMMEDIATELY/, "写元数据要立即记一次撤销点（改页序该能 ⌘Z）");
  assert.match(APP, /custom\[key\] = \{ \.\.\.\(custom\[key\] as Record<string, unknown> \| undefined\), \.\.\.value \};/, "customData 深合并：别把别的插件的命名空间整块覆盖掉");
  assert.match(APP, /applyDeckPatches\(moveSlide\(deck, from, to\)\)/, "上移下移 → 算补丁 → 写场景");
  assert.match(APP, /applyDeckPatches\(toggleSlide\(deck, id\)\)/, "入片开关同理");
  assert.match(APP, /applyDeckPatches\(toggleSlideReveal\(deck, id\)\)/, "页级逐条/整页也走同一条写回");
});

test("镜头收成 focusFrame：自算 fit 直接写 appState（不依赖 scrollToContent）", () => {
  assert.equal(/api\.scrollToContent\(/.test(APP), false, "不再调用 api.scrollToContent（嵌入环境里对数组/字符串都不稳）");
  assert.match(APP, /const focusFrame = useCallback\(\s*\n\s*\(frameId: string, fit = 0\.92\): void => \{[\s\S]{0,520}\.frameId === frameId\)/, "画框成员按 frameId 归拢，算包围盒");
  assert.match(APP, /Math\.min\(\(vw \* fit\) \/ bw, \(vh \* fit\) \/ bh\)/, "自算 fit：用视口宽高算目标 zoom");
  // 取景scroll 的符号是本功能的头号历史坑（写反 = 镜头飞到画布另一侧，点第2页跳到左边）：
  // vendor 屏幕映射 screen=(scene+scroll)*zoom，要场景中心 cx 落在视口中线 vw/2 ⇒
  // scrollX = vw/(2*zoom) - cx（减号在前）。锁死这个顺序，别让它再翻回去。
  assert.match(APP, /const toScrollX = vw \/ \(2 \* zoom\) - cx;/, "scrollX 口径对齐 vendor _Me：(vw/2)/zoom - cx");
  assert.match(APP, /const toScrollY = vh \/ \(2 \* zoom\) - cy;/, "scrollY 口径对齐 vendor _Me：(vh/2)/zoom - cy");
  assert.match(APP, /api\.updateScene\(\{\s*appState: \{/, "目标 scrollX\/scrollY\/zoom 直接落 appState");
  assert.match(APP, /focusFrame\(slide\.id, presentSettings\.fit\)/, "抽屉跳页委托 focusFrame，并透传设置的取景系数（滑块对跳页生效）");
});

test("抽屉只读片单、只发意图；写数据与动镜头都在 StudioApp", () => {
  assert.match(DRAWER, /import \{ slideTitle, type Deck \} from "\.\/presentation-plan";/, "抽屉只认片单类型");
  assert.equal(DRAWER.includes("api"), false, "抽屉拿不到 imperative API");
  assert.equal(/from "siyuan"|updateScene|scrollToContent/.test(DRAWER), false, "不许直接写场景或动镜头");
  assert.match(DRAWER, /disabled=\{shown === 0\}/, "没有入片页时「开始演示」是灰的");
  assert.match(DRAWER, /disabled=\{i === 0\}/, "第一页不许再上移");
  assert.match(APP, /<PresentationDrawer/, "抽屉渲染在画布里");
  assert.match(APP, /openPresentation: \(\) => openPresentDrawer\(\)/, "宿主面板的演示动作经窄接口开抽屉（开时拉最新设置）");
  assert.match(INDEX, /if \(id === PRESENTATION\) \{[\s\S]{0,160}actions\.openPresentation\(\);/, "宿主：有活动画布才开抽屉");
  assert.match(INDEX, /showMessage\(t\("先打开一块白板，再放映"\)\)/, "没有活动画布时提示，不静默");
});

test("抽屉的设置面板：逐条/幕布/打字机只发意图，值从宿主设置现拉", () => {
  assert.match(APP, /settings=\{presentSettings\}/, "偏好从本地快照进抽屉（getter 不触发重渲染）");
  assert.match(APP, /onSetting=\{changePresentSetting\}/);
  assert.match(APP, /onToggleReveal=\{toggleDeckReveal\}/);
  assert.match(APP, /normalizePresentationSettings\(getPresentationSettings\(\)\)/, "开抽屉/进片场时拉一份并归一");
  assert.match(
    APP,
    /onPresentationSetting\(key, next\[key\]\);/,
    "改一项就往上写一项（StudioApp 不直接碰宿主 settings）",
  );
  assert.match(
    INDEX,
    /getPresentationSettings: \(\) => this\.settings\.presentation,/,
    "宿主把设置快照交给画布",
  );
  assert.match(
    INDEX,
    /normalizePresentationSettings\(\{ \.\.\.this\.settings\.presentation, \[key\]: value \}\)[\s\S]{0,220}this\.persist\(\);/,
    "写回前归一、同值短路、不同值才落盘",
  );
  assert.match(src("studio/tab.tsx"), /getPresentationSettings=\{host\.getPresentationSettings\}/, "tab 透传 getter");
  assert.match(src("studio/tab.tsx"), /onPresentationSetting=\{host\.onPresentationSetting\}/, "tab 透传写回");

  // 抽屉只读 props：不 import 宿主设置存储、不直接写盘
  assert.equal(/from "\.\.\/index"|from "siyuan"|\.persist\(/.test(DRAWER), false, "抽屉不碰宿主/磁盘");
  for (const label of ["幕布", "逐条出场", "打字机", "打字光标", "打字速度", "镜头留白", "自动前进"]) {
    assert.ok(DRAWER.includes(label), `设置面板缺一项：${label}`);
  }
  assert.match(DRAWER, /disabled=\{!st\.typewriter\}/, "打字机关掉时，光标与速度一起禁用");
  assert.match(DRAWER, /onClick=\{\(\) => props\.onToggleReveal\(s\.id\)\}/, "每页的逐条/整页 mini 按钮");
  assert.match(DRAWER, /aria-pressed=\{s\.reveal === "auto"\}/, "开关态对读屏可见");
});

test("样式：右上角按钮走 vendor 扩展位，抽屉是画布内 absolute 浮层", () => {
  const fab = CSS.slice(CSS.indexOf(".exs-root .excalidraw .exs-present-fab {"), CSS.indexOf("}", CSS.indexOf(".exs-root .excalidraw .exs-present-fab {")));
  assert.ok(fab.length > 20, "FAB 有样式（选择器带 .excalidraw：扩展位在 vendor DOM 里）");
  const drawer = CSS.slice(CSS.indexOf(".exs-present-drawer {"), CSS.indexOf("}", CSS.indexOf(".exs-present-drawer {")));
  assert.match(drawer, /position: absolute;/, "absolute：含块是 .exs-root，思源右 Dock 开着也不跑偏");
  assert.equal(/position: fixed/.test(drawer), false, "不许 fixed（第三十八轮色板的教训）");
  assert.match(drawer, /z-index: 8;/, "层级：压过画布 UI、低于思源 Dialog（≥11）");
  assert.match(CSS, /\.exs-root \{\s*\n\s*position: relative;\s*\n\s*\}/, ".exs-root 是定位含块");
});

/* ------------------------------ ④ 文案 ------------------------------ */

test("i18n：本片词条双语齐备，中文原文即 key", () => {
  const zh = json("i18n/zh_CN.json");
  const en = json("i18n/en_US.json");
  const keys = [
    railActionOf(PRESENTATION).title,
    railActionOf(PRESENTATION).desc,
    "固定到右上角",
    "已固定在右上角",
    "演示",
    "{n} 页",
    "按位置排序",
    "未命名页",
    "还没有演示页",
    "先在画布上框住一页内容，再点右上角的 ▶ 建片单。",
    "上移",
    "下移",
    "这一页不放映",
    "重新入片",
    "这一页整页一起出",
    "这一页逐条出场",
    "点页名把镜头开过去；↑↓ 改页序，≡ 管整页还是逐条，眼睛管放不放。",
    "开始演示",
    "先画一个画框，再开始演示",
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
    "先打开一块白板，再放映",
  ];
  for (const k of keys) {
    assert.equal(zh[k], k, `zh 缺词条或值不等于 key：${k}`);
    assert.ok(typeof en[k] === "string" && en[k] !== k && en[k].length > 0, `en 缺词条：${k}`);
  }
  assert.equal(zh["关闭"], "关闭", "抽屉关闭钮复用既有词条（不许重复注册）");
});

test("i18n：两份语言包都没有重复键（重复键会让 zh/en 键序断言假性通过）", () => {
  for (const rel of ["i18n/zh_CN.json", "i18n/en_US.json"]) {
    const txt = readFileSync(resolve(ROOT, rel), "utf8");
    const keys = [...txt.matchAll(/^\s{2}"((?:[^"\\]|\\.)+)":/gm)].map((m) => m[1]);
    const seen = new Set();
    const dup = [];
    for (const k of keys) {
      if (seen.has(k)) dup.push(k);
      seen.add(k);
    }
    assert.deepEqual(dup, [], `${rel} 有重复键：${dup.join(", ")}`);
  }
});
