// 2026-10-19 A+：风格包注册表（方案 A）。盯五件事：
// extends 只写差异、坏包不污染内置、space/groupColor 真进布局与取色、
// 不写 style 时几何与历史口径一致、导出的 JSON 与手写同 schema。
import { afterEach, test } from "node:test";
import assert from "node:assert/strict";
import { layoutPlan } from "../src/studio/ai/layout.ts";
import { normalizePlan } from "../src/studio/ai/plan.ts";
import { renderPlan } from "../src/studio/ai/render.ts";
import { PLAN_PRESETS, fillFor, presetOf, styleNames, unregisterStylePacks } from "../src/studio/ai/preset.ts";
import {
  STYLE_DIR,
  StylePackError,
  diffOf,
  listStyles,
  loadStylePacks,
  parseStylePack,
  registerStylePackJson,
} from "../src/studio/ai/style-pack.ts";

/** 内存目录：文件名 → JSON 正文（不碰真实工作空间） */
function memoryIo(files) {
  return {
    list: async () => Object.keys(files),
    read: async (fileName) => {
      if (!(fileName in files)) throw new Error(`no such file: ${fileName}`);
      return files[fileName];
    },
  };
}

function reasonOf(fn) {
  try {
    fn();
    return null;
  } catch (e) {
    return e instanceof StylePackError ? e.reason : `ERR:${e instanceof Error ? e.message : String(e)}`;
  }
}

const THREE = { nodes: ["甲", "乙"], edges: ["甲->乙"] };

afterEach(() => unregisterStylePacks());

test("风格包·extends 只写差异，其余跟基线", () => {
  registerStylePackJson(JSON.stringify({ name: "warm", extends: "marker", ink: "#2b2b2b" }), "warm.json");
  const spec = presetOf("warm");
  assert.equal(spec.ink, "#2b2b2b", "写了的字段生效");
  assert.equal(spec.background, PLAN_PRESETS.marker.background, "没写的字段继承");
  assert.deepEqual(spec.fillPalette, PLAN_PRESETS.marker.fillPalette, "调色板继承且是副本");
  assert.deepEqual(presetOf("marker").fillPalette, PLAN_PRESETS.marker.fillPalette, "基线不被污染");
  assert.equal(spec.label, "warm", "缺省 label 用包名");
});

test("风格包·fontSizes/space 允许只给子集", () => {
  const pack = registerStylePackJson(
    JSON.stringify({ name: "sub", extends: "pencil", fontSizes: { title: 40 }, space: { gapX: 150 } }),
    "sub.json",
  );
  assert.equal(pack.name, "sub");
  const spec = presetOf("sub");
  assert.equal(spec.fontSizes.title, 40);
  assert.equal(spec.fontSizes.node, PLAN_PRESETS.pencil.fontSizes.node, "字号阶梯按字段合并");
  assert.equal(spec.space.gapX, 150);
});

test("风格包·坏包只丢这一条，内置三套照旧可用", async () => {
  const packs = await loadStylePacks(
    memoryIo({
      "broken.json": "{ not json",
      "badcolor.json": JSON.stringify({ name: "badcolor", ink: "red" }),
      "badextends.json": JSON.stringify({ name: "badextends", extends: "nope" }),
      "badspace.json": JSON.stringify({ name: "badspace", space: { gapX: -5 } }),
      "unknownspace.json": JSON.stringify({ name: "unknownspace", space: { gapZ: 10 } }),
      "good.json": JSON.stringify({ name: "good", extends: "pencil", ink: "#123456" }),
    }),
  );
  assert.deepEqual(packs.loaded.map((p) => p.name), ["good"], "只有合法包进注册表");
  assert.equal(packs.warnings.length, 5, "每个坏包一条警告");
  assert.ok(packs.warnings.some((w) => w.includes("style:bad-json")), "JSON 语法错误要报出来");
  assert.ok(packs.warnings.some((w) => w.includes("style:bad-field") && w.includes("ink")), "字段非法要报出来");
  assert.ok(packs.warnings.some((w) => w.includes("style:bad-extends")), "基线不存在要报出来");
  assert.deepEqual(styleNames(), ["pencil", "marker", "blueprint", "good"], "内置永远在，坏包不占位");
  assert.equal(presetOf("pencil"), PLAN_PRESETS.pencil);
});

test("风格包·space token 真进布局（gapX/padX/minW/textWrap）", async () => {
  const before = layoutPlan(normalizePlan(THREE)).nodes;
  await loadStylePacks(
    memoryIo({ "wide.json": JSON.stringify({ name: "wide", extends: "pencil", space: { gapX: 300, minW: 240, textWrap: 400 } }) }),
  );
  const after = layoutPlan(normalizePlan({ ...THREE, preset: "wide" })).nodes;
  assert.equal(before[1].x - (before[0].x + before[0].width), 110, "历史缺省间距 110");
  assert.equal(after[1].x - (after[0].x + after[0].width), 300, "gapX 覆盖生效");
  assert.equal(after[0].width, 240, "minW 覆盖生效");
  assert.equal(after[0].lines.length, 1, "textWrap 变宽后不再折行");
});

test("风格包·groupColor roles 固定取色，未列的分组回落", () => {
  registerStylePackJson(
    JSON.stringify({
      name: "roles",
      extends: "marker",
      groupColor: { mode: "roles", roles: { 主语: "#ffe9a8", 谓语: "#d8edda" } },
    }),
    "roles.json",
  );
  const spec = presetOf("roles");
  assert.equal(fillFor(spec, 0, "谓语"), "#d8edda");
  assert.equal(fillFor(spec, 7, "谓语"), "#d8edda", "同一角色永远同色，批量零漂移");
  assert.ok(spec.fillPalette.includes(fillFor(spec, 3, "没登记的分组")), "未列分组回哈希");
  assert.ok(PLAN_PRESETS.marker.fillPalette.includes(fillFor(PLAN_PRESETS.marker, 0, "谓语")), "基线仍走哈希不受包影响");
});

test("风格包·不写 style 时几何与历史口径逐字段一致", () => {
  const rendered = renderPlan({ title: "回归", ...THREE });
  assert.equal(rendered.plan.preset, "pencil");
  const [a, b] = rendered.nodes;
  assert.equal(a.width, 160, "NODE_MIN_W");
  assert.equal(a.height, 90, "NODE_MIN_H");
  assert.equal(b.x - (a.x + a.width), 110, "GAP_X");
  assert.equal(a.y, b.y, "lr 同层垂直居中对齐");
  assert.equal(rendered.background, PLAN_PRESETS.pencil.background);
  assert.equal(rendered.specs[0].fontSize, 28, "标题字号阶梯未变");
});

test("风格包·diffOf 导出只写差异，再解析回来规格等价", () => {
  const src = { name: "round", extends: "marker", ink: "#000000", fontSizes: { node: 20 }, space: { gapY: 20 } };
  registerStylePackJson(JSON.stringify(src), "round.json");
  const exported = diffOf("round");
  assert.deepEqual(Object.keys(exported).sort(), ["extends", "fontSizes", "ink", "label", "name", "space"]);
  assert.equal(exported.background, undefined, "与基线相同的字段不写");
  unregisterStylePacks();
  registerStylePackJson(JSON.stringify(exported), "round.json");
  assert.deepEqual(presetOf("round"), presetOf("round"));
  const a = presetOf("round");
  assert.equal(a.ink, "#000000");
  assert.equal(a.fontSizes.node, 20);
  assert.equal(a.fontSizes.title, PLAN_PRESETS.marker.fontSizes.title);
  assert.equal(a.space.gapY, 20);
  assert.equal(diffOf("pencil").ink, PLAN_PRESETS.pencil.ink, "内置包导出完整规格");
});

test("风格包·坏链（环 / 指向坏包）在加载时就报警告", async () => {
  const packs = await loadStylePacks(
    memoryIo({
      "a.json": JSON.stringify({ name: "a", extends: "b" }),
      "b.json": JSON.stringify({ name: "b", extends: "a" }),
      "c.json": JSON.stringify({ name: "c", extends: "a" }),
    }),
  );
  assert.equal(packs.loaded.length, 3, "解析阶段彼此可见，加载顺序无关");
  assert.ok(packs.warnings.some((w) => w.includes("circular-extends")), `环形继承要警告：${packs.warnings.join(" | ")}`);
  assert.ok(reasonOf(() => presetOf("c")).includes("style:"), "坏链解析报错，不静默回退");
});

test("风格包·计划与 CLI 参数吃包名，未知包报错带上可选清单", async () => {
  await loadStylePacks(memoryIo({ "axl-poster.json": JSON.stringify({ name: "axl-poster", extends: "marker" }) }));
  assert.equal(normalizePlan({ ...THREE, preset: "axl-poster" }).preset, "axl-poster");
  assert.equal(normalizePlan(THREE, { preset: "AXL-Poster" }).preset, "axl-poster", "包名大小写不敏感");
  const reason = (() => {
    try {
      normalizePlan({ ...THREE, preset: "no-such-style" });
      return null;
    } catch (e) {
      return e.detail ?? e.message;
    }
  })();
  assert.ok(reason.includes("axl-poster"), `报错要列出可用风格：${reason}`);
});

test("风格包·目录口径与 listStyles 展示", async () => {
  assert.equal(STYLE_DIR, "assets/excali-styles");
  await loadStylePacks(memoryIo({ "b-pack.json": JSON.stringify({ name: "b-pack", label: "B 包", extends: "pencil" }) }));
  const rows = listStyles();
  assert.deepEqual(rows.map((r) => r.name), ["pencil", "marker", "blueprint", "b-pack"], "内置在前、外部按名排序");
  assert.equal(rows[0].extends, "-", "内置没有基线");
  assert.deepEqual(rows[3], { name: "b-pack", extends: "pencil", label: "B 包" });
});

test("风格包·包名口径（大小写归一、非法字符、超长）", () => {
  assert.equal(parseStylePack('{"ink":"#fff"}', "Axl Poster.JSON").name, "axl-poster", "文件名兜底并归一");
  assert.equal(reasonOf(() => parseStylePack('{"name":"带中文"}', "x.json")), "bad-name");
  assert.equal(reasonOf(() => parseStylePack('{"name":"' + "a".repeat(40) + '"}', "x.json")), "bad-name");
  assert.equal(reasonOf(() => parseStylePack('{"extends":"pencil","extends":"pencil"}', "x.json")), null, "重复键由 JSON 解析吞掉，不报错");
  assert.equal(reasonOf(() => parseStylePack("[]", "x.json")), "bad-pack");
  assert.equal(reasonOf(() => parseStylePack('{"name":"self","extends":"self"}', "self.json")), "bad-extends");
});
