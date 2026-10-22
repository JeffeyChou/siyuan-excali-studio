/**
 * 第五十三轮·批 1B：放映舞台——幕布 + HUD。
 *
 * 幕布是 SVG mask 挖洞：整块半透明黑盖住画布，只把**当前页画框**露出来。
 * 相机动画期间 scrollX/scrollY/zoom 每帧都在变，所以这里用 rAF 直接改属性，
 * 不经过 React state——每帧 setState 会把整棵 StudioApp 拖着重渲染。
 *
 * 换算与 scene-point 同一套口径：屏幕 = (场景 + scroll) × zoom（相对画布左上角）。
 * 组件住在 .exs-canvas（relative）里，含块跟着画布走，思源右 Dock / 分栏时
 * 幕布不会跑到视口边缘去（第三十八轮色板的教训）。
 */

import { useEffect, useRef } from "react";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { t } from "../i18n";
import type { RunPlan } from "./presentation-run.ts";

/** 洞比画框外扩这么多屏幕像素，避免内容贴着幕布边 */
const HOLE_PAD = 10;
const HOLE_RADIUS = 14;

export function PresentationStage(props: {
  api: ExcalidrawImperativeAPI | null;
  /** 当前页的放映计划（画框几何来自进片场时的快照） */
  plan: RunPlan;
  /** 所有入片页的标题，下标与游标 page 一致 */
  titles: readonly string[];
  page: number;
  /** 幕布开关：关掉时只留 HUD（画框外不再压暗） */
  scrim: boolean;
  /** 点进度点 → 跳到那一页（从该页第一条开始） */
  onJump: (page: number) => void;
  onExit: () => void;
}) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const holeRef = useRef<SVGRectElement | null>(null);
  const edgeRef = useRef<SVGRectElement | null>(null);
  // 用画框 id 而不是 useId：同一工作区可能同时挂着多块画板（各自的 React root），
  // useId 的计数器按 root 走会撞；画框 id 全年工作区唯一。
  const maskId = "exs-present-hole-" + (props.plan.frameId.replace(/[^a-zA-Z0-9_-]/g, "") || "frame");

  useEffect(() => {
    if (!props.scrim) return;
    let raf = 0;
    let last = "";
    const tick = (): void => {
      raf = window.requestAnimationFrame(tick);
      const svg = svgRef.current;
      const hole = holeRef.current;
      const api = props.api;
      if (!svg || !hole || !api) return;
      const st = api.getAppState();
      const zoom = st.zoom?.value || 1;
      const { x, y, w, h } = props.plan.box;
      const sx = (x + (st.scrollX || 0)) * zoom;
      const sy = (y + (st.scrollY || 0)) * zoom;
      const sw = w * zoom;
      const sh = h * zoom;
      const sig = `${sx.toFixed(2)},${sy.toFixed(2)},${sw.toFixed(2)},${sh.toFixed(2)}`;
      if (sig === last) return;
      last = sig;
      hole.setAttribute("x", String(sx - HOLE_PAD));
      hole.setAttribute("y", String(sy - HOLE_PAD));
      hole.setAttribute("width", String(Math.max(0, sw + HOLE_PAD * 2)));
      hole.setAttribute("height", String(Math.max(0, sh + HOLE_PAD * 2)));
      const edge = edgeRef.current;
      if (edge) {
        edge.setAttribute("x", String(sx - HOLE_PAD));
        edge.setAttribute("y", String(sy - HOLE_PAD));
        edge.setAttribute("width", String(Math.max(0, sw + HOLE_PAD * 2)));
        edge.setAttribute("height", String(Math.max(0, sh + HOLE_PAD * 2)));
      }
    };
    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, [props.api, props.plan, props.scrim]);

  const total = props.titles.length;
  const title = props.titles[props.page] ?? "";

  return (
    <>
      {props.scrim ? (
        <svg ref={svgRef} className="exs-present-scrim" aria-hidden="true">
          <defs>
            <mask id={maskId}>
              <rect x="0" y="0" width="100%" height="100%" fill="#fff" />
              <rect ref={holeRef} x="0" y="0" width="0" height="0" rx={HOLE_RADIUS} ry={HOLE_RADIUS} fill="#000" />
            </mask>
          </defs>
          <rect className="exs-present-scrim__fill" x="0" y="0" width="100%" height="100%" mask={`url(#${maskId})`} />
          <rect
            ref={edgeRef}
            className="exs-present-scrim__edge"
            x="0"
            y="0"
            width="0"
            height="0"
            rx={HOLE_RADIUS}
            ry={HOLE_RADIUS}
          />
        </svg>
      ) : null}

      <div className="exs-present-hud">
        <div className="exs-present-hud__top">
          <button type="button" className="exs-present-exit" title={t("退出演示")} aria-label={t("退出演示")} onClick={props.onExit}>
            ✕
          </button>
        </div>
        <div className="exs-present-hud__bottom">
          <span className="exs-present-hud__title" title={title}>
            {title}
          </span>
          <span className="exs-present-hud__dots" role="group" aria-label={t("页码")}>
            {props.titles.map((label, i) => (
              <button
                key={i}
                type="button"
                className={
                  "exs-present-dot" + (i === props.page ? " exs-present-dot--on" : "") + (i < props.page ? " exs-present-dot--past" : "")
                }
                title={label || t("第 {n} 页", { n: i + 1 })}
                aria-label={t("第 {n} 页", { n: i + 1 })}
                aria-current={i === props.page ? "step" : undefined}
                onClick={() => props.onJump(i)}
              />
            ))}
          </span>
          <span className="exs-present-hud__count">
            {props.page + 1} / {total}
          </span>
        </div>
      </div>
    </>
  );
}
