// Excalidraw 字体补丁（构建期 vite 插件）：注册表注入 + 子集管线保护。
//
// 背景：vendor 0.18.1 的元素 fontFamily 是**数字枚举**（FONT_FAMILY：Virgil:1 /
// Helvetica:2 / Cascadia:3 / Excalifont:5 / Nunito:6 / Lilita One:7 /
// Comic Shanns:8 / Liberation Sans:9），不是字符串——运行时往元素上写
// `fontFamily: "LXGW WenKai Lite"` 走不通（选择器只列 Fonts 注册表里的族，
// restore 也按数字 id 恢复）。而 `Fonts` 类没有从包根导出、`register` 是
// private static，运行时没有公开扩展口。
//
// 所以在构建期给字体注册 chunk（dist/prod/chunk-*.js，特征：
// `static init(){let t={registered:new Map}`）打两处补丁：
//   ① FONT_FAMILY 枚举（`..."Liberation Sans":9}`）追加六个数字 id：101~106；
//   ② `Fonts.init()` 尾部（`X._initialized=!0` 前）注入六个注册调用
//      `n("族名",{uri:"./fonts/extra/<文件>.woff2"})`——helper `n` 内部自动
//      `Ie[族名]` 取 id、`Fr[id]??Fr[Excalifont]` 回落度量表。
// 无 `fallback:true` ⇒ 六款字体原生出现在字体选择器「可用字体」清单，
// 选择/保存/重载/导出全链路走 vendor 原生机制，零自研运行时代码。
//
// 字体文件随 copy-dist 搬到插件根 fonts/extra/，相对路径按
// window.EXCALIDRAW_ASSET_PATH（= 插件 web 根）解析。
//
// 维护：升级 @excalidraw/excalidraw 后跑
//   node scripts/excalidraw-fonts-patch.mjs --check
// 核对三个锚点是否仍各自唯一命中（压缩变量名变了也没关系，锚点用稳定字面量）。
// 核验构建产物时注意：esbuild 会重命名本文件注入的局部变量（exsBytes/exsI → u/i），
// 所以判据只能抓数字字面量与调用形态——`.byteLength>1048576`、
// `fromCharCode.apply(null,x.subarray(i,i+8192))`，以及「展开式已消失」。
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// 内置字体清单：族名（选择器显示名，即枚举键）→ woff2 文件（fonts/extra/ 下）
export const BUNDLED_FONTS = [
  { family: "LXGW WenKai Lite", file: "LXGWWenKaiLite-Regular.woff2" },
  { family: "Smiley Sans", file: "SmileySans-Oblique.woff2" },
  { family: "Caveat", file: "Caveat.woff2" },
  { family: "Patrick Hand", file: "PatrickHand-Regular.woff2" },
  { family: "Yusei Magic", file: "YuseiMagic-Regular.woff2" },
  { family: "Zen Kurenaido", file: "ZenKurenaido-Regular.woff2" },
];

const ENUM_ID_BASE = 101; // FONT_FAMILY 追加 id 起点（避开 1~9 与 Xiaolai:100）

// 枚举锚点：FONT_FAMILY 字面量（稳定，升级后内容不变即可命中）
const ENUM_ANCHOR = '"Liberation Sans":9}';
// 注册锚点：Fonts.init() 尾部的 `_initialized=!0`（属主变量名是压缩产物，用正则）
const INIT_RE = /[A-Za-z_$][\w$]*\._initialized=!0/;

// ---------------------------------------------------------------------------
// 第五十五轮附加补丁：vendor 的 glyph 子集管线（同一份补丁脚本，三个锚点分布在两个 chunk：
// 闸门和字体注册都在 FontWatcher/Fonts 所在 chunk，回落 base64 在 wawoff2/harfbuzz 所在 chunk）
//
// 现象（用户 2026-10-22 截图）：DevTools 里成串刷
//   Skipped glyph subsetting abort(Assertion failed: undefined)
//     at Object.woff2Dec … at decompress … at t._malloc / Object.toWireType
//   Failed to decode downloaded font: https://esm.sh/@excalidraw/excalidraw@0.18.1/…
//
// 链路（都在 vendor 里，非我们代码）：导出 SVG（自动保存的缩略图也走它）会调
// Fonts.generateFontFaceDeclarations → fontFacesStylesGenerator（并发 3）→
// FontWatcher.toCSS → getContent：fetch 字体字节 → qd() 子集
// （wawoff2 decompress → harfbuzz subset → wawoff2 compress）。
// wawoff2 是 Emscripten 定堆产物：胶水写死 `Module.TOTAL_MEMORY||16777216`，
// 栈+静态区占掉 5.4MB ⇒ 净堆约 10.6MB，而 decompress 要把输入和输出同时摆在堆里：
// 内置的「霞鹜文楷 Lite」woff2 5.03MB、解压后 13.32MB（合计 18.34MB）远超这个预算，
// 浏览器里 alloc 失败 → Emscripten `assert()` 无文案 → abort(Assertion failed: undefined)。
// 同一份字能在 node 里跑通（V8 允许被导入的内存 grow），所以这不是文件损坏，
// 而是环境堆边界——240 个字体文件魔术字全对，思源静态服务逐个 200 且字节数一致。
//
// 子集抛错后 vendor 的回落又是坏的：`AI()` 浏览器分支写
// `String.fromCharCode(...new Uint8Array(F))`——把整个字体字节展开成实参，
// 超过约 12 万个就 RangeError: Maximum call stack size exceeded（已实测），
// 于是 getContent 认定「这个 URL 失败」，退到 createUrls 追加在末位的
// esm.sh 远端地址并塞进 @font-face ⇒ 离线环境 Chrome 报 Failed to decode downloaded font。
//
// 两处都在构建期改（都不碰语义，只碰失败路径）：
// ① getContent 取到字节后加体积闸门：> 1MB 直接返回该 URL 自身（不子集、不回落远端），
//    导出 SVG 的 @font-face 引用插件自带的字体地址（同源可取，思源内所见即所得）；
// ② AI 改分段 base64：任何字体子集失败时回落成「整字体 data URL」而不是炸栈。
// 阈值取 1MB：vendor 自带最大单文件才 ~100KB（Xiaolai 按 unicode-range 拆成 200 片），
// 所以闸门只影响我们内置的中文大字体，拉丁小字体照常子集进 SVG。
// ---------------------------------------------------------------------------

/** 子集体积闸门：超过这个字节数的字体文件不喂给 wawoff2 */
export const SUBSET_BYTE_LIMIT = 1024 * 1024;

// getContent 里「取字节 → 子集」两步（i=字节、o=URL 是压缩局部名，用捕获组回填）
const FETCH_RE = /let ([\w$]+)=await this\.fetchFont\(([\w$]+)\);return await /;
// AI 的浏览器分支（I=临时串、F=字节缓冲、L=结果）：把整个字体展开成 fromCharCode 实参
const B64_RE = /else\{let ([\w$]+)=String\.fromCharCode\(\.\.\.new Uint8Array\(([\w$]+)\)\);([\w$]+)=btoa\(\1\)\}/;

// ---------------------------------------------------------------------------
// 纯函数层（测试直接调）
// ---------------------------------------------------------------------------

/**
 * ① 体积闸门（FontWatcher.getContent）：字体字节超过阈值就不进 wawoff2，
 * 直接用字体自身的地址当 @font-face src。锚点在字体注册那个 chunk 里。
 * 幂等：已注入则原样返回；命中数不是 1 就 throw（宁可构建失败）。
 */
export function buildSubsetGatePatch(code) {
  if (code.includes(".byteLength>" + SUBSET_BYTE_LIMIT)) return code;
  const hits = code.match(new RegExp(FETCH_RE.source, "g")) ?? [];
  if (hits.length !== 1) {
    throw new Error(`子集闸门：getContent 的 fetchFont 锚点命中 ${hits.length} 处（期望 1 处），vendor 升级后结构变了，核对 scripts/excalidraw-fonts-patch.mjs`);
  }
  return code.replace(
    FETCH_RE,
    (_m, bytesVar, urlVar) =>
      `let ${bytesVar}=await this.fetchFont(${urlVar});` +
      `if(${bytesVar}.byteLength>${SUBSET_BYTE_LIMIT})return ${urlVar}.toString();` +
      "return await ",
  );
}

/**
 * ② 分段 base64（子集 chunk 的 AI 回落）：不再把整个字体展开成 fromCharCode 实参。
 */
export function buildBase64Patch(code) {
  if (code.includes("exsBytes")) return code;
  const hits = code.match(new RegExp(B64_RE.source, "g")) ?? [];
  if (hits.length !== 1) {
    throw new Error(`子集回落：AI 的 fromCharCode 锚点命中 ${hits.length} 处（期望 1 处）`);
  }
  return code.replace(
    B64_RE,
    (_m, _strVar, bufVar, resultVar) =>
      `else{let ${resultVar}="",exsBytes=new Uint8Array(${bufVar});` +
      `for(let exsI=0;exsI<exsBytes.length;exsI+=8192)${resultVar}+=String.fromCharCode.apply(null,exsBytes.subarray(exsI,exsI+8192));` +
      `${resultVar}=btoa(${resultVar})}`,
  );
}

/** --check：给定 { 文件名: chunk 源码 }，两个子集锚点各自必须全局唯一命中 */
export function checkSubsetAnchors(codes) {
  const problems = [];
  for (const [name, re] of [
    ["getContent 的 fetchFont", FETCH_RE],
    ["AI 的 String.fromCharCode(...bytes)", B64_RE],
  ]) {
    const hits = Object.entries(codes).map(([f, code]) => [f, (code.match(new RegExp(re.source, "g")) ?? []).length]);
    const total = hits.reduce((n, [, c]) => n + c, 0);
    if (total !== 1) {
      problems.push(`${name} 锚点共命中 ${total} 处（期望 1 处）：${hits.filter(([, c]) => c).map(([f, c]) => `${f}×${c}`).join(", ") || "无"}`);
    }
  }
  return problems;
}

/** 生成六个枚举追加项："LXGW WenKai Lite":101,…,"Zen Kurenaido":106 */
export function enumAdditions(fonts = BUNDLED_FONTS) {
  return fonts.map((f, i) => `${JSON.stringify(f.family)}:${ENUM_ID_BASE + i}`).join(",");
}

/** 生成六个注册调用：n("族名",{uri:"./fonts/extra/<文件>"}) */
export function registerCalls(fonts = BUNDLED_FONTS) {
  return fonts
    .map((f) => `n(${JSON.stringify(f.family)},{uri:${JSON.stringify("./fonts/extra/" + f.file)}})`)
    .join(",");
}

/**
 * 给字体注册 chunk 源码打补丁，返回新代码。
 * 幂等：已含内置族名则原样返回。锚点缺失 throw——宁可构建失败，不要静默漏字体。
 */
export function buildFontPatch(code, fonts = BUNDLED_FONTS) {
  if (fonts.some((f) => code.includes(f.family))) return code; // 幂等

  const enumAt = code.indexOf(ENUM_ANCHOR);
  if (enumAt === -1) {
    throw new Error("字体补丁：FONT_FAMILY 枚举锚点未命中（vendor 升级后结构可能变了），核对 scripts/excalidraw-fonts-patch.mjs");
  }
  const initM = INIT_RE.exec(code);
  if (!initM) {
    throw new Error("字体补丁：Fonts.init 注册锚点（_initialized=!0）未命中，核对 scripts/excalidraw-fonts-patch.mjs");
  }

  let out = code.replace(ENUM_ANCHOR, `"Liberation Sans":9,${enumAdditions(fonts)}}`);
  // 用函数替换：压缩变量名可能含 $，字符串替换里 $ 是特殊序列
  out = out.replace(INIT_RE, (m) => `${registerCalls(fonts)},${m}`);
  return out;
}

/** --check：验证 vendor 里两个锚点仍在（升级后人工复核用） */
export function checkVendorCode(code) {
  const problems = [];
  if (code.includes(ENUM_ANCHOR)) problems.push(null);
  else problems.push(`枚举锚点缺失：${ENUM_ANCHOR}`);
  if (INIT_RE.test(code)) problems.push(null);
  else problems.push("注册锚点缺失：/._initialized=!0/");
  return problems.filter(Boolean);
}

// ---------------------------------------------------------------------------
// vite 插件：按特征门命中 chunk，逐个打补丁（都不命中返回 null，交给默认 loader）
// ---------------------------------------------------------------------------

/** 字体注册 chunk 的特征：Fonts.init 的注册序列 */
const REGISTER_FEATURE = /static init\(\)\{let t=\{registered:new Map\}/;
/** 子集回落 chunk 的特征：AI 里那行展开实参的写法 */
const B64_FEATURE = "String.fromCharCode(...new Uint8Array(";

/**
 * 对一段 vendor chunk 源码应用本文件的全部补丁，返回新代码；没改动返回 null。
 * 三个补丁互不相干（分布在两个 chunk 里），所以各自带特征门。
 */
export function patchExcalidrawChunk(code) {
  let out = code;
  if (REGISTER_FEATURE.test(out)) out = buildFontPatch(out);
  if (out.match(new RegExp(FETCH_RE.source, "g"))?.length) out = buildSubsetGatePatch(out);
  if (out.includes(B64_FEATURE)) out = buildBase64Patch(out);
  return out === code ? null : out;
}

export function excalidrawFontsPatch() {
  const CHUNK_RE = /[\\/]@excalidraw[\\/]excalidraw[\\/]dist[\\/]prod[\\/]chunk-[\w-]+\.js$/;
  return {
    name: "excalidraw-fonts-patch",
    enforce: "pre",
    load(id) {
      const file = id.split("?")[0];
      if (!CHUNK_RE.test(file) || !existsSync(file)) return null;
      return patchExcalidrawChunk(readFileSync(file, "utf8"));
    },
  };
}

// ---------------------------------------------------------------------------
// --check CLI
// ---------------------------------------------------------------------------

if (process.argv.includes("--check")) {
  const VENDOR = resolve(ROOT, "node_modules/@excalidraw/excalidraw/dist/prod");
  const { readdirSync } = await import("node:fs");
  const chunks = readdirSync(VENDOR).filter((f) => /^chunk-[\w-]+\.js$/.test(f));
  const codes = Object.fromEntries(chunks.map((f) => [f, readFileSync(resolve(VENDOR, f), "utf8")]));
  const hit = chunks.find((f) => REGISTER_FEATURE.test(codes[f]));
  const problems = [];
  if (!hit) problems.push(`未找到字体注册 chunk（${chunks.length} 个 chunk 都不含 Fonts.init 特征）`);
  else problems.push(...checkVendorCode(codes[hit]));
  problems.push(...checkSubsetAnchors(codes));

  console.log(`字体注册 chunk：${hit ?? "无"}`);
  for (const [name, re] of [
    ["子集闸门 fetchFont", FETCH_RE],
    ["子集回落 fromCharCode", B64_RE],
  ]) {
    const where = chunks.filter((f) => (codes[f].match(new RegExp(re.source, "g"))?.length ?? 0) > 0);
    console.log(`  ${name}：${where.join(", ") || "无"}`);
  }
  if (problems.length) {
    for (const p of problems) console.error("  - " + p);
    process.exitCode = 1;
  } else {
    console.log(`OK：三处锚点均唯一命中，可注入 ${BUNDLED_FONTS.length} 款内置字体 + 子集保护`);
  }
}
