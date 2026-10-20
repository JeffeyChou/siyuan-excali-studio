/**
 * 页签模型的最小常量（第二十六轮 T3 抽出）：index.ts 静态注册页签时要吃
 * STUDIO_TAB_TYPE / StudioTabData，但 tab.tsx 本体直连 vendor 引擎——放进
 * lazy chunk 后 index.ts 拿不到。这个零依赖小模块让两边共享同一个值。
 */

/** 注册进思源的页签类型；custom.id = plugin.name + 本值，改它等于放弃已开页签的恢复 */
export const STUDIO_TAB_TYPE = "board";

/** 会被 layout.json 持久化（customModelData），只允许放可 JSON 化的数据 */
export type StudioTabData = { dataPath: string | null; docId?: string };
