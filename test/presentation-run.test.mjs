/**
 * 第五十三轮·批 1A：放映内核（状态机 + 运行时补丁 + 存盘闸门）。
 *
 * 断言分三段：
 * ① 纯逻辑真跑：分条（组/绑定文字/阅读顺序）、补丁（只该看到的看得到）、
 *    快照回填、游标推进——这几条错了用户看到的就是「页是空的」「翻不过去」；
 * ② 闸门与接线：放映中不许判脏/不许落盘/不许进撤销栈，键位只在放映时接管；
 * ③ 分层：presentation-run 只依赖 presentation-plan，node 侧能直接跑。
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildRestorePatches,
  buildRunPatches,
  clampCursor,
  endCursor,
  firstStep,
  lastStep,
  nextCursor,
  pageMembers,
  planPage,
  prevCursor,
  revealUnits,
  snapshotOpacity,
  startCursor,
} from "../src/studio/presentation-run.ts";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const src = (rel) => readFileSync(resolve(ROOT, "src/" + rel), "utf8");
const stripComments = (code) => code.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'\\])\/\/[^\n]*/g, "$1");
const APP = stripComments(src("studio/StudioApp.tsx"));
const CSS = src("index.css");

const frame = (id, x = 0, y = 0) => ({ id, type: "frame", x, y, width: 400, height: 300 });
/** 一个矩形/文本等普通元素；默认在 f1 页里 */
const el = (id, over = {}) => ({ id, type: "rectangle", x: 0, y: 0, width: 100, height: 50, frameId: "f1", ...over });

const opacityOf = (patches, id) => patches.find((p) => p.id === id)?.opacity;

/* ------------------------------ ① 纯逻辑 ------------------------------ */

test("成员归拢：只认本页、活着的、非画框元素", () => {
  const all = [frame("f1"), frame("f2", 600), el("a"), el("b", { frameId: "f2" }), el("gone", { isDeleted: true }), el("loose", { frameId: null })];
  assert.deepEqual(pageMembers(all, "f1").map((e) => e.id), ["a"]);
  assert.deepEqual(pageMembers(all, "f2").map((e) => e.id), ["b"]);
});

test("计划带上画框几何：幕布挖洞与镜头共用，找不到时给全零盒", () => {
  assert.deepEqual(planPage([frame("f1", 12, 34)], "f1").box, { x: 12, y: 34, w: 400, h: 300 });
  assert.deepEqual(planPage([frame("f1")], "missing").box, { x: 0, y: 0, w: 0, h: 0 }, "不许给 undefined/NaN");
});

test("整页一起出：不给分条，但成员照样进计划（step=-1 全显）", () => {
  const all = [frame("f1"), el("a"), el("b", { x: 200 })];
  const whole = planPage(all, "f1", false);
  assert.deepEqual(whole.units, [], "整页模式没有分条");
  assert.deepEqual(whole.memberIds, ["a", "b"], "成员一个不少");
  const hidden = all.map((e) => ({ ...e, opacity: e.type === "frame" ? 100 : 0 }));
  const patches = buildRunPatches(hidden, whole, -1, snapshotOpacity(all));
  assert.equal(opacityOf(patches, "a"), 100, "整页全显");
  assert.equal(opacityOf(patches, "b"), 100);
  assert.equal(planPage(all, "f1", true).units.length, 2, "默认仍是逐条");
});

test("分条：同组一条、绑定文字跟容器走、按阅读顺序排", () => {
  const all = [
    frame("f1"),
    // 右边一组（两个元素同组）
    el("g-right-1", { x: 400, groupIds: ["G1"] }),
    el("g-right-2", { x: 500, groupIds: ["G1"] }),
    // 左边一个容器 + 它的绑定文字
    el("left", { x: 0 }),
    { ...el("label", { x: 10, y: 10 }), type: "text", containerId: "left" },
  ];
  const units = revealUnits(all, "f1");
  assert.deepEqual(units.map((u) => u.key), ["e:left", "g:G1"], "左边先出；组整体算一条");
  assert.deepEqual(units[0].ids, ["left", "label"], "绑定文字跟着容器一起出/一起藏");
  assert.deepEqual(units[1].ids, ["g-right-1", "g-right-2"], "同组元素合成一条");
  assert.deepEqual(revealUnits([frame("f1")], "f1"), [], "空页没有分条（调用方用 step=-1）");
});

test("补丁：当前页按步放；别页/画框/自由笔画一律不碰（照搬 Advanced Canvas 口径）", () => {
  const all = [
    frame("f1"),
    frame("f2", 600),
    el("a1", { x: 0 }),
    el("a2", { x: 200 }),
    el("b1", { frameId: "f2" }),
    el("loose", { frameId: null }),
    el("hidden-already", { frameId: "f2", opacity: 0 }),
  ];
  const plan = planPage(all, "f1");
  assert.deepEqual(plan.units.map((u) => u.key), ["e:a1", "e:a2"], "同一行按左右");
  const original = snapshotOpacity(all);

  const step0 = buildRunPatches(all, plan, 0, original);
  assert.equal(opacityOf(step0, "a1") ?? 100, 100, "第一条出场（本来就是 100，不需要补丁）");
  assert.equal(opacityOf(step0, "a2"), 0, "第二条还没到");
  // 第七十六轮：画框不再压 opacity——框线靠 frameRendering 关渲染，成员照常渲染
  assert.equal(opacityOf(step0, "f1"), undefined, "画框不动（框线靠关渲染，不靠压 opacity）");
  assert.equal(opacityOf(step0, "f2"), undefined, "别页画框也不动");
  // 别页内容不碰：它靠相机移出视口，不靠透明化（「放映全空」的根治点）
  assert.equal(opacityOf(step0, "b1"), undefined, "别页元素不碰（相机负责让它离开视口）");
  assert.equal(opacityOf(step0, "loose"), undefined, "自由笔画也不碰");
  assert.equal(opacityOf(step0, "hidden-already"), undefined, "别页里本来就藏着的不产生无谓补丁");

  // 把 step0 的补丁落到场景上，再走下一步（幂等语义：算的是绝对值，不是增量）
  const apply = (list, patches) =>
    list.map((e) => {
      const want = opacityOf(patches, e.id);
      return want === undefined ? e : { ...e, opacity: want };
    });
  const live0 = apply(all, step0);
  const step1 = buildRunPatches(live0, plan, 1, original);
  assert.equal(opacityOf(step1, "a2"), 100, "第二条这时才出场");
  assert.equal(opacityOf(step1, "a1"), undefined, "已显示的不重复写");

  const whole = buildRunPatches(live0, plan, -1, original);
  assert.equal(opacityOf(whole, "a2"), 100, "整页全显把第二条补回来");
  assert.equal(opacityOf(whole, "b1"), undefined, "别页仍然不碰");
});

test("补丁：别页成员保持原值（用户手工调淡的别被洗白）", () => {
  const all = [
    frame("f1"),
    el("a1", { x: 0 }),
    el("b1", { frameId: "f2", opacity: 40 }),
  ];
  const original = snapshotOpacity(all);
  const plan = planPage(all, "f1");
  const patches = buildRunPatches(all, plan, 0, original);
  assert.equal(opacityOf(patches, "b1"), undefined, "别页成员的 40 原样保留，不产生补丁");
});

test("补丁幂等且尊重原始透明度", () => {
  const all = [frame("f1"), el("a", { opacity: 40 }), el("b", { x: 200 })];
  const original = snapshotOpacity(all);
  const plan = planPage(all, "f1");
  // 模拟「上一步把它藏了」：现场是 0，快照是 40
  const hidden = all.map((e) => (e.id === "a" ? { ...e, opacity: 0 } : e));
  const first = buildRunPatches(hidden, plan, 0, original);
  assert.equal(opacityOf(first, "a"), 40, "显示时回它自己的 40，不洗成 100");
  assert.equal(opacityOf(first, "b"), 0, "还没到的条照样藏");
  // 把补丁真的落上去，再算一次 → 应当零补丁（否则每帧都在写场景）
  const live = hidden.map((e) => {
    const want = opacityOf(first, e.id);
    return want === undefined ? e : { ...e, opacity: want };
  });
  assert.deepEqual(buildRunPatches(live, plan, 0, original), [], "状态已到位就不再写");
});

test("退出回填：只回和快照不同的那些", () => {
  const all = [frame("f1"), el("a"), el("b", { opacity: 40 })];
  const original = snapshotOpacity(all);
  const live = all.map((e) => ({ ...e, opacity: 0 }));
  const restore = buildRestorePatches(live, original);
  assert.deepEqual(
    restore.sort((x, y) => x.id.localeCompare(y.id)),
    [
      { id: "a", opacity: 100 },
      { id: "b", opacity: 40 },
      { id: "f1", opacity: 100 },
    ],
    "画框与元素都按快照回填",
  );
  assert.deepEqual(buildRestorePatches(all, original), [], "没动过就不回填");
});

test("游标：逐条 → 翻页 → 到底停住，倒退同理", () => {
  const plans = [
    { frameId: "f1", units: [{ key: "u1", ids: ["u1"] }, { key: "u2", ids: ["u2"] }], memberIds: ["u1", "u2"] },
    { frameId: "f2", units: [], memberIds: [] },
    { frameId: "f3", units: [{ key: "u3", ids: ["u3"] }], memberIds: ["u3"] },
  ];
  assert.deepEqual(startCursor(plans), { page: 0, step: 0 }, "开场落在第一页第一条");
  assert.deepEqual(endCursor(plans), { page: 2, step: 0 }, "末页最后一条");

  let cur = startCursor(plans);
  const seq = [];
  for (let next = nextCursor(plans, cur); next; next = nextCursor(plans, cur)) {
    seq.push(next);
    cur = next;
  }
  assert.deepEqual(seq, [{ page: 0, step: 1 }, { page: 1, step: -1 }, { page: 2, step: 0 }], "空页直接跳过（step=-1）");
  assert.equal(nextCursor(plans, { page: 2, step: 0 }), null, "到底返回 null，由调用方收场");

  assert.deepEqual(prevCursor(plans, { page: 2, step: 0 }), { page: 1, step: -1 }, "后退先进上一页的整页态");
  assert.deepEqual(prevCursor(plans, { page: 1, step: -1 }), { page: 0, step: 1 }, "再退到上一页最后一条");
  assert.deepEqual(prevCursor(plans, { page: 0, step: 1 }), { page: 0, step: 0 });
  assert.equal(prevCursor(plans, { page: 0, step: 0 }), null, "开头返回 null（原地不动）");
  assert.equal(firstStep(plans[0]), 0);
  assert.equal(lastStep(plans[1]), -1, "空页的 step 恒为 -1");
});

test("游标越界夹回：画框被删/游标过期不许炸", () => {
  const plans = [{ frameId: "f1", units: [{ key: "u1", ids: ["u1"] }], memberIds: ["u1"] }, { frameId: "f2", units: [], memberIds: [] }];
  assert.deepEqual(clampCursor(plans, { page: 9, step: 5 }), { page: 1, step: -1 });
  assert.deepEqual(clampCursor(plans, { page: 0, step: 9 }), { page: 0, step: 0 });
  assert.deepEqual(clampCursor([], { page: 3, step: 3 }), { page: 0, step: -1 }, "一页都没有时给个安全值");
});

/* ------------------------------ ② 闸门与接线 ------------------------------ */

test("存盘闸：放映中不判脏、不排自动保存、flush 绝不落盘", () => {
  assert.match(APP, /if \(!presentingRef\.current && !dirtyRef\.current\) \{/, "onChange 的脏判定整段让开");
  assert.match(APP, /const scheduleAutoSave = useCallback\(\(\) => \{\s*\n\s*if \(presentingRef\.current\) return;/, "自动保存排程让开");
  assert.match(APP, /if \(presentingRef\.current\) return !dirtyRef\.current;/, "flush 返回真实脏态、不写盘（关页签时宿主据此决定提示）");
  assert.match(APP, /if \(autoSaveTimer\.current !== null\) \{\s*\n\s*window\.clearTimeout\(autoSaveTimer\.current\);/, "进片场先清掉挂着的防抖定时器");
});

test("补丁不进撤销栈：updateScene 一律 CaptureUpdateAction.NEVER", () => {
  const at = APP.indexOf("const applyRunPatches");
  const body = APP.slice(at, APP.indexOf("const presentApply", at));
  assert.match(body, /captureUpdate: CaptureUpdateAction\.NEVER/, "放映补丁不许进撤销栈（否则 ⌘Z 会把放映状态打烂）");
  assert.match(body, /byId\.has\(e\.id\) \? \{ \.\.\.e, opacity: byId\.get\(e\.id\) as number \} : e/, "只动 opacity，别的字段原样带走");
  const exit = APP.slice(APP.indexOf("const exitPresentation"), APP.indexOf("const presentNext = useCallback"));
  assert.match(exit, /buildRestorePatches\(all, snap\.original\)/, "退出按快照回填");
  assert.match(exit, /buildTextRestorePatches\(all, snap\.textOriginal\)/, "打字打到一半也按全文快照回填");
  assert.match(exit, /viewModeEnabled: snap\.viewModeEnabled,[\s\S]{0,120}scrollX: snap\.scrollX,[\s\S]{0,120}zoom: \{ value: snap\.zoom \}/, "视口与视图模式都回原样");
});

test("进片场：抓快照 → 关编辑 → 藏抽屉 → 落第一屏", () => {
  const at = APP.indexOf("const enterPresentation");
  const body = APP.slice(at, APP.indexOf("const exitPresentation", at));
  assert.match(
    body,
    /plans: shown\.map\(\(s\) => planPage\(all, s\.id, ps\.reveal && s\.reveal !== "all"\)\)/,
    "片单按 visibleSlides 建计划；整页页 / 全局逐条关闭时不分条",
  );
  assert.match(body, /original: snapshotOpacity\(all\)/, "原始透明度快照");
  assert.match(body, /textOriginal: snapshotText\(all as unknown as TextElementLike\[\]\)/, "全文快照");
  assert.match(body, /scrim: ps\.scrim,[\s\S]{0,200}autoAdvance: ps\.autoAdvance/, "放映偏好进片场时定格");
  assert.match(body, /viewModeEnabled: true/, "放映中锁编辑");
  assert.match(body, /setPresentOpen\(false\)/, "抽屉收起");
  assert.match(body, /focusFrame\(/, "镜头开到第一页");
  assert.match(APP, /presentOpen && !presenting \? \(\s*\n\s*<PresentationDrawer/, "放映中抽屉不再渲染");
  assert.match(APP, /!presentOpen && !presenting \? \(/, "放映中右上角 ▶ 让位");
});

test("键位只在放映中接管，且不抢带修饰键的组合", () => {
  const at = APP.indexOf("const keys = presentKeysRef.current;");
  const body = APP.slice(at, APP.indexOf("window.addEventListener", at));
  assert.match(body, /const keys = presentKeysRef\.current;\s*\n\s*if \(!keys\) return;/, "非放映期一行都不碰");
  assert.match(body, /if \(event\.metaKey \|\| event\.ctrlKey \|\| event\.altKey\) return;/, "⌘/Ctrl/Alt 组合放行");
  for (const key of ["Escape", "ArrowRight", "ArrowDown", "PageDown", " ", "Enter", "ArrowLeft", "ArrowUp", "PageUp", "Backspace", "Home", "End"]) {
    assert.ok(body.includes(`case "${key}"`), `缺键位：${key}`);
  }
  assert.match(body, /event\.preventDefault\(\);\s*\n\s*event\.stopImmediatePropagation\(\);/, "吃干净，vendor 收不到");
  assert.match(APP, /presentKeysRef\.current = presenting\s*\n?\s*\? \{/, "处理器每帧换、监听只注册一次");
});

test("样式：放映中自绘控件让位", () => {
  assert.match(CSS, /\.exs-root\.exs-presenting \.exs-bottom-dock,\s*\n\.exs-root\.exs-presenting \.exs-script-rail \{\s*\n\s*display: none;/, "底栏与竖条放映时隐藏");
  assert.match(APP, /presenting \? "exs-presenting" : ""/, "根节点带放映态类名");
});

/* ------------------------------ ③ 分层 ------------------------------ */

test("presentation-run 只依赖 presentation-plan，仍可 node 直跑", () => {
  const RUN = src("studio/presentation-run.ts");
  assert.equal(RUN.includes('from "react"'), false);
  assert.equal(RUN.includes('from "siyuan"'), false);
  assert.equal(RUN.includes("@excalidraw"), false);
  assert.equal(RUN.includes("../i18n"), false);
  const imports = [...RUN.matchAll(/^import .* from "([^"]+)";$/gm)].map((m) => m[1]);
  assert.deepEqual(imports, ["./presentation-plan.ts"], "运行时只许依赖片单纯逻辑");
});
