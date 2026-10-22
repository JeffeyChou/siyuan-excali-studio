/**
 * 第七十六轮：放映有向图（照搬 Advanced Canvas 的演示路线）。
 *
 * 断言分两段：
 * ① **纯逻辑真跑**：边的识别（引擎绑定 + 几何判定双通道）、出边排序
 *    （有文字的在前并按字母序）、方位判定、选边（没走过的优先、否则退回最后一条）、
 *    导航状态机（先走分条再换页、后退沿访问栈、线性兜底）。
 *    这几条错了用户看到的就是「箭头画了却不走」「翻页顺序乱」。
 * ② **接线**：放映期要关画框渲染（框线靠关渲染而不是压 opacity），
 *    别的页内容不许清零（「放映全空」的根治点）。
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  arrowEndpoints,
  buildSlideGraph,
  compareOutgoingEdges,
  graphState,
  pickNextEdge,
  reachableFrom,
  sideBetween,
} from "../src/studio/presentation-graph.ts";
import { navEnd, navHome, navJump, navNext, navPrev, navStart, toCursor } from "../src/studio/presentation-nav.ts";
import { planPage } from "../src/studio/presentation-run.ts";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const src = (rel) => readFileSync(resolve(ROOT, "src/" + rel), "utf8");
const stripComments = (code) => code.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'\\])\/\/[^\n]*/g, "$1");
const APP = stripComments(src("studio/StudioApp.tsx"));

/** 画框（节点）——字段名跟 Excalidraw 元素一致（width/height） */
const frame = (id, x, y, width = 400, height = 300) => ({ id, type: "frame", x, y, width, height });
/** 箭头（边）：points 是相对坐标，x/y 是原点 */
const arrow = (id, x, y, pts, over = {}) => ({
  id,
  type: "arrow",
  x,
  y,
  width: 100,
  height: 50,
  points: pts,
  ...over,
});

/* ------------------------------ ① 图模型 ------------------------------ */

test("边识别：几何判定——箭头起终点落在两个画框里就是一条边", () => {
  // f1 在 (0,0,400,300)，f2 在 (600,0,400,300)
  const frames = [frame("f1", 0, 0), frame("f2", 600, 0)];
  const arrowA = arrow("a1", 100, 100, [
    [0, 0],
    [600, 0],
  ]);
  const graph = buildSlideGraph([arrowA], frames);
  assert.equal(graph.edges.length, 1, "识别出一条边");
  assert.equal(graph.edges[0].from, "f1", "起点在 f1 里");
  assert.equal(graph.edges[0].to, "f2", "终点在 f2 里");
  assert.equal(graph.edges[0].side, "right", "f2 在 f1 右边");
});

test("边识别：引擎绑定通道——绑定指向画框也算边（跨画框拖的箭头）", () => {
  const frames = [frame("f1", 0, 0), frame("f2", 600, 0)];
  // 端点几何上都不在画框里（箭头画在别处），但引擎认了绑定
  const bound = arrow("a1", 2000, 2000, [
    [0, 0],
    [10, 10],
  ], {
    startBinding: { elementId: "f1" },
    endBinding: { elementId: "f2" },
  });
  const graph = buildSlideGraph([bound], frames);
  assert.equal(graph.edges.length, 1, "绑定通道命中");
  assert.equal(graph.edges[0].from, "f1");
  assert.equal(graph.edges[0].to, "f2");
});

test("边识别：同一个画框内部的箭头不成边（自环丢弃）", () => {
  const frames = [frame("f1", 0, 0)];
  const inner = arrow("a1", 50, 50, [
    [0, 0],
    [100, 100],
  ]);
  const graph = buildSlideGraph([inner], frames);
  assert.equal(graph.edges.length, 0, "自己连自己不算边");
});

test("边识别：只认画框之间的箭头，散落的箭头不成边", () => {
  const frames = [frame("f1", 0, 0), frame("f2", 600, 0)];
  const floating = arrow("a1", 5000, 5000, [
    [0, 0],
    [100, 0],
  ]);
  const graph = buildSlideGraph([floating], frames);
  assert.equal(graph.edges.length, 0, "不在任何画框里的箭头不成边");
});

test("出边排序：有文字的在前并按字母序，没文字的排后面（Advanced Canvas 同款）", () => {
  const edges = [
    { id: "c", from: "f1", to: "x", label: "", side: "right" },
    { id: "b", from: "f1", to: "x", label: "2", side: "right" },
    { id: "a", from: "f1", to: "x", label: "1", side: "right" },
  ];
  const sorted = [...edges].sort(compareOutgoingEdges);
  assert.deepEqual(sorted.map((e) => e.id), ["a", "b", "c"], "1、2 在前，无文字的最后");
});

test("选边：优先没走过的；全走过了就退回最后一条（于是能绕成环）", () => {
  const frames = [frame("f1", 0, 0), frame("f2", 600, 0), frame("f3", 0, 600)];
  const a1 = arrow("a1", 100, 100, [
    [0, 0],
    [0, 500],
  ]);
  const a2 = arrow("a2", 100, 600, [
    [0, 0],
    [0, -500],
  ]);
  const graph = buildSlideGraph([a1, a2], frames);
  const out = graph.out.get("f1") ?? [];
  assert.equal(out.length, 1, "f1 有一条出边（去 f3）");
  const first = pickNextEdge(graph, "f1", []);
  assert.equal(first.id, "a1", "先走没走过的");
  const afterBoth = pickNextEdge(graph, "f1", ["a1"]);
  assert.equal(afterBoth.id, "a1", "都走过就退回最后一条（成环）");
});

test("选边：方向键只走该方位的出边", () => {
  const frames = [frame("f1", 0, 0), frame("right", 600, 0), frame("down", 0, 600)];
  const aR = arrow("aR", 100, 100, [
    [0, 0],
    [600, 0],
  ]);
  const aD = arrow("aD", 100, 100, [
    [0, 0],
    [0, 500],
  ]);
  const graph = buildSlideGraph([aR, aD], frames);
  assert.equal(pickNextEdge(graph, "f1", [], "right")?.id, "aR", "按 → 走右边的边");
  assert.equal(pickNextEdge(graph, "f1", [], "bottom")?.id, "aD", "按 ↓ 走下边的边");
  assert.equal(pickNextEdge(graph, "f1", [], "top"), null, "上方没边就不走");
});

test("可达性：能从起点走到的节点集合", () => {
  const frames = [frame("f1", 0, 0), frame("f2", 600, 0), frame("f3", 1200, 0)];
  const a1 = arrow("a1", 100, 100, [
    [0, 0],
    [600, 0],
  ]);
  const a2 = arrow("a2", 700, 100, [
    [0, 0],
    [600, 0],
  ]);
  const graph = buildSlideGraph([a1, a2], frames);
  const reach = reachableFrom(graph, "f1");
  assert.ok(reach.has("f1") && reach.has("f2") && reach.has("f3"), "f1→f2→f3 都能到");
  assert.equal(reach.size, 3);
});

test("箭头端点与方位：多段折线取首尾点；方位按中心点比", () => {
  const a = arrow("a1", 100, 200, [
    [10, 20],
    [50, 50],
    [90, 80],
  ]);
  const ep = arrowEndpoints(a);
  assert.deepEqual(ep, { sx: 110, sy: 220, ex: 190, ey: 280 }, "首尾点加原点");
  assert.equal(sideBetween(frame("f1", 0, 0), frame("f2", 600, 0)), "right");
  assert.equal(sideBetween(frame("f1", 0, 0), frame("f2", 0, 600)), "bottom");
  assert.equal(sideBetween(frame("f1", 0, 0), frame("f2", -600, 0)), "left");
  assert.equal(sideBetween(frame("f1", 0, 0), frame("f2", 0, -600)), "top");
});

test("图状态：linear / linked / partial 三态（面板提示用）", () => {
  // 没有箭头 → linear（按页序翻）
  const frames = [frame("f1", 0, 0), frame("f2", 600, 0)];
  const none = buildSlideGraph([], frames);
  const s1 = graphState(none);
  assert.equal(s1.kind, "linear", "没箭头 = 按页序翻");
  assert.equal(s1.edgeCount, 0);
  assert.deepEqual(s1.unlinkedIds, ["f1", "f2"], "两页都没连上");

  // f1 → f2 → 都连上 → linked
  const a = arrow("a1", 100, 100, [
    [0, 0],
    [600, 0],
  ]);
  const linked = graphState(buildSlideGraph([a], frames));
  assert.equal(linked.kind, "linked", "都连上了 = 沿箭头走");
  assert.equal(linked.edgeCount, 1);

  // 三页只连两页 → partial
  const frames3 = [frame("f1", 0, 0), frame("f2", 600, 0), frame("f3", 1200, 0)];
  const partial = graphState(buildSlideGraph([a], frames3));
  assert.equal(partial.kind, "partial", "部分连上 = 提示用户");
  assert.deepEqual(partial.unlinkedIds, ["f3"], "f3 没连上");
});

/* ------------------------------ ② 导航状态机 ------------------------------ */

const mkPlans = (ids) =>
  ids.map((id) => planPage([{ id, type: "frame", x: 0, y: 0, width: 400, height: 300 }], id));

test("导航：先走完本页分条，再换页", () => {
  const plans = mkPlans(["f1", "f2"]);
  // f1 塞两个分条
  const withUnits = [
    { id: "a", type: "rectangle", x: 0, y: 0, width: 10, height: 10, frameId: "f1" },
    { id: "b", type: "rectangle", x: 0, y: 100, width: 10, height: 10, frameId: "f1" },
  ];
  const p = planPage(withUnits, "f1");
  const st = navStart([p, plans[1]], null, 0);
  assert.equal(st.step, 0, "从第一条分条开始");
  const s1 = navNext([p, plans[1]], null, st);
  assert.equal(s1?.page, 0, "还在本页（第二条分条）");
  assert.equal(s1?.step, 1);
  const s2 = navNext([p, plans[1]], null, s1);
  assert.equal(s2?.page, 1, "本页走完才换页");
});

test("导航：有图时沿边换页（不是按片单顺序）", () => {
  const frames = [frame("f1", 0, 0), frame("f2", 600, 0), frame("f3", 1200, 0)];
  // f1 → f3（跳过 f2）
  const a = arrow("a1", 100, 100, [
    [0, 0],
    [1200, 0],
  ]);
  const graph = buildSlideGraph([a], frames);
  const plans = mkPlans(["f1", "f2", "f3"]);
  const st = navStart(plans, graph, 0);
  const next = navNext(plans, graph, st);
  assert.equal(next?.page, 2, "沿箭头直接到 f3，跳过 f2");
});

test("导航：没图时退回线性翻页（零配置体验不被图模型绑架）", () => {
  const plans = mkPlans(["f1", "f2", "f3"]);
  const st = navStart(plans, null, 0);
  assert.equal(navNext(plans, null, st)?.page, 1, "按片单顺序");
  assert.equal(navNext(plans, null, navNext(plans, null, st))?.page, 2);
});

test("导航：后退沿访问栈弹回（回到的页是整页态）", () => {
  const plans = mkPlans(["f1", "f2", "f3"]);
  const st = navStart(plans, null, 0);
  const s1 = navNext(plans, null, st);
  const s2 = navNext(plans, null, s1);
  assert.equal(s2?.page, 2);
  const back = navPrev(plans, null, s2);
  assert.equal(back?.page, 1, "弹回上一页");
  assert.equal(back?.step, -1, "回到的页是整页态");
  assert.equal(navPrev(plans, null, back)?.page, 0);
  assert.equal(navPrev(plans, null, navPrev(plans, null, back)), null, "回到头就没有上一页了");
});

test("导航：跳页 / 首页 / 末页", () => {
  const plans = mkPlans(["f1", "f2", "f3"]);
  const st = navStart(plans, null, 0);
  const jumped = navJump(plans, st, 2);
  assert.equal(jumped.page, 2);
  assert.equal(jumped.step, -1, "跳页落整页态");
  assert.equal(navHome(plans, null, jumped, 0).page, 0, "Home 回首页");
  assert.equal(navEnd(plans, null, st).page, 2, "End 到末页");
  assert.equal(toCursor(st).page, 0, "NavState 能派生成 Cursor");
});

test("导航：End 沿图一路走到头（不是简单跳末页）", () => {
  // f1 → f3，f2 不在路线上；End 应该走到 f3 而不是 f2
  const frames = [frame("f1", 0, 0), frame("f2", 600, 0), frame("f3", 1200, 0)];
  const a = arrow("a1", 100, 100, [
    [0, 0],
    [1200, 0],
  ]);
  const graph = buildSlideGraph([a], frames);
  const plans = mkPlans(["f1", "f2", "f3"]);
  const st = navStart(plans, graph, 0);
  const end = navEnd(plans, graph, st);
  assert.equal(end.page, 2, "沿图走到 f3");
  assert.equal(end.done, true, "标完成");
  // 没有图时 End 退到片单末页
  const endLinear = navEnd(plans, null, st);
  assert.equal(endLinear.page, 2, "无线性兜底到末页");
});

test("导航：走到头返回 null（调用方据此收场）", () => {
  const plans = mkPlans(["f1"]);
  const st = navStart(plans, null, 0);
  assert.equal(navNext(plans, null, st), null, "最后一页没有下一页");
});

/* ------------------------------ ③ 接线（源码断言） ------------------------------ */

test("接线：放映期关画框渲染，退出还原（不再压画框 opacity）", () => {
  assert.match(
    APP,
    /frameRendering: \{ enabled: false, name: false, outline: false, clip: false \}/,
    "进片场关掉画框的框线/名字/裁剪",
  );
  assert.match(APP, /frameRendering: \{ \.\.\.snap\.frameRendering \}/, "退出按快照还原");
  assert.match(APP, /frameRendering: \{\s*\n\s*enabled: st\.frameRendering\?\.enabled !== false,/, "进片场先存原值");
  // 关键：buildRunPatches 里不能再有「画框压 0」
  const run = stripComments(src("studio/presentation-run.ts"));
  assert.equal(/e\.type === "frame" \? 0/.test(run), false, "画框不再被压成 0");
  assert.match(run, /if \(e\.type === "frame"\) continue;/, "画框整个跳过");
  assert.match(run, /if \(!plan\.memberIds\.includes\(e\.id\)\) continue;/, "别页内容不碰（相机负责）");
});

test("接线：方向键按方位走边 + F 键切全屏", () => {
  assert.match(APP, /nextDir: \(side: GraphSide\) =>/, "键位表带方位导航");
  assert.match(APP, /if \(snap\?\.graph && snap\.directional\) presentNext\(side\);/, "有图且开了方向导航才按方位走");
  assert.match(APP, /fullscreen: toggleFullscreen/, "F 键切全屏");
  assert.match(APP, /case "f":/, "F 键位");
});
