/**
 * 2026-10-21 P1：图片转素材（位图 → 原生 freedraw）。
 *
 * 四段断言：
 * ① 描迹纯逻辑：透明/白底抠图、笔画切分、采样与颜色口径；
 * ② 选区与裁切换算：只认单张图片，crop 用原图像素；
 * ③ 落点：场景替换保序、素材库条目断归属并重发 id；
 * ④ 接线：动作登记、画布入口、宿主分支、样式与文案。
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { buildInkMask, extractStrands, traceImageToFreedraws } from "../src/studio/ink-trace.ts";
import { extractSkeletonStrands, pickTraceMethod } from "../src/studio/ink-skeleton.ts";
import {
  TRACE_DETAILS,
  canvasReplacement,
  imageTargetMessageKey,
  libraryItemFromStrokes,
  pickImageTarget,
  sourceRectOf,
  traceDetailOf,
  traceImageToStrokes,
} from "../src/studio/image-to-material.ts";
import { DEFAULT_PINNED_ACTIONS, RAIL_ACTIONS, railActionOf } from "../src/studio/rail-actions.ts";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function rgba(w, h, fill = [0, 0, 0, 0]) {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) data.set(fill, i * 4);
  return { width: w, height: h, data };
}

function paint(img, x0, x1, y0, y1, color = [0, 0, 0, 255]) {
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) img.data.set(color, (y * img.width + x) * 4);
  }
  return img;
}

function barImage(w = 64, h = 32) {
  return paint(rgba(w, h), 10, 50, 14, 18);
}

const IMAGE = {
  id: "img-1",
  type: "image",
  x: 100,
  y: 50,
  width: 64,
  height: 32,
  angle: 0,
  index: "a1",
  frameId: "frame-1",
  link: "siyuan:doc/abc",
  groupIds: [],
  fileId: "file-1",
  scale: [1, 1],
  crop: null,
};

/* ------------------------------ ① 描迹 ------------------------------ */

test("透明底：掩膜只收墨迹，横向墨带接成一根、厚度不变", () => {
  const img = barImage();
  const mask = buildInkMask(img);
  const ink = mask.bits.reduce((n, v) => n + v, 0);
  assert.equal(ink, 41 * 5, "掩膜像素数 = 墨带面积");
  const strands = extractStrands(mask);
  assert.equal(strands.length, 1, "一条连续墨带就是一根笔画");
  assert.equal(strands[0].length, 41, "每列一个采样点");
  assert.ok(strands[0].every((p) => p.thickness === 5), "厚度 = run 高度");
});

test("不透明白底：按边缘主色抠图，白底不算墨", () => {
  const img = paint(rgba(64, 32, [255, 255, 255, 255]), 10, 50, 14, 18);
  const mask = buildInkMask(img);
  assert.equal(mask.bits.reduce((n, v) => n + v, 0), 41 * 5);
  assert.equal(extractStrands(mask).length, 1);
});

test("freedraw 元素：几何/压力/分组/指数都按 vendor 口径", () => {
  const els = traceImageToFreedraws(barImage(), IMAGE, {
    groupId: "g-test",
    idPrefix: "fr-test",
    seedBase: 12345,
    now: 1700000000000,
  });
  assert.equal(els.length, 1);
  const el = els[0];
  assert.equal(el.type, "freedraw");
  assert.equal(el.id, "fr-test-0");
  assert.equal(el.index, "a100", "拼在原图 index 之后，图层位置不跳");
  assert.equal(el.frameId, "frame-1");
  assert.equal(el.link, "siyuan:doc/abc");
  assert.deepEqual(el.groupIds, ["g-test"]);
  assert.equal(el.strokeColor, "#000000");
  // perfect-freehand：直径 = 2×size×sin(π/2×(0.5+0.3p))；压力 1 时系数 0.951
  const peak = Math.sin((Math.PI / 2) * (0.5 + 0.6 / 2));
  assert.ok(Math.abs(el.strokeWidth - 5 / (2 * peak) / 4.25) < 1e-9, "size = 峰值厚度 /（2×easing 峰）");
  assert.ok(el.pressures.every((p) => Math.abs(p - 1) < 1e-9), "等厚 → 压力拉满（峰值）");
  assert.ok(Math.abs(el.x + el.points[0][0] - 110) < 1e-9, "首点落回图片内的像素坐标");
  assert.ok(Math.abs(el.y + el.points[0][1] - (50 + 16)) < 1e-9);
});

test("外层分组：替换到画布时保留，描迹组挂最内层", () => {
  const els = traceImageToFreedraws(barImage(), IMAGE, {
    groupId: "g-inner",
    outerGroupIds: ["g-outer"],
    idPrefix: "fr-x",
    seedBase: 1,
    now: 1,
  });
  assert.deepEqual(els[0].groupIds, ["g-outer", "g-inner"]);
});

test("浅色墨迹保留原色，不擅自回落墨黑", () => {
  const img = paint(rgba(64, 32), 10, 50, 14, 18, [187, 187, 187, 255]);
  const els = traceImageToFreedraws(img, IMAGE, { groupId: "g", idPrefix: "f", seedBase: 1, now: 1 });
  assert.equal(els[0].strokeColor, "#bbbbbb");
});

test("maxPoints 下限夹到 2，不会除零产生 NaN", () => {
  const els = traceImageToFreedraws(barImage(), IMAGE, {
    maxPoints: 0,
    groupId: "g",
    idPrefix: "f",
    seedBase: 1,
    now: 1,
  });
  assert.equal(els[0].points.length, 2);
  assert.ok(els[0].points.every(([x, y]) => Number.isFinite(x) && Number.isFinite(y)));
});

test("多根笔画按墨量降序：大笔画先出，积分不会被小碎带挤掉", () => {
  const img = paint(paint(rgba(80, 40), 5, 15, 5, 9), 30, 60, 20, 23);
  const strands = extractStrands(buildInkMask(img));
  assert.equal(strands.length, 2);
  assert.equal(strands[0].length, 31, "31×4 的墨带在前");
  assert.equal(strands[1].length, 11);
});

test("空白图 → 零笔画，不抛错", () => {
  assert.deepEqual(traceImageToFreedraws(rgba(32, 32), IMAGE), []);
});

test("自动选路：横长笔触走列扫，方图/转弯/粗头走骨架", () => {
  assert.equal(pickTraceMethod(buildInkMask(barImage())), "column", "横条适合作列");
  const vertical = paint(rgba(64, 64), 30, 34, 10, 54);
  assert.equal(pickTraceMethod(buildInkMask(vertical)), "skeleton", "竖条列扫会断");
  const arrowish = paint(paint(rgba(80, 40), 5, 60, 15, 20), 52, 72, 2, 34);
  assert.equal(
    pickTraceMethod(buildInkMask(arrowish)),
    "skeleton",
    "横条带一个异常粗的头：最大列厚远超中位，列扫会把头切成楔形",
  );
});

test("骨架描迹：竖条是一根连续笔画，中心线贴中轴、粗细不塌", () => {
  const img = paint(rgba(64, 64), 30, 34, 10, 54);
  const strands = extractSkeletonStrands(buildInkMask(img), {
    maxPoints: 48,
    minStrandLength: 5,
    minStrandArea: 16,
  });
  assert.equal(strands.length, 1);
  assert.ok(strands[0].length >= 30, "从一端走到另一端，不被拆碎");
  assert.ok(strands[0].every((p) => Math.abs(p.x - 32) < 1.5), "中心线贴在中轴");
  const ys = strands[0].map((p) => p.y);
  assert.ok(Math.min(...ys) < 14 && Math.max(...ys) > 50, "覆盖整条笔画");
  const mid = strands[0][strands[0].length >> 1];
  assert.ok(Math.abs(mid.thickness - 6) < 0.6, "中段厚度≈笔宽（距离场含半像素偏差）");
  const first = strands[0][0];
  const last = strands[0][strands[0].length - 1];
  assert.ok(
    first.thickness >= 4 && last.thickness >= 4,
    "圆头端不补尖：毛笔起收笔保持笔宽，不能被续成针尖",
  );
  assert.ok(first.y >= 10 && first.y <= 16 && last.y >= 48 && last.y <= 54, "端点停在墨迹内约半个笔宽处");
});

test("骨架描迹：斜线不被 8 邻域伪分叉拆成碎段", () => {
  const img = rgba(64, 64);
  for (let x = 8; x <= 56; x++) {
    for (let y = 8; y <= 56; y++) {
      if (Math.abs(x - y) <= 2) img.data.set([0, 0, 0, 255], (y * 64 + x) * 4);
    }
  }
  const strands = extractSkeletonStrands(buildInkMask(img), {
    maxPoints: 64,
    minStrandLength: 5,
    minStrandArea: 16,
  });
  assert.equal(strands.length, 1);
  assert.ok(strands[0].length >= 30);
  assert.ok(strands[0].every((p) => Math.abs(p.x - p.y) < 1.5), "中心线沿对角线");
});

test("自动选路接到 freedraw：竖条保持一根、分组/坐标口径不变", () => {
  const img = paint(rgba(64, 64), 30, 34, 10, 54);
  const square = { ...IMAGE, width: 64, height: 64 };
  const els = traceImageToFreedraws(img, square, { groupId: "g-v", idPrefix: "f-v", seedBase: 1, now: 1 });
  assert.equal(els.length, 1);
  assert.equal(els[0].type, "freedraw");
  assert.deepEqual(els[0].groupIds, ["g-v"]);
  assert.ok(els[0].height > 40, "元素高度覆盖整条竖笔");
  assert.ok(els[0].points.length >= 30);
});

/* ------------------------------ ② 选区与裁切 ------------------------------ */

test("选区：选中项里恰好一张未删除的图片；多图/非图/空选各自有提示", () => {
  const image = { ...IMAGE };
  const rect = { ...IMAGE, id: "rect-1", type: "rectangle" };
  const image2 = { ...IMAGE, id: "img-2" };
  const deleted = { ...IMAGE, id: "img-deleted", isDeleted: true };

  assert.deepEqual(pickImageTarget([image, rect], []), { kind: "none" });
  assert.equal(pickImageTarget([image, rect], ["img-1"]).kind, "ok");
  assert.equal(pickImageTarget([image, rect], ["img-1", "rect-1"]).kind, "ok", "组选里恰好一张图片可用");
  assert.deepEqual(pickImageTarget([image, image2], ["img-1", "img-2"]), { kind: "multiple", selected: 2 });
  assert.deepEqual(pickImageTarget([rect], ["rect-1"]), { kind: "not-image", selected: 1 });
  assert.deepEqual(pickImageTarget([deleted], ["img-deleted"]), { kind: "none" }, "已删除元素不算选中");
  assert.equal(pickImageTarget([image], ["img-1", "not-in-scene"]).kind, "ok");

  assert.equal(imageTargetMessageKey({ kind: "ok", image }), null);
  assert.match(imageTargetMessageKey({ kind: "none" }), /选中一张图片/);
  assert.match(imageTargetMessageKey({ kind: "multiple", selected: 2 }), /一次只能/);
  assert.match(imageTargetMessageKey({ kind: "not-image", selected: 1 }), /不是图片/);
});

test("裁切：crop 用原图像素，脏值夹回画幅内", () => {
  assert.deepEqual(sourceRectOf(null, 100, 50), { x: 0, y: 0, width: 100, height: 50 });
  assert.deepEqual(
    sourceRectOf({ crop: { x: 10, y: 5, width: 20, height: 10, naturalWidth: 100, naturalHeight: 50 } }, 100, 50),
    { x: 10, y: 5, width: 20, height: 10 },
  );
  assert.deepEqual(
    sourceRectOf({ crop: { x: 90, y: 48, width: 30, height: 20, naturalWidth: 100, naturalHeight: 50 } }, 100, 50),
    { x: 90, y: 48, width: 10, height: 2 },
  );
});

/* ------------------------------ ③ 落点 ------------------------------ */

test("细节档位：从简到细，笔数与采样上限递增", () => {
  assert.deepEqual(TRACE_DETAILS.map((d) => d.id), ["simple", "standard", "fine"]);
  assert.ok(TRACE_DETAILS[0].params.maxStrands < TRACE_DETAILS[1].params.maxStrands);
  assert.ok(TRACE_DETAILS[1].params.maxStrands < TRACE_DETAILS[2].params.maxStrands);
  assert.equal(traceDetailOf("fine").id, "fine");
  assert.equal(traceDetailOf("missing").id, "standard", "未知档位回落标准");
});

test("描迹统计：笔数、点数、描边色一次算齐", () => {
  const build = traceImageToStrokes(barImage(), IMAGE, "standard", {
    groupId: "g",
    idPrefix: "f",
    seedBase: 1,
    now: 1,
  });
  assert.equal(build.stats.strokes, 1);
  assert.equal(build.stats.points, 41);
  assert.equal(build.stats.strokeColor, "#000000");
  assert.deepEqual(build.elements[0].groupIds, ["g"]);
});

test("场景替换：删原图、笔画插回原位，其余顺序不动", () => {
  const rect = { id: "rect", type: "rectangle" };
  const image = { id: "img", type: "image" };
  const text = { id: "text", type: "text" };
  const strokes = [{ id: "s1" }, { id: "s2" }];
  assert.deepEqual(canvasReplacement([rect, image, text], "img", strokes), [rect, ...strokes, text]);
  assert.deepEqual(canvasReplacement([rect, text], "missing", strokes), [rect, text, ...strokes], "找不到原图就追加");
});

test("素材库条目：单组、断 frame/link、重发 id/index/seed", () => {
  const build = traceImageToStrokes(barImage(), IMAGE, "standard", {
    groupId: "g-canvas",
    idPrefix: "fr-canvas",
    seedBase: 10,
    now: 10,
  });
  const item = libraryItemFromStrokes(build.elements, {
    name: "毛笔画",
    now: 1700000000000,
    itemId: "lib-test",
    groupId: "g-lib",
    idPrefix: "fr-lib",
    seedBase: 500,
  });
  assert.equal(item.id, "lib-test");
  assert.equal(item.status, "unpublished");
  assert.equal(item.name, "毛笔画");
  assert.equal(item.elements.length, 1);
  const el = item.elements[0];
  assert.equal(el.type, "freedraw");
  assert.equal(el.id, "fr-lib-0");
  assert.notEqual(el.id, build.elements[0].id, "入库 id 不能跟画布那份撞");
  assert.deepEqual(el.groupIds, ["g-lib"]);
  assert.equal(el.frameId, null);
  assert.equal(el.link, null);
  assert.equal(el.index, "a00");
  assert.equal(el.seed, 500);
  assert.equal(el.versionNonce, 500);
  assert.equal(el.updated, 1700000000000);
});

test("素材库条目：空笔画直接拒绝，避免写出被 vendor 丢弃的空条目", () => {
  assert.throws(() => libraryItemFromStrokes([]), /empty-strokes/);
});

/* ------------------------------ ④ 接线 ------------------------------ */

function src(rel) {
  return readFileSync(resolve(ROOT, "src", rel), "utf8");
}
function stripComments(code) {
  return code.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'\\])\/\/[^\n]*/g, "$1");
}

test("动作登记：图片转笔画进动作表，但不占默认钉位", () => {
  const meta = railActionOf("image-to-material");
  assert.ok(meta, "动作表里查得到");
  assert.equal(meta.title, "图片转笔画素材");
  assert.ok(RAIL_ACTIONS.some((a) => a.id === "image-to-material"));
  assert.equal(DEFAULT_PINNED_ACTIONS.includes("image-to-material"), false, "按需固定，不挤默认竖条");
});

test("画布入口：选区守卫 → 弹窗；替换/入库分别走 updateScene / updateLibrary", () => {
  const app = stripComments(src("studio/StudioApp.tsx"));
  assert.match(app, /pickImageTarget/, "打开前先判选区");
  assert.match(app, /openImageToMaterial/, "BoardActions 通道");
  assert.match(app, /IMAGE_TO_MATERIAL/, "竖条本地执行分流");
  assert.match(app, /<ImageToMaterialDialog/, "弹窗挂进画布树");
});

test("宿主入口：脚本库点动作 → 活动画布的 openImageToMaterial；无画布给提示", () => {
  const index = stripComments(src("index.ts"));
  assert.match(index, /IMAGE_TO_MATERIAL/, "宿主识别新动作");
  assert.match(index, /actions\.openImageToMaterial\(\)/, "转给活动画布");
  assert.match(index, /先打开一块白板，再转换图片/, "无活动画布不静默");
});

test("弹窗落点：替换可撤销，入库走 updateLibrary 并打开素材库", () => {
  const dialog = stripComments(src("studio/ImageToMaterialDialog.tsx"));
  assert.match(dialog, /captureUpdate: CaptureUpdateAction\.IMMEDIATELY/, "⌘Z 能退回原图");
  assert.match(dialog, /canvasReplacement\(api\.getSceneElements\(\), image\.id, build\.elements\)/, "删原图插笔画");
  assert.match(dialog, /libraryItemFromStrokes\(/, "素材库条目从当前描迹派生");
  assert.match(dialog, /openLibraryMenu: true/, "入库后让用户看见");
  assert.match(dialog, /api\.updateLibrary\(/, "走 vendor 的库通道（沿用 onLibraryChange 落盘）");
});

test("样式与文案：弹窗类名有样式，三档与两个动作词条双语齐备", () => {
  const css = src("index.css");
  for (const cls of [".exs-i2m-dialog", ".exs-i2m-previews", ".exs-i2m-preview", ".exs-i2m-stats"]) {
    assert.ok(css.includes(cls), `缺样式 ${cls}`);
  }
  const zh = JSON.parse(readFileSync(resolve(ROOT, "i18n/zh_CN.json"), "utf8"));
  const en = JSON.parse(readFileSync(resolve(ROOT, "i18n/en_US.json"), "utf8"));
  const keys = [
    "图片转可编辑笔画",
    "替换到画布",
    "加入素材库",
    "原图",
    "转换结果",
    ...TRACE_DETAILS.map((d) => d.label),
  ];
  for (const k of keys) {
    assert.ok(k in zh, `zh_CN 缺键：${k}`);
    assert.equal(zh[k], k, `中文值必须等于键：${k}`);
    assert.ok(en[k] && en[k] !== k, `en_US 该是真英文：${k}`);
  }
});
