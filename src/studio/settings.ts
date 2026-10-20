/**
 * 插件设置（存在 conf/data.json，走 plugin.loadData/saveData）。
 * 这里只做「脏数据归一」，真正的读写留在宿主 index.ts，方便单测直接喂各种残值。
 */

/**
 * 第三十八轮：荧光笔配置的默认值与归一都在 pens.ts（纯数据、无 vendor 依赖），
 * 这里只做透传，保证「侧栏色板 / 内置脚本 / 智能体」读到同一份。
 */
import { DEFAULT_HIGHLIGHTER, normalizeHighlighter, type HighlighterConfig } from "./pens.ts";
import { DEFAULT_PINNED_ACTIONS, normalizePinnedActions, type RailActionId } from "./rail-actions.ts";
import { normalizeAiChannels, DEFAULT_AI_CHANNELS, type AiChannels } from "./ai/channels.ts";

/**
 * 第二十五轮：白板专属目录（工作空间相对路径）。
 * 白板库只列这个目录里的 .svg；assets 根目录是所有图片/附件的公共池，
 * 历史版本曾直接存在那里，启动时由宿主一次性迁出（见 studio/migration.ts）。
 */
export const DEDICATED_BOARD_DIR = "assets/excali";

/** 目录引用归一：反斜杠、前导斜杠、data/ 前缀、末尾斜杠都抹平。
 *  用户可能把目录写成 `/data/assets/excali/`、`assets\excali`；存之前只留相对形式。 */
export function normalizeDirRef(dir: string): string {
  return String(dir ?? "")
    .trim()
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .replace(/^data\//i, "")
    .replace(/\/+$/, "");
}

export interface StudioSettings {
  /** 新白板落盘目录（工作空间相对路径，默认 assets/excali） */
  saveDir: string;
  /** 新画笔默认用思源的强调色（默认开） */
  accentStroke: boolean;
  /** 空画板显示引导画面（手绘纸飞机 + 上手提示 + 三个入口） */
  showWelcome: boolean;
  /** 2026-10-15 阶段 A：覆盖保存前留一份 .bak（默认开）。
   *  注：第二十一轮前此处是「定时自动保存」开关；防抖自动保存成为唯一保存形态后删除
   *  （停手约 1 秒落盘 + ⌘S 强制，不可关——关掉即没有保存入口） */
  keepBackup: boolean;
  /**
   * 2026-10-16：网格显示的全局记忆值。
   * 语义是「视图偏好」而不是「内容」：任意白板里切换网格都写回这里，
   * 于是新建板、空白板（存不下盘的那种）、已存文件打开时都按这个值显示。
   * 默认关——与 Excalidraw 自己的默认一致，用户开一次就被记住。
   */
  gridModeEnabled: boolean;
  /**
   * 2026-10-16 第十七轮·批1：白板文档默认存放的 hpath（固定目录）。
   * 形态 1 口径：一篇 .sy（H1 + 图片块）+ assets/excali-<时间戳>.svg 工程文件，
   * 用块属性 custom-excali-svg 绑定；显示名取文档标题，SVG 文件名永不改。
   * 默认 /Excali 白板，设置项可改。
   */
  boardDir: string;
  /**
   * 2026-10-16 第十七轮·批3：打开白板文档时自动进画板。
   * 第十八轮起默认关——文档树弱化为存档层后，切文档只该安安静静看文档；
   * 设置项保留，想「点存档文档直接进画板」的用户自己开。
   */
  autoOpenBoard: boolean;
  /**
   * 2026-10-17 第十八轮：首次保存时自动建档（默认关）。
   * 关：首存只写 SVG 工程文件，白板库按文件列，文档树保持干净；
   * 开：首存顺带在 boardDir 建一篇文档绑定 custom-excali-svg（可反链/可搜索）。
   * 关着也能补建——dock 白板行右键「建档」。
   */
  autoCreateDoc: boolean;
  /**
   * 第三十轮：图形模板库一次性迁移标记。
   * 旧单文件 <保存目录>/excali-library.json → excali-libraries/local.excalidrawlib，
   * 只在首次加载组件库时尝试一次（成功失败都置位，失败时旧文件还在、兜底可读）。
   */
  stencilMigrated: boolean;
  /**
   * 第三十四轮：固定到画布右缘脚本侧边栏的脚本（ScriptRail）。
   * 存脚本文件名（assets/excali-scripts/ 下的 .md 文件名，如 "smart-connect.md"）；
   * 对标 Obsidian Excalidraw 的「固定按钮到 Excalidraw 侧边栏」。默认空 = 只显示
   * 「运行脚本…」入口按钮，脚本在选择器里右键固定。
   */
  pinnedScripts: string[];
  /**
   * 第四十一轮：钉在右缘竖条里的**画布动作**（内置能力，不是脚本，见 rail-actions.ts）。
   * 存动作 id（如 "insert-board-card"）。默认钉住「插入白板卡片」——☰ 里的入口撤掉后，
   * 竖条是唯一一级入口；用户取消固定落成 []，归一不许把默认值回填回去。
   */
  pinnedActions: RailActionId[];
  /** 第三十四轮：脚本侧边栏手动收起状态（记忆到设置，跨画布一致；第三十五轮起全手动、无图钉） */
  scriptRailCollapsed: boolean;
  /**
   * 第三十四轮：脚本侧边栏的垂直位置（画布高度的百分比 0~0.85，可拖拽）。
   * 存比例不存像素——窗口/画布高度变化后位置等比保持。默认 0.09（≈ 顶部 64px 一带）。
   */
  scriptRailTop: number;
  /**
   * 2026-10-18 P2：脚本参数（按脚本文件名分桶）。
   * 形态：{ "text-numbering.md": { format: "3" }, "box-selection.md": { padding: 20 } }。
   * 值域收敛为 string|number|boolean 三元组；桶 ≤50、单桶键 ≤20 防脏数据膨胀。
   * 类型精校验在宿主读取时按 SCRIPT_SETTING_SPECS 做——settings.ts 不 import
   * siyuan 层（script-store），避免依赖方向翻转。
   */
  scriptSettings: Record<string, Record<string, string | number | boolean>>;
  /**
   * 2026-10-18 P2v4：内置脚本快照（文件名 → 我们上次写入内容的哈希）。
   * 治「installBuiltinScripts 已存在不覆盖 → 升级后磁盘内置脚本停在旧版」：
   * 加载时比对——磁盘 == 快照（用户没动过）且与最新内置版不一致 → 自动更新；
   * 磁盘 != 快照（用户自己改过）→ 不动，走脚本库顶部手动提示条。
   * 哈希用 djb2（script-store.hashContent），只判「改没改过」不判内容。
   */
  builtinSnapshot: Record<string, number>;
  /**
   * 第三十八轮：荧光笔（颜色 / 粗细 / 透明度）。
   * 语义同 gridModeEnabled——是「工具偏好」不是「内容」：侧栏色板改一次就跨画板记住，
   * 绝不写进白板文件（脏指纹也看不见它，复位笔刷不会造成假脏）。
   */
  highlighter: HighlighterConfig;
  /**
   * 2026-10-18 D：位图图像生成（OpenAI 兼容 images API）。
   * baseUrl 留空 = 功能关闭；key 只存插件数据，不写日志/不写白板文件。
   */
  imageBaseUrl: string;
  imageModel: string;
  imageApiKey: string;
  imageSize: string;
  /**
   * 第四十四轮：AI 四通道开关（内置智能体 / 内核 MCP / CLI / 脚本体系）。
   * 缺键 = 全开（老 data.json 升级零感知）；四道门强度不同（注册门 / 调用门 /
   * 软门 / 入口门），语义见 ai/channels.ts 头注释——面板文案必须与之一字不差。
   */
  aiChannels: AiChannels;
}

export const DEFAULT_SETTINGS: StudioSettings = {
  saveDir: DEDICATED_BOARD_DIR,
  accentStroke: true,
  showWelcome: true,
  keepBackup: true,
  gridModeEnabled: false,
  boardDir: "/Excali 白板",
  autoOpenBoard: false,
  autoCreateDoc: false,
  stencilMigrated: false,
  pinnedScripts: [],
  pinnedActions: [...DEFAULT_PINNED_ACTIONS],
  scriptRailCollapsed: false,
  scriptRailTop: 0.09,
  scriptSettings: {},
  builtinSnapshot: {},
  highlighter: { ...DEFAULT_HIGHLIGHTER },
  imageBaseUrl: "",
  imageModel: "gpt-image-1",
  imageApiKey: "",
  imageSize: "1024x1024",
  aiChannels: { ...DEFAULT_AI_CHANNELS },
};

export function normalizeSettings(raw: unknown): StudioSettings {
  const r = (raw && typeof raw === "object" ? raw : {}) as Partial<Record<keyof StudioSettings, unknown>>;
  const dirRef = typeof r.saveDir === "string" ? normalizeDirRef(r.saveDir) : "";
  const dir = dirRef !== "" ? dirRef : DEFAULT_SETTINGS.saveDir;
  const boardDir =
    typeof r.boardDir === "string" && r.boardDir.trim() !== "" ? r.boardDir.trim() : DEFAULT_SETTINGS.boardDir;
  // P2：脚本设置分桶归一（结构校验 + 限量；类型精校验在宿主按 SPECS 做）
  const scriptSettings: Record<string, Record<string, string | number | boolean>> = {};
  if (r.scriptSettings && typeof r.scriptSettings === "object") {
    for (const [name, bucket] of Object.entries(r.scriptSettings as Record<string, unknown>).slice(0, 50)) {
      if (!bucket || typeof bucket !== "object") continue;
      const out: Record<string, string | number | boolean> = {};
      for (const [k, v] of Object.entries(bucket as Record<string, unknown>).slice(0, 20)) {
        if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") out[k] = v;
      }
      scriptSettings[name] = out;
    }
  }
  // P2v4：内置脚本快照归一（文件名 → 数字哈希；脏值整桶丢，回落空表 = 全量重判）
  const builtinSnapshot: Record<string, number> = {};
  if (r.builtinSnapshot && typeof r.builtinSnapshot === "object") {
    for (const [name, h] of Object.entries(r.builtinSnapshot as Record<string, unknown>).slice(0, 100)) {
      if (name !== "" && typeof h === "number" && Number.isFinite(h)) builtinSnapshot[name] = h;
    }
  }
  return {
    saveDir: dir,
    accentStroke: typeof r.accentStroke === "boolean" ? r.accentStroke : DEFAULT_SETTINGS.accentStroke,
    showWelcome: typeof r.showWelcome === "boolean" ? r.showWelcome : DEFAULT_SETTINGS.showWelcome,
    keepBackup: typeof r.keepBackup === "boolean" ? r.keepBackup : DEFAULT_SETTINGS.keepBackup,
    gridModeEnabled:
      typeof r.gridModeEnabled === "boolean" ? r.gridModeEnabled : DEFAULT_SETTINGS.gridModeEnabled,
    boardDir,
    autoOpenBoard: typeof r.autoOpenBoard === "boolean" ? r.autoOpenBoard : DEFAULT_SETTINGS.autoOpenBoard,
    autoCreateDoc: typeof r.autoCreateDoc === "boolean" ? r.autoCreateDoc : DEFAULT_SETTINGS.autoCreateDoc,
    stencilMigrated: typeof r.stencilMigrated === "boolean" ? r.stencilMigrated : DEFAULT_SETTINGS.stencilMigrated,
    pinnedScripts: Array.isArray(r.pinnedScripts)
      ? r.pinnedScripts.filter((x): x is string => typeof x === "string" && x !== "")
      : DEFAULT_SETTINGS.pinnedScripts,
    // 第四十一轮：画布动作钉子清单（键缺失回落默认、显式空数组原样保留）
    pinnedActions: normalizePinnedActions(r.pinnedActions),
    scriptRailCollapsed:
      typeof r.scriptRailCollapsed === "boolean" ? r.scriptRailCollapsed : DEFAULT_SETTINGS.scriptRailCollapsed,
    scriptRailTop:
      typeof r.scriptRailTop === "number" && Number.isFinite(r.scriptRailTop) && r.scriptRailTop >= 0 && r.scriptRailTop <= 0.85
        ? r.scriptRailTop
        : DEFAULT_SETTINGS.scriptRailTop,
    scriptSettings,
    builtinSnapshot,
    highlighter: normalizeHighlighter(r.highlighter),
    imageBaseUrl:
      typeof r.imageBaseUrl === "string"
        ? r.imageBaseUrl.trim().replace(/\/+$/, "").slice(0, 500)
        : DEFAULT_SETTINGS.imageBaseUrl,
    imageModel:
      typeof r.imageModel === "string" && r.imageModel.trim() !== ""
        ? r.imageModel.trim().slice(0, 100)
        : DEFAULT_SETTINGS.imageModel,
    imageApiKey:
      typeof r.imageApiKey === "string" ? r.imageApiKey.trim().slice(0, 500) : DEFAULT_SETTINGS.imageApiKey,
    imageSize:
      typeof r.imageSize === "string" && r.imageSize.trim() !== ""
        ? r.imageSize.trim().slice(0, 32)
        : DEFAULT_SETTINGS.imageSize,
    // 第四十四轮：AI 通道开关（缺键全开、显式 false 保留、脏值按默认）
    aiChannels: normalizeAiChannels(r.aiChannels),
  };
}
