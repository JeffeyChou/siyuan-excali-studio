/**
 * 2026-10-16 S2：白板动作窄接口（宿主/脚本 ↔ 当前活动画布）。
 *
 * 设计约束（沿用本仓库「React 树零思源 API」的分层）：
 * - dock 在宿主编排层（index.ts + siyuan/ExcaliDock.ts），画布在 studio/ 层；
 * - 跨层只经这个接口 + StudioTabHost 的回调通信，双方不直接引用对方类型；
 * - 「当前活动」= 最近一次注册/交互过的页签（见 index.ts 的 activeCustom）。
 *
 * 第二十一轮起画布没有「保存」动作（防抖自动保存 + ⌘S 在 StudioApp 内闭环），
 * 这个接口只剩「跨层还必须有人做」的三件事：
 * - getEaHandle：脚本引擎的画布句柄；
 * - flush：⌘S 强制落盘、关页签前兜底冲刷、ea 脚本 save() 都经它；
 * - insertBoardCard：dock 的白板库把一块板送进「当前那块画布」。
 */

import type { EaBoardHandle } from "./ea-api";

export interface BoardActions {
  /** 2026-10-16 S3：ea 脚本引擎的画布句柄（脚本运行器用；null = 画布未就绪） */
  getEaHandle: () => EaBoardHandle | null;
  /**
   * 第十二轮：立即冲刷未保存的改动（⌘S / 关页签前兜底 / ea.save() 共用同一通道）。
   * true = 已落盘（或本来就没有改动）；false = 有改动但没保存成（保存失败）。
   */
  flush: () => Promise<boolean>;
  /**
   * 第四十轮：dock → 当前活动画布插一张白板卡片（拖拽落点 / 行菜单「插入到当前画布」）。
   * ref 是库内引用（assets/excali/x.svg），title 是行上显示名。
   */
  insertBoardCard: (ref: string, title: string) => void;
  /**
   * 第四十五轮：脚本库「仅外框颜色」行 → 当前活动画布打开色板。
   * 色板开在竖条旁（动作没固定时锚到竖条本身），选色由画布自己打 strokeColor 补丁。
   */
  openOutlinePalette: () => void;
  /**
   * 2026-10-21 P1：脚本库「图片转笔画素材」行 → 当前活动画布校验选区并弹转换框。
   * 只在画布层能做（拿得到 scene / files / 预览导出器）。
   */
  openImageToMaterial: () => void;
}
