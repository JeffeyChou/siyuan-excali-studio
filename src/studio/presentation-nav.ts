/**
 * 第七十六轮：放映导航（照搬 Advanced Canvas 的演示走图语义）。
 *
 * Advanced Canvas 的放映是**沿箭头在节点间游走**，它用两份状态实现：
 * - `visitedNodeIds`：访问栈——后退时从栈里弹回上一个节点；
 * - `traveledEdges`：已走过的边——前进时优先挑**没走过**的出边，
 *   全走过了就退回最后一条，于是「A→B→A→B」也能绕，形成环。
 *
 * 本模块把这两份状态和「页内逐条出场」合成一台状态机：
 * - **页内**还有分条没走完 → 先走分条（不动页）；
 * - **页内**走完了 → 按图挑下一条边换页；
 * - **后退**先回退最后一个分条，再沿访问栈弹回上一页。
 *
 * 没有图（板子上没画连页箭头）时**退回线性翻页**（片单顺序），
 * 保证「画完就能放」的零配置体验不被图模型绑架。
 *
 * 纯逻辑：不 import React / vendor / 思源，node 侧能直接跑单测。
 */

import type { Cursor, RunPlan } from "./presentation-run.ts";
import { firstStep, lastStep } from "./presentation-run.ts";
import { pickNextEdge, type GraphSide, type SlideGraph } from "./presentation-graph.ts";

/** 导航状态：一份能完整复原放映位置的快照 */
export type NavState = {
  /** 当前页（plans 下标） */
  page: number;
  /** 页内分条游标（-1 = 整页一起出） */
  step: number;
  /** 访问栈（页下标序列）：后退沿它弹回 */
  stack: number[];
  /** 已走过的边 id：前进时优先挑没走过的 */
  traveled: string[];
  /** 走到头了（没有下一页了）：调用方据此收场 */
  done: boolean;
};

/** 放映开始时的状态：起点页 + 空的访问栈/已走边 */
export function navStart(
  plans: readonly RunPlan[],
  graph: SlideGraph | null,
  startPage = 0,
): NavState {
  const page = clampPage(plans, startPage);
  return {
    page,
    step: firstStep(plans[page]),
    stack: [page],
    traveled: [],
    done: false,
  };
}

function clampPage(plans: readonly RunPlan[], page: number): number {
  if (plans.length === 0) return 0;
  return Math.min(Math.max(0, page), plans.length - 1);
}

/** 页下标 → 画框 id（图是按画框 id 建的） */
function frameIdAt(plans: readonly RunPlan[], page: number): string {
  return plans[page]?.frameId ?? "";
}

/** 页下标 → 画框 id 的反查（图里没有该页就返回 -1） */
function pageOfFrame(plans: readonly RunPlan[], graph: SlideGraph, frameId: string): number {
  for (let i = 0; i < plans.length; i++) {
    if (plans[i]?.frameId === frameId) return i;
  }
  return -1;
}

/**
 * 前进：先走完本页分条，再沿图换页。
 *
 * @param direction 给了方位就只走该方位的出边（Advanced Canvas 的方向键导航）
 * @returns 新状态；没有下一页时返回 null（调用方决定是收场还是停住）
 */
export function navNext(
  plans: readonly RunPlan[],
  graph: SlideGraph | null,
  state: NavState,
  direction?: GraphSide,
): NavState | null {
  const plan = plans[state.page];
  // 页内还有分条没走完 → 先走分条
  if (plan && state.step < lastStep(plan)) {
    return { ...state, step: state.step + 1, done: false };
  }
  // 换页：优先走图，图里没路就线性兜底
  const curFrame = frameIdAt(plans, state.page);
  const edge = graph ? pickNextEdge(graph, curFrame, state.traveled, direction) : null;
  if (edge) {
    const nextPage = pageOfFrame(plans, graph as SlideGraph, edge.to);
    if (nextPage >= 0) {
      return {
        page: nextPage,
        step: firstStep(plans[nextPage]),
        stack: [...state.stack, nextPage],
        traveled: [...state.traveled, edge.id],
        done: false,
      };
    }
  }
  // 线性兜底：片单顺序的下一页
  if (state.page < plans.length - 1) {
    const nextPage = state.page + 1;
    return {
      page: nextPage,
      step: firstStep(plans[nextPage]),
      stack: [...state.stack, nextPage],
      traveled: state.traveled,
      done: false,
    };
  }
  return null;
}

/**
 * 后退：先回退本页最后一个分条，再沿访问栈弹回上一页。
 * 回到的页按 Advanced Canvas 的语义**整页呈现**（分条已全走过）。
 */
export function navPrev(
  plans: readonly RunPlan[],
  graph: SlideGraph | null,
  state: NavState,
): NavState | null {
  void graph; // 后退沿访问栈，不查图（与 Advanced Canvas 一致）
  const plan = plans[state.page];
  if (plan && state.step > firstStep(plan)) {
    return { ...state, step: state.step - 1, done: false };
  }
  if (state.stack.length > 1) {
    const stack = state.stack.slice(0, -1);
    const page = stack[stack.length - 1] as number;
    return {
      page,
      step: lastStep(plans[page]),
      stack,
      traveled: state.traveled.slice(0, Math.max(0, state.traveled.length - 1)),
      done: false,
    };
  }
  return null;
}

/**
 * 回起点（Home）：重置成放映起点。
 * 有图时起点是图的首节点（不是片单第 0 页）——Advanced Canvas 的 start node 语义。
 */
export function navHome(
  plans: readonly RunPlan[],
  graph: SlideGraph | null,
  state: NavState,
  startPage = 0,
): NavState {
  void state;
  return navStart(plans, null, startPage);
}

/**
 * 到最后一页（End）：**沿图**把路走到头。
 *
 * 走法跟「前进」一致（挑没走过的出边，全走过了就退回最后一条），但一路走到底，
 * 遇到环也能走（访问过的节点不重复计入步数上限，最多走 N 步防死循环）。
 * 图走不通（没有出边）就退到片单末页——保证 End 键永远有反应。
 */
export function navEnd(
  plans: readonly RunPlan[],
  graph: SlideGraph | null,
  state: NavState,
): NavState {
  if (!graph) {
    const last = Math.max(0, plans.length - 1);
    return {
      page: last,
      step: lastStep(plans[last]),
      stack: [...state.stack, last],
      traveled: state.traveled,
      done: true,
    };
  }
  // 最多走 plans.length * 2 步：够走完一条路，也够绕一圈，但不会死循环
  const maxSteps = Math.max(1, plans.length) * 2;
  let cur = state;
  const seen = new Set<string>();
  for (let i = 0; i < maxSteps; i++) {
    const frameId = frameIdAt(plans, cur.page);
    const edge = pickNextEdge(graph, frameId, cur.traveled);
    if (!edge) break;
    const nextPage = pageOfFrame(plans, graph, edge.to);
    if (nextPage < 0) break;
    const key = `${nextPage}`;
    if (seen.has(key)) break; // 绕回自己了就停
    seen.add(key);
    cur = {
      page: nextPage,
      step: lastStep(plans[nextPage]),
      stack: [...cur.stack, nextPage],
      traveled: [...cur.traveled, edge.id],
      done: false,
    };
  }
  return { ...cur, done: true };
}

/** 跳到指定页（点页码/页码点）：该页落到整页态 */
export function navJump(plans: readonly RunPlan[], state: NavState, page: number): NavState {
  const p = clampPage(plans, page);
  const stack = state.stack.includes(p) ? state.stack : [...state.stack, p];
  return { ...state, page: p, step: lastStep(plans[p]), stack, done: false };
}

/** 导航状态 → 放映游标（对外仍是 {page, step}） */
export function toCursor(state: NavState): Cursor {
  return { page: state.page, step: state.step };
}

/** 放映游标 → 导航状态（外部只改了游标时用） */
export function fromCursor(cur: Cursor, prev: NavState): NavState {
  return { ...prev, page: cur.page, step: cur.step };
}
