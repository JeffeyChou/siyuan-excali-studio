// Excalidraw 字体注册表补丁（构建期 vite 插件）。
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
// 核对两个锚点是否仍能命中（压缩变量名变了也没关系，锚点用稳定字面量）。
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
// 纯函数层（测试直接调）
// ---------------------------------------------------------------------------

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
// vite 插件：命中特征 chunk（含 Fonts.init 注册序列）才打补丁
// ---------------------------------------------------------------------------

export function excalidrawFontsPatch() {
  const CHUNK_RE = /[\\/]@excalidraw[\\/]excalidraw[\\/]dist[\\/]prod[\\/]chunk-[\w-]+\.js$/;
  return {
    name: "excalidraw-fonts-patch",
    enforce: "pre",
    load(id) {
      const file = id.split("?")[0];
      if (!CHUNK_RE.test(file) || !existsSync(file)) return null;
      const code = readFileSync(file, "utf8");
      // 特征：Fonts.init 的注册序列（别的 chunk 不含）
      if (!/static init\(\)\{let t=\{registered:new Map\}/.test(code)) return null;
      return buildFontPatch(code);
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
  const hit = chunks.find((f) =>
    /static init\(\)\{let t=\{registered:new Map\}/.test(readFileSync(resolve(VENDOR, f), "utf8")),
  );
  if (!hit) {
    console.error(`未找到字体注册 chunk（dist/prod/ 下 ${chunks.length} 个 chunk 都不含 Fonts.init 特征）`);
    process.exitCode = 1;
  } else {
    const problems = checkVendorCode(readFileSync(resolve(VENDOR, hit), "utf8"));
    console.log(`字体注册 chunk：${hit}`);
    if (problems.length) {
      for (const p of problems) console.error("  - " + p);
      process.exitCode = 1;
    } else {
      console.log(`OK：两个锚点均命中，可注入 ${BUNDLED_FONTS.length} 款内置字体`);
    }
  }
}
