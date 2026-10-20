// zh-CN 汉化补丁的契约测试（scripts/excalidraw-zh-cn-patch.mjs）：
// ① 纯函数层：collectLeaves / parseExportMap；
// ② 语义层：把补丁打在迷你模块上，用 data:URL 真 ESM 执行——验证「原地补键」
//    与「改写 export 追加导出」两种补法在命名空间 frozen 的前提下都真的生效；
// ③ vendor 对齐层：overlay 与真实 zh/en 语言包逐键核对。上游升级后若新增或
//    改名键，这里会先红，按提示跑 `node scripts/excalidraw-zh-cn-patch.mjs --check`。
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  ZH_CN_PATCH,
  collectLeaves,
  parseExportMap,
  buildModulePatch,
} from "../scripts/excalidraw-zh-cn-patch.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const VENDOR_LOCALES = resolve(ROOT, "node_modules/@excalidraw/excalidraw/dist/prod/locales");

function pickLocale(code) {
  const hit = readdirSync(VENDOR_LOCALES).find((f) => new RegExp(`^${code}-`).test(f));
  assert.ok(hit, `locales/ 里找不到 ${code} 语言包（vendor 结构变了？）`);
  return join(VENDOR_LOCALES, hit);
}
const zhFile = pickLocale("zh-CN");
const enFile = pickLocale("en");

function allPatchLeaves() {
  const out = new Set();
  for (const [group, tree] of Object.entries(ZH_CN_PATCH)) {
    for (const l of collectLeaves(tree)) out.add([group, ...l.path].join("."));
  }
  return out;
}
function allLeaves(ns) {
  const out = new Set();
  for (const [group, tree] of Object.entries(ns)) {
    for (const l of collectLeaves(tree)) out.add([group, ...l.path].join("."));
  }
  return out;
}
const placeholders = (s) => [...String(s).matchAll(/\{\{\w+\}\}/g)].map((m) => m[0]).sort();

test("overlay 结构：每个组都有叶子，值非空且无首尾空白", () => {
  const groups = Object.keys(ZH_CN_PATCH);
  assert.ok(groups.length >= 10, `overlay 只剩 ${groups.length} 个组，可能被误删`);
  for (const group of groups) {
    const leaves = collectLeaves(ZH_CN_PATCH[group]);
    assert.ok(leaves.length > 0, `${group} 没有任何翻译`);
    for (const { path, value } of leaves) {
      assert.equal(typeof value, "string", `${group}.${path.join(".")} 不是字符串`);
      assert.ok(value.length > 0, `${group}.${path.join(".")} 是空串（会 falsy 回落英文）`);
      assert.equal(value.trim(), value, `${group}.${path.join(".")} 带首尾空白`);
    }
  }
});

test("overlay 译文保留 en 原文的全部 {{占位符}}（运行时替换的依据）", async () => {
  const enNs = (await import(pathToFileURL(enFile).href)).default;
  const problems = [];
  for (const [group, tree] of Object.entries(ZH_CN_PATCH)) {
    for (const { path, value } of collectLeaves(tree)) {
      const enVal = path.reduce((o, k) => o?.[k], enNs[group]);
      if (JSON.stringify(placeholders(enVal)) !== JSON.stringify(placeholders(value))) {
        problems.push(`${group}.${path.join(".")}：en=${JSON.stringify(placeholders(enVal))} zh=${JSON.stringify(placeholders(value))}`);
      }
    }
  }
  assert.deepEqual(problems, [], "占位符不一致：运行时替换不上，界面会露出 {{x}} 原文");
});

test("parseExportMap：解析重命名导出与裸名导出", () => {
  const m = parseExportMap('var t={},_x={};export{i as alerts,t as labels,_x as colorPicker,F as default,L};');
  assert.equal(m.get("labels"), "t");
  assert.equal(m.get("colorPicker"), "_x");
  assert.equal(m.get("default"), "F");
  assert.equal(m.get("L"), "L", "裸名导出应原样映射");
  assert.equal(m.get("nope"), undefined);
});

test("buildModulePatch：真 ESM 语义下原地补键与追加导出都生效（data:URL 执行）", async () => {
  const mini = 'var t={showGrid:"显示网格",link:{edit:"编辑链接"}};var u={blog:"浏览我们的博客"};var i={};export{i as alerts,t as labels,u as helpDialog};';
  const patched = buildModulePatch(mini, {
    labels: { showGrid: "显示网格（覆盖）", link: { hint: "在此输入或粘贴链接" } },
    helpDialog: { createFlowchart: "从通用元素创建流程图" },
    elementLink: { title: "链接到对象" },
  });
  assert.ok(patched.includes("__exsElementLink as elementLink"), "缺失组必须改写 export 追加导出");
  assert.ok(patched.includes('var __exsElementLink={"title":"链接到对象"};'), "缺失组要先定义对象再导出");
  const mod = await import("data:text/javascript;base64," + Buffer.from(patched, "utf8").toString("base64"));
  assert.equal(mod.labels.showGrid, "显示网格（覆盖）");
  assert.equal(mod.labels.link.hint, "在此输入或粘贴链接");
  assert.equal(mod.labels.link.edit, "编辑链接", "overlay 未列出的既有键不能被碰");
  assert.equal(mod.helpDialog.createFlowchart, "从通用元素创建流程图");
  assert.equal(mod.helpDialog.blog, "浏览我们的博客");
  assert.equal(mod.elementLink.title, "链接到对象");
});

test("buildModulePatch：没有 export 子句时宁可抛错（防静默回英文）", () => {
  assert.throws(() => buildModulePatch("var x={};", { labels: { a: "甲" } }), /export/);
});

test("真实 zh-CN 语言包：7 组原地补键、8 组追加导出，91 条译文全部进代码", () => {
  const zhCode = readFileSync(zhFile, "utf8");
  const map = parseExportMap(zhCode);
  const patched = buildModulePatch(zhCode);
  let inPlace = 0;
  let added = 0;
  for (const [group, tree] of Object.entries(ZH_CN_PATCH)) {
    const local = map.get(group);
    if (local) {
      inPlace++;
      const [first] = collectLeaves(tree);
      assert.ok(
        patched.includes(`${local}[${JSON.stringify(first.path[0])}]=`),
        `${group} 应在局部名 ${local} 上原地补键`,
      );
    } else {
      added++;
      const varName = "__exs" + group.charAt(0).toUpperCase() + group.slice(1);
      assert.ok(patched.includes(`var ${varName}=`), `${group} 缺新对象定义`);
      assert.ok(patched.includes(`${varName} as ${group}`), `${group} 缺追加导出`);
    }
    for (const { value } of collectLeaves(tree)) {
      assert.ok(patched.includes(JSON.stringify(value)), `${group} 的译文没进补丁代码：${value.slice(0, 18)}`);
    }
  }
  assert.equal(inPlace + added, Object.keys(ZH_CN_PATCH).length);
});

test("vendor 对齐：overlay 恰好补齐 en 与 zh 的键差（上游升级的探针）", async () => {
  const zhNs = (await import(pathToFileURL(zhFile).href)).default;
  const enNs = (await import(pathToFileURL(enFile).href)).default;
  const enLeaves = allLeaves(enNs);
  const zhLeaves = allLeaves(zhNs);
  const patchLeaves = allPatchLeaves();

  const stale = [...patchLeaves].filter((k) => !enLeaves.has(k)).sort();
  assert.deepEqual(
    stale,
    [],
    "overlay 里有 en 已不存在的键（上游改名/删键）：跑 node scripts/excalidraw-zh-cn-patch.mjs --check 复核",
  );
  const gap = [...enLeaves].filter((k) => !zhLeaves.has(k) && !patchLeaves.has(k)).sort();
  assert.deepEqual(
    gap,
    [],
    "en 有、zh 与 overlay 都缺的键（上游新增）：补译进 ZH_CN_PATCH 后重跑 --check",
  );
});
