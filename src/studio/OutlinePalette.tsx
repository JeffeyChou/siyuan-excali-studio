/**
 * 第四十五轮：仅外框色板——竖条按钮的不占位浮层（与荧光笔色板同一套定位口径）。
 *
 * 为什么是 fixed 兄弟节点而不是按钮下拉：竖条带 overflow-y:auto + backdrop-filter，
 * 子元素会被裁/拉进层叠上下文；「换色不占地」也靠浮层，竖条恒宽 42px。
 *
 * 只在内容层做展示：取色后回调宿主（StudioApp）打 strokeColor 补丁，本组件不碰画布。
 * 选色不自动收：改边框常是连续试色（先白、再调灰），点「完成」或点外面才收。
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { t } from "../i18n";
import { OUTLINE_COLORS } from "./outline.ts";

/** 色板与竖条的间隙（与荧光笔色板的 PAL_GAP 一致） */
const PAL_GAP = 12;

export function OutlinePalette(props: {
  /** 定位锚点：竖条上的动作按钮；动作没固定时退化到竖条本身 */
  anchor: HTMLElement;
  /** 触发按钮（点它不关色板，交给开合逻辑翻转）；外部请求打开时可能为 null */
  trigger: HTMLElement | null;
  onPick: (color: string) => void;
  onClose: () => void;
}) {
  const palRef = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState(() => {
    const r = props.anchor.getBoundingClientRect();
    return { top: r.top - 8, right: window.innerWidth - r.left + PAL_GAP };
  });
  const [customColor, setCustomColor] = useState("#1e1e1e");
  const committedRef = useRef("#1e1e1e");

  const close = props.onClose;

  // 点色板外任意处关；Escape 同关。触发按钮本身除外——它走 ScriptRail 的开合翻转。
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      const target = e.target;
      if (!(target instanceof Node)) return;
      if (palRef.current?.contains(target)) return;
      if (props.trigger?.contains(target)) return;
      close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("pointerdown", onDown, true);
    window.addEventListener("keydown", onKey, true);
    return () => {
      window.removeEventListener("pointerdown", onDown, true);
      window.removeEventListener("keydown", onKey, true);
    };
  }, [close, props.trigger]);

  // 贴边夹紧：尺寸渲染后才量得到；值没变就不 setState（不会震荡）。
  // 双向 clamp：竖条收进时锚点按钮 rect 在屏幕外，right 会算成负数——单向上限
  // 夹不住它，色板会被裁在右缘外；这里把负数抬回 8px 贴边。
  useEffect(() => {
    const pal = palRef.current;
    if (!pal) return;
    const vh = window.innerHeight;
    const vw = window.innerWidth;
    const nextTop = Math.max(8, Math.min(pos.top, vh - pal.offsetHeight - 8));
    const nextRight = Math.max(8, Math.min(pos.right, vw - pal.offsetWidth - 8));
    if (nextTop !== pos.top || nextRight !== pos.right) setPos({ top: nextTop, right: nextRight });
  });

  const pickCustom = useCallback(() => {
    const c = customColor.toLowerCase();
    if (c === committedRef.current) return;
    committedRef.current = c;
    props.onPick(c);
  }, [customColor, props]);

  return (
    <div
      ref={palRef}
      className="exs-outline-palette"
      role="group"
      aria-label={t("仅外框颜色")}
      style={{ top: pos.top, right: pos.right }}
    >
      <div className="exs-outline-palette__head">
        <span className="exs-outline-palette__title">{t("仅外框颜色")}</span>
      </div>
      <div className="exs-outline-palette__hint">{t("只改边框颜色，文字颜色保持不变")}</div>
      <div className="exs-outline-palette__swatches">
        {OUTLINE_COLORS.map((c) => (
          <button
            key={c.value}
            type="button"
            className={"exs-outline-sw" + (c.value === "transparent" ? " exs-outline-sw--none" : "")}
            style={c.value === "transparent" ? undefined : { background: c.value }}
            title={t(c.label) + (c.value === "transparent" ? "" : " " + c.value)}
            aria-label={t(c.label)}
            onClick={() => props.onPick(c.value)}
          />
        ))}
      </div>
      <label className="exs-outline-palette__custom">
        <input
          type="color"
          value={customColor}
          onChange={(e) => setCustomColor(e.target.value)}
          onBlur={pickCustom}
          aria-label={t("自定义颜色")}
        />
        <span>{t("自定义")}</span>
      </label>
      <div className="exs-outline-palette__foot">
        <span>{t("可连续换色")}</span>
        <button type="button" className="exs-outline-palette__done" onClick={props.onClose}>
          {t("完成")}
        </button>
      </div>
    </div>
  );
}
