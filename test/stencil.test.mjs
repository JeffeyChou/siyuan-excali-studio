// 图形模板库纯逻辑（第三十轮）：解析 / 合并 / diff 写入计划。
// 这层是「模板变普通文件」的核心语义：合并去重、published 标记、
// 改动写回源文件、新增落本地库——全在这里，宿主只做读写搬运。
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  deriveItemId,
  isLibFileName,
  itemIdOf,
  LOCAL_LIB_NAME,
  mergeLibFiles,
  normalizeLibItems,
  parseLibFile,
  planLibraryWrites,
  serializeLibFile,
} from "../src/studio/stencil.ts";

const LOCAL = "assets/excali/excali-libraries/" + LOCAL_LIB_NAME;

test("isLibFileName：只认 .excalidrawlib（大小写不敏感），不误伤 .svg/.json", () => {
  assert.equal(isLibFileName("local.excalidrawlib"), true);
  assert.equal(isLibFileName("流程图.EXCALIDRAWLIB"), true);
  assert.equal(isLibFileName("excali-library.json"), false);
  assert.equal(isLibFileName("板子.svg"), false);
  assert.equal(isLibFileName("excalidrawlib"), false);
});

test("parseLibFile：libraryItems / library / 裸数组 / 坏 JSON，四路容错", () => {
  assert.deepEqual(parseLibFile('{"type":"excalidrawlib","libraryItems":[{"id":"a"}]}'), []);
  // 旧版字段名 library 也要认（vendor 历史格式）
  assert.deepEqual(parseLibFile('{"library":[{"id":"b"}]}'), []);
  assert.deepEqual(parseLibFile('[{"id":"c"}]'), []);
  assert.deepEqual(parseLibFile("不是 JSON"), []);
  assert.deepEqual(parseLibFile('{"libraryItems":"脏值"}'), []);
  // 没有 elements 的条目过不了 vendor 的 Tp 校验（恢复不出元素就丢）——归一化同款丢弃，
  // 别把这种空壳喂进面板（2026-10-19：导入成功但面板空的根因就是绕过了这层校验）
});

test("normalizeLibItems：官方素材库站的 v1 格式（library:[[元素,…],…]）→ v2 条目", () => {
  const el = (id, nonce) => ({ type: "rectangle", id, versionNonce: nonce, x: 1 });
  // 官方站文件形态：{type:"excalidrawlib", version:1, source, library:[[元素,元素],…]}
  const items = normalizeLibItems([[el("e1", 1), el("e2", 2)], [el("e3", 3)]]);
  assert.equal(items.length, 2);
  assert.deepEqual(items[0].elements.map((e) => e.id), ["e1", "e2"]);
  assert.equal(items[1].elements.length, 1);
  for (const it of items) {
    assert.ok(it.id.startsWith("lib-"), "v1 条目派生出确定性 id");
    assert.equal(it.status, "published", "官方导入语义 = published");
    assert.equal(typeof it.created, "number");
  }
  // 确定性：同一份库再归一化一次，id 不变（重复导入才去得掉重）
  const again = normalizeLibItems([[el("e1", 1), el("e2", 2)], [el("e3", 3)]]);
  assert.deepEqual(again.map((i) => i.id), items.map((i) => i.id));
  // 元素顺序不同不影响 id（签名先排序）
  assert.equal(
    deriveItemId([el("e2", 2), el("e1", 1)]),
    deriveItemId([el("e1", 1), el("e2", 2)]),
  );
});

test("normalizeLibItems：v2 条目补缺省且幂等（已有 id/status/created 原样保留）", () => {
  const once = normalizeLibItems([{ id: "x", elements: [{ type: "ellipse", id: "e" }] }]);
  assert.equal(once[0].id, "x");
  assert.equal(once[0].status, "published");
  const twice = normalizeLibItems(once);
  assert.deepEqual(twice, once, "反复归一化不漂移（created 不重置）");
  // 非数组 elements / 空 elements / 标量条目都被丢弃（vendor 同款）
  assert.deepEqual(normalizeLibItems([{ id: "y", elements: "脏" }, { id: "z", elements: [] }, null, 42]), []);
});

test("normalizeLibItems：数字键怪胎回收（旧 bug 写出的 {\"0\":元素,…}）", () => {
  const el = (id) => ({ type: "diamond", id, versionNonce: 7 });
  const items = normalizeLibItems([{ "0": el("a"), "1": el("b"), status: "published" }]);
  assert.equal(items.length, 1);
  assert.deepEqual(items[0].elements.map((e) => e.id), ["a", "b"]);
  assert.ok(items[0].id.startsWith("lib-"));
  // 键序打乱也按数字序回收
  const shuffled = normalizeLibItems([{ "1": el("b"), "0": el("a") }]);
  assert.deepEqual(shuffled[0].elements.map((e) => e.id), ["a", "b"]);
  // 数字键下不是元素 → 无可回收，整条丢
  assert.deepEqual(normalizeLibItems([{ "0": "不是元素" }]), []);
});

test("serializeLibFile：官方文件骨架（type/version/source/libraryItems），可被 parse 往返", () => {
  const item = { id: "a", status: "published", elements: [{ type: "rectangle", id: "e1" }] };
  const text = serializeLibFile([item]);
  const data = JSON.parse(text);
  assert.equal(data.type, "excalidrawlib");
  assert.equal(data.version, 2);
  assert.ok(typeof data.source === "string" && data.source.length > 0);
  assert.deepEqual(data.libraryItems, [item]);
  const back = parseLibFile(text);
  assert.equal(back.length, 1);
  assert.equal(back[0].id, "a");
  assert.deepEqual(back[0].elements, item.elements);
  assert.equal(back[0].status, "published");
});

test("mergeLibFiles：本地优先去重、外部标 published、无 id 照单全收", () => {
  const local = { path: LOCAL, items: [{ id: "a", x: 1 }] };
  const shared = { path: "assets/excali/excali-libraries/流程图.excalidrawlib", items: [{ id: "a", x: 999 }, { id: "b" }, { noId: true }] };
  const merged = mergeLibFiles([local, shared]);
  assert.equal(merged.items.length, 3); // a 去重留本地版 + b + 无 id 项
  assert.deepEqual(merged.items[0], { id: "a", x: 1 }, "同 id 冲突本地赢");
  assert.equal(merged.items[1].status, "published", "外部条目标 published");
  assert.equal(merged.items[2].status, "published", "外部文件的无 id 条目同样标 published（与 Obsidian 口径一致）");
  assert.equal(merged.sourceOf.get("a"), LOCAL);
  assert.equal(merged.sourceOf.get("b"), shared.path);
  assert.deepEqual(merged.byPath.get(LOCAL), [{ id: "a", x: 1 }]);
});

test("planLibraryWrites：没变化不写盘（少一个文件写 = 少一份同步噪音）", () => {
  const merged = mergeLibFiles([{ path: LOCAL, items: [{ id: "a", v: 1 }] }]);
  assert.deepEqual(planLibraryWrites(merged, [{ id: "a", v: 1 }], LOCAL), []);
});

test("planLibraryWrites：删除与修改都写回源文件，新增落本地", () => {
  const local = { path: LOCAL, items: [{ id: "keep" }, { id: "gone" }, { id: "edit", v: 1 }] };
  const sharedPath = "assets/excali/excali-libraries/s.excalidrawlib";
  const shared = { path: sharedPath, items: [{ id: "shared", v: 1 }] };
  const merged = mergeLibFiles([local, shared]);
  const next = [
    { id: "keep" }, // 不动
    { id: "edit", v: 2 }, // 改了 → 写回本地
    { id: "brand-new" }, // 新增 → 本地
    { id: "shared", v: 2 }, // 改了 → 写回 shared 文件（不是本地！）
    { noId: true }, // 无 id 新增 → 本地
  ]; // gone 没进 next = 删除
  const plan = planLibraryWrites(merged, next, LOCAL);
  const byPath = new Map(plan.map((w) => [w.path, w.items]));
  // 本地：keep 原样 + gone 消失 + edit 更新 + 两条新增（unshift 在前）
  const localItems = byPath.get(LOCAL);
  assert.equal(localItems.length, 4);
  assert.deepEqual(localItems[0], { noId: true });
  assert.deepEqual(localItems[1], { id: "brand-new" });
  assert.deepEqual(localItems[2], { id: "keep" });
  assert.deepEqual(localItems[3], { id: "edit", v: 2 });
  assert.equal(localItems.find((i) => i.id === "gone"), undefined, "删除不回写");
  // 外部：shared 更新且强制 published；别人管的条目绝不误删
  const sharedItems = byPath.get(sharedPath);
  assert.deepEqual(sharedItems, [{ id: "shared", v: 2, status: "published" }]);
});

test("planLibraryWrites：文件清空 → 空数组（宿主据此删除文件）", () => {
  const sharedPath = "assets/excali/excali-libraries/s.excalidrawlib";
  const merged = mergeLibFiles([
    { path: LOCAL, items: [] },
    { path: sharedPath, items: [{ id: "only" }] },
  ]);
  const plan = planLibraryWrites(merged, [], LOCAL);
  const hit = plan.find((w) => w.path === sharedPath);
  assert.deepEqual(hit.items, [], "唯一条目删光 = 空数组");
});

test("itemIdOf：非空字符串才算 id", () => {
  assert.equal(itemIdOf({ id: "a" }), "a");
  assert.equal(itemIdOf({ id: "" }), null);
  assert.equal(itemIdOf({}), null);
  assert.equal(itemIdOf("标量"), null);
});
