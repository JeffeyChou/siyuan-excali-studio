/**
 * 画板宿主：Excalidraw 画布 + 保存/导出/重命名的编排。头部条已撤掉。
 *
 * 快捷键挂在 window 捕获阶段：Excalidraw 默认 handleKeyboardGlobally=false，
 * 快捷键只认容器内焦点，我们同样用 el.contains(target) 对齐这个语义，
 * 命中就 preventDefault + stopImmediatePropagation，浏览器与 Excalidraw 都收不到。
 * ⌘⇧E（导出）同理要抢在前面，否则弹的是 Excalidraw 自己的导出框。
 *
 * 保存语义（第二十一轮起）：白板 = 文件，「文件先行」——新建时宿主已落好空 scene
 * 文件并带好路径，这块画布从第一帧起就有归属文件；作画停手约 1 秒由防抖自动保存
 * 落盘，⌘S 跳过防抖立即落盘。菜单里不再有「保存 / 保存副本」——没有保存心智。
 * 文档只是可选存档层（dock 行右键「建档」/设置 autoCreateDoc 新建时建档）。
 *
 * 职责切分：**存到哪个文件、关页签前要不要拦**都属于宿主（index.ts / tab.tsx），
 * 这里只管「脏不脏、忙不忙、当前路径」，动作一律通过回调交出去，于是 React 树里
 * 没有任何 SiYuan API，静态契约也好断言。
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Excalidraw, TTDDialog, hashElementsVersion } from "@excalidraw/excalidraw";
import type { AppState, BinaryFiles, ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { excalidrawLangCode, t } from "../i18n";
import { themeBgForMode, readSiyuanThemeMode, readThemeBgSlots, watchSiyuanThemeMode, withThemeBgSlot, type ThemeMode } from "./theme";
import { StudioMenu } from "./StudioMenu";
import { ScriptRail, type ScriptRailItem } from "./ScriptRail";
import { AiChannelsPanel } from "./AiChannelsPanel";
import type { AiChannels, ChannelId } from "./ai/channels";
import { INSERT_BOARD_CARD, OUTLINE_COLOR, railActionOf, type RailActionId, type RailActionMeta } from "./rail-actions.ts";
import { outlineTargets } from "./outline.ts";
import type { ScriptRunOpts } from "./ea-api";
import { HIGHLIGHTER_EVENT, RAIL_VIEW_EVENT, SCRIPT_PIN_EVENT } from "./script-pin";
import { StudioWelcome } from "./StudioWelcome";
import { sceneToSvgText } from "./svg";
import { canvasBitsOf, dirtyFromStamp, filesStampOf, sceneStampOf } from "./scene-dirty";
import {
  HL_ROUGHNESS,
  INK_DEFAULT,
  INK_ROUGHNESS,
  isHighlighter,
  normalizeHighlighter,
  type HighlighterConfig,
} from "./pens.ts";
import { ExportDialog } from "./ExportDialog";
import { LibraryImportDialog } from "./LibraryImportDialog";
import { openPathInFileManager } from "./desktop-bridge.ts";
import { startLibraryMenuInjection } from "./library-menu-inject.ts";
import type { ExportScene } from "./export";
import { insertImageFiles } from "./image-import";
import { clientToScene, viewportCenter, type Point } from "./scene-point";
import { BOARD_DRAG_MIME, boardLinkOf, boardRefFromText, decodeBoardDrag } from "./board-lib.ts";
import { CARD_H, CARD_W, boardRefAtPoint as boardCardAt, insertBoardCard as makeBoardCard } from "./board-card.ts";
import {
  EMBED_DEFAULT_HEIGHT,
  EMBED_DEFAULT_WIDTH,
  embedPageLink,
  isEmbeddableAllowed,
  makeEmbeddableElement,
  parseSiYuanBlockRef,
} from "./embeddable";
import { fileNameOf, stampFileName } from "./storage";
import type { BoardActions } from "./board-actions";
import { createEaBoardHandle } from "./ea-handle";
import type { EaBoardHandle } from "./ea-api";
import type { LoadedScene } from "./scene";

type ExcalidrawInitialData = React.ComponentProps<typeof Excalidraw>["initialData"];

/** 第二十一轮：防抖自动保存的静止判定窗口（停手约 1 秒无新变更才落盘） */
const AUTOSAVE_DELAY = 1000;

export type StudioProps = {
  /** 打开已有白板时的内容；新建为 null */
  initial: LoadedScene | null;
  /** 打开已有白板的 /data 路径；第二十一轮起新建也有路径（文件先行：创建即落盘） */
  initialPath: string | null;
  /** 思源强调色（设置里关掉则为 null） */
  accent: string | null;
  /** 落盘通道；只覆盖已有文件（新建在宿主侧 createBoardFile 完成）。返回 /data 路径 */
  onSave: (svgText: string, currentPath: string | null) => Promise<string>;
  /** 第二十六轮 T1：图片外置通道——dataURL 写成 assets/excali-media 内容寻址文件，返回引用路径 */
  saveMedia: (dataURL: string, mime: string) => Promise<string>;
  /** 第二十六轮 T6：图形点击 `siyuan:` 链接（文档 / 白板卡片）→ 宿主按协议分发 */
  onOpenDocLink: (link: string) => void;
  /** 脏状态上报：页签侧在关闭前据此弹确认，并在页签图标上亮脏点 */
  onDirtyChange: (dirty: boolean) => void;
  /** 宿主提供的提示通道（思源的 showMessage） */
  notify: (msg: string, timeout?: number) => void;
  /** 空画板是否显示引导画面（设置项，开页签时读一次） */
  showWelcome: boolean;
  /** 引导画面的「按路径打开…」 */
  onOpenExisting: () => void;
  /** 引导画面的「新建白板」 */
  onNewBoard: () => void;
  /** 2026-10-15 阶段 A：重命名前问文件名；取消返回 null（新建的命名框在宿主侧 openNew） */
  promptFileName: (suggested: string, title: string) => Promise<string | null>;
  /** 2026-10-15 阶段 A：重命名（读旧写新删旧）；返回新 /data 路径 */
  onRename: (oldPath: string, newName: string) => Promise<string>;
  /** 2026-10-15 阶段 B：图库持久化（读写 assets/excali-library.json，宿主实现） */
  loadLibraryItems: () => Promise<unknown[]>;
  saveLibraryItems: (items: unknown[]) => Promise<void>;
  /** 2026-10-16 S2：向宿主注册/注销本画板的动作窄接口（dock 驱动用；null = 卸载） */
  registerActions: (actions: BoardActions | null) => void;
  /** 2026-10-16 S2：本画板成为「当前活动」时上报（注册与每次 onChange 都会触发） */
  onBoardActive: () => void;
  /** 2026-10-16 S3：☰「运行脚本…」→ 宿主打开脚本选择器并对当前画布执行 */
  onRunScript: () => void;
  /** 第三十四轮：右缘脚本侧边栏——被固定脚本的清单（宿主解析标题；空数组 = 只有入口按钮） */
  listPinnedScripts: () => Promise<ScriptRailItem[]>;
  /** 第三十四轮：点一枚固定脚本 → 宿主对当前活动画布立即执行（opts 带 Shift/点击锚点） */
  onRunScriptFile: (name: string, opts?: ScriptRunOpts) => void;
  /** 第三十四轮：固定/取消固定（rail 右键取消、选择器右键固定）→ 宿主改设置并广播事件 */
  onPinScript: (name: string, pinned: boolean) => void;
  /**
   * 第四十一轮：竖条里的画布动作钉子清单（同步读设置；键改了靠 SCRIPT_PIN_EVENT 重拉，
   * 与固定脚本同一个广播——同一件事不该有两个事件名）。
   */
  listPinnedActions: () => RailActionId[];
  /** 第四十一轮：动作的固定/取消固定 → 宿主落 pinnedActions 并广播 */
  onPinAction: (id: RailActionId, pinned: boolean) => void;
  /** 第三十四轮·液态玻璃返工：侧边栏收起/垂直位置（视图偏好）+ 翻转回调（第三十五轮删图钉） */
  scriptRailCollapsed: boolean;
  scriptRailTop: number;
  onScriptRailCollapsedChange: (collapsed: boolean) => void;
  onScriptRailTopChange: (topPct: number) => void;
  /**
   * 第三十八轮：荧光笔配置（颜色/粗细/透明度）。语义同 scriptRailCollapsed——
   * 工具偏好，跨画板记忆；色板改完走 onHighlighterChange 落盘并广播。
   */
  highlighter: HighlighterConfig;
  onHighlighterChange: (cfg: HighlighterConfig) => void;
  /** 2026-10-17 第二十轮：☰「帮助」→ 宿主弹快捷键速查对话框 */
  onHelp: () => void;
  /**
   * 第四十四轮：AI 通道开关。getAiChannels 是宿主内存里设置的同步快照；
   * onAiChannel 落设置 + persist（agent 一栏宿主自己弹「需重载生效」提示）。
   */
  getAiChannels: () => AiChannels;
  onAiChannel: (id: ChannelId, on: boolean) => void;
  /** 2026-10-16：网格的全局记忆值（视图偏好，打开时覆盖文件里的值；开页签时读一次） */
  gridModeEnabled: boolean;
  /** 2026-10-16：用户在画布上切换网格时回写记忆值 */
  onGridChange: (enabled: boolean) => void;
  /** 2026-10-16 批4A：☰「复制此白板的引用」→ 宿主取 docId 拼嵌入引用写剪贴板 */
  onCopyBoardRef: () => void;
  /**
   * 2026-10-18 B'：素材库「Add to Excalidraw」落地页 URL 的取法（浏览器独立页，
   * 带 dir=图库目录参数）。喂给 Excalidraw 组件的 libraryReturnUrl——组件库面板
   * 「Browse libraries」打开的素材库站会把按钮 referrer 指向它，用户点
   * 「Add to Excalidraw」即跳回本地页面自动导入。
   * 用函数而非值：用户在设置里改了保存目录后，回到画布（窗口重新聚焦）即刷新，
   * 不会把库写进搬家前的旧目录。
   */
  getLibraryImportUrl: () => string;
  /**
   * 2026-10-19：素材库文件夹的绝对路径（宿主用 dataDir + 保存目录实时推导；
   * 非思源宿主为空串）。☰「打开素材库文件夹」与导入对话框的系统文件选择器共用。
   */
  libDirAbs: string;
  /**
   * 第四十轮：白板库目录（设置原值即可）。拖入/粘贴的路径只有落在这个目录里
   * 才认成白板——否则一段普通的 `assets/xxx.svg` 也会被变卡片，那是误伤。
   */
  boardDir: string;
  /** 第四十轮：☰「插入白板卡片…」→ 宿主弹白板选择器；返回库内引用，取消 null */
  pickBoardPath: () => Promise<string | null>;
};

function errText(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

/** 图库签名：条目数 + 每个条目的 id:元素数。磁盘没变就不动面板（省一次 onLibraryChange 风暴） */
function libSignature(items: unknown[]): string {
  return items
    .map((it) => {
      const o = it as { id?: unknown; elements?: unknown };
      const id = typeof o.id === "string" ? o.id : "";
      const n = Array.isArray(o.elements) ? o.elements.length : 0;
      return `${id}:${n}`;
    })
    .join(",");
}

export function StudioApp(props: StudioProps) {
  const {
    initial,
    initialPath,
    accent,
    onSave,
    saveMedia,
    onOpenDocLink,
    onDirtyChange,
    notify,
    showWelcome,
    onOpenExisting,
    onNewBoard,
    promptFileName,
    onRename,
    loadLibraryItems,
    saveLibraryItems,
    registerActions,
    onBoardActive,
    onRunScript,
    listPinnedScripts,
    onRunScriptFile,
    onPinScript,
    listPinnedActions,
    onPinAction,
    scriptRailCollapsed,
    scriptRailTop,
    onScriptRailCollapsedChange,
    onScriptRailTopChange,
    highlighter,
    onHighlighterChange,
    onHelp,
    getAiChannels,
    onAiChannel,
    gridModeEnabled,
    onGridChange,
    onCopyBoardRef,
    getLibraryImportUrl,
    libDirAbs,
    boardDir,
    pickBoardPath,
  } = props;
  const [api, setApi] = useState<ExcalidrawImperativeAPI | null>(null);
  const [mode, setMode] = useState<ThemeMode>(() => readSiyuanThemeMode());
  // 第四十四轮：AI 通道面板——开面板那一刻从宿主设置拉快照，切换即写回再拉
  const [aiOpen, setAiOpen] = useState(false);
  const [aiChannels, setAiChannels] = useState<AiChannels | null>(null);

  /**
   * 阶段 B：图库持久化（组件库在 ☰ 菜单里打开）。2026-10-19 抽出 applyDiskLibrary 供三处复用：
   *   ① 挂载即加载（读盘 → merge 进面板）；
   *   ② 窗口聚焦热刷新——素材库「Add to Excalidraw」落地页在外部浏览器里导入完，
   *     切回思源即合并进面板（此前只有挂载那一次读盘，已打开的页签永远是空的）；
   *   ③ ☰「刷新素材库」手动入口（多端同步完文件后的确定性刷新）。
   * merge 幂等（vendor 按元素内容去重）；磁盘没变就整个跳过，不惊动 onLibraryChange。
   */
  const libSigRef = useRef<string | null>(null);
  const libCountRef = useRef(0);
  const applyDiskLibrary = useCallback(
    async (source: "mount" | "auto" | "manual"): Promise<void> => {
      if (!api) return;
      let items: unknown[];
      try {
        items = await loadLibraryItems();
      } catch (e) {
        console.warn("[excali-studio] 读取图库失败", e);
        return;
      }
      const sig = libSignature(items);
      if (sig === libSigRef.current) return; // 磁盘没变（或本来就是空的）
      const prevCount = libCountRef.current;
      libSigRef.current = sig;
      libCountRef.current = items.length;
      if (items.length === 0) return;
      try {
        await api.updateLibrary({ libraryItems: items as never, merge: true });
        if (source === "manual") {
          notify(t("素材库已刷新，共 {n} 个条目", { n: items.length }));
        } else if (source === "auto" && items.length > prevCount) {
          notify(t("素材库已刷新，新增 {n} 个条目", { n: items.length - prevCount }));
        }
      } catch (e) {
        console.warn("[excali-studio] 图库合并失败", e);
      }
    },
    [api, loadLibraryItems, notify],
  );

  // 2026-10-18 B'：素材库落地页 URL。函数 prop 每次渲染现算 + 窗口聚焦刷新——
  // 用户在插件设置里改了保存目录后回到画布，下一次点 Browse libraries 就是新目录，
  // 不会把素材库写进搬家前的旧位置（改动保存目录是低频操作，聚焦刷新足够）。
  const [libraryImportUrl, setLibraryImportUrl] = useState(getLibraryImportUrl);
  useEffect(() => {
    let timer: number | null = null;
    const refresh = (): void => {
      setLibraryImportUrl(getLibraryImportUrl());
      // 2026-10-19：聚焦同一趟把素材库也重读合并（落地页/其他端改完文件即生效）。
      // focus/visibilitychange 常连续触发，防抖 250ms；窗口不可见时不读盘。
      if (document.visibilityState !== "visible") return;
      if (timer !== null) clearTimeout(timer);
      timer = window.setTimeout(() => {
        timer = null;
        void applyDiskLibrary("auto");
      }, 250);
    };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      if (timer !== null) clearTimeout(timer);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [getLibraryImportUrl, applyDiskLibrary]);

  // 第三十四轮：右缘脚本侧边栏的固定清单——挂载时拉一次；宿主在固定状态变化后
  // 广播 SCRIPT_PIN_EVENT（选择器里固定的也要刷进所有已开画布），听到就重拉。
  const [pinnedScripts, setPinnedScripts] = useState<ScriptRailItem[]>([]);
  /** 第四十一轮：同一份广播也管画布动作的钉子清单（宿主同步读设置，未知 id 丢弃） */
  const [railActions, setRailActions] = useState<RailActionMeta[]>([]);
  const refreshPinned = useCallback(() => {
    listPinnedScripts()
      .then((items) => setPinnedScripts(items))
      .catch((e) => {
        console.warn("[excali-studio] 脚本侧边栏清单加载失败", e);
        setPinnedScripts([]);
      });
    try {
      setRailActions(listPinnedActions().map((id) => railActionOf(id)).filter((a): a is RailActionMeta => a !== null));
    } catch (e) {
      console.warn("[excali-studio] 画布动作清单加载失败", e);
      setRailActions([]);
    }
  }, [listPinnedScripts, listPinnedActions]);
  useEffect(() => {
    refreshPinned();
    window.addEventListener(SCRIPT_PIN_EVENT, refreshPinned);
    return () => window.removeEventListener(SCRIPT_PIN_EVENT, refreshPinned);
  }, [refreshPinned]);

  // 侧边栏视图状态（收起/位置）：真机教训——getter 读设置不会触发重渲染，
  // 点了没反应。本地 state 为准，宿主落盘后广播 RAIL_VIEW_EVENT，所有画布同步。
  const [railCollapsed, setRailCollapsed] = useState(() => scriptRailCollapsed);
  const [railTop, setRailTop] = useState(() => scriptRailTop);
  /** 脚本选择器开着：竖条整体让位（不落盘，关窗即恢复） */
  const [pickerOpen, setPickerOpen] = useState(false);
  /**
   * 2026-10-19：vendor 右缘侧栏开着（素材库 / 搜索）——竖条同贴右缘，硬叠互相挡
   * （用户实机反馈「竞合」：竖条浮在素材库面板右缘，挡面板自己的 ⋮/✕）。
   * 真源是 appState.openSidebar，handleChange 每帧跟（签名去重，零渲染成本），
   * 挂载时再按 api 现读一次兜底（场景可能带着开着的侧栏落盘）。
   */
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const sidebarOpenRef = useRef(false);
  useEffect(() => {
    if (!api) return;
    const open = !!api.getAppState().openSidebar;
    sidebarOpenRef.current = open;
    setSidebarOpen(open);
  }, [api]);
  useEffect(() => {
    const onView = (e: Event) => {
      const d = (e as CustomEvent).detail ?? {};
      if (typeof d.scriptRailCollapsed === "boolean") setRailCollapsed(d.scriptRailCollapsed);
      if (typeof d.scriptRailTop === "number") setRailTop(d.scriptRailTop);
      if (typeof d.pickerOpen === "boolean") setPickerOpen(d.pickerOpen);
    };
    window.addEventListener(RAIL_VIEW_EVENT, onView);
    return () => window.removeEventListener(RAIL_VIEW_EVENT, onView);
  }, []);

  /*
   * 第三十八轮：荧光笔状态机（两个独立维度，别混）：
   * - hl：配置（色/宽/透明），来自设置、色板改、别的画布广播，跨画板一致；
   * - hlActive：这块画布此刻拿着荧光笔。真源是 vendor 的 appState（四键 + 工具），
   *   handleChange 里按签名反推——所以用户手动在 vendor 样式条上凑出同一组四键也会点亮，
   *   脚本/智能体调 ea.highlighter() 也会点亮，不需要额外的通道。
   */
  const [hl, setHl] = useState<HighlighterConfig>(() => normalizeHighlighter(highlighter));
  const hlRef = useRef(hl);
  hlRef.current = hl;
  const [hlActive, setHlActive] = useState(false);
  const hlActiveRef = useRef(false);
  /** 上一次 onChange 看到的笔刷签名；用来去重（vendor 每帧都回调） */
  const penSigRef = useRef("");
  /** mode 的影子（handleChange 每帧跑，不能把 mode 进依赖） */
  const modeRef = useRef(mode);
  modeRef.current = mode;
  const [dirty, setDirty] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [importLibOpen, setImportLibOpen] = useState(false);

  // 2026-10-19：素材库三项动作住进面板 ⋮ 菜单（vendor 硬编码无扩展点，DOM 注入，
  // 见 library-menu-inject.ts）——☰ 主菜单不再保留这三个入口。actions 用 getter
  // 每帧现取：保存目录/桌面端能力变了也跟手，observer 不重挂。
  useEffect(() => {
    return startLibraryMenuInjection(() => ({
      onImport: () => setImportLibOpen(true),
      onRefresh: () => void applyDiskLibrary("manual"),
      onOpenFolder: () => {
        if (!openPathInFileManager(libDirAbs)) {
          notify(t("仅桌面端支持在文件管理器中打开文件夹"));
        }
      },
    }));
  }, [applyDiskLibrary, libDirAbs, notify]);

  const rootRef = useRef<HTMLDivElement | null>(null);
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;
  const pathRef = useRef<string | null>(initialPath);
  const busyRef = useRef(false);
  /** 第十二轮：上次成功保存的时间戳（不触发重渲染） */
  const savedAtRef = useRef<number | null>(null);
  /** 第十二轮：onChange 的影子快照——flush 在拆 React 树前后仍能拿到场景 */
  const sceneRef = useRef<ExportScene | null>(null);
  /** 第二十一轮：防抖自动保存的定时器句柄（每次 onChange 重置；卸载/触发时清） */
  const autoSaveTimer = useRef<number | null>(null);
  /** 防抖 timer 与 ⌘S 都跑「最新」的 flush；占位初始化打破声明顺序依赖（flush 在下方定义） */
  const flushRef = useRef<() => Promise<boolean>>(async () => true);
  /**
   * 第十五轮：落盘那份（或刚打开那份）的场景指纹，脏判定的基线。
   * null = 还没建立（挂载初期 vendor 也会回调一次 onChange，那不能算用户改过）。
   */
  const baselineRef = useRef<string | null>(null);
  // 网格是「上次看到的值」，用它把 onChange 的高频回调收敛成「真的翻转了才回写设置」
  const gridRef = useRef(gridModeEnabled);
  /** 第二十六轮 T4：载荷里两个主题的背景槽位（打开时读一次；handleChange 里随当前主题更新） */
  const bgSlotsRef = useRef<{ light: string; dark: string }>({ light: "", dark: "" });

  /* S3：ea 脚本引擎的画布句柄（构造逻辑在 ea-handle.ts，保持本文件无自动化字段）。
     第三十二轮：把明暗主题的读写器一并交给句柄（ea.getTheme/setTheme 的出口） */
  const eaHandle = useMemo<EaBoardHandle | null>(
    () => (api ? createEaBoardHandle(api, { getTheme: () => mode, setTheme: setMode }) : null),
    [api, mode],
  );
  /**
   * 第三十八轮：影子句柄。荧光笔的三个动作（激活/关闭/换色）都由每帧回调或用户点击触发，
   * 但不能把 eaHandle 塞进 handleChange 的依赖——它在 mode 变化时重建，会把 onChange
   * 的身份换掉，vendor 那边等于重挂监听。ref 每帧赋值，读的时候永远拿最新。
   */
  const eaHandleRef = useRef<EaBoardHandle | null>(null);
  eaHandleRef.current = eaHandle;

  useEffect(() => watchSiyuanThemeMode(setMode), []);

  /* 第二十六轮 T4：明暗切换时把画布背景换到另一主题的槽位（槽位没存过 = 保持现状）。
     初次挂载这 effect 也会跑一次，但 initialData 已按当时主题挑过槽位，cur === slot 直接过。 */
  useEffect(() => {
    if (!api) return;
    const slot = mode === "dark" ? bgSlotsRef.current.dark : bgSlotsRef.current.light;
    if (slot === "") return;
    const cur = (api.getAppState() as unknown as { viewBackgroundColor?: string }).viewBackgroundColor;
    if (cur === slot) return;
    api.updateScene({ appState: { viewBackgroundColor: slot } as never });
  }, [api, mode]);

  /* 阶段 B：图库持久化——挂载时读回合并进面板（applyDiskLibrary 定义在文件上方，
     onLibraryChange 时写盘；组件库在 ☰ 菜单里打开） */
  useEffect(() => {
    void applyDiskLibrary("mount");
  }, [applyDiskLibrary]);

  /**
   * 第四十轮：插一张白板卡片（左上角落在 at）。三条入口共用：
   * dock 行拖进画布、行菜单/☰ 菜单插入、粘贴库内路径自动转卡片。
   */
  const insertCard = useCallback(
    (ref: string, title: string, at: Point): void => {
      if (!api) return;
      makeBoardCard(api, { ref, title, at });
    },
    [api],
  );

  /** 画布动作「插入白板卡片」：宿主的选择器返回库内引用，卡片落在视口中心 */
  const insertBoardCardFlow = useCallback(async (): Promise<void> => {
    if (!api) return;
    const ref = await pickBoardPath();
    if (!ref) return;
    const c = viewportCenter(api);
    insertCard(ref, fileNameOf(ref).replace(/\.svg$/i, ""), { x: c.x - CARD_W / 2, y: c.y - CARD_H / 2 });
  }, [api, insertCard, pickBoardPath]);

  /**
   * 第四十五轮：仅外框颜色——只给非文字图元打 strokeColor 补丁。
   * 走 ea 句柄的 patchElements（CaptureUpdateAction.IMMEDIATELY，可撤销），绕开
   * vendor 属性面板的 includeBoundText——那正是「改框色把绑定文字一起染了」的根因。
   */
  const applyOutlineColor = useCallback(
    (color: string): void => {
      if (!api) return;
      const selected = Object.keys(api.getAppState().selectedElementIds ?? {});
      const ids = outlineTargets(api.getSceneElements(), selected);
      if (ids.length === 0) {
        notify(t("请先选中要改外框的图形（文字颜色不会被改动）"));
        return;
      }
      eaHandleRef.current?.patchElements(ids, { strokeColor: color });
      notify(t("已改 {n} 个外框", { n: ids.length }));
    },
    [api, notify],
  );

  /** 第四十五轮：脚本库点「仅外框颜色」→ 本画布开色板（走 BoardActions 的窄接口） */
  const [outlineRequest, setOutlineRequest] = useState(0);
  const requestOutline = useCallback((): void => setOutlineRequest((n) => n + 1), []);

  /** 竖条/库面板之外的入口：第四十轮起 ☰ 不再挂这一项，动作只从竖条走这条本地通道 */
  const runRailAction = useCallback(
    (id: RailActionId): void => {
      if (id === INSERT_BOARD_CARD) void insertBoardCardFlow();
      else if (id === OUTLINE_COLOR) requestOutline();
    },
    [insertBoardCardFlow, requestOutline],
  );

  /** 第四十四轮：AI 通道面板——快照从宿主设置现拉；开关即写回（agent 一栏的重载提示在宿主侧） */
  const openAiPanel = useCallback((): void => {
    setAiChannels(getAiChannels());
    setAiOpen(true);
  }, [getAiChannels]);
  const toggleAiChannel = useCallback(
    (id: ChannelId, on: boolean): void => {
      onAiChannel(id, on);
      setAiChannels(getAiChannels());
    },
    [onAiChannel, getAiChannels],
  );

  /* 阶段 B：剪贴板粘贴图片（Excalidraw 只处理文本粘贴，图片走这里）。
     仅焦点在画板内时接管；其余文本仍放行给 vendor 的文本粘贴。
     第四十轮：文本分支加一条——粘的正好是白板库里的路径就换成卡片
     （从思源正文/文件管理器复制路径，落进画布就该是块能点开的板）。 */
  useEffect(() => {
    const onPaste = (e: ClipboardEvent): void => {
      if (!api) return;
      const root = rootRef.current;
      if (!root || !(e.target instanceof Node) || !root.contains(e.target)) return;
      const files = Array.from(e.clipboardData?.files ?? []);
      if (files.length > 0) {
        e.preventDefault();
        e.stopPropagation();
        const at = viewportCenter(api);
        void (async () => {
          const n = await insertImageFiles(api, files, at);
          if (n > 0) notify(t("已插入 {n} 张图片", { n }));
        })();
        return;
      }
      const ref = boardRefFromText(e.clipboardData?.getData("text/plain") ?? "", boardDir);
      if (!ref) return;
      e.preventDefault();
      e.stopPropagation();
      const c = viewportCenter(api);
      insertCard(ref, fileNameOf(ref).replace(/\.svg$/i, ""), { x: c.x - CARD_W / 2, y: c.y - CARD_H / 2 });
      notify(t("已把路径换成白板卡片"));
    };
    window.addEventListener("paste", onPaste, true);
    return () => window.removeEventListener("paste", onPaste, true);
  }, [api, boardDir, insertCard, notify]);

  /* 阶段 B：拖放图片进画布（组件无 onDrop，监听挂根节点；dragover 必须 preventDefault 否则不触发 drop）。
     第二十轮：文档卡删除后，从文档树拖来的文档不再被接管——没有文件时就当没发生。
     第四十轮：白板库拖来的行（自定义 MIME）优先，落在指针处生成一张卡片。 */
  const onCanvasDrop = (e: React.DragEvent<HTMLDivElement>): void => {
    if (!api) return;
    const board = decodeBoardDrag(e.dataTransfer?.getData(BOARD_DRAG_MIME) ?? "");
    if (board) {
      e.preventDefault();
      e.stopPropagation();
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      insertCard(board.ref, board.title, clientToScene(api, rect, e.clientX, e.clientY));
      return;
    }
    const files = Array.from(e.dataTransfer?.files ?? []);
    if (files.length === 0) return;
    e.preventDefault();
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const at = clientToScene(api, rect, e.clientX, e.clientY);
    void (async () => {
      const n = await insertImageFiles(api, files, at);
      if (n > 0) notify(t("已插入 {n} 张图片", { n }));
      else notify(t("没有可导入的图片"));
    })();
  };

  // 脏状态上报给页签侧（✕ 拦截确认要用），destructure 后进依赖数组避免漏报
  useEffect(() => {
    onDirtyChange(dirty);
  }, [dirty, onDirtyChange]);

  // initialData 只在挂载时被 Excalidraw 读一次，构造一次就固定
  const initialData = useMemo<ExcalidrawInitialData>(() => {
    const stroke = accent ? { currentItemStrokeColor: accent } : null;
    // 网格走「全局记忆」：不论新建还是打开文件都覆盖（vendor 内嵌 scene 只留 4 个
    // appState 键，其中就有 gridModeEnabled，所以文件里本来带着上一次的值——但空白板
    // 根本存不下来，且用户要的是「开一次就一直开」，故这里让记忆值赢）。
    const grid = { gridModeEnabled };
    // 强调色是 appState 里的项，新建画板也得包在 appState 下（直接平铺会被忽略）
    if (!initial) return { appState: { ...stroke, ...grid } } as ExcalidrawInitialData;
    // T4：按当前主题挑背景——槽位有值用槽位，否则回落载荷里的 viewBackgroundColor
    const rawState = initial.appState as unknown as Record<string, unknown>;
    const slots = readThemeBgSlots(rawState);
    bgSlotsRef.current = slots;
    const bg = themeBgForMode(slots, mode, rawState.viewBackgroundColor as string | undefined);
    return {
      elements: initial.elements as unknown as never,
      appState: { ...initial.appState, ...(stroke ?? {}), ...grid, viewBackgroundColor: bg },
      files: initial.files,
      scrollToContent: true,
    } as unknown as ExcalidrawInitialData;
  }, [initial, accent, gridModeEnabled, mode]);

  /**
   * 第十五轮：场景指纹。算不出来（vendor 内部抛异常）返回 null，由 dirtyFromStamp 判成脏。
   * 依赖里只有稳定导入，故本回调永不重建，可以安全放进 handleChange 的依赖数组。
   */
  const stampOf = useCallback((scene: ExportScene): string | null => {
    try {
      return sceneStampOf({
        elementsHash: hashElementsVersion(scene.elements),
        files: filesStampOf(scene.files),
        canvas: canvasBitsOf(scene.appState),
      });
    } catch {
      return null;
    }
  }, []);

  /**
   * 第十五轮：基线在拿到 api 的那一刻建立，取的是 **vendor 现场场景**而不是 `initial` prop。
   * 原因是 restore 会补齐默认 appState、repairBindings 也可能动元素版本号，拿未经归一的
   * `initial` 当基线，第一帧比较就虚判成脏——那正是本轮要消掉的误报。
   */
  useEffect(() => {
    if (!api) return;
    baselineRef.current = stampOf({
      elements: api.getSceneElements(),
      appState: api.getAppState(),
      files: api.getFiles(),
    });
  }, [api, stampOf]);

  /**
   * 第二十一轮：防抖自动保存——画板侧唯一的保存形态。
   * handleChange 每次回调都重置定时器（拖拽每帧刷 = 松手后约 1 秒才落盘）；
   * flush 在 busy / 空 scene / 正在画一笔时会跳过本轮，后续交互会把定时器再排上，
   * 不存在「跳过即丢」。卸载时清定时器，关闭前的兜底冲刷走 tab.tsx 的 flush。
   */
  const scheduleAutoSave = useCallback(() => {
    if (autoSaveTimer.current !== null) window.clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = window.setTimeout(() => {
      autoSaveTimer.current = null;
      void flushRef.current();
    }, AUTOSAVE_DELAY);
  }, []);

  // 卸载即清定时器（⌘W / 右键关闭时 React 树马上被拆，悬空的 timer 会打空气 api）
  useEffect(
    () => () => {
      if (autoSaveTimer.current !== null) window.clearTimeout(autoSaveTimer.current);
    },
    [],
  );

  // vendor 的 onChange 签名是 (elements, appState, files)；第三个参数起要留给 flush 的影子快照
  const handleChange = useCallback(
    (elements: unknown, appState: AppState, files: BinaryFiles) => {
      sceneRef.current = { elements: elements as ExportScene["elements"], appState, files };
      if (!dirtyRef.current) {
        // 第十五轮：只有指纹和落盘那份不等才算改过。平移、换工具、点色板、打开后没动
        // 都会回调 onChange，过去一律置脏，于是假脏点 + 自动保存白跑一整套导出。
        // 只在「干净」态算指纹：一脏就不再多算，拖拽时每帧成本是零。
        if (dirtyFromStamp(stampOf(sceneRef.current), baselineRef.current)) {
          // 同步给 ref：dock 状态行在同一个事件循环里就能读到「刚变脏」（不等下一轮渲染）
          dirtyRef.current = true;
          setDirty(true);
        }
      }
      // 拖拽每帧都会回调，所以只在网格真的翻转时才回写设置（写一次 = 一次 saveData）
      const grid = !!appState.gridModeEnabled;
      if (grid !== gridRef.current) {
        gridRef.current = grid;
        onGridChange(grid);
      }
      // 第二十六轮 T4：当前主题的背景槽位随手跟新（ref 写入，零渲染成本）
      bgSlotsRef.current[modeRef.current] = typeof appState.viewBackgroundColor === "string" ? appState.viewBackgroundColor : "";
      /*
       * 第三十八轮：荧光笔激活态跟着 vendor 现场走（签名去重，每帧只算一次字符串比较）。
       * 两条边都要——用户在 vendor 样式条上把四键凑成荧光笔 / 跑 ea.highlighter() → 点亮；
       * 切到矩形或改了任一四键 → 熄灭，且只有「离开 freedraw」才复位成默认墨笔
       * （留在手绘里只是换色，那是用户自己在挑笔，不该被抢走）。
       */
      const tool = String(appState.activeTool?.type ?? "selection");
      const sig = `${tool}|${appState.currentItemStrokeColor}|${appState.currentItemStrokeWidth}|${appState.currentItemOpacity}|${appState.currentItemRoughness}`;
      if (sig !== penSigRef.current) {
        penSigRef.current = sig;
        const still = isHighlighter(
          {
            tool,
            color: String(appState.currentItemStrokeColor ?? ""),
            width: Number(appState.currentItemStrokeWidth ?? 0),
            opacity: Number(appState.currentItemOpacity ?? 100),
            roughness: Number(appState.currentItemRoughness ?? 1),
          },
          hlRef.current,
        );
        const was = hlActiveRef.current;
        if (was !== still) {
          hlActiveRef.current = still;
          setHlActive(still);
        }
        if (was && !still && tool !== "freedraw") {
          // 复位四键，不动工具（用户已经选了别的工具）；四键不进脏指纹，不会因此白跑保存
          eaHandleRef.current?.applyPen({ ...INK_DEFAULT, roughness: INK_ROUGHNESS });
        }
      }
      // S2：任何交互都算「这块板是当前活动的」，dock 的动作路由到它
      onBoardActive();
      // 2026-10-19：vendor 右缘侧栏（素材库/搜索）开合 → 竖条让位状态（只在翻转时渲染）
      const sidebar = appState.openSidebar != null;
      if (sidebar !== sidebarOpenRef.current) {
        sidebarOpenRef.current = sidebar;
        setSidebarOpen(sidebar);
      }
      // 第二十一轮：每次回调都重排防抖（每帧重置 = 拖拽中不落盘、松手约 1 秒落）。
      // 放在指纹判定之外：busy/守卫跳过的轮次也靠后续交互把定时器再排上。
      scheduleAutoSave();
    },
    [onBoardActive, onGridChange, scheduleAutoSave, stampOf],
  );

  /** 场景快照：优先现读 api（和既有保存链路同源），拆树后的极端场景兜到 onChange 的影子 */
  const grabScene = useCallback((): ExportScene | null => {
    if (api) {
      return { elements: api.getSceneElements(), appState: api.getAppState(), files: api.getFiles() };
    }
    return sceneRef.current;
  }, [api]);

  /**
   * 第十五轮：落盘成功后的收口——基线换成「刚写进文件那份」场景的指纹，再按现场场景复算脏。
   *
   * 先设基线、后复算，而不是直接清脏：导出是异步的，期间用户可能又画了几笔，硬清脏会把
   * 那几笔吞掉（旧代码就有这个竞态）；复算后它们仍显示未保存，下一次自动保存照常带走。
   * 也是「打开不动不再误脏」的闭环：原样保存一次后，基线与现场一致，页签回到干净态。
   */
  const applySavedBaseline = useCallback(
    (savedScene: ExportScene) => {
      const baseline = stampOf(savedScene);
      baselineRef.current = baseline;
      const current = grabScene();
      const stillDirty = dirtyFromStamp(current ? stampOf(current) : null, baseline);
      dirtyRef.current = stillDirty;
      setDirty(stillDirty);
    },
    [grabScene, stampOf],
  );

  /**
   * 立即冲刷未保存改动——防抖自动保存、⌘S 强制落盘、关页签前兜底、ea.save()
   * 共用这一条通道。没改动直接过；没路径（理论上不会了：文件先行， defensive 一下）
   * 返回 false 让调用方决定要不要弹确认。
   * - 场景在第一个 await 前同步取出：dispose 里调用时 React 树随后就被拆，取晚了 api 就不可靠；
   * - busy 时返回「当前是否干净」而不是排队——关页签等不起第二次导出，宁可让上层弹确认。
   * 第十九轮加了两道「跳过本轮」的闸（参照 Obsidian autosave 避让清单）：
   * 空画板不落盘（清板也会变脏，冲下去就是把好文件写成空的）；正在画一笔
   * （newElement）/编辑文字（editingTextElement）时不落盘。两者都保持脏态
   * 原样等下一轮防抖/交互，不是丢改动。
   */
  const flush = useCallback(async (): Promise<boolean> => {
    if (busyRef.current) return !dirtyRef.current;
    if (!dirtyRef.current) return true;
    const path = pathRef.current;
    const scene = grabScene();
    if (!path || !scene) return false;
    if (scene.elements.length === 0) return false;
    if (scene.appState.editingTextElement || scene.appState.newElement) return false;
    busyRef.current = true;
    try {
      // 第二十六轮 T4：落盘的 appState 先补当前主题的背景槽位（只动载荷，不动画布）
      const sceneOut: ExportScene = {
        elements: scene.elements,
        files: scene.files,
        appState: withThemeBgSlot(
          scene.appState as unknown as Record<string, unknown>,
          modeRef.current,
        ) as unknown as Partial<AppState>,
      };
      // 第二十六轮 T1：图片外置——载荷里的 files 换成 assets/excali-media 引用
      const svgText = await sceneToSvgText(sceneOut, { saveMedia });
      const saved = await onSave(svgText, path);
      pathRef.current = saved;
      savedAtRef.current = Date.now();
      applySavedBaseline(scene);
      return true;
    } catch (e) {
      // 第十九轮：自动保存在后台静默跑，写盘失败只进 console 等于悄悄丢——升级成 toast
      console.error("[excali-studio] 自动保存失败", e);
      notify(t("自动保存失败：{msg}", { msg: errText(e) }), 7000);
      return false;
    } finally {
      busyRef.current = false;
    }
  }, [applySavedBaseline, grabScene, onSave, saveMedia]);
  // 声明顺序：handleChange / ⌘S 的监听要先于它定义，经 ref 读「最新版」（saveFlowRef 同款模式）
  flushRef.current = flush;

  /* 动作窄接口注册（挂载即注册、卸载即注销）。第二十一轮起画板没有「保存」动作
     （防抖自动保存 + ⌘S 立即落盘），这里只剩宿主/脚本还要用的能力：
     getEaHandle（脚本引擎）、flush（⌘S / 关页签兜底 / ea.save()）、
     insertBoardCard（dock 把一块白板送进这块画布——落点用视口中心）、
     openOutlinePalette（第四十五轮：脚本库行 → 本画布开仅外框色板）。 */
  useEffect(() => {
    const actions: BoardActions = {
      getEaHandle: () => eaHandle,
      flush,
      insertBoardCard: (ref, title) => {
        if (!api) return;
        const c = viewportCenter(api);
        insertCard(ref, title, { x: c.x - CARD_W / 2, y: c.y - CARD_H / 2 });
      },
      openOutlinePalette: requestOutline,
    };
    registerActions(actions);
    return () => registerActions(null);
  }, [api, eaHandle, insertCard, registerActions, flush, requestOutline]);

  // 2026-10-15 阶段 A → 第二十一轮：自动保存从「60s 定时 + 失焦 + 切走」收敛成
  // 「防抖（handleChange 里排）+ 失焦/切走立即冲刷」。定时器在防抖上线后退役——
  // 停手 1 秒必落盘，60s 那层只是重复。blur/vis 保留：切窗不丢最近一笔。
  useEffect(() => {
    const onBlur = (): void => void flush();
    const onVis = (): void => {
      if (document.visibilityState === "hidden") void flush();
    };
    window.addEventListener("blur", onBlur);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [flush]);

  /** 重命名：读旧写新删旧（宿主 onRename）。注意不清脏——新文件里是上次保存的内容，画布上的新改动仍未落盘 */
  const renameFlow = useCallback(async () => {
    if (!api || busyRef.current) return;
    if (!pathRef.current) {
      notify(t("这个画板还没有文件，无法重命名"));
      return;
    }
    busyRef.current = true;
    try {
      const name = await promptFileName(fileNameOf(pathRef.current), t("重命名白板"));
      if (!name) return;
      const saved = await onRename(pathRef.current, name);
      pathRef.current = saved;
      notify(t("已重命名为 {name}", { name: fileNameOf(saved) }));
    } catch (e) {
      notify(t("重命名失败：{msg}", { msg: errText(e) }), 7000);
    } finally {
      busyRef.current = false;
    }
  }, [api, notify, onRename, promptFileName]);

  /** 导出对话框的场景快照 */
  const getExportScene = useCallback((): ExportScene | null => {
    if (!api) return null;
    return { elements: api.getSceneElements(), appState: api.getAppState(), files: api.getFiles() };
  }, [api]);

  /**
   * 第二十八轮：Mermaid 转图元——打开 vendor 的 TTDDialog。
   * `<TTDDialog __fallback />` 常驻 children（openDialog 不是 ttd 时它自己渲染 null），
   * __fallback = 只挂 Mermaid 页、不带 AI 的 text-to-diagram 页（那个要接生成服务）。
   * 打开走 updateScene → setState 直写 appState：官方 App.updateScene 对 appState 不做
   * restore 过滤，openDialog 能安全进。（类型上的 setOpenDialog 只在 AppClassProperties
   * ——内部接口，imperative api 对象没装配这个方法，0.18.1 运行时调不到。）
   * openDialog 不在脏指纹里，开关对话框不会误报脏。
   */
  const openMermaid = useCallback(() => {
    api?.updateScene({ appState: { openDialog: { name: "ttd", tab: "mermaid" } } });
  }, [api]);

  /**
   * 第三十八轮：荧光笔的三个动作（都在 ScriptRail 里触发）。
   * 激活 = 套四键 + 切 freedraw；关闭 = 复位 vendor 默认墨笔（工具留给用户，不抢）；
   * 换色 = 只写四键并把配置交给宿主落盘（同值短路在宿主侧做）。
   * 一律走 eaHandleRef 而不是 api：笔刷进 appState 的口径和脚本/智能体同一条路，
   * 而且这依赖不能带上 eaHandle——它在 mode 变化时会重建，会把回调身份连着 handleChange 一起换掉。
   * penOptions（perfect-freehand 压感参数）官方 appState 不暴露，仍不在这层做。
   */
  const activateHighlighter = useCallback(() => {
    const cfg = hlRef.current;
    hlActiveRef.current = true;
    setHlActive(true);
    eaHandleRef.current?.applyPen({ ...cfg, roughness: HL_ROUGHNESS }, "freedraw");
  }, []);

  const deactivateHighlighter = useCallback(() => {
    hlActiveRef.current = false;
    setHlActive(false);
    eaHandleRef.current?.applyPen({ ...INK_DEFAULT, roughness: INK_ROUGHNESS });
  }, []);

  const changeHighlighter = useCallback(
    (patch: Partial<HighlighterConfig>) => {
      const next = normalizeHighlighter({ ...hlRef.current, ...patch });
      hlRef.current = next;
      setHl(next);
      // 拿着荧光笔才写 appState；关着只存配置，等下次激活再生效（不抢用户当前那支笔）
      if (hlActiveRef.current) eaHandleRef.current?.applyPen({ ...next, roughness: HL_ROUGHNESS });
      onHighlighterChange(next);
    },
    [onHighlighterChange],
  );

  /* 别的画布换了荧光笔配置 → 这块跟着换；正拿着荧光笔就顺手把四键刷上（不抢工具）。
     宿主落盘后广播，治「A 板改了色、B 板色板还显示旧的」。 */
  useEffect(() => {
    const onHlChanged = (e: Event) => {
      const next = normalizeHighlighter((e as CustomEvent).detail);
      hlRef.current = next;
      setHl(next);
      if (hlActiveRef.current) eaHandleRef.current?.applyPen({ ...next, roughness: HL_ROUGHNESS });
    };
    window.addEventListener(HIGHLIGHTER_EVENT, onHlChanged);
    return () => window.removeEventListener(HIGHLIGHTER_EVENT, onHlChanged);
  }, []);

  /**
   * 第三十一轮：嵌入思源块——粘贴块链接/块 ID，在视口中心建 Embeddable 元素。
   * 输入框复用宿主的 promptFileName（单行文本对话框，取消返回 null）。
   * link 带创建当时的明暗主题（iframe 配色用）；插入后选中该元素，便于随手挪位。
   */
  const embedSiYuanBlock = useCallback(async () => {
    if (!api) return;
    const input = await promptFileName("", t("粘贴思源块链接或块 ID（siyuan://blocks/…）"));
    if (!input) return;
    const blockId = parseSiYuanBlockRef(input);
    if (!blockId) {
      notify(t("无法识别思源块 ID"));
      return;
    }
    const at = viewportCenter(api);
    const seed = Math.floor(Math.random() * 2 ** 31);
    const el = makeEmbeddableElement({
      id: `emb-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      link: embedPageLink(blockId, mode),
      x: at.x - EMBED_DEFAULT_WIDTH / 2,
      y: at.y - EMBED_DEFAULT_HEIGHT / 2,
      width: EMBED_DEFAULT_WIDTH,
      height: EMBED_DEFAULT_HEIGHT,
      index: "a0",
      seed,
    });
    api.updateScene({
      elements: [...api.getSceneElements(), el as never],
      appState: { selectedElementIds: { [String(el.id)]: true } },
    });
    notify(t("已嵌入思源块"));
  }, [api, mode, notify, promptFileName]);

  /**
   * 第四十轮：⌘/Ctrl + 左键点白板卡片 = 打开那块白板（Obsidian 同款手感；
   * 不按键时点卡片就是普通的选中/拖动）。判据先限定「目标真是画布 canvas」，
   * 工具条、面板、脚本侧边栏都是 DOM，不会误触；命中才 stopPropagation，
   * 交回宿主的 siyuan: 链接分发（↗ 徽标点击走的是 vendor 的 onLinkOpen，同一条路）。
   */
  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (!api) return;
      if (event.button !== 0 || !(event.metaKey || event.ctrlKey) || event.shiftKey || event.altKey) return;
      const canvas = event.target;
      if (!(canvas instanceof HTMLCanvasElement)) return;
      const root = rootRef.current;
      if (!root || !root.contains(canvas)) return;
      const at = clientToScene(api, canvas.getBoundingClientRect(), event.clientX, event.clientY);
      const ref = boardCardAt(api.getSceneElements(), at);
      if (!ref) return;
      event.preventDefault();
      event.stopPropagation();
      onOpenDocLink(boardLinkOf(ref));
    };
    window.addEventListener("pointerdown", onPointerDown, true);
    return () => window.removeEventListener("pointerdown", onPointerDown, true);
  }, [api, onOpenDocLink]);

  // ⌘/Ctrl+S = 立即落盘（跳过防抖的强制保存）；⌘/Ctrl+Shift+E 导出。
  // window 捕获阶段先于一切（含 React 委托）拿到事件；只在焦点位于画板内时接管，
  // 与 Excalidraw 自己的键盘语义一致。导出这条必须抢在前面：Excalidraw 自己的
  // actionSaveAsImage 也绑在 ⌘⇧E 上，让它收到就弹它自己的导出框。
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey)) return;
      const el = rootRef.current;
      if (!el || !(event.target instanceof Node) || !el.contains(event.target)) return;
      const key = event.key.toLowerCase();
      const hit =
        (key === "s" && !event.shiftKey && !event.altKey) || (key === "e" && event.shiftKey && !event.altKey);
      if (!hit) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (key === "s") void flushRef.current();
      else setExportOpen(true);
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, []);

  return (
    <div
      className="exs-root"
      data-theme-mode={mode}
      ref={rootRef}
      onDragOver={(e) => e.preventDefault()}
      onDragEnter={(e) => e.preventDefault()}
      onDrop={onCanvasDrop}
    >
      <div className="exs-canvas">
        <Excalidraw
          theme={mode}
          langCode={excalidrawLangCode()}
          excalidrawAPI={setApi}
          initialData={initialData}
          onChange={handleChange}
          onLinkOpen={(element, event) => {
            // 第二十六轮 T6：`siyuan:doc/<id>` 拦下来走宿主开文档；其余链接 vendor 自理
            const link = (element as unknown as { link?: unknown }).link;
            if (typeof link === "string" && link.startsWith("siyuan:")) {
              event.preventDefault();
              onOpenDocLink(link);
            }
          }}
          libraryReturnUrl={libraryImportUrl}
          validateEmbeddable={isEmbeddableAllowed}
          onLibraryChange={(items) => {
            void saveLibraryItems(items as unknown[])
              .catch((e) => console.warn("[excali-studio] 图库保存失败", e))
              .finally(() => {
                // 记住刚存下去的那一届签名——聚焦热刷新比对的是磁盘，
                // 不记住就会把自己刚存的当成「外部新增」再合并一遍还弹一次 toast
                libSigRef.current = libSignature(items as unknown[]);
                libCountRef.current = (items as unknown[]).length;
              });
          }}
        >
          <StudioMenu
            onExport={() => setExportOpen(true)}
            onRename={() => void renameFlow()}
            onZoomToFit={() => void api?.scrollToContent()}
            onMermaid={openMermaid}
            onEmbedBlock={() => void embedSiYuanBlock()}
            onRunScript={onRunScript}
            onAiChannels={openAiPanel}
            onHelp={onHelp}
            onCopyRef={onCopyBoardRef}
          />
          {showWelcome ? <StudioWelcome onOpenExisting={onOpenExisting} onNewBoard={onNewBoard} /> : null}
          {/* 第二十八轮：Mermaid 转图元对话框（vendor 自带，openDialog=ttd 时自显） */}
          <TTDDialog __fallback />
        </Excalidraw>
      </div>
      {/*
        第三十四轮：右缘脚本侧边栏（对标 Obsidian 固定按钮到侧边栏；样式见 .exs-script-rail）。
        第三十八轮：荧光笔也住这儿——竖条顶部一枚按钮，色板是它的不占位浮层。
        右上角的 PenRail 条同时退役：四支墨水笔 vendor 铅笔工具已覆盖，常驻六枚反而挤。
      */}
      <ScriptRail
        pinned={pinnedScripts}
        actions={railActions}
        railCollapsed={railCollapsed}
        pickerOpen={pickerOpen}
        sidebarOpen={sidebarOpen}
        railTop={railTop}
        highlighter={hl}
        hlActive={hlActive}
        onOpenPicker={onRunScript}
        onRunScript={onRunScriptFile}
        onUnpin={(name) => onPinScript(name, false)}
        onRunAction={runRailAction}
        onUnpinAction={(id) => onPinAction(id, false)}
        onToggleRailCollapsed={() => onScriptRailCollapsedChange(!railCollapsed)}
        onRailTopChange={onScriptRailTopChange}
        onActivateHighlighter={activateHighlighter}
        onDeactivateHighlighter={deactivateHighlighter}
        onHighlighterChange={changeHighlighter}
        outlineRequest={outlineRequest}
        onOutlineColor={applyOutlineColor}
      />
      {exportOpen ? (
        <ExportDialog
          getScene={getExportScene}
          baseName={fileNameOf(pathRef.current || stampFileName())}
          onClose={() => setExportOpen(false)}
          notify={notify}
        />
      ) : null}
      {importLibOpen ? (
        <LibraryImportDialog api={api} onClose={() => setImportLibOpen(false)} notify={notify} libDirAbs={libDirAbs} />
      ) : null}
      {aiOpen && aiChannels ? (
        <AiChannelsPanel channels={aiChannels} onToggle={toggleAiChannel} onClose={() => setAiOpen(false)} />
      ) : null}
    </div>
  );
}
