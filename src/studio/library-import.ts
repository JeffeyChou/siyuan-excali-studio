/**
 * 2026-10-18 方案 A：素材库链接导入的输入解析（纯逻辑，可单测）。
 *
 * 背景（调研实锤）：libraries.excalidraw.com 的「Add to Excalidraw」按钮生成的
 * 是 `https://excalidraw.com?addLibrary=<URL 编码的库文件地址>&token=<CSRF>`
 * （从官方站跳过去时是 `#addLibrary=` hash 形态）。该 URL 只有 excalidraw.com
 * 自己接得住（App 内 hashchange effect → fetch → updateLibrary）；Excali Studio
 * 是数据隔离的本地应用，点按钮只会把库装进官方网页版。
 * 方案 A = 用户把浏览器地址栏里的 addLibrary URL（或 Download 按钮的
 * .excalidrawlib 直链）粘贴进插件的导入框，这里负责从三种形态里解出真正的
 * 库文件 URL：
 *   ① `https://excalidraw.com?addLibrary=https%3A%2F%2F...excalidrawlib`（query 形态）
 *   ② `https://excalidraw.com#addLibrary=...`（hash 形态）
 *   ③ `https://libraries.excalidraw.com/libraries/<作者>/<库>.excalidrawlib`（裸直链）
 * 本地 .excalidrawlib 文件不走这里（对话框里走 <input type="file">，见
 * LibraryImportDialog）。
 */

export type LibraryImportTarget =
  | { kind: "remote"; libraryUrl: string }
  | { kind: "error"; reason: LibraryImportErrorReason };

export type LibraryImportErrorReason = "empty" | "badLibraryUrl" | "unrecognized";

/** 错误原因 → i18n key（中文原文即 key，对话框内红字用） */
export const LIBRARY_IMPORT_ERROR_KEYS: Record<LibraryImportErrorReason, string> = {
  empty: "请先粘贴素材库链接",
  badLibraryUrl: "这个链接里的素材库地址无法识别，请重新复制",
  unrecognized: "无法识别的输入：请粘贴「Add to Excalidraw」跳转后地址栏里的链接，或「Download」按钮的 .excalidrawlib 直链",
};

/** 从「?addLibrary=」或「#addLibrary=」参数里取库 URL（query/hash 两形态都吃；URL 解析自动解码） */
function extractAddLibrary(raw: string): string | null {
  try {
    const u = new URL(raw);
    const fromQuery = u.searchParams.get("addLibrary");
    if (fromQuery) return fromQuery;
    if (u.hash) {
      const fromHash = new URLSearchParams(u.hash.slice(1)).get("addLibrary");
      if (fromHash) return fromHash;
    }
  } catch {
    /* 不是合法 URL，交给后续分支 */
  }
  return null;
}

/** 库文件直链的规范化：必须是 http(s)，且路径以 .excalidrawlib 结尾（忽略 query/hash） */
function normalizeLibraryUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    const u = new URL(trimmed);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    if (!u.pathname.toLowerCase().endsWith(".excalidrawlib")) return null;
    return u.toString();
  } catch {
    return null;
  }
}

export function parseLibraryInput(raw: string): LibraryImportTarget {
  const input = raw.trim();
  if (!input) return { kind: "error", reason: "empty" };

  const extracted = extractAddLibrary(input);
  if (extracted !== null) {
    const lib = normalizeLibraryUrl(extracted);
    if (!lib) return { kind: "error", reason: "badLibraryUrl" };
    return { kind: "remote", libraryUrl: lib };
  }

  const lib = normalizeLibraryUrl(input);
  if (lib) return { kind: "remote", libraryUrl: lib };
  return { kind: "error", reason: "unrecognized" };
}
