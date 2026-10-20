/**
 * 第四十一轮：画布动作（RailAction）——住进右缘竖条的**内置能力**，与「固定脚本」共用
 * 同一套钉子、同一套广播，但它不是脚本。
 *
 * 为什么不做成一条 .md 脚本：脚本由内核 goja 执行，拿不到 React 侧的画布 API、
 * 视口中心和「选一块白板」的宿主选择器；而且固定清单要靠 listScripts() 解析标题，
 * 用户改名/删掉那个文件，功能就跟着没了。所以「能力」和「脚本」分成两类条目，
 * 共用交互（点=执行、右键=取消固定、选择器里=可固定），各走各的执行通道。
 *
 * 纯数据模块：settings 归一、宿主脚本库面板、竖条渲染、测试都读这一份。
 * title/desc 存的是 i18n key（中文原文即 key），由消费方各自 t()——这里不 import
 * i18n，settings.ts 才能在不牵动语言包的情况下用它做白名单归一。
 */

import { ICON_BOARD_CARD, ICON_OUTLINE } from "./menu-icons.ts";

/** 插入白板卡片：宿主弹白板选择器，在当前画布中心插一张可点开的卡片 */
export const INSERT_BOARD_CARD = "insert-board-card";

/** 仅外框颜色（第四十五轮）：竖条上点开不占位色板，只改选中图形的边框色 */
export const OUTLINE_COLOR = "outline-color";

/** 动作 id：加新动作就是往这个联合里扩一项，同时在 RAIL_ACTIONS 里登记 */
export type RailActionId = typeof INSERT_BOARD_CARD | typeof OUTLINE_COLOR;

export type RailActionMeta = {
  id: RailActionId;
  /** i18n key：竖条 tooltip / 面板行标题 */
  title: string;
  /** i18n key：面板行说明 */
  desc: string;
  /** 24 网格路径（LineIcon / 面板内联 svg 共用） */
  icon: string;
};

export const RAIL_ACTIONS: RailActionMeta[] = [
  {
    id: INSERT_BOARD_CARD,
    title: "插入白板卡片",
    desc: "从白板库挑一块，在当前画布中心插一张能点开的卡片",
    icon: ICON_BOARD_CARD,
  },
  {
    id: OUTLINE_COLOR,
    title: "仅外框颜色",
    desc: "只改选中图形的边框色，文字颜色保持不变",
    icon: ICON_OUTLINE,
  },
];

/**
 * 默认钉住的那几枚。撤掉 ☰ 入口后，竖条是唯一的一级入口，所以默认必须看得见；
 * 老 data.json 没这个键 → 归一回落默认，升级即生效（不需要迁移标记）。
 * 第四十五轮：「仅外框颜色」**不进默认**——它是有选择对象才用的工具，
 * 由用户在脚本库行尾点图钉按需固定（入口越少越好）。
 */
export const DEFAULT_PINNED_ACTIONS: RailActionId[] = [INSERT_BOARD_CARD];

export function isRailActionId(v: unknown): v is RailActionId {
  return typeof v === "string" && RAIL_ACTIONS.some((a) => a.id === v);
}

export function railActionOf(id: string): RailActionMeta | null {
  return RAIL_ACTIONS.find((a) => a.id === id) ?? null;
}

/**
 * 钉子清单归一：只认白名单、去重、保序。
 * 关键区别——「键缺失」回落默认（新装/升级要看得见），而**显式空数组原样保留**
 * （那是用户自己取消固定的结果，被默认值回填就等于固定不住）。
 */
export function normalizePinnedActions(raw: unknown): RailActionId[] {
  if (!Array.isArray(raw)) return [...DEFAULT_PINNED_ACTIONS];
  const out: RailActionId[] = [];
  for (const v of raw) {
    if (isRailActionId(v) && !out.includes(v)) out.push(v);
  }
  return out;
}
