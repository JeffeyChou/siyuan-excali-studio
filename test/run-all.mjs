// 聚合测试运行器：逐个运行 test/*.test.mjs，不因单个失败中断，最后汇总并置退出码。
// 用法：npm test   （调试完整日志：VERBOSE=1 npm test）
//
// 与 siyuan-plugin-reader 的口径一致：自动发现，不用硬编码白名单
// （白名单会双向失真：删了文件条目还在、加了文件却不进名单 = 静默漏测）。
import { spawn } from "node:child_process";
import { readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const NODE = process.execPath;
const TEST_DIR = dirname(fileURLToPath(import.meta.url));

// 需要长期跳过的文件放这里，必须附原因与日期。为空是正常的。
const SKIP = new Set([
  // 例："test/foo.test.mjs", // 2026-10-15 原因为 xxx
]);

const TESTS = readdirSync(TEST_DIR)
  .filter((f) => f.endsWith(".test.mjs"))
  .map((f) => "test/" + f)
  .filter((f) => !SKIP.has(f))
  .sort();

function run(file) {
  return new Promise((resolve) => {
    const child = spawn(NODE, ["--experimental-strip-types", file], {
      cwd: process.cwd(),
      stdio: ["ignore", "pipe", "pipe"],
    });
    let out = "";
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (out += d));
    child.on("close", (code) => resolve({ file, code, out }));
  });
}

const countNotOk = (out) => (out.match(/^not ok/gm) || []).length;

async function main() {
  const failed = [];
  const verbose = !!process.env.VERBOSE;
  let i = 0;
  for (const f of TESTS) {
    i++;
    const r = await run(f);
    const ok = r.code === 0;
    if (!ok) failed.push(r);
    console.log(
      `[${ok ? "PASS" : "FAIL"}] ${String(i).padStart(3, "0")}/${TESTS.length} ${f}` +
        (ok ? "" : ` (exit=${r.code}, notOk=${countNotOk(r.out)})`),
    );
  }
  console.log("\n=== SUMMARY ===");
  console.log(`passed  : ${TESTS.length - failed.length}/${TESTS.length}`);
  console.log(`failed  : ${failed.length}`);
  if (failed.length) {
    console.log("failed files:");
    for (const r of failed) {
      console.log(`  - ${r.file} (exit=${r.code}, notOk=${countNotOk(r.out)})`);
    }
    if (verbose) {
      console.log("\n=== VERBOSE OUTPUT OF FAILURES ===");
      for (const r of failed) console.log(`\n----- ${r.file} -----\n${r.out}`);
    } else {
      console.log("(set VERBOSE=1 to dump full logs of failing files)");
    }
    process.exitCode = 1;
  } else {
    console.log("ALL GREEN");
  }
}

main();
