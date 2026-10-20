/**
 * 阶段 A 新增纯函数：文件名清洗 / 备份路径 / 保存路径拼接。
 * storage.ts 模块级无副作用（fetch 只在调用时发生），可直接在 node 里 import。
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { backupChainOf, backupPathOf, isBackupPath, joinSavePath, sanitizeFileName, stampFileName, uniqueTargetPath } from "../src/studio/storage.ts";

test("sanitizeFileName：补 .svg、剥路径、去危险字符", () => {
  assert.equal(sanitizeFileName("我的白板"), "我的白板.svg");
  assert.equal(sanitizeFileName("a.svg"), "a.svg");
  assert.equal(sanitizeFileName("../../etc/passwd"), "etcpasswd.svg");
  assert.equal(sanitizeFileName('a<b>c:d*e?f"g|h'), "abcdefgh.svg");
  assert.equal(sanitizeFileName("   "), "excali-board.svg");
  assert.equal(sanitizeFileName(".hidden"), "hidden.svg");
  assert.equal(sanitizeFileName("x".repeat(200) + ".svg").length, 84); // 80 + .svg
});

test("backupPathOf：槽 1 沿用旧名 .svg.bak.svg，槽 2/3 滚动命名（第十九轮）", () => {
  assert.equal(backupPathOf("/data/assets/a.svg"), "/data/assets/a.svg.bak.svg");
  assert.equal(backupPathOf("/data/assets/a.svg", 2), "/data/assets/a.svg.bak2.svg");
  assert.equal(backupPathOf("/data/assets/a.svg", 3), "/data/assets/a.svg.bak3.svg");
  // 幂等旧断言：备份的备份还是叠一层，不吞 .bak
  assert.equal(backupPathOf("a.svg.bak.svg"), "a.svg.bak.svg.bak.svg");
});

test("backupChainOf：新→旧整排槽位，命名与 backupPathOf 一致", () => {
  assert.deepEqual(backupChainOf("/data/assets/a.svg"), [
    "/data/assets/a.svg.bak.svg",
    "/data/assets/a.svg.bak2.svg",
    "/data/assets/a.svg.bak3.svg",
  ]);
  // 输入先归一到 /data，链条不跟着脏输入跑形
  assert.equal(backupChainOf("assets/a.svg")[0], "/data/assets/a.svg.bak.svg");
});

test("isBackupPath：三档命名都认，普通白板与近似名不误伤", () => {
  assert.equal(isBackupPath("a.svg.bak.svg"), true);
  assert.equal(isBackupPath("a.svg.bak2.svg"), true);
  assert.equal(isBackupPath("/data/assets/a.svg.bak3.svg"), true);
  assert.equal(isBackupPath("a.svg"), false);
  assert.equal(isBackupPath("backup.svg"), false, "叫 backup 的白板不是备份");
  assert.equal(isBackupPath("a.bak.txt"), false, "非 svg 结尾不归备份链管");
});

test("joinSavePath：容忍目录写法", () => {
  assert.equal(joinSavePath("assets", "a.svg"), "assets/a.svg");
  assert.equal(joinSavePath("assets/", "a.svg"), "assets/a.svg");
  assert.equal(joinSavePath("/data/assets/", "a.svg"), "data/assets/a.svg");
  assert.equal(joinSavePath("", "a.svg"), "assets/a.svg");
});

test("stampFileName：默认走 excali-<时间戳>.svg", () => {
  const d = new Date(2026, 9, 15, 9, 5, 3);
  assert.equal(stampFileName(d), "excali-20261015-090503.svg");
});

test("uniqueTargetPath：撞名滚 _0/_1，改名撞自己不算撞（第十九轮 D）", async () => {
  // fileExists 走 getFile：存在=非 JSON 正文，不存在=HTTP 200 + code≠0 的 JSON
  const existing = new Set(["/data/assets/会议白板.svg", "/data/assets/会议白板_0.svg"]);
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (_url, opts) => {
    const path = JSON.parse(opts.body).path;
    if (existing.has(path)) return { ok: true, status: 200, headers: { get: () => "image/svg+xml" } };
    return { ok: true, status: 200, headers: { get: () => "application/json" }, json: async () => ({ code: -1, msg: "File does not exist" }) };
  };
  try {
    // 前两档都在 → 落第三档
    assert.equal(await uniqueTargetPath("assets", "会议白板.svg"), "/data/assets/会议白板_1.svg");
    // 没撞 → 原名直接用，一次探就停
    assert.equal(await uniqueTargetPath("assets", "新白板.svg"), "/data/assets/新白板.svg");
    // exclude=改名场景的自己：撞自己直接返回，不滚 _0
    assert.equal(await uniqueTargetPath("assets", "会议白板.svg", "/data/assets/会议白板.svg"), "/data/assets/会议白板.svg");
    // 撞了别的板 → 那个名字自己的 _0 档；.bak 不在探测名单里，不占位
    existing.add("/data/assets/甲.svg");
    assert.equal(await uniqueTargetPath("assets", "甲.svg", "/data/assets/会议白板_1.svg"), "/data/assets/甲_0.svg");
  } finally {
    globalThis.fetch = realFetch;
  }
});
