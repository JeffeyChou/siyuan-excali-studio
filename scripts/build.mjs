// 第二十六轮 T3：单文件构建编排（替代 vite.config.mts 的单构建）。
//
//   主包   dist/index.js   ← src/index.ts        插件壳：思源 API / dock / 白板库（小）
//   引擎   dist-engine/engine.js ← src/studio/lazy.ts  vendor 引擎：@excalidraw/excalidraw
//                                                      + React 渲染层 + 场景/导出（大，8MB 级）
//   内核   dist-kernel/kernel.js ← src/kernel/index.ts goja 内核能力（智能体/MCP）
//   落地页 dist-lib/lib-import.js ← src/library-import-page.ts 素材库「Add to Excalidraw」
//                                                   浏览器独立页引导（ES 单文件，只 import 纯模块）
//
// 主包与引擎是 lib/CJS + inlineDynamicImports（vendor 内部的 locale/mermaid 等动态导入
// 全部内联，避免炸出上百个哈希 chunk）。主包对引擎只有一行运行时
// require("./engine.js")（见 index.ts lazyMod），首次开画板页签才加载引擎——
// 插件启动不再解析 8MB 级代码。
//
// 内核不是 CommonJS：goja 直接执行脚本，所以第三趟用 IIFE；`siyuan` 是宿主注入的
// 全局变量，不 external（external 会生成 require("siyuan")，内核里没有 require）。
// copy-dist 把三个文件都搬到插件根目录。
//
// 用法：node scripts/build.mjs   （package.json 的 build 已指到这里）

import { build } from "vite";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { excalidrawZhCnPatch } from "./excalidraw-zh-cn-patch.mjs";
import { excalidrawFontsPatch } from "./excalidraw-fonts-patch.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/**
 * 第五十二轮：版本号构建期从 plugin.json 注入（消费方 src/siyuan/changelog.ts 的 PLUGIN_VERSION）。
 * 不走运行时 `this.version`：思源 SDK 的 Plugin 类型没这个字段，取到 undefined 就等于
 * 「每次启动都升级了」，弹窗会跟着每次重启出现。
 */
const PLUGIN_VERSION = JSON.parse(readFileSync(resolve(ROOT, "plugin.json"), "utf8")).version;

/** 两趟共享的构建参数；差异只在入口 / 产物名 / 输出目录 */
function config(entry, outDir, fileName) {
  return {
    configFile: false,
    root: ROOT,
    plugins: [excalidrawZhCnPatch(), excalidrawFontsPatch()],
    base: "./",
    define: {
      __EXCALI_PLUGIN_VERSION__: JSON.stringify(PLUGIN_VERSION),
      // lib 模式不替换 process.env.NODE_ENV；浏览器端没有 process，React 入口会直接抛错
      "process.env.NODE_ENV": JSON.stringify("production"),
    },
    build: {
      target: "esnext",
      outDir,
      // 不空输出目录：避免触发批量删除保护
      emptyOutDir: false,
      minify: "esbuild",
      lib: {
        entry: resolve(ROOT, entry),
        formats: ["cjs"],
        fileName: () => fileName,
      },
      rollupOptions: {
        // siyuan 由思源运行时（Electron）注入，必须保持外部；其余全部打进 bundle
        external: ["siyuan"],
        output: {
          inlineDynamicImports: true,
        },
      },
    },
    esbuild: {
      jsx: "automatic",
    },
    resolve: {
      alias: {
        "@": resolve(ROOT, "src"),
        // roughjs 4.6.4 官方打包缺陷：vendor ESM 裸引用 "roughjs/bin/rough"，
        // 但 npm 包 bin/ 下只有 rough.d.ts 没有 rough.js；运行时入口在
        // bundled/rough.esm.js。构建期别名指过去（不依赖任何手工垫片文件，
        // npm install 后依然成立）。
        "roughjs/bin/rough": resolve(ROOT, "node_modules/roughjs/bundled/rough.esm.js"),
      },
    },
  };
}

/** 内核构建：IIFE、无 external、es2019（goja 语法兜底） */
function kernelConfig() {
  return {
    configFile: false,
    root: ROOT,
    base: "./",
    build: {
      target: "es2019",
      outDir: "dist-kernel",
      emptyOutDir: false,
      minify: "esbuild",
      lib: {
        entry: resolve(ROOT, "src/kernel/index.ts"),
        formats: ["iife"],
        name: "ExcaliKernel",
        fileName: () => "kernel.js",
      },
      rollupOptions: {
        output: {
          inlineDynamicImports: true,
        },
      },
    },
    resolve: {
      alias: {
        "@": resolve(ROOT, "src"),
      },
    },
  };
}

/** 落地页构建：ES 单文件（浏览器 <script type="module"> 直接加载）。
 *  入口只 import 纯模块（library-import / stencil），不碰 vendor、不碰 siyuan，
 *  所以不需要 external / excalidraw 补丁 / roughjs 别名——配置保持最小。 */
function libImportConfig() {
  return {
    configFile: false,
    root: ROOT,
    base: "./",
    build: {
      target: "esnext",
      outDir: "dist-lib",
      emptyOutDir: false,
      minify: "esbuild",
      lib: {
        entry: resolve(ROOT, "src/library-import-page.ts"),
        formats: ["es"],
        fileName: () => "lib-import.js",
      },
    },
    resolve: {
      alias: {
        "@": resolve(ROOT, "src"),
      },
    },
    esbuild: {
      jsx: "automatic",
    },
  };
}

console.log("[build] 主包 index.js（插件壳，不含引擎）…");
await build(config("src/index.ts", "dist", "index.js"));

console.log("[build] 引擎 engine.js（vendor + 渲染层，懒加载）…");
await build(config("src/studio/lazy.ts", "dist-engine", "engine.js"));

console.log("[build] 内核 kernel.js（goja 能力，IIFE）…");
await build(kernelConfig());

console.log("[build] 落地页 lib-import.js（素材库导入，ES 单文件）…");
await build(libImportConfig());

console.log("[build] 完成：dist/index.js + dist-engine/engine.js + dist-kernel/kernel.js + dist-lib/lib-import.js（copy-dist 负责搬运）");
