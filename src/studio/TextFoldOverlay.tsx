/**
 * 2026-10-22：文本折叠的圆点控制钮层（对标 Obsidian Canvas Folding 的 − 控制点）。
 *
 * 形态：折叠态 = 实心圆 + ▶ + 右上角隐藏计数徽章；展开态 = 空心圆 + −。
 * 点击 = 收起 / 展开，带 8 帧淡入淡出 + 轻微上滑的伪动画。
 *
 * 挂点：`.exs-canvas`（已 position:relative）内的绝对定位层，pointer-events
 * 只开在按钮上——不挡画布任何交互。定位口径与 vendor sceneCoordsToViewportCoords
 * 一致：x = (sceneX + scrollX) * zoom.value + offsetLeft。
 *
 * 位置同步：vendor 的 onChange 只在场景/appState 变化时回调，而本层要跟平移/缩放
 * 走——用 rAF 轮询 + 签名去重（元素 id 集 + 各头 collapsed 态 + 视口五元组），
 * 签名不变不 setState。frameNameBoundsCache 也是这个模式（vendor 自己就这么干）。
 *
 * 撤销栈：动画中间帧一律 CaptureUpdateAction.NEVER，只在首（加回成员/提交折叠态）
 * 尾（删成员/展开态补丁）用 IMMEDIATELY ⇒ ⌘Z 一步回到动画前。
 */

import { useEffect, useRef, useState } from "react";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { CaptureUpdateAction } from "@excalidraw/excalidraw";
import type { EaBoardHandle } from "./ea-api";
import {
  foldBadgesOf,
  foldBadgesSig,
  planRefold,
  planUnfold,
  type FoldBadge,
  type FoldCandidate,
} from "./text-fold";
import { t } from "../i18n";

/** 动画帧数 / 单帧间隔（ms）——总时长 ≈ 130ms，够感知又不拖沓 */
const FRAMES = 8;
const FRAME_MS = 16;
/** 收起/展开时成员的滑动距离（scene 单位） */
const SLIDE = 8;

const easeOutCubic = (t: number): number => 1 - (1 - t) ** 3;

const nextFrame = (): Promise<void> =>
  new Promise((resolve) => window.setTimeout(resolve, FRAME_MS));

export interface TextFoldOverlayProps {
  api: ExcalidrawImperativeAPI | null;
  getHandle: () => EaBoardHandle | null;
  notify?: (msg: string) => void;
}

export function TextFoldOverlay({ api, getHandle, notify }: TextFoldOverlayProps): React.JSX.Element | null {
  const [badges, setBadges] = useState<FoldBadge[]>([]);
  /** 动画进行中的头 id（防重点；null = 空闲） */
  const animating = useRef<string | null>(null);
  /** 卸载标记：动画中途关页签要能停 */
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  /* 位置/状态轮询：签名不变不渲染
   *
   * 签名必须覆盖**一切影响渲染的东西**：徽章位置由 head.x/y + 视口算出，
   * 所以几何进签名——只写 id + collapsed + 视口的话，拖动折叠头（或编辑文本
   * 改变宽高）不改变其中任何一项，rAF 会认定「无事发生」把旧坐标留着，
   * 圆点就掉在原来的位置不跟元素走（2026-10-22 用户报的问题）。 */
  useEffect(() => {
    if (!api) return;
    let raf = 0;
    let sig = "";
    const tick = (): void => {
      const els = api.getSceneElements();
      const st = api.getAppState();
      const next = foldBadgesOf(els, {
        zoom: st.zoom?.value ?? 1,
        scrollX: st.scrollX,
        scrollY: st.scrollY,
        offsetLeft: st.offsetLeft,
        offsetTop: st.offsetTop,
      });
      const sigNext = foldBadgesSig(next);
      if (sigNext !== sig) {
        sig = sigNext;
        setBadges(next);
      }
      raf = window.requestAnimationFrame(tick);
    };
    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, [api]);

  /** 展开：快照成员以 opacity 0 加回（NEVER，已在场的跳过防重复 id）→ 提交展开态补丁（IMMEDIATELY）→ 淡入 */
  const runUnfold = async (handle: EaBoardHandle, headId: string): Promise<void> => {
    const head = handle.getElements().find((e) => e.id === headId);
    if (!head) return;
    const presentIds = new Set(handle.getElements().map((e) => e.id));
    const ops = planUnfold(head as FoldCandidate & { excaliToggle?: unknown }, presentIds);
    if (!ops) return;
    animating.current = headId;
    try {
      const specs = ops.specs.map((s) => ({ ...s, opacity: 0 }));
      const ids = handle.addElements(specs as never, CaptureUpdateAction.NEVER);
      handle.patchElements([headId], ops.headPatch, CaptureUpdateAction.IMMEDIATELY);
      const y0 = new Map(ops.specs.map((s) => [String(s.id), Number(s.y ?? 0)]));
      for (let i = 1; i <= FRAMES; i++) {
        if (!alive.current) return;
        const e = easeOutCubic(i / FRAMES);
        for (const id of ids) {
          handle.patchElements([id], { opacity: Math.round(e * 100), y: (y0.get(id) ?? 0) + (1 - e) * SLIDE } as never, CaptureUpdateAction.NEVER);
        }
        await nextFrame();
      }
    } finally {
      animating.current = null;
    }
  };

  /** 收起：成员淡出 + 下滑（NEVER）→ 末帧删成员 + 提交折叠态补丁（IMMEDIATELY） */
  const runRefold = async (handle: EaBoardHandle, headId: string): Promise<void> => {
    const head = handle.getElements().find((e) => e.id === headId);
    if (!head) return;
    const ops = planRefold(head as FoldCandidate & { excaliToggle?: unknown }, handle.getElements() as never);
    if (!ops) {
      notify?.(t("折叠头里的成员已不在画布上：重新框选后再折叠"));
      return;
    }
    animating.current = headId;
    try {
      const y0 = new Map(ops.deleteIds.map((id) => [id, handle.getElements().find((e) => e.id === id)?.y ?? 0]));
      for (let i = 1; i <= FRAMES; i++) {
        if (!alive.current) return;
        const e = easeOutCubic(i / FRAMES);
        for (const id of ops.deleteIds) {
          handle.patchElements([id], { opacity: Math.round((1 - e) * 100), y: (y0.get(id) ?? 0) + e * SLIDE } as never, CaptureUpdateAction.NEVER);
        }
        await nextFrame();
      }
      if (!alive.current) return;
      handle.deleteElements(ops.deleteIds, CaptureUpdateAction.IMMEDIATELY);
      handle.patchElements([headId], ops.headPatch, CaptureUpdateAction.IMMEDIATELY);
    } finally {
      animating.current = null;
    }
  };

  const onBadgeClick = (item: FoldBadge): void => {
    if (animating.current) return;
    const handle = getHandle();
    if (!handle) return;
    if (item.collapsed) void runUnfold(handle, item.id);
    else void runRefold(handle, item.id);
  };

  if (badges.length === 0) return null;
  return (
    <div
      className="exs-fold-layer"
      style={{ "--exs-fold-scale": String(badges[0].scale) } as React.CSSProperties}
    >
      {badges.map((b) => (
        <button
          key={b.id}
          type="button"
          className={`exs-fold-badge${b.collapsed ? " exs-fold-badge--folded" : ""}`}
          style={{ left: b.left, top: b.top }}
          title={b.collapsed ? t("展开隐藏的 {n} 个元素", { n: b.count }) : t("收起下方元素")}
          aria-label={b.collapsed ? t("展开") : t("收起")}
          onClick={() => onBadgeClick(b)}
        >
          <span className="exs-fold-badge__glyph">{b.collapsed ? "▶" : "−"}</span>
          {b.collapsed && b.count > 0 ? <span className="exs-fold-badge__count">{b.count}</span> : null}
        </button>
      ))}
    </div>
  );
}
