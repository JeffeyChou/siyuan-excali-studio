/**
 * 2026-10-21 P2：图片转轮廓素材（keyhole 单元素真挖孔）。
 *
 * 五段断言：
 * ① marching squares：环闭合、外/孔方向相反、坐标落在格边内侧；
 * ② keyhole 桥段：去程与回程严格同线反向（evenodd 下互相抵消 ⇒ 桥宽为零）；
 * ③ 引擎硬约束：type=line / roundness=null / 背景色非transparent / 首点重复闭合；
 * ④ 端到端：分层数、孔洞数、坐标映射、配方往返，以及弹窗与脚本的接线；
 * ⑤ **真实 rough.js generator 渲染级**验证（不是自写 evenodd 近似——用引擎
 *    同一个 generator.polygon 出口 + 扫描线 evenodd 栅格化）。
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import rough from "roughjs/bundled/rough.esm.js";
import {
  OUTLINE_LAYERS,
  cleanContours,
  contourArea,
  findContours,
  fillHoles,
  inkCoverage,
  keyholeSequence,
  makeOutlineElement,
  makeOutlineRecipe,
  outlineImageToShapes,
  parseOutlineRecipe,
  polygonMask,
  simplifyContour,
  smoothContour,
  thresholdField,
  RECIPE_SOURCE_MAX,
} from "../src/studio/ink-outline.ts";
import {
  MATERIAL_MODES,
  OUTLINE_DETAILS,
  materialModeOf,
  outlineDetailOf,
  traceImageToOutline,
  traceImageToStrokes,
  libraryItemFromStrokes,
} from "../src/studio/image-to-material.ts";
import { BUILTIN_SCRIPTS } from "../src/siyuan/script-store.ts";

/** @typedef {import("../src/studio/image-to-material.ts").ImageLike} ImageLike */

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function rgba(w, h, fill = [0, 0, 0, 0]) {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) data.set(fill, i * 4);
  return { width: w, height: h, data };
}

/** 实心方块 + 中心方孔（透明），坐标单位 = 像素 */
function ringImage(size = 40, outerFrom = 6, outerTo = 34, holeFrom = 14, holeTo = 26) {
  const img = rgba(size, size);
  for (let y = outerFrom; y < outerTo; y++) {
    for (let x = outerFrom; x < outerTo; x++) {
      const inHole = x >= holeFrom && x < holeTo && y >= holeFrom && y < holeTo;
      const i = (y * size + x) * 4;
      img.data[i] = 30;
      img.data[i + 1] = 30;
      img.data[i + 2] = 30;
      img.data[i + 3] = inHole ? 0 : 255;
    }
  }
  return img;
}

/** evenodd 判定（引擎 rough.js 的 polygon 就是这个填充规则） */
function insideEvenOdd(poly, px, py) {
  let crossings = 0;
  for (let i = 0, n = poly.length; i < n; i++) {
    const [x0, y0] = poly[i];
    const [x1, y1] = poly[(i + 1) % n];
    if (y0 === y1) continue;
    if (py < Math.min(y0, y1) || py >= Math.max(y0, y1)) continue;
    const x = x0 + ((py - y0) / (y1 - y0)) * (x1 - x0);
    if (x > px) crossings++;
  }
  return crossings % 2 === 1;
}

const signedArea = (c) => {
  let s = 0;
  for (let i = 0; i < c.length; i++) {
    const [x0, y0] = c[i];
    const [x1, y1] = c[(i + 1) % c.length];
    s += x0 * y1 - x1 * y0;
  }
  return s / 2;
};

/**
 * 扫描线 evenodd 栅格化（等价 canvas fill("evenodd")）。
 * 输入是 rough.js fillPath 的 ops——这是引擎真正拿去填的那串点。
 */
function rasterizeEvenOdd(ops, w, h) {
  const grid = new Uint8Array(w * h);
  const subs = [];
  let cur = null;
  for (const o of ops) {
    if (o.op === "move") {
      cur = [[o.data[0], o.data[1]]];
      subs.push(cur);
    } else if (o.op === "lineTo") {
      cur.push([o.data[0], o.data[1]]);
    } else if (o.op === "bcurveTo") {
      // roughness=0 时不该出现曲线；真出现就按终点折线近似（保底不崩）
      for (let i = 0; i + 5 < o.data.length; i += 6) cur.push([o.data[i + 4], o.data[i + 5]]);
    }
  }
  for (let py = 0; py < h; py++) {
    const y = py + 0.5;
    const xs = [];
    for (const sub of subs) {
      for (let i = 0; i < sub.length; i++) {
        const [x0, y0] = sub[i];
        const [x1, y1] = sub[(i + 1) % sub.length];
        if (y0 === y1) continue;
        if (y < Math.min(y0, y1) || y >= Math.max(y0, y1)) continue;
        xs.push(x0 + ((y - y0) / (y1 - y0)) * (x1 - x0));
      }
    }
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const from = Math.max(0, Math.ceil(xs[k] - 0.5));
      const to = Math.min(w - 1, Math.floor(xs[k + 1] - 0.5));
      for (let x = from; x <= to; x++) grid[py * w + x] ^= 1; // xor = evenodd
    }
  }
  return grid;
}

/* ------------------------------------------------------------------ */

test("ink-outline：marching squares 提取闭合环，外环与孔洞方向相反", () => {
  const w = 24;
  const h = 24;
  const bits = new Uint8Array(w * h);
  for (let y = 3; y < 21; y++) for (let x = 3; x < 21; x++) bits[y * w + x] = 1;
  for (let y = 9; y < 15; y++) for (let x = 9; x < 15; x++) bits[y * w + x] = 0;

  const cs = findContours(bits, w, h);
  assert.equal(cs.length, 2, "环形应给出外环 + 孔洞环两条");
  // 外环与孔洞环的有向面积符号必须相反（evenodd 才能正确挖空）
  assert.notEqual(Math.sign(signedArea(cs[0])), Math.sign(signedArea(cs[1])));
  // 面积大的那条是外环
  const areas = cs.map(contourArea);
  assert.ok(Math.max(...areas) > Math.min(...areas));
  // 环上不应有重复末点（findContours 已去掉）
  for (const c of cs) {
    const f = c[0];
    const l = c[c.length - 1];
    assert.notDeepEqual(f, l);
  }
  // 坐标落在格边内侧半格（marching squares 在格边中点插值）
  for (const c of cs) {
    for (const [x, y] of c) {
      assert.ok(x >= 2.5 && x <= 21.5 && y >= 2.5 && y <= 21.5, `坐标越界 ${x},${y}`);
    }
  }
});

test("ink-outline：实心块只有一个环，方向稳定", () => {
  const w = 20;
  const h = 20;
  const bits = new Uint8Array(w * h);
  for (let y = 4; y < 16; y++) for (let x = 4; x < 16; x++) bits[y * w + x] = 1;
  const cs = findContours(bits, w, h);
  assert.equal(cs.length, 1);
  assert.ok(contourArea(cs[0]) > 100);
});

test("ink-outline：空场/细场不产生环", () => {
  assert.equal(findContours(new Uint8Array(100), 10, 10).length, 0);
  assert.equal(findContours(new Uint8Array(10), 1, 1).length, 0, "1×1 场没有 cell");
});

test("ink-outline：smoothContour / simplifyContour / polygonMask / fillHoles", () => {
  const square = [
    [0, 0],
    [10, 0],
    [10, 10],
    [0, 10],
  ];
  // 平滑：点数不变、质心不动（圆角会内缩，所以面积略降——这是压锯齿的代价）
  const smoothed = smoothContour(square, 1);
  assert.equal(smoothed.length, square.length);
  const cx = (pts) => pts.reduce((s, p) => s + p[0], 0) / pts.length;
  assert.ok(Math.abs(cx(smoothed) - cx(square)) < 1e-9, "质心不动");
  assert.ok(contourArea(smoothed) < contourArea(square), "圆角被抹平 → 面积略缩");
  // 注：4 点方块是病态用例（核宽 σ×4 已覆盖整条边），不拿它断言「缩得不多」；
  // 真实密度轮廓的收缩幅度另见下一条断言。

  // 简化：共线中间点被丢掉
  const withMid = [
    [0, 0],
    [5, 0],
    [10, 0],
    [10, 10],
    [0, 10],
  ];
  assert.equal(simplifyContour(withMid, 0.5).length, 4);

  // 多边形栅格化（方块覆盖 0..10，格心判定）
  const mask = polygonMask(square, 14, 14);
  assert.equal(mask[5 * 14 + 5], 1, "内部命中");
  assert.equal(mask[1 * 14 + 1], 1, "左下角内侧（1,1）仍在方块内");
  assert.equal(mask[12 * 14 + 12], 0, "外部不命中");

  // 填孔：环中间的洞被填上
  const w = 12;
  const bits = new Uint8Array(w * w);
  for (let y = 2; y < 10; y++) for (let x = 2; x < 10; x++) bits[y * w + x] = 1;
  for (let y = 4; y < 8; y++) for (let x = 4; x < 8; x++) bits[y * w + x] = 0;
  const filled = fillHoles(bits, w, w);
  assert.equal(filled[6 * w + 6], 1, "洞被填上");
  assert.equal(bits[6 * w + 6], 0, "原场洞位仍是 0（未改动输入）");
});

test("ink-outline：真实密度轮廓上，高斯平滑几乎不缩面积（核宽口径回归）", () => {
  // 40px 实心方块 → marching squares 给 100+ 点的密集轮廓（真实场景密度）
  const w = 40;
  const h = 40;
  const bits = new Uint8Array(w * h);
  for (let y = 4; y < 36; y++) for (let x = 4; x < 36; x++) bits[y * w + x] = 1;
  const raw = findContours(bits, w, h)[0];
  assert.ok(raw.length > 50, `轮廓点数应足够密，实际 ${raw.length}`);

  const rawArea = contourArea(raw);
  // σ=0.55（OUTLINE_LAYERS[0].smooth）实测面积保留 99.9%
  const smoothed = smoothContour(raw, 0.55);
  assert.equal(smoothed.length, raw.length, "点数不变");
  const keep = contourArea(smoothed) / rawArea;
  assert.ok(keep > 0.95, `平滑后面积保留应 >95%，实际 ${(keep * 100).toFixed(1)}%`);

  // 再走一遍简化（tol=0.75）——真实轮廓简化后仍保留 95% 以上，且点数大减
  const simplified = simplifyContour(smoothed, 0.75);
  assert.ok(simplified.length < raw.length / 4, `简化应显著减点，实际 ${raw.length} → ${simplified.length}`);
  const keep2 = contourArea(simplified) / rawArea;
  assert.ok(keep2 > 0.9, `简化后面积保留应 >90%，实际 ${(keep2 * 100).toFixed(1)}%`);
});

test("ink-outline：keyhole 桥段去程与回程严格同线反向（evenodd 下桥宽为零）", () => {
  const outer = [
    [0, 0],
    [10, 0],
    [10, 10],
    [0, 10],
  ];
  const hole = [
    [3, 3],
    [6, 3],
    [6, 6],
    [3, 6],
  ];
  const seq = keyholeSequence(outer, [hole]);
  const A = outer[outer.length - 1];
  const B = hole[0];

  // 必须同时存在 A→B 与 B→A：这是 evenodd 抵消的前提
  let ab = 0;
  let ba = 0;
  for (let i = 1; i < seq.length; i++) {
    const p = seq[i - 1];
    const q = seq[i];
    if (p[0] === A[0] && p[1] === A[1] && q[0] === B[0] && q[1] === B[1]) ab++;
    if (p[0] === B[0] && p[1] === B[1] && q[0] === A[0] && q[1] === A[1]) ba++;
  }
  assert.ok(ab >= 1, "缺少去程 A→B");
  assert.ok(ba >= 1, "缺少回程 B→A（不重合就会围出楔形假墨）");

  // 无孔洞时原样返回外轮廓（不做多余拼接）
  assert.equal(keyholeSequence(outer, []).length, outer.length);
});

test("ink-outline：makeOutlineElement 满足引擎全部硬约束", () => {
  const outer = [
    [1.234, 2.345],
    [11.2, 2.1],
    [11.4, 12.9],
    [1.1, 12.2],
  ];
  const hole = [
    [4.4, 4.4],
    [7.1, 4.2],
    [7.3, 7.6],
    [4.2, 7.4],
  ];
  const el = makeOutlineElement(keyholeSequence(outer, [hole]), {
    id: "x-0",
    index: "a0",
    seed: 42,
    now: 1000,
    strokeColor: "#1e1e1e",
    opacity: 45,
    groupIds: ["g1"],
    frameId: null,
    link: null,
  });

  // ① isPathALoop：首尾点距必须 ≤ 8px，否则引擎完全不填充
  const pts = el.points;
  const first = pts[0];
  const last = pts[pts.length - 1];
  assert.deepEqual(first, last, "首点必须重复一次闭合");
  assert.equal(Math.hypot(first[0] - last[0], first[1] - last[1]), 0);

  // ② generateLinearElementShape：roundness 非空会走 curve，填不出多边形
  assert.equal(el.roundness, null);
  // ③ generateRoughOptions：backgroundColor 为 transparent 时 fill 为 undefined
  assert.notEqual(el.backgroundColor, "transparent");
  assert.equal(el.backgroundColor, "#1e1e1e");
  // ④ 只要填充不要描边：改色时用户改 backgroundColor
  assert.equal(el.strokeColor, "transparent");
  assert.equal(el.type, "line");
  assert.equal(el.opacity, 45);
  // rough.js 0 糙度 ⇒ 纯几何填充，不会抖出毛边
  assert.equal(el.roughness, 0);
  assert.deepEqual(el.groupIds, ["g1"]);
  // points 是相对 (x,y) 的，且为画布坐标
  assert.ok(el.x > 0 && el.y > 0);
  assert.ok(el.width > 0 && el.height > 0);
});

test("ink-outline：outlineImageToShapes 端到端——分层、挖孔、坐标映射", () => {
  const img = ringImage(40);
  const build = outlineImageToShapes(img, { id: "img-1", x: 0, y: 0, width: 400, height: 400 }, {
    now: 1000,
    groupId: "g-test",
    idPrefix: "p-test",
    seedBase: 7,
  });

  assert.equal(build.elements.length, OUTLINE_LAYERS.length, "每层一个填充元素");
  assert.equal(build.stats.layers, OUTLINE_LAYERS.length);
  assert.equal(build.stats.holes, OUTLINE_LAYERS.length, "每层都挖到中心那个孔");
  assert.equal(build.stats.strokeColor, "#1e1e1e");

  // 坐标映射：40px → 400 单位（×10）
  const first = build.elements[0];
  const pts = first.points.map(([px, py]) => [px + first.x, py + first.y]);
  assert.ok(!insideEvenOdd(pts, 5, 5), "外轮廓外不填充");
  assert.ok(insideEvenOdd(pts, 80, 80), "外轮廓内、孔洞外 → 填充");
  assert.ok(!insideEvenOdd(pts, 200, 200), "孔洞中心 → 被挖空");
  assert.ok(!insideEvenOdd(pts, 390, 390), "远角不填充");

  // 分层不透明度递增（越浓越靠后）
  const opacities = build.elements.map((e) => e.opacity);
  for (let i = 1; i < opacities.length; i++) {
    assert.ok(opacities[i] > opacities[i - 1], `第 ${i} 层应比第 ${i - 1} 层浓`);
  }
  // 同一个分组，入库/拖出后整幅一起选
  for (const el of build.elements) assert.deepEqual(el.groupIds, ["g-test"]);
  // index 单调递增，留在原图层附近
  const indices = build.elements.map((e) => e.index);
  assert.equal(new Set(indices).size, indices.length);
});

test("ink-outline：真实 rough.js generator 渲染级——keyhole 孔洞真挖空、桥段无假墨", () => {
  // 这条不走自写 evenodd 近似，而是走**引擎同一个出口**：
  // Excalidraw 的 generateLinearElementShape → generator.polygon(points, options)
  // → fillPath ops → canvas fill("evenodd")。我们复用同一个 generator 再栅格化。
  const gen = rough.generator();
  const outer = [[0, 0], [100, 0], [100, 100], [0, 100]];
  const hole = [[30, 30], [70, 30], [70, 70], [30, 70]];
  const seq = keyholeSequence(outer, [hole]);
  const el = makeOutlineElement(seq, {
    id: "x",
    index: "a0",
    seed: 1,
    now: 1,
    strokeColor: "#1e1e1e",
    opacity: 100,
    groupIds: [],
    frameId: null,
    link: null,
  });

  // 还原绝对坐标（引擎口径：points 相对 x/y）
  const abs = el.points.map(([px, py]) => [px + el.x, py + el.y]);
  const shape = gen.polygon(abs, {
    fill: el.backgroundColor,
    fillStyle: el.fillStyle,
    stroke: el.strokeColor,
    roughness: el.roughness,
    strokeWidth: el.strokeWidth,
  });
  assert.equal(shape.shape, "polygon");
  const fillPath = shape.sets.find((s) => s.type === "fillPath");
  assert.ok(fillPath, "要有 fillPath（solid 填充）");
  assert.ok(!fillPath.ops.some((o) => o.op === "bcurveTo"), "roughness=0 ⇒ 纯直线，无抖动曲线");

  const W = 110;
  const grid = rasterizeEvenOdd(fillPath.ops, W, W);
  const at = (x, y) => grid[y * W + x];
  assert.equal(at(5, 5), 1, "方块内部填充");
  assert.equal(at(95, 50), 1, "方块右侧填充");
  assert.equal(at(15, 50), 1, "外轮廓内·孔洞外 → 填充");
  assert.equal(at(25, 50), 1, "孔洞外靠边 → 填充");
  assert.equal(at(35, 50), 0, "孔洞内 → 被挖空");
  assert.equal(at(50, 50), 0, "孔洞中心 → 被挖空");
  assert.equal(at(105, 105), 0, "方块外不填充");
  // 桥段落点：若去/回程没精确重合，会围出楔形假墨
  assert.equal(at(21, 50), 1, "桥段附近无楔形外溢");
});

test("ink-outline：换档位（层数）真的会改变产物", () => {
  const img = ringImage(40);
  const opts = { now: 1, groupId: "g", idPrefix: "p", seedBase: 1 };
  const soft = outlineImageToShapes(img, { id: "i", x: 0, y: 0, width: 400, height: 400 }, {
    ...opts,
    layers: OUTLINE_LAYERS.slice(0, 2),
  });
  const full = outlineImageToShapes(img, { id: "i", x: 0, y: 0, width: 400, height: 400 }, opts);
  assert.equal(soft.elements.length, 2);
  assert.equal(full.elements.length, OUTLINE_LAYERS.length);
});

test("ink-outline：墨色可传，元素 backgroundColor 随之改变", () => {
  const img = ringImage(40);
  const build = outlineImageToShapes(img, { id: "i", x: 0, y: 0, width: 400, height: 400 }, {
    now: 1,
    groupId: "g",
    idPrefix: "p",
    seedBase: 1,
    strokeColor: "#c0392b",
  });
  assert.equal(build.stats.strokeColor, "#c0392b");
  assert.equal(build.elements[0].backgroundColor, "#c0392b");
});

test("ink-outline：inkCoverage 透明底按 alpha、不透明底按键色距离", () => {
  const transparent = rgba(8, 8);
  transparent.data[0 * 4 + 3] = 255; // 像素 (0,0) 不透明
  transparent.data[1 * 4 + 3] = 128; // 像素 (1,0) 半透明
  const covA = inkCoverage(transparent);
  assert.equal(covA[0], 1);
  assert.ok(Math.abs(covA[1] - 128 / 255) < 1e-6);

  // 白底 + 黑色实心方块：边缘不透明 → 走键色距离
  const opaque = rgba(16, 16, [255, 255, 255, 255]);
  for (let y = 6; y < 10; y++) for (let x = 6; x < 10; x++) {
    const i = (y * 16 + x) * 4;
    opaque.data[i] = 10;
    opaque.data[i + 1] = 10;
    opaque.data[i + 2] = 10;
  }
  const covB = inkCoverage(opaque);
  assert.ok(covB[8 * 16 + 8] > 0.5, "深色处墨量高");
  assert.ok(covB[0] < 0.2, "白底处墨量低");
});

test("ink-outline：thresholdField 阈值切层", () => {
  const cov = Float32Array.from([0, 0.1, 0.5, 0.9]);
  assert.deepEqual(Array.from(thresholdField(cov, 4, 1, 0.12)), [0, 0, 1, 1]);
  assert.deepEqual(Array.from(thresholdField(cov, 4, 1, 0.8)), [0, 0, 0, 1]);
});

test("ink-outline：配方 make/parse 往返，脏数据被夹紧", () => {
  const layers = OUTLINE_LAYERS.map((l) => ({ ...l }));
  const recipe = makeOutlineRecipe({ layers, sourceWidth: 40, sourceHeight: 30, now: 12345 });
  assert.equal(recipe.kind, "excali-outline");
  assert.equal(recipe.v, 1);
  assert.equal(recipe.createdAt, 12345);
  assert.equal(recipe.source.width, 40);
  assert.equal(recipe.source.dataURL, undefined, "没给 dataURL 就不嵌");

  const back = parseOutlineRecipe(JSON.parse(JSON.stringify(recipe)));
  assert.deepEqual(back.layers, layers);
  assert.equal(back.source.height, 30);

  // 超大 dataURL 不嵌（免得素材库文件膨胀）
  const big = makeOutlineRecipe({ layers, sourceWidth: 1, sourceHeight: 1, dataURL: "data:image/png;base64," + "x".repeat(RECIPE_SOURCE_MAX) });
  assert.equal(big.source.dataURL, undefined);

  // 脏数据
  assert.equal(parseOutlineRecipe(null), null);
  assert.equal(parseOutlineRecipe({ kind: "other" }), null);
  const dirty = parseOutlineRecipe({
    kind: "excali-outline",
    v: 1,
    layers: [{ threshold: 5, opacity: -3, smooth: -1, tolerance: -1, minArea: -1 }, "bad"],
    strokeColor: "not-a-color",
    maxContours: 999,
    source: { width: -4, height: 0, dataURL: "javascript:alert(1)" },
  });
  assert.equal(dirty.layers.length, 1, "字符串层被丢弃，另一个夹紧后保留");
  assert.equal(dirty.layers[0].threshold, 1, "阈值夹到 1");
  assert.equal(dirty.layers[0].opacity, 1, "不透明度夹到 1");
  assert.equal(dirty.strokeColor, "#1e1e1e", "非法颜色回落默认");
  assert.equal(dirty.maxContours, 8, "上限夹到 8");
  assert.equal(dirty.source.width, 0);
  assert.equal(dirty.source.dataURL, undefined, "非 data:image 的 dataURL 被拒");
});

test("ink-outline：recipe 会挂到每个元素上（脚本侧读得到）", () => {
  const img = ringImage(40);
  const recipe = makeOutlineRecipe({ layers: OUTLINE_LAYERS, sourceWidth: 40, sourceHeight: 40, now: 5 });
  const build = outlineImageToShapes(img, { id: "i", x: 0, y: 0, width: 400, height: 400 }, {
    now: 5,
    groupId: "g",
    idPrefix: "p",
    seedBase: 1,
    recipe,
  });
  for (const el of build.elements) {
    assert.ok(el.excaliRecipe, "每个元素都要带配方");
    assert.equal(el.excaliRecipe.kind, "excali-outline");
  }
});

/* ------------------------------ 分发层 ------------------------------ */

test("image-to-material：两条路线并列，细节档位各三档", () => {
  assert.deepEqual(
    MATERIAL_MODES.map((m) => m.id),
    ["stroke", "outline"],
  );
  assert.equal(MATERIAL_MODES[0].label, "笔画（轻量）");
  assert.equal(MATERIAL_MODES[1].label, "轮廓（高保真）");
  assert.equal(materialModeOf("outline").id, "outline");
  assert.equal(materialModeOf("nope").id, "stroke", "未知档回落第一项");

  assert.deepEqual(
    OUTLINE_DETAILS.map((d) => d.id),
    ["soft", "standard", "sharp"],
  );
  assert.equal(outlineDetailOf("standard").layers.length, OUTLINE_LAYERS.length);
  assert.equal(outlineDetailOf("soft").layers.length, 3);
  assert.ok(outlineDetailOf("sharp").layers.length > OUTLINE_LAYERS.length, "锐利档层数更多");
  assert.equal(outlineDetailOf("nope").id, "standard");
  // 层参数必须递增（阈值与浓度同步单调才叠得出浓淡）
  for (const d of OUTLINE_DETAILS) {
    for (let i = 1; i < d.layers.length; i++) {
      assert.ok(d.layers[i].threshold >= d.layers[i - 1].threshold);
    }
  }
});

test("image-to-material：traceImageToOutline 与 traceImageToStrokes 产出形状一致", () => {
  const img = ringImage(40);
  const image = { id: "img-1", type: "image", x: 10, y: 20, width: 400, height: 400 };
  const outline = traceImageToOutline(img, image, "standard", { now: 1, groupId: "g", idPrefix: "p", seedBase: 1 });
  assert.ok(outline.elements.length > 0);
  assert.ok(outline.outline);
  assert.equal(outline.outline.holes, outline.elements.length);
  assert.equal(outline.recipe.kind, "excali-outline");
  // 笔画路线仍是原样（回归）
  const stroke = traceImageToStrokes(img, image, "standard", { now: 1, groupId: "g", idPrefix: "p", seedBase: 1 });
  assert.ok(stroke.elements.length > 0);
  assert.equal(stroke.outline, undefined, "笔画路线不带轮廓统计");
});

test("image-to-material：libraryItemFromStrokes 两条路线共用，配方随条目存活", () => {
  const recipe = makeOutlineRecipe({ layers: OUTLINE_LAYERS, sourceWidth: 4, sourceHeight: 4, now: 9 });
  const item = libraryItemFromStrokes(
    [
      { id: "a", type: "line", points: [[0, 0], [1, 1]], groupIds: ["old"] },
      { id: "b", type: "line", points: [[0, 0], [1, 1]], groupIds: ["old"] },
    ],
    { name: "配方素材", now: 9, recipe },
  );
  assert.equal(item.status, "unpublished");
  assert.equal(item.name, "配方素材");
  assert.deepEqual(item.excaliRecipe, recipe);
  // id/index/seed 重发，归属断开
  for (const el of item.elements) {
    assert.notEqual(el.id, "a");
    assert.deepEqual(el.frameId, null);
    assert.deepEqual(el.link, null);
  }
  // 不带配方时字段不出现（别给普通笔画素材塞垃圾字段）
  const plain = libraryItemFromStrokes([{ id: "a" }], { now: 9 });
  assert.equal(plain.excaliRecipe, undefined);
  assert.throws(() => libraryItemFromStrokes([], {}), /empty-strokes/);
});

/* ------------------------------ 接线 ------------------------------ */

test("接线：弹窗有两条路线切换，脚本已内置 addLibraryItem 与配方脚本", () => {
  const dlg = readFileSync(resolve(ROOT, "src/studio/ImageToMaterialDialog.tsx"), "utf8");
  assert.match(dlg, /MATERIAL_MODES\.map/, "弹窗要渲染路线切换");
  assert.match(dlg, /OUTLINE_DETAILS\.map/, "弹窗要渲染轮廓档位");
  assert.match(dlg, /traceImageToOutline/);
  // 默认落在高保真档（用户诉求是还原度优先）
  assert.match(dlg, /useState<MaterialMode>\("outline"\)/);

  const handle = readFileSync(resolve(ROOT, "src/studio/ea-handle.ts"), "utf8");
  assert.match(handle, /addLibraryItem:[\s\S]*updateLibrary/, "句柄要用 updateLibrary 写库");
  const api = readFileSync(resolve(ROOT, "src/studio/ea-api.ts"), "utf8");
  assert.match(api, /addLibraryItem: \(item: Record<string, unknown>\) => Promise<string>/);

  const names = BUILTIN_SCRIPTS.map((s) => s.file);
  assert.ok(names.includes("material-recipe.md"), "配方脚本要内置");
  const recipeScript = BUILTIN_SCRIPTS.find((s) => s.file === "material-recipe.md").content;
  assert.match(recipeScript, /excaliRecipe/, "脚本要读元素上的配方");
  assert.match(recipeScript, /ea\.addLibraryItem/, "脚本要能写库");
  assert.match(recipeScript, /```js/, "脚本要有可执行围栏");
});

test("接线：语言包 zh/en 同序且键集合一致", () => {
  const zh = JSON.parse(readFileSync(resolve(ROOT, "i18n/zh_CN.json"), "utf8"));
  const en = JSON.parse(readFileSync(resolve(ROOT, "i18n/en_US.json"), "utf8"));
  assert.deepEqual(Object.keys(zh), Object.keys(en));
  const added = [
    "图片转可编辑素材",
    "方式",
    "精细",
    "笔画（轻量）",
    "轮廓（高保真）",
    "柔和",
    "锐利",
  ];
  for (const k of added) {
    assert.ok(k in zh, `zh 缺 ${k}`);
    assert.ok(k in en, `en 缺 ${k}`);
  }
});