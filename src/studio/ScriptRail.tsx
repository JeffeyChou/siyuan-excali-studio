/**
 * 第三十四轮：画布右缘脚本侧边栏（ScriptRail）——对标 Obsidian Excalidraw 的
 * 「固定按钮到 Excalidraw 侧边栏」：
 * - 常驻一枚「运行脚本…」入口按钮（打开脚本选择器）；
 * - 下面列出被固定的脚本（选择器里右键 → 固定到侧边栏），点图标立即对当前画布执行；
 * - 固定按钮**右键 → 从侧边栏取消固定**（Obsidian 的 pin 交互；长按留给移动端再说）。
 *
 * 第三十四轮·两态全手动（第三十五轮·用户拍板删图钉）：
 * - 展开态：玻璃竖条常驻，不遮挡主视图；
 * - 收进态：整条 translateX 滑出画面，右缘只留一条贴边半露拉手（三点提示），点拉手弹回；
 *   收进/展开一律手动（scriptRailCollapsed 记忆），无任何自动收进；
 * - 固定脚本按 SCRIPT_ICONS 映射显示专属图标（未配置回落齿轮）；
 * - 拖拽跟手：起点用 getBoundingClientRect 相对包含块（offsetParent）重算。
 *
 * 第四十一轮：竖条里多了「画布动作」——内置能力（插入白板卡片、仅外框颜色）与固定脚本
 * 共用同一条列表、同一个右键取消固定、同一份广播，但走各自的执行通道：脚本进内核
 * goja，动作调 React 侧的画布 API。钉子清单在 settings.pinnedActions，默认只钉白板卡片。
 * 动作排在固定脚本之前（内置的在上面，用户自己钉的在下面）。
 * 第四十五轮：「仅外框颜色」点开的是不占位色板（OutlinePalette），选色只改边框。
 *
 * 纯 UI 组件：脚本列表/固定状态/视图偏好经 StudioProps 回调向宿主取（React 树里
 * 没有 SiYuan API），固定状态变更后宿主广播 window 事件，本组件监听后重拉。
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { t } from "../i18n";
import type { ScriptRunOpts } from "./ea-api";
import { ICON_CHEVRON_RIGHT, ICON_HIGHLIGHTER, ICON_SCRIPT, ICON_SCRIPT_GEAR, SCRIPT_ICONS } from "./menu-icons";
import { LineIcon } from "./line-icon";
import { OUTLINE_COLOR, type RailActionId, type RailActionMeta } from "./rail-actions.ts";
import { OutlinePalette } from "./OutlinePalette";
import { HL_COLORS, HL_SIZES, highlighterPx, type HighlighterConfig } from "./pens.ts";

/** 侧边栏条目：脚本文件名 + 选择器解析出的标题（tooltip 用） */
export type ScriptRailItem = { name: string; title: string };

/** 拖拽的垂直边界：顶端避开 vendor 右上按钮簇，底端留出缩放控件 */
const TOP_MIN = 56;
/** 色板与竖条的间隙：色板右缘落在荧光笔按钮左缘再往左这么多 px */
const PAL_GAP = 12;

export function ScriptRail(props: {
  pinned: ScriptRailItem[];
  /** 第四十一轮：钉在竖条里的画布动作（排在固定脚本之前；元数据查 rail-actions） */
  actions: RailActionMeta[];
  /** 手动收进（宿主设置，记忆；true = 整条滑出、右缘留拉手） */
  railCollapsed: boolean;
  /** 脚本选择器/脚本 Dialog 开着（宿主广播）：整条让位，避免与弹窗竞合 */
  pickerOpen: boolean;
  /**
   * 2026-10-19：vendor 右缘侧栏开着（素材库 / 搜索，都贴右缘）——竖条整条让位，
   * **拉手一起藏**。用户实机反馈：竖条浮在素材库面板右缘「竞合」，挡面板自己的
   * ⋮/✕。侧栏关掉自动恢复（不收进记忆，用户的手动收进状态原样保留）。
   */
  sidebarOpen: boolean;
  /** 垂直位置（画布高度百分比 0~0.85；拖拽落手后由宿主记忆） */
  railTop: number;
  /** 点「运行脚本…」入口 → 宿主打开脚本库 */
  onOpenPicker: () => void;
  /** 点一枚固定脚本 → 立即对当前画布执行（opts.shift = 点按钮时按住 Shift，
   *  编号脚本用它作「显式请求格式菜单」的信号；opts.at = 点击坐标，菜单锚点用） */
  onRunScript: (name: string, opts?: ScriptRunOpts) => void;
  /** 右键菜单「从侧边栏取消固定」→ 宿主改设置并广播 */
  onUnpin: (name: string) => void;
  /** 第四十一轮：点一枚画布动作 → **本画布**执行（不绕宿主的活动画布通道，
   *  免得页签活动态和竖条所在画布不是同一块时把卡片插到别的画布里） */
  onRunAction: (id: RailActionId) => void;
  /** 第四十一轮：动作的取消固定 → 宿主落 pinnedActions 并广播 */
  onUnpinAction: (id: RailActionId) => void;
  /** 手动收进/展开翻转（宿主落设置并广播） */
  onToggleRailCollapsed: () => void;
  /** 拖拽落手 → 宿主按百分比记忆位置 */
  onRailTopChange: (topPct: number) => void;
  /** 第三十八轮：荧光笔配置（与设置同一份；色板显示 + 高亮圈都读它） */
  highlighter: HighlighterConfig;
  /** 这块画布此刻是否拿着荧光笔（真源是 vendor 的 appState，由 StudioApp 反推） */
  hlActive: boolean;
  onActivateHighlighter: () => void;
  onDeactivateHighlighter: () => void;
  /** 色板改配置（局部补丁，StudioApp 负责合并归一） */
  onHighlighterChange: (patch: Partial<HighlighterConfig>) => void;
  /** 第四十五轮：脚本库里点「仅外框颜色」→ 宿主递增请求号，本画布开色板 */
  outlineRequest: number;
  /** 第四十五轮：色板选色 → StudioApp 只给选中图形打 strokeColor 补丁 */
  onOutlineColor: (color: string) => void;
}) {
  /** 右键小菜单：锚定按钮 + 视口坐标（position:fixed，点外面/Escape 关）。
   *  kind 区分固定脚本与画布动作——取消固定写回两个不同的设置键 */
  const [menu, setMenu] = useState<{ kind: "script" | "action"; name: string; x: number; y: number } | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  /** 拖拽：进行中的临时 top（px）；null = 未在拖（用记忆的百分比） */
  const [dragTopPx, setDragTopPx] = useState<number | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const draggingRef = useRef(false);

  useEffect(() => {
    if (!menu) return;
    const close = (e: MouseEvent) => {
      if (menuRef.current && e.target instanceof Node && menuRef.current.contains(e.target)) return;
      setMenu(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenu(null);
    };
    window.addEventListener("mousedown", close, true);
    window.addEventListener("keydown", onKey, true);
    return () => {
      window.removeEventListener("mousedown", close, true);
      window.removeEventListener("keydown", onKey, true);
    };
  }, [menu]);

  // 全手动两态：railOff 看记忆的 scriptRailCollapsed，无任何自动收进。
  // 两档临时让位（都不改记忆，条件消失即恢复）：
  // - pickerOpen：脚本选择器开着——真机 bug：竖条 z-index 曾高过思源 Dialog
  //   （计数器从 10 起、不可控），浮在弹窗上「竞合」；现已双重防御：
  //   CSS 层压到 Dialog 之下（index.css z-index 8/6）+ 这里主动隐藏；
  // - sidebarOpen：vendor 右缘侧栏（素材库/搜索）开着——同贴右缘硬叠互相挡，
  //   用户实机反馈的「竞合」。这一档连拉手一起藏（侧栏自己就贴在右缘，
  //   拉手浮上去正是被投诉的那个遮挡）。
  const railOff = props.railCollapsed || props.pickerOpen || props.sidebarOpen;
  const handleShow = railOff && !props.sidebarOpen;

  /*
   * 第三十八轮：荧光笔色板。
   * 立身之处是**竖条的兄弟节点 + position:fixed**，不是竖条的子元素——竖条自己有
   * overflow-y:auto（固定脚本多了会滚）和 backdrop-filter（会建裁剪/层叠上下文），
   * 塞进去要么被裁要么被糊；另外竖条的 onPointerDown 拖拽只放行非 button 区域，
   * 色板里的取色控件在竖条外，才不会被拖拽逻辑吃掉。
   * 「不占地方」是靠这套浮层实现的：竖条恒宽 42px，色板开合不改它的尺寸。
   */
  const hlBtnRef = useRef<HTMLButtonElement | null>(null);
  const palRef = useRef<HTMLDivElement | null>(null);
  const [palOpen, setPalOpen] = useState(false);
  const [palTop, setPalTop] = useState(0);
  const [palRight, setPalRight] = useState(0);
  /** 自定义色先在本地走，收盘（blur）才提交——原生取色面板每动一次就 input 一次，直提会把设置写盘打成机关枪 */
  const [customColor, setCustomColor] = useState(props.highlighter.color);

  /*
   * 第四十五轮：仅外框色板（OutlinePalette 自己定位/夹紧/关外点）。
   * outlineAnchor 非空 = 开着；与荧光笔色板互斥（两个 fixed 浮层都贴右缘，会硬叠）。
   */
  const outlineBtnRef = useRef<HTMLButtonElement | null>(null);
  const [outlineAnchor, setOutlineAnchor] = useState<HTMLElement | null>(null);
  const openOutline = useCallback((anchor: HTMLElement | null): void => {
    const a = anchor ?? outlineBtnRef.current ?? rootRef.current;
    if (!a) return;
    setPalOpen(false);
    setOutlineAnchor(a);
  }, []);
  const closeOutline = useCallback((): void => setOutlineAnchor(null), []);

  // 脚本库里点动作行：宿主递增请求号 → 本画布开色板（锚点优先用竖条上的按钮）
  const outlineReqRef = useRef(props.outlineRequest);
  useEffect(() => {
    if (props.outlineRequest === outlineReqRef.current) return;
    outlineReqRef.current = props.outlineRequest;
    openOutline(null);
  }, [props.outlineRequest, openOutline]);

  // 脚本库/右缘侧栏接管右缘时收（与竖条让位同一时机）。
  // railCollapsed 不在此列：竖条收进时脚本库仍能开色板，锚点会被夹回右缘。
  useEffect(() => {
    if (outlineAnchor && (props.pickerOpen || props.sidebarOpen)) setOutlineAnchor(null);
  }, [outlineAnchor, props.pickerOpen, props.sidebarOpen]);

  const openPal = useCallback(() => {
    const btn = hlBtnRef.current;
    if (!btn) return;
    const r = btn.getBoundingClientRect();
    // 顶边对齐按钮，渲染后再按实测高度往下夹（见下面的 clamp effect）
    setPalTop(r.top - 8);
    /*
     * 水平方向按按钮实测左缘算，不用视口常量：色板是 fixed（含块=视口），竖条是
     * absolute（含块=.exs-root）。思源右 Dock 开着、或页签左右分栏时，两者右缘不重合，
     * 常量会把色板推到竖条上面盖住下面的按钮。rect 与 innerWidth 同为视口坐标，恒等式成立。
     */
    setPalRight(window.innerWidth - r.left + PAL_GAP);
    setCustomColor(props.highlighter.color);
    setOutlineAnchor(null); // 与仅外框色板互斥
    setPalOpen(true);
  }, [props.highlighter.color]);

  const onHlBtnClick = useCallback(() => {
    if (!props.hlActive) {
      props.onActivateHighlighter();
      return;
    }
    if (palOpen) setPalOpen(false);
    else openPal();
  }, [openPal, palOpen, props.hlActive, props.onActivateHighlighter]);

  // 竖条收进 / 脚本选择器让位 / 荧光笔被关掉（含 vendor 里换工具触发的自动复位）→ 色板跟着收
  useEffect(() => {
    if (palOpen && (railOff || !props.hlActive)) setPalOpen(false);
  }, [railOff, palOpen, props.hlActive]);

  // 点色板外任意处关；Escape 同关（与右键小菜单同一套口径）
  useEffect(() => {
    if (!palOpen) return;
    const onDown = (e: PointerEvent) => {
      const inPal = palRef.current && e.target instanceof Node && palRef.current.contains(e.target);
      const inBtn = hlBtnRef.current && e.target instanceof Node && hlBtnRef.current.contains(e.target);
      if (!inPal && !inBtn) setPalOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPalOpen(false);
    };
    window.addEventListener("pointerdown", onDown, true);
    window.addEventListener("keydown", onKey, true);
    return () => {
      window.removeEventListener("pointerdown", onDown, true);
      window.removeEventListener("keydown", onKey, true);
    };
  }, [palOpen]);

  // 贴边夹紧：色板尺寸只在渲染后量得到，超屏就往里挪（值不变时不再 setState，不会震荡）
  useEffect(() => {
    if (!palOpen) return;
    const pal = palRef.current;
    const vh = window.innerHeight;
    const vw = window.innerWidth;
    if (!pal) return;
    const nextTop = Math.min(palTop, Math.max(8, vh - pal.offsetHeight - 8));
    if (nextTop !== palTop) setPalTop(nextTop);
    // 画布很窄时贴竖条会顶出左缘，这时退让到离左缘 8px（right 越小越靠右）
    const nextRight = Math.min(palRight, Math.max(8, vw - pal.offsetWidth - 8));
    if (nextRight !== palRight) setPalRight(nextRight);
  });

  // 拖拽：按住竖条空白处（按钮/菜单除外）沿右缘垂直拖动，落手按画布高度百分比记忆。
  // 基准必须是真正的包含块（offsetParent）——`top` 的 px/百分比都相对它结算。
  // 用 parentElement 会错位（中间层不是定位元素，包含块是 .exs-root）：按下先跳、
  // 首帧再往下弹一下、之后带着恒定偏差跟手。起点取当前实际 top，移动 = 起点 + 指针增量。
  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if ((e.target as HTMLElement).closest("button")) return;
      const rail = rootRef.current;
      if (!rail) return;
      e.preventDefault();
      const cb = rail.offsetParent;
      if (!cb) return;
      const cbRect = cb.getBoundingClientRect();
      const railRect = rail.getBoundingClientRect();
      const topPx0 = railRect.top - cbRect.top;
      const cbH = cbRect.height;
      const railH = railRect.height;
      const clientY0 = e.clientY;
      draggingRef.current = true;
      let lastTop = topPx0;
      setDragTopPx(lastTop);
      const onMove = (ev: PointerEvent) => {
        lastTop = Math.min(Math.max(topPx0 + (ev.clientY - clientY0), TOP_MIN), Math.max(TOP_MIN, cbH - railH - 16));
        setDragTopPx(lastTop);
      };
      const onUp = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onUp);
        draggingRef.current = false;
        setDragTopPx(null);
        props.onRailTopChange(Math.min(0.85, Math.max(0, lastTop / cbH)));
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onUp);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const openMenu = useCallback((e: React.MouseEvent, kind: "script" | "action", name: string) => {
    e.preventDefault();
    e.stopPropagation();
    setMenu({ kind, name, x: e.clientX, y: e.clientY });
  }, []);

  // 竖条与拉手共用同一垂直锚点：拖拽中用像素，平时用记忆百分比
  const topStyle = dragTopPx !== null ? `${dragTopPx}px` : `clamp(${TOP_MIN}px, ${props.railTop * 100}%, calc(100% - 120px))`;

  return (
    <>
      <div
        ref={rootRef}
        className={"exs-script-rail" + (railOff ? " exs-script-rail--off" : "") + (dragTopPx !== null ? " exs-script-rail--dragging" : "")}
        role="toolbar"
        aria-label={t("脚本侧边栏")}
        aria-hidden={railOff}
        title={t("按住空白处可拖动")}
        onPointerDown={onPointerDown}
        style={{ top: topStyle }}
      >
        <button
          ref={hlBtnRef}
          type="button"
          className={"exs-script-rail__btn exs-hl-btn" + (props.hlActive ? " exs-hl-btn--on" : "")}
          style={{ ["--exs-hl-color" as string]: props.highlighter.color } as React.CSSProperties}
          title={props.hlActive ? t("荧光笔（已激活，再点换色）") : t("荧光笔")}
          aria-label={t("荧光笔")}
          aria-pressed={props.hlActive}
          onClick={onHlBtnClick}
        >
          <LineIcon d={ICON_HIGHLIGHTER} size={17} />
          <span className="exs-hl-btn__chip" aria-hidden="true" />
        </button>
        <div className="exs-script-rail__divider" />
        <button
          type="button"
          className="exs-script-rail__btn"
          title={t("运行脚本…")}
          aria-label={t("运行脚本…")}
          onClick={props.onOpenPicker}
        >
          <LineIcon d={ICON_SCRIPT} size={17} />
        </button>
        {props.actions.length + props.pinned.length > 0 ? <div className="exs-script-rail__divider" /> : null}
        {/* 第四十一轮：画布动作排在固定脚本前面（内置能力在上，用户自己钉的在下）
            第四十五轮：仅外框颜色点开的是本地色板，不走 onRunAction 的「立即执行」通道 */}
        {props.actions.map((a) => (
          <button
            key={a.id}
            ref={a.id === OUTLINE_COLOR ? outlineBtnRef : undefined}
            type="button"
            className={
              "exs-script-rail__btn" + (a.id === OUTLINE_COLOR && outlineAnchor ? " exs-script-rail__btn--active" : "")
            }
            title={t(a.title)}
            aria-label={t(a.title)}
            aria-expanded={a.id === OUTLINE_COLOR ? outlineAnchor !== null : undefined}
            onClick={(e) => {
              if (a.id === OUTLINE_COLOR) {
                if (outlineAnchor) setOutlineAnchor(null);
                else openOutline(e.currentTarget);
                return;
              }
              props.onRunAction(a.id);
            }}
            onContextMenu={(e) => openMenu(e, "action", a.id)}
          >
            <LineIcon d={a.icon} size={17} />
          </button>
        ))}
        {props.pinned.map((s) => (
          <button
            key={s.name}
            type="button"
            className="exs-script-rail__btn"
            title={s.title}
            aria-label={s.title}
            onClick={(e) => props.onRunScript(s.name, { shift: e.shiftKey, at: { x: e.clientX, y: e.clientY } })}
            onContextMenu={(e) => openMenu(e, "script", s.name)}
          >
            <LineIcon d={SCRIPT_ICONS[s.name] ?? ICON_SCRIPT_GEAR} size={17} />
          </button>
        ))}
        <div className="exs-script-rail__divider" />
        <button
          type="button"
          className="exs-script-rail__btn"
          title={t("收进边缘")}
          aria-label={t("收进边缘")}
          onClick={props.onToggleRailCollapsed}
        >
          <LineIcon d={ICON_CHEVRON_RIGHT} size={16} />
        </button>
        {menu ? (
          <div
            ref={menuRef}
            className="exs-script-rail__menu"
            style={{ left: menu.x, top: menu.y }}
            role="menu"
          >
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                if (menu.kind === "action") props.onUnpinAction(menu.name as RailActionId);
                else props.onUnpin(menu.name);
                setMenu(null);
              }}
            >
              {t("从侧边栏取消固定")}
            </button>
          </div>
        ) : null}
      </div>
      {/*
        第三十八轮：荧光笔色板——竖条的兄弟节点（见上面那段注释里的原因）。
        选预设色即收（一次性动作，收完就能画）；选粗细保持打开（连续比色刚需）；
        自定义色走原生取色面板，收盘才提交。
      */}
      {palOpen && !railOff ? (
        <div ref={palRef} className="exs-hl-palette" role="group" aria-label={t("荧光笔设置")} style={{ top: palTop, right: palRight }}>
          <div className="exs-hl-palette__label">{t("颜色")}</div>
          <div className="exs-hl-palette__swatches">
            {HL_COLORS.map((c) => (
              <button
                key={c.value}
                type="button"
                className="exs-hl-sw"
                style={{ background: c.value }}
                title={t(c.label) + " " + c.value}
                aria-label={t(c.label)}
                aria-pressed={props.highlighter.color === c.value}
                onClick={() => {
                  props.onHighlighterChange({ color: c.value });
                  setPalOpen(false);
                }}
              />
            ))}
          </div>
          <label className="exs-hl-palette__custom">
            <input
              type="color"
              value={customColor}
              onChange={(e) => setCustomColor(e.target.value)}
              onBlur={() => {
                if (customColor.toLowerCase() !== props.highlighter.color) props.onHighlighterChange({ color: customColor });
              }}
              aria-label={t("自定义颜色")}
            />
            <span>{t("自定义")}</span>
          </label>
          <div className="exs-hl-palette__label">{t("粗细")}</div>
          <div className="exs-hl-palette__sizes">
            {HL_SIZES.map((s) => (
              <button
                key={s.width}
                type="button"
                className="exs-hl-size"
                aria-pressed={props.highlighter.width === s.width}
                onClick={() => props.onHighlighterChange({ width: s.width })}
              >
                {t(s.label)}
                <small>{t("约 {n}px", { n: highlighterPx(s.width) })}</small>
              </button>
            ))}
          </div>
          <div className="exs-hl-palette__foot">
            <span className="exs-hl-palette__readout">
              {customColor} · {t("约 {n}px", { n: highlighterPx(props.highlighter.width) })} · {props.highlighter.opacity}%
            </span>
            <button type="button" className="exs-hl-palette__off" onClick={props.onDeactivateHighlighter}>
              {t("关闭荧光笔")}
            </button>
          </div>
        </div>
      ) : null}
      {/* 第四十五轮：仅外框色板（同样是竖条的兄弟节点；锚点/夹紧/关外点都在组件内） */}
      {outlineAnchor ? (
        <OutlinePalette
          anchor={outlineAnchor}
          trigger={outlineBtnRef.current === outlineAnchor ? outlineAnchor : null}
          onPick={props.onOutlineColor}
          onClose={closeOutline}
        />
      ) : null}
      {/* 收进态拉手：贴边半露，点按弹回（全手动，无自动收进） */}
      <div
        className={"exs-script-rail-handle" + (handleShow ? " exs-script-rail-handle--show" : "")}
        title={t("展开脚本侧边栏")}
        aria-hidden={!handleShow}
        style={{ top: topStyle }}
        onClick={() => {
          if (props.railCollapsed) props.onToggleRailCollapsed();
        }}
      >
        <span className="exs-script-rail-handle__dot" />
        <span className="exs-script-rail-handle__dot" />
        <span className="exs-script-rail-handle__dot" />
      </div>
    </>
  );
}
