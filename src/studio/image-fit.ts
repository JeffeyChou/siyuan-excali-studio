/**
 * 图片尺寸压缩策略（2026-10-15 阶段 B 纯函数部分）。
 * 与 image-import.ts 分开：那个模块 import 了 @excalidraw/excalidraw（带 CSS 副作用），
 * node 单测里不能碰；尺寸计算放这里，单测直接喂。
 */

/** 导入图片的长边上限（超过则等比压缩） */
export const MAX_EDGE = 2048;

/** 等比缩放到长边 ≤ max（纯函数） */
export function fitDimensions(width: number, height: number, max = MAX_EDGE): { width: number; height: number } {
  const w = Math.max(1, Math.round(width));
  const h = Math.max(1, Math.round(height));
  const longer = Math.max(w, h);
  if (longer <= max) return { width: w, height: h };
  const k = max / longer;
  return { width: Math.max(1, Math.round(w * k)), height: Math.max(1, Math.round(h * k)) };
}
