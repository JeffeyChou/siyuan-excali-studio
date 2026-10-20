/**
 * 第二十九/三十轮：图形模板库（Stencil Library）纯逻辑——对标 Obsidian
 * Excalidraw 的 StencilLibraryManager，**只抄设计不抄代码**（AGPL）。
 *
 * 设计：Library 面板（vendor 自带）的持久层从「单个大 JSON」换成「一个文件夹下的
 * 多个 .excalidrawlib 文件」。打开面板 = 合并文件夹全部库文件；在面板里增删改 =
 * diff 后回写各自的源文件（新增进本地库 local.excalidrawlib，改动写回它来自的文件）。
 * 模板因此变成普通文件：跟思源多端同步、可按主题拆分、可直接分发模板包。
 *
 * 本文件只做纯计算（解析 / 合并 / diff 计划），文件读写留在宿主 index.ts——
 * 单测可以直接喂数据，不碰思源 API。
 */

/** 库文件扩展名（与 vendor/excalidraw.com 的 .excalidrawlib 同格式） */
export const LIB_EXT = ".excalidrawlib";

/** 本地库文件名：面板里「新增/另存」的条目都落这里 */
export const LOCAL_LIB_NAME = `local${LIB_EXT}`;

export function isLibFileName(name: string): boolean {
  return name.toLowerCase().endsWith(LIB_EXT);
}

/**
 * 容错解析一份库文件文本：libraryItems / library / 裸数组 / 坏 JSON → 归一化条目。
 * 归一化规则见 normalizeLibItems（vendor restoreLibraryItems 同款 + 两条自有纪律）。
 */
export function parseLibFile(text: string): unknown[] {
  let raw: unknown[] = [];
  try {
    const data = JSON.parse(text) as unknown;
    if (Array.isArray(data)) {
      raw = data;
    } else if (data && typeof data === "object") {
      const o = data as { libraryItems?: unknown; library?: unknown };
      if (Array.isArray(o.libraryItems)) raw = o.libraryItems;
      else if (Array.isArray(o.library)) raw = o.library;
    }
  } catch {
    // 坏档按空库处理（与宿主的读失败口径一致）
  }
  return normalizeLibItems(raw);
}

/**
 * 2026-10-19：库条目归一化——把各年代格式统一成 v2 条目 {id, status, elements, created}。
 * 口径对齐 vendor 0.18.1 的 restoreLibraryItems（chunk-K2UTITRG.js 的 Lp/Tp 逐字核过）：
 *   - 数组条目（v1：官方素材库站的文件就是 library:[[元素,元素],…]）→ 包成 v2 item；
 *   - 对象条目 → 补 id/status/created 缺省；
 *   - 恢复不出任何合法元素的条目整条丢弃（vendor 的 Tp 同样丢）。
 * 两条自有纪律（vendor 没有、但我们踩过的坑）：
 *   ① **确定性 id**：v1 条目没有 id，若学 vendor 发随机 id，「同一份库重复导入」
 *      将永远去重不掉（id 每次不同）。改用元素内容（id+versionNonce 排序拼接）
 *      派生 id——同内容同 id，跨进程（落地页/studio）稳定；
 *   ② **数字键怪胎回收**：本插件曾把 v1 数组当对象展开，写出
 *      {"0":{…元素…},"status":…} 这种没有 elements 的怪胎（vendor 直接丢弃 =
 *      「导入成功但面板空空如也」）。对象条目没有 elements 但 0/1/2… 键下是元素时，
 *      按数字序回收成正常条目——读一次即自愈。
 */

/** 元素的内容签名（id + versionNonce；缺省按空串，稳定优先） */
function elementSignature(el: unknown): string {
  if (!el || typeof el !== "object") return "";
  const o = el as { id?: unknown; versionNonce?: unknown };
  return `${typeof o.id === "string" ? o.id : ""}:${typeof o.versionNonce === "number" ? o.versionNonce : ""}`;
}

/** 元素数组的确定性 id：FNV-1a 双 32bit 拼 64bit 十六进制（同内容同 id） */
export function deriveItemId(elements: unknown[]): string {
  const sig = elements.map(elementSignature).sort().join("|");
  let h1 = 0x811c9dc5;
  let h2 = 0x811c9dc5;
  for (let i = 0; i < sig.length; i++) {
    const c = sig.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0;
    h2 = Math.imul(h2 ^ c, 0x85ebca6b) >>> 0;
  }
  return `lib-${h1.toString(16).padStart(8, "0")}${h2.toString(16).padStart(8, "0")}`;
}

/** 像不像一个元素：对象且有字符串 type（vendor 元素的最小可识别面） */
function isElementLike(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && typeof (v as { type?: unknown }).type === "string";
}

/** 数字键怪胎回收：{"0":元素,"1":元素,…} → [元素,元素,…]（按数字序，只收元素） */
function numericKeyElements(o: Record<string, unknown>): unknown[] {
  return Object.keys(o)
    .filter((k) => /^\d+$/.test(k))
    .sort((a, b) => Number(a) - Number(b))
    .map((k) => o[k])
    .filter(isElementLike);
}

/**
 * 归一化一组原始条目（parseLibFile 的输出、落盘前都应过一遍）。
 * defaultStatus 只补给没有 status 的条目（官方导入语义 = published）。
 */
export function normalizeLibItems(raw: unknown[], defaultStatus = "published"): unknown[] {
  const out: unknown[] = [];
  for (const entry of raw) {
    if (Array.isArray(entry)) {
      // v1 条目：裸元素数组 → 包成 v2 item（确定性 id，重复导入可去重）
      const elements = entry.filter(isElementLike);
      if (elements.length === 0) continue;
      out.push({ id: deriveItemId(elements), status: defaultStatus, elements, created: Date.now() });
      continue;
    }
    if (entry && typeof entry === "object") {
      const o = entry as Record<string, unknown>;
      if (Array.isArray(o.elements)) {
        // v2 条目：补缺省（已有值原样保留——反复解析幂等）
        const elements = (o.elements as unknown[]).filter(isElementLike);
        if (elements.length === 0) continue;
        out.push({
          ...o,
          elements,
          id: typeof o.id === "string" && o.id !== "" ? o.id : deriveItemId(elements),
          status: typeof o.status === "string" ? o.status : defaultStatus,
          created: typeof o.created === "number" ? o.created : Date.now(),
        });
        continue;
      }
      // 数字键怪胎（旧 bug 产物）→ 回收元素再包成 v2 item
      const recovered = numericKeyElements(o);
      if (recovered.length > 0) {
        out.push({ id: deriveItemId(recovered), status: defaultStatus, elements: recovered, created: Date.now() });
      }
      continue;
    }
    // 其余（null/标量）丢弃
  }
  return out;
}

/** 序列化一份库文件（2 空格缩进，与 vendor/官方工具的排版一致，diff 友好） */
export function serializeLibFile(items: unknown[], source = "siyuan-excali-studio"): string {
  return JSON.stringify({ type: "excalidrawlib", version: 2, source, libraryItems: items }, null, 2);
}

/** 条目 id；缺 id 的条目返回 null（不参与跨文件去重/归属） */
export function itemIdOf(item: unknown): string | null {
  if (item && typeof item === "object") {
    const id = (item as { id?: unknown }).id;
    if (typeof id === "string" && id !== "") return id;
  }
  return null;
}

/** 合并后的库状态：items 是面板可见的全集，sourceOf 记每个 id 来自哪个文件 */
export interface MergedLibrary {
  items: unknown[];
  sourceOf: Map<string, string>;
  /** 各源文件的原始条目（diff 的基线） */
  byPath: Map<string, unknown[]>;
}

/**
 * 合并多份库文件。files 必须已按「本地文件优先」排序：
 * - 同 id 冲突：先到先得（本地赢），后来的告警跳过；
 * - 非本地文件的条目标 status:"published"（语义 = 共享来的）；
 * - 无 id 条目照单全收（不去重、无归属，diff 时按「本地新增」处理）。
 */
export function mergeLibFiles(files: { path: string; items: unknown[] }[]): MergedLibrary {
  const items: unknown[] = [];
  const sourceOf = new Map<string, string>();
  const byPath = new Map<string, unknown[]>();
  const localPath = files[0]?.path ?? "";
  for (const file of files) {
    byPath.set(file.path, file.items);
    const isLocal = file.path === localPath;
    for (const item of file.items) {
      const id = itemIdOf(item);
      if (id !== null && sourceOf.has(id)) {
        console.warn(`[excali-studio] 模板库条目 id 重复（${id}，来自 ${file.path}），保留先到的一份`);
        continue;
      }
      if (id !== null) sourceOf.set(id, file.path);
      items.push(isLocal ? item : { ...(item as object), status: "published" });
    }
  }
  return { items, sourceOf, byPath };
}

/**
 * 纯 diff：对面板里的下一版条目集，算出每个受影响文件的完整条目集。
 * 语义对齐 Obsidian persistChanges：
 * - 条目被删或内容变了 → 它的**源文件**受影响（改写/移除都发生在源文件里）；
 * - 新增（有新 id 或无 id）→ 落本地库文件；
 * - 受影响文件的新条目集 = 磁盘原条目里「仍归本文件管的」+ 变更版；本地文件再 unshift 新增；
 * - 非本地文件写回时统一补 status:"published"。
 * 返回按路径排序的写入计划（host 据此写盘；空数组的文件 = 该删除）。
 */
export function planLibraryWrites(
  merged: MergedLibrary,
  next: unknown[],
  localPath: string,
): Array<{ path: string; items: unknown[] }> {
  const nextById = new Map<string, unknown>();
  const additions: unknown[] = [];
  for (const item of next) {
    const id = itemIdOf(item);
    if (id === null) {
      additions.push(item);
      continue;
    }
    if (!merged.sourceOf.has(id)) additions.push(item);
    nextById.set(id, item);
  }

  const affected = new Set<string>();
  for (const item of merged.items) {
    const id = itemIdOf(item);
    const source = (id !== null && merged.sourceOf.get(id)) || localPath;
    const nextItem = id !== null ? nextById.get(id) : undefined;
    // 变了或被删 → 源文件受影响；没变的不动（少写一个文件是一次少一份同步噪音）
    if (!nextItem || JSON.stringify(nextItem) !== JSON.stringify(item)) affected.add(source);
  }
  if (additions.length > 0) affected.add(localPath);

  const writes: Array<{ path: string; items: unknown[] }> = [];
  for (const path of [...affected].sort()) {
    const disk = merged.byPath.get(path) ?? [];
    const result: unknown[] = [];
    for (const diskItem of disk) {
      const id = itemIdOf(diskItem);
      // 不是本文件管的条目（异常态）原样保留，绝不误删别人的
      if (id !== null && merged.sourceOf.get(id) !== path) {
        result.push(diskItem);
        continue;
      }
      const nextItem = id !== null ? nextById.get(id) : undefined;
      if (!nextItem) continue; // 已删除
      result.push(path === localPath ? nextItem : { ...(nextItem as object), status: "published" });
    }
    if (path === localPath) {
      for (const addition of additions) result.unshift(addition);
    }
    writes.push({ path, items: result });
  }
  return writes;
}
