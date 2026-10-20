/**
 * 第二十六轮 T1/T4/T6：图片外置 + 双主题槽位 + 文档链接的纯逻辑真断言。
 * media-ref（dataURL ↔ 字节/内容寻址文件名）、theme 槽位读写、board-lib.docIdFromLink。
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  MEDIA_DIR,
  bytesToDataURL,
  mediaExtOf,
  mediaFileName,
  parseDataUrl,
} from "../src/studio/media-ref.ts";
import { persistableAppState } from "../src/studio/scene-codec.ts";
import { readThemeBgSlots, themeBgForMode, withThemeBgSlot } from "../src/studio/theme.ts";
import { docIdFromLink } from "../src/studio/board-lib.ts";

test("parseDataUrl：标准 png dataURL 解出 mime + 字节；非 base64/非 data 形态返回 null", () => {
  const bytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const url = bytesToDataURL(bytes, "image/png");
  const parsed = parseDataUrl(url);
  assert.ok(parsed, "标准形态要能解");
  assert.equal(parsed.mime, "image/png");
  assert.deepEqual(Array.from(parsed.bytes), Array.from(bytes), "字节要一字不差");
  assert.equal(parseDataUrl("https://example.com/x.png"), null, "http 链接不是 dataURL");
  assert.equal(parseDataUrl("data:image/png,x"), null, "非 base64 形态不支持（外置链路只会产 base64）");
  assert.equal(parseDataUrl(""), null);
});

test("mediaFileName：内容寻址（同内容同名、异内容异名），扩展名跟 mime", async () => {
  const a = new Uint8Array([1, 2, 3, 4]);
  const b = new Uint8Array([5, 6, 7, 8]);
  const n1 = await mediaFileName(a, "image/png");
  const n2 = await mediaFileName(a, "image/png");
  const n3 = await mediaFileName(b, "image/png");
  assert.equal(n1, n2, "同字节同 mime 必须同名（去重的根基）");
  assert.notEqual(n1, n3, "不同字节不能撞名");
  assert.match(n1, /^[0-9a-f]{16}\.png$/, "sha1 前 16 hex + 扩展名");
  assert.match(await mediaFileName(a, "image/jpeg"), /\.jpg$/, "jpeg → jpg");
  assert.match(await mediaFileName(a, "image/webp"), /\.webp$/);
  assert.match(await mediaFileName(a, "application/octet-stream"), /\.bin$/, "陌生 mime 兜 bin");
});

test("mediaExtOf 与 MEDIA_DIR 约定", () => {
  assert.equal(MEDIA_DIR, "assets/excali-media");
  assert.equal(mediaExtOf("image/svg+xml"), "svg");
  assert.equal(mediaExtOf("image/gif"), "gif");
});

test("persistableAppState：只留白名单键，空串主题槽位剥掉", () => {
  const out = persistableAppState({
    viewBackgroundColor: "#ffffff",
    gridSize: 28,
    gridStep: 5,
    gridModeEnabled: true,
    excaliLightBg: "",
    excaliDarkBg: "#121212",
    scrollX: 123, // 运行时杂项不许进载荷
    selectedElementIds: { x: true },
  });
  assert.deepEqual(out, { viewBackgroundColor: "#ffffff", gridSize: 28, gridStep: 5, gridModeEnabled: true, excaliDarkBg: "#121212" });
});

test("T4 槽位：读、按主题挑、落盘补当前主题", () => {
  // 读：没存过 = 空串
  assert.deepEqual(readThemeBgSlots(undefined), { light: "", dark: "" });
  assert.deepEqual(readThemeBgSlots({ viewBackgroundColor: "#fff" }), { light: "", dark: "" });
  const slots = readThemeBgSlots({ excaliLightBg: "#ffffff", excaliDarkBg: "#121212" });
  assert.equal(themeBgForMode(slots, "dark", "#ffffff"), "#121212", "暗色用暗槽位");
  assert.equal(themeBgForMode(slots, "light", "#000000"), "#ffffff", "亮色用亮槽位");
  // 槽位没存过 → 回落 viewBackgroundColor
  assert.equal(themeBgForMode({ light: "", dark: "" }, "dark", "#abcdef"), "#abcdef");
  // 落盘补槽：只写当前主题，另一主题的槽位原样保留
  const patched = withThemeBgSlot({ viewBackgroundColor: "#ff0000", excaliDarkBg: "#121212" }, "light");
  assert.equal(patched.excaliLightBg, "#ff0000");
  assert.equal(patched.excaliDarkBg, "#121212", "另一主题槽位不被亮色值覆盖");
  const patchedDark = withThemeBgSlot({ viewBackgroundColor: "" }, "dark");
  assert.equal(patchedDark.excaliDarkBg, "", "空背景（跟主题默认）也照存，persistableAppState 会剥空串");
});

test("docIdFromLink：只认 siyuan:doc/<id>，其余（http、裸 id、空）全拒", () => {
  assert.equal(docIdFromLink("siyuan:doc/20260101120000-abcdefg"), "20260101120000-abcdefg");
  assert.equal(docIdFromLink("siyuan://doc/20260101120000-abcdefg"), "20260101120000-abcdefg", "容忍双斜杠写法");
  assert.equal(docIdFromLink("siyuan:doc/20260101120000-abcdefg "), "20260101120000-abcdefg", "容忍尾空白");
  assert.equal(docIdFromLink("https://ldanm.com"), null, "外链放行给 vendor");
  assert.equal(docIdFromLink("20260101120000-abcdefg"), null, "裸 id 不是链接");
  assert.equal(docIdFromLink("siyuan:doc/short"), null, "太短不像思源 id");
  assert.equal(docIdFromLink(null), null);
  assert.equal(docIdFromLink(123), null);
});
