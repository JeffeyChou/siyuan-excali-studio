/**
 * 第三十八轮：荧光笔的单一真源（数据 + 纯函数，不 import vendor、不 import siyuan 层）。
 *
 * 第二十九轮这里是六支笔的样式预设（PenRail 用）；本轮收窄成**一枚荧光笔**——
 * 四支墨水笔的活儿 vendor 铅笔工具已经能干，常驻六个按钮反而挤占右侧竖条。
 * 颜色/粗细/透明度存进插件设置（工具偏好，跨画板记忆，绝不写进白板文件），
 * 侧栏色板、内置脚本 highlighter.md、智能体三条链路都读这一份。
 *
 * 官方 0.18.1 的 appState 不暴露 EA fork 的 penOptions（压感/描边轮廓），所以做不到
 * 真·荧光笔的「恒宽 + 叠加不加深」；这里只能用「零糙度 + 半透明 + 粗笔宽」近似。
 */

/** 荧光笔配置（= 设置里存的那一份，也是色板改的那一份） */
export interface HighlighterConfig {
  /** 描边色，#rrggbb */
  color: string;
  /** appState.currentItemStrokeWidth（实际像素 ≈ width × STROKE_PX） */
  width: number;
  /** 透明度 0-100 */
  opacity: number;
}

/** 一次写进 appState 的完整笔刷（配置 + 糙度） */
export type PenStyle = HighlighterConfig & { roughness: number };

/**
 * vendor freedraw 的笔宽换算系数（chunk 里 `size: strokeWidth * 4.25`）。
 * 只用于把 width 显示成人类可读的像素——色板里「约 17px」就是这么来的。
 */
export const STROKE_PX = 4.25;

/** 荧光笔糙度：0 = 建筑笔直，画出来才像记号笔而不是蜡笔 */
export const HL_ROUGHNESS = 0;

/** vendor 默认笔（退出荧光笔时复位到这里；黑、细、不透明、艺术家糙度） */
export const INK_DEFAULT: HighlighterConfig = { color: "#1e1e1e", width: 2, opacity: 100 };
export const INK_ROUGHNESS = 1;

/**
 * 色板预设六色（open-color，和 vendor 拾色器同源，保证对得上眼）。
 * 顺序即色板顺序；label 走 i18n。
 */
export const HL_COLORS: readonly { label: string; value: string }[] = [
  { label: "黄", value: "#ffd43b" },
  { label: "绿", value: "#69db7c" },
  { label: "粉", value: "#f783ac" },
  { label: "蓝", value: "#4dabf7" },
  { label: "橙", value: "#ffa94d" },
  { label: "紫", value: "#b197fc" },
];

/**
 * 三档粗细。width 4 ≈ 17px 是默认（比 vendor「粗」的 12≈51px 细得多——
 * 51px 在笔记上是一整条宽带，这就是上一版荧光笔「看着不像」的根因之一）。
 */
export const HL_SIZES: readonly { label: string; width: number }[] = [
  { label: "细", width: 3 },
  { label: "中", width: 4 },
  { label: "粗", width: 6 },
];

export const DEFAULT_HIGHLIGHTER: HighlighterConfig = { color: "#ffd43b", width: 4, opacity: 45 };

/** 笔宽 → 实际像素（四舍五入，仅用于显示） */
export function highlighterPx(width: number): number {
  return Math.round(width * STROKE_PX);
}

const HEX = /^#[0-9a-fA-F]{6}$/;

function clamp(n: number, lo: number, hi: number, fallback: number): number {
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : fallback;
}

/**
 * 脏数据归一：色不是 #rrggbb 就回落默认色；width 夹到 vendor 的 1-12；
 * opacity 夹到 10-100（低于 10 基本看不见，不如不给选）。
 */
export function normalizeHighlighter(raw: unknown): HighlighterConfig {
  const r = (raw && typeof raw === "object" ? raw : {}) as Partial<Record<keyof HighlighterConfig, unknown>>;
  return {
    color: typeof r.color === "string" && HEX.test(r.color.trim()) ? r.color.trim().toLowerCase() : DEFAULT_HIGHLIGHTER.color,
    width: clamp(Number(r.width), 1, 12, DEFAULT_HIGHLIGHTER.width),
    opacity: clamp(Number(r.opacity), 10, 100, DEFAULT_HIGHLIGHTER.opacity),
  };
}

/** 当前 appState 笔刷（getPen 的形状；tool 是 activeTool.type） */
export interface PenSnapshot {
  tool: string;
  color: string;
  width: number;
  opacity: number;
  roughness: number;
}

/**
 * 「现在这支笔就是配置的荧光笔」判据：四键全等 + 手绘工具。
 * 用来把手动改笔刷（拾色器、 vendor 样式条）反向同步成侧栏的激活态，
 * 也让「切到别的工具」自动触发复位。
 */
export function isHighlighter(snap: PenSnapshot, cfg: HighlighterConfig): boolean {
  return (
    snap.tool === "freedraw" &&
    snap.color.toLowerCase() === cfg.color.toLowerCase() &&
    Math.round(snap.width) === Math.round(cfg.width) &&
    Math.round(snap.opacity) === Math.round(cfg.opacity) &&
    snap.roughness === HL_ROUGHNESS
  );
}
