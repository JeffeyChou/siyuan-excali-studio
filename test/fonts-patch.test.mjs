// 第三十四轮：字体注册表补丁（scripts/excalidraw-fonts-patch.mjs）单测 + 构建产物契约。
//
// vendor 0.18.1 的 fontFamily 是数字枚举，六款内置字体必须在构建期注入
// FONT_FAMILY 枚举 + Fonts.init() 注册序列——这里锁住补丁的行为契约。
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { BUNDLED_FONTS, enumAdditions, registerCalls, buildFontPatch, checkVendorCode } from "../scripts/excalidraw-fonts-patch.mjs";

// 从真 vendor chunk 抠出的 Fonts.init 注册序列局部（锚点上下文）
const VENDOR_SNIPPET = [
  'Ie={Virgil:1,Helvetica:2,Cascadia:3,Excalifont:5,Nunito:6,"Lilita One":7,"Comic Shanns":8,"Liberation Sans":9},',
  'Un={[Mn]:100,[Tn]:1e3},',
  'static init(){let t={registered:new Map},n=(r,...o)=>{let i=Ie[r]??Un[r],a=Fr[i]??Fr[Ie.Excalifont];ne.register.call(t,r,a,...o)};',
  'return n("Cascadia",...Gd),n("Comic Shanns",...Qd),n("Excalifont",...sc),n("Helvetica",...dc),n("Liberation Sans",...lc),n("Lilita One",...pc),n("Nunito",...xc),n("Virgil",...yc),n(Mn,...b1),n(Tn,...jd),ne._initialized=!0,t.registered}',
].join("");

test("字体补丁：枚举追加 6 个数字 id（101 起），注册调用注入 _initialized 之前", () => {
  const out = buildFontPatch(VENDOR_SNIPPET);
  // ① 枚举：六个族名带数字 id
  assert.ok(out.includes('"Liberation Sans":9,' + enumAdditions() + "}"), "枚举未追加");
  assert.ok(/"LXGW WenKai Lite":101/.test(out) && /"Zen Kurenaido":106/.test(out));
  // ② 注册：六个 n("族名",{uri:"./fonts/extra/<file>"}) 且仍在 _initialized 之前
  assert.ok(out.includes("," + registerCalls() + ",ne._initialized=!0"), "注册调用未注入到正确位置");
});

test("字体补丁：幂等（重复打补丁原样返回），锚点缺失 throw", () => {
  const once = buildFontPatch(VENDOR_SNIPPET);
  assert.equal(buildFontPatch(once), once, "重复打补丁应幂等");
  assert.throws(() => buildFontPatch(VENDOR_SNIPPET.replace('"Liberation Sans":9}', '"Liberation Sans":9,')), /枚举锚点/);
  assert.throws(() => buildFontPatch(VENDOR_SNIPPET.replace(/ne\._initialized=!0/, "")), /注册锚点/);
});

test("字体补丁：face 形态与字体清单对齐（woff2、fonts/extra/ 相对路径）", () => {
  assert.equal(BUNDLED_FONTS.length, 6);
  for (const f of BUNDLED_FONTS) {
    assert.match(f.file, /\.woff2$/, f.family + " 必须 woff2（getFormat 按扩展名推断，ttf 会产生非标准 format）");
    assert.ok(registerCalls([f]).includes(`"./fonts/extra/${f.file}"`));
  }
  // 族名与枚举追加一一对应
  const families = BUNDLED_FONTS.map((f) => JSON.stringify(f.family));
  assert.equal(enumAdditions(), families.map((n, i) => `${n}:${101 + i}`).join(","));
});

test("字体补丁：--check 校验器对缺锚点代码报问题清单", () => {
  assert.deepEqual(checkVendorCode(VENDOR_SNIPPET), [], "真锚点代码应零问题");
  assert.equal(checkVendorCode("no anchors here").length, 2);
});

test("字体补丁：构建产物契约——engine.js 含六个族名（枚举+注册都进了 vendor bundle）", () => {
  const engine = new URL("../dist-engine/engine.js", import.meta.url);
  if (!existsSync(engine)) return; // 未构建时跳过（构建后由 run-all 复验）
  const code = readFileSync(engine, "utf8");
  for (const f of BUNDLED_FONTS) {
    // esbuild 压缩会把合法标识符键的引号去掉（Caveat:103），族名断言兼容带/不带引号
    const id = 101 + BUNDLED_FONTS.indexOf(f);
    assert.ok(new RegExp(`"?${f.family}"?:${id}\\b`).test(code), `engine.js 缺枚举项 ${f.family}`);
    assert.ok(code.includes(`./fonts/extra/${f.file}`), `engine.js 缺注册 face ${f.file}`);
  }
});
