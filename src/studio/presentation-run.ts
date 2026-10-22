/**
 * 第五十三轮·批 1A：放映运行时（纯逻辑）。
 *
 * 设计前提：**放映不改磁盘**。场景真源永远保持「全都显示」，放映时只把临时值
 * （opacity，1D 再加 text）作为补丁喂给 vendor（captureUpdate: NEVER，不进撤销栈），
 * 退出时按快照回填。于是断网、崩溃、直接关思源都不会把白板留成「藏了一半」的样子。
 *
 * 这里只算「谁该显示、谁该藏、和现场差在哪」，不碰 React / 思源 / vendor。
 * 页面内条目的阅读顺序与片单排序共用 compareReadingOrder——两处口径不许分叉。
 */

import { compareReadingOrder } from "./presentation-plan.ts";

export const OPACITY_DEFAULT = 100;

/** vendor 元素里本模块要用到的字段（结构兼容即可，node 侧能直接喂假对象） */
export type RunElement = {
  id: string;
  type?: string;
  isDeleted?: boolean;
  x: number;
  y: number;
  width?: number;
  height?: number;
  frameId?: string | null;
  containerId?: string | null;
  groupIds?: readonly string[];
  opacity?: number;
};

/** 一条 = 一次出场：同组元素一起，容器连同它的绑定文字一起 */
export type StepUnit = { key: string; ids: string[] };

export type RunPlan = {
  frameId: string;
  /** 画框几何（场景坐标）：幕布挖洞与镜头都用它，放映中画框不许动，抓一次就够 */
  box: { x: number; y: number; w: number; h: number };
  units: StepUnit[];
  /** 本页所有归属元素（不含画框本身） */
  memberIds: string[];
};

export type RunPatch = { id: string; opacity: number };

/** 放映游标：page 对 visibleSlides 的下标，step = -1 表示整页（无分条的页） */
export type Cursor = { page: number; step: number };

function alive(e: RunElement): boolean {
  return !e.isDeleted;
}

export function opacityOf(e: RunElement): number {
  return typeof e.opacity === "number" ? e.opacity : OPACITY_DEFAULT;
}

/** 画框的成员：按 frameId 归拢，已删除的不算 */
export function pageMembers(all: readonly RunElement[], frameId: string): RunElement[] {
  return all.filter((e) => alive(e) && e.type !== "frame" && (e.frameId ?? null) === frameId);
}

/** 一组的 key：同组一条；不在组里的元素自成一条 */
function unitKey(e: RunElement): string {
  return e.groupIds && e.groupIds.length > 0 ? `g:${e.groupIds[0]}` : `e:${e.id}`;
}

function unionBox(list: readonly RunElement[]): { id: string; x: number; y: number; w: number; h: number } {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const e of list) {
    x0 = Math.min(x0, e.x);
    y0 = Math.min(y0, e.y);
    x1 = Math.max(x1, e.x + (e.width ?? 0));
    y1 = Math.max(y1, e.y + (e.height ?? 0));
  }
  return { id: unitKey(list[0]), x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

/**
 * 页内条目：顶层元素（绑定文字跟着容器走）按 groupIds 归并，再按阅读顺序排。
 * 空页返回 []，调用方用 step = -1 表示「整页一起出」。
 */
export function revealUnits(all: readonly RunElement[], frameId: string): StepUnit[] {
  const members = pageMembers(all, frameId);
  const bound = new Map<string, RunElement[]>();
  const memberIds = new Set(members.map((e) => e.id));
  for (const e of members) {
    if (e.containerId && memberIds.has(e.containerId)) {
      const list = bound.get(e.containerId) ?? [];
      list.push(e);
      bound.set(e.containerId, list);
    }
  }
  const tops = members.filter((e) => !e.containerId || !memberIds.has(e.containerId));
  const groups = new Map<string, RunElement[]>();
  for (const e of tops) {
    const key = unitKey(e);
    const list = groups.get(key) ?? [];
    list.push(e);
    groups.set(key, list);
  }
  return [...groups.entries()]
    .map(([key, list]) => {
      const ids = list.flatMap((e) => [e.id, ...(bound.get(e.id) ?? []).map((t) => t.id)]);
      return { key, ids, box: unionBox(list) };
    })
    .sort((a, b) => compareReadingOrder(a.box, b.box) || a.key.localeCompare(b.key))
    .map(({ key, ids }) => ({ key, ids }));
}

/**
 * 场景 + 一页画框 → 放映计划。
 * reveal=false（全局逐条关闭，或这一页设成「整页一起出」）时不给分条：
 * 游标 step 恒为 -1，整页元素同时出场。
 */
export function planPage(all: readonly RunElement[], frameId: string, reveal = true): RunPlan {
  const frame = all.find((e) => e.id === frameId && e.type === "frame" && alive(e));
  return {
    frameId,
    box: frame ? { x: frame.x, y: frame.y, w: frame.width ?? 0, h: frame.height ?? 0 } : { x: 0, y: 0, w: 0, h: 0 },
    units: reveal ? revealUnits(all, frameId) : [],
    memberIds: pageMembers(all, frameId).map((e) => e.id),
  };
}

/**
 * 当前游标下每个元素的**目标** opacity 补丁（幂等：算的是绝对值，和现场比差异）。
 *
 * 第七十六轮·改口径（照搬 Advanced Canvas / Obsidian Slideshow 的放映内核）：
 * **不再把非当前页的内容清零**。
 *
 * 旧口径（「非当前页全压 0」）在三个参考实现里都没有，而且它是「放映整页全空」的
 * 最可疑来源：内容本身 opacity 补丁算得对（真实场景跑过，成员该是 100），
 * 但一旦画框 opacity=0 与 vendor 的 `frameRendering.clip` 渲染分组发生交互，
 * 整组成员就会一起消失——症状正是用户看到的「编辑态有图、放映态什么都没有」。
 *
 * 新口径（两个参考实现都这么做）：
 * - **别的页看不见，靠相机**：镜头 fit 到当前页时，其它页自然在视口外。
 * - **画框框线看不见，靠关渲染**：`appState.frameRendering =
 *   {enabled:false,name:false,outline:false,clip:false}`（见 StudioApp），
 *   框线/画框名消失而成员照常渲染——Slideshow 就是这么干的。
 * - **只对「本页逐条出场还没轮到」的元素做显隐**：这就是 Slideshow 的
 *   `applyBuildState` 口径——只动登记过的动画目标，其余元素一律不碰。
 * - 原始 opacity 不是 100 的元素，显示时回它自己的值（别人手工调淡的别被洗成 100）
 *
 * @param plan    当前页计划（成员与分条）
 * @param step    游标步（-1 = 整页一起出）
 * @param original 进片场时定格���原始 opacity（恢复用）
 */
export function buildRunPatches(
  all: readonly RunElement[],
  plan: RunPlan,
  step: number,
  original: ReadonlyMap<string, number>,
): RunPatch[] {
  // 本页「该显示谁」：step=-1 整页全显；否则前 step+1 条显
  const visible = new Set<string>();
  if (step < 0) {
    for (const id of plan.memberIds) visible.add(id);
  } else {
    for (const unit of plan.units.slice(0, step + 1)) {
      for (const id of unit.ids) visible.add(id);
    }
  }
  const out: RunPatch[] = [];
  for (const e of all) {
    if (!alive(e)) continue;
    // 画框不动：框线靠 frameRendering 关渲染，成员靠 frameId 归属画框
    if (e.type === "frame") continue;
    // 不是本页成员 → 不碰（它在别的页里，相机负责让它离开视口）
    if (!plan.memberIds.includes(e.id)) continue;
    // 本页成员：逐条出场还没轮到的藏起来，其余保持原值
    const want = visible.has(e.id) ? (original.get(e.id) ?? OPACITY_DEFAULT) : 0;
    if (opacityOf(e) !== want) out.push({ id: e.id, opacity: want });
  }
  return out;
}

/** 进片场那一刻的原始 opacity（含画框）：退出照这张表回填 */
export function snapshotOpacity(all: readonly RunElement[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const e of all) if (alive(e)) m.set(e.id, opacityOf(e));
  return m;
}

/** 退出复原：只回和快照不同的那些，别为一次退出把整场景重画 */
export function buildRestorePatches(all: readonly RunElement[], original: ReadonlyMap<string, number>): RunPatch[] {
  const out: RunPatch[] = [];
  for (const e of all) {
    if (!alive(e)) continue;
    const want = original.get(e.id);
    if (want === undefined) continue;
    if (opacityOf(e) !== want) out.push({ id: e.id, opacity: want });
  }
  return out;
}

/* ------------------------------ 游标 ------------------------------ */

export function firstStep(plan: RunPlan | undefined): number {
  return plan && plan.units.length > 0 ? 0 : -1;
}

export function lastStep(plan: RunPlan | undefined): number {
  return plan && plan.units.length > 0 ? plan.units.length - 1 : -1;
}

export function startCursor(plans: readonly RunPlan[]): Cursor {
  return { page: 0, step: firstStep(plans[0]) };
}

export function endCursor(plans: readonly RunPlan[]): Cursor {
  const page = Math.max(0, plans.length - 1);
  return { page, step: lastStep(plans[page]) };
}

/** 下一页/下一条；到底返回 null（调用方决定是收场还是停住） */
export function nextCursor(plans: readonly RunPlan[], cur: Cursor): Cursor | null {
  const plan = plans[cur.page];
  if (plan && cur.step < lastStep(plan)) return { page: cur.page, step: cur.step + 1 };
  if (cur.page < plans.length - 1) {
    const page = cur.page + 1;
    return { page, step: firstStep(plans[page]) };
  }
  return null;
}

/** 上一页/上一条；开头返回 null */
export function prevCursor(plans: readonly RunPlan[], cur: Cursor): Cursor | null {
  const plan = plans[cur.page];
  if (plan && cur.step > firstStep(plan)) return { page: cur.page, step: cur.step - 1 };
  if (cur.page > 0) {
    const page = cur.page - 1;
    return { page, step: lastStep(plans[page]) };
  }
  return null;
}

/**
 * 空安全检查：场景里画框被删/换了之后旧游标可能越界。
 * 越界就夹回合法范围（page 夹到最后一页，step 夹到该页的 step 区间）。
 */
export function clampCursor(plans: readonly RunPlan[], cur: Cursor): Cursor {
  if (plans.length === 0) return { page: 0, step: -1 };
  const page = Math.min(Math.max(0, cur.page), plans.length - 1);
  const lo = firstStep(plans[page]);
  const hi = lastStep(plans[page]);
  const step = Math.min(Math.max(cur.step, lo), hi);
  return { page, step };
}
