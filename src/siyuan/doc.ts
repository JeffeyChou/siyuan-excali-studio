/**
 * 与编辑器打交道的一段：找出「当前正在写的文档」、把图片块追加进指定文档、
 * 刷新已显示的图。
 *
 * 为什么不能直接用 getAllEditor() 的最后一个：
 * 思源可以开多个页签，getAllEditor() 的顺序不保证等于「用户最后停留的那个」，
 * 所以以 switch-protyle / click-editorcontent 事件记录下来的为准，
 * 事件里的 IProtyle 断连（页签关闭）后再退回 getAllEditor()。
 */

import { getAllEditor, type IProtyle, type Plugin } from "siyuan";
import { t } from "../i18n";
import { assetWebPath, fromAssetRef } from "../studio/storage.ts";

let lastProtyle: IProtyle | null = null;

export function trackEditor(plugin: Plugin): void {
  plugin.eventBus.on("switch-protyle", ({ detail }) => {
    lastProtyle = detail.protyle;
  });
  plugin.eventBus.on("click-editorcontent", ({ detail }) => {
    lastProtyle = detail.protyle;
  });
}

export function activeProtyle(): IProtyle | null {
  if (lastProtyle?.wysiwyg?.element?.isConnected) return lastProtyle;
  const editors = getAllEditor();
  for (let i = editors.length - 1; i >= 0; i--) {
    const p = editors[i].protyle;
    if (p?.wysiwyg?.element?.isConnected) return p;
  }
  return null;
}

/** SQL 字符串字面量转义：单引号翻倍 */
export function sq(s: string): string {
  return s.replace(/'/g, "''");
}

/** 思源内核 JSON API（HTTP 200 + code!==0 也算失败，必须自己判） */
async function kernelJson(path: string, body: unknown): Promise<{ msg?: string; data?: unknown }> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json().catch(() => null)) as { code?: number; msg?: string; data?: unknown } | null;
  if (!res.ok || !json || json.code !== 0) throw new Error(json?.msg || `${path} HTTP ${res.status}`);
  return json;
}

/**
 * 新建一篇文档（.sy），返回文档块 id。
 * 注意：新文档要等内核索引才可查 ⇒ 后续一律用返回值，不 SQL 反查。
 * 真机实测需要约 360ms 延迟才能被 SQL 查到（re-todo 踩过的坑）。
 */
export async function createDocWithMd(notebook: string, path: string, markdown: string): Promise<string> {
  const json = await kernelJson("/api/filetree/createDocWithMd", { notebook, path, markdown });
  const data = json.data as { blockID?: string } | undefined;
  if (!data?.blockID) throw new Error("createDocWithMd 未返回 blockID");
  return data.blockID;
}

/** /api/query/sql；stmt 里的用户输入先过 sq() */
export async function querySql<T = Record<string, unknown>>(stmt: string): Promise<T[]> {
  const json = await kernelJson("/api/query/sql", { stmt });
  return Array.isArray(json.data) ? (json.data as T[]) : [];
}

/** 追加一个图片块到指定文档末尾；返回新块 id（拿不到时为空串） */
export async function appendImageBlock(rootID: string, ref: string, alt: string): Promise<string> {
  const markdown = `![${alt}](${ref})`;
  const json = await kernelJson("/api/block/appendBlock", { dataType: "markdown", data: markdown, parentID: rootID });
  const data = json.data as { doOperations?: { action?: string; id?: string }[] }[] | undefined;
  return data?.[0]?.doOperations?.find((op) => op.action === "insert")?.id ?? "";
}

/** 设置块属性：{ name: value }，一次可设多个 */
export async function setBlockAttrs(id: string, attrs: Record<string, string>): Promise<void> {
  await kernelJson("/api/attr/setBlockAttrs", { id, attrs });
}

/**
 * 第二十五轮：文件搬家后，把正文里对旧资源路径的引用改成新路径。
 * 建档文档里有一张 `![标题](assets/xxx.svg)` 图片块——只改 custom-excali-svg
 * 属性不够，图片块还盯着旧路径。按 blocks.content LIKE 找候选（图片路径就在
 * content 里），再 getBlockKramdown → 替换 → updateBlock；单块失败只记日志，
 * 不挡迁移/改名主流程。返回改到的块数。
 */
export async function rewriteAssetRefs(oldRef: string, newRef: string): Promise<number> {
  if (!oldRef || !newRef || oldRef === newRef) return 0;
  // LIKE 里的 % _ \ 要转义（文件名里的下划线是通配符，不转义会误伤大片块）
  const pattern = `%${oldRef.replace(/[\\%_]/g, "\\$&")}%`;
  const rows = await querySql<{ id: string }>(
    `SELECT id FROM blocks WHERE content LIKE '${sq(pattern)}' ESCAPE '\\'`,
  );
  let changed = 0;
  for (const row of rows) {
    try {
      const json = await kernelJson("/api/block/getBlockKramdown", { id: row.id });
      const kramdown = (json.data as { kramdown?: unknown } | undefined)?.kramdown;
      if (typeof kramdown !== "string" || !kramdown.includes(oldRef)) continue;
      await kernelJson("/api/block/updateBlock", {
        id: row.id,
        dataType: "markdown",
        data: kramdown.split(oldRef).join(newRef),
      });
      changed++;
    } catch (e) {
      console.warn("[excali-studio] 更新资源引用失败（忽略）", row.id, e);
    }
  }
  return changed;
}

/**
 * 2026-10-17 第十八轮：删除文档（/api/filetree/removeDoc）。
 * 白板行「删除」清存档文档用。思源是真实删除、没有回收站——
 * 调用方负责先弹确认框列清删什么。
 */
export async function removeDoc(docId: string): Promise<void> {
  await kernelJson("/api/filetree/removeDoc", { id: docId });
}

/**
 * 从当前活动文档获取 notebook ID。
 * 用于首次保存时创建文档（需要知道往哪个笔记本里建）。
 * 通过 SQL 查 blocks 表的 box 字段获取。
 */
export async function currentNotebook(): Promise<string | null> {
  const p = activeProtyle();
  const rootID = p?.block?.rootID;
  if (!rootID) return null;
  const rows = await querySql<{ box: string }>(`SELECT box FROM blocks WHERE id = '${sq(rootID)}' LIMIT 1`);
  return rows[0]?.box || null;
}

/**
 * 2026-10-16 第十七轮·批1：JOIN attributes 查白板文档列表。
 * 返回所有绑定了 custom-excali-svg 属性的文档块：{id, content(title), hpath, updated, svg}。
 * updated 是内核的 yyyymmddHHMMSS 整数；用于 dock 白板库刷新 + 文档树菜单注入的白名单。
 * 2026-10-17 第二十四轮：**别再 SELECT b.refs**——当前内核（3.6.x）的 blocks 表
 * 没有 refs 列，带上它整条 SQL 报 "no such column: b.refs"，一抛就把整个白板库
 * 刷新链路打死（真机实锤：重启后库空、白板「消失」）。toBoardDocItem 的 refs
 * 缺输入自然归 0，countBacklinks 纯函数留着备用（哪天内核恢复这列再接上）。
 */
export async function listBoardDocs(): Promise<
  Array<{ id: string; content: string; hpath: string; updated: number; refs: string; svg: string }>
> {
  const rows = await querySql<{ id: string; content: string; hpath: string; updated: unknown; svg: unknown }>(
    `SELECT b.id, b.content, b.hpath, b.updated, a.value AS svg
     FROM blocks b
     INNER JOIN attributes a ON a.block_id = b.id AND a.name = 'custom-excali-svg'
     WHERE b.type = 'd'
     ORDER BY b.updated DESC`,
  );
  return rows.map((r) => ({
    id: r.id,
    content: r.content || "",
    hpath: r.hpath || "",
    updated: Number(r.updated) || 0,
    refs: "",
    svg: typeof r.svg === "string" ? r.svg : "",
  }));
}

/** 块属性全集（自动开画板时给缓存没命中的文档兜底查一次） */
export async function getBlockAttrs(id: string): Promise<Record<string, string>> {
  const json = await kernelJson("/api/attr/getBlockAttrs", { id });
  const attrs = (json.data as { attrs?: unknown } | undefined)?.attrs;
  return attrs && typeof attrs === "object" ? (attrs as Record<string, string>) : {};
}

/**
 * 工作空间第一个笔记本 id。
 * 建档的 notebook 优先取当前文档所在的（currentNotebook），dock 上点收编时
 * 可能根本没有聚焦的编辑器，退回这里——取不到就没法建档，调用方负责提示。
 */
export async function firstNotebook(): Promise<string | null> {
  const json = await kernelJson("/api/notebook?listNotebooks", {});
  const rows = json.data as Array<{ id?: unknown }> | undefined;
  const row = Array.isArray(rows) ? rows.find((r) => typeof r?.id === "string" && r.id !== "") : undefined;
  return typeof row?.id === "string" ? row.id : null;
}

/**
 * 覆盖保存之后，把页面上已经在显示的同一张图重新拉一次。
 *
 * 思源给 /assets/* 发的是长缓存（immutable），文件内容变了但 URL 没变，
 * 浏览器会继续用旧图 —— 所以给 img.src 挂上 `?t=` 破缓存，**只改 DOM 不改 markdown**：
 * 文档里存的仍是干净的 assets/xxx.svg，下次重新打开自然拿到新内容。
 */
export function refreshAssetImages(dataPath: string): number {
  const want = assetWebPath(dataPath);
  let count = 0;
  document.querySelectorAll<HTMLImageElement>("img").forEach((img) => {
    let url: URL;
    try {
      url = new URL(img.src, location.href);
    } catch {
      return;
    }
    if (decodeURIComponent(url.pathname) !== want) return;
    url.searchParams.set("t", String(Date.now()));
    img.src = url.href;
    count++;
  });
  return count;
}

/** img 的 src → 工作空间 /data 路径；不是 /assets/ 下的资源返回 null */
export function assetPathFromSrc(src: string): string | null {
  let url: URL;
  try {
    url = new URL(src, location.href);
  } catch {
    return null;
  }
  const path = decodeURIComponent(url.pathname);
  if (!path.startsWith("/assets/")) return null;
  return fromAssetRef(path.replace(/^\/+/, ""));
}

/** 块元素里第一张 assets/*.svg 图片 → /data 路径；没有就返回 null（块图标菜单判定用） */
export function svgAssetPathOf(blockElements: HTMLElement[]): string | null {
  for (const block of blockElements) {
    const img = block.tagName === "IMG" ? (block as HTMLImageElement) : block.querySelector("img");
    if (!img) continue;
    const path = assetPathFromSrc(img.getAttribute("src") || img.dataset.src || "");
    if (path && /\.svg$/i.test(path)) return path;
  }
  return null;
}
