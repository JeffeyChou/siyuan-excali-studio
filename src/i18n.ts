/**
 * 界面文案（沿用本仓库 REword 的三条准则，见 siyuan-plugin-reader/src/i18n/index.ts）：
 * ① 中文原文即 key；② 缺失回落中文；③ 只有英文需要语言包。
 *
 * 思源把 data/plugins/<name>/i18n/<语言>.json 读进 `Plugin#i18n`，这里只把它接到 t() 上，
 * 不自建语言切换（M0 无设置页；画板自身语言走 excalidrawLangCode）。
 */

type Table = Record<string, unknown>;

let table: Table = {};

export function initI18n(fromPlugin: unknown): void {
  table = fromPlugin && typeof fromPlugin === "object" ? (fromPlugin as Table) : {};
}

export function t(text: string, vars?: Record<string, string | number>): string {
  const raw = table[text];
  const s = typeof raw === "string" ? raw : text;
  if (!vars) return s;
  return s.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));
}

/** Excalidraw 的语言码（其 langCode 是字面量联合，故返回值收窄到具体码而非 string） */
export function excalidrawLangCode(): "zh-CN" | "zh-TW" | "en" {
  const l = (navigator.language || "en").toLowerCase();
  if (l.startsWith("zh")) return l.startsWith("zh-tw") || l.startsWith("zh-hk") ? "zh-TW" : "zh-CN";
  return "en";
}
