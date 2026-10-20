// 2026-10-18 A/B：AI 计划 DSL 的纯函数层。模型只写结构，布局/样式/坐标都由这里兜住，
// 所以断言盯「归一化结果 + 几何不重叠 + 场景绑定」三件事，不盯具体像素值。
import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizePlan, PlanError, PLAN_LIMITS } from "../src/studio/ai/plan.ts";
import { layoutPlan } from "../src/studio/ai/layout.ts";
import { renderPlan } from "../src/studio/ai/render.ts";
import { buildHeadlessScene, composeHeadlessScene, planToSvg } from "../src/studio/ai/headless.ts";
import { expandElementSpecs } from "../src/studio/ea-element.ts";
import { PLAN_PRESETS, fillFor } from "../src/studio/ai/preset.ts";
import { decodeSvgPayload, hasNonEmptyScene } from "../src/studio/scene-codec.ts";

function reasonOf(fn) {
  try {
    fn();
  } catch (e) {
    assert.ok(e instanceof PlanError, `应当抛 PlanError，实得 ${e?.constructor?.name}`);
    return e.reason;
  }
  assert.fail("应当抛 PlanError");
}

function assertNoOverlap(nodes) {
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i];
      const b = nodes[j];
      const hit = a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
      assert.equal(hit, false, `节点 ${a.id} 与 ${b.id} 重叠`);
    }
  }
}

test("归一化·松散输入：字符串节点 / 三种边 / 按 id 与标签解析端点", () => {
  const plan = normalizePlan({
    title: "注册",
    nodes: ["打开思源", { id: "check", text: "已登录？", shape: "decision", note: "看会话" }, { label: "进入白板", shape: "rect" }],
    edges: ["打开思源->check", ["check", "进入白板", "是"], { source: "n1", target: "进入白板" }],
  });
  assert.equal(plan.preset, "pencil");
  assert.equal(plan.layout, "lr");
  assert.deepEqual(plan.warnings, []);
  assert.deepEqual(plan.nodes, [
    { id: "n1", label: "打开思源", shape: "rounded" },
    { id: "check", label: "已登录？\n看会话", shape: "diamond" },
    { id: "n3", label: "进入白板", shape: "rectangle" },
  ]);
  assert.deepEqual(plan.edges, [
    { from: "n1", to: "check" },
    { from: "check", to: "n3", label: "是" },
    { from: "n1", to: "n3" },
  ]);
});

test("归一化·默认值与覆盖层：无edge走grid；CLI/能力参数优先于计划", () => {
  assert.equal(normalizePlan({ nodes: ["a", "b"] }).layout, "grid");
  assert.equal(normalizePlan({ nodes: ["a", "b"], edges: ["a->b"] }).layout, "lr");
  const p = normalizePlan(
    { title: "计划标题", preset: "marker", layout: "tb", nodes: ["a"] },
    { title: "参数标题", preset: "technical", layout: "mindmap" },
  );
  assert.equal(p.title, "参数标题");
  assert.equal(p.preset, "blueprint");
  assert.equal(p.layout, "radial");
  assert.equal(normalizePlan({ nodes: ["a"], layout: "horizontal" }).layout, "lr");
  assert.equal(normalizePlan({ nodes: ["a"], layout: "matrix" }).layout, "grid");
});

test("归一化·局部问题记 warnings 不整单失败", () => {
  const plan = normalizePlan({ nodes: ["A", "B"], edges: ["A->B", "A->B", "A->A", "A->Z", 42] });
  assert.equal(plan.edges.length, 1);
  assert.equal(plan.warnings.length, 4);
  assert.ok(plan.warnings.every((w) => typeof w === "string" && w.length > 0));
});

test("归一化·结构错误给稳定 reason（CLI/智能体据此改计划）", () => {
  assert.equal(reasonOf(() => normalizePlan(null)), "bad-plan");
  assert.equal(reasonOf(() => normalizePlan({})), "bad-plan");
  assert.equal(reasonOf(() => normalizePlan({ nodes: [] })), "empty-plan");
  assert.equal(reasonOf(() => normalizePlan({ nodes: ["x"], edges: "nope" })), "bad-plan");
  assert.equal(reasonOf(() => normalizePlan({ nodes: [{ id: "a", label: "A" }, { id: "a", label: "B" }] })), "duplicate-node-id");
  assert.equal(
    reasonOf(() => normalizePlan({ nodes: Array.from({ length: PLAN_LIMITS.maxNodes + 1 }, (_, i) => `n${i}`) })),
    "too-many-nodes",
  );
  assert.equal(
    reasonOf(() => normalizePlan({ nodes: ["x"], edges: new Array(PLAN_LIMITS.maxEdges + 1).fill("x->x") })),
    "too-many-edges",
  );
  assert.equal(reasonOf(() => normalizePlan({ nodes: [{ label: "x", shape: "hexagon" }] })), "bad-shape");
  assert.equal(reasonOf(() => normalizePlan({ nodes: ["x"], preset: "neon" })), "bad-preset");
  assert.equal(reasonOf(() => normalizePlan({ nodes: ["x"], layout: "zigzag" })), "bad-layout");
});

test("归一化·字数上限：标题 120 / 节点 321 / 边标签 60，截断带省略号", () => {
  const long = "画".repeat(400);
  const p = normalizePlan({ title: long, nodes: [{ label: long }] });
  assert.equal(p.title.length, PLAN_LIMITS.maxTitle);
  assert.ok(p.title.endsWith("…"));
  assert.equal(p.nodes[0].label.length, PLAN_LIMITS.maxLabel + PLAN_LIMITS.maxNote + 1);
  assert.ok(p.nodes[0].label.endsWith("…"));
  const e = normalizePlan({ nodes: ["a", "b"], edges: [{ from: "a", to: "b", label: long }] });
  assert.equal(e.edges[0].label.length, PLAN_LIMITS.maxEdgeLabel);
  assert.ok(e.edges[0].label.endsWith("…"));
});

test("布局·lr 按 DAG 分层（同层同列）且节点不重叠", () => {
  const plan = normalizePlan({
    nodes: [
      { id: "a", label: "A" },
      { id: "b", label: "B" },
      { id: "c", label: "C" },
      { id: "d", label: "D" },
    ],
    edges: ["a->b", "a->c", "b->d", "c->d"],
  });
  const { nodes, contentBox } = layoutPlan(plan);
  const by = Object.fromEntries(nodes.map((n) => [n.id, n]));
  assert.ok(by.a.x < by.b.x && by.b.x < by.d.x, "层级必须沿 x 递增");
  assert.equal(by.b.x, by.c.x, "同层节点共享列起点（宽度一致时）");
  assert.ok(by.b.y < by.c.y, "同层节点纵向排开");
  assertNoOverlap(nodes);
  assert.ok(contentBox.width > 0 && contentBox.height > 0);
});

test("布局·tb / grid / radial / 环收敛", () => {
  const tb = layoutPlan(
    normalizePlan({ layout: "tb", nodes: [{ id: "a", label: "A" }, { id: "b", label: "B" }, { id: "c", label: "C" }], edges: ["a->b", "b->c"] }),
  );
  const tbById = Object.fromEntries(tb.nodes.map((n) => [n.id, n]));
  assert.ok(tbById.a.y < tbById.b.y && tbById.b.y < tbById.c.y);
  assertNoOverlap(tb.nodes);

  const grid = layoutPlan(normalizePlan({ nodes: ["1", "2", "3", "4", "5"] }));
  assert.equal(grid.nodes[0].x, grid.nodes[3].x, "5 节点 = 3 列，第 4 个回到第一列");
  assert.ok(grid.nodes[0].y < grid.nodes[3].y);
  assertNoOverlap(grid.nodes);

  const radialPlan = normalizePlan({
    layout: "radial",
    nodes: [
      { id: "hub", label: "中心" },
      { id: "a", label: "甲" },
      { id: "b", label: "乙" },
      { id: "c", label: "丙" },
      { id: "d", label: "丁" },
    ],
    edges: ["hub->a", "hub->b", "hub->c", "hub->d"],
  });
  const radial = layoutPlan(radialPlan);
  const hub = radial.nodes.find((n) => n.id === "hub");
  assert.ok(hub.x >= 0 && hub.y >= 0, "radial 不产生负坐标");
  assert.equal(Math.round(hub.x + hub.width / 2), Math.round(radial.contentBox.cx), "度数最高的节点居中");
  assert.equal(Math.round(hub.y + hub.height / 2), Math.round(radial.contentBox.cy));
  assertNoOverlap(radial.nodes);
  assert.equal(radial.routes.length, 4);

  const one = layoutPlan(normalizePlan({ layout: "radial", nodes: ["单"] }));
  assert.equal(one.nodes[0].x, 0);
  assert.equal(one.nodes[0].y, 0);

  const cyclic = layoutPlan(normalizePlan({ nodes: ["a", "b", "c"], edges: ["a->b", "b->a", "b->c"] }));
  for (const n of cyclic.nodes) {
    assert.ok(Number.isFinite(n.x) && Number.isFinite(n.y), "有环计划也必须收敛出有限坐标");
  }
  assertNoOverlap(cyclic.nodes);
});

test("预设·marker 调色板按组稳定取色；pencil 单色", () => {
  const palette = PLAN_PRESETS.marker.fillPalette;
  assert.equal(fillFor(PLAN_PRESETS.marker, 0, "core"), fillFor(PLAN_PRESETS.marker, 99, "core"));
  assert.ok(palette.includes(fillFor(PLAN_PRESETS.marker, 0, "core")));
  const groups = ["core", "data", "ui", "ops", "net", "db"].map((g) => fillFor(PLAN_PRESETS.marker, 0, g));
  assert.ok(new Set(groups).size > 1, "不同组应能取到多种颜色");
  assert.equal(fillFor(PLAN_PRESETS.pencil, 0), PLAN_PRESETS.pencil.fill);
  assert.equal(fillFor(PLAN_PRESETS.blueprint, 7, "any"), PLAN_PRESETS.blueprint.fill);
});

test("渲染·规格顺序/样式/组/标签，origin 与 idPrefix 生效", () => {
  const rendered = renderPlan(
    {
      title: "架构",
      caption: "说明",
      preset: "blueprint",
      nodes: [
        { id: "api", label: "API", group: "core" },
        { id: "db", label: "DB", shape: "diamond" },
        { id: "note", label: "备注", shape: "text" },
      ],
      edges: [{ from: "api", to: "db", label: "读写" }],
    },
    { origin: { x: 100, y: 200 }, idPrefix: "run 1" },
  );
  assert.equal(rendered.idPrefix, "run_1", "id 前缀必须清成合法字符");
  assert.equal(rendered.background, PLAN_PRESETS.blueprint.background);
  assert.deepEqual(
    rendered.specs.map((s) => s.id),
    ["run_1-title", "run_1-api", "run_1-db", "run_1-note", "run_1-edge-1", "run_1-caption"],
  );
  const [title, api, db, note, edgeLabel, caption] = rendered.specs;
  assert.equal(title.x, 140);
  assert.equal(title.y, 224);
  assert.equal(title.fontSize, 26);
  assert.equal(api.type, "rectangle");
  assert.deepEqual(api.roundness, { type: 3 });
  assert.equal(api.backgroundColor, PLAN_PRESETS.blueprint.fill);
  assert.equal(api.strokeWidth, 1);
  assert.equal(api.roughness, 0);
  assert.deepEqual(api.groupIds, ["run_1-group-core"]);
  assert.equal(db.type, "diamond");
  assert.equal(note.type, "text");
  assert.equal(note.textAlign, "left");
  assert.equal(note.roundness, undefined);
  assert.equal(edgeLabel.text, "读写");
  assert.equal(edgeLabel.strokeColor, PLAN_PRESETS.blueprint.muted);
  assert.ok(caption.y > Math.max(...rendered.nodes.map((n) => n.y + n.height)), "说明文字在节点下方");
  assert.equal(rendered.routes.length, 1);
  assert.equal(rendered.routes[0].fromElementId, "run_1-api");
  assert.equal(rendered.routes[0].toElementId, "run_1-db");
  assert.ok(rendered.routes[0].points.length >= 2);
  assert.ok(rendered.bbox.minX <= 140 && rendered.bbox.maxX >= api.x + api.width);
});

test("渲染·rectangle 直角、几何图形跟随预设圆角", () => {
  const rendered = renderPlan({
    nodes: [
      { id: "a", label: "A", shape: "rectangle" },
      { id: "b", label: "B", shape: "ellipse" },
      { id: "c", label: "C" },
    ],
  });
  const by = Object.fromEntries(rendered.specs.map((s) => [s.id, s]));
  assert.equal(by["ai-a"].roundness, null, "rectangle 是直角");
  assert.deepEqual(by["ai-b"].roundness, { type: 3 });
  assert.deepEqual(by["ai-c"].roundness, { type: 3 }, "默认 rounded 用预设圆角");
});

test("无头·绑定文字展开：容器 + 居中文字继承字体/颜色", () => {
  const rendered = renderPlan({ nodes: [{ id: "a", label: "甲" }] }, { idPrefix: "h" });
  const els = expandElementSpecs(rendered.specs);
  assert.equal(els.length, 2);
  const [main, text] = els;
  assert.equal(main.type, "rectangle");
  assert.equal(text.type, "text");
  assert.equal(text.containerId, main.id);
  assert.deepEqual(main.boundElements, [{ id: text.id, type: "text" }]);
  assert.equal(text.fontFamily, rendered.preset.fontFamily);
  assert.equal(text.strokeColor, rendered.preset.ink);
  assert.equal(text.verticalAlign, "middle");
});

test("无头·场景：箭头双向绑定 + 挂进节点 boundElements + index 连续", () => {
  const rendered = renderPlan(
    { nodes: [{ id: "a", label: "甲" }, { id: "b", label: "乙", shape: "diamond" }], edges: ["a->b"] },
    { idPrefix: "h" },
  );
  const scene = buildHeadlessScene(rendered);
  assert.equal(scene.elements.length, 5, "2 节点 ×（容器+文字）+ 1 箭头");
  const arrow = scene.elements.find((el) => el.type === "arrow");
  assert.equal(arrow.id, "h-arrow-1");
  assert.equal(arrow.startBinding.elementId, "h-a");
  assert.equal(arrow.endBinding.elementId, "h-b");
  const a = scene.elements.find((el) => el.id === "h-a");
  const b = scene.elements.find((el) => el.id === "h-b");
  assert.ok(a.boundElements.some((x) => x.id === arrow.id && x.type === "arrow"));
  assert.ok(b.boundElements.some((x) => x.id === arrow.id && x.type === "arrow"));
  assert.deepEqual(arrow.points[0], [0, 0]);
  assert.deepEqual(
    scene.elements.map((el) => el.index),
    ["a00000001", "a00000002", "a00000003", "a00000004", "a00000005"],
  );
  assert.equal(scene.appState.viewBackgroundColor, PLAN_PRESETS.pencil.background);
});

test("无头·追加合成：旧元素按 index 排序保留，背景/files 不被覆盖", () => {
  const first = buildHeadlessScene(renderPlan({ nodes: ["旧"] }, { idPrefix: "one" }));
  const second = renderPlan({ nodes: ["新"] }, { idPrefix: "two" });
  const merged = composeHeadlessScene(
    { elements: first.elements, appState: { viewBackgroundColor: "#111111" }, files: { f: { id: "f", dataURL: "data:," } } },
    second,
  );
  assert.equal(merged.elements.length, 4);
  assert.equal(merged.appState.viewBackgroundColor, "#111111", "追加不能改掉已有背景");
  assert.deepEqual(merged.files, { f: { id: "f", dataURL: "data:," } });
  assert.ok(merged.elements.some((el) => el.id === "one-n1"));
  assert.ok(merged.elements.some((el) => el.id === "two-n1"));
  assert.deepEqual(
    merged.elements.map((el) => el.index),
    ["a00000001", "a00000002", "a00000003", "a00000004"],
  );

  const disordered = composeHeadlessScene(
    {
      elements: [
        { id: "late", type: "rectangle", index: "a00000002" },
        { id: "early", type: "rectangle", index: "a00000001" },
      ],
      appState: {},
      files: {},
    },
    renderPlan({ nodes: ["x"] }, { idPrefix: "z" }),
  );
  assert.equal(disordered.elements[0].id, "early", "旧场景按 index 数值序归位");
  assert.equal(disordered.elements[1].id, "late");
});

test("SVG 落盘·载荷可解码 / 预览 XML 转义 / 背景补底", () => {
  const rendered = renderPlan(
    { title: "标题", caption: "说明", nodes: [{ label: '<b>&"引号"' }], edges: [] },
    { idPrefix: "rt" },
  );
  const { svgText, scene } = planToSvg(rendered, null);
  assert.ok(svgText.startsWith("<svg"));
  assert.ok(svgText.includes("svg-source:excalidraw"), "必须是 Excalidraw 认得的 SVG 标记");
  assert.equal(hasNonEmptyScene(svgText), true);
  assert.match(svgText, /<rect [^>]*fill="#fffdf7"/, "背景补底进预览");
  assert.match(svgText, /<tspan/, "文字要有预览");
  assert.ok(svgText.includes("&lt;b&gt;&amp;&quot;引号&quot;"), "预览文字必须过 XML 转义");
  const decoded = decodeSvgPayload(svgText);
  assert.equal(decoded.elements.length, scene.elements.length);
  assert.equal(decoded.appState.viewBackgroundColor, PLAN_PRESETS.pencil.background);
  assert.equal(decoded.elements.filter((el) => el.type === "rectangle").length, 1);
  assert.equal(decoded.elements.filter((el) => el.containerId).length, 1, "绑定文字往返不丢");
});
