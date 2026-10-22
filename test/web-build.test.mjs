// 网页端（浏览器）没有 process：构建产物里不能残留 process.env.NODE_ENV，
// 否则 engine.js 一加载就抛 ReferenceError: process is not defined（桌面端 Electron 有 process，所以只在网页端出错）。
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

for (const file of ["index.js", "engine.js", "kernel.js", "lib-import.js"]) {
  test(`${file} 不含 process.env.NODE_ENV`, () => {
    const code = readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
    assert.ok(!code.includes("process.env.NODE_ENV"), `${file} 里还有 process.env.NODE_ENV，构建没替换`);
  });
}

test("build.mjs 在 define 里替换 process.env.NODE_ENV", () => {
  const build = readFileSync(new URL("../scripts/build.mjs", import.meta.url), "utf8");
  assert.match(build, /"process\.env\.NODE_ENV": JSON\.stringify\("production"\)/);
});
