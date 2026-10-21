/**
 * 发布打包：把「运行时需要的东西」打进根目录 package.zip（思源集市上传的就是这个 zip）。
 *
 * 只包运行时文件——src/ dist/ scripts/ test/ node_modules/ 以及构建配置都留在仓库里。
 * 打包前先自检：index.js / index.css / engine.js 是 npm run build 的产物，缺了说明构建没跑或没跑成功。
 * 用系统 zip 命令（macOS/Linux 自带），不为此加依赖；-X 去掉扩展属性，产物更干净。
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, rmSync, statSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = "package.zip";

// library-import.html + lib-import.js：素材库「Add to Excalidraw」落地页（v0.1.0 漏包，
// 集市用户点库站 Add 会 404——src/index.ts 的 libraryImportUrl() 指向
// /plugins/<dir>/library-import.html）。CHANGELOG.md 让本地安装的用户也看得到更新内容。
const FILES = [
  "plugin.json",
  "index.js",
  "index.css",
  "engine.js",
  "kernel.js",
  "icon.png",
  "preview.png",
  "README.md",
  "CHANGELOG.md",
  "library-import.html",
  "lib-import.js",
];
// embed/：画布内嵌思源块的 Embeddable 渲染页（copy-dist 从 src-embed/siyuan/ 拷来）
// demo/：AI 绘图效果图（README 效果展示引用；集市渲染 README 相对路径需同包）
const DIRS = ["i18n", "fonts", "embed", "demo"];

let failed = false;
for (const f of FILES) {
  if (!existsSync(join(ROOT, f))) {
    const built = f.startsWith("index.") || f === "engine.js" || f === "kernel.js" || f === "lib-import.js";
    console.error(`[pack] 缺 ${f}${built ? "：先跑 npm run build" : ""}`);
    failed = true;
  }
}
for (const d of DIRS) {
  const p = join(ROOT, d);
  if (!existsSync(p) || !readdirSync(p).length) {
    console.error(`[pack] 缺目录或目录为空：${d}/`);
    failed = true;
  }
}
if (failed) process.exit(1);

const pkg = JSON.parse(readFileSync(join(ROOT, "plugin.json"), "utf8"));
const zipPath = join(ROOT, OUT);
if (existsSync(zipPath)) rmSync(zipPath);

// 排除 macOS 开发残留：__MACOSX 元数据目录、.DS_Store 及其 AppleDouble 伴生文件（._*）。
// 思源数据同步会忽略点开头条目（data/.siyuan 除外），包内残留会导致其他设备上界面与行为不一致，
// 集市自动化检查（github-actions Bot）会因此打回 PR。
const EXCLUDE = ["__MACOSX*", "*.DS_Store", "._*", "*/._*"];
execFileSync("zip", ["-r", "-X", "-q", OUT, ...FILES, ...DIRS, "-x", ...EXCLUDE], { cwd: ROOT, stdio: "inherit" });

// 集市红线自检：zip 条目名不得含点开头文件 / __MACOSX / AppleDouble 伴生，有则打包失败
const entries = execFileSync("unzip", ["-Z1", OUT], { cwd: ROOT, encoding: "utf8" }).trim().split("\n");
const bad = entries.filter((e) => {
  const base = e.split("/").filter(Boolean).pop() ?? "";
  return e.includes("__MACOSX") || base.startsWith(".") || base.startsWith("._");
});
if (bad.length) {
  console.error(`[pack] 含集市不允许的点开头条目：\n  ${bad.join("\n  ")}`);
  process.exit(1);
}

const size = statSync(zipPath).size;
console.log(`[pack] ${pkg.name} v${pkg.version} -> ${OUT}（${(size / 1024 / 1024).toFixed(1)} MB）`);
