/**
 * B'：素材库「Add to Excalidraw」落地页（library-import-page.ts 纯逻辑）。
 * 覆盖 URL 参数解析（hash/query 两形态 + dir 防穿越）、导入计划（去重/补
 * published/批次内重复/空计划），以及文件 API 的 wire format 契约。
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  DEFAULT_LIB_DIR,
  itemSignature,
  localLibPath,
  parseLandingParams,
  planImport,
  resolveLibDir,
  toDataPath,
} from "../src/library-import-page.ts";
import { parseLibFile, serializeLibFile } from "../src/studio/stencil.ts";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const LIB_URL = "https://libraries.excalidraw.com/libraries/childishgirl/aws-architecture-icons.excalidrawlib";
const ENCODED = encodeURIComponent(LIB_URL);

test("parseLandingParams：hash 形态（素材库站 useHash=true 的实际形态）", () => {
  const p = parseLandingParams(`#addLibrary=${ENCODED}&token=abc123`, "?dir=assets%2Fexcali%2Fexcali-libraries");
  assert.equal(p.addLibrary, LIB_URL);
  assert.equal(p.dir, "assets/excali/excali-libraries");
});

test("parseLandingParams：query 形态（官方站跳转的旧形态）", () => {
  const p = parseLandingParams("", `?addLibrary=${ENCODED}`);
  assert.equal(p.addLibrary, LIB_URL);
  assert.equal(p.dir, null);
});

test("parseLandingParams：空 hash/空 search → 全 null（直接打开页面 = 手动粘贴模式）", () => {
  const p = parseLandingParams("", "");
  assert.equal(p.addLibrary, null);
  assert.equal(p.dir, null);
});

test("resolveLibDir：空 → 默认目录；正常目录原样；防穿越/绝对化/data 前缀回落默认", () => {
  assert.equal(resolveLibDir(null), DEFAULT_LIB_DIR);
  assert.equal(resolveLibDir(undefined), DEFAULT_LIB_DIR);
  assert.equal(resolveLibDir(""), DEFAULT_LIB_DIR);
  assert.equal(resolveLibDir("  "), DEFAULT_LIB_DIR);
  assert.equal(resolveLibDir("assets/excali/excali-libraries"), "assets/excali/excali-libraries");
  assert.equal(resolveLibDir("assets/mylibs"), "assets/mylibs");
  assert.equal(resolveLibDir("/assets/mylibs/"), "assets/mylibs");
  assert.equal(resolveLibDir("assets\\mylibs"), "assets/mylibs");
  assert.equal(resolveLibDir("../../etc"), DEFAULT_LIB_DIR);
  assert.equal(resolveLibDir("assets/../../etc"), DEFAULT_LIB_DIR);
  assert.equal(resolveLibDir("data/assets/x"), DEFAULT_LIB_DIR);
  assert.equal(resolveLibDir("/data/assets/x"), DEFAULT_LIB_DIR);
});

test("localLibPath：目录 + local.excalidrawlib", () => {
  assert.equal(localLibPath("assets/excali/excali-libraries"), "assets/excali/excali-libraries/local.excalidrawlib");
  assert.equal(localLibPath(DEFAULT_LIB_DIR), `${DEFAULT_LIB_DIR}/local.excalidrawlib`);
});

test("toDataPath：与 storage.ts 同口径", () => {
  assert.equal(toDataPath("assets/x"), "/data/assets/x");
  assert.equal(toDataPath("/data/assets/x"), "/data/assets/x");
  assert.equal(toDataPath("data/assets/x"), "/data/assets/x");
});

test("itemSignature：有 id 用 id，无 id 用 JSON", () => {
  assert.equal(itemSignature({ id: "a1", elements: [] }), "id:a1");
  assert.equal(itemSignature({ elements: [1] }), 'json:{"elements":[1]}');
});

test("planImport：全新库 → 全部进本地文件，无 status 的补 published", () => {
  const existing = new Set();
  const plan = planImport(
    [
      { id: "x1", elements: [] },
      { id: "x2", elements: [], status: "unpublished" },
    ],
    existing,
    [],
  );
  assert.equal(plan.newCount, 2);
  assert.deepEqual(plan.localNext, [
    { id: "x1", elements: [], status: "published" },
    { id: "x2", elements: [], status: "unpublished" },
  ]);
});

test("planImport：已导入过的库 → 零新增，localNext = null（不写文件）", () => {
  const existing = new Set(["id:x1", "id:x2"]);
  const plan = planImport([{ id: "x1", elements: [] }, { id: "x2", elements: [] }], existing, [
    { id: "x1", elements: [] },
  ]);
  assert.equal(plan.newCount, 0);
  assert.equal(plan.localNext, null);
});

test("planImport：部分重复 → 只追加缺的；已有本地条目原样保留在最前", () => {
  const existing = new Set(["id:x1"]);
  const localItems = [{ id: "x1", elements: [], status: "published" }];
  const plan = planImport([{ id: "x1", elements: [] }, { id: "x3", elements: [] }], existing, localItems);
  assert.equal(plan.newCount, 1);
  assert.equal(plan.localNext?.length, 2);
  assert.deepEqual(plan.localNext?.[0], { id: "x1", elements: [], status: "published" });
  assert.deepEqual(plan.localNext?.[1], { id: "x3", elements: [], status: "published" });
});

test("planImport：同一批里的重复条目只进一次", () => {
  const plan = planImport([{ id: "d1" }, { id: "d1" }, { id: "d1" }], new Set(), []);
  assert.equal(plan.newCount, 1);
  assert.equal(plan.localNext?.length, 1);
});

test("planImport：无 id 条目按 JSON 签名去重（官方库都有 id；兜底防重复导入）", () => {
  const plan = planImport([{ elements: [1] }, { elements: [1] }], new Set(), []);
  assert.equal(plan.newCount, 1);
});

test("回归：官方素材库站的 v1 文件走完整管线 → 正常 v2 条目，重复导入零新增", () => {
  // 2026-10-19 线上事故：官方站文件是 v1 形态 {type:"excalidrawlib",version:1,
  // source,library:[[元素,元素],…]}，条目是裸元素数组。旧管线把数组当对象展开，
  // 写出 {"0":{…},"status":…} 的怪胎——vendor 校验（elements 缺失）整条丢弃，
  // 表现为「导入完成但组件库面板空空如也」。parseLibFile 归一化后必须全链路正常。
  const el = (id, nonce) => ({ type: "rectangle", id, versionNonce: nonce, x: 0, y: 0, width: 10, height: 10 });
  const officialV1 = JSON.stringify({
    type: "excalidrawlib",
    version: 1,
    source: "https://app.excalidraw.com",
    library: [[el("e1", 11), el("e2", 22)], [el("e3", 33)]],
  });

  // ① 落地页读远端文件的入口就是 parseLibFile——出来的必须是 v2 条目
  const incoming = parseLibFile(officialV1);
  assert.equal(incoming.length, 2);
  assert.ok(incoming.every((it) => Array.isArray(it.elements) && it.elements.length > 0), "每条都有 elements");
  assert.ok(incoming.every((it) => typeof it.id === "string" && it.id.startsWith("lib-")), "v1 条目有确定性 id");
  assert.ok(incoming.every((it) => it.status === "published"), "官方导入语义 = published");

  // ② 导入计划 → 序列化落盘 → 再解析，条目完好（round-trip 不再出怪胎）
  const existing = new Set();
  const plan = planImport(incoming, existing, []);
  assert.equal(plan.newCount, 2);
  const written = serializeLibFile(plan.localNext);
  assert.equal(written.includes('"0"'), false, "落盘文件里不许再出现数字键怪胎");
  const reread = parseLibFile(written);
  assert.deepEqual(reread.map((i) => i.id), incoming.map((i) => i.id), "round-trip 后 id 稳定");
  assert.deepEqual(reread.map((i) => i.elements.length), [2, 1]);

  // ③ 再导入同一份库 → 签名（确定性 id）全命中，零新增
  const again = planImport(parseLibFile(officialV1), new Set(reread.map((i) => itemSignature(i))), reread);
  assert.equal(again.newCount, 0);
  assert.equal(again.localNext, null, "不写文件");
});

test("wire format：页面三个文件 API 与 studio/storage.ts 逐字对应", () => {
  const page = readFileSync(resolve(ROOT, "src/library-import-page.ts"), "utf8");
  const storage = readFileSync(resolve(ROOT, "src/studio/storage.ts"), "utf8");
  // 同一套端点 + 同一套字段名 + 同一套错误口径（HTTP 200 + code!==0）
  for (const endpoint of ["/api/file/putFile", "/api/file/getFile", "/api/file/readDir"]) {
    assert.ok(page.includes(endpoint), `页面用 ${endpoint}`);
    assert.ok(storage.includes(endpoint), `storage 用 ${endpoint}`);
  }
  assert.ok(page.includes('form.append("path", path)'), "putFile path 字段");
  assert.ok(page.includes('form.append("isDir", "false")'), "putFile isDir 字段");
  assert.ok(page.includes('form.append("file"'), "putFile file 字段");
  assert.ok(page.includes('type: "application/json;charset=utf-8"'), "库文件 MIME 与 putTextFile 一致");
  assert.ok(page.includes('json.code !== 0'), "putFile/readDir 的 code 校验");
  assert.ok(page.includes('includes("application/json")'), "getFile 按 content-type 分流");
});

test("复用：页面不自己实现解析/序列化，吃方案 A 与 stencil 的纯函数", () => {
  const page = readFileSync(resolve(ROOT, "src/library-import-page.ts"), "utf8");
  assert.ok(page.includes('from "./studio/library-import.ts"'), "复用 parseLibraryInput");
  assert.ok(page.includes("parseLibraryInput("), "实际调用");
  assert.ok(page.includes('from "./studio/stencil.ts"'), "复用 stencil 纯函数");
  assert.ok(page.includes("serializeLibFile("), "序列化走 stencil");
  assert.ok(page.includes("parseLibFile("), "解析走 stencil");
});
