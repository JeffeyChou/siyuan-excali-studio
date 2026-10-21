/**
 * S3：markdown 解析纯函数（doc-parse.ts）+ 脚本运行器（script-runner.ts，mock ea）。
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { firstFenceCode, parseFirstTable, parseHeadings, parseList, parseScriptDoc } from "../src/studio/doc-parse.ts";
import { runScriptCode } from "../src/siyuan/script-runner.ts";

const MD = `# 文档

\`\`\`js
const inside = "fence";
\`\`\`

## 二级标题
正文不算标题

| 名称 | 数量 |
| --- | --- |
| 苹果 | 3 |
| 香蕉 | 5 |

- 一级 A
  - 二级 A1
  - 二级 A2
- 一级 B
`;

test("parseHeadings：跳过围栏内、只收 ATX", () => {
  const hs = parseHeadings(MD);
  assert.deepEqual(hs, [
    { level: 1, text: "文档" },
    { level: 2, text: "二级标题" },
  ]);
});

test("parseFirstTable：分隔行剔除，表头+数据", () => {
  const t = parseFirstTable(MD);
  assert.deepEqual(t, { headers: ["名称", "数量"], rows: [["苹果", "3"], ["香蕉", "5"]] });
  assert.equal(parseFirstTable("# 没有表格"), null);
});

test("parseList：两级缩进成树", () => {
  const tree = parseList(MD);
  assert.equal(tree.length, 2);
  assert.equal(tree[0].text, "一级 A");
  assert.equal(tree[0].children.length, 2);
  assert.equal(tree[0].children[0].text, "二级 A1");
  assert.equal(tree[1].children.length, 0);
});

test("parseScriptDoc：标题/onload/围栏代码", () => {
  const doc = "# 我的脚本\n@excalidraw-onload\n```js\nea.addText({x:0,y:0});\n```";
  const meta = parseScriptDoc(doc);
  assert.equal(meta.title, "我的脚本");
  assert.equal(meta.onload, true);
  assert.equal(meta.code, "ea.addText({x:0,y:0});");
});

test("firstFenceCode：无围栏返回 null", () => {
  assert.equal(firstFenceCode("# 只有标题"), null);
});

test("runScriptCode：顶层 await + console 收集 + 异常回传", async () => {
  const logs = [];
  const ea = { notify: (m) => logs.push(m) };
  const ok = await runScriptCode("const a = await 1; console.log('hi', a);", ea, {});
  assert.equal(ok.ok, true);
  assert.equal(ok.logs[0], "[log] hi 1");

  const bad = await runScriptCode("throw new Error('炸了')", ea, {});
  assert.equal(bad.ok, false);
  assert.match(bad.error ?? "", /炸了/);
});

/* --------------------- 第三十二轮：EaApi 补齐 --------------------- */

import { boundingBoxOf, elementBounds, anchorPoint, nearestSide, wrapTextByWidth } from "../src/studio/ea-element.ts";
import { createEaApi } from "../src/studio/ea-api.ts";
import { BUILTIN_SCRIPTS } from "../src/siyuan/script-store.ts";

test("elementBounds/boundingBoxOf：普通盒 / line points / 旋转 / 空集", () => {
  const b = elementBounds({ x: 10, y: 20, width: 30, height: 40 });
  assert.deepEqual({ minX: b.minX, minY: b.minY, maxX: b.maxX, maxY: b.maxY }, { minX: 10, minY: 20, maxX: 40, maxY: 60 });
  const line = elementBounds({ x: 0, y: 0, width: 10, height: 0, points: [[0, 0], [100, 50]] });
  assert.equal(line.maxX, 100);
  assert.equal(line.maxY, 50);
  // 20×10 的矩形绕自身中心转 90°：包围盒应为 10 宽 20 高，中心不变（(10,5)）
  const rot = elementBounds({ x: 0, y: 0, width: 20, height: 10, angle: Math.PI / 2 });
  assert.ok(Math.abs(rot.minX - 5) < 1e-9 && Math.abs(rot.maxX - 15) < 1e-9, "旋转后宽度换轴");
  assert.ok(Math.abs(rot.minY + 5) < 1e-9 && Math.abs(rot.maxY - 15) < 1e-9, "旋转后高度换轴");
  assert.equal(boundingBoxOf([]), null);
  const merged = boundingBoxOf([
    { x: 0, y: 0, width: 10, height: 10 },
    { x: 100, y: 50, width: 10, height: 10 },
  ]);
  assert.deepEqual({ minX: merged.minX, minY: merged.minY, maxX: merged.maxX, maxY: merged.maxY }, { minX: 0, minY: 0, maxX: 110, maxY: 60 });
  assert.equal(merged.cx, 55);
});

test("anchorPoint 四侧锚点 + nearestSide 方位判定", () => {
  const el = { x: 0, y: 0, width: 100, height: 40 };
  assert.deepEqual(anchorPoint(el, "top"), { x: 50, y: 0 });
  assert.deepEqual(anchorPoint(el, "bottom"), { x: 50, y: 40 });
  assert.deepEqual(anchorPoint(el, "left"), { x: 0, y: 20 });
  assert.deepEqual(anchorPoint(el, "right"), { x: 100, y: 20 });
  assert.equal(nearestSide(el, { x: 200, y: 0, width: 10, height: 10 }), "right");
  assert.equal(nearestSide(el, { x: -200, y: 0, width: 10, height: 10 }), "left");
  assert.equal(nearestSide(el, { x: 0, y: 200, width: 10, height: 10 }), "bottom");
  assert.equal(nearestSide(el, { x: 0, y: -200, width: 10, height: 10 }), "top");
});

test("wrapTextByWidth：中文全宽计、英文 0.56 计、超宽换行、保留显式换行", () => {
  // fontSize 10 → 每行最多 5 个全宽字符
  assert.deepEqual(wrapTextByWidth("一二三四五六七", 50, 10), ["一二三四五", "六七"]);
  // 英文 0.56 字宽：maxWidth 20 / fontSize 10 = 2 字宽单位 → 3 个英文一行
  assert.deepEqual(wrapTextByWidth("abcd", 20, 10), ["abc", "d"]);
  assert.deepEqual(wrapTextByWidth("ab\ncd", 500, 10), ["ab", "cd"]);
});

/** EaBoardHandle 的最小 mock：elements 数组直读直改，updateScene 接收补丁 */
function mockHandle(initial = []) {
  let elements = [...initial];
  let selected = {};
  const appState = { get selectedElementIds() { return selected; }, set selectedElementIds(v) { selected = v; } };
  return {
    appState,
    handle: {
      getElements: () => elements,
      getAppState: () => appState,
      addElements: (specs) => {
        const els = specs.map((s) => ({ x: 0, y: 0, width: 10, height: 10, ...s }));
        elements = [...elements, ...els];
        return els.map((e) => e.id);
      },
      patchElements: (ids, patch) => {
        const set = new Set(ids);
        elements = elements.map((e) => (set.has(e.id) ? { ...e, ...patch } : e));
      },
      deleteElements: (ids) => {
        const set = new Set(ids);
        elements = elements.filter((e) => !set.has(e.id));
      },
      connectObjects: (id1, s1, id2, s2) => (id1 === id2 ? null : "arrow-1"),
      addEmbeddable: (link, at) => {
        elements = [...elements, { id: "emb-1", type: "embeddable", link, ...at }];
        return "emb-1";
      },
      getTheme: () => "dark",
      setTheme: () => undefined,
    },
  };
}

test("createEaApi 新出口：选中/包围盒/分组/置顶置底/移动/主题/嵌入/思源门面", async () => {
  const { handle, appState } = mockHandle([
    { id: "a", x: 0, y: 0, width: 10, height: 10, index: "a0" },
    { id: "b", x: 20, y: 5, width: 10, height: 10, index: "a1" },
    { id: "c", x: 40, y: 0, width: 10, height: 10, index: "a2" },
  ]);
  const host = { getSettings: () => ({ saveDir: "assets" }), siyuanCall: async (api) => ({ api, ok: 1 }) };
  const ea = createEaApi(handle, host);

  appState.selectedElementIds = { b: true };
  assert.deepEqual(ea.getSelectedElements(), ["b"]);
  const box = ea.getBoundingBox("selection");
  assert.deepEqual({ minX: box.minX, maxX: box.maxX }, { minX: 20, maxX: 30 });

  assert.equal(ea.connectObjects("a", "auto", "c", "auto"), "arrow-1");
  assert.equal(ea.connectObjects("a", "auto", "a", "auto"), null, "同元素拒绝");

  const gid = ea.group(["a", "b"]);
  assert.ok(gid && gid.startsWith("group-"));
  assert.deepEqual(ea.getElement("a").groupIds, [gid]);
  ea.unGroup(["a", "b"]);
  assert.deepEqual(ea.getElement("a").groupIds, []);

  ea.toFront(["a"]); // 全序 [a,b,c] → [b,c,a]：b/c/a 依次拿走原 a/b/c 的 index
  assert.equal(ea.getElement("a").index, "a2");
  assert.equal(ea.getElement("b").index, "a0");
  assert.equal(ea.getElement("c").index, "a1");
  ea.toBack(["a"]); // 回到首位
  assert.equal(ea.getElement("a").index, "a0");
  assert.equal(ea.getElement("b").index, "a1");
  assert.equal(ea.getElement("c").index, "a2");

  ea.setPosition("a", 5, 6);
  assert.deepEqual({ x: ea.getElement("a").x, y: ea.getElement("a").y }, { x: 5, y: 6 });
  ea.moveBy(["a"], 1, 2);
  assert.deepEqual({ x: ea.getElement("a").x, y: ea.getElement("a").y }, { x: 6, y: 8 });

  assert.equal(ea.measureText("一二三", 10).width, 30);
  assert.deepEqual(ea.wrapText("一二三四五", 30, 10), ["一二三", "四五"]);

  assert.equal(ea.getTheme(), "dark");
  assert.equal(ea.addEmbeddable("/plugins/siyuan-excali-studio/embed/siyuan/index.html?blockId=x", { x: 0, y: 0 }), "emb-1");
  assert.equal(ea.getElement("emb-1").type, "embeddable");

  const out = await ea.siyuan.call("block/getBlockKramdown", { id: "x" });
  assert.deepEqual(out, { api: "block/getBlockKramdown", ok: 1 });
});

test("第四十轮：ea.addLibraryItem——脚本写素材库（此前无写库出口）", async () => {
  const calls = [];
  const handle = {
    getElements: () => [],
    getAppState: () => ({}),
    addElements: () => [],
    patchElements: () => undefined,
    deleteElements: () => undefined,
    clear: () => undefined,
    selectElements: () => undefined,
    updateScene: () => undefined,
    scrollToContent: () => undefined,
    scrollToElement: () => undefined,
    setViewMode: () => undefined,
    addImage: async () => "",
    exportImage: async () => new Blob(),
    connectObjects: () => null,
    addEmbeddable: () => "",
    getTheme: () => "light",
    setTheme: () => undefined,
    addLibraryItem: async (item) => {
      calls.push(item);
      // 忠实模拟真实句柄：无 id 时自动派生
      const id = typeof item.id === "string" && item.id ? item.id : `lib-mock-${calls.length}`;
      return id;
    },
  };
  const host = {
    getSettings: () => ({ saveDir: "" }),
    siyuanCall: async () => null,
    notify: () => undefined,
  };
  const ea = createEaApi(handle, host, "material-recipe.md");
  const id = await ea.addLibraryItem({
    id: "lib-x",
    name: "配方素材",
    elements: [{ id: "e1", type: "line" }],
    excaliRecipe: { kind: "excali-outline", v: 1 },
  });
  assert.equal(id, "lib-x", "返回入库 id");
  assert.equal(calls.length, 1, "只调一次");
  assert.equal(calls[0].name, "配方素材");
  // 配方随条目走（引擎 restoreLibraryItem 是 {...libraryItem, elements} ⇒ 存活）
  assert.deepEqual(calls[0].excaliRecipe, { kind: "excali-outline", v: 1 });
});

test("BUILTIN_SCRIPTS：17 个脚本全部可解析（H1+围栏），新脚本引用的 API 在 EaApi 面内", () => {
  assert.equal(BUILTIN_SCRIPTS.length, 17);
  // 第三十四轮（字体补丁方案）：apply-font-* 六件套已废弃——fontFamily 是数字枚举，
  // 写字符串走不通；六款字体改由构建期 vendor 注册表补丁注入（见 scripts/excalidraw-fonts-patch.mjs）
  assert.ok(!BUILTIN_SCRIPTS.some((x) => x.file.startsWith("apply-font-")), "apply-font-* 已废弃，不应再出现在内置脚本");
  const files = BUILTIN_SCRIPTS.map((s) => s.file);
  assert.ok(files.includes("mindmap-from-headings.md"), "思维导图 v2 保留同文件名（替换内容）");
  assert.ok(files.includes("repeat-tween.md"), "重复补间（第三十四轮：EaUtils.inputPrompt 首个消费者）");
  assert.ok(files.includes("text-numbering.md"), "文字编号（按选择顺序；与 number-badges 徽标互不替代）");
  assert.ok(files.includes("highlighter.md"), "第三十八轮：荧光笔（可固定到侧边栏当功能扩展）");
  assert.ok(files.includes("material-recipe.md"), "第四十轮：素材配方（改色/改参数/重新生成）");
  for (const name of ["box-selection", "uniform-size", "reverse-arrows", "change-shape"]) {
    assert.ok(files.includes(name + ".md"), "缺内置脚本：" + name);
  }
  for (const name of ["align-and-distribute", "number-badges", "smart-connect", "kanban-from-list", "export-steps"]) {
    assert.ok(files.includes(name + ".md"), "缺内置脚本：" + name);
  }
  for (const s of BUILTIN_SCRIPTS) {
    const meta = parseScriptDoc(s.content);
    assert.ok(meta.title.length > 0, s.file + " 缺 H1 标题");
    assert.ok(meta.code.length > 0, s.file + " 缺代码围栏");
  }
  // 新 API 的脚本消费面（拼写错误 = 运行时报 undefined，静态拦一道）
  const all = BUILTIN_SCRIPTS.map((s) => s.content).join("\n");
  for (const api of ["getSelectedElements", "getBoundingBox", "connectObjects", "setPosition", "exportPNG", "setText", "inputPrompt", "getScriptSetting", "highlighter", "getPen"]) {
    assert.ok(all.includes("ea." + api) || (api === "inputPrompt" && all.includes("ea.utils." + api)), "内置脚本应消费 ea." + api);
  }
  assert.ok(!/ea\.\$unknown/.test(all));
});

test("第三十四轮：StylePatch 类型面放宽到 width/height/箭头帽（统一尺寸与反转箭头的前提）", async () => {
  const { readFileSync } = await import("node:fs");
  const src = readFileSync(new URL("../src/studio/ea-api.ts", import.meta.url), "utf8");
  const pick = src.slice(src.indexOf("export type StylePatch"), src.indexOf(">;", src.indexOf("export type StylePatch")));
  for (const key of ["width", "height", "startArrowhead", "endArrowhead"]) {
    assert.ok(pick.includes('"' + key + '"'), "StylePatch 缺 " + key);
  }
});

test("回归（真机 ea.notify is not a function）：createEaApi 必须把 host.notify 接进 ea", async () => {
  // 读源码契约：接口声明 + 实现接线，双断言（漏一处都会复现真机报错）
  const { readFileSync } = await import("node:fs");
  const src = readFileSync(new URL("../src/studio/ea-api.ts", import.meta.url), "utf8");
  assert.ok(/notify:\s*\(msg: string\)\s*=>\s*void;/.test(src), "EaApi 接口缺 notify 成员声明");
  assert.ok(/notify:\s*\(msg\)\s*=>\s*host\.notify\(msg\)/.test(src), "createEaApi 未接线 host.notify");
});

test("第三十四轮：utils.inputPrompt 三层接线（EaHost 声明 → createEaApi 转 null 为空串 → 宿主对话框）", async () => {
  const { readFileSync } = await import("node:fs");
  const eaApi = readFileSync(new URL("../src/studio/ea-api.ts", import.meta.url), "utf8");
  const index = readFileSync(new URL("../src/index.ts", import.meta.url), "utf8");
  // ① 接口层：EaHost 有 inputPrompt（可返回 null），EaUtils 有 inputPrompt（转空串）
  assert.ok(/inputPrompt:\s*\(message:\s*string,\s*type:\s*"text" \| "number" \| "password",\s*defaultValue:\s*string\)\s*=>\s*Promise<string \| null>/.test(eaApi), "EaHost 缺 inputPrompt 声明");
  assert.ok(/inputPrompt:\s*\(message:\s*string,\s*type\?\s*:\s*"text"/.test(eaApi), "EaUtils 缺 inputPrompt 声明");
  // ② createEaApi：null（取消）转空串——脚本 parseInt("") 即 NaN，按各自默认值回落
  assert.ok(/inputPrompt: async \(message, type = "text", defaultValue = ""\)\s*=>\s*\(await host\.inputPrompt\(message, type, defaultValue\)\) \?\? ""/.test(eaApi), "createEaApi 未把 host 的 null 转空串");
  // ③ 宿主实现：Dialog 形态、取消/关窗都 settle（destroyCallback），Promise 永不悬挂
  assert.ok(index.includes("inputPrompt: (message, type, defaultValue) =>"), "宿主缺 inputPrompt 实现");
  const impl = index.slice(index.indexOf("inputPrompt: (message, type, defaultValue) =>"));
  assert.ok(/destroyCallback: \(\) => finish\(null\)/.test(impl), "取消/关窗必须返回 null（destroyCallback settle），否则脚本 Promise 悬挂");
  assert.ok(/type === "number" \? "number"/.test(impl), "number 型要落到 input[type=number]");
});

test("回归（真机 Unexpected token ')'）：全部内置脚本围栏代码必须过 node 语法检查", async () => {
  const require = (await import("node:module")).createRequire(import.meta.url);
  const { spawnSync } = require("node:child_process");
  const { mkdtempSync, writeFileSync, rmSync } = require("node:fs");
  const { tmpdir } = require("node:os");
  const { join } = require("node:path");
  const dir = mkdtempSync(join(tmpdir(), "excali-scripts-"));
  try {
    for (const s of BUILTIN_SCRIPTS) {
      // 与 script-runner 同构：async 函数体包裹（顶层 await 合法化）
      const wrapped = `"use strict";\nreturn (async () => {\n${parseScriptDoc(s.content).code}\n})();`;
      const file = join(dir, s.file.replace(/\.md$/, ".js"));
      writeFileSync(file, wrapped, "utf8");
      const r = spawnSync(process.execPath, ["--check", file], { encoding: "utf8" });
      assert.equal(r.status, 0, `${s.file} 有语法错误：\n${r.stderr}`);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("第三十四轮：parseScriptDoc 提取使用说明文字（H1 后、围栏前正文，折叠单行）", () => {
  const md = "# 标题甲\n\n第一行说明。\n第二行说明。\n\n@excalidraw-onload\n\n```js\ncode1();\n```\n";
  const meta = parseScriptDoc(md);
  assert.equal(meta.title, "标题甲");
  assert.equal(meta.description, "第一行说明。 第二行说明。", "说明合并为单行、去 onload 标记、不含 H1");
  assert.equal(meta.code, "code1();");
  // 无说明（纯代码围栏）→ 空串
  const bare = parseScriptDoc("# 只有代码\n\n```js\nx();\n```\n");
  assert.equal(bare.description, "");
  // 内置 9 个脚本的说明全部非空（选择器里每条都有说明文字）
  for (const s of BUILTIN_SCRIPTS) {
    assert.ok(parseScriptDoc(s.content).description.length > 0, `${s.file} 缺使用说明文字`);
  }
});

test("第三十六轮 v4：text-numbering 仿真——Shift 显式弹格式菜单 / toggle 去编号 / 取消不动", async () => {
  const { BUILTIN_SCRIPTS: scripts } = await import("../src/siyuan/script-store.ts");
  const doc = scripts.find((s) => s.file === "text-numbering.md");
  assert.ok(doc, "缺 text-numbering.md");
  const code = parseScriptDoc(doc.content).code;

  const textEl = (id, text, containerId = null) => ({ id, type: "text", containerId, text, fontSize: 20, lineHeight: 1.25 });
  const makeEa = (elements, selIds, setting, answer, modifiers) => {
    const calls = { setText: [], notify: [], prompt: [] };
    const ea = {
      getSelectedElements: () => selIds,
      getElement: (id) => elements.find((e) => e.id === id),
      getModifiers: () => modifiers ?? {},
      getScriptSetting: (key, def) => (setting === undefined ? def : setting),
      setText: (id, text) => calls.setText.push([id, text]),
      notify: (m) => calls.notify.push(m),
      utils: {
        // answer 为 undefined = 断言「本场景不应弹菜单」（哨兵：调了即失败）
        selectOption: async (spec) => {
          if (answer === undefined) throw new Error("本场景不应弹格式菜单");
          calls.prompt.push(spec);
          return answer;
        },
      },
    };
    return { ea, calls };
  };

  // ① 新文字 + 无 Shift + 设置 "1"：直跑编号，不弹窗（哨兵兜底）
  const els1 = [textEl("t0", "苹果"), textEl("t1", "香蕉"), textEl("t2", "樱桃")];
  const r1 = makeEa(els1, ["t2", "t0", "t1"], "1");
  await runScriptCode(code, r1.ea, {});
  assert.deepEqual(r1.calls.setText.map((x) => x[0]), ["t2", "t0", "t1"], "编号必须按点选顺序");
  assert.deepEqual(r1.calls.setText.map((x) => x[1]), ["1. 樱桃", "2. 苹果", "3. 香蕉"]);

  // ② 新文字 + 无 Shift + 设置 "3"（罗马小写）：直跑出 i. ii.
  const r2 = makeEa(els1, ["t0", "t1"], "3");
  await runScriptCode(code, r2.ea, {});
  assert.deepEqual(r2.calls.setText.map((x) => x[1]), ["i. 苹果", "ii. 香蕉"]);

  // ③ 全部带编号 + 无 Shift = toggle off：去掉编号（复用 PREFIX_RE，不动正文）
  const els2 = [textEl("a", "1. 第一步"), textEl("b", "2. 第二步")];
  const r3 = makeEa(els2, ["a", "b"], "1");
  await runScriptCode(code, r3.ea, {});
  assert.deepEqual(r3.calls.setText.map((x) => x[1]), ["第一步", "第二步"], "全部已编号 → 去掉编号");
  assert.ok(r3.calls.notify.join().includes("已去掉 2 条"), "toggle off 提示");

  // ④ 全部带编号 + Shift = 显式重编号：弹格式菜单，预勾选脚本库设置值，选 5 换小写字母
  const r4 = makeEa(els2, ["a", "b"], "1", "5", { shift: true });
  await runScriptCode(code, r4.ea, {});
  assert.equal(r4.calls.prompt.length, 1, "Shift 才弹一次菜单");
  assert.equal(r4.calls.prompt[0].current, "1", "预勾选脚本库设置里的默认格式");
  assert.deepEqual(r4.calls.prompt[0].options.map((o) => o.value), ["1", "2", "3", "4", "5"], "菜单只给五种格式（无自由输入）");
  assert.deepEqual(r4.calls.setText.map((x) => x[1]), ["a. 第一步", "b. 第二步"], "按新选的格式重编号");

  // ⑤ Shift + 取消（菜单返回 null）= 什么都不做（修复「取消也运行脚本」）
  const r5 = makeEa(els2, ["a", "b"], "1", null, { shift: true });
  await runScriptCode(code, r5.ea, {});
  assert.equal(r5.calls.setText.length, 0, "取消不写任何文字");

  // ⑦ 混合（一条有编号、一条没有）+ 无 Shift：按加编号处理（无编号的加、有编号的按默认重编号），不弹
  const els3 = [textEl("t0", "新条目"), textEl("t1", "I. 旧条目")];
  const r7 = makeEa(els3, ["t0", "t1"], "1");
  await runScriptCode(code, r7.ea, {});
  assert.deepEqual(r7.calls.setText.map((x) => x[1]), ["1. 新条目", "2. 旧条目"], "混合按加编号（旧编号被默认格式替换）");

  // ⑧ 边界：非文字 / 绑定文字跳过并提示
  const els4 = [textEl("t0", "标题"), { id: "r0", type: "rectangle" }, textEl("t1", "绑定说明", "r0")];
  const r8 = makeEa(els4, ["t0", "r0", "t1"], "1");
  await runScriptCode(code, r8.ea, {});
  assert.deepEqual(r8.calls.setText.map((x) => x[0]), ["t0"], "只改独立文本");
  assert.ok(r8.calls.notify.join().includes("跳过 2 个"), "跳过计数提示");

  // ⑨ 空选：只提示不写入、不弹窗
  const r9 = makeEa(els1, [], "1");
  await runScriptCode(code, r9.ea, {});
  assert.equal(r9.calls.setText.length, 0, "空选不写");
  assert.ok(r9.calls.notify.join().includes("Shift"), "空选给操作引导");

  // ⑩ 从没在脚本库设置过 + 新文字 → 回落默认数字格式，不弹窗
  const r10 = makeEa(els1, ["t0"]);
  await runScriptCode(code, r10.ea, {});
  assert.equal(r10.calls.setText[0][1], "1. 苹果", "未设置回落默认数字格式");
});

test("P2：createEaApi 脚本设置原语——读桶回落 default / 写经宿主 / 隐式按当前脚本", async () => {
  const store = { "text-numbering.md": { format: "3" } };
  const hostCalls = [];
  const host = {
    getScriptSetting: (name, key) => store[name]?.[key],
    setScriptSetting: (name, key, value) => {
      hostCalls.push([name, key, value]);
      store[name] = { ...(store[name] ?? {}), [key]: value };
    },
    save: () => undefined,
    notify: () => undefined,
    getSettings: () => ({ saveDir: "" }),
    siyuanCall: async () => null,
    inputPrompt: async () => null,
    getDocMarkdown: async () => "",
    getSelectedText: () => "",
    listFiles: async () => [],
    readFileAsDataURL: async () => "",
  };
  const handle = {
    getElements: () => [],
    getAppState: () => ({}),
    addElements: () => [],
    patchElements: () => undefined,
    deleteElements: () => undefined,
    clear: () => undefined,
    selectElements: () => undefined,
    updateScene: () => undefined,
    scrollToContent: () => undefined,
    scrollToElement: () => undefined,
    setViewMode: () => undefined,
    addImage: async () => "",
    exportImage: async () => new Blob(),
    connectObjects: () => null,
    addEmbeddable: () => "",
    getTheme: () => "light",
    setTheme: () => undefined,
  };
  const ea = createEaApi(handle, host, "text-numbering.md");
  assert.equal(ea.getScriptSetting("format", "1"), "3", "读桶里的值");
  assert.equal(ea.getScriptSetting("missing", "d"), "d", "缺键回落调用方 default");
  ea.setScriptSetting("format", "5");
  assert.deepEqual(hostCalls, [["text-numbering.md", "format", "5"]], "写经宿主、隐式带当前脚本名");
  // P2v4：修饰键透传（缺省 false；Shift = 脚本里弹格式菜单的信号）
  assert.deepEqual(createEaApi(handle, host, "x.md").getModifiers(), { shift: false }, "缺省无修饰键");
  assert.deepEqual(createEaApi(handle, host, "x.md", { shift: true }).getModifiers(), { shift: true }, "透传 shift");
  // P2v4：selectOption 几选一——spec 透传 + 现场锚点注入 + null 原样传播
  let seenSpec = null;
  const optHost = { ...host, selectOption: async (spec) => { seenSpec = spec; return "3"; } };
  const eaOpt = createEaApi(handle, optHost, "x.md", { at: { x: 10, y: 20 } });
  assert.equal(await eaOpt.utils.selectOption({ options: [{ value: "3", label: "罗马小写" }] }), "3", "selectOption 透传宿主返回值");
  assert.deepEqual(seenSpec.at, { x: 10, y: 20 }, "脚本没传锚点时用运行现场的点击坐标");
  assert.equal(seenSpec.current, undefined, "未传 current = 菜单不打勾");
  const nullHost = { ...host, selectOption: async () => null };
  assert.equal(
    await createEaApi(handle, nullHost, "x.md").utils.selectOption({ options: [] }),
    null,
    "宿主返回 null（点空白/Esc 取消）原样传播——不像 inputPrompt 转空串",
  );
});

/* --------------------- 第三十八轮：荧光笔（pens 纯函数 + ea 三原语） --------------------- */

import {
  DEFAULT_HIGHLIGHTER,
  HL_ROUGHNESS,
  highlighterPx,
  isHighlighter,
  normalizeHighlighter,
} from "../src/studio/pens.ts";

test("normalizeHighlighter：脏值收口（缺键回落、色格式、宽/透明夹界）", () => {
  assert.deepEqual(normalizeHighlighter(undefined), DEFAULT_HIGHLIGHTER, "缺键（老 data.json 没这个字段）回落默认");
  assert.deepEqual(normalizeHighlighter({ color: "red", width: 4, opacity: 45 }), DEFAULT_HIGHLIGHTER, "非 #rrggbb 回落默认黄");
  assert.equal(normalizeHighlighter({ color: "#69DB7C" }).color, "#69db7c", "色值大小写归一");
  assert.equal(normalizeHighlighter({ width: 99 }).width, 12, "笔宽上限 12（vendor 支持范围）");
  assert.equal(normalizeHighlighter({ width: 0 }).width, 1, "笔宽下限 1");
  assert.equal(normalizeHighlighter({ width: "abc" }).width, 4, "NaN 回落默认宽");
  assert.equal(normalizeHighlighter({ opacity: 3 }).opacity, 10, "透明下限 10（再淡就看不见了）");
  assert.equal(normalizeHighlighter({ opacity: 400 }).opacity, 100, "透明上限 100");
  assert.equal(highlighterPx(4), 17, "width 4 ≈ 17px（上一版 width 12 ≈ 51px 糊成宽带，就是根因）");
});

test("isHighlighter：工具 + 四键全等才算「正拿着荧光笔」", () => {
  const cfg = { color: "#ffd43b", width: 4, opacity: 45 };
  const base = { tool: "freedraw", color: "#FFD43B", width: 4, opacity: 45, roughness: HL_ROUGHNESS };
  assert.equal(isHighlighter(base, cfg), true, "色值大小写不同算同一支笔");
  assert.equal(isHighlighter({ ...base, tool: "selection" }, cfg), false, "工具不符不算");
  assert.equal(isHighlighter({ ...base, roughness: 1 }, cfg), false, "糙度不符不算");
  assert.equal(isHighlighter({ ...base, width: 6 }, cfg), false, "笔宽不符不算");
  assert.equal(isHighlighter({ ...base, opacity: 100 }, cfg), false, "透明不符不算");
});

test("ea 三原语：getPen 直读 / setPen 合并归一 / highlighter() 读设置那一份", () => {
  let pen = { tool: "selection", color: "#1e1e1e", width: 2, opacity: 100, roughness: 1 };
  const calls = [];
  const handle = {
    getPen: () => pen,
    applyPen: (p, tool) => {
      calls.push([p, tool]);
      pen = { ...pen, ...p, tool: tool ?? pen.tool };
    },
  };
  const host = { getSettings: () => ({}), getHighlighter: () => ({ color: "#4dabf7", width: 6, opacity: 45 }) };
  const ea = createEaApi(handle, host, "highlighter.md");

  assert.deepEqual(ea.getPen(), { tool: "selection", color: "#1e1e1e", width: 2, opacity: 100, roughness: 1 }, "getPen 直读句柄");

  ea.setPen({ color: "#f00" });
  assert.deepEqual(
    calls[0][0],
    { color: "#ffd43b", width: 2, opacity: 100, roughness: 1 },
    "脏色回落默认黄，其余键保留现状（只改颜色不该动糙度）",
  );
  assert.equal(calls[0][1], undefined, "不带 tool 就不抢用户当前工具");

  ea.setPen({ width: 99, roughness: 2 });
  assert.equal(calls[1][0].width, 12, "越界笔宽由 pens 层夹到 12");
  assert.equal(calls[1][0].roughness, 2, "roughness 显式给才改");

  ea.setPen({ color: "#69db7c", tool: "freedraw" });
  assert.equal(calls[2][1], "freedraw", "带 tool 时一并切工具");

  ea.highlighter();
  assert.deepEqual(calls[3][0], { color: "#4dabf7", width: 6, opacity: 45, roughness: 0 }, "highlighter() = 设置里那一份 + 零糙度（脚本零参，两处各存一套迟早打架）");
  assert.equal(calls[3][1], "freedraw", "一键进手绘工具");
});

test("内置脚本：highlighter.md 已注册（可固定到侧边栏当功能扩展）", () => {
  const hl = BUILTIN_SCRIPTS.find((s) => s.file === "highlighter.md");
  assert.ok(hl, "highlighter.md 在 BUILTIN_SCRIPTS 里");
  assert.match(hl.content, /^# 荧光笔/m, "H1 标题 = 脚本名");
  assert.match(hl.content, /ea\.highlighter\(\);/, "正文一键切荧光笔");
  assert.equal(/SCRIPT_SETTING|ea\.setPen\(\{ color: "/.test(hl.content), false, "脚本侧不带参数：调色只走设置里那一份");
});
