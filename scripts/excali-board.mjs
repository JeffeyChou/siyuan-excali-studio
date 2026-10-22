#!/usr/bin/env -S node --experimental-strip-types
/**
 * 2026-10-18 B：Excali 白板无头 CLI（Qoder / WorkBuddy 等外部智能体的落盘通道）。
 *
 * 与前端能力共用「计划 DSL → 布局 → 元素」，区别只在这里没有 DOM：
 * 载荷由 scene-codec 编码、预览由 headless.ts 拼，产物仍是 Excalidraw 能直接打开的 SVG。
 *
 * 用法（在任意目录跑；默认从 cwd 向上找含 data/plugins 的工作空间）：
 *   node scripts/excali-board.mjs list   --workspace <ws> [--dir assets/excali] [--query x]
 *   node scripts/excali-board.mjs create --workspace <ws> --plan plan.json [--title 名称]
 *   node scripts/excali-board.mjs append --workspace <ws> --board 标题|路径 --plan plan.json
 *
 * 白板目录按「资产相对路径」解释：默认 assets/excali 实际落在 {ws}/data/assets/excali。
 * 所有结果以单行 JSON 打到 stdout（{ok:true,...} / {ok:false,error,...}），退出码 0/1。
 * 写文件前只做同名避重 _0/_1；第五十四轮起备份链退役——每块板在目录里只留一个文件，
 * 列表仍排除存量 `*.bak*.svg`，兜底交给思源自己的历史/数据快照。
 * 只允许写工作空间 data/ 内、--dir 目录下的 .svg，拒绝路径穿越。
 * 第四十四轮·软门：create/append 落盘前读插件设置 aiChannels.cli，关闭即拒写（读不拦，--dry-run 不拦）。
 */

import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, rename, stat, writeFile } from "node:fs/promises";
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { renderPlan } from "../src/studio/ai/render.ts";
import { planToSvg } from "../src/studio/ai/headless.ts";
import { STYLE_DIR, listStyles, loadStylePacks } from "../src/studio/ai/style-pack.ts";
import { boundingBoxOf } from "../src/studio/ea-element.ts";
import { decodeSvgPayload, sceneTextsEquivalent } from "../src/studio/scene-codec.ts";
import { isBackupPath, sanitizeFileName } from "../src/studio/storage.ts";
import { DEDICATED_BOARD_DIR } from "../src/studio/settings.ts";

const USAGE = `Excali 白板 CLI

  node scripts/excali-board.mjs list   [选项]
  node scripts/excali-board.mjs create --plan <文件|-> [选项]
  node scripts/excali-board.mjs append --board <标题|路径> --plan <文件|-> [选项]

通用选项
  --workspace <dir>   思源工作空间根目录（默认从 cwd 向上找含 data/plugins 的目录）
  --dir <dir>         白板目录（资产相对路径，落在 data/ 下），默认 ${DEDICATED_BOARD_DIR}
  --plan <file|->     计划 JSON 文件；- 表示 stdin
  --plan-json <json>  直接传计划 JSON 字符串（与 --plan 二选一）
  --preset <name>     pencil|marker|blueprint 或风格包名（覆盖计划）
  --style <name>      风格包名，与 --preset 同义、优先
  --style-dir <dir>   风格包目录（默认 ${STYLE_DIR}，即 {ws}/data/${STYLE_DIR}；给绝对路径可读插件自带示例）
  --list-styles       只列可用风格后退出
  --layout <name>     lr|tb|grid|radial（覆盖计划）
  --title <name>      create 的文件名（默认计划标题或 AI-白板）
  --board <title|path> append 的目标白板
  --id-prefix <p>     元素 id 前缀，默认 ai
  --dry-run           只渲染不写盘
  --help              显示本说明

计划示例
  {
    "title": "注册流程",
    "preset": "marker",
    "layout": "lr",
    "nodes": [
      { "id": "start", "label": "打开思源", "shape": "rounded" },
      { "id": "check", "label": "已登录？", "shape": "diamond" },
      { "id": "board", "label": "进入白板" }
    ],
    "edges": [
      { "from": "start", "to": "check" },
      { "from": "check", "to": "board", "label": "是" }
    ]
  }

风格包示例（{ws}/data/${STYLE_DIR}/axl-poster.json；只写和基线不一样的字段）
  {
    "name": "axl-poster",
    "extends": "marker",
    "background": "#fdf8ec",
    "ink": "#2b2b2b",
    "fontSizes": { "title": 34, "node": 17 },
    "space": { "gapX": 150, "padX": 44 },
    "groupColor": { "mode": "roles", "roles": { "标题": "#ffe9a8", "正文": "#ffffff" } }
  }
`;

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith("--")) {
      out._.push(arg);
      continue;
    }
    const eq = arg.indexOf("=");
    if (eq >= 0) {
      out[arg.slice(2, eq)] = arg.slice(eq + 1);
      continue;
    }
    const key = arg.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith("--")) {
      out[key] = true;
    } else {
      out[key] = next;
      i += 1;
    }
  }
  return out;
}

function print(obj) {
  process.stdout.write(`${JSON.stringify(obj)}\n`);
}

function isInside(parent, child) {
  const rel = relative(parent, child);
  return rel === "" || (!rel.startsWith("..") && !rel.startsWith(`..${sep}`));
}

/** 白板目录按「资产相对路径」解释（assets/excali → {ws}/data/assets/excali） */
function boardDirOf(workspace, dirArg) {
  if (isAbsolute(dirArg)) return resolve(dirArg);
  const raw = dirArg.replace(/\\/g, "/").replace(/^\.\//, "");
  const rel = raw === "data" ? "" : raw.startsWith("data/") ? raw.slice("data/".length) : raw;
  return resolve(join(workspace, "data"), rel);
}

/** 白板路径按资产 ref（默认）或 data/ 前缀解释；标题分支不经过这里 */
function boardPathCandidates(workspace, raw) {
  if (isAbsolute(raw)) return [resolve(raw)];
  const rel = raw.replace(/\\/g, "/");
  return rel === "data" || rel.startsWith("data/")
    ? [resolve(workspace, rel)]
    : [resolve(join(workspace, "data"), rel)];
}

function workspaceOf(arg) {
  if (typeof arg === "string" && arg !== "") {
    const root = resolve(arg);
    if (!existsSync(join(root, "data"))) throw new Error(`--workspace 不是思源工作空间（缺 data/）：${root}`);
    return root;
  }
  let dir = process.cwd();
  for (;;) {
    if (existsSync(join(dir, "data", "plugins"))) return dir;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error("找不到思源工作空间：请传 --workspace <工作空间根目录>");
}

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}

async function readPlan(args) {
  if (typeof args["plan-json"] === "string") {
    try {
      return JSON.parse(args["plan-json"]);
    } catch (e) {
      throw new Error(`--plan-json 不是合法 JSON：${e.message}`);
    }
  }
  const source = args.plan;
  if (typeof source !== "string" || source === "") throw new Error("缺 --plan <文件|-> 或 --plan-json <json>");
  const text = source === "-" ? await readStdin() : await readFile(resolve(process.cwd(), source), "utf8");
  try {
    return JSON.parse(text);
  } catch (e) {
    throw new Error(`计划不是合法 JSON：${e.message}`);
  }
}

async function boardFiles(dir) {
  if (!existsSync(dir)) return [];
  const rows = await readdir(dir, { withFileTypes: true });
  const out = [];
  for (const row of rows) {
    if (!row.isFile() || !/\.svg$/i.test(row.name) || isBackupPath(row.name)) continue;
    const file = join(dir, row.name);
    const info = await stat(file);
    out.push({ file, title: row.name.replace(/\.svg$/i, ""), size: info.size, updated: info.mtimeMs });
  }
  out.sort((a, b) => b.updated - a.updated);
  return out;
}

function publicBoard(workspace, item) {
  return {
    title: item.title,
    path: relative(join(workspace, "data"), item.file).split(sep).join("/"),
    size: item.size,
    updated: item.updated,
    updatedAt: item.updated ? new Date(item.updated).toISOString() : "",
  };
}

async function uniqueBoardPath(dir, fileName) {
  const base = fileName.replace(/\.svg$/i, "");
  for (let i = 0; i < 50; i++) {
    const file = join(dir, i === 0 ? fileName : `${base}_${i - 1}.svg`);
    if (!existsSync(file)) return file;
  }
  throw new Error(`同名白板过多：${fileName}`);
}

async function resolveBoard(workspace, boardDir, name) {
  const raw = String(name ?? "").trim();
  if (!raw) throw new Error("缺 --board <标题|路径>");
  // 带分隔符/绝对路径才走路径分支；「名称.svg」仍按标题解析（用户最顺手的写法）
  const looksPath = /[\\/]/.test(raw) || isAbsolute(raw);
  if (looksPath) {
    const file = boardPathCandidates(workspace, raw)[0];
    if (!isInside(workspace, file)) throw new Error(`白板路径越出工作空间：${raw}`);
    if (!isInside(boardDir, file)) throw new Error(`白板路径不在 ${relative(join(workspace, "data"), boardDir)} 下：${raw}`);
    if (!/\.svg$/i.test(file)) throw new Error(`白板必须是 .svg：${raw}`);
    if (!existsSync(file)) throw new Error(`白板不存在：${raw}`);
    return file;
  }
  const entries = await boardFiles(boardDir);
  const wanted = raw.replace(/\.svg$/i, "").toLowerCase();
  const matches = entries.filter((e) => e.title.toLowerCase() === wanted);
  if (matches.length === 0) throw new Error(`找不到白板：${raw}`);
  const exact = matches.find((e) => e.title === raw.replace(/\.svg$/i, ""));
  return (exact ?? matches[0]).file;
}

function originOf(elements) {
  const visible = elements
    .filter((el) => el && typeof el === "object" && el.isDeleted !== true)
    .map((el) => ({
      x: Number(el.x ?? 0),
      y: Number(el.y ?? 0),
      width: Number(el.width ?? 0),
      height: Number(el.height ?? 0),
      angle: Number(el.angle ?? 0),
      points: Array.isArray(el.points) ? el.points : undefined,
    }));
  const box = boundingBoxOf(visible);
  return box ? { x: box.minX, y: box.maxY + 80 } : { x: 0, y: 0 };
}

async function writeAtomic(file, text) {
  const tmp = `${file}.tmp-${process.pid}`;
  await writeFile(tmp, text, "utf8");
  await rename(tmp, file);
}

/**
 * 第四十四轮·软门：create/append 落盘前读同一份插件设置（前端 saveData 落盘的 petal 文件，
 * 思源存储不带 .json 后缀）。cli 显式为 false 才拒写；文件缺失/解析失败一律视为开启，
 * 读命令（list/--list-styles/--dry-run）不受影响。
 */
async function cliChannelClosed(workspace) {
  try {
    const text = await readFile(join(workspace, "data", "storage", "petal", "siyuan-excali-studio", "excali-studio"), "utf8");
    return JSON.parse(text)?.settings?.aiChannels?.cli === false;
  } catch {
    return false;
  }
}

async function assertCliWritable(workspace, command) {
  if (await cliChannelClosed(workspace)) {
    throw new Error(`无头 CLI 通道已在「AI 通道」面板里关闭，拒绝 ${command} 落盘；请重新开启后再运行`);
  }
}

function renderOptions(args) {
  const style = typeof args.style === "string" && args.style.trim() ? args.style : args.preset;
  return {
    ...(typeof style === "string" ? { preset: style } : {}),
    ...(typeof args.layout === "string" ? { layout: args.layout } : {}),
    ...(typeof args["id-prefix"] === "string" ? { idPrefix: args["id-prefix"] } : {}),
  };
}

/** 风格包目录：绝对路径原样用（可读插件自带示例），否则按资产相对路径落在 data/ 下 */
function styleDirOf(workspace, args) {
  const raw = typeof args["style-dir"] === "string" && args["style-dir"].trim() ? args["style-dir"].trim() : STYLE_DIR;
  return { dir: boardDirOf(workspace, raw), label: raw };
}

function fsStyleIo(styleDir) {
  return {
    list: async () => {
      if (!existsSync(styleDir)) return [];
      const names = await readdir(styleDir);
      return names.filter((n) => /\.json$/i.test(n));
    },
    read: (fileName) => readFile(join(styleDir, fileName), "utf8"),
  };
}

function summary(rendered, extra) {
  return {
    ok: true,
    ...extra,
    nodes: rendered.nodes.length,
    edges: rendered.routes.length,
    preset: rendered.plan.preset,
    layout: rendered.plan.layout,
    title: rendered.plan.title ?? "",
    warnings: rendered.plan.warnings,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || args.h || args._.length === 0) {
    process.stdout.write(USAGE);
    if (args._.length === 0 && !args.help && !args.h) process.exitCode = 1;
    return;
  }
  const command = args._[0];
  const workspace = workspaceOf(args.workspace);
  const dataDir = join(workspace, "data");
  const dirArg = typeof args.dir === "string" && args.dir.trim() ? args.dir.trim() : DEDICATED_BOARD_DIR;
  const boardDir = boardDirOf(workspace, dirArg);
  if (!isInside(dataDir, boardDir)) throw new Error(`--dir 必须位于工作空间 data/ 下：${dirArg}`);
  const relPath = (file) => relative(dataDir, file).split(sep).join("/");

  const style = styleDirOf(workspace, args);
  const packs = await loadStylePacks(fsStyleIo(style.dir), style.label);
  if (args["list-styles"]) {
    print({ ok: true, action: "styles", styleDir: style.dir, styles: listStyles(), warnings: packs.warnings });
    return;
  }

  if (command === "list") {
    const entries = await boardFiles(boardDir);
    const query = typeof args.query === "string" ? args.query.trim().toLowerCase() : "";
    const filtered = query
      ? entries.filter((e) => e.title.toLowerCase().includes(query) || e.file.toLowerCase().includes(query))
      : entries;
    print({
      ok: true,
      action: "list",
      workspace,
      dir: relPath(boardDir),
      total: filtered.length,
      boards: filtered.map((e) => publicBoard(workspace, e)),
      styles: listStyles(),
      styleWarnings: packs.warnings,
    });
    return;
  }

  if (command === "create") {
    const plan = await readPlan(args);
    const rendered = renderPlan(plan, renderOptions(args));
    const planTitle = plan && typeof plan === "object" && !Array.isArray(plan) ? plan.title : "";
    const rawTitle =
      (typeof args.title === "string" && args.title.trim()) ||
      (typeof planTitle === "string" && planTitle.trim()) ||
      "AI-白板";
    const fileName = sanitizeFileName(rawTitle, "AI-白板.svg");
    await mkdir(boardDir, { recursive: true });
    const file = await uniqueBoardPath(boardDir, fileName);
    const { svgText } = planToSvg(rendered, null);
    if (args["dry-run"]) {
      print(summary(rendered, { action: "create", dryRun: true, path: relPath(file), styleWarnings: packs.warnings, svgBytes: Buffer.byteLength(svgText) }));
      return;
    }
    await assertCliWritable(workspace, "create");
    await writeAtomic(file, svgText);
    print(
      summary(rendered, {
        action: "create",
        path: relPath(file),
        styleWarnings: packs.warnings,
        boardTitle: basename(file).replace(/\.svg$/i, ""),
        svgBytes: Buffer.byteLength(svgText),
      }),
    );
    return;
  }

  if (command === "append" || command === "update") {
    const file = await resolveBoard(workspace, boardDir, args.board);
    const oldText = await readFile(file, "utf8");
    let decoded;
    try {
      decoded = decodeSvgPayload(oldText);
    } catch (e) {
      throw new Error(`目标白板不是有效的 Excali 场景，拒绝覆盖：${e instanceof Error ? e.message : String(e)}`);
    }
    const existing = { elements: decoded.elements, appState: decoded.appState, files: decoded.files };
    const plan = await readPlan(args);
    const origin = originOf(existing.elements);
    const options = renderOptions(args);
    let rendered = renderPlan(plan, { ...options, origin });
    const ids = new Set(existing.elements.map((el) => el && typeof el === "object" ? el.id : ""));
    if (rendered.specs.some((spec) => spec.id && ids.has(spec.id))) {
      rendered = renderPlan(plan, { ...options, origin, idPrefix: `${options.idPrefix ?? "ai"}-${Date.now().toString(36)}` });
    }
    const { svgText } = planToSvg(rendered, existing);
    const path = relPath(file);
    if (args["dry-run"]) {
      print(summary(rendered, { action: "append", dryRun: true, path, origin, styleWarnings: packs.warnings, svgBytes: Buffer.byteLength(svgText) }));
      return;
    }
    await assertCliWritable(workspace, "append");
    // 第五十四轮：备份链退役 + 与插件同口径的等价门——空计划不许刷 mtime
    const unchanged = sceneTextsEquivalent(oldText, svgText);
    if (!unchanged) await writeAtomic(file, svgText);
    print(
      summary(rendered, {
        action: "append",
        path,
        styleWarnings: packs.warnings,
        boardTitle: basename(file).replace(/\.svg$/i, ""),
        origin,
        unchanged,
        svgBytes: Buffer.byteLength(svgText),
      }),
    );
    return;
  }

  throw new Error(`未知命令：${command}（可用 list/create/append）`);
}

main().catch((e) => {
  print({ ok: false, error: e instanceof Error ? e.message : String(e) });
  process.exitCode = 1;
});
