/**
 * 2026-10-18 B'：素材库「Add to Excalidraw」落地页（浏览器独立页，不是插件运行时）。
 *
 * 背景（调研实锤，见 README「素材库导入」）：
 * - Obsidian Excalidraw 的 libraryReturnUrl="app://obsidian.md" 想接这个按钮，
 *   但 app:// 深链不会被 OS 路由回运行中的 Obsidian——社区文档明说该按钮
 *   「仅适用于 Excalidraw 在线版」，Obsidian 实际走 Download → Open/Load。
 * - 思源有两个 Obsidian 没有的先天条件（本轮实测）：① 内核把插件静态文件挂在
 *   http://127.0.0.1:6806/plugins/<插件>/ 下，外部浏览器可直接加载；
 *   ② /api/file/* 免鉴权（无 token / 错 token / 带 Origin 均 200）。
 *   于是把 libraryReturnUrl 指向本页，浏览器点完按钮真的能跳回来。
 *
 * 链路：白板组件库面板点「Browse libraries」→ 素材库站（referrer=本页 URL）
 *   → 点「Add to Excalidraw」→ 跳回本页（#addLibrary=<库URL>）→ 本页 fetch 库文件、
 *   与现有图库去重、新增项写入本地库 local.excalidrawlib → 用户回思源即用。
 *
 * 边界纪律：本模块只 import 纯模块（library-import / stencil），不碰 vendor、
 * 不碰 siyuan——node 测试可直接 import 单测纯函数；DOM 引导在 main() 里，
 * 顶层 if 守卫保证 import 即安全。
 *
 * 文件 API 口径复刻自 studio/storage.ts（putTextFile/getFileText/listFilesWithExt），
 * 不直接 import 它：storage → scene-codec → pako，会把压缩库拖进这个本该轻量的
 * 落地页产物。三处 fetch 的 wire format 与 storage.ts 逐字对应，smoke-wiring 有断言。
 */

import { parseLibraryInput } from "./studio/library-import.ts";
import {
  LIB_EXT,
  LOCAL_LIB_NAME,
  itemIdOf,
  parseLibFile,
  serializeLibFile,
} from "./studio/stencil.ts";

/**
 * 默认图库目录。页面读不到插件设置（插件数据在 conf/data/ 下，不在 /data/
 * 里，没有 HTTP 端点可读）——故由 libraryReturnUrl 的 dir 参数把库目录带进来
 * （StudioApp 点击「Browse libraries」时从 settings.saveDir 实时算）。
 * 与 settings.ts 的 DEDICATED_BOARD_DIR + "/excali-libraries" 对齐。
 */
export const DEFAULT_LIB_DIR = "assets/excali/excali-libraries";

/** 归一化到 /data/...（与 storage.ts toDataPath 同口径：/data/x 原样、data/x 补斜杠、x 加 /data/） */
export function toDataPath(relative: string): string {
  const p = relative.replace(/^\/+/, "");
  if (p === "data" || p.startsWith("data/")) return `/${p}`;
  return `/data/${p}`;
}

/** dir 参数 → 工作空间相对目录；空/非法回落默认目录。防目录穿越（禁 .. 与绝对化） */
export function resolveLibDir(dirParam: string | null | undefined): string {
  const raw = (dirParam ?? "").trim();
  if (raw === "") return DEFAULT_LIB_DIR;
  const cleaned = raw.replace(/\\/g, "/").replace(/^\/+/, "").replace(/\/+$/, "");
  if (cleaned === "" || cleaned.split("/").includes("..") || cleaned.startsWith("data/")) {
    return DEFAULT_LIB_DIR;
  }
  return cleaned;
}

/** 本地库文件的工作空间相对路径（与宿主 localLibRel 同口径：<目录>/local.excalidrawlib） */
export function localLibPath(dir: string): string {
  return `${dir.replace(/\/+$/, "")}/${LOCAL_LIB_NAME}`;
}

/**
 * 落地页 URL 参数：素材库站按钮生成 `<referrer>#addLibrary=<URL 编码的库URL>&token=…`
 * （useHash=true）；dir 由我们自己的 libraryReturnUrl 带在 query 上。
 * 同时兼容 query 形态（?addLibrary=，官方站跳转时的旧形态）。
 */
export function parseLandingParams(
  hash: string,
  search: string,
): { addLibrary: string | null; dir: string | null } {
  const h = new URLSearchParams(hash.replace(/^#/, ""));
  const q = new URLSearchParams(search.replace(/^\?/, ""));
  return {
    addLibrary: h.get("addLibrary") ?? q.get("addLibrary"),
    dir: q.get("dir"),
  };
}

/** 条目的去重签名：有 id 用 id，无 id 用整条 JSON（官方库都有 id；兜底防重复导入） */
export function itemSignature(item: unknown): string {
  const id = itemIdOf(item);
  return id !== null ? `id:${id}` : `json:${JSON.stringify(item)}`;
}

/**
 * 导入计划（纯计算）：进来的条目与「现有全部库文件合并后的签名集」去重，
 * 只把新增项追加进本地库文件；官方导入语义（defaultStatus:"published"）——
 * 无 status 的新项补 published（与 LibraryImportDialog 的 updateLibrary 口径一致）。
 * 返回新增数量 + 本地库文件的新内容（null = 没有可写的）。
 */
export function planImport(
  incoming: unknown[],
  existingSignatures: Set<string>,
  localItems: unknown[],
): { newCount: number; localNext: unknown[] | null } {
  const next = [...localItems];
  let newCount = 0;
  for (const item of incoming) {
    if (existingSignatures.has(itemSignature(item))) continue;
    const sig = itemSignature(item);
    existingSignatures.add(sig); // 同一批里的重复也只进一次
    newCount++;
    const withStatus =
      item && typeof item === "object" && !("status" in item)
        ? { ...(item as object), status: "published" }
        : item;
    next.push(withStatus);
  }
  return { newCount, localNext: newCount > 0 ? next : null };
}

/* ---------------- DOM 引导（仅浏览器执行；node import 本模块时跳过） ---------------- */

/** 三个文件 API：wire format 与 studio/storage.ts 逐字对应（见文件头说明） */
async function apiReadDir(dirRel: string): Promise<string[]> {
  const res = await fetch("/api/file/readDir", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path: toDataPath(dirRel) }),
  });
  const json = (await res.json().catch(() => null)) as
    | { code?: number; msg?: string; data?: Array<{ name?: string; isDir?: boolean }> }
    | null;
  // readDir 失败也是 HTTP 200 + code!==0（目录不存在 = code 404）
  if (!json || json.code !== 0 || !Array.isArray(json.data)) return [];
  return json.data
    .filter((r) => r && r.isDir !== true && typeof r.name === "string")
    .map((r) => r.name as string)
    .filter((name) => name.toLowerCase().endsWith(LIB_EXT));
}

async function apiGetText(fileRel: string): Promise<string> {
  const res = await fetch("/api/file/getFile", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path: toDataPath(fileRel) }),
  });
  // 失败回 JSON（且状态码可能是 202）——按 content-type 分流，不能无脑当正文
  if ((res.headers.get("content-type") || "").includes("application/json")) {
    const json = (await res.json().catch(() => null)) as { msg?: string } | null;
    throw new Error(json?.msg || `getFile HTTP ${res.status}`);
  }
  if (!res.ok) throw new Error(`getFile HTTP ${res.status}`);
  return res.text();
}

async function apiPutText(fileRel: string, text: string): Promise<void> {
  const path = toDataPath(fileRel);
  const form = new FormData();
  form.append("path", path);
  form.append("isDir", "false");
  form.append("file", new Blob([text], { type: "application/json;charset=utf-8" }), path.split("/").pop() || "x.json");
  const res = await fetch("/api/file/putFile", { method: "POST", body: form });
  const json = (await res.json().catch(() => null)) as { code?: number; msg?: string } | null;
  if (!res.ok || !json || json.code !== 0) {
    throw new Error(json?.msg || `putFile HTTP ${res.status}`);
  }
}

function el(id: string): HTMLElement {
  const node = document.getElementById(id);
  if (!node) throw new Error(`页面缺少 #${id}`);
  return node;
}

function show(state: string, detailHtml: string, actions: "import" | "none" = "none"): void {
  el("state").textContent = state;
  el("detail").innerHTML = detailHtml;
  el("actions").hidden = actions !== "import";
}

/** 主流程：hash 带 addLibrary → 自动解析；否则展示手动粘贴框 */
async function main(): Promise<void> {
  const params = parseLandingParams(location.hash, location.search);
  const dir = resolveLibDir(params.dir);
  el("dir").textContent = dir;

  if (params.addLibrary) {
    await runImport(params.addLibrary, dir);
    return;
  }
  // 直接打开本页（没有 addLibrary）：手动粘贴入口（三种形态复用方案 A 的解析器）
  el("manual").hidden = false;
  show("请粘贴素材库链接", "支持「Add to Excalidraw」跳转后的地址栏链接、.excalidrawlib 直链。");
  const input = el("manual-url") as HTMLInputElement;
  const go = async () => {
    const raw = input.value.trim();
    if (raw === "") return;
    await runImport(raw, dir);
  };
  el("btn-manual").addEventListener("click", () => void go());
  input.addEventListener("keydown", (e) => {
    if ((e as KeyboardEvent).key === "Enter") void go();
  });
}

/** 拉取库文件 → 去重 → 预览确认 → 写本地库。raw 是 addLibrary 参数值或用户粘贴的整条 URL */
async function runImport(raw: string, dir: string): Promise<void> {
  el("manual").hidden = true;
  let target;
  try {
    // URLSearchParams.get 已解一次码；站点偶发双编码，还像编码串就再解一次
    const value = raw.includes("%") ? decodeURIComponent(raw) : raw;
    target = parseLibraryInput(value);
  } catch {
    show("链接无法识别", "请从素材库站点点「Add to Excalidraw」后复制地址栏链接，或复制「Download」按钮的 .excalidrawlib 直链。");
    return;
  }
  if (target.kind !== "remote") {
    show("该链接不是远程素材库", "本地 .excalidrawlib 文件请在思源白板内导入（☰ 菜单 → 导入素材库… → 选择文件）。");
    return;
  }

  show("正在读取素材库…", escapeHtml(target.libraryUrl));
  let incoming: unknown[];
  try {
    const res = await fetch(target.libraryUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    incoming = parseLibFile(await res.text());
  } catch (e) {
    show("素材库读取失败", `${escapeHtml(target.libraryUrl)}<br><br>${escapeHtml(errText(e))}`);
    return;
  }
  if (incoming.length === 0) {
    show("这个素材库是空的", "文件里没有可导入的条目。");
    return;
  }

  // 现有库：目录全部 .excalidrawlib 合并（本地文件排最前=优先），只用于去重
  const localRel = localLibPath(dir);
  let existingSignatures = new Set<string>();
  let localItems: unknown[] = [];
  try {
    const names = await apiReadDir(dir);
    const ordered = [...names].sort((a, b) =>
      a.toLowerCase() === LOCAL_LIB_NAME ? -1 : b.toLowerCase() === LOCAL_LIB_NAME ? 1 : a.localeCompare(b),
    );
    for (const name of ordered) {
      const items = parseLibFile(await apiGetText(`${dir}/${name}`));
      if (name.toLowerCase() === LOCAL_LIB_NAME) localItems = items;
      for (const item of items) existingSignatures.add(itemSignature(item));
    }
  } catch (e) {
    // 读已有库失败不阻塞导入（按空库处理）；写回时只动本地文件，不覆盖别人的
    console.warn("[excali-studio] 落地页读取现有图库失败，按空库处理", e);
  }

  const { newCount, localNext } = planImport(incoming, existingSignatures, localItems);
  const host = safeHost(target.libraryUrl);
  if (localNext === null) {
    show("这些素材已经在库里了", `来源：${escapeHtml(host)}，共 ${incoming.length} 个条目，无需重复导入。<br><br>可以关闭此页，回到思源白板窗口即可在组件库面板使用。`);
    return;
  }

  show(
    `发现 ${newCount} 个新素材`,
    `来源：${escapeHtml(host)}（共 ${incoming.length} 个条目，其中 ${newCount} 个不在当前图库中）。<br>将写入：${escapeHtml(localRel)}`,
    "import",
  );
  el("btn-import").addEventListener("click", () => {
    void (async () => {
      el("btn-import").setAttribute("disabled", "true");
      el("btn-cancel").setAttribute("disabled", "true");
      try {
        await apiPutText(localRel, serializeLibFile(localNext));
        show("导入完成", `已写入 ${newCount} 个新素材到 ${escapeHtml(localRel)}。<br><br>可以关闭此页——回到思源白板窗口，素材库会自动合并进组件库面板；若没看到，点白板 ☰ 菜单 →「刷新素材库」。`);
      } catch (e) {
        show("写入失败", escapeHtml(errText(e)));
        el("btn-import").removeAttribute("disabled");
        el("btn-cancel").removeAttribute("disabled");
      }
    })();
  });
  el("btn-cancel").addEventListener("click", () => {
    show("已取消", "没有写入任何文件。可以关闭此页。");
  });
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c,
  );
}

function errText(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

function safeHost(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

if (typeof document !== "undefined" && typeof location !== "undefined") {
  void main().catch((e) => {
    console.error("[excali-studio] 素材库落地页异常", e);
    try {
      show("页面异常", escapeHtml(errText(e)));
    } catch {
      /* 页面结构缺失就只剩 console */
    }
  });
}
