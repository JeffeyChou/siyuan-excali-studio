/**
 * 第四十二轮：画布坐标换算（真数值断言，不是正则）。
 *
 * 起因：竖条「插入白板卡片」插出来的卡片点不到——链接、卡片元素都合法，问题是**落点**。
 * `viewportCenter` 把 scroll 项的符号写反（`scrollX + w/2/zoom`），偏移量 = 2×scrollX，
 * 画面一平移卡片就落到视野外，用户既看不见也点不着（拖拽那条走 `clientToScene`，
 * 落点跟着指针，所以一直是好的——两条公式不同源，才让 bug 藏了一轮）。
 *
 * 所以核心不变量只有一条：**视口中心 = 把画布几何中心那个 client 点换算进场景**。
 * 谁改了其中一条公式，这条断言立刻红。
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { clientToScene, viewportCenter } from "../src/studio/scene-point.ts";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
function src(rel) {
  return readFileSync(resolve(ROOT, "src", rel), "utf8");
}

/** 假 appState：只喂换算要读的四个量 */
function view(sx, sy, z, width = 800, height = 600) {
  return { getAppState: () => ({ scrollX: sx, scrollY: sy, zoom: { value: z }, width, height }) };
}

test("clientToScene：场景 = 屏幕/zoom − scroll（vendor 口径）", () => {
  assert.deepEqual(clientToScene(view(0, 0, 1), { left: 0, top: 0 }, 100, 50), { x: 100, y: 50 });
  assert.deepEqual(clientToScene(view(-600, -200, 1), { left: 0, top: 0 }, 100, 50), { x: 700, y: 250 });
  assert.deepEqual(clientToScene(view(0, 0, 2), { left: 0, top: 0 }, 400, 200), { x: 200, y: 100 });
  // canvas 在页面里有偏移（左侧 dock + 顶栏），rect.left/top 必须减掉
  assert.deepEqual(clientToScene(view(0, 0, 1), { left: 300, top: 80 }, 400, 180), { x: 100, y: 100 });
});

test("视口中心与指针换算同一条公式（改坏一个就红）", () => {
  for (const [sx, sy, z] of [
    [0, 0, 1],
    [-600, -200, 1],
    [1234, -77, 0.5],
    [-450, -320, 2],
    [-90, -10, 1.33],
  ]) {
    for (const [w, h] of [
      [800, 600],
      [1047, 725],
      [320, 480],
    ]) {
      const v = view(sx, sy, z, w, h);
      assert.deepEqual(
        viewportCenter(v),
        clientToScene(v, { left: 0, top: 0 }, w / 2, h / 2),
        `scroll=(${sx},${sy}) zoom=${z} 视口=${w}×${h}：中心点两条公式必须给出同一个场景坐标`,
      );
    }
  }
});

test("回归：平移后的落点不许再按 +scroll 反向跑偏（第四十一轮 bug）", () => {
  // 真实一屏：往右滚过（scrollX 为负）后再插入，卡片中心应落在 600+400=1000，
  // 而不是 bug 版的 −600+400=−200（差 2×scrollX，正好跑到视野外）
  assert.deepEqual(viewportCenter(view(-600, -200, 1)), { x: 1000, y: 500 });
  const bad = { x: -600 + 800 / 2, y: -200 + 600 / 2 };
  assert.notDeepEqual(viewportCenter(view(-600, -200, 1)), bad, "旧公式（+scroll）的值不许再出现");
  // zoom≠1 时中心按 zoom 折算，不是按屏幕像素
  assert.deepEqual(viewportCenter(view(-600, -200, 2)), { x: 600 + 200, y: 200 + 150 });
});

test("脏值：缺 zoom 按 1、缺 scroll/尺寸按 0，不 NaN", () => {
  const v = { getAppState: () => ({ width: 800, height: 600 }) };
  assert.deepEqual(viewportCenter(v), { x: 400, y: 300 });
  assert.deepEqual(clientToScene(v, { left: 0, top: 0 }, 100, 100), { x: 100, y: 100 });
  const noZoom = { getAppState: () => ({ scrollX: -10, scrollY: -20, zoom: {}, width: 100, height: 100 }) };
  assert.deepEqual(viewportCenter(noZoom), { x: 60, y: 70 });
});

test("同源：落点公式只有 scene-point 一份，画布不许再抄第二套", () => {
  const APP = src("studio/StudioApp.tsx");
  const IMG = src("studio/image-import.ts");
  assert.match(APP, /from "\.\/scene-point"/, "StudioApp 从纯模块取换算");
  assert.equal(/function (clientToScene|viewportCenter)/.test(APP), false, "画布侧不许本地重写");
  assert.equal(/function (clientToScene|viewportCenter)/.test(IMG), false, "旧副本已迁出 image-import（那模块 node 读不进来）");
  assert.match(src("studio/board-card.ts"), /import type \{ Point \} from "\.\/scene-point\.ts"/, "卡片落点类型同源");
});
