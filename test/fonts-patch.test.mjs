// 第三十四轮：字体注册表补丁（scripts/excalidraw-fonts-patch.mjs）单测 + 构建产物契约。
//
// vendor 0.18.1 的 fontFamily 是数字枚举，六款内置字体必须在构建期注入
// FONT_FAMILY 枚举 + Fonts.init() 注册序列——这里锁住补丁的行为契约。
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  BUNDLED_FONTS,
  SUBSET_BYTE_LIMIT,
  enumAdditions,
  registerCalls,
  buildFontPatch,
  checkVendorCode,
  buildSubsetGatePatch,
  buildBase64Patch,
  checkSubsetAnchors,
  patchExcalidrawChunk,
} from "../scripts/excalidraw-fonts-patch.mjs";

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

// ---------------------------------------------------------------------------
// 第五十五轮：子集管线保护（体积闸门 + 分段 base64）
// 报错链：exportToSvg → Fonts.getContent → wawoff2 子集 abort → AI 回落炸 RangeError
// ---------------------------------------------------------------------------

// 从真 vendor chunk（chunk-K2UTITRG 的 FontWatcher.getContent）抠出的锚点上下文
const GATE_SNIPPET =
  'async getContent(t){let n=0,r=[];for(;n<this.urls.length;){let o=this.urls[n];try{let i=await this.fetchFont(o);return await qd(i,t)}catch(i){r.push(i)}}return""}';
// 从真 vendor chunk（chunk-EIO257PC 的 AI 浏览器分支）抠出的锚点上下文
const B64_SNIPPET = "if(L)btoa(L);else{let I=String.fromCharCode(...new Uint8Array(F));L=btoa(I)}";

test("子集闸门：取字节后、子集调用前插入体积判断，超限直接返回字体自身 URL", () => {
  const out = buildSubsetGatePatch(GATE_SNIPPET);
  const gate = `if(i.byteLength>${SUBSET_BYTE_LIMIT})return o.toString();`;
  assert.ok(out.includes(gate), "闸门未注入");
  // 顺序必须是 取字节 < 闸门 < 子集调用（否则超阈值字体仍会进 wawoff2）
  assert.ok(
    out.indexOf("await this.fetchFont(o)") < out.indexOf(gate) && out.indexOf(gate) < out.indexOf("qd(i,t)"),
    "闸门位置不对",
  );
  assert.equal(buildSubsetGatePatch(out), out, "重复打补丁应幂等");
  assert.throws(() => buildSubsetGatePatch("nothing here"), /子集闸门/);
  assert.throws(
    () => buildSubsetGatePatch(GATE_SNIPPET + ";let a=await this.fetchFont(b);return await x(a)"),
    /命中 2 处/,
  );
});

test("子集回落：AI 改分段 base64，不再把整个字体展开成 fromCharCode 实参", () => {
  const out = buildBase64Patch(B64_SNIPPET);
  assert.ok(!out.includes("String.fromCharCode(...new Uint8Array("), "展开式实参仍在（5MB 字体会炸栈）");
  assert.ok(out.includes("exsBytes=new Uint8Array(F)"), "分段缓冲未注入");
  assert.ok(/exsI\+=8192\)[\w$]+\+=String\.fromCharCode\.apply\(null,exsBytes\.subarray\(exsI,exsI\+8192\)\)/.test(out), "分块循环未注入");
  assert.ok(
    out.includes(
      "else{let L=\"\",exsBytes=new Uint8Array(F);for(let exsI=0;exsI<exsBytes.length;exsI+=8192)L+=String.fromCharCode.apply(null,exsBytes.subarray(exsI,exsI+8192));L=btoa(L)}",
    ),
    "分段回落形态不符合预期",
  );
  assert.equal(buildBase64Patch(out), out, "重复打补丁应幂等");
  assert.throws(() => buildBase64Patch("nothing here"), /子集回落/);
});

test("补丁分派：按 chunk 特征各打各的，无关代码返回 null", () => {
  assert.equal(patchExcalidrawChunk("hello world"), null, "无关 chunk 不该产出");
  // 注册 chunk 同时含枚举与闸门两个特征 → 两处都要打上
  const both = patchExcalidrawChunk(VENDOR_SNIPPET + GATE_SNIPPET.slice(GATE_SNIPPET.indexOf("try{")));
  assert.ok(both.includes(enumAdditions()) && both.includes(`.byteLength>${SUBSET_BYTE_LIMIT}`), "注册 chunk 少打一处");
  const onlyB64 = patchExcalidrawChunk(B64_SNIPPET);
  assert.ok(onlyB64.includes("exsBytes") && !onlyB64.includes(enumAdditions()), "子集 chunk 不该动枚举");
});

test("子集锚点校验：真 chunk 清单零问题，缺锚点报两条", () => {
  assert.deepEqual(checkSubsetAnchors({ gate: GATE_SNIPPET, b64: B64_SNIPPET }), []);
  assert.equal(checkSubsetAnchors({ other: "no anchors" }).length, 2);
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
  // 子集保护两处：阈值是数字字面量不会被重命名，分段循环用 8192+apply 做稳定标记
  assert.ok(code.includes(`.byteLength>${SUBSET_BYTE_LIMIT}`), "engine.js 缺子集体积闸门");
  assert.ok(
    /String\.fromCharCode\.apply\(null,[\w$]+\.subarray\([\w$]+,[\w$]+\+8192\)\)/.test(code),
    "engine.js 缺分段 base64 回落（局部名会被压缩，别按 exsBytes 找）",
  );
  assert.ok(!code.includes("String.fromCharCode(...new Uint8Array("), "engine.js 仍残留整字体展开式实参");
});
