/**
 * 第二十五轮：旧 assets → assets/excali 迁移的纯逻辑（真断言）。
 * 这些函数判错都是无声数据事故（把外来图搬走 / 白板漏搬 / recent 写成双份），
 * 所以放 node 里直接 import 跑。
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  isAutoNamedBoard,
  isDirectChildOf,
  migrationCandidates,
  parentDirOf,
  remapPaths,
} from "../src/studio/migration.ts";
import { DEFAULT_SETTINGS, normalizeDirRef, normalizeSettings } from "../src/studio/settings.ts";

test("isAutoNamedBoard：只认本插件的 excali-时间戳.svg", () => {
  assert.equal(isAutoNamedBoard("excali-20261017-080239.svg"), true);
  assert.equal(isAutoNamedBoard("EXCALI-20261017-080239.SVG"), true, "大小写不敏感（内核/用户可能改扩展名）");
  assert.equal(isAutoNamedBoard("测试.svg"), false, "用户重命名过的板靠 recent/绑定兜住");
  assert.equal(isAutoNamedBoard("excali-2026.svg"), false);
  assert.equal(isAutoNamedBoard("excali-20261017-080239.svg.bak.svg"), false, "备份不是候选");
  assert.equal(isAutoNamedBoard("drawio-image-20260314225417-xpjak0t.svg"), false);
});

test("parentDirOf / isDirectChildOf：只认旧目录直下，子目录/../../ 不越界", () => {
  assert.equal(parentDirOf("/data/assets/x.svg"), "assets");
  assert.equal(parentDirOf("assets/x.svg"), "assets", "相对 ref 也归一");
  assert.equal(parentDirOf("/data/assets/excali/x.svg"), "assets/excali");
  assert.equal(isDirectChildOf("/data/assets/x.svg", "assets"), true);
  assert.equal(isDirectChildOf("/data/assets/sub/x.svg", "assets"), false, "子目录不搬");
  assert.equal(isDirectChildOf("/data/assets/excali/x.svg", "assets"), false, "已在专属目录的不重复搬");
});

test("migrationCandidates：四路来源去重保序；非白板/备份/子目录/已迁走的一律丢掉", () => {
  const out = migrationCandidates({
    recent: [
      "/data/assets/测试.svg",
      "/data/assets/excali/already.svg",
      "assets/sub/nested.svg",
      "/data/note.md",
      "/data/assets/x.svg.bak.svg",
    ],
    registry: ["/data/assets/测试.svg", "/data/assets/mine-old.svg", 42, ""],
    docSvgs: ["assets/测试 1.svg", "/data/assets/excali/already.svg"],
    autoNamed: ["/data/assets/excali-20261017-080239.svg"],
  });
  assert.deepEqual(out, [
    "/data/assets/测试.svg",
    "/data/assets/mine-old.svg",
    "/data/assets/测试 1.svg",
    "/data/assets/excali-20261017-080239.svg",
  ], "recent 优先保序；重复只留一份；脏值不抛");
  assert.equal(out.some((p) => p.includes("excali/already")), false, "已在专属目录的不是候选");
  assert.equal(out.some((p) => p.includes("/sub/")), false, "子目录不搬");
  assert.equal(out.some((p) => p.endsWith(".bak.svg")), false, "备份由 renameSvg 随主文件搬");
});

test("remapPaths：命中换新路径、未命中保留、换完去重保序", () => {
  const remap = new Map([["/data/assets/a.svg", "/data/assets/excali/a.svg"]]);
  const out = remapPaths(
    ["/data/assets/a.svg", "/data/assets/excali/a.svg", "/data/assets/b.svg", "assets/b.svg"],
    remap,
  );
  assert.deepEqual(out, ["/data/assets/excali/a.svg", "/data/assets/b.svg"], "旧路径搬新后与已有新路径合并去重");
});

test("normalizeDirRef：/data 前缀、反斜杠、末尾斜杠、空白都归一", () => {
  assert.equal(normalizeDirRef("/data/assets/excali/"), "assets/excali");
  assert.equal(normalizeDirRef("assets\\excali"), "assets/excali");
  assert.equal(normalizeDirRef("  assets/excali  "), "assets/excali");
  assert.equal(normalizeDirRef("/assets/excali"), "assets/excali");
  assert.equal(normalizeDirRef(""), "");
});

test("设置：默认落点 assets/excali；存量 assets 原样保留（交给迁移判定）", () => {
  assert.equal(DEFAULT_SETTINGS.saveDir, "assets/excali");
  assert.equal(normalizeSettings({}).saveDir, "assets/excali", "空设置给专属目录");
  assert.equal(normalizeSettings({ saveDir: "  " }).saveDir, "assets/excali", "空白回落默认");
  assert.equal(normalizeSettings({ saveDir: "/data/assets/" }).saveDir, "assets", "存量旧默认不能被悄悄改掉：迁移逻辑要看到 assets");
  assert.equal(normalizeSettings({ saveDir: "boards/" }).saveDir, "boards", "用户自定义目录保持");
});
