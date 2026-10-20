/**
 * 阶段 B：图片尺寸压缩纯函数（image-fit.ts）。
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { fitDimensions, MAX_EDGE } from "../src/studio/image-fit.ts";

test("fitDimensions：长边不超限时原样返回", () => {
  assert.deepEqual(fitDimensions(800, 600), { width: 800, height: 600 });
  assert.deepEqual(fitDimensions(2048, 2048), { width: 2048, height: 2048 });
});

test("fitDimensions：超限按长边等比压缩", () => {
  assert.deepEqual(fitDimensions(4000, 3000), { width: 2048, height: 1536 });
  assert.deepEqual(fitDimensions(3000, 4000), { width: 1536, height: 2048 });
});

test("fitDimensions：极小尺寸有下限，custom max 生效", () => {
  assert.deepEqual(fitDimensions(0, 0), { width: 1, height: 1 });
  assert.deepEqual(fitDimensions(1000, 500, 500), { width: 500, height: 250 });
});

test("MAX_EDGE：默认 2048", () => {
  assert.equal(MAX_EDGE, 2048);
});
