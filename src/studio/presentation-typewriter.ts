/**
 * 第五十三轮·批 1D：打字机（纯逻辑）。
 *
 * 只改 vendor 元素的 `text` 字段逐字放出来；**不碰 width / height / originalText**。
 * 0.18.1 的文本渲染把 `element.text` 当显示内容、`originalText` 当换行与尺寸的
 * 度量源——所以截短 text 不会让文本框塌缩、也不会重排，帧间没有抖动。
 *
 * 绑定文字（containerId != null）一律跳过：它们的位置/尺寸跟着容器算，单独改文本
 * 会和容器的绑定关系打架。按字素切分（Intl.Segmenter）而不是按 UTF-16 码元，
 * emoji / 组合音标不会被劈成两半。
 *
 * 本模块不 import React / 思源 / vendor：node 侧直接跑单测。
 */

import type { Cursor, RunPlan } from "./presentation-run.ts";

/** 打字光标：末尾那道竖线（只在正在打的那条文字上闪） */
export const TYPEWRITER_CURSOR = "▌";
/** 光标闪烁周期（约每秒一次） */
export const TYPEWRITER_BLINK_MS = 530;
/** 速度兜底：设置层已夹过，这里再防一手 0/负数导致一帧放完整篇 */
export const TYPEWRITER_MIN_MS = 8;

export type TextElementLike = {
  id: string;
  type?: string;
  isDeleted?: boolean;
  containerId?: string | null;
  text?: unknown;
};

type SegmenterLike = {
  segment: (input: string) => Iterable<{ segment: string }>;
};

let segmenter: SegmenterLike | null | undefined;

function getSegmenter(): SegmenterLike | null {
  if (segmenter !== undefined) return segmenter;
  const ctor = (
    Intl as unknown as {
      Segmenter?: new (locales?: string, options?: { granularity: string }) => SegmenterLike;
    }
  ).Segmenter;
  segmenter = ctor ? new ctor(undefined, { granularity: "grapheme" }) : null;
  return segmenter;
}

/** 按用户感知的字素切分；环境没有 Intl.Segmenter 时退到码点（至少不劈代理对） */
export function graphemes(text: string): string[] {
  const seg = getSegmenter();
  if (!seg) return Array.from(text);
  return [...seg.segment(text)].map((part) => part.segment);
}

/** 取前 n 个字素；n 越界自动夹紧（打字循环每帧都会调） */
export function typedPrefix(parts: readonly string[], n: number): string {
  return parts.slice(0, Math.max(0, Math.min(parts.length, n))).join("");
}

/** 光标闪没闪：前半个周期亮、后半个周期灭 */
export function cursorVisible(elapsedMs: number): boolean {
  return Math.floor(Math.max(0, elapsedMs) / TYPEWRITER_BLINK_MS) % 2 === 0;
}

/** 从条目 id 里挑出能打字的元素：活的文本、非绑定文字、有内容 */
export function typingTargets(
  all: readonly TextElementLike[],
  ids: readonly string[],
): { id: string; text: string }[] {
  const wanted = new Set(ids);
  const out: { id: string; text: string }[] = [];
  for (const e of all) {
    if (!wanted.has(e.id) || e.isDeleted || e.type !== "text") continue;
    if (e.containerId !== undefined && e.containerId !== null) continue;
    if (typeof e.text !== "string" || e.text === "") continue;
    out.push({ id: e.id, text: e.text });
  }
  return out;
}

/**
 * 这一步**新露出来**的条目。向前推进才打字；后退/跳页/退出都不打（调用方另管）。
 * - 换页（或首次进入）：step=-1 时整页，否则第一到当前条
 * - 同页前进：只打新增的条
 */
export function newlyRevealedIds(
  plan: RunPlan | undefined,
  prev: Cursor | null,
  next: Cursor,
): string[] {
  if (!plan) return [];
  if (!prev || prev.page !== next.page) {
    if (next.step < 0) return [...plan.memberIds];
    return plan.units.slice(0, next.step + 1).flatMap((u) => u.ids);
  }
  if (next.step > prev.step) {
    const from = prev.step < 0 ? 0 : prev.step + 1;
    return plan.units.slice(from, next.step + 1).flatMap((u) => u.ids);
  }
  return [];
}

/** 进片场那一刻的全文快照：退出照它回填（打字打到一半也不留残文） */
export function snapshotText(all: readonly TextElementLike[]): Map<string, string> {
  const m = new Map<string, string>();
  for (const e of all) if (!e.isDeleted && typeof e.text === "string") m.set(e.id, e.text);
  return m;
}

export type TextPatch = { id: string; text: string };

/** 和现场比差异：只写真的要变的那些（每帧调用，幂等） */
export function buildTextPatches(
  all: readonly TextElementLike[],
  desired: ReadonlyMap<string, string>,
): TextPatch[] {
  const out: TextPatch[] = [];
  for (const e of all) {
    if (e.isDeleted) continue;
    const want = desired.get(e.id);
    if (want === undefined) continue;
    if (e.text !== want) out.push({ id: e.id, text: want });
  }
  return out;
}

/** 退出复原：只回和快照不同的那些 */
export function buildTextRestorePatches(
  all: readonly TextElementLike[],
  original: ReadonlyMap<string, string>,
): TextPatch[] {
  const out: TextPatch[] = [];
  for (const e of all) {
    if (e.isDeleted) continue;
    const want = original.get(e.id);
    if (want === undefined || e.text === want) continue;
    out.push({ id: e.id, text: want });
  }
  return out;
}
