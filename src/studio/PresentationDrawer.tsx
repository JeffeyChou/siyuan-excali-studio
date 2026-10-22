/**
 * 第五十三轮：演示抽屉——画布右缘的浮层，管「哪几页、什么顺序、放不放、怎么放」。
 *
 * 为什么住画布里而不是思源的 Dialog：演示是**有状态的运行时**，页列表要和画布
 * 同屏共存（点一页要能把镜头开过去看那一页），Dialog 会糊在中间挡画布。
 * 为什么是 absolute 而不是 fixed：fixed 的含块是视口，思源右 Dock 开着或页签左右
 * 分栏时视口右缘 ≠ 画布右缘（第三十八轮色板就是栽在这儿）；absolute 的含块是
 * `.exs-root`（position: relative，本组件与 .exs-canvas 都是它的子节点），跟着画布走。
 *
 * 本组件只读片单/偏好、只发意图（挪页 / 排除 / 整页 / 跳页 / 改偏好），
 * 写元数据、落设置和动镜头都在 StudioApp。
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { t } from "../i18n";
import { LineIcon } from "./line-icon";
import { ICON_PLAY } from "./menu-icons";
import { slideTitle, type Deck } from "./presentation-plan";
import type { GraphState } from "./presentation-graph.ts";
import type { PresentationSettings } from "./settings";

/** 眼睛（入片/排除）。全绝对坐标，口径同 menu-icons。 */
const ICON_EYE =
  "M2.5,12C4.6,8.6 8.1,6.6 12,6.6C15.9,6.6 19.4,8.6 21.5,12C19.4,15.4 15.9,17.4 12,17.4C8.1,17.4 4.6,15.4 2.5,12Z" +
  "M12,9.6A2.4,2.4 0 1 0 12,14.4A2.4,2.4 0 1 0 12,9.6Z";

/** 斜线（排除页的眼睛上叠一道） */
const ICON_SLASH = "M4,20L20,4";

/** 逐条出场：三条长短不一的横线（一眼看出「一条条来」） */
const ICON_STEPS = "M5,7h14M5,12h9M5,17h5";

/** 设置：推子 */
const ICON_SLIDERS = "M4,7h8M17,7h3M4,12h3M11,12h9M4,17h8M17,17h3";

/**
 * 面板位置记忆的localStorage 键。为什么存这里而不是 PresentationSettings：
 * 那是「放映偏好」语义（幕布/打字机那类，改一次所有白板共用、且面板里可见可调），
 * 面板停在哪是纯本地视图状态，塞进去会给设置 schema 和它的 deepEqual 测试平白添键。
 * 用独立键还有个好处：换白板/换窗口都记得住，但不影响任何共享语义。
 */
const POS_KEY = "excali-present-drawer-pos";

/** 落位记忆：相对包含块(.exs-root)的百分比，换分辨率/窗口大小不会飘 */
type DrawerPos = { rx: number; ry: number };

function readPos(): DrawerPos | null {
  try {
    const raw = localStorage.getItem(POS_KEY);
    if (!raw) return null;
    const o = JSON.parse(raw) as Partial<DrawerPos>;
    if (typeof o.rx !== "number" || typeof o.ry !== "number") return null;
    if (!Number.isFinite(o.rx) || !Number.isFinite(o.ry)) return null;
    return { rx: Math.min(1, Math.max(0, o.rx)), ry: Math.min(1, Math.max(0, o.ry)) };
  } catch {
    return null;
  }
}

function writePos(p: DrawerPos | null): void {
  try {
    if (p) localStorage.setItem(POS_KEY, JSON.stringify(p));
    else localStorage.removeItem(POS_KEY);
  } catch {
    /* 隐私模式/配额满：记不住就只在本次会话内生效，不报错 */
  }
}

function ToggleRow(props: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (on: boolean) => void;
}) {
  return (
    <label className={"exs-present-set" + (props.disabled ? " exs-present-set--disabled" : "")}>
      <span className="exs-present-set__label">{props.label}</span>
      <input
        type="checkbox"
        className="exs-present-switch"
        checked={props.checked}
        disabled={props.disabled}
        onChange={(e) => props.onChange(e.currentTarget.checked)}
      />
    </label>
  );
}

export function PresentationDrawer(props: {
  deck: Deck;
  /**
   * 第七十六轮：放映图状态——板子上有画框之间的箭头吗？
   * 有 → 放映沿箭头走；没有 → 按片单顺序翻。面板上要说清楚现在走哪条路线。
   */
  graph: GraphState;
  /** 放映偏好（宿主设置的本地快照；改一项就往上写一项） */
  settings: PresentationSettings;
  onSetting: <K extends keyof PresentationSettings>(key: K, value: PresentationSettings[K]) => void;
  /** 面板里当前选中的页（下标跟 deck.slides 一致） */
  selected: number;
  onSelect: (index: number) => void;
  /** 上移/下移一页 → StudioApp 写 order 元数据 */
  onMove: (from: number, to: number) => void;
  /** 入片/排除一页 */
  onToggle: (id: string) => void;
  /** 这一页逐条 ↔ 整页 */
  onToggleReveal: (id: string) => void;
  /** 点「开始演示」→ 批 1 的放映控制器接管；本批只报状态 */
  onStart: () => void;
  onClose: () => void;
}) {
  const { slides } = props.deck;
  const shown = slides.filter((s) => s.included).length;
  const [showSettings, setShowSettings] = useState(false);
  const st = props.settings;

  /**
   * 拖动：按住头部空白处拖动面板（设置/关闭按钮除外，见 onHeadPointerDown）。
   * 位置存「相对包含块的百分比」，用 top/left 绝对定位，由 CSS 默认值兜底默认位。
   * null = 还没拖过 → 用 CSS 的默认右缘位置（top:52/right:10）。
   */
  const rootRef = useRef<HTMLElement | null>(null);
  const [pos, setPos] = useState<DrawerPos | null>(null);
  const [dragging, setDragging] = useState(false);
  useEffect(() => {
    setPos(readPos());
  }, []);

  const onHeadPointerDown = useCallback((e: React.PointerEvent) => {
    // 头部有设置/关闭两个按钮：点在按钮上不启动拖动，否则点按钮会变成拖面板
    if ((e.target as HTMLElement).closest("button")) return;
    const root = rootRef.current;
    if (!root) return;
    const cb = root.offsetParent as HTMLElement | null;
    if (!cb) return;
    e.preventDefault();
    const cbRect = cb.getBoundingClientRect();
    const selfRect = root.getBoundingClientRect();
    // 起点用当前实际位置（相对包含块），移动 = 起点 + 指针增量
    const left0 = selfRect.left - cbRect.left;
    const top0 = selfRect.top - cbRect.top;
    const clientX0 = e.clientX;
    const clientY0 = e.clientY;
    setDragging(true);
    const clamp = (v: number, max: number): number => Math.min(Math.max(0, v), Math.max(0, max));
    let last: DrawerPos = { rx: 0, ry: 0 };
    const onMove = (ev: PointerEvent): void => {
      const nx = left0 + (ev.clientX - clientX0);
      const ny = top0 + (ev.clientY - clientY0);
      const rx = cbRect.width > 0 ? clamp(nx, cbRect.width - selfRect.width) / cbRect.width : 0;
      const ry = cbRect.height > 0 ? clamp(ny, cbRect.height - selfRect.height) / cbRect.height : 0;
      last = { rx, ry };
      setPos(last);
    };
    const onUp = (): void => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      setDragging(false);
      writePos(last);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  }, []);

  const onHeadDoubleClick = useCallback((): void => {
    setPos(null);
    writePos(null);
  }, []);

  const posStyle = pos
    ? ({ left: `${pos.rx * 100}%`, top: `${pos.ry * 100}%`, right: "auto", bottom: "auto" } as const)
    : undefined;

  return (
    <aside
      ref={rootRef}
      className={"exs-present-drawer" + (dragging ? " exs-present-drawer--dragging" : "")}
      style={posStyle}
      role="complementary"
      aria-label={t("演示")}
    >
      <header
        className="exs-present-drawer__head"
        onPointerDown={onHeadPointerDown}
        onDoubleClick={onHeadDoubleClick}
        title={t("拖动移动位置，双击复位")}
      >
        <span className="exs-present-drawer__title">{t("演示")}</span>
        <span className="exs-present-drawer__meta">
          {t("{n} 页", { n: shown })}
          {props.deck.hasOrdered ? "" : ` · ${t("按位置排序")}`}
          {props.graph.kind === "linear" ? "" : ` · ${t("按箭头走")}`}
        </span>
        <button
          type="button"
          className={"exs-present-close" + (showSettings ? " exs-present-close--on" : "")}
          onClick={() => setShowSettings(!showSettings)}
          title={t("演示设置")}
          aria-label={t("演示设置")}
          aria-expanded={showSettings}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
            <path d={ICON_SLIDERS} />
            <circle cx="15" cy="7" r="2" />
            <circle cx="9" cy="12" r="2" />
            <circle cx="15" cy="17" r="2" />
          </svg>
        </button>
        <button type="button" className="exs-present-close" onClick={props.onClose} title={t("关闭")} aria-label={t("关闭")}>
          ✕
        </button>
      </header>

      {showSettings ? (
        <section className="exs-present-settings" aria-label={t("演示设置")}>
          <ToggleRow label={t("幕布")} checked={st.scrim} onChange={(v) => props.onSetting("scrim", v)} />
          <ToggleRow label={t("逐条出场")} checked={st.reveal} onChange={(v) => props.onSetting("reveal", v)} />
          <ToggleRow label={t("打字机")} checked={st.typewriter} onChange={(v) => props.onSetting("typewriter", v)} />
          <ToggleRow
            label={t("打字光标")}
            checked={st.cursor}
            disabled={!st.typewriter}
            onChange={(v) => props.onSetting("cursor", v)}
          />
          <ToggleRow label={t("全屏放映")} checked={st.fullscreen} onChange={(v) => props.onSetting("fullscreen", v)} />
          <ToggleRow
            label={t("方向键沿边导航")}
            checked={st.directional}
            onChange={(v) => props.onSetting("directional", v)}
          />
          <label className={"exs-present-set exs-present-set--range" + (st.typewriter ? "" : " exs-present-set--disabled")}>
            <span className="exs-present-set__label">{t("打字速度")}</span>
            <input
              type="range"
              min={8}
              max={80}
              step={4}
              value={st.speed}
              disabled={!st.typewriter}
              onChange={(e) => props.onSetting("speed", Number(e.currentTarget.value))}
            />
            <span className="exs-present-set__val">{t("{n} 毫秒/字", { n: st.speed })}</span>
          </label>
          <label className="exs-present-set exs-present-set--range">
            <span className="exs-present-set__label">{t("镜头留白")}</span>
            <input
              type="range"
              min={0.6}
              max={1}
              step={0.02}
              value={st.fit}
              onChange={(e) => props.onSetting("fit", Number(e.currentTarget.value))}
            />
            <span className="exs-present-set__val">{Math.round(st.fit * 100)}%</span>
          </label>
          <label className="exs-present-set exs-present-set--range">
            <span className="exs-present-set__label">{t("自动前进")}</span>
            <input
              type="range"
              min={0}
              max={30}
              step={1}
              value={st.autoAdvance}
              onChange={(e) => props.onSetting("autoAdvance", Number(e.currentTarget.value))}
            />
            <span className="exs-present-set__val">
              {st.autoAdvance === 0 ? t("关") : t("{n} 秒", { n: st.autoAdvance })}
            </span>
          </label>
        </section>
      ) : null}

      <div className="exs-present-drawer__body">
        {slides.length === 0 ? (
          <div className="exs-present-empty">
            <b>{t("还没有演示页")}</b>
            {t("先在画布上框住一页内容，再点右上角的 ▶ 建片单。")}
          </div>
        ) : (
          <ol className="exs-present-list">
            {slides.map((s, i) => (
              <li
                key={s.id}
                className={
                  "exs-present-row" + (i === props.selected ? " exs-present-row--active" : "") + (s.included ? "" : " exs-present-row--off")
                }
              >
                <button type="button" className="exs-present-row__main" onClick={() => props.onSelect(i)}>
                  <span className="exs-present-row__no">{i + 1}</span>
                  <span className="exs-present-row__name">{t(slideTitle(s))}</span>
                </button>
                <button
                  type="button"
                  className={"exs-present-mini" + (s.reveal === "all" ? " exs-present-mini--muted" : "")}
                  onClick={() => props.onToggleReveal(s.id)}
                  title={s.reveal === "all" ? t("这一页逐条出场") : t("这一页整页一起出")}
                  aria-label={s.reveal === "all" ? t("这一页逐条出场") : t("这一页整页一起出")}
                  aria-pressed={s.reveal === "auto"}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    aria-hidden="true"
                  >
                    <path d={ICON_STEPS} />
                  </svg>
                </button>
                <button
                  type="button"
                  className="exs-present-mini"
                  disabled={i === 0}
                  onClick={() => props.onMove(i, i - 1)}
                  title={t("上移")}
                  aria-label={t("上移")}
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="exs-present-mini"
                  disabled={i === slides.length - 1}
                  onClick={() => props.onMove(i, i + 1)}
                  title={t("下移")}
                  aria-label={t("下移")}
                >
                  ↓
                </button>
                <button
                  type="button"
                  className={"exs-present-mini" + (s.included ? "" : " exs-present-mini--off")}
                  onClick={() => props.onToggle(s.id)}
                  title={s.included ? t("这一页不放映") : t("重新入片")}
                  aria-label={s.included ? t("这一页不放映") : t("重新入片")}
                  aria-pressed={!s.included}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    aria-hidden="true"
                  >
                    <path d={ICON_EYE} />
                    {s.included ? null : <path d={ICON_SLASH} />}
                  </svg>
                </button>
              </li>
            ))}
          </ol>
        )}
        <div className="exs-present-tip">
          {props.graph.kind === "linear"
            ? t("点页名把镜头开过去；↑↓ 改页序，≡ 管整页还是逐条，眼睛管放不放。")
            : props.graph.kind === "linked"
              ? t("已按箭头连页：放映沿箭头走，可分叉也能绕回。")
              : t("部分页面还没连上箭头，没连的按页序继续放。")}
        </div>
      </div>

      <footer className="exs-present-drawer__foot">
        <button type="button" className="exs-present-play" onClick={props.onStart} disabled={shown === 0}>
          <LineIcon d={ICON_PLAY} size={14} strokeWidth={2} />
          {t("开始演示")}
        </button>
      </footer>
    </aside>
  );
}
