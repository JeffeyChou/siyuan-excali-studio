/**
 * 方案 A：素材库链接导入的输入解析（library-import.ts 纯逻辑）。
 * 覆盖「Add to Excalidraw」跳转 URL 的 query/hash 两形态、裸 .excalidrawlib
 * 直链、以及各类无效输入的快速失败。
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { parseLibraryInput } from "../src/studio/library-import.ts";

const LIB = "https://libraries.excalidraw.com/libraries/childishgirl/aws-architecture-icons.excalidrawlib";
const ENCODED = encodeURIComponent(LIB);

test("query 形态：excalidraw.com?addLibrary=<编码库URL>", () => {
  const r = parseLibraryInput(`https://excalidraw.com?addLibrary=${ENCODED}`);
  assert.deepEqual(r, { kind: "remote", libraryUrl: LIB });
});

test("query 形态：带 token 参数（CSRF，本地场景忽略）", () => {
  const r = parseLibraryInput(`https://excalidraw.com?addLibrary=${ENCODED}&token=abc123`);
  assert.deepEqual(r, { kind: "remote", libraryUrl: LIB });
});

test("hash 形态：excalidraw.com#addLibrary=<编码库URL>", () => {
  const r = parseLibraryInput(`https://excalidraw.com#addLibrary=${ENCODED}`);
  assert.deepEqual(r, { kind: "remote", libraryUrl: LIB });
});

test("hash 形态：带 token", () => {
  const r = parseLibraryInput(`https://excalidraw.com#addLibrary=${ENCODED}&token=abc123`);
  assert.deepEqual(r, { kind: "remote", libraryUrl: LIB });
});

test("裸直链：Download 按钮的 .excalidrawlib 地址", () => {
  const r = parseLibraryInput(LIB);
  assert.deepEqual(r, { kind: "remote", libraryUrl: LIB });
});

test("裸直链：大小写混合的扩展名也认", () => {
  const r = parseLibraryInput("https://libraries.excalidraw.com/libraries/x/y.ExcalidrawLib");
  assert.equal(r.kind, "remote");
  if (r.kind === "remote") assert.equal(r.libraryUrl, "https://libraries.excalidraw.com/libraries/x/y.ExcalidrawLib");
});

test("输入带首尾空白也解析", () => {
  const r = parseLibraryInput(`  https://excalidraw.com?addLibrary=${ENCODED}  \n`);
  assert.deepEqual(r, { kind: "remote", libraryUrl: LIB });
});

test("空输入 → empty", () => {
  assert.deepEqual(parseLibraryInput(""), { kind: "error", reason: "empty" });
  assert.deepEqual(parseLibraryInput("   "), { kind: "error", reason: "empty" });
});

test("addLibrary 里不是 .excalidrawlib → badLibraryUrl", () => {
  const r = parseLibraryInput("https://excalidraw.com?addLibrary=https%3A%2F%2Fexample.com%2Fevil.zip");
  assert.deepEqual(r, { kind: "error", reason: "badLibraryUrl" });
});

test("addLibrary 里是非法 URL → badLibraryUrl", () => {
  const r = parseLibraryInput("https://excalidraw.com?addLibrary=not-a-url");
  assert.deepEqual(r, { kind: "error", reason: "badLibraryUrl" });
});

test("粘了 excalidraw.com 首页（无 addLibrary、非库直链）→ unrecognized", () => {
  assert.deepEqual(parseLibraryInput("https://excalidraw.com"), { kind: "error", reason: "unrecognized" });
});

test("粘了素材库站首页 → unrecognized", () => {
  assert.deepEqual(parseLibraryInput("https://libraries.excalidraw.com/"), { kind: "error", reason: "unrecognized" });
});

test("本地文件路径不进解析（对话框走 input[type=file]）→ unrecognized", () => {
  assert.deepEqual(parseLibraryInput("/Users/xieyue/Downloads/aws.excalidrawlib"), { kind: "error", reason: "unrecognized" });
  assert.deepEqual(parseLibraryInput("file:///Users/xieyue/a.excalidrawlib"), { kind: "error", reason: "unrecognized" });
});

test("javascript: 等危险协议 → unrecognized", () => {
  assert.deepEqual(parseLibraryInput("javascript:alert(1)//.excalidrawlib"), { kind: "error", reason: "unrecognized" });
});
