/**
 * 2026-10-22：文本折叠纯逻辑（text-fold.ts）——折叠/展开/再折叠的数据变换 +
 * 圆点锚点的视口换算。overlay 与「选区折叠为列表」脚本共用这一层。
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  badgeAnchor,
  foldBadgesOf,
  foldBadgesSig,
  foldHeadsOf,
  hiddenCount,
  pickFoldHead,
  planFold,
  planRefold,
  planUnfold,
  toggleOf,
} from "../src/studio/text-fold.ts";

const text = (id, y, extra = {}) => ({
  id,
  type: "text",
  x: 100,
  y,
  width: 200,
  height: 25,
  fontSize: 20,
  text: id,
  ...extra,
});

test("toggleOf：脏数据一律当没有", () => {
  assert.equal(toggleOf(null), null);
  assert.equal(toggleOf({}), null);
  assert.equal(toggleOf({ excaliToggle: "x" }), null);
  assert.equal(toggleOf({ excaliToggle: { elements: [] } }), null, "缺 collapsed 布尔不认");
  assert.deepEqual(toggleOf({ excaliToggle: { collapsed: true } }), { collapsed: true });
});

test("pickFoldHead：按 y 升序取最上，文本优先于矩形", () => {
  const picked = pickFoldHead([text("m", 140), text("h", 100), text("m2", 180)]);
  assert.equal(picked.head.id, "h");
  assert.deepEqual(picked.members.map((m) => m.id), ["m", "m2"]);
  // 矩形 y 更小也不当头
  const p2 = pickFoldHead([{ id: "r", type: "rectangle", x: 0, y: 10 }, text("t", 100)]);
  assert.equal(p2.head.id, "t");
  // y 相同按 x
  const p3 = pickFoldHead([{ id: "b", type: "text", x: 200, y: 50 }, { id: "a", type: "text", x: 50, y: 50 }]);
  assert.equal(p3.head.id, "a");
  // 不足 2 个 = 不构成折叠
  assert.equal(pickFoldHead([text("solo", 0)]), null);
  assert.equal(pickFoldHead([]), null);
});

test("planFold：快照深拷贝（改副本不污染原成员），deleteIds 齐全", () => {
  const head = text("h", 100);
  const members = [text("m1", 140), { id: "m2", type: "rectangle", x: 100, y: 180, width: 50, height: 50 }];
  const ops = planFold(head, members);
  assert.deepEqual(ops.deleteIds, ["m1", "m2"]);
  assert.equal(ops.headPatch.excaliToggle.collapsed, true);
  assert.equal(ops.headPatch.excaliToggle.elements.length, 2);
  // 深拷贝验证：改快照里的副本，原 members 不动
  ops.headPatch.excaliToggle.elements[0].y = 999;
  assert.equal(members[0].y, 140, "快照是深拷贝");
});

test("planUnfold：快照回传保 id + 记 memberIds 供再折叠", () => {
  const head = {
    id: "h",
    type: "text",
    x: 0,
    y: 0,
    excaliToggle: { collapsed: true, elements: [{ id: "m1", type: "text", x: 5, y: 5 }, { id: "m2", type: "text", x: 6, y: 6 }] },
  };
  const ops = planUnfold(head);
  assert.ok(ops);
  assert.deepEqual(ops.specs.map((s) => s.id), ["m1", "m2"], "成员 spec 保快照 id");
  assert.equal(ops.headPatch.excaliToggle.collapsed, false);
  assert.deepEqual(ops.headPatch.excaliToggle.memberIds, ["m1", "m2"]);
  // 不一致态（折叠后 ⌘Z 撤回过删除）：m1 还在场 → 只加回 m2，memberIds 仍记全部
  const ops2 = planUnfold(head, new Set(["m1"]));
  assert.deepEqual(ops2.specs.map((s) => s.id), ["m2"], "已在场的不重复进场（防同 id 两个元素）");
  assert.deepEqual(ops2.headPatch.excaliToggle.memberIds, ["m1", "m2"], "memberIds 仍记全部快照 id");
  assert.deepEqual(planUnfold(head, new Set(["m1", "m2"])).specs, [], "全在场 = 无可加");
  // 非折叠态/空快照 = 不展开
  assert.equal(planUnfold({ id: "x", type: "text", x: 0, y: 0, excaliToggle: { collapsed: false, memberIds: [] } }), null);
  assert.equal(planUnfold({ id: "x", type: "text", x: 0, y: 0, excaliToggle: { collapsed: true, elements: [] } }), null);
  assert.equal(planUnfold({ id: "x", type: "text", x: 0, y: 0 }), null);
});

test("planRefold：按 memberIds 收现存成员；部分被删只收剩下的；全没返回 null", () => {
  const head = { id: "h", type: "text", x: 0, y: 0, excaliToggle: { collapsed: false, memberIds: ["m1", "m2"] } };
  const alive = [text("m1", 140), text("m3", 180)]; // m2 被用户删了
  const ops = planRefold(head, alive);
  assert.ok(ops);
  assert.deepEqual(ops.deleteIds, ["m1"], "被删的 m2 跳过，新加的 m3 不收");
  // 全失效
  assert.equal(planRefold(head, [text("other", 0)]), null);
  // 空快照不认
  assert.equal(planRefold({ id: "h", type: "text", x: 0, y: 0, excaliToggle: { collapsed: true, elements: [] } }, alive), null);
  // 不一致态：头还是折叠态但成员已被 ⌘Z 撤回在场 → 也按快照 id 收（点头 − 收干净）
  const headB = {
    id: "h",
    type: "text",
    x: 0,
    y: 0,
    excaliToggle: { collapsed: true, elements: [{ id: "m1" }, { id: "m2" }] },
  };
  const opsB = planRefold(headB, [text("m1", 140), text("m2", 180)]);
  assert.ok(opsB);
  assert.deepEqual(opsB.deleteIds, ["m1", "m2"], "折叠态+成员在场：按快照 id 收");
  assert.equal(opsB.headPatch.excaliToggle.collapsed, true);
  // 折叠态但成员全不在场 → null（调用方提示重框选）
  assert.equal(planRefold(headB, [text("other", 0)]), null);
});

test("foldHeadsOf：只收带头（折叠态+展开态都收），元素面够 overlay 定位", () => {
  const heads = foldHeadsOf([
    text("h1", 0, { excaliToggle: { collapsed: true, elements: [{ id: "a" }] } }),
    text("h2", 40, { excaliToggle: { collapsed: false, memberIds: ["b"] } }),
    text("plain", 80),
    { id: "bad", type: "text" }, // 缺坐标——理论上 excaliToggle 也没有，双保险
  ]);
  assert.deepEqual(heads.map((h) => h.el.id), ["h1", "h2"]);
  assert.equal(heads[0].toggle.collapsed, true);
  assert.equal(hiddenCount(heads[0].toggle, new Set()), 1, "折叠态：快照成员不在场 = 1 个藏的");
  assert.equal(hiddenCount(heads[0].toggle, new Set(["a"])), 0, "成员已在场（撤销过删除）= 没有藏的");
  assert.equal(hiddenCount(heads[1].toggle, new Set(["b"])), 0, "展开态没有隐藏数");
});

test("badgeAnchor：口径 = (sceneX + scrollX) * zoom + offsetLeft，垂直居中首行", () => {
  const head = text("h", 100);
  head.fontSize = 20;
  // zoom=1、无平移：圆点圆心 = 文本左缘外 (半径 9 + 留白 6) = 15px
  assert.deepEqual(badgeAnchor(head, { zoom: 1, scrollX: 0, scrollY: 0, offsetLeft: 0, offsetTop: 0 }), { left: 85, top: 112.5 });
  // zoom=2、scroll 100/50、offset 10/20：文本左缘 (100+100)*2+10 = 410；
  // 圆点半径 9×1.8（缩放上限）+6px 留白 ⇒ 410-22.2 = 387.8；竖直 (100+12.5+50)*2+20 = 345
  assert.deepEqual(badgeAnchor(head, { zoom: 2, scrollX: 100, scrollY: 50, offsetLeft: 10, offsetTop: 20 }), { left: 387.8, top: 345 });
  // zoom 0（异常值）回落 1
  assert.equal(badgeAnchor(head, { zoom: 0, scrollX: 0, scrollY: 0, offsetLeft: 0, offsetTop: 0 }).left, 85);
});

test("badgeAnchor：缩放时水平间距按屏幕像素恒定（不再随 zoom 缩窄压字）", () => {
  const head = text("h", 100);
  const view = (zoom) => ({ zoom, scrollX: 0, scrollY: 0, offsetLeft: 0, offsetTop: 0 });
  // 文本左缘屏幕坐标 - 圆心 = 半径×scale + 6，全程只取决于 scale
  const gapAt = (zoom) => 100 * zoom - badgeAnchor(head, view(zoom)).left;
  assert.equal(gapAt(1), 15, "zoom 1：9 + 6");
  assert.ok(Math.abs(gapAt(0.66) - 11.94) < 1e-9, "缩小：9×0.66 + 6");
  assert.ok(Math.abs(gapAt(3) - 22.2) < 1e-9, "放大超上限 1.8：9×1.8 + 6（圆点不无限制长大）");
  // 旧口径（22 个 scene 单位）在 zoom 0.5 时只留 11px，圆点直径 18px 会压到字上
  assert.ok(gapAt(0.5) > 11, "zoom 0.5 时仍留出比旧口径更宽的间距");
});

test("foldBadgesOf/foldBadgesSig：拖动折叠头后签名必须变（圆点跟着元素走）", () => {
  const view = { zoom: 1, scrollX: 0, scrollY: 0, offsetLeft: 0, offsetTop: 0 };
  const head = text("h", 100, { excaliToggle: { collapsed: true, elements: [{ id: "m1" }, { id: "m2" }] } });
  const before = foldBadgesOf([head], view);
  assert.equal(before.length, 1);
  assert.deepEqual(
    { collapsed: before[0].collapsed, count: before[0].count, left: before[0].left, top: before[0].top },
    { collapsed: true, count: 2, left: 85, top: 112.5 },
  );
  // 拖动：x/y 变但 id、collapsed、视口全不变——这正是旧签名漏掉的场景
  const moved = foldBadgesOf([{ ...head, x: 400, y: 300 }], view);
  assert.notEqual(foldBadgesSig(before), foldBadgesSig(moved), "签名必须变（否则 rAF 不会重渲染，圆点留在原地）");
  assert.deepEqual({ left: moved[0].left, top: moved[0].top }, { left: 385, top: 312.5 }, "锚点跟着走");
  // 平移画布同理
  assert.notEqual(
    foldBadgesSig(before),
    foldBadgesSig(foldBadgesOf([head], { ...view, scrollX: 40, scrollY: 10 })),
    "平移也要变签名",
  );
  // 成员全在场（⌘Z 撤消过删除）→ 显展开态 −，计数 0
  const odd = foldBadgesOf([head, text("m1", 140), text("m2", 180)], view);
  assert.deepEqual({ collapsed: odd[0].collapsed, count: odd[0].count }, { collapsed: false, count: 0 });
  // 无头时快照为空
  assert.deepEqual(foldBadgesOf([text("plain", 0)], view), []);
});
