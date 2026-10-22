/**
 * 2026-10-18 C/D：内核侧白板能力（列 / 读 / 画 / 生图）。
 *
 * 与前端 A/D 共用同一份计划 DSL、布局、预设、无头场景编码；差别只在「画布」
 * ——内核没有 React/vendor，直接生成内嵌 scene 的 SVG（Excalidraw 打开即还原）。
 *
 * 文件只允许落在保存目录（默认 assets/excali）下；同名不静默覆盖，自动 _0/_1；
 * 第五十四轮起备份链退役——每块板只留一个文件，同内容（正文逐字 + 载荷语义）不落盘。
 */

import { boundingBoxOf, makeElement, nextId } from "../studio/ea-element.ts";
import { appendHeadlessElements, buildHeadlessScene, composeHeadlessScene, sceneToSvgHeadless } from "../studio/ai/headless.ts";
import { normalizePlan, PlanError, type DrawingPlan } from "../studio/ai/plan.ts";
import { renderPlan, type RenderedPlan } from "../studio/ai/render.ts";
import { STYLE_DIR, listStyles, loadStylePacks, type StyleLoadResult } from "../studio/ai/style-pack.ts";
import { generateImage } from "../studio/ai/imagegen.ts";
import { decodeSvgPayload } from "../studio/scene-codec.ts";
import { DEDICATED_BOARD_DIR, normalizeDirRef, type StudioSettings } from "../studio/settings.ts";
import { fileNameOf, isBackupPath, readDirTimeMs, sanitizeFileName, toAssetRef, toDataPath } from "../studio/storage.ts";
import { createKernelProxy } from "./proxy.ts";
import { fileExists, readBoardText, readDir, readText, writeSvg, type DirEntry } from "./io.ts";

export interface BoardRef {
  path: string;
  title: string;
}

export interface KernelScene {
  elements: Record<string, unknown>[];
  appState: Record<string, unknown>;
  files: Record<string, unknown>;
}

export function boardDirOf(settings: StudioSettings): string {
  return normalizeDirRef(settings.saveDir) || DEDICATED_BOARD_DIR;
}

function titleOf(path: string): string {
  return fileNameOf(path).replace(/\.svg$/i, "");
}

function clip(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function withinDir(rel: string, dir: string): boolean {
  return rel === dir || rel.startsWith(`${dir}/`);
}

/** 抹平空段/`.`，拒绝 `..`——前缀检查挡不住 `assets/excali/../../x.svg` */
function normalizeBoardRel(raw: string): string {
  const parts: string[] = [];
  for (const seg of raw.split("/")) {
    if (seg === "" || seg === ".") continue;
    if (seg === "..") throw new Error("白板路径不允许包含 ..");
    parts.push(seg);
  }
  return parts.join("/");
}

async function listBoardEntries(dir: string): Promise<Array<{ path: string; updated: number }>> {
  let rows: DirEntry[] = [];
  try {
    rows = await readDir(dir);
  } catch {
    return [];
  }
  return rows
    .filter((r) => r && r.isDir !== true && typeof r.name === "string" && /\.svg$/i.test(r.name) && !isBackupPath(r.name))
    .map((r) => ({ path: `${dir}/${r.name}`, updated: readDirTimeMs(r.updated) }))
    .sort((a, b) => b.updated - a.updated);
}

/** 同名避重：逐档探存在性，命中就用 _0/_1（与前端 getNewUniqueFilepath 语义一致） */
async function uniqueBoardPath(dir: string, fileName: string): Promise<string> {
  const safe = sanitizeFileName(fileName, "AI 白板");
  const base = safe.replace(/\.svg$/i, "");
  for (let i = 0; i < 50; i++) {
    const name = i === 0 ? safe : `${base}_${i - 1}.svg`;
    const rel = `${dir}/${name}`;
    if (!(await fileExists(rel))) return rel;
  }
  return `${dir}/${safe}`;
}

/**
 * board/path/title → 已有白板。path 或含 `/` 的 board 当路径（必须在保存目录下），
 * 其余当标题（去 .svg、不区分大小写）。找不到返回 null，不自动新建。
 */
export async function findBoard(args: Record<string, unknown>, dir: string): Promise<BoardRef | null> {
  const pathArg = typeof args.path === "string" && args.path.trim() ? args.path.trim() : "";
  const board = typeof args.board === "string" ? args.board.trim() : "";
  if (pathArg || board.includes("/")) {
    const rel = normalizeBoardRel(toAssetRef(toDataPath(pathArg || board)));
    if (!/\.svg$/i.test(rel) || isBackupPath(rel)) {
      throw new Error("board/path 必须是 .svg 白板文件（不能是备份文件）");
    }
    if (!withinDir(rel, dir)) throw new Error(`只允许访问 ${dir}/ 下的白板`);
    if (!(await fileExists(rel))) return null;
    return { path: rel, title: titleOf(rel) };
  }
  if (!board) return null;
  const wanted = board.replace(/\.svg$/i, "").toLowerCase();
  const entries = await listBoardEntries(dir);
  const matches = entries.filter((e) => titleOf(e.path).toLowerCase() === wanted);
  if (matches.length === 0) return null;
  const exact = matches.find((e) => titleOf(e.path) === board.replace(/\.svg$/i, ""));
  const hit = exact ?? matches[0];
  return { path: hit.path, title: titleOf(hit.path) };
}

async function readScene(path: string): Promise<KernelScene> {
  const text = await readBoardText(path);
  try {
    const decoded = decodeSvgPayload(text);
    return {
      elements: decoded.elements.filter((el): el is Record<string, unknown> => !!el && typeof el === "object"),
      appState: decoded.appState,
      files: decoded.files,
    };
  } catch (e) {
    throw new Error(`白板解码失败：${e instanceof Error ? e.message : String(e)}`);
  }
}

function boundsOf(elements: Record<string, unknown>[]) {
  return boundingBoxOf(
    elements
      .filter((el) => el && el.isDeleted !== true)
      .map((el) => ({
        x: Number(el.x ?? 0),
        y: Number(el.y ?? 0),
        width: Number(el.width ?? 0),
        height: Number(el.height ?? 0),
        angle: Number(el.angle ?? 0),
        points: Array.isArray(el.points) ? (el.points as Array<[number, number]>) : undefined,
      })),
  );
}

/** 追加落点：现有内容包围盒下方 80px；空白板从原点开始 */
function originOf(scene: KernelScene): { x: number; y: number } {
  const box = boundsOf(scene.elements);
  return box ? { x: box.minX, y: box.maxY + 80 } : { x: 0, y: 0 };
}

async function saveScene(path: string, scene: KernelScene): Promise<void> {
  await writeSvg(path, sceneToSvgHeadless(scene));
}

function planErrorOf(e: unknown): Error {
  if (e instanceof PlanError) return new Error(`计划无效（${e.reason}）：${e.detail ?? e.message}`);
  return e instanceof Error ? e : new Error(String(e));
}

function parsePlanArg(raw: unknown): unknown {
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw);
    } catch {
      throw new Error("plan 是字符串但不是合法 JSON");
    }
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("缺少 plan 对象（nodes/edges/title/preset/layout）");
  }
  return raw;
}

function namedBoard(args: Record<string, unknown>): boolean {
  return ["board", "path"].some((k) => typeof args[k] === "string" && String(args[k]).trim() !== "");
}

/** 风格包目录每次重读：包是用户手改的 JSON，缓存会吃到过期配色 */
async function loadKernelStyles(): Promise<StyleLoadResult> {
  return loadStylePacks({
    list: async () => {
      const rows: DirEntry[] = await readDir(STYLE_DIR);
      return rows.filter((r) => r && r.isDir !== true && /\.json$/i.test(r.name)).map((r) => r.name);
    },
    read: (fileName: string) => readText(`${STYLE_DIR}/${fileName}`),
  });
}

/** style 与计划/CLI 的 --style 同义，preset 保留兼容 */
function styleArgOf(args: Record<string, unknown>): unknown {
  return [args.style, args.preset].find((v) => typeof v === "string" && v.trim() !== "");
}

/* ------------------------------ 列 ------------------------------ */

export async function listBoards(args: Record<string, unknown>, settings: StudioSettings): Promise<Record<string, unknown>> {
  const dir = boardDirOf(settings);
  const query = typeof args.query === "string" ? args.query.trim().toLowerCase() : "";
  const rawLimit = Number(args.limit);
  const limit = Number.isFinite(rawLimit) ? Math.max(1, Math.min(100, Math.floor(rawLimit))) : 50;
  const all = await listBoardEntries(dir);
  const filtered = query
    ? all.filter((e) => e.path.toLowerCase().includes(query) || titleOf(e.path).toLowerCase().includes(query))
    : all;
  const boards = filtered.slice(0, limit).map((e) => ({
    title: titleOf(e.path),
    path: e.path,
    updated: e.updated,
    updatedAt: e.updated ? new Date(e.updated).toISOString() : "",
  }));
  const packs = await loadKernelStyles();
  const styles = listStyles();
  return {
    ok: true,
    dir,
    total: filtered.length,
    boards,
    styles,
    styleWarnings: packs.warnings,
    message:
      `白板库 ${dir}：${filtered.length} 块${query ? `（匹配「${query}」）` : ""}。` +
      `可用风格：${styles.map((s) => s.name).join("/")}` +
      `${packs.warnings.length ? `（${packs.warnings.length} 个风格包没加载上，见 styleWarnings）` : ""}。`,
  };
}

/* ------------------------------ 读 ------------------------------ */

export async function readBoard(args: Record<string, unknown>, settings: StudioSettings): Promise<Record<string, unknown>> {
  const dir = boardDirOf(settings);
  const ref = await findBoard(args, dir);
  if (!ref) throw new Error(`找不到白板：${String(args.board ?? args.path ?? "")}（只认 ${dir}/ 下的 .svg）`);
  const scene = await readScene(ref.path);
  const visible = scene.elements.filter((el) => el && el.isDeleted !== true);
  const texts: string[] = [];
  for (const el of visible) {
    if (typeof el.text === "string" && el.text.trim()) texts.push(clip(el.text.trim(), 300));
  }
  const box = boundsOf(visible);
  return {
    ok: true,
    path: ref.path,
    title: ref.title,
    elementCount: visible.length,
    texts: texts.slice(0, 100),
    bounds: box
      ? { minX: box.minX, minY: box.minY, maxX: box.maxX, maxY: box.maxY, width: box.width, height: box.height }
      : null,
    elements: visible.slice(0, 200).map((el) => ({
      id: String(el.id ?? ""),
      type: String(el.type ?? ""),
      x: Number(el.x ?? 0),
      y: Number(el.y ?? 0),
      width: Number(el.width ?? 0),
      height: Number(el.height ?? 0),
      ...(typeof el.text === "string" ? { text: clip(el.text, 200) } : {}),
      ...(typeof el.fileId === "string" ? { fileId: el.fileId } : {}),
    })),
    message: `「${ref.title}」共 ${visible.length} 个元素。`,
  };
}

/* ------------------------------ 画 ------------------------------ */

export async function drawBoard(args: Record<string, unknown>, settings: StudioSettings): Promise<Record<string, unknown>> {
  const dir = boardDirOf(settings);
  const raw = parsePlanArg(args.plan);
  const packs = await loadKernelStyles();
  const styleRaw = styleArgOf(args);
  let plan: DrawingPlan;
  try {
    plan = normalizePlan(raw, { preset: styleRaw, layout: args.layout });
  } catch (e) {
    throw planErrorOf(e);
  }

  const append = args.append !== false;
  const named = namedBoard(args);
  const existing = append ? await findBoard(args, dir) : null;
  if (append && named && !existing) {
    throw new Error(`找不到白板：${String(args.board ?? args.path ?? "")}（不自动改新建，避免画错板）`);
  }

  let target: BoardRef;
  let scene: KernelScene;
  let rendered: RenderedPlan;
  let created = false;
  if (existing) {
    const old = await readScene(existing.path);
    rendered = renderPlan(plan, {
      origin: originOf(old),
      idPrefix: nextId("kai"),
      preset: styleRaw,
      layout: args.layout,
    });
    scene = composeHeadlessScene(old, rendered);
    target = existing;
  } else {
    const desired = (typeof args.title === "string" && args.title.trim()) || plan.title || "AI 白板";
    const path = await uniqueBoardPath(dir, desired);
    rendered = renderPlan(plan, {
      origin: { x: 0, y: 0 },
      idPrefix: nextId("kai"),
      preset: styleRaw,
      layout: args.layout,
    });
    scene = buildHeadlessScene(rendered);
    target = { path, title: titleOf(path) };
    created = true;
  }

  await saveScene(target.path, scene);
  return {
    ok: true,
    created,
    path: target.path,
    title: target.title,
    nodes: rendered.nodes.length,
    edges: rendered.routes.length,
    preset: rendered.plan.preset,
    layout: rendered.plan.layout,
    warnings: rendered.plan.warnings,
    styleWarnings: packs.warnings,
    message:
      `${created ? "已新建" : "已绘制到"}「${target.title}」：${rendered.nodes.length} 个节点、` +
      `${rendered.routes.length} 条连线（${target.path}）。` +
      (rendered.plan.warnings.length ? ` 忽略 ${rendered.plan.warnings.length} 条计划警告。` : ""),
  };
}

/* ------------------------------ 生图 ------------------------------ */

function dimensionOf(raw: unknown): number | undefined {
  if (raw === undefined || raw === null || raw === "") return undefined;
  const n = Number(raw);
  if (!Number.isFinite(n)) return undefined;
  return Math.max(64, Math.min(4096, Math.round(n)));
}

export async function generateBoardImage(
  args: Record<string, unknown>,
  settings: StudioSettings,
): Promise<Record<string, unknown>> {
  const dir = boardDirOf(settings);
  const prompt = typeof args.prompt === "string" ? args.prompt : "";
  const size = typeof args.size === "string" && args.size.trim() ? args.size.trim() : undefined;
  const image = await generateImage(
    {
      baseUrl: settings.imageBaseUrl,
      model: settings.imageModel,
      apiKey: settings.imageApiKey,
      size: settings.imageSize,
    },
    prompt,
    createKernelProxy(),
    { size },
  );

  const append = args.append !== false;
  const named = namedBoard(args);
  const existing = append ? await findBoard(args, dir) : null;
  if (append && named && !existing) {
    throw new Error(`找不到白板：${String(args.board ?? args.path ?? "")}（不自动改新建，避免插错板）`);
  }

  const path =
    existing?.path ??
    (await uniqueBoardPath(dir, (typeof args.title === "string" && args.title.trim()) || "AI 图片"));
  const old = existing ? await readScene(existing.path) : null;
  const origin = old ? originOf(old) : { x: 0, y: 0 };
  const width = dimensionOf(args.width) ?? image.width;
  const height = dimensionOf(args.height) ?? image.height;
  const fileId = nextId("kimg");
  const element = makeElement({
    type: "image",
    fileId,
    x: origin.x,
    y: origin.y,
    width,
    height,
  });
  const files = {
    ...(old?.files ?? {}),
    [fileId]: { id: fileId, mimeType: image.mime, dataURL: image.dataURL, created: Date.now() },
  };
  const scene = appendHeadlessElements(old, [element], files);
  if (!scene.appState.viewBackgroundColor) scene.appState.viewBackgroundColor = "#ffffff";

  await saveScene(path, scene);
  const bytes = Math.floor((image.base64.length * 3) / 4);
  return {
    ok: true,
    created: !existing,
    path,
    title: titleOf(path),
    imageId: fileId,
    width,
    height,
    mime: image.mime,
    bytes,
    revisedPrompt: image.revisedPrompt ?? "",
    message: `${existing ? "已插入" : "已新建并插入"}图片到「${titleOf(path)}」：${width}×${height}（${path}）。`,
  };
}
