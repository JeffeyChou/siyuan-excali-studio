/**
 * 「打开白板…」选择器的纯逻辑（第十三轮）：修改时间文案 + 关键字过滤。
 *
 * 为什么单独住一个文件：带 siyuan 依赖的 board-picker.ts 在 node 测试里
 * 只能被文本扫描，行为断言落不下去。这里零外部依赖（i18n 也无副作用），
 * test/board-picker.test.mjs 直接 import 跑真断言。
 */

// 相对导入带 .ts 后缀：node --experimental-strip-types 不认无后缀的 ESM 相对路径
//（同仓 doc.ts → storage.ts 的先例），Vite 两边都认。
import { t } from "../i18n.ts";
import { fileNameOf, type BoardFileEntry } from "./storage.ts";

/**
 * 修改时间 → 列表行右侧 meta。当天/昨天说人话，再旧给日期；跨年补年份，
 * 免得去年的 03-12 被读成今年。updated=0（内核没给时间）返回空串，行里不显示。
 */
export function boardTimeText(updated: number, now = new Date()): string {
  if (!updated) return "";
  const d = new Date(updated);
  const p = (n: number) => String(n).padStart(2, "0");
  const hm = `${p(d.getHours())}:${p(d.getMinutes())}`;
  const dayKey = (x: Date) => `${x.getFullYear()}-${x.getMonth()}-${x.getDate()}`;
  if (dayKey(d) === dayKey(now)) return `${t("今天")} ${hm}`;
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (dayKey(d) === dayKey(yesterday)) return `${t("昨天")} ${hm}`;
  const md = `${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  return d.getFullYear() === now.getFullYear() ? `${md} ${hm}` : `${d.getFullYear()}-${md}`;
}

/** 文件名子串过滤，大小写不敏感；空关键字原样返回（保持主列表的新→旧序） */
export function filterBoardEntries(entries: BoardFileEntry[], query: string): BoardFileEntry[] {
  const q = query.trim().toLowerCase();
  if (q === "") return entries;
  return entries.filter((e) => fileNameOf(e.path).toLowerCase().includes(q));
}
