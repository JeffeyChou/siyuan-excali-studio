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

const FILES = ["plugin.json", "index.js", "index.css", "engine.js", "kernel.js", "icon.png", "preview.png", "README.md"];
// embed/：画布内嵌思源块的 Embeddable 渲染页（copy-dist 从 src-embed/siyuan/ 拷来）
const DIRS = ["i18n", "fonts", "embed"];

let failed = false;
for (const f of FILES) {
  if (!existsSync(join(ROOT, f))) {
    const built = f.startsWith("index.") || f === "engine.js" || f === "kernel.js";
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

execFileSync("zip", ["-r", "-X", "-q", OUT, ...FILES, ...DIRS], { cwd: ROOT, stdio: "inherit" });

const size = statSync(zipPath).size;
console.log(`[pack] ${pkg.name} v${pkg.version} -> ${OUT}（${(size / 1024 / 1024).toFixed(1)} MB）`);
