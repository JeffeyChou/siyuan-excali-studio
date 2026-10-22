// 计划 DSL 的可选布局提示：node.rank / node.order / 顶层 groups（画框）。
// 不写提示时与以前完全一样；写错的提示只记 warning，不让整张图失败。
import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizePlan } from "../src/studio/ai/plan.ts";
import { layoutPlan } from "../src/studio/ai/layout.ts";
import { renderPlan } from "../src/studio/ai/render.ts";

const BASE = {
  layout: "tb",
  nodes: [
    { id: "web", label: "Browser", group: "client" },
    { id: "app", label: "Agents", group: "client" },
    { id: "gw", label: "Gateway", shape: "diamond" },
    { id: "api", label: "API", group: "server" },
    { id: "db", label: "Database", group: "server" },
  ],
  edges: ["web->gw", "app->gw", "gw->api", "api->db"],
};

const byId = (nodes) => Object.fromEntries(nodes.map((n) => [n.id, n]));
const overlaps = (a, b) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

test("不写提示：没有框、没有新 warning，坐标与只写 group 时相同", () => {
  const plain = layoutPlan(normalizePlan(BASE));
  assert.deepEqual(plain.frames, []);
  assert.deepEqual(plain.warnings, []);
  // group 只上色：去掉 group 字段，布局不变
  const noGroup = layoutPlan(normalizePlan({ ...BASE, nodes: BASE.nodes.map(({ group, ...n }) => n) }));
  assert.deepEqual(
    plain.nodes.map((n) => [n.id, n.x, n.y]),
    noGroup.nodes.map((n) => [n.id, n.x, n.y]),
  );
});

test("rank 把节点钉到指定层", () => {
  const plan = { ...BASE, nodes: BASE.nodes.map((n) => (n.id === "db" ? { ...n, rank: 1 } : n)) };
  const by = byId(layoutPlan(normalizePlan(plan)).nodes);
  // db 本来在第 3 层（api 之后），钉到第 1 层后与 gw 同一行
  assert.equal(Math.round(by.db.y + by.db.height / 2), Math.round(by.gw.y + by.gw.height / 2));
});

test("order: 0 把节点排到本层最前（平局时写了 order 的优先）", () => {
  const plan = { ...BASE, nodes: BASE.nodes.map((n) => (n.id === "app" ? { ...n, order: 0 } : n)) };
  const by = byId(layoutPlan(normalizePlan(plan)).nodes);
  assert.ok(by.app.x < by.web.x, "app 应在 web 左边");
});

test("grid 里 order 决定格子先后；radial 里决定环上先后", () => {
  const grid = layoutPlan(normalizePlan({ layout: "grid", nodes: [{ id: "a", label: "a" }, { id: "b", label: "b" }, { id: "c", label: "c", order: 0 }] }));
  const g = byId(grid.nodes);
  assert.ok(g.c.x < g.a.x && g.c.y === g.a.y, "c 排到第一格");

  const ring = ["l1", "l2", "l3", "l4"].map((id) => ({ id, label: id }));
  ring[3].order = 0;
  const radial = layoutPlan(normalizePlan({ layout: "radial", nodes: [{ id: "hub", label: "hub" }, ...ring], edges: ring.map((n) => ({ from: "hub", to: n.id })) }));
  // 第一个叶子在正上方（起始角 -90°）
  const top = radial.nodes.filter((n) => n.id !== "hub").sort((a, b) => a.y - b.y)[0];
  assert.equal(top.id, "l4");
});

test("groups 画框：框包住全部成员，标题在框内左上，框在节点下层", () => {
  const plan = { ...BASE, groups: { client: "Clients", server: "Servers" } };
  const layout = layoutPlan(normalizePlan(plan));
  assert.equal(layout.frames.length, 2);
  const by = byId(layout.nodes);
  for (const f of layout.frames) {
    for (const n of layout.nodes.filter((x) => x.group === f.id)) {
      assert.ok(n.x >= f.x && n.y >= f.y && n.x + n.width <= f.x + f.width && n.y + n.height <= f.y + f.height, `${n.id} 应在框 ${f.id} 内`);
    }
    assert.ok(f.labelAt.x > f.x && f.labelAt.y > f.y, "标题在框内");
  }
  assert.ok(!overlaps(layout.frames[0], layout.frames[1]), "两个框不重叠");
  assert.ok(!overlaps(layout.frames.find((f) => f.id === "client"), by.gw), "框不包住非成员");
  assert.deepEqual(layout.warnings, []);

  const rendered = renderPlan(plan);
  const ids = rendered.specs.map((s) => s.id);
  const firstFrame = ids.findIndex((id) => id.includes("-frame-"));
  const firstNode = ids.findIndex((id) => id.endsWith("-web"));
  assert.ok(firstFrame >= 0 && firstFrame < firstNode, "框的元素排在节点前（z 序在下）");
  const frame = rendered.specs[firstFrame];
  assert.equal(frame.strokeStyle, "dashed");
  assert.equal(frame.backgroundColor, "transparent");
  assert.deepEqual(frame.groupIds, rendered.specs.find((s) => s.id.endsWith("-web")).groupIds, "框与成员同一个 Excalidraw 组");
});

test("框不与标题重叠，坐标都不为负", () => {
  const rendered = renderPlan({ ...BASE, title: "A title long enough to collide", groups: { client: "Clients" } });
  const title = rendered.specs.find((s) => s.id.endsWith("-title"));
  const frame = rendered.specs.find((s) => s.id.includes("-frame-") && s.type === "rectangle");
  assert.ok(title.y + title.height <= frame.y, "标题在框上方");
  const layout = layoutPlan(normalizePlan({ ...BASE, groups: { client: "Clients" } }));
  for (const b of [...layout.nodes, ...layout.frames]) assert.ok(b.x >= 0 && b.y >= 0);
});

test("连线标签不压在框的边线和标题上", () => {
  const plan = { ...BASE, edges: [{ from: "web", to: "gw", label: "web UI" }, { from: "app", to: "gw", label: "/mcp" }, "gw->api", "api->db"], groups: { client: "Clients", server: "Servers" } };
  const layout = layoutPlan(normalizePlan(plan));
  for (const r of layout.routes.filter((x) => x.labelAt)) {
    const w = r.label.length * 8;
    const h = 18;
    for (const f of layout.frames) {
      const edgeY = [f.y, f.y + f.height];
      const edgeX = [f.x, f.x + f.width];
      const insideX = r.labelAt.x + w > f.x && r.labelAt.x < f.x + f.width;
      const insideY = r.labelAt.y + h > f.y && r.labelAt.y < f.y + f.height;
      for (const y of edgeY) assert.ok(!(insideX && r.labelAt.y < y && r.labelAt.y + h > y), `标签「${r.label}」压在框 ${f.id} 的横边上`);
      for (const x of edgeX) assert.ok(!(insideY && r.labelAt.x < x && r.labelAt.x + w > x), `标签「${r.label}」压在框 ${f.id} 的竖边上`);
    }
  }
});

test("框包住非成员时如实报 warning", () => {
  // server 组跨了 gw 所在的那一层 → 框会盖住 gw
  const plan = { ...BASE, nodes: BASE.nodes.map((n) => (n.id === "gw" ? n : n.id === "api" ? { ...n, rank: 0 } : n)), groups: { server: "Servers" } };
  const rendered = renderPlan(plan);
  assert.ok(rendered.plan.warnings.some((w) => w.includes("Servers") && w.includes("gw")), JSON.stringify(rendered.plan.warnings));
});

test("写错的提示只记 warning：rank 非整数、groups 指向不存在的组", () => {
  const plan = normalizePlan({
    ...BASE,
    nodes: BASE.nodes.map((n) => (n.id === "web" ? { ...n, rank: 1.5 } : n.id === "app" ? { ...n, order: "abc" } : n)),
    groups: { client: "Clients", nobody: "Nobody" },
  });
  assert.equal(plan.nodes.find((n) => n.id === "web").rank, undefined);
  assert.equal(plan.nodes.find((n) => n.id === "app").order, undefined);
  assert.deepEqual(plan.groups.map((g) => g.id), ["client"]);
  assert.ok(plan.warnings.some((w) => w.includes("rank")));
  assert.ok(plan.warnings.some((w) => w.includes("order")));
  assert.ok(plan.warnings.some((w) => w.includes("nobody")));
});

test("groups 也接受数组写法；grid/radial 里写 rank 会提示被忽略", () => {
  const plan = normalizePlan({ ...BASE, groups: [{ id: "client", label: "Clients" }, "server"] });
  assert.deepEqual(plan.groups, [{ id: "client", label: "Clients" }, { id: "server", label: "server" }]);
  const grid = normalizePlan({ layout: "grid", nodes: [{ label: "a", rank: 1 }] });
  assert.ok(grid.warnings.some((w) => w.includes("rank 只对 lr/tb 生效")));
});
