// 计划 DSL 的走线：正交避障、进出口分离、源点下沉、按词换行。
// 断言盯「线段不进入任何节点内部」这类几何事实，不盯具体像素值。
import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizePlan } from "../src/studio/ai/plan.ts";
import { layoutPlan } from "../src/studio/ai/layout.ts";
import { routeOrthogonal, simplifyPath } from "../src/studio/ai/route.ts";
import { wrapTextByWidth } from "../src/studio/ea-element.ts";

/** 线段（绝对坐标，可以是斜线）是否进入盒子内部；贴边不算（Liang–Barsky 裁剪） */
function crosses(p, q, box) {
  const e = 0.5;
  const r = { minX: box.x + e, minY: box.y + e, maxX: box.x + box.width - e, maxY: box.y + box.height - e };
  const dx = q.x - p.x;
  const dy = q.y - p.y;
  let t0 = 0;
  let t1 = 1;
  for (const [pp, qq] of [[-dx, p.x - r.minX], [dx, r.maxX - p.x], [-dy, p.y - r.minY], [dy, r.maxY - p.y]]) {
    if (Math.abs(pp) < 1e-9) {
      if (qq < 0) return false;
      continue;
    }
    const t = qq / pp;
    if (pp < 0) t0 = Math.max(t0, t);
    else t1 = Math.min(t1, t);
    if (t0 > t1) return false;
  }
  return true;
}

function absolutePath(route) {
  return route.points.map(([dx, dy]) => ({ x: route.p1.x + dx, y: route.p1.y + dy }));
}

/** 起止节点之外，没有任何线段进入其他节点 */
function assertNoCrossing(layout) {
  for (const route of layout.routes) {
    const path = absolutePath(route);
    for (const node of layout.nodes) {
      if (node.id === route.from || node.id === route.to) continue;
      for (let i = 0; i + 1 < path.length; i++) {
        assert.ok(!crosses(path[i], path[i + 1], node), `${route.from}→${route.to} 穿过了 ${node.id}`);
      }
    }
  }
}

/** 实际出过问题的计划：folio → 内核 跨过隧道层；Excali → 内核 从右侧绕进来 */
const STACK = {
  layout: "tb",
  nodes: [
    { id: "mac", label: "Browser / PWA" },
    { id: "agents", label: "Agents" },
    { id: "cf", label: "Cloudflare tunnel", shape: "diamond" },
    { id: "folio", label: "folio" },
    { id: "siyuan", label: "SiYuan kernel" },
    { id: "excali", label: "Excali Studio" },
    { id: "backup", label: "Daily backup", shape: "ellipse" },
  ],
  edges: [
    { from: "mac", to: "cf", label: "web UI" },
    { from: "agents", to: "cf", label: "/mcp" },
    { from: "cf", to: "siyuan" },
    { from: "folio", to: "siyuan", label: "API" },
    { from: "excali", to: "siyuan", label: "tools" },
    { from: "siyuan", to: "backup" },
  ],
};

test("走线不穿过起止之外的节点（tb / lr / grid / radial）", () => {
  for (const layout of ["tb", "lr", "grid", "radial"]) {
    assertNoCrossing(layoutPlan(normalizePlan({ ...STACK, layout })));
  }
});

test("跨层的源点下沉到最近后继的上一层", () => {
  const { nodes } = layoutPlan(normalizePlan(STACK));
  const by = Object.fromEntries(nodes.map((n) => [n.id, n]));
  // folio 只连内核（第 2 层），所以和隧道同层，而不是顶在第 0 层
  assert.equal(Math.round(by.folio.y + by.folio.height / 2), Math.round(by.cf.y + by.cf.height / 2));
  assert.ok(by.mac.y < by.cf.y, "真正的上游仍在上层");
});

test("同一个口不同时进线和出线", () => {
  const { routes } = layoutPlan(normalizePlan(STACK));
  const ports = new Map();
  for (const r of routes) {
    const out = `${r.from}:${r.side1}`;
    const inn = `${r.to}:${r.side2}`;
    ports.set(out, { ...(ports.get(out) ?? {}), out: true });
    ports.set(inn, { ...(ports.get(inn) ?? {}), in: true });
  }
  for (const [key, use] of ports) assert.ok(!(use.in && use.out), `${key} 既进又出`);
});

test("输出的边序与计划一致（edge-N 编号不随走线顺序变）", () => {
  const { routes } = layoutPlan(normalizePlan(STACK));
  assert.deepEqual(
    routes.map((r) => `${r.from}->${r.to}`),
    STACK.edges.map((e) => `${e.from}->${e.to}`),
  );
});

test("标签不压在节点上", () => {
  const plan = normalizePlan(STACK);
  const { routes, nodes } = layoutPlan(plan);
  for (const r of routes.filter((x) => x.labelAt)) {
    for (const n of nodes) {
      const overlap = r.labelAt.x < n.x + n.width && r.labelAt.x + 10 > n.x && r.labelAt.y < n.y + n.height && r.labelAt.y + 10 > n.y;
      assert.ok(!overlap, `标签「${r.label}」压在 ${n.id} 上`);
    }
  }
});

test("radial 用直线放射，被挡住时才退回正交", () => {
  const nodes = [{ id: "k", label: "hub" }, ...Array.from({ length: 8 }, (_, i) => ({ id: `l${i}`, label: `leaf ${i}` }))];
  const edges = nodes.slice(1).map((x) => ({ from: "k", to: x.id }));
  const { routes } = layoutPlan(normalizePlan({ layout: "radial", nodes, edges }));
  assert.ok(routes.every((r) => r.points.length === 2), "单圈放射全是一段直线");
});

test("routeOrthogonal：中间有障碍时绕开，路径只含水平/竖直段", () => {
  const boxes = [
    { id: "a", x: 0, y: 0, width: 100, height: 60 },
    { id: "wall", x: 200, y: -100, width: 60, height: 260 },
    { id: "b", x: 400, y: 0, width: 100, height: 60 },
  ];
  const r = routeOrthogonal(boxes, "a", "b", []);
  assert.ok(r);
  for (let i = 0; i + 1 < r.path.length; i++) {
    const p = r.path[i];
    const q = r.path[i + 1];
    assert.ok(Math.abs(p.x - q.x) < 0.01 || Math.abs(p.y - q.y) < 0.01, "只走正交段");
    assert.ok(!crosses(p, q, boxes[1]), "绕开中间的墙");
  }
});

test("simplifyPath 去掉重复点与共线中间点", () => {
  const out = simplifyPath([{ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 5, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 5 }]);
  assert.deepEqual(out, [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 5 }]);
});

test("wrapTextByWidth 在词间断行，单词超宽才逐字断", () => {
  // 20px 字号、200px 宽 ≈ 17.8 个英文字宽
  assert.deepEqual(wrapTextByWidth("/mcp (18 native + 4 Excali tools)", 200, 20), ["/mcp (18 native +", "4 Excali tools)"]);
  assert.deepEqual(wrapTextByWidth("SiYuan kernel 3.8.8", 200, 20), ["SiYuan kernel", "3.8.8"]);
  // 中英混排：中文逐字可断，英文单词不拆
  assert.deepEqual(wrapTextByWidth("中文和English混排的一段文字测试", 200, 20), ["中文和English混排的", "一段文字测试"]);
  // 行首空白不保留
  assert.deepEqual(wrapTextByWidth("  leading space word", 60, 10), ["leading", "space word"]);
});

test("radial：叶子多时开外圈，节点不重叠（以前 12 个以上就会叠）", () => {
  for (const n of [6, 12, 20, 40]) {
    const nodes = Array.from({ length: n }, (_, i) => ({ id: `n${i}`, label: `Node number ${i}` }));
    const edges = nodes.slice(1).map((x) => ({ from: "n0", to: x.id }));
    const { nodes: boxes } = layoutPlan(normalizePlan({ layout: "radial", nodes, edges }));
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i];
        const b = boxes[j];
        const hit = a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
        assert.ok(!hit, `${n} 个节点时 ${a.id} 与 ${b.id} 重叠`);
      }
    }
  }
});

test("上限规模（40 节点 / 80 边）四种布局都不穿节点", () => {
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const nodes = Array.from({ length: 40 }, (_, i) => ({ id: `n${i}`, label: `Node number ${i}` }));
  const edges = [];
  while (edges.length < 80) {
    const a = Math.floor(rnd() * 40);
    const b = Math.floor(rnd() * 40);
    if (a !== b) edges.push({ from: `n${a}`, to: `n${b}` });
  }
  for (const layout of ["lr", "tb", "grid", "radial"]) assertNoCrossing(layoutPlan(normalizePlan({ layout, nodes, edges })));
});
