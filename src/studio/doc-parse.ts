/**
 * 2026-10-16 S3：markdown 解析纯函数（ea.utils 与内置脚本共用，可 node 单测）。
 * 只做内置脚本需要的最小集：标题层级 / 第一个表格 / 缩进列表 / 代码围栏抽取。
 */

export interface Heading {
  level: number;
  text: string;
}

/** 提取 ATX 标题（# ~ ######），跳过代码围栏内的行 */
export function parseHeadings(md: string): Heading[] {
  const out: Heading[] = [];
  let inFence = false;
  for (const line of (md || "").split(/\r?\n/)) {
    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const m = line.match(/^(#{1,6})\s+(.+?)\s*$/);
    if (m) out.push({ level: m[1].length, text: m[2] });
  }
  return out;
}

export interface ParsedTable {
  headers: string[];
  rows: string[][];
}

/** 提取第一个 Markdown 表格（连续 | 行；跳过分隔行）；没有返回 null */
export function parseFirstTable(md: string): ParsedTable | null {
  const lines = (md || "").split(/\r?\n/);
  let start = -1;
  for (let i = 0; i < lines.length; i++) {
    if (/^\s*\|.*\|\s*$/.test(lines[i])) {
      start = i;
      break;
    }
  }
  if (start < 0) return null;
  const rows: string[][] = [];
  for (let i = start; i < lines.length; i++) {
    const line = lines[i];
    if (!/^\s*\|.*\|\s*$/.test(line)) break;
    const cells = line
      .replace(/^\s*\|/, "")
      .replace(/\|\s*$/, "")
      .split("|")
      .map((c) => c.trim());
    if (cells.every((c) => /^:?-{2,}:?$/.test(c))) continue; // 分隔行
    rows.push(cells);
  }
  if (rows.length === 0) return null;
  return { headers: rows[0], rows: rows.slice(1) };
}

export interface ListNode {
  text: string;
  depth: number;
  children: ListNode[];
}

/** 提取第一个无序/有序缩进列表（- * + 或 1.），转树 */
export function parseList(md: string): ListNode[] {
  const lines = (md || "").split(/\r?\n/);
  const root: ListNode[] = [];
  const stack: ListNode[] = [];
  for (const line of lines) {
    const m = line.match(/^(\s*)(?:[-*+]|\d+\.)\s+(.+?)\s*$/);
    if (!m) {
      if (line.trim() === "") continue;
      if (stack.length === 0) continue;
      // 列表已开始的非空非列表行：视为上一项的续行（简化：忽略）
      continue;
    }
    const depth = Math.floor(m[1].replace(/\t/g, "  ").length / 2);
    const node: ListNode = { text: m[2], depth, children: [] };
    while (stack.length > depth + 1) stack.pop();
    if (depth === 0 || stack.length === 0) {
      if (depth > 0 && root.length === 0) {
        // 列表以缩进行开头：按 depth 归一到 root
        root.push(node);
        stack.length = 0;
        stack.push(node);
        continue;
      }
      root.push(node);
      stack.length = 0;
      stack.push(node);
    } else {
      const parent = stack[depth - 1] ?? stack[stack.length - 1];
      parent.children.push(node);
      stack[depth] = node;
    }
  }
  return root;
}

/** 抽取第一个 ``` 代码围栏内容；没有围栏返回 null */
export function firstFenceCode(md: string): string | null {
  const m = (md || "").match(/```[a-zA-Z0-9]*\r?\n([\s\S]*?)```/);
  return m ? m[1] : null;
}

export interface ScriptMeta {
  /** 首个 H1（没有则空串） */
  title: string;
  /** 是否含 @excalidraw-onload 标记 */
  onload: boolean;
  /** 可执行代码（围栏内容；无围栏则取去掉标记线的全文） */
  code: string;
  /**
   * 第三十四轮：使用说明文字（H1 之后、代码围栏之前的正文，去掉 onload 标记，
   * 折叠成单行）——脚本选择器里常驻展示，对标 Obsidian ea-scripts 的
   * 「说明文字 + 截图 + 代码」文档形态。无说明为空串。
   */
  description: string;
}

/** 解析脚本文档：H1 标题 + onload 标记 + 代码 + 使用说明文字 */
export function parseScriptDoc(md: string): ScriptMeta {
  const title = (md || "").match(/^#\s+(.+?)\s*$/m)?.[1] ?? "";
  const onload = /@excalidraw-onload/.test(md || "");
  const code = (firstFenceCode(md) ?? (md || "").replace(/^#.*$/gm, "").replace(/@excalidraw-onload/g, "")).trim();
  // 说明文字 = 首个围栏之前的正文，去 H1 行与标记行，合并为单行
  const beforeFence = (md || "").split(/```/)[0] ?? "";
  const description = beforeFence
    .split("\n")
    .filter((line) => !/^#\s/.test(line) && !line.includes("@excalidraw-onload"))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
  return { title, onload, code, description };
}
