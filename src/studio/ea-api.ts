/**
 * 2026-10-16 S3：ea 脚本 API（ExcalidrawAutomate 最小子集，命名对齐 EA）。
 *
 * 分层：本文件只认两个窄接口——
 * - EaBoardHandle：画布能力（由 StudioApp 用 imperative api 实现，studio 层内闭环）；
 * - EaHost：宿主能力（文档/文件/保存，由 index.ts 实现）。
 * 脚本经 script-runner.ts 以 new Function 注入 `ea` 与 `ea.utils`，全程 async
 * （顶层 await 可用），console 被替换成收集器。
 */

import type { CaptureUpdateAction } from "@excalidraw/excalidraw";
import type { AppState } from "@excalidraw/excalidraw/types";
import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import { nextId, type ElementSpec, type Side, type Box, boundingBoxOf, estimateTextWidth, wrapTextByWidth } from "./ea-element.ts";
import { parseFirstTable, parseHeadings, parseList } from "./doc-parse.ts";
import { HL_ROUGHNESS, normalizeHighlighter, type HighlighterConfig, type PenSnapshot, type PenStyle } from "./pens.ts";

export type { ElementSpec, Side, Box } from "./ea-element.ts";

/**
 * updateScene 的历史栈行为。vendor 的 CaptureUpdateAction 是 const 对象（不是 enum），
 * 类型面只能 typeof 查询：IMMEDIATELY（默认，进撤销栈）/ NEVER（不进，动画中间帧用）。
 */
export type CaptureAction = (typeof CaptureUpdateAction)[keyof typeof CaptureUpdateAction];

/** 画布窄接口（StudioApp 实现） */
export interface EaBoardHandle {
  getElements: () => readonly ExcalidrawElement[];
  getAppState: () => AppState;
  /** 批量加元素，返回新元素 id 列表。
   *  capture：历史栈行为（默认 IMMEDIATELY 进撤销栈；动画中间帧传 NEVER） */
  addElements: (specs: ElementSpec[], capture?: CaptureAction) => string[];
  /** 按 id 给元素打样式补丁（同 id 覆盖进 scene）；capture 语义同 addElements */
  patchElements: (ids: string[], patch: Record<string, unknown>, capture?: CaptureAction) => void;
  /** 真删元素；capture 语义同 addElements */
  deleteElements: (ids: string[], capture?: CaptureAction) => void;
  clear: () => void;
  selectElements: (ids: string[]) => void;
  updateScene: (appState: Partial<AppState>) => void;
  scrollToContent: () => void;
  scrollToElement: (id: string) => void;
  setViewMode: (on: boolean) => void;
  /** dataURL 图片 → 落盘 files + 建 image 元素，返回元素 id（异步：要先解码取尺寸） */
  addImage: (dataURL: string, at: { x: number; y: number; width?: number; height?: number }) => Promise<string>;
  /** subset：只导出这批 id（分步导出用）；缺省全场景 */
  exportImage: (format: "png" | "svg", scale?: number, subset?: string[]) => Promise<Blob>;
  /** 第三十二轮：图形绑定连接（side: top/bottom/left/right/auto），返回箭头 id */
  connectObjects: (id1: string, side1: Side | "auto", id2: string, side2: Side | "auto", padding?: number) => string | null;
  /** 第三十二轮：嵌入元素（思源块渲染页 / 网页链接），返回元素 id */
  addEmbeddable: (link: string, at: { x: number; y: number; width?: number; height?: number }) => string;
  /** 第三十二轮：画布明暗主题（StudioApp 的 React 状态） */
  getTheme: () => "light" | "dark";
  setTheme: (mode: "light" | "dark") => void;
  /**
   * 第三十八轮：写笔刷四键（描边色/宽/糙度/透明度），可选同时切工具。
   * 侧栏荧光笔按钮、内置脚本、智能体三条链路都收敛到这一个原语。
   */
  applyPen: (pen: PenStyle, tool?: "freedraw" | "selection") => void;
  /** 第三十八轮：读当前笔刷（tool = activeTool.type + 描边四键） */
  getPen: () => PenSnapshot;
  /**
   * 第四十轮：写素材库条目（脚本写库的唯一出口）。
   * openLibraryMenu=false 时静默入库（脚本批量生成素材时不该每条都弹面板）。
   */
  addLibraryItem: (item: Record<string, unknown>, openLibraryMenu?: boolean) => Promise<string>;
}

/** P2v4：脚本运行选项（点击现场 → 宿主 → createEaApi 一路透传） */
export interface ScriptRunOpts {
  /** 点按钮时按住 Shift（编号脚本 = 显式请求格式菜单，而非直跑） */
  shift?: boolean;
  /** 点击现场坐标（selectOption 菜单锚点；缺省 = 视口中央偏上） */
  at?: { x: number; y: number };
}

/** P2v4：几选一菜单的声明（对标设置里的 select，但做成点哪开哪的菜单） */
export interface SelectOptionSpec {
  options: Array<{ value: string; label: string; hint?: string }>;
  /** 当前值（菜单里打勾）；缺省 = 不打勾 */
  current?: string;
  /** 菜单锚点（视口坐标）；缺省时 ea 层用运行现场的点击坐标 */
  at?: { x: number; y: number };
}

/** 宿主窄接口（index.ts 实现） */
export interface EaHost {
  getDocMarkdown: () => Promise<string>;
  getSelectedText: () => string;
  listFiles: (dir?: string) => Promise<string[]>;
  readFileAsDataURL: (path: string) => Promise<string>;
  /** 第二十一轮：语义 = 立即冲刷落盘（跳过防抖的强制保存；菜单保存项已删） */
  save: () => void;
  notify: (msg: string) => void;
  getSettings: () => { saveDir: string };
  /**
   * 第三十二轮：思源内核 API 只读门面（对标 EA 的 ea.obsidian，思源特色替代）。
   * 白名单在宿主实现里校验——v1 只放行读类接口（块/文档/属性/SQL 查询/文件读），
   * 写类（appendBlock/putFile…）不进名单，脚本要改文档就明说走人肉。
   */
  siyuanCall: (api: string, data: unknown) => Promise<unknown>;
  /**
   * 第三十四轮：脚本输入对话框（对标 Obsidian ScriptEngine 的 utils.inputPrompt）。
   * 用户取消/关窗返回 null——调用方脚本自行回落默认值。
   */
  inputPrompt: (message: string, type: "text" | "number" | "password", defaultValue: string) => Promise<string | null>;
  /**
   * P2v4：几选一菜单（宿主用思源 Menu 实现——点项返回值，点空白/Esc/点外面
   * 关闭即取消返回 null；菜单锚点用运行现场的点击坐标）。
   */
  selectOption: (spec: SelectOptionSpec) => Promise<string | null>;
  /**
   * P2：脚本设置（按脚本文件名分桶；对标 Obsidian EA 的 getScriptSettings）。
   * 宿主实现按 SCRIPT_SETTING_SPECS 校验——类型不符/超范围回落 spec.default，
   * 未声明的键返回 undefined。get 不落盘；set 由宿主即时持久。
   */
  getScriptSetting: (scriptName: string, key: string) => string | number | boolean | undefined;
  setScriptSetting: (scriptName: string, key: string, value: string | number | boolean) => void;
  /**
   * 第三十八轮：荧光笔配置（插件设置里那一份，与侧栏色板同源）。
   * `ea.highlighter()` 零参读它——脚本不各自带参数，避免两处配置打架。
   */
  getHighlighter: () => HighlighterConfig;
}

export type StylePatch = Partial<
  Pick<
    ElementSpec,
    | "strokeColor"
    | "backgroundColor"
    | "fillStyle"
    | "strokeWidth"
    | "strokeStyle"
    | "roughness"
    | "opacity"
    | "fontFamily"
    | "fontSize"
    /* 第三十四轮：统一尺寸（width/height）与反转箭头（start/endArrowhead）。
       底层 handle.patchElements 是通用展开补丁，这里只是把类型面放宽 */
    | "width"
    | "height"
    | "startArrowhead"
    | "endArrowhead"
  >
>;

export interface EaApi {
  /* 创建（返回元素 id；addImage 异步） */
  addRect: (spec: Omit<ElementSpec, "type">) => string;
  addDiamond: (spec: Omit<ElementSpec, "type">) => string;
  addEllipse: (spec: Omit<ElementSpec, "type">) => string;
  addArrow: (spec: Omit<ElementSpec, "type">) => string;
  addLine: (spec: Omit<ElementSpec, "type">) => string;
  addText: (spec: Omit<ElementSpec, "type">) => string;
  addFrame: (spec: Omit<ElementSpec, "type">) => string;
  addImage: (dataURL: string, at: { x: number; y: number; width?: number; height?: number }) => Promise<string>;
  /* 场景 */
  getElements: () => readonly ExcalidrawElement[];
  getElement: (id: string) => ExcalidrawElement | undefined;
  addElements: (specs: Array<Omit<ElementSpec, "type"> & { type?: ElementSpec["type"] }>) => string[];
  deleteElements: (ids: string[]) => void;
  clear: () => void;
  selectElements: (ids: string[]) => void;
  setStyle: (ids: string[] | "selection", patch: StylePatch) => void;
  /** 改独立文本元素的文字（text/originalText/宽高联动重算；容器绑定文本与图形不适用） */
  setText: (id: string, text: string) => void;
  /* 视图 */
  zoomToFit: () => void;
  scrollToElement: (id: string) => void;
  getViewMode: () => boolean;
  setViewMode: (on: boolean) => void;
  getBackground: () => string;
  setBackground: (color: string) => void;
  /* 链接（第二十六轮 T6）：`siyuan:doc/<文档ID>` 写进元素 link，画布上点击跳文档 */
  setLink: (ids: string[] | "selection", link: string | null) => void;
  getLink: (id: string) => string | null;
  /* 导出（ids = 只导这些元素的子集；export-steps 分步图用） */
  exportSVG: (scale?: number, ids?: string[]) => Promise<Blob>;
  exportPNG: (scale?: number, ids?: string[]) => Promise<Blob>;
  /* 保存 / 文档（宿主）；save = 立即冲刷落盘（第二十一轮起无保存菜单，脚本侧语义不变） */
  save: () => void;
  /** 消息提示（宿主 showMessage；脚本反馈的标准出口） */
  notify: (msg: string) => void;
  getDocMarkdown: () => Promise<string>;
  getSelectedText: () => string;
  /* 文件（宿主） */
  listFiles: (dir?: string) => Promise<string[]>;
  addImageFromFile: (path: string, at: { x: number; y: number; width?: number; height?: number }) => Promise<string>;
  /* 环境 */
  settings: { saveDir: string };
  targetView: { getTitle: () => string };
  /* 第三十二轮补齐 */
  /** 当前选中元素 id（全部「对选中操作」类脚本的前提） */
  getSelectedElements: () => string[];
  /** 多元素公共包围盒（布局脚本刚需；含旋转后的四角） */
  getBoundingBox: (ids: string[] | "selection") => Box | null;
  /** 图形绑定连接：side 用 top/bottom/left/right 或 "auto"（几何最近侧），返回箭头 id */
  connectObjects: (id1: string, side1: Side | "auto", id2: string, side2: Side | "auto", padding?: number) => string | null;
  /** 分组 / 解散（v1 简单覆盖为单组，不做嵌套组） */
  group: (ids: string[]) => string | null;
  unGroup: (ids: string[]) => void;
  /** 置顶 / 置底（与场景首尾元素交换分数 index，合法且单调） */
  toFront: (ids: string[]) => void;
  toBack: (ids: string[]) => void;
  /** 元素移动原语（对齐/分布/看板等布局脚本的底层）：绝对落位与相对平移 */
  setPosition: (id: string, x: number, y: number) => void;
  moveBy: (ids: string[] | "selection", dx: number, dy: number) => void;
  /** 文本测量 / 按显示宽度分行（布局脚本用；口径与元素工厂一致） */
  measureText: (text: string, fontSize?: number) => { width: number; height: number };
  wrapText: (text: string, maxWidth: number, fontSize?: number) => string[];
  /** 嵌入元素（思源块渲染页链接 / 普通网页），返回元素 id */
  addEmbeddable: (link: string, at: { x: number; y: number; width?: number; height?: number }) => string;
  /**
   * 第四十轮：写素材库条目，返回条目 id。
   * 此前脚本只能改画布、不能写库——「生成一张可复用素材」这类脚本缺最后一环。
   * 条目级自定义字段（如 excaliRecipe 配方）随 vendor 的 restoreLibraryItem 双向存活。
   */
  addLibraryItem: (item: Record<string, unknown>) => Promise<string>;
  /** 画布明暗主题（脚本可读写；setTheme 只影响显示，不落盘） */
  getTheme: () => "light" | "dark";
  setTheme: (mode: "light" | "dark") => void;
  /**
   * 第三十八轮：笔刷。
   * getPen 读当前（tool + 描边四键）；setPen 打补丁（可选带 tool 切工具）；
   * highlighter() = 一键切到设置里那支荧光笔（颜色/粗细跟侧栏色板同一份）。
   */
  getPen: () => PenSnapshot;
  setPen: (patch: Partial<HighlighterConfig> & { roughness?: number; tool?: "freedraw" | "selection" }) => void;
  highlighter: () => void;
  /** 思源内核 API 只读门面（白名单见宿主实现） */
  siyuan: { call: (api: string, data?: unknown) => Promise<unknown> };
  /** P2v4：运行时的修饰键（ScriptRail 按钮点击时采集；shift = 显式请求弹参数框） */
  getModifiers: () => { shift: boolean };
  /** P2：读当前脚本的设置值（key 不存在返回 default） */
  getScriptSetting: (key: string, defaultValue: string | number | boolean) => string | number | boolean;
  /** P2：写当前脚本的设置值（宿主落盘；v1 UI 不暴露，留给 P2b） */
  setScriptSetting: (key: string, value: string | number | boolean) => void;
  utils: EaUtils;
}

export interface EaUtils {
  uuid: () => string;
  now: () => number;
  parseHeadings: typeof parseHeadings;
  parseList: typeof parseList;
  parseTable: typeof parseFirstTable;
  /** 第三十四轮：脚本参数输入对话框（对标 Obsidian ScriptEngine 的 utils.inputPrompt；
   *  取消/关窗返回空串——脚本里 parseInt("") 即 NaN，按各自默认值回落） */
  inputPrompt: (message: string, type?: "text" | "number" | "password", defaultValue?: string) => Promise<string>;
  /** P2v4：几选一菜单（对标设置里的 select；取消/点空白返回 null，调用方自行「不动」） */
  selectOption: (spec: SelectOptionSpec) => Promise<string | null>;
}

export function createEaApi(handle: EaBoardHandle, host: EaHost, scriptName = "", modifiers: ScriptRunOpts = {}): EaApi {
  const add = (spec: ElementSpec): string => {
    const ids = handle.addElements([spec]);
    return ids[0] ?? "";
  };

  const api: EaApi = {
    addRect: (spec) => add({ ...spec, type: "rectangle" }),
    addDiamond: (spec) => add({ ...spec, type: "diamond" }),
    addEllipse: (spec) => add({ ...spec, type: "ellipse" }),
    addArrow: (spec) => add({ ...spec, type: "arrow" }),
    addLine: (spec) => add({ ...spec, type: "line" }),
    addText: (spec) => add({ ...spec, type: "text" }),
    addFrame: (spec) => add({ ...spec, type: "frame" }),
    addImage: (dataURL, at) => handle.addImage(dataURL, at),

    getElements: () => handle.getElements(),
    getElement: (id) => handle.getElements().find((e) => e.id === id),
    addElements: (specs) =>
      handle.addElements(specs.map((s) => ({ ...s, type: s.type ?? "rectangle" })) as ElementSpec[]),
    deleteElements: (ids) => handle.deleteElements(ids),
    clear: () => handle.clear(),
    selectElements: (ids) => handle.selectElements(ids),
    setStyle: (ids, patch) => {
      const targets =
        ids === "selection"
          ? Object.keys(handle.getAppState().selectedElementIds ?? {})
          : ids;
      if (targets.length === 0) return;
      handle.patchElements(targets, patch as Record<string, unknown>);
    },

    // 文本四字段联动：text/originalText 同步 + 宽 = 最宽行（estimateTextWidth 与元素工厂同口径）、
    // 高 = 行数 × 行高。容器绑定文本（containerId）与图形类型直接忽略——那些走 vendor 的
    // redrawTextBoundingBox，脚本面内改文字会错位，宁可不动。
    setText: (id, text) => {
      const el = handle.getElements().find((e) => e.id === id);
      if (!el || el.type !== "text") return;
      const fontSize = (el as unknown as { fontSize?: number }).fontSize ?? 20;
      const lineHeight = (el as unknown as { lineHeight?: number }).lineHeight ?? 1.25;
      const lines = String(text).split("\n");
      handle.patchElements([id], {
        text,
        originalText: text,
        width: Math.max(1, ...lines.map((l) => estimateTextWidth(l, fontSize))),
        height: Math.ceil(fontSize * lineHeight * lines.length),
      });
    },

    zoomToFit: () => handle.scrollToContent(),
    scrollToElement: (id) => handle.scrollToElement(id),
    getViewMode: () => !!handle.getAppState().viewModeEnabled,
    setViewMode: (on) => handle.setViewMode(on),
    getBackground: () => handle.getAppState().viewBackgroundColor ?? "",
    setBackground: (color) => handle.updateScene({ viewBackgroundColor: color } as unknown as Partial<AppState>),
    setLink: (ids, link) => {
      const targets = ids === "selection" ? Object.keys(handle.getAppState().selectedElementIds ?? {}) : ids;
      if (targets.length === 0) return;
      handle.patchElements(targets, { link });
    },
    getLink: (id) => {
      const el = handle.getElements().find((e) => e.id === id);
      return el && typeof el.link === "string" ? el.link : null;
    },

    exportSVG: (scale, ids) => handle.exportImage("svg", scale, ids),
    exportPNG: (scale, ids) => handle.exportImage("png", scale, ids),

    save: () => host.save(),
    notify: (msg) => host.notify(msg),
    getDocMarkdown: () => host.getDocMarkdown(),
    getSelectedText: () => host.getSelectedText(),

    listFiles: (dir) => host.listFiles(dir),
    addImageFromFile: async (path, at) => {
      const dataURL = await host.readFileAsDataURL(path);
      return handle.addImage(dataURL, at);
    },

    settings: host.getSettings(),
    targetView: { getTitle: () => "board" },
    /* 第三十二轮补齐：选中 / 包围盒 / 连接 / 分组 / 层级 / 文本 / 嵌入 / 主题 / 思源门面 */
    getSelectedElements: () => Object.keys(handle.getAppState().selectedElementIds ?? {}),

    getBoundingBox: (ids) => {
      const targets = ids === "selection" ? Object.keys(handle.getAppState().selectedElementIds ?? {}) : ids;
      if (targets.length === 0) return null;
      const set = new Set(targets);
      const els = handle.getElements().filter((e) => set.has(e.id));
      return boundingBoxOf(els as never);
    },

    connectObjects: (id1, side1, id2, side2, padding) => handle.connectObjects(id1, side1, id2, side2, padding),

    group: (ids) => {
      if (ids.length < 2) return null;
      const gid = nextId("group");
      handle.patchElements(ids, { groupIds: [gid] });
      return gid;
    },
    unGroup: (ids) => {
      handle.patchElements(ids, { groupIds: [] });
    },

    toFront: (ids) => reorderZIndex(handle, ids, "front"),
    toBack: (ids) => reorderZIndex(handle, ids, "back"),

    setPosition: (id, x, y) => handle.patchElements([id], { x, y }),
    moveBy: (ids, dx, dy) => {
      const targets = ids === "selection" ? Object.keys(handle.getAppState().selectedElementIds ?? {}) : ids;
      for (const id of targets) {
        const el = handle.getElements().find((e) => e.id === id);
        if (el) handle.patchElements([id], { x: el.x + dx, y: el.y + dy });
      }
    },

    measureText: (text, fontSize = 20) => ({
      width: estimateTextWidth(text, fontSize),
      height: Math.ceil(fontSize * 1.25),
    }),
    wrapText: (text, maxWidth, fontSize = 20) => wrapTextByWidth(text, maxWidth, fontSize),

    addEmbeddable: (link, at) => handle.addEmbeddable(link, at),
    /* 第四十轮：脚本写库。默认静默入库（批量生成素材时不该每条弹一次面板） */
    addLibraryItem: (item) => handle.addLibraryItem(item),

    getTheme: () => handle.getTheme(),
    setTheme: (mode) => handle.setTheme(mode),

    /* 第三十八轮：笔刷。setPen 先和当前笔刷合并再归一（脏色/越界宽窄由 pens 收口），
       没给 roughness 就保留现状——脚本可以只改颜色不动手绘感。 */
    getPen: () => handle.getPen(),
    setPen: (patch) => {
      const cur = handle.getPen();
      const style: PenStyle = {
        color: patch.color ?? cur.color,
        width: patch.width ?? cur.width,
        opacity: patch.opacity ?? cur.opacity,
        roughness: patch.roughness ?? cur.roughness,
      };
      handle.applyPen({ ...normalizeHighlighter(style), roughness: style.roughness }, patch.tool);
    },
    highlighter: () => handle.applyPen({ ...host.getHighlighter(), roughness: HL_ROUGHNESS }, "freedraw"),

    siyuan: { call: (api, data) => host.siyuanCall(api, data ?? {}) },

    // P2v4：修饰键透传（点按钮那一刻采集的 shift；onload 等无交互路径恒 false）
    getModifiers: () => ({ shift: !!modifiers.shift }),

    /* P2：脚本设置（隐式按当前脚本分桶——脚本不需要知道自己的文件名）。
       读 = 桶里取，取不到/校验不过回落调用方 default；写 = 宿主落盘。
       v1 UI 不暴露「脚本运行时改设置」入口，原语先立住（P2b 的「记住这个
       选择」复选框直接可用）。 */
    getScriptSetting: (key, defaultValue) => {
      const v = host.getScriptSetting(scriptName, key);
      return v === undefined ? defaultValue : v;
    },
    setScriptSetting: (key, value) => host.setScriptSetting(scriptName, key, value),

    utils: {
      uuid: () => nextId("uuid"),
      now: () => Date.now(),
      parseHeadings,
      parseList,
      parseTable: parseFirstTable,
      // 第三十四轮：脚本参数输入（对标 Obsidian utils.inputPrompt；取消返回空串，
      // 脚本里 parseInt("") 是 NaN，按各自默认值回落）
      inputPrompt: async (message, type = "text", defaultValue = "") =>
        (await host.inputPrompt(message, type, defaultValue)) ?? "",
      // P2v4：几选一菜单（锚点优先脚本显式传入，否则用运行现场的点击坐标）
      selectOption: (spec) => host.selectOption({ ...spec, at: spec.at ?? modifiers.at }),
    },
  };
  return api;
}

/**
 * 置顶/置底的实现：按 index 排出全序，把目标元素整体移到首/尾后**交换 index 值**
 * （不造新分数 key——vendor 的 generateKeyBetween 不可 import，交换是合法且保持
 * 单调的等价操作；脚本级精度足够，任意插位留给 v2）。
 */
function reorderZIndex(handle: EaBoardHandle, ids: string[], where: "front" | "back"): void {
  const elements = [...handle.getElements()].sort((a, b) =>
    String((a as { index?: string }).index ?? "").localeCompare(String((b as { index?: string }).index ?? "")),
  );
  if (elements.length === 0) return;
  const targets = new Set(ids);
  const moving = elements.filter((e) => targets.has(e.id));
  const rest = elements.filter((e) => !targets.has(e.id));
  if (moving.length === 0 || rest.length === 0) return;
  const ordered = where === "front" ? [...rest, ...moving] : [...moving, ...rest];
  ordered.forEach((el, i) => {
    const nextIndex = String((elements[i] as { index?: string }).index ?? "");
    if (String((el as { index?: string }).index ?? "") !== nextIndex) {
      handle.patchElements([el.id], { index: nextIndex });
    }
  });
}
