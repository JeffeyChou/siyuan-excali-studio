/**
 * 宿主编排：入口（顶栏图标 / 斜杠 / 快捷键 / 块图标菜单）、白板页签、存取闭环、设置页、最近文件。
 *
 * 分工：画板 UI 全在 studio/（React 树里不认识思源），页签接线在 studio/tab.tsx，
 * 文件读写在 studio/storage.ts，内嵌 scene 解码在 studio/scene.ts，与编辑器打交道在
 * siyuan/doc.ts —— 这个文件只负责把它们接起来，并维护「哪些白板页签开着」。
 */

import { Plugin, Setting, Dialog, confirm, openInputDialog, openTab, showMessage, Menu, type Custom, type Protyle, type subMenu } from "siyuan";
import { initI18n, t } from "./i18n";
import { installExcalidrawAssetPath, PLUGIN_WEB_DIR } from "./studio/assets";
import { joinPosix, workspaceDataDir } from "./studio/desktop-bridge.ts";
import { STUDIO_ICON_ID, STUDIO_ICON_SVG, slashItemHtml } from "./studio/icons";
// 第二十六轮 T3：vendor 引擎（scene/svg/tab 及其传递依赖）改走动态 import 的 lazy chunk，
// 插件启动不再解析 8MB 级引擎——只有静态类型留在这里（import type 会整体擦除）。
import type { LoadedScene } from "./studio/scene";
import { hasNonEmptyScene, sceneTextsEquivalent } from "./studio/scene-codec";
// 第三十轮：图形模板库纯逻辑（解析/合并/diff 计划）——文件读写留本文件
import { LOCAL_LIB_NAME, mergeLibFiles, parseLibFile, planLibraryWrites, serializeLibFile } from "./studio/stencil";
// 第三十四轮：脚本侧边栏广播事件（独立小模块，避免主包拉进 React 图）
import { HIGHLIGHTER_EVENT, RAIL_VIEW_EVENT, SCRIPT_PIN_EVENT } from "./studio/script-pin";
import { DEFAULT_SETTINGS, DEDICATED_BOARD_DIR, normalizeDirRef, normalizePresentationSettings, normalizeSettings, type PresentationSettings, type StudioSettings } from "./studio/settings";
// 第三十八轮：荧光笔配置（pens.ts 是纯数据模块，无 vendor/React 依赖，主包可直用）
import { normalizeHighlighter, type HighlighterConfig } from "./studio/pens.ts";
import {
  STUDIO_TAB_TYPE,
  type StudioTabData,
} from "./studio/tab-type";
// StudioTabHost/Session 是纯类型（指向 tab.tsx 的宿主形状），import type 整体擦除、
// 不会把 vendor 拉回主包
import type { StudioTabHost, StudioTabSession } from "./studio/tab";
// 移动端没有自定义页签（addTab/openTab 都是空实现），画板改挂全屏浮层。
// 本模块只建壳，attachStudioTab 仍从引擎 chunk 里取。
import { createMobileStudioShell, isMobileFrontend, type MobileStudioShell } from "./studio/mobile-studio";
import type { BoardActions } from "./studio/board-actions";
import {
  backupChainOf,
  fileNameOf,
  fileExists,
  getFileBytes,
  getFileText,
  joinSavePath,
  listBoardEntries,
  listFilesWithExt,
  putBytes,
  putSvg,
  putTextFile,
  removeSvg,
  renameSvg,
  sanitizeFileName,
  toAssetRef,
  toDataPath,
  uniqueTargetPath,
  type BoardFileEntry,
} from "./studio/storage";
import { MEDIA_DIR, bytesToDataURL, mediaFileName, parseDataUrl } from "./studio/media-ref";
import { readSiyuanAccent } from "./studio/theme";
import {
  boardDocPath,
  boardDisplayName,
  boardPathFromLink,
  deletePlanOf,
  docIdFromLink,
  embedRef,
  inlineRef,
  toBoardDocItem,
  toBoardFileItems,
  type BoardDocItem,
  type BoardFileItem,
} from "./studio/board-lib";
import {
  LEGACY_BOARD_DIR,
  isAutoNamedBoard,
  migrationCandidates,
  remapPaths,
} from "./studio/migration";
import {
  activeProtyle,
  appendImageBlock,
  createDocWithMd,
  currentNotebook,
  firstNotebook,
  getBlockAttrs,
  listBoardDocs,
  refreshAssetImages,
  removeDoc,
  rewriteAssetRefs,
  setBlockAttrs,
  svgAssetPathOf,
  trackEditor,
} from "./siyuan/doc";
import { pickBoardFile } from "./siyuan/board-picker";
import { createDockPanel, type DockHost } from "./siyuan/ExcaliDock";
// 第五十二轮：版本更新弹窗。判定/切片/渲染都是纯函数（siyuan/changelog.ts，node 里能直接跑单测），
// 只有 Dialog 那一下留在宿主层。
import {
  PLUGIN_VERSION,
  VERSION_SLOT,
  changelogDecision,
  changelogPath,
  fetchPluginFile,
  renderChangelogHtml,
  sliceVersionSection,
} from "./siyuan/changelog";
import { installBuiltinScripts, listScripts, outdatedBuiltinScripts, readScript, resetBuiltinScripts, syncBuiltinScripts, SCRIPTS_DIR, SCRIPT_SETTING_SPECS, type ScriptInfo } from "./siyuan/script-store";
import { runScriptCode } from "./siyuan/script-runner";
import { createEaApi, type EaApi, type EaHost, type ScriptRunOpts } from "./studio/ea-api";
import { ICON_PIN, ICON_SCRIPT_GEAR, SCRIPT_ICONS } from "./studio/menu-icons";
import { IMAGE_TO_MATERIAL, INSERT_BOARD_CARD, OUTLINE_COLOR, PRESENTATION, RAIL_ACTIONS, isRailActionId, railActionMount, railActionOf, type RailActionId, type RailActionMeta } from "./studio/rail-actions";
import type { ChannelId } from "./studio/ai/channels";
import { boundingBoxOf, nextId } from "./studio/ea-element";
import { renderPlan } from "./studio/ai/render";
import { STYLE_DIR, listStyles, loadStylePacks, type StyleLoadResult } from "./studio/ai/style-pack";
import { generateImage, type ImageGenResult } from "./studio/ai/imagegen";
import { createBrowserProxy } from "./studio/ai/proxy";
import "./index.css";

/** loadData/saveData 的槽位名（落 conf/data/<名字>.json） */
const STORAGE_KEY = "excali-studio";
const RECENT_MAX = 8;
const RECENT_MENU_MAX = 5;

/** 智能体能力统一返回形状（addAgentCapability 的 handler 契约） */
type AgentResult = { result?: string; structuredContent?: unknown; error?: string };

/** HTML 转义（拼进 Dialog content 的文件名/路径都过一遍，防属性注入） */
const ESC_MAP: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ESC_MAP[c]);
}
function escapeAttr(s: string): string {
  return escapeHtml(s);
}

export default class ExcaliStudioPlugin extends Plugin {
  /** 开着的白板页签：Custom 实例 → 会话（init 建、destroy 拆） */
  private tabs = new Map<Custom, StudioTabSession>();
  private settings: StudioSettings = { ...DEFAULT_SETTINGS };
  /** 最近保存/打开过的 /data 路径，最新在前 */
  private recent: string[] = [];
  /* 2026-10-16 S2：dock 路由用——每个页签注册的动作窄接口 + 最近活动的那个页签 */
  private boardActions = new Map<Custom, BoardActions>();
  private activeCustom: Custom | null = null;
  private dockRefresh: (() => void) | null = null;
  /* 2026-10-16 S3：onload 脚本防重入（每个页签只跑一轮） */
  private onloadRan = new Set<Custom>();
  /* 2026-10-16 第十七轮·批2：白板库缓存（dock 列表 + 菜单注入都读这份，同步可用） */
  private boardDocs: BoardDocItem[] = [];
  /** 2026-10-17 第十八轮：文件形态的库列表（dock 面板主体）；文档只作存档徽标 */
  private boardFiles: BoardFileItem[] = [];
  /** 第二十五轮：旧 assets → assets/excali 迁移是否已完成（data.json 的 dirMigrated；
   *  部分失败会留 false，下次启动按同一套候选补搬） */
  private dirMigrated = false;
  /** 第二十四轮登记表的旧值——只作迁移候选读一次，第二十五轮起不再落盘 */
  private legacyBoards: string[] = [];
  /** 第二十五轮：启动闸门（读设置 + 迁移）。页签读盘/库刷新都等它，
   *  避免布局恢复在搬文件的中途读到旧路径 */
  private ready: Promise<void> = Promise.resolve();
  /** docId → 绑定的 svg 引用；空串 = 确认不是白板文档（负缓存，switch-protyle 免重查） */
  private boardSvgByDocId = new Map<string, string>();
  private libLoading = false;
  /* 批3：自动开画板的每会话去重（同一文档一次会话只自动开一回，关页签不重置） */
  private autoOpenedDocs = new Set<string>();
  /* 批4B：体检防重入（刷新+逐个 getFile 是异步的，连点只跑一轮） */
  private checkupRunning = false;
  /* 第二十六轮 T5：文档里点白板嵌入图 → 开画板页签（capture 监听句柄，卸载摘除） */
  private embedClickHandler: ((event: MouseEvent) => void) | null = null;
  /* 第二十六轮 T3：引擎懒加载——首次开画板页签才装载 engine.js，插件启动不再解析
   * 8MB 级 vendor。装载方式见 loadEngineModule（不能直接 require("./engine.js")，
   * 思源的插件 require 解析不了相对路径）。 */
  private lazyEngine: Promise<typeof import("./studio/lazy")> | null = null;

  /** 加载引擎（并发首开只装载一次）；失败原样抛（页签占位转错误态） */
  private lazyMod(): Promise<typeof import("./studio/lazy")> {
    this.lazyEngine ??= this.loadEngineModule();
    return this.lazyEngine;
  }

  /**
   * 装载独立构建的引擎单文件（scripts/build.mjs 第二趟产物，位于插件根目录 engine.js）。
   *
   * 为什么不能 require("./engine.js")：思源装载插件不是 Node 模块机制——
   * app/src/plugin/loader.ts 把 index.js **文本**包进
   * `(function anonymous(require, module, exports){…})` 后 window.eval 执行，
   * 插件里的 require 是宿主注入的 requireFunc：`"siyuan"` 返回 API，其余任何 key
   * 都落到 window.require，按 Electron 宿主自己的目录解析 ⇒ 相对路径必炸
   * （Cannot find module './engine.js'，Require stack: renderer_init）。
   *
   * 所以这里改走 HTTP：引擎与字体同源（思源把 data/plugins/<name>/ 挂在 web 根的
   * /plugins/<name>/ 下），fetch 引擎文本后用思源装载插件的**同款包装**执行——
   * require 传插件作用域收到的这一个，引擎内部的 require("siyuan") 才能解析到宿主 API。
   */
  private async loadEngineModule(): Promise<typeof import("./studio/lazy")> {
    const url = new URL(`plugins/${PLUGIN_WEB_DIR}/engine.js`, `${location.origin}/`).href;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
    const code = await res.text();
    const moduleObj = { exports: {} as typeof import("./studio/lazy") };
    // 与 loader.ts runCode 同款：anonymous(require, module, exports) + sourceURL 便于 DevTools 定位
    const factory = window.eval(
      `(function anonymous(require, module, exports){\n${code}\n})\n//# sourceURL=plugins/${PLUGIN_WEB_DIR}/engine.js\n`,
    ) as (r: unknown, m: { exports: unknown }, e: unknown) => void;
    factory(require, moduleObj, moduleObj.exports);
    return moduleObj.exports;
  }

  async onload() {
    // initI18n 必须在所有入口注册之前：命令显示文本、顶栏 title、斜杠项文案都要过 t()。
    // 本仓库约定图标/页签/顶栏/命令/斜杠必须抢在任何 await 之前注册——少一个入口，
    // 用户就会遇到「装好了却点不到」。读设置挪到这些同步注册之后。
    initI18n(this.i18n);

    /* 第二十五轮：读设置 + 旧白板迁移先起跑，挂成 ready 闸门。
       下一行就要注册页签模型——布局恢复可能立刻让页签读盘，而迁移正在搬文件；
       loadScene / refreshBoardLib 都等这个闸门，先搬完再读，不赌时序。 */
    this.ready = this.bootstrapState();

    // 图标必须先于 addTopBar / 斜杠 html / 页签：思源把 <symbol> 合并进全局 SVG 精灵，
    // 引用不到的 id 会抛 "Icon must be svg id or svg tag"，表现为按钮在但点了没反应。
    this.addIcons(STUDIO_ICON_SVG);
    // 页签模型必须在布局恢复之前注册：思源启动时按 customModelType 找模型再来跑 init；
    // 而且 addTab 本来就要求先于 openTab。
    this.registerStudioTab();
    // S2：左 dock 与页签模型同级，也要抢在 await 之前同步注册（addDock 注释明确要求）
    this.registerDock();

    this.addTopBar({
      id: "excali-studio-open",
      icon: STUDIO_ICON_ID,
      title: t("打开白板"),
      callback: () => void this.openNew(),
      contextMenu: (menu) => this.buildTopMenu(menu),
    });

    /* 斜杠命令：敲 / 后选「白板」。
       html 结构照抄思源内置项（b3-list-item__first > __graphic + __text），
       写成别的结构菜单里就是一行空白。 */
    this.protyleSlash.push({
      id: "excaliStudio",
      filter: ["白板", "画板", "excali", "excalidraw", "whiteboard", "bb", "hb"],
      html: slashItemHtml(t("白板")),
      callback: (protyle: Protyle) => {
        this.clearSlashHint(protyle);
        void this.openNew();
      },
    });

    this.addCommand({
      langKey: "openExcaliStudio",
      langText: t("打开白板"),
      hotkey: "⌘⌥E",
      customHotkey: "",
      callback: () => void this.openNew(),
    });

    // 离线字体基址：Excalidraw 在首次渲染画板时才惰性读取该全局，
    // 放在 onload 里即可，不必抢在 import 之前（详见 studio/assets.ts）。
    installExcalidrawAssetPath();

    trackEditor(this);
    this.registerBlockIconMenu();
    this.registerEmbedClick();
    this.setupSetting();
    // 2026-10-18 A：思源 3.7+ 的内置智能体能力（只读列表/打开 + 写画布）；老版本静默跳过
    this.registerAgentCapabilities();

    // 批2/批3：文档树/页签菜单注入与自动开画板都读库缓存；先等设置/迁移就绪再挂事件与首刷。
    await this.ready;
    this.registerBoardDocEvents();
    void this.refreshBoardLib();
    // S3：首次启用把内置脚本写进工作空间（已存在则跳过；异步不阻塞 onload）
    void installBuiltinScripts()
      .then(async (n) => {
        if (n > 0) showMessage(t("已安装 {n} 个内置脚本到 {dir}", { n, dir: SCRIPTS_DIR }), 5000);
        // P2v4：内置脚本自动更新——快照判定「用户没动过」才覆盖（改过的留手动
        // 提示条）；治 installBuiltinScripts 已存在不覆盖导致的旧版残留
        try {
          const sync = await syncBuiltinScripts(this.settings.builtinSnapshot);
          const prev = this.settings.builtinSnapshot;
          const sameSize = Object.keys(prev).length === Object.keys(sync.snapshot).length;
          const sameVals = sameSize && Object.keys(sync.snapshot).every((k) => prev[k] === sync.snapshot[k]);
          if (!sameVals) {
            this.settings.builtinSnapshot = sync.snapshot;
            this.persist();
          }
          if (sync.updated.length > 0) {
            showMessage(t("内置脚本已更新到最新版（{n} 个），你自建的脚本不受影响", { n: sync.updated.length }), 5000);
          }
        } catch (e) {
          console.warn("[excali-studio] 内置脚本同步失败", e);
        }
      })
      .catch((e) => console.warn("[excali-studio] 内置脚本安装失败", e));
    // 第五十二轮：升级后的一次性更新日志（不 await：弹窗不该挡启动，失败也不该挡任何人进白板）
    void this.maybeShowChangelog();
  }

  onunload() {
    const open = [...this.tabs.values()];
    open.forEach((s) => s.tab.close());
    this.tabs.clear();
    if (this.embedClickHandler) {
      document.removeEventListener("click", this.embedClickHandler, true);
      this.embedClickHandler = null;
    }
    if (open.length > 0) showMessage(t("插件已卸载，画板未保存的改动会丢失"), 3000);
  }

  /**
   * 第五十二轮：版本更新弹窗。三条口径（用户拍板）：首装不弹只静默记版本、只弹当前
   * 版本那一段、不设「不再提示」（版本号已经先记进独立槽，× 掉就不会重启再弹）。
   * 读不到日志 / 该版本没写日志 / 渲染器缺失一律静默。
   */
  private async maybeShowChangelog(): Promise<void> {
    try {
      const action = changelogDecision(await this.loadData(VERSION_SLOT), PLUGIN_VERSION);
      if (action === "unknown-version" || action === "up-to-date") return;
      // 先回写再弹：弹窗被用户划掉、或者这一段的日志其实是空的，都不该下次重启再来一遍
      await this.saveData(VERSION_SLOT, PLUGIN_VERSION);
      if (action !== "show") return;
      const section = sliceVersionSection(await fetchPluginFile(changelogPath(this.name)), PLUGIN_VERSION);
      if (!section) return;
      const dialog = new Dialog({
        title: `${t("更新日志")} v${PLUGIN_VERSION}`,
        width: "min(640px, 92vw)",
        content: `<div class="exs-changelog b3-typography">${renderChangelogHtml(section)}</div>`,
      });
      dialog.element.classList.add("exs-changelog-dialog");
    } catch (e) {
      console.warn("[excali-studio] 更新日志读取失败", e);
    }
  }

  /**
   * 第二十六轮 T5：文档里的白板嵌入图，点一下直接开画板页签（过去只有块图标
   * 右键一条路）。capture 监听挂在 document 上，只拦「登记在库里的白板」——
   * 同步查 boardFiles 缓存就能判定，来得及按住思源自己的图片预览；没登记过的
   * .svg 放行（第一次经插件打开/创建后即登记，之后就能点开）。
   */
  private registerEmbedClick(): void {
    this.embedClickHandler = (event: MouseEvent): void => {
      const target = event.target as HTMLElement | null;
      if (!target || target.tagName !== "IMG") return;
      const src = (target as HTMLImageElement).getAttribute("src") || "";
      let pathname = src;
      try {
        pathname = new URL(src, location.origin).pathname;
      } catch {
        // 相对路径原样匹配
      }
      const m = /^\/(assets\/.+\.svg)$/i.exec(pathname);
      if (!m) return;
      const ref = m[1] as string;
      const known = this.boardFiles.some((f) => toAssetRef(f.dataPath) === ref);
      if (!known) return;
      event.preventDefault();
      event.stopPropagation();
      void this.openStudioTab(toDataPath(ref));
    };
    document.addEventListener("click", this.embedClickHandler, true);
  }

  /* ------------------------------ 第二十五轮：专属目录迁移 ------------------------------ */

  /** 启动闸门：读设置 → 一次性迁移旧白板。异常都收在这里，ready 永不 reject */
  private async bootstrapState(): Promise<void> {
    try {
      await this.loadState();
    } catch (e) {
      console.error("[excali-studio] 读取设置失败，用默认值继续", e);
    }
    try {
      await this.migrateLegacyBoards();
    } catch (e) {
      console.error("[excali-studio] 旧白板迁移失败（下次启动重试）", e);
    }
  }

  /**
   * 把旧 assets 根目录里的白板一次性搬进专属目录（assets/excali）。
   * 候选只认 migration.ts 列的四条真源，且只搬 assets 直下的 .svg——
   * 公共 assets 里还有 drawio/别的 excalidraw 导出，不能整目录卷走。
   * 搬完更新 recent、文档绑定与开着的页签；中途失败不置 dirMigrated，
   * 下次启动按同一套候选继续补搬（已搬走的不再是候选）。
   */
  private async migrateLegacyBoards(): Promise<void> {
    if (this.dirMigrated) return;
    const current = normalizeDirRef(this.settings.saveDir);
    if (current !== LEGACY_BOARD_DIR && current !== DEDICATED_BOARD_DIR) {
      // 用户自定了别的目录：旧 assets 里的板与他的库无关，不碰
      this.dirMigrated = true;
      this.persist();
      return;
    }

    let autoNamed: string[] = [];
    try {
      autoNamed = (await listBoardEntries(LEGACY_BOARD_DIR))
        .map((e) => e.path)
        .filter((p) => isAutoNamedBoard(fileNameOf(p)));
    } catch (e) {
      console.warn("[excali-studio] 迁移：读取旧保存目录失败（按近期/绑定继续）", e);
    }
    let docRows: Array<{ id: string; svg: string }> = [];
    try {
      docRows = await listBoardDocs();
    } catch (e) {
      console.warn("[excali-studio] 迁移：查询白板文档失败（按近期/命名继续）", e);
    }

    const candidates = migrationCandidates({
      recent: this.recent,
      registry: this.legacyBoards,
      docSvgs: docRows.map((d) => d.svg),
      autoNamed,
    });
    const remap = new Map<string, string>();
    const failed: string[] = [];
    for (const old of candidates) {
      try {
        const saved = await renameSvg(old, await uniqueTargetPath(DEDICATED_BOARD_DIR, fileNameOf(old)));
        remap.set(old, toDataPath(saved));
        // 建档文档里的图片块盯着旧路径：文件搬了，正文引用一起改
        try {
          await rewriteAssetRefs(toAssetRef(old), toAssetRef(saved));
        } catch (e) {
          console.warn("[excali-studio] 迁移后更新正文资源引用失败", old, e);
        }
      } catch (e) {
        console.warn("[excali-studio] 迁移白板失败", old, e);
        failed.push(old);
      }
    }
    if (current === LEGACY_BOARD_DIR) await this.migrateLibraryFile();

    if (remap.size > 0) {
      this.recent = remapPaths(this.recent, remap);
      for (const d of docRows) {
        const next = remap.get(toDataPath(d.svg));
        if (!next) continue;
        try {
          await setBlockAttrs(d.id, { "custom-excali-svg": toAssetRef(next) });
        } catch (e) {
          console.warn("[excali-studio] 迁移后更新文档绑定失败", d.id, e);
        }
      }
      for (const s of this.tabs.values()) {
        const next = remap.get(toDataPath(s.data.dataPath ?? ""));
        if (!next) continue;
        s.data.dataPath = next;
        s.tab.updateTitle(fileNameOf(next));
      }
    }

    this.settings = { ...this.settings, saveDir: DEDICATED_BOARD_DIR };
    this.dirMigrated = failed.length === 0;
    this.persist();
    if (failed.length > 0) {
      showMessage(t("白板迁移未完成：{fail} 块失败，下次启动会重试", { fail: failed.length }), 10000, "error");
    } else if (remap.size > 0) {
      showMessage(t("已把 {n} 块白板迁入 {dir}", { n: remap.size, dir: DEDICATED_BOARD_DIR }), 6000);
    }
  }

  /** 保存目录从 assets 换成专属目录时，形状库 JSON 跟着走（旧有新无才搬） */
  private async migrateLibraryFile(): Promise<void> {
    const src = toDataPath(joinSavePath(LEGACY_BOARD_DIR, "excali-library.json"));
    const dst = toDataPath(joinSavePath(DEDICATED_BOARD_DIR, "excali-library.json"));
    try {
      if ((await fileExists(src)) && !(await fileExists(dst))) {
        await putTextFile(dst, await getFileText(src));
        await removeSvg(src);
      }
    } catch (e) {
      console.warn("[excali-studio] 迁移图库文件失败（忽略）", e);
    }
  }

  /**
   * 页签恢复/layout 里存着迁移前的旧路径：读盘失败后按文件名到保存目录再找一次。
   * 返回 null = 没有可换的路径，由页签展示原错误。
   */
  private async remapBoardPath(dataPath: string): Promise<string | null> {
    const old = toDataPath(dataPath);
    const candidate = toDataPath(joinSavePath(this.settings.saveDir, fileNameOf(old)));
    if (candidate === old) return null;
    return (await fileExists(candidate)) ? candidate : null;
  }

  /* ------------------------------ 页签 ------------------------------ */

  /**
   * 画板宿主通道。桌面页签与移动浮层共用同一份——移动端没有自定义页签，
   * 但 StudioApp 需要的能力完全一致（读写盘、设置、脚本、演示偏好）。
   */
  private studioHost(): StudioTabHost {
    const plugin = this;
    return {
      load: (dataPath) => this.loadScene(dataPath),
      remapPath: (dataPath) => this.remapBoardPath(dataPath),
      restoreFromBackup: (dataPath) => this.restoreFromBackup(dataPath),
      get accent() {
        return plugin.settings.accentStroke ? readSiyuanAccent() : null;
      },
      onSave: (svgText, currentPath) => this.saveSvg(svgText, currentPath),
      saveMedia: (dataURL, mime) => this.saveBoardMedia(dataURL, mime),
      openDocLink: (link) => this.openBoardDocLink(link),
      promptFileName: (suggested, title) => this.promptFileName(suggested, title),
      onRename: (oldPath, newName) => this.renameBoard(oldPath, newName),
      loadLibraryItems: () => this.loadLibraryItems(),
      saveLibraryItems: (items) => this.saveLibraryItems(items),
      get showWelcome() {
        return plugin.settings.showWelcome;
      },
      // 网格是全局视图偏好，同 accent/showWelcome 用 getter 读设置；画布上真的翻转时回写
      get gridModeEnabled() {
        return plugin.settings.gridModeEnabled;
      },
      onGridChange: (enabled) => this.rememberGrid(enabled),
      onOpenExisting: () => this.promptOpenPath(),
      onNewBoard: () => void this.openNew(),
      onBoardActions: (custom, actions) => {
        if (actions) {
          this.boardActions.set(custom, actions);
          // 首次注册即视为就绪：跑一轮该画布的 onload 脚本（防重入）
          if (!this.onloadRan.has(custom)) {
            this.onloadRan.add(custom);
            void this.runOnloadScripts(custom);
          }
        } else {
          this.boardActions.delete(custom);
          this.onloadRan.delete(custom);
        }
        // 注销的正好是当前活动画布 → 活动位清空
        if (!actions && this.activeCustom === custom) this.activeCustom = null;
        this.dockRefresh?.();
      },
      onBoardActive: (custom) => {
        // 这条是 onChange 每帧回调进来的（拖拽一次几百帧）：只更新活动位，
        // 不触发刷新——第二十轮起 dock 没有每帧呈现的内容（状态行/色板已删）。
        this.activeCustom = custom;
      },
      copyBoardRef: (custom) => plugin.copyBoardRefFor(custom),
      onRunScript: () => void this.openScriptPicker(),
      // 第三十四轮：右缘脚本侧边栏（对标 Obsidian 固定按钮到侧边栏）
      listPinnedScripts: () => this.listPinnedScripts(),
      onRunScriptFile: (name, opts) => void this.runScriptFile(name, opts),
      onPinScript: (name, pinned) => this.rememberScriptPin(name, pinned),
      // 第四十一轮：画布动作的钉子清单（同步读设置；标题/图标由竖条与面板各查 rail-actions）
      listPinnedActions: () => this.settings.pinnedActions,
      onPinAction: (id, pinned) => this.rememberActionPin(id, pinned),
      // 第四十四轮：AI 通道面板——读设置 + 写设置落盘（agent 一栏的重载提示在 setAiChannel）
      getAiChannels: () => this.settings.aiChannels,
      onAiChannel: (id, on) => this.setAiChannel(id, on),
      // 第五十三轮：演示偏好（开抽屉/进片场时拉快照；改一项落一项）
      getPresentationSettings: () => this.settings.presentation,
      onPresentationSetting: (key, value) => this.rememberPresentationSetting(key, value),
      // 第三十四轮·侧边栏视图偏好（getter 实时读设置；第三十五轮删图钉，仅收起/位置）
      get scriptRailCollapsed() {
        return plugin.settings.scriptRailCollapsed;
      },
      get scriptRailTop() {
        return plugin.settings.scriptRailTop;
      },
      onScriptRailCollapsedChange: (collapsed) => this.rememberScriptRail("scriptRailCollapsed", collapsed),
      onScriptRailTopChange: (topPct) => this.rememberScriptRail("scriptRailTop", topPct),
      // 第三十八轮：荧光笔配置（getter 只喂初值，之后以画布本地 state + 广播为准）
      get highlighter() {
        return plugin.settings.highlighter;
      },
      onHighlighterChange: (cfg) => this.rememberHighlighter(cfg),
      onHelp: () => this.openHelp(),
      // 2026-10-18 B'：素材库「Add to Excalidraw」落地页 URL（函数而非值——
      // 用户在设置里改了保存目录后，画布侧重获焦点即刷新，见 StudioApp）
      getLibraryImportUrl: () => plugin.libraryImportUrl(),
      // 2026-10-19：素材库文件夹绝对路径（dataDir + 保存目录实时推导；非思源宿主为空串）。
      // ☰「打开素材库文件夹」与导入对话框的系统文件选择器共用
      get libDirAbs() {
        return joinPosix(workspaceDataDir(), plugin.libDirRel());
      },
      // 第四十轮：白板库目录（拖入/粘贴的路径只有落在这个目录里才认成白板）
      get boardDir() {
        return plugin.settings.saveDir;
      },
      /** 画布动作「插入白板卡片」用的选择器：返回库内引用（assets/x.svg），取消 null */
      pickBoardPath: () => this.pickBoardRef(),
    };
  }

  private registerStudioTab(): void {
    const plugin = this;
    const host = this.studioHost();
    this.addTab({
      type: STUDIO_TAB_TYPE,
      init: (custom) => {
        // 第二十六轮 T3：引擎是懒加载 chunk——先给占位（布局恢复时也会走到这里），
        // chunk require 完成后再挂真正的画板；失败就地转错误文案
        const el = custom.element as HTMLElement;
        el.classList.add("exs-panel");
        el.innerHTML = `<div class="exs-loading">${t("正在打开白板…")}</div>`;
        void this.lazyMod()
          .then((m) => {
            el.innerHTML = "";
            this.tabs.set(custom, m.attachStudioTab(custom, host));
          })
          .catch((e) => {
            console.error("[excali-studio] 画板引擎加载失败", e);
            el.innerHTML = `<div class="exs-loaderror"><div>${t("画板引擎加载失败：{msg}", {
              msg: e instanceof Error ? e.message : String(e),
            })}</div></div>`;
          });
      },
      // 思源按 model.destroy() 调用，this 就是 Custom 实例：拆 React 树并出账
      destroy: function (this: Custom) {
        plugin.tabs.get(this)?.dispose();
        plugin.tabs.delete(this);
        plugin.boardActions.delete(this);
        if (plugin.activeCustom === this) plugin.activeCustom = null;
        plugin.dockRefresh?.();
      },
    });
  }

  /* ------------------------------ 脚本引擎（S3） ------------------------------ */

  /** 2026-10-16 S3：ea 宿主能力（文档/文件/保存/提示/设置） */
  private eaHost(): EaHost {
    const plugin = this;
    return {
      getDocMarkdown: async () => {
        const rootID = activeProtyle()?.block?.rootID;
        if (!rootID) return "";
        const res = await fetch("/api/block/getBlockKramdown", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: rootID }),
        });
        const json = (await res.json().catch(() => null)) as
          | { code?: number; data?: { kramdown?: string } | string | null }
          | null;
        const data = json?.data;
        if (typeof data === "string") return data;
        if (data && typeof data === "object" && typeof data.kramdown === "string") return data.kramdown;
        return "";
      },
      getSelectedText: () => {
        const sel = window.getSelection();
        return sel ? String(sel.toString() ?? "") : "";
      },
      listFiles: async (dir) => {
        try {
          // 列全部文件（不筛扩展名）——脚本侧按自己需要过滤（批量导入图片只要图片格式）
          return await listFilesWithExt(dir || plugin.settings.saveDir);
        } catch {
          return [];
        }
      },
      readFileAsDataURL: async (path) => {
        const res = await fetch("/api/file/getFile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ path: toDataPath(path) }),
        });
        if (!res.ok) throw new Error(`getFile HTTP ${res.status}`);
        const blob = await res.blob();
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result || ""));
          reader.onerror = () => reject(reader.error || new Error("读取失败"));
          reader.readAsDataURL(blob);
        });
      },
      save: () => void plugin.activeActions()?.flush(),
      notify: (msg) => showMessage(msg),
      getSettings: () => ({ saveDir: plugin.settings.saveDir }),
      /* P2：脚本设置（按脚本分桶）。读 = 桶里取值 + 按 SCRIPT_SETTING_SPECS 校验：
         未声明键 → undefined（脚本回落自己的 default）；类型不符/超范围 →
         spec.default（脏数据不让脚本看到）。写 = 只收声明的键，落盘即时持久
         （低频操作，不走防抖）。 */
      getScriptSetting: (scriptName, key) => {
        const spec = (SCRIPT_SETTING_SPECS[scriptName] ?? []).find((s) => s.key === key);
        if (!spec) return undefined;
        const raw = plugin.settings.scriptSettings?.[scriptName]?.[key];
        if (raw === undefined || typeof raw !== typeof spec.default) return spec.default;
        if (spec.type === "number" && typeof raw === "number") {
          const bad = !Number.isFinite(raw) || (spec.min !== undefined && raw < spec.min) || (spec.max !== undefined && raw > spec.max);
          if (bad) return spec.default;
        }
        if (spec.type === "select" && typeof raw === "string" && spec.options && !spec.options.some((o) => o.value === raw)) {
          return spec.default;
        }
        return raw;
      },
      setScriptSetting: (scriptName, key, value) => {
        const spec = (SCRIPT_SETTING_SPECS[scriptName] ?? []).find((s) => s.key === key);
        if (!spec) return;
        const cur = plugin.settings.scriptSettings ?? {};
        plugin.settings = {
          ...plugin.settings,
          scriptSettings: { ...cur, [scriptName]: { ...(cur[scriptName] ?? {}), [key]: value } },
        };
        plugin.persist();
      },
      /* 第三十八轮：荧光笔配置——ea.highlighter() 的读口。
         刻意零参（脚本侧不带自己的色/宽配置）：设置里那一份是唯一真源，
         侧栏色板改完脚本立刻跟着变，不会出现「色板是黄、脚本画绿」的两套账。 */
      getHighlighter: () => normalizeHighlighter(plugin.settings.highlighter),
      /* 第三十二轮：思源内核 API 只读门面——脚本访问文档数据的窄通道。
         白名单只放读类接口（块/文档/属性/SQL/文件读），写类一律拒绝：
         脚本改文档属于破坏面，思源侧该走人肉或专门的文档工具。 */
      siyuanCall: async (api, data) => {
        const readonly = /^(block\/(getBlockKramdown|getBlockDOM|getBlockInfo|getBlockAttrs|getBlockBreadcrumb|getChildBlocks)|export\/exportMdContent|filetree\/(getDoc|getHPathByID|getHPathByPath)|query\/sql|file\/getFile)$/;
        if (!readonly.test(api)) {
          throw new Error(`只读白名单外的接口不可调用：${api}`);
        }
        const res = await fetch(`/api/${api}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data ?? {}),
        });
        const json = (await res.json().catch(() => null)) as { code?: number; msg?: string; data?: unknown } | null;
        if (!res.ok || !json || json.code !== 0) {
          throw new Error(`内核 API 失败：${api} ${json?.msg || `HTTP ${res.status}`}`);
        }
        return json.data;
      },

    /** 第三十四轮：脚本参数输入对话框（对标 Obsidian utils.inputPrompt；
        取消/关窗/Escape 返回 null，EaUtils 层转成空串给脚本回落默认值）。
        真机 bug 修复：连点脚本会并发弹 N 层对话框，思源每层 Dialog 都有遮罩，
        越叠越暗——这里串行排队，上一个关闭后下一个才弹 */
    inputPrompt: (message, type, defaultValue) => {
      const run = (): Promise<string | null> =>
        new Promise((resolve) => {
          let settled = false;
          const finish = (value: string | null) => {
            if (settled) return;
            settled = true;
            dialog.destroy();
            resolve(value);
          };
          const dialog = new Dialog({
            title: message,
            // P2 收窄：380 对「标签 + 一个输入框 + 两个按钮」太空旷（真机截图反馈「有点丑」）
            width: "340px",
            content: `<div class="exs-picker">
  <input class="b3-text-field fn__block exs-name-input" type="${type === "number" ? "number" : type === "password" ? "password" : "text"}" value="${escapeAttr(defaultValue)}" />
  <div class="exs-name-actions">
    <button class="b3-button exs-name-cancel" type="button">${t("取消")}</button>
    <button class="b3-button exs-name-ok" type="button">${t("确定")}</button>
  </div>
</div>`,
            destroyCallback: () => finish(null),
          });
          dialog.element.classList.add("exs-name-dialog");
          const input = dialog.element.querySelector<HTMLInputElement>(".exs-name-input")!;
          dialog.element.querySelector<HTMLButtonElement>(".exs-name-cancel")!.addEventListener("click", () => finish(null));
          const ok = (): void => finish(input.value);
          dialog.element.querySelector<HTMLButtonElement>(".exs-name-ok")!.addEventListener("click", ok);
          input.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              ok();
            } else if (e.key === "Escape") {
              e.preventDefault();
              finish(null);
            }
            e.stopPropagation();
          });
          setTimeout(() => {
            input.focus();
            input.select();
          }, 50);
        });
      const result = this.inputPromptChain.then(run, run);
      this.inputPromptChain = result.catch(() => null);
      return result;
    },

    /** P2v4：几选一菜单（思源 Menu——点项返回值；点空白/Esc/点外面关闭即取消）。
        串行链同 inputPrompt：连点两个脚本不会叠菜单 */
    selectOption: (spec) => {
      const run = (): Promise<string | null> =>
        new Promise((resolve) => {
          if (spec.options.length === 0) {
            resolve(null);
            return;
          }
          let picked = false;
          // closeCB：点空白/Esc/点菜单外都会走到；已点过项的忽略
          const menu = new Menu("excali-select-option", () => {
            if (!picked) resolve(null);
          });
          for (const opt of spec.options) {
            menu.addItem({
              label: opt.hint ? `${opt.label}（${opt.hint}）` : opt.label,
              current: opt.value === spec.current,
              click: () => {
                picked = true;
                resolve(opt.value);
              },
            });
          }
          const at = spec.at ?? { x: window.innerWidth / 2, y: window.innerHeight / 3 };
          menu.open({ x: at.x, y: at.y });
        });
      const result = this.selectOptionChain.then(run, run);
      this.selectOptionChain = result.catch(() => null);
      return result;
    },
  };
}

  /* -------------------- 2026-10-18 A：思源内置智能体能力 -------------------- */

  private async agentRun(fn: () => Promise<AgentResult>): Promise<AgentResult> {
    try {
      return await fn();
    } catch (e) {
      console.warn("[excali-studio] 智能体能力失败", e);
      return { error: e instanceof Error ? e.message : String(e) };
    }
  }

  /** 保存目录的资产相对路径（assets/excali）；智能体路径白名单只认它下面 */
  private agentBoardDir(): string {
    return toAssetRef(toDataPath(this.settings.saveDir)).replace(/\/+$/, "");
  }

  /**
   * board/title/path → 已有白板。只允许保存目录下的 .svg；
   * 标题按「去扩展名、不区分大小写」匹配，多个同名取原样命中的那个。
   */
  private async resolveAgentBoard(args: Record<string, unknown>): Promise<{ path: string; title: string } | null> {
    const board = typeof args.board === "string" ? args.board.trim() : "";
    const pathArg = typeof args.path === "string" && args.path.trim() ? args.path.trim() : /\.svg$/i.test(board) ? board : "";
    const titleArg = typeof args.title === "string" && args.title.trim() ? args.title.trim() : /\.svg$/i.test(board) ? "" : board;
    await this.ready;
    const dir = this.agentBoardDir();
    if (pathArg) {
      const rel = toAssetRef(toDataPath(pathArg));
      if (!/\.svg$/i.test(rel)) return null;
      if (dir !== "" && !rel.startsWith(`${dir}/`)) return null;
      if (!(await fileExists(rel))) return null;
      return { path: toDataPath(rel), title: fileNameOf(rel).replace(/\.svg$/i, "") };
    }
    if (!titleArg) return null;
    const entries = await listBoardEntries(this.settings.saveDir);
    const wanted = titleArg.replace(/\.svg$/i, "").toLowerCase();
    const matches = entries.filter((e) => fileNameOf(e.path).replace(/\.svg$/i, "").toLowerCase() === wanted);
    if (matches.length === 0) return null;
    const exact = matches.find((e) => fileNameOf(e.path).replace(/\.svg$/i, "") === titleArg.replace(/\.svg$/i, ""));
    const hit = exact ?? matches[0];
    return { path: toDataPath(hit.path), title: fileNameOf(hit.path).replace(/\.svg$/i, "") };
  }

  /** 开页签后等画布 React 树注册 BoardActions（引擎懒加载，最多 20 秒） */
  private async waitForAgentActions(dataPath: string, timeoutMs = 20000): Promise<BoardActions | null> {
    const target = toDataPath(dataPath);
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      for (const [custom, session] of this.tabs) {
        if (session.data.dataPath !== target) continue;
        const actions = this.boardActions.get(custom);
        if (actions?.getEaHandle()) return actions;
      }
      await new Promise((resolve) => setTimeout(resolve, 120));
    }
    return null;
  }

  /** 追加绘制落点：现有内容整体包围盒的下方 80px（空白板从原点开始） */
  private agentDrawOrigin(handle: NonNullable<ReturnType<BoardActions["getEaHandle"]>>): { x: number; y: number } {
    const visible = handle.getElements().filter((el) => !el.isDeleted);
    if (visible.length === 0) return { x: 0, y: 0 };
    const box = boundingBoxOf(
      visible as Array<{ x: number; y: number; width: number; height: number; angle?: number; points?: Array<[number, number]> }>,
    );
    return box ? { x: box.minX, y: box.maxY + 80 } : { x: 0, y: 0 };
  }

  /** 风格包目录是用户手改的 JSON，每次绘图重读一遍（缓存会吃到过期配色） */
  private loadAgentStyles(): Promise<StyleLoadResult> {
    return loadStylePacks({
      list: async () => (await listFilesWithExt(STYLE_DIR, /\.json$/i)).map((p) => p.slice(p.lastIndexOf("/") + 1)),
      read: (fileName: string) => getFileText(`${STYLE_DIR}/${fileName}`),
    });
  }

  private async agentListBoards(args: Record<string, unknown>): Promise<AgentResult> {
    await this.ready;
    const query = typeof args.query === "string" ? args.query.trim().toLowerCase() : "";
    const rawLimit = Number(args.limit);
    const limit = Number.isFinite(rawLimit) ? Math.max(1, Math.min(100, Math.floor(rawLimit))) : 50;
    const all = await listBoardEntries(this.settings.saveDir);
    const filtered = query
      ? all.filter((e) => e.path.toLowerCase().includes(query) || fileNameOf(e.path).toLowerCase().includes(query))
      : all;
    const boards = filtered.slice(0, limit).map((e) => ({
      title: fileNameOf(e.path).replace(/\.svg$/i, ""),
      path: e.path,
      updated: e.updated,
      updatedAt: e.updated ? new Date(e.updated).toISOString() : "",
    }));
    const packs = await this.loadAgentStyles();
    const styles = listStyles();
    return {
      result: `白板库 ${this.agentBoardDir()}：${filtered.length} 块${query ? `（匹配「${query}」）` : ""}。可用风格：${styles.map((s) => s.name).join("/")}。`,
      structuredContent: {
        dir: this.agentBoardDir(),
        total: filtered.length,
        boards,
        styles,
        styleWarnings: packs.warnings,
      },
    };
  }

  private async agentOpenBoard(args: Record<string, unknown>): Promise<AgentResult> {
    const target = await this.resolveAgentBoard(args);
    if (!target) {
      return { error: `找不到白板：${String(args.board ?? args.path ?? "")}（只认 ${this.agentBoardDir()} 下的 .svg）` };
    }
    await this.openStudioTab(target.path);
    const actions = await this.waitForAgentActions(target.path, 15000);
    return {
      result: `已打开「${target.title}」${actions ? "" : "（画布引擎仍在加载）"}。`,
      structuredContent: { ok: true, path: toAssetRef(target.path), title: target.title, ready: !!actions },
    };
  }

  /**
   * excali_draw_board：计划 → 画布。board 为空 = 新建；board 有值 = 追加到已有白板
   * （append=false 时忽略 board、另建新板）。画完等一次 flush，返回落盘状态。
   */
  private async agentDrawBoard(args: Record<string, unknown>): Promise<AgentResult> {
    await this.ready;
    let plan = args.plan;
    if (typeof plan === "string") {
      try {
        plan = JSON.parse(plan);
      } catch {
        return { error: "plan 是字符串但不是合法 JSON" };
      }
    }
    if (!plan || typeof plan !== "object" || Array.isArray(plan)) {
      return { error: "缺少 plan 对象（nodes/edges/title/preset/layout）" };
    }

    const append = args.append !== false;
    const named = [args.board, args.path].some((v) => typeof v === "string" && v.trim() !== "");
    const existing = append ? await this.resolveAgentBoard(args) : null;
    if (append && named && !existing) {
      return { error: `找不到白板：${String(args.board ?? args.path)}（不自动改新建，避免画错板）` };
    }

    let target: { path: string; title: string };
    let docId: string | undefined;
    let created = false;
    if (existing) {
      target = existing;
    } else {
      const planTitle = (plan as { title?: unknown }).title;
      const name =
        (typeof args.title === "string" && args.title.trim()) ||
        (typeof planTitle === "string" && planTitle.trim()) ||
        t("AI 白板");
      const made = await this.createBoardFile(name);
      docId = made.docId;
      target = { path: made.path, title: fileNameOf(made.path).replace(/\.svg$/i, "") };
      created = true;
    }

    await this.openStudioTab(target.path, docId);
    const actions = await this.waitForAgentActions(target.path);
    const handle = actions?.getEaHandle();
    if (!actions || !handle) {
      return { error: `白板「${target.title}」已打开，但画布引擎未在 20 秒内就绪。请手动打开后重试。` };
    }

    const origin = created ? { x: 0, y: 0 } : this.agentDrawOrigin(handle);
    const packs = await this.loadAgentStyles();
    const styleRaw = [args.style, args.preset].find((v) => typeof v === "string" && (v as string).trim() !== "");
    const rendered = renderPlan(plan, {
      origin,
      idPrefix: nextId("ai"),
      preset: styleRaw,
      layout: args.layout,
    });
    handle.addElements(rendered.specs);
    let arrows = 0;
    for (const route of rendered.routes) {
      const arrowId = handle.connectObjects(route.fromElementId, route.side1, route.toElementId, route.side2, 4);
      if (!arrowId) continue;
      arrows += 1;
      // connectObjects 给的是锚点直线；这里补上计划里的折线与预设样式，和 CLI 产物一致
      handle.patchElements([arrowId], {
        x: route.p1.x,
        y: route.p1.y,
        points: route.points,
        strokeColor: rendered.preset.edge,
        strokeWidth: rendered.preset.strokeWidth,
        strokeStyle: rendered.preset.strokeStyle,
        roughness: rendered.preset.roughness,
      });
    }
    handle.selectElements(rendered.nodes.map((n) => n.elementId));
    handle.scrollToContent();

    let saved = false;
    try {
      saved = await actions.flush();
    } catch {
      saved = false;
    }
    const payload = {
      ok: true,
      created,
      path: toAssetRef(target.path),
      title: target.title,
      nodes: rendered.nodes.length,
      edges: arrows,
      preset: rendered.plan.preset,
      layout: rendered.plan.layout,
      styleWarnings: packs.warnings,
      saved,
      origin,
      warnings: rendered.plan.warnings,
    };
    return {
      result:
        `${created ? "已新建" : "已绘制到"}「${target.title}」：${payload.nodes} 个节点、${payload.edges} 条连线` +
        `（${payload.path}）${saved ? "。" : "；落盘失败，稍后自动保存会重试。"}` +
        (payload.warnings.length ? ` 忽略 ${payload.warnings.length} 条计划警告。` : ""),
      structuredContent: payload,
    };
  }

  /**
   * excali_generate_image：位图生图 → 画布（2026-10-18 D）。
   * 先生成再把图画布打开/新建——API 失败时不会留下空板。
   * 图片按原生宽高插入（不可编辑，与 A 的结构化绘图是两条路）。
   */
  private async agentGenerateImage(args: Record<string, unknown>): Promise<AgentResult> {
    await this.ready;
    const prompt = typeof args.prompt === "string" ? args.prompt.trim() : "";
    if (!prompt) return { error: "prompt 不能为空" };

    const append = args.append !== false;
    const named = [args.board, args.path].some((v) => typeof v === "string" && v.trim() !== "");
    const existing = append ? await this.resolveAgentBoard(args) : null;
    if (append && named && !existing) {
      return { error: `找不到白板：${String(args.board ?? args.path)}（不自动改新建，避免插错板）` };
    }

    let image: ImageGenResult;
    try {
      image = await generateImage(
        {
          baseUrl: this.settings.imageBaseUrl,
          model: this.settings.imageModel,
          apiKey: this.settings.imageApiKey,
          size: this.settings.imageSize,
        },
        prompt,
        createBrowserProxy(),
        { size: typeof args.size === "string" && args.size.trim() ? args.size.trim() : undefined },
      );
    } catch (e) {
      return { error: e instanceof Error ? e.message : String(e) };
    }

    let target: { path: string; title: string };
    let docId: string | undefined;
    let created = false;
    if (existing) {
      target = existing;
    } else {
      const name = (typeof args.title === "string" && args.title.trim()) || t("AI 图片");
      const made = await this.createBoardFile(name);
      docId = made.docId;
      target = { path: made.path, title: fileNameOf(made.path).replace(/\.svg$/i, "") };
      created = true;
    }

    await this.openStudioTab(target.path, docId);
    const actions = await this.waitForAgentActions(target.path);
    const handle = actions?.getEaHandle();
    if (!actions || !handle) {
      return {
        error: `图片已生成，但白板「${target.title}」的画布未在 20 秒内就绪，未插入。请手动打开后重试（会重新生成一张图）。`,
      };
    }

    const origin = created ? { x: 0, y: 0 } : this.agentDrawOrigin(handle);
    const width = this.agentImageDimension(args.width) ?? image.width;
    const height = this.agentImageDimension(args.height) ?? image.height;
    let imageId = "";
    try {
      imageId = await handle.addImage(image.dataURL, { ...origin, width, height });
    } catch (e) {
      return { error: `图片已生成，但插入画布失败：${e instanceof Error ? e.message : String(e)}` };
    }
    handle.selectElements([imageId]);
    handle.scrollToElement(imageId);

    let saved = false;
    try {
      saved = await actions.flush();
    } catch {
      saved = false;
    }
    const bytes = Math.floor((image.base64.length * 3) / 4);
    const payload = {
      ok: true,
      created,
      path: toAssetRef(target.path),
      title: target.title,
      imageId,
      width,
      height,
      mime: image.mime,
      bytes,
      revisedPrompt: image.revisedPrompt ?? "",
      saved,
      origin,
    };
    return {
      result:
        `${created ? "已新建并插入" : "已插入"}图片到「${target.title}」：${width}×${height}（${payload.path}）` +
        `${saved ? "。" : "；落盘失败，稍后自动保存会重试。"}` +
        (image.revisedPrompt ? ` 模型改写：${image.revisedPrompt}` : ""),
      structuredContent: payload,
    };
  }

  private agentImageDimension(raw: unknown): number | undefined {
    if (raw === undefined || raw === null || raw === "") return undefined;
    const n = Number(raw);
    if (!Number.isFinite(n)) return undefined;
    return Math.max(64, Math.min(4096, Math.round(n)));
  }

  /**
   * 注册四个前端智能体能力（思源 3.7+）。只对内置智能体可见、不进 MCP；
   * 外部 agent 走 CLI/Skill 或内核能力。版本不支持时安静跳过，不影响插件其余功能。
   */
  private registerAgentCapabilities(): void {
    if (typeof this.addAgentCapability !== "function") return;
    // 第四十四轮·注册门：AI 通道关掉的智能体不注册（改动要重载思源——面板已注明）
    if (!this.settings.aiChannels.agent) return;
    try {
      this.addAgentCapability({
        name: "excali_list_boards",
        title: t("列出 Excali 白板"),
        description: t("列出白板库里的白板（标题、路径、更新时间），可按 query 过滤。只读。"),
        inputSchema: {
          type: "object",
          properties: {
            query: { type: "string", description: t("按标题/路径过滤（不区分大小写）") },
            limit: { type: "number", minimum: 1, maximum: 100, description: t("最多返回条数，默认 50") },
          },
        },
        effects: { localRead: true },
        handler: (args) => this.agentRun(() => this.agentListBoards(args)),
      });
      this.addAgentCapability({
        name: "excali_open_board",
        title: t("打开 Excali 白板"),
        description: t("打开指定白板并等待画布就绪；board 传标题，path 传保存目录下的路径。"),
        inputSchema: {
          type: "object",
          properties: {
            board: { type: "string", description: t("白板标题（不含 .svg）") },
            path: { type: "string", description: t("白板路径，如 assets/excali/foo.svg") },
          },
        },
        effects: { localRead: true },
        handler: (args) => this.agentRun(() => this.agentOpenBoard(args)),
      });
      this.addAgentCapability({
        name: "excali_draw_board",
        title: t("用 AI 计划绘制 Excali 白板"),
        description: t(
          "把结构化计划（nodes/edges）画成白板：board 为空则新建，有值则追加到已有白板；自动布局、配色并保存。",
        ),
        inputSchema: {
          type: "object",
          properties: {
            plan: {
              type: "object",
              description: t("绘图计划：{ title, caption, preset, layout, groups, nodes: [{id,label,shape,group,rank,order}], edges: [{from,to,label}] }"),
              properties: {
                title: { type: "string" },
                caption: { type: "string" },
                preset: { type: "string", description: t("pencil/marker/blueprint 或 data/assets/excali-styles 里的风格包名") },
                layout: { type: "string", enum: ["lr", "tb", "grid", "radial"] },
                groups: { type: ["object", "array"], description: t("要画框的分组：{ 组名: 框标题 }，组名对应 node.group；同组节点在层内挨着放，框包住非成员时会返回 warning") },
                nodes: { type: "array", description: t("节点：字符串，或 {id,label,shape,group,rank,order}。rank = lr/tb 里钉在第几层（0 起）；order = 层内先后，与位次比较（0 = 最前；grid 里是格子、radial 里是环上）。都可省略"), items: { type: ["string", "object"] } },
                edges: { type: "array", items: { type: ["string", "object", "array"] } },
              },
              required: ["nodes"],
            },
            board: { type: "string", description: t("追加到已有白板的标题或路径；省略则新建") },
            title: { type: "string", description: t("新建白板的文件名；省略用计划标题或「AI 白板」") },
            append: { type: "boolean", description: t("board 指向已有白板时是否追加，默认 true") },
            style: { type: "string", description: t("风格包名：内置预设，或 assets/excali-styles 目录里的 json 包；与 preset 同义，优先 style") },
            preset: { type: "string", description: t("覆盖计划内的风格") },
            layout: { type: "string", enum: ["lr", "tb", "grid", "radial"], description: t("覆盖计划内的布局") },
          },
          required: ["plan"],
        },
        effects: { localRead: true, localWrite: true },
        handler: (args) => this.agentRun(() => this.agentDrawBoard(args)),
      });
      this.addAgentCapability({
        name: "excali_generate_image",
        title: t("生成图片并插入 Excali 白板"),
        description: t(
          "调用设置里的 OpenAI 兼容图像 API 生成一张位图，插入已有白板或新建白板；图片不可编辑。需要先在插件设置里填 API 地址和 Key。",
        ),
        inputSchema: {
          type: "object",
          properties: {
            prompt: { type: "string", description: t("画面描述（主体、风格、构图；上限 4000 字符）") },
            board: { type: "string", description: t("插入到已有白板的标题或路径；省略则新建") },
            title: { type: "string", description: t("新白板文件名；省略用「AI 图片」") },
            append: { type: "boolean", description: t("board 指向已有白板时是否插入到该板，默认 true") },
            width: { type: "number", minimum: 64, maximum: 4096, description: t("图像显示宽度；省略按原图尺寸") },
            height: { type: "number", minimum: 64, maximum: 4096, description: t("图像显示高度；省略按原图尺寸") },
            size: { type: "string", description: t("尺寸覆盖（如 1024x1024）；省略用设置里的值") },
          },
          required: ["prompt"],
        },
        effects: { localRead: true, localWrite: true },
        handler: (args) => this.agentRun(() => this.agentGenerateImage(args)),
      });
    } catch (e) {
      console.warn("[excali-studio] 注册智能体能力失败（思源版本可能不支持）", e);
    }
  }

  /** 2026-10-16 S3：「运行脚本…」选择器（☰ 菜单 / dock / 侧边栏入口共用）。
      单例：真机 bug——连点入口会叠 N 层 Dialog，思源每层 Dialog 都有遮罩，越叠越暗 */
  private scriptPickerDialog: Dialog | null = null;
  /** inputPrompt 串行链：上一个对话框 settle 后下一个才创建（防遮罩叠层变暗） */
  private inputPromptChain: Promise<unknown> = Promise.resolve();
  /** selectOption 菜单串行链（同理：防连点叠菜单） */
  private selectOptionChain: Promise<unknown> = Promise.resolve();

  private openScriptPicker(): void {
    // 第四十四轮·入口门（另一半在 runScriptOnActiveBoard）：关闭后连选择器都不弹
    if (!this.settings.aiChannels.script) {
      showMessage(t("脚本通道已在「AI 通道」面板里关闭"));
      return;
    }
    if (this.scriptPickerDialog) return; // 已开着：不叠层
    void (async () => {
      const scripts = await listScripts();
      if (scripts.length === 0) {
        showMessage(t("还没有脚本：首次启用会自动安装内置脚本到 {dir}", { dir: SCRIPTS_DIR }), 7000);
        return;
      }
    const pinned = new Set(this.settings.pinnedScripts);
    // 第三十五轮：脚本专属图标（对标 Obsidian 同名 SVG；未配置回落齿轮）
    const iconOf = (name: string): string => SCRIPT_ICONS[name] ?? ICON_SCRIPT_GEAR;
    const iconSvg = (d: string): string =>
      `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`;
    // P2：行内设置抽屉（有声明参数的脚本才生成；change 委托落盘，不弹新 Dialog 防遮罩叠层）
    const settingsHtml = (s: ScriptInfo): string => {
      const specs = SCRIPT_SETTING_SPECS[s.name];
      if (!specs || specs.length === 0) return "";
      const fields = specs
        .map((spec) => {
          const cur = this.eaHost().getScriptSetting(s.name, spec.key);
          const val = cur === undefined ? spec.default : cur;
          const key = escapeAttr(spec.key);
          const control =
            spec.type === "select"
              ? `<select class="b3-select" data-key="${key}">${(spec.options ?? [])
                  .map(
                    (o) =>
                      `<option value="${escapeAttr(o.value)}"${String(o.value) === String(val) ? " selected" : ""}>${escapeHtml(o.label)}</option>`,
                  )
                  .join("")}</select>`
              : spec.type === "toggle"
                ? `<input class="b3-switch" type="checkbox" data-key="${key}"${val ? " checked" : ""} />`
                : `<input class="b3-text-field" type="number" data-key="${key}" value="${escapeAttr(String(val))}"${
                    spec.min !== undefined ? ` min="${spec.min}"` : ""
                  }${spec.max !== undefined ? ` max="${spec.max}"` : ""} />`;
          return `<div class="exs-script-settings__field"><label>${escapeHtml(spec.label)}</label>${control}</div>`;
        })
        .join("");
      return `<div class="exs-script-settings" data-settings hidden>${fields}<div class="exs-script-settings__tip">${t(
        "保存即生效；脚本运行时弹窗会用它预填，仍可临时改一次。",
      )}</div></div>`;
    };
    // 第三十四轮：顶部常驻使用说明（对标 Obsidian ea-scripts 的「说明文字 + 代码」文档形态）
    const hint = `<div class="exs-picker__hint"><b>${t("脚本使用说明")}</b>${t(
      "点一条立即对当前画布执行；先框选画布元素再跑 = 对选中操作（对齐、连线、标注类）；先打开文档页签再跑 = 读文档内容（思维导图、表格类）。行尾按钮可固定到画布右缘侧边栏 / 改脚本设置（也可右键一条固定）。脚本就是 {dir} 下的 Markdown，可直接编辑，文件头加 @excalidraw-onload 则画布打开时自动运行。",
      { dir: SCRIPTS_DIR },
    )}</div>`;
    // 第五十一轮：面板拆两类——内置动作（拓展功能，即面板标题本身）不设组题排顶部，
    // .md 脚本列表前加「脚本库」组题。行结构照抄脚本行，样式零分叉。
    const pinnedActions = new Set<string>(this.settings.pinnedActions);
    /*
     * 第五十三轮：钉子有两种落点——右缘竖条 / 画布右上角。措辞跟着落点走，
     * 别对用户说「固定到侧边栏」结果出现在右上角。
     */
    const pinLabels = (topRight: boolean, on: boolean): { do: string; done: string } =>
      topRight
        ? { do: t("固定到右上角"), done: t("已固定在右上角") }
        : { do: t("固定到侧边栏"), done: t("已固定到侧边栏") };
    const actionRow = (a: RailActionMeta): string => {
      const on = pinnedActions.has(a.id);
      const labels = pinLabels(railActionMount(a) === "top-right", on);
      return `<div class="b3-list-item exs-script-item${on ? " exs-script-item--pinned" : ""}" data-rail-action="${escapeAttr(
        a.id,
      )}" title="${escapeAttr(a.id)}"><div class="exs-script-item__head"><span class="b3-list-item__text"><span class="exs-script-item__icon">${iconSvg(
        a.icon,
      )}</span>${escapeHtml(t(a.title))}${on ? ` <span class="exs-script-pin" title="${labels.done}"></span>` : ""}</span><span class="exs-script-item__actions"><button type="button" class="b3-button b3-button--text${
        on ? " exs-script-item__btn--on" : ""
      }" data-act="pin" title="${on ? labels.done : labels.do}">${iconSvg(ICON_PIN)}</button></span></div><span class="exs-script-desc">${escapeHtml(
        t(a.desc),
      )}</span></div>`;
    };
    const actionBlock = RAIL_ACTIONS.map(actionRow).join("");
    const list = scripts
      .map((s, i) => {
        const specs = SCRIPT_SETTING_SPECS[s.name] ?? [];
        const isPinned = pinned.has(s.name);
        return `<div class="b3-list-item exs-script-item${isPinned ? " exs-script-item--pinned" : ""}" data-idx="${i}" title="${escapeHtml(s.name)}"><div class="exs-script-item__head"><span class="b3-list-item__text"><span class="exs-script-item__icon">${iconSvg(
          iconOf(s.name),
        )}</span>${escapeHtml(s.title)}${s.onload ? ` <span class="exs-script-badge">${t("打开时自动运行")}</span>` : ""}${
          isPinned ? ` <span class="exs-script-pin" title="${t("已固定到侧边栏")}"></span>` : ""
        }</span><span class="exs-script-item__actions">${
          specs.length > 0
            ? `<button type="button" class="b3-button b3-button--text" data-act="gear" title="${t("脚本设置")}">${iconSvg(ICON_SCRIPT_GEAR)}</button>`
            : ""
        }<button type="button" class="b3-button b3-button--text${isPinned ? " exs-script-item__btn--on" : ""}" data-act="pin" title="${
          isPinned ? t("已固定到侧边栏") : t("固定到侧边栏")
        }">${iconSvg(ICON_PIN)}</button></span></div>${
          s.description
            ? `<span class="exs-script-desc">${escapeHtml(s.description)}</span>`
            : `<span class="b3-list-item__meta">${escapeHtml(s.name)}</span>`
        }${settingsHtml(s)}</div>`;
      })
      .join("");
    // P2v4：内置脚本更新提示条（installBuiltinScripts 已存在不覆盖 → 升级后磁盘脚本
    //   可能停在旧版；给用户一个显式重置入口，不静默覆盖用户的修改）
    const outdated = await outdatedBuiltinScripts();
    const outdatedBar =
      outdated.length > 0
        ? `<div class="exs-picker__outdated"><span>${t("{n} 个内置脚本有新版本", { n: outdated.length })}${t(
            "旧版内置脚本行为可能和插件不一致，重置会覆盖你在这些脚本里的修改（自建脚本不受影响）。",
          )}</span><button type="button" class="b3-button b3-button--text" data-act="reset">${t("重置为最新版")}</button></div>`
        : "";
    const dialog = new Dialog({
      title: t("拓展功能"),
      width: "520px",
      content: `<div class="exs-picker">${outdatedBar}${actionBlock}${hint}<div class="exs-picker__group">${t(
        "脚本库",
      )}</div><div class="b3-list b3-list--background exs-board-list">${list}</div></div>`,
      destroyCallback: () => {
        if (this.scriptPickerDialog === dialog) this.scriptPickerDialog = null;
        // 选择器关闭：竖条让位解除（真机 bug 修复——竖条曾浮在 Dialog 上竞合）
        window.dispatchEvent(new CustomEvent(RAIL_VIEW_EVENT, { detail: { pickerOpen: false } }));
      },
    });
    dialog.element.classList.add("exs-picker-dialog");
    this.scriptPickerDialog = dialog;
    // 选择器开着：右缘竖条整体让位（隐藏不落盘，关窗自动恢复）
    window.dispatchEvent(new CustomEvent(RAIL_VIEW_EVENT, { detail: { pickerOpen: true } }));
    // 固定态的就地刷新（脚本行与动作行是同一个行结构，共用一份；选择器不重开）
    const markPinned = (item: HTMLElement, pinned: boolean, topRight = false): void => {
      const labels = pinLabels(topRight, pinned);
      item.classList.toggle("exs-script-item--pinned", pinned);
      const pinBtn = item.querySelector('[data-act="pin"]') as HTMLElement | null;
      if (pinBtn) {
        pinBtn.classList.toggle("exs-script-item__btn--on", pinned);
        pinBtn.title = pinned ? labels.done : labels.do;
      }
      const badge = item.querySelector(".exs-script-pin");
      if (pinned && !badge) {
        const dot = document.createElement("span");
        dot.className = "exs-script-pin";
        dot.title = labels.done;
        item.querySelector(".b3-list-item__text")?.appendChild(dot);
      } else if (!pinned && badge) {
        badge.remove();
      }
    };
    dialog.element.addEventListener("click", (e) => {
      // 内置脚本更新条：重置为最新版（只覆盖过期的；自建脚本不动）
      if ((e.target as HTMLElement | null)?.closest?.('[data-act="reset"]')) {
        void (async () => {
          const n = await resetBuiltinScripts();
          showMessage(t("已重置 {n} 个内置脚本", { n }), 3000);
          dialog.destroy();
          this.openScriptPicker(); // 重开：提示条消失、列表刷新
        })();
        return;
      }
      // 第四十一轮：画布动作行。必须排在脚本分支之前——动作行照抄了脚本行的结构
      // （同一个 .exs-script-item），但它没有 data-idx，落到脚本分支会被静默吞掉。
      const railRow = (e.target as HTMLElement | null)?.closest?.("[data-rail-action]") as HTMLElement | null;
      if (railRow) {
        const id = railRow.dataset.railAction ?? "";
        if (!isRailActionId(id)) return;
        if ((e.target as HTMLElement | null)?.closest?.('[data-act="pin"]')) {
          const topRight = railActionMount(railActionOf(id)!) === "top-right";
          const pinNow = this.settings.pinnedActions.includes(id);
          this.rememberActionPin(id, !pinNow);
          markPinned(railRow, !pinNow, topRight);
          return;
        }
        dialog.destroy();
        void this.runRailAction(id);
        return;
      }
      const item = (e.target as HTMLElement | null)?.closest?.(".exs-script-item") as HTMLElement | null;
      const idx = item?.dataset?.idx;
      if (!item || idx === undefined) return;
      const info = scripts[Number(idx)];
      if (!info) return;
      // P2：行尾动作按钮优先（固定开关 / 设置抽屉），都不触发运行
      const act = (e.target as HTMLElement | null)?.closest?.("[data-act]") as HTMLElement | null;
      if (act) {
        if (act.dataset.act === "pin") {
          const pinNow = this.settings.pinnedScripts.includes(info.name);
          this.rememberScriptPin(info.name, !pinNow);
          markPinned(item, !pinNow);
        } else if (act.dataset.act === "gear") {
          const drawer = item.querySelector(".exs-script-settings");
          if (drawer) {
            const willOpen = drawer.hasAttribute("hidden");
            // 手风琴：同时只展开一个行的设置抽屉
            dialog.element.querySelectorAll(".exs-script-settings").forEach((d) => {
              if (d !== drawer) d.setAttribute("hidden", "");
            });
            dialog.element.querySelectorAll('[data-act="gear"]').forEach((b) => {
              if (b !== act) b.classList.remove("exs-script-item__btn--on");
            });
            if (willOpen) drawer.removeAttribute("hidden");
            else drawer.setAttribute("hidden", "");
            act.classList.toggle("exs-script-item__btn--on", willOpen);
          }
        }
        return;
      }
      if ((e.target as HTMLElement | null)?.closest?.(".exs-script-settings")) return; // 抽屉内点控件不运行
      dialog.destroy();
      // P2v4：透传点击时的 Shift（编号脚本：按住 Shift 点条目 = 弹格式框重编号）
      void this.runScriptOnActiveBoard(info, { shift: e.shiftKey, at: { x: e.clientX, y: e.clientY } });
    });
    // P2：设置控件 change → 宿主落盘（委托到 dialog，控件可动态增删）
    dialog.element.addEventListener("change", (e) => {
      const input = e.target as HTMLInputElement | HTMLSelectElement | null;
      const drawer = input?.closest?.(".exs-script-settings") as HTMLElement | null;
      if (!drawer || !input?.dataset?.key) return;
      const item = drawer.closest(".exs-script-item") as HTMLElement | null;
      const idx = item?.dataset?.idx;
      if (idx === undefined) return;
      const info = scripts[Number(idx)];
      if (!info) return;
      const key = input.dataset.key;
      const spec = (SCRIPT_SETTING_SPECS[info.name] ?? []).find((s) => s.key === key);
      if (!spec) return;
      const value: string | number | boolean =
        spec.type === "number"
          ? Math.max(spec.min ?? 0, Math.min(spec.max ?? Number.MAX_SAFE_INTEGER, Number(input.value) || 0))
          : spec.type === "toggle"
            ? (input as HTMLInputElement).checked
            : input.value;
      this.eaHost().setScriptSetting(info.name, key, value);
      showMessage(t("已保存：{name} › {label}", { name: info.title, label: spec.label }), 3000);
    });
    // 第三十四轮：右键 = 固定/取消固定到右缘侧边栏（对标 Obsidian 工具面板的 pin 交互）
    dialog.element.addEventListener("contextmenu", (e) => {
      // 第四十一轮：画布动作行同一条右键菜单（固定在竖条里、取消固定也在竖条里右键）
      const railRow = (e.target as HTMLElement | null)?.closest?.("[data-rail-action]") as HTMLElement | null;
      if (railRow) {
        const id = railRow.dataset.railAction ?? "";
        if (!isRailActionId(id)) return;
        e.preventDefault();
        const topRight = railActionMount(railActionOf(id)!) === "top-right";
        const pinNow = this.settings.pinnedActions.includes(id);
        const labels = pinLabels(topRight, pinNow);
        const railMenu = new Menu();
        railMenu.addItem({
          label: pinNow ? labels.done : labels.do,
          click: () => {
            this.rememberActionPin(id, !pinNow);
            markPinned(railRow, !pinNow, topRight);
          },
        });
        railMenu.open({ x: e.clientX, y: e.clientY });
        return;
      }
      const item = (e.target as HTMLElement | null)?.closest?.(".exs-script-item") as HTMLElement | null;
      const idx = item?.dataset?.idx;
      if (!item || idx === undefined) return;
      const info = scripts[Number(idx)];
      if (!info) return;
      e.preventDefault();
      const pinNow = this.settings.pinnedScripts.includes(info.name);
      const menu = new Menu();
      menu.addItem({
        label: pinNow ? t("从侧边栏取消固定") : t("固定到侧边栏"),
        click: () => {
          this.rememberScriptPin(info.name, !pinNow);
          markPinned(item, !pinNow);
        },
      });
      menu.open({ x: e.clientX, y: e.clientY });
    });
    })();
  }

  /** 第三十四轮：右缘脚本侧边栏的固定清单（解析标题；脚本被删的自动跳过） */
  private async listPinnedScripts(): Promise<Array<{ name: string; title: string }>> {
    if (this.settings.pinnedScripts.length === 0) return [];
    let scripts: ScriptInfo[] = [];
    try {
      scripts = await listScripts();
    } catch {
      return [];
    }
    return this.settings.pinnedScripts
      .map((name) => scripts.find((s) => s.name === name))
      .filter((s): s is ScriptInfo => Boolean(s))
      .map((s) => ({ name: s.name, title: s.title }));
  }

  /** 第三十四轮：点侧边栏里的一枚固定脚本 → 对当前活动画布执行。
   *  opts.shift：点按钮时按住 Shift = 显式请求弹参数框（编号脚本的换格式入口） */
  private async runScriptFile(name: string, opts?: ScriptRunOpts): Promise<void> {
    let scripts: ScriptInfo[] = [];
    try {
      scripts = await listScripts();
    } catch {
      scripts = [];
    }
    const info = scripts.find((s) => s.name === name);
    if (!info) {
      showMessage(t("找不到脚本：{name}", { name }), 7000, "error");
      return;
    }
    await this.runScriptOnActiveBoard(info, opts);
  }

  /** 第三十四轮：固定/取消固定脚本到右缘侧边栏；落设置并广播（所有已开画布重拉清单） */
  private rememberScriptPin(name: string, pinned: boolean): void {
    const cur = this.settings.pinnedScripts;
    const next = pinned ? (cur.includes(name) ? cur : [...cur, name]) : cur.filter((n) => n !== name);
    if (next.length === cur.length && next.every((n, i) => n === cur[i])) return; // 无变化不落盘
    this.settings = { ...this.settings, pinnedScripts: next };
    this.persist();
    window.dispatchEvent(new CustomEvent(SCRIPT_PIN_EVENT));
  }

  /** 第四十一轮：画布动作的固定/取消固定。与脚本钉子同一个广播（同一件事不配有两个事件名） */
  private rememberActionPin(id: RailActionId, pinned: boolean): void {
    const cur = this.settings.pinnedActions;
    const next = pinned ? (cur.includes(id) ? cur : [...cur, id]) : cur.filter((x) => x !== id);
    if (next.length === cur.length && next.every((n, i) => n === cur[i])) return; // 无变化不落盘
    this.settings = { ...this.settings, pinnedActions: next };
    this.persist();
    window.dispatchEvent(new CustomEvent(SCRIPT_PIN_EVENT));
  }

  /**
   * 第四十四轮：AI 通道开关落盘。四道门生效时机不同（channels.ts 头注释），
   * 只有 agent 一栏需要重载（注册发生在 onload），提示也只给它。
   */
  private setAiChannel(id: ChannelId, on: boolean): void {
    if (this.settings.aiChannels[id] === on) return; // 同值不落盘
    this.settings = { ...this.settings, aiChannels: { ...this.settings.aiChannels, [id]: on } };
    this.persist();
    if (id === "agent") {
      showMessage(on ? t("内置智能体通道已开启：重载思源后注册生效") : t("内置智能体通道已关闭：重载思源后彻底摘除"), 6000);
    }
  }

  /**
   * 第四十一轮：脚本库面板里点一条画布动作 → 对**当前活动画布**执行（与脚本同口径）。
   * 竖条上的那一枚不走这里：它在自己那块画布里直接跑，免得活动态和竖条所在页签不是同一块。
   * 第四十五轮：「仅外框颜色」不是立即执行，是让活动画布把色板打开。
   */
  private async runRailAction(id: RailActionId): Promise<void> {
    if (id === OUTLINE_COLOR) {
      const actions = this.activeActions();
      if (!actions) {
        showMessage(t("先打开一块白板，再改外框颜色"));
        return;
      }
      actions.openOutlinePalette();
      return;
    }
    if (id === IMAGE_TO_MATERIAL) {
      const actions = this.activeActions();
      if (!actions) {
        showMessage(t("先打开一块白板，再转换图片"));
        return;
      }
      actions.openImageToMaterial();
      return;
    }
    if (id === PRESENTATION) {
      const actions = this.activeActions();
      if (!actions) {
        showMessage(t("先打开一块白板，再放映"));
        return;
      }
      actions.openPresentation();
      return;
    }
    if (id !== INSERT_BOARD_CARD) return;
    const actions = this.activeActions();
    if (!actions) {
      showMessage(t("先打开一块白板，再往里插卡片"));
      return;
    }
    const ref = await this.pickBoardRef();
    if (!ref) return;
    actions.insertBoardCard(ref, fileNameOf(ref).replace(/\.svg$/i, ""));
  }

  /** 第三十四轮·液态玻璃返工：侧边栏视图偏好（图钉/收起/位置）落盘并广播
      （getter 不触发重渲染——真机上图钉点了没反应的根因；本地 state + 事件同步） */
  private rememberScriptRail(key: "scriptRailCollapsed" | "scriptRailTop", value: boolean | number): void {
    if (this.settings[key] === value) return;
    this.settings = { ...this.settings, [key]: value } as typeof this.settings;
    this.persist();
    window.dispatchEvent(new CustomEvent(RAIL_VIEW_EVENT, { detail: { [key]: value } }));
  }

  /**
   * 第三十八轮：荧光笔配置落盘并广播。
   * 同 rememberScriptRail 的理由——getter 读设置不触发 React 重渲染，配置以画布本地
   * state 为准，写完广播给其余画布；同值直接短路（色板里连点同一个色不会刷 disk）。
   */
  private rememberHighlighter(cfg: HighlighterConfig): void {
    const next = normalizeHighlighter(cfg);
    const cur = this.settings.highlighter;
    if (cur.color === next.color && cur.width === next.width && cur.opacity === next.opacity) return;
    this.settings = { ...this.settings, highlighter: next };
    this.persist();
    window.dispatchEvent(new CustomEvent(HIGHLIGHTER_EVENT, { detail: next }));
  }

  /**
   * 第五十三轮：演示偏好落盘。滑杆拖动时每帧回调，归一后同值直接短路；
   * 不广播——放映口径在进片场时定格，另一块画板下次开抽屉/开演时自己拉最新值。
   */
  private rememberPresentationSetting<K extends keyof PresentationSettings>(
    key: K,
    value: PresentationSettings[K],
  ): void {
    const next = normalizePresentationSettings({ ...this.settings.presentation, [key]: value });
    if (this.settings.presentation[key] === next[key]) return;
    this.settings = { ...this.settings, presentation: next };
    this.persist();
  }

  /** 对当前活动画布跑一个脚本；结果经 showMessage 汇报，日志进 console */
  private async runScriptOnActiveBoard(info: ScriptInfo, opts?: ScriptRunOpts): Promise<void> {
    // 第四十四轮·入口门：脚本通道关闭时这里与选择器一起拒开（竖条/库/右键全走这条唯一执行口）
    if (!this.settings.aiChannels.script) {
      showMessage(t("脚本通道已在「AI 通道」面板里关闭"));
      return;
    }
    const actions = this.activeActions();
    const handle = actions?.getEaHandle() ?? null;
    if (!handle) {
      showMessage(t("没有可运行脚本的白板：请先打开一张"));
      return;
    }
    let meta: { title: string; onload: boolean; code: string };
    try {
      meta = await readScript(info.path);
    } catch (e) {
      showMessage(t("读取脚本失败：{msg}", { msg: e instanceof Error ? e.message : String(e) }), 7000, "error");
      return;
    }
    const ea: EaApi = createEaApi(handle, this.eaHost(), info.name, opts);
    const result = await runScriptCode(meta.code, ea, ea.utils);
    if (result.logs.length > 0) {
      console.log(`[excali-studio][脚本] ${info.title}\n${result.logs.join("\n")}`);
    }
    if (result.ok) {
      showMessage(t("脚本「{title}」运行成功（{ms}ms）", { title: info.title, ms: result.durationMs }));
    } else {
      showMessage(t("脚本「{title}」运行失败：{msg}", { title: info.title, msg: (result.error || "").split("\n")[0] }), 10000, "error");
    }
  }

  /** 画布就绪后跑该轮的 onload 脚本（文件头带 @excalidraw-onload 的） */
  private async runOnloadScripts(custom: Custom): Promise<void> {
    let scripts: ScriptInfo[] = [];
    try {
      scripts = (await listScripts()).filter((s) => s.onload);
    } catch {
      return;
    }
    for (const info of scripts) {
      const actions = this.boardActions.get(custom);
      const handle = actions?.getEaHandle() ?? null;
      if (!handle) continue;
      try {
        const meta = await readScript(info.path);
        const ea = createEaApi(handle, this.eaHost(), info.name);
        const result = await runScriptCode(meta.code, ea, ea.utils);
        if (result.logs.length > 0) {
          console.log(`[excali-studio][onload 脚本] ${info.title}\n${result.logs.join("\n")}`);
        }
        if (!result.ok) {
          console.warn(`[excali-studio][onload 脚本失败] ${info.title}: ${(result.error || "").split("\n")[0]}`);
        }
      } catch (e) {
        console.warn("[excali-studio][onload 脚本异常]", info.title, e);
      }
    }
  }

  /* ------------------------------ 左 Dock（S2） ------------------------------ */

  /** 当前活动画布的动作窄接口；没有打开的白板时为 null */
  private activeActions(): BoardActions | null {
    return this.activeCustom ? this.boardActions.get(this.activeCustom) ?? null : null;
  }

  /**
   * 2026-10-16 S2：左 dock。第二十二起复刻 kmind-zen 的原生形态——头部
   * （block__icons：标题＋数量＋＋新建/删除/⟳ 原生图标按钮）+ 原生 b3-list 文件列表，
   * 行内悬停显重命名/删除；搜索框按用户拍板删除（纯复刻）。画布动作与杂项入口
   * 全部在 ☰ 菜单或顶栏菜单。位置 LeftBottom、宽度 300。
   */
  private registerDock(): void {
    const plugin = this;
    const host: DockHost = {
      openNew: () => void this.openNew(),
      deleteActiveBoard: () => plugin.deleteActiveBoard(),
      getBoardFiles: () => {
        // opened 现算不缓存：页签开关是结构事件，dockRefresh 会跟着来，但集合以会话表为准
        const opened = new Set<string>();
        for (const s of plugin.tabs.values()) {
          if (typeof s.data.dataPath === "string") opened.add(s.data.dataPath);
        }
        return { files: plugin.boardFiles, opened };
      },
      refreshBoardLib: () => void plugin.refreshBoardLib(),
      openBoardFile: (item) => void plugin.openStudioTab(item.dataPath, item.docId || undefined),
      openDocOf: (docId) => plugin.openDocumentById(docId),
      // 第二十二轮：行内悬停按钮与右键菜单共用同两条宿主链路（弹命名框 / 二次确认后删）
      renameBoardFile: (item) => void plugin.renameFromDock(item),
      deleteBoardFile: (item) => void plugin.deleteBoardFile(item),
      openFileMenu: (item, x, y) => plugin.openFileMenu(item, x, y),
      hasActiveBoard: () => plugin.activeCustom !== null && plugin.tabs.has(plugin.activeCustom),
      onRefresh: (refresh) => {
        this.dockRefresh = refresh;
      },
    };
    this.addDock({
      id: this.name + "-dock",
      type: "excali_studio_dock",
      config: {
        position: "LeftBottom",
        size: { width: 300, height: 0 },
        icon: STUDIO_ICON_ID,
        title: t("Excali 白板"),
      },
      data: { name: this.name },
      init: (custom) => {
        const panel = createDockPanel(host);
        const el = (custom as Custom).element as HTMLElement;
        el.innerHTML = "";
        el.appendChild(panel.element);
        this.dockRefresh = panel.refresh;
        panel.refresh();
      },
      destroy: () => {
        this.dockRefresh = null;
      },
    });
  }

  /** 2026-10-16 S2：帮助面板（快捷键速查；☰ 主菜单「帮助」入口） */
  private openHelp(): void {
    const lines = [
      ["⌘⌥E", t("新建白板")],
      ["⌘S", t("保存（已有文件静默覆盖）")],
      ["⌘⇧E", t("导出图片…")],
      [t("空格 + 拖动"), t("平移画布")],
      [t("滚轮"), t("缩放画布")],
      [t("画布右键菜单"), t("只读 / 禅模式 / 网格 / 统计")],
    ];
    const rows = lines
      .map(([k, v]) => `<div class="exs-help__row"><span class="exs-help__key">${escapeHtml(k)}</span><span>${escapeHtml(v)}</span></div>`)
      .join("");
    const dialog = new Dialog({
      title: t("帮助"),
      width: "420px",
      content: `<div class="exs-help">${rows}</div>`,
      destroyCallback: () => undefined,
    });
    // 点遮罩/Esc 关闭（思源 Dialog 默认行为，这里只保留引用避免未用告警）
    void dialog;
  }

  /**
   * 打开（或聚焦）一个白板页签。
   * 同一文件全局只允许一个页签——思源自带的去重只在同一分屏里找，跨分屏会开出
   * 第二个编辑器，两边各自保存互相覆盖；所以先查自己的会话表，命中直接聚焦。
   * 新建（dataPath 为 null）不走去重，且要 openNewTab 绕开思源「data 深比命中
   * 就复用旧页签」的合并——它会把第二张新白板并进第一张。
   */
  private async openStudioTab(dataPath: string | null, docId?: string): Promise<void> {
    const target = dataPath ? toDataPath(dataPath) : null;
    if (target) {
      const opened = [...this.tabs.values()].find((s) => s.data.dataPath === target);
      if (opened) {
        opened.tab.parent.switchTab(opened.tab.headElement);
        return;
      }
    }
    // 移动端（iPad/手机）没有自定义页签：openTab 是空函数，继续走桌面链路
    // 就会出现「文件建好了、画板永远不出现」。改挂宿主自己的全屏浮层。
    if (isMobileFrontend()) {
      this.openMobileStudio(target, docId);
      return;
    }
    const before = new Set(this.tabs.values());
    await openTab({
      app: this.app,
      openNewTab: true,
      custom: {
        id: this.name + STUDIO_TAB_TYPE,
        icon: STUDIO_ICON_ID,
        title: target ? fileNameOf(target) : t("未命名白板"),
        data: { dataPath: target, docId } satisfies StudioTabData,
      },
    });
    // openTab 的返回值在去重/新建两条路径上类型不一致，索性不依赖它：
    // 用「开前后差集」找到新会话，显式聚焦一次，保证用户看得见刚打开的页签
    const fresh = [...this.tabs.values()].find((s) => !before.has(s));
    if (fresh) fresh.tab.parent.switchTab(fresh.tab.headElement);
  }

  /**
   * 移动端开板：全屏浮层 + 同一个 attachStudioTab。
   * 引擎装载期间先放一个占位会话进 tabs，去重/关闭/卸载都能照常工作；
   * 装载完成后换成真会话，失败就地显示错误（不弹第二层窗）。
   */
  private openMobileStudio(dataPath: string | null, docId?: string): void {
    const data: StudioTabData = { dataPath, docId };
    const holder: { custom: Custom | null } = { custom: null };
    const shell = createMobileStudioShell({
      data,
      onDispose: () => {
        const custom = holder.custom;
        if (!custom) return;
        this.tabs.delete(custom);
        this.boardActions.delete(custom);
        this.onloadRan.delete(custom);
        if (this.activeCustom === custom) this.activeCustom = null;
        this.dockRefresh?.();
      },
    });
    const custom = shell.custom;
    holder.custom = custom;
    const provisional: StudioTabSession = {
      tab: custom.tab,
      data,
      requestClose: () => shell.close(),
      closeForDelete: () => shell.close(),
      dispose: () => undefined,
    };
    this.tabs.set(custom, provisional);
    this.dockRefresh?.();
    void this.lazyMod()
      .then((m) => {
        if (shell.isClosed()) return;
        shell.body.replaceChildren();
        const session = m.attachStudioTab(custom, this.studioHost());
        if (shell.isClosed()) {
          session.dispose();
          return;
        }
        this.tabs.set(custom, session);
        shell.mount(session);
        this.dockRefresh?.();
      })
      .catch((e) => {
        if (shell.isClosed()) return;
        console.error("[excali-studio] 画板引擎加载失败", e);
        shell.showError(
          t("画板引擎加载失败：{msg}", { msg: e instanceof Error ? e.message : String(e) }),
        );
      });
  }

  /** 读盘 + 解码 + 图片注水；null（新建）直接进画板。失败由页签侧就地显示 */
  private async loadScene(dataPath: string | null): Promise<LoadedScene | null> {
    if (!dataPath) return null;
    // 第二十五轮：迁移可能还在搬文件，读完设置/迁移再摸盘
    await this.ready;
    const text = await getFileText(dataPath);
    const { decodeSvgScene } = await this.lazyMod();
    // 第二十六轮 T1：载荷里的图片是 excali-media 引用，先注水成 dataURL 再进画布
    const initial = await decodeSvgScene(text, (files) => this.hydrateSceneFiles(files));
    this.rememberRecent(dataPath);
    return initial;
  }

  /**
   * 第二十六轮 T1：把载荷 files 里的 path 引用读回字节、拼成 dataURL。
   * 读不回的条目原样保留（缺图不挡开板，画布上该图渲染为空框，console 留痕）。
   */
  private async hydrateSceneFiles(files: Record<string, unknown>): Promise<Record<string, unknown>> {
    const out: Record<string, unknown> = {};
    for (const [id, f] of Object.entries(files)) {
      const rec = (f ?? {}) as { dataURL?: unknown; path?: unknown; mimeType?: unknown };
      if (typeof rec.dataURL === "string" && rec.dataURL !== "") {
        out[id] = f;
        continue;
      }
      if (typeof rec.path !== "string" || rec.path === "") {
        out[id] = f;
        continue;
      }
      try {
        const bytes = await getFileBytes(rec.path);
        const mime = typeof rec.mimeType === "string" && rec.mimeType !== "" ? rec.mimeType : "image/png";
        out[id] = { ...rec, dataURL: bytesToDataURL(bytes, mime) };
      } catch (e) {
        console.warn("[excali-studio] 白板图片读回失败（该图会显示为空框）", rec.path, e);
        out[id] = f;
      }
    }
    return out;
  }

  /**
   * 第二十六轮 T1：dataURL → assets/excali-media 内容寻址文件，返回相对引用路径。
   * 同图同哈希同名：重复导入/重复保存天然去重（putFile 覆盖写同内容，幂等）。
   */
  private async saveBoardMedia(dataURL: string, mime: string): Promise<string> {
    const parsed = parseDataUrl(dataURL);
    if (!parsed) throw new Error(t("无法解析图片数据"));
    const name = await mediaFileName(parsed.bytes, parsed.mime || mime);
    const ref = `${MEDIA_DIR}/${name}`;
    await putBytes(ref, parsed.bytes, parsed.mime || mime);
    return ref;
  }

  /**
   * 第二十六轮 T6：图形上的 `siyuan:doc/<id>` 链接 → 开文档；解析不了只提示不抛。
   * 第四十轮：同一条通道再认 `siyuan:excali/<ref>`（画布上的白板卡片）→ 开那块板
   * 的页签。文件可能被改名/删掉了，所以先验存在——点了没反应比报错更难查。
   */
  private openBoardDocLink(link: string): void {
    const boardPath = boardPathFromLink(link);
    if (boardPath) {
      void this.openLinkedBoard(boardPath);
      return;
    }
    const docId = docIdFromLink(link);
    if (!docId) {
      showMessage(t("无法识别的文档链接：{link}", { link }), 5000, "error");
      return;
    }
    this.openDocOf(docId);
  }

  /** 白板卡片 → 页签（openExisting 自带「已开就聚焦」）；文件没了给明确提示 */
  private async openLinkedBoard(dataPath: string): Promise<void> {
    if (!(await fileExists(dataPath))) {
      showMessage(t("这块白板已经不在了：{path}", { path: toAssetRef(dataPath) }), 5000, "error");
      return;
    }
    await this.openExisting(dataPath);
  }

  /**
   * 2026-10-17 第十九轮·B：从备份恢复（页签解码失败时的自救通道）。
   * 按链条新→旧找第一份**解得出非空场景**的 .bak 盖回原文件——坏档也滚动得进来，
   * 所以逐档验内容而不是拿到就用；全链没有可用档返回 false，由页签侧提示。
   * 成功只负责把文件修好，重新读盘渲染交给页签（它才知道怎么重开）。
   */
  private async restoreFromBackup(dataPath: string): Promise<boolean> {
    const target = toDataPath(dataPath);
    for (const bak of backupChainOf(target)) {
      try {
        const text = await getFileText(bak);
        if (!hasNonEmptyScene(text)) continue;
        await putSvg(target, text);
        refreshAssetImages(target);
        return true;
      } catch {
        // 这一档不存在，试更旧的
      }
    }
    return false;
  }

  /* ------------------------------ 入口 ------------------------------ */

  /** 顶栏图标右键：新建 / 最近打开（悬停看完整路径）/ 清空最近 / 按路径打开 / 设置 */
  private buildTopMenu(menu: subMenu): void {
    menu.addItem({ icon: "iconAdd", label: t("新建白板"), click: () => void this.openNew() });
    menu.addSeparator();
    if (this.recent.length === 0) {
      menu.addItem({ type: "readonly", label: t("还没有打开或保存过白板") });
    } else {
      this.recent.slice(0, RECENT_MENU_MAX).forEach((path) => {
        const el = menu.addItem({ label: fileNameOf(path), click: () => void this.openExisting(path) }) as unknown as
          | HTMLElement
          | undefined;
        // 第十三轮：同名文件（不同目录）悬停看完整路径。
        // subMenu.addItem 的类型声明是 void（Menu 类才是 HTMLElement），
        // 内核实现若不给元素就静默跳过——tooltip 是增强，不是功能依赖。
        if (el instanceof HTMLElement) el.setAttribute("title", path);
      });
      menu.addItem({ label: t("清空最近记录"), click: () => this.clearRecent() });
    }
    menu.addSeparator();
    menu.addItem({ icon: "iconOpen", label: t("按路径打开…"), click: () => this.promptOpenPath() });
    menu.addItem({ icon: "iconFolder", label: t("打开白板…"), click: () => void this.openBoardPicker() });
    menu.addItem({ icon: "iconSettings", label: t("设置"), click: () => this.openSetting() });
  }

  /**
   * 块图标菜单（块左侧 ⋮）里加「用 Excali 白板打开」。
   * 只在被点的块里含 assets/*.svg 图片时出现；菜单项必须同步添加，
   * 所以不预读文件内容——「是不是本插件的白板」留到页签里解码时判断。
   */
  private registerBlockIconMenu(): void {
    this.eventBus.on("click-blockicon", ({ detail }) => {
      const path = svgAssetPathOf(detail.blockElements);
      if (!path) return;
      detail.menu.addItem({
        icon: STUDIO_ICON_ID,
        label: t("用 Excali 白板打开"),
        click: () => void this.openExisting(path),
      });
    });
  }

  /**
   * 第二十五轮：重跑 SQL + readDir 刷新白板库缓存。
   * 列表的**唯一真源**是保存目录（默认 assets/excali）里的 .svg——目录本身就是
   * 白板库，登记表退役；SQL 结果只用来给文件配存档文档（徽标 + 右键动作 +
   * 菜单注入反查）。第二十四轮的分段容错保留：SQL 挂只丢徽标层，
   * readDir 挂按原承诺保留上一次列表，两条互不牵连。
   */
  private async refreshBoardLib(): Promise<void> {
    if (this.libLoading) return;
    this.libLoading = true;
    let docs: BoardDocItem[] = [];
    try {
      await this.ready;
      try {
        docs = (await listBoardDocs()).map(toBoardDocItem);
        this.boardDocs = docs;
        this.boardSvgByDocId = new Map(docs.map((d) => [d.docId, d.svg]));
      } catch (e) {
        // 查询挂了不空手而归：沿用上一次缓存的绑定，徽标不至于整批闪失
        docs = this.boardDocs;
        console.warn("[excali-studio] 白板文档查询失败（沿用上次绑定）", e);
      }
      let entries: BoardFileEntry[] | null = null;
      try {
        entries = await listBoardEntries(this.settings.saveDir);
      } catch (e) {
        console.warn("[excali-studio] 白板库读保存目录失败", e);
      }
      if (entries) this.boardFiles = toBoardFileItems(entries, docs);
    } finally {
      this.libLoading = false;
    }
    this.dockRefresh?.();
  }

  /**
   * 新建文档（建档）直接记账进缓存：内核 SQL 索引有延迟，建完立刻反查会闪出又消失；
   * ⟳ 与下次保存自然全量同步。文件列表同步补上「已建档」徽标。
   */
  private rememberBoardDoc(docId: string, title: string, svgRef: string): void {
    this.boardSvgByDocId.set(docId, svgRef);
    const item: BoardDocItem = {
      docId,
      title: title || t("无标题"),
      hpath: "",
      svg: svgRef,
      updated: Date.now(),
      refs: 0,
    };
    this.boardDocs = [item, ...this.boardDocs.filter((d) => d.docId !== docId)];
    const dataPath = toDataPath(svgRef);
    this.boardFiles = this.boardFiles.map((f) =>
      f.dataPath === dataPath ? { ...f, docId, docTitle: title || t("无标题") } : f,
    );
  }

  /** 第十八轮：白板行右键「建档」——建文档 + 插图片块 + 绑属性（纯文件 → 存档文档）。
   *  不开画板页签（用户在看库，不一定想开）；已开着的页签补上 docId 供复制引用。
   *  第二十一轮：返回值给新建链路用（autoCreateDoc 开着时创建即建档，docId 随页签 data
   *  落库，重启恢复后复制引用照样有）。失败/已建档/无笔记本都返回 null。 */
  private async adoptBoardFile(item: BoardFileItem): Promise<string | null> {
    if (item.docId) return null;
    const notebook = (await currentNotebook()) ?? (await firstNotebook());
    if (!notebook) {
      showMessage(t("找不到笔记本，无法建档"), 7000, "error");
      return null;
    }
    const title = item.name.replace(/\.svg$/i, "") || item.name;
    try {
      const docId = await createDocWithMd(notebook, boardDocPath(this.settings.boardDir, title), "");
      const ref = toAssetRef(item.dataPath);
      await appendImageBlock(docId, ref, title);
      await setBlockAttrs(docId, { "custom-excali-svg": ref });
      this.rememberBoardDoc(docId, title, ref);
      const opened = [...this.tabs.values()].find((s) => s.data.dataPath === item.dataPath);
      if (opened && !opened.data.docId) opened.data.docId = docId;
      showMessage(t("已建档《{title}》", { title }), 5000);
      this.dockRefresh?.();
      return docId;
    } catch (e) {
      showMessage(t("建档失败：{msg}", { msg: e instanceof Error ? e.message : String(e) }), 10000, "error");
      return null;
    }
  }

  /**
   * 批3：切到白板文档自动开对应画板页签。三条守卫：
   * ①设置总开关；②每会话每文档只自动开一次（先占位——查失败/非白板也不再重来）；
   * ③openStudioTab 自身去重，已开只聚焦，绝不出现双页签。
   */
  private async autoOpenBoardForDoc(rootID: string): Promise<void> {
    if (!this.settings.autoOpenBoard) return;
    if (this.autoOpenedDocs.has(rootID)) return;
    this.autoOpenedDocs.add(rootID);
    let svg = this.boardSvgByDocId.get(rootID);
    if (svg === undefined) {
      try {
        svg = (await getBlockAttrs(rootID))["custom-excali-svg"] || "";
      } catch {
        svg = "";
      }
      this.boardSvgByDocId.set(rootID, svg);
    }
    if (!svg) return;
    await this.openStudioTab(svg, rootID);
  }

  /** 批2/批3：白板库事件接线（在 loadState 之后调用，设置要读得到） */
  private registerBoardDocEvents(): void {
    this.eventBus.on("switch-protyle", ({ detail }) => {
      const rootID = detail?.protyle?.block?.rootID;
      if (typeof rootID === "string" && rootID !== "") void this.autoOpenBoardForDoc(rootID);
    });

    // 文档树右键：菜单项必须同步建，只查缓存。判型走元素属性
    // data-type==="navigation-file"（实测值，不是 doc）+ data-node-id；
    // detail.type 在多选/空白场景不可靠（re-todo B94 的教训）。
    this.eventBus.on("open-menu-doctree", ({ detail }) => {
      const el = detail.elements?.[0];
      if (!el || el.getAttribute("data-type") !== "navigation-file") return;
      const docId = el.getAttribute("data-node-id") || "";
      const svg = docId ? this.boardSvgByDocId.get(docId) : undefined;
      if (!svg) return;
      detail.menu.addItem({
        icon: STUDIO_ICON_ID,
        label: t("在画板中打开"),
        click: () => void this.openStudioTab(svg, docId),
      });
    });

    // 文件页签右键：open-menu-filetab 不在 siyuan.d.ts 的映射里，照 reword 先例
    // 强转挂上；整体 try/catch——detail 形态变了不能连带崩别的订阅者。
    (this.eventBus as unknown as { on: (name: string, cb: (e: unknown) => void) => void }).on(
      "open-menu-filetab",
      (event) => {
        try {
          const detail = (
            event as {
              detail?: {
                menu?: subMenu;
                protyle?: { protyle?: { block?: { rootID?: string } }; block?: { rootID?: string } };
              };
            }
          ).detail;
          const rootID = detail?.protyle?.protyle?.block?.rootID || detail?.protyle?.block?.rootID || "";
          if (!rootID) return;
          const svg = this.boardSvgByDocId.get(rootID);
          if (!svg) return;
          detail?.menu?.addItem({
            icon: STUDIO_ICON_ID,
            label: t("在画板中打开"),
            click: () => void this.openStudioTab(svg, rootID),
          });
        } catch (e) {
          console.warn("[excali-studio] 文件页签菜单注入失败", e);
        }
      },
    );
  }

  /* ---------------- 批4：复制白板引用 + 体检 ---------------- */

  /** 复制文本 → 成功提示。navigator.clipboard 在 http/无权限环境会 reject 或干脆没有，
   *  照 reword 先例回落 execCommand("copy") */
  private copyText(text: string, okMsg: string): void {
    const done = () => showMessage(okMsg, 3000);
    try {
      if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(text).then(done, () => this.fallbackCopy(text, done));
      } else {
        this.fallbackCopy(text, done);
      }
    } catch {
      this.fallbackCopy(text, done);
    }
  }

  private fallbackCopy(text: string, done: () => void): void {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      ta.remove();
      if (ok) done();
      else showMessage(t("复制失败：{msg}", { msg: "execCommand" }), 7000, "error");
    } catch (e) {
      showMessage(t("复制失败：{msg}", { msg: e instanceof Error ? e.message : String(e) }), 7000, "error");
    }
  }

  /**
   * 2026-10-17 第十八轮：白板行右键菜单（建档 / 打开文档 / 复制引用 / 重命名 / 删除）。
   * 菜单建在宿主——ExcaliDock 面板零 siyuan import（board-lib 测试断言）。
   */
  private openFileMenu(item: BoardFileItem, x: number, y: number): void {
    const menu = new Menu("excali-file-menu");
    menu.addItem({ icon: "iconEdit", label: t("在画板中打开"), click: () => void this.openBoardFile(item) });
    menu.addItem({ icon: "iconRight", label: t("插入到当前画布"), click: () => this.insertBoardCardToActive(item) });
    if (item.docId) {
      menu.addItem({ icon: "iconFile", label: t("打开存档文档"), click: () => this.openDocOf(item.docId) });
      menu.addItem({
        icon: "iconCopy",
        label: t("复制嵌入引用"),
        click: () => this.copyText(embedRef(item.docId), t("已复制嵌入引用")),
      });
      menu.addItem({
        icon: "iconCopy",
        label: t("复制行内引用"),
        click: () => this.copyText(inlineRef(item.docId, item.docTitle), t("已复制行内引用")),
      });
    } else {
      menu.addItem({ icon: "iconAdd", label: t("建档"), click: () => void this.adoptBoardFile(item) });
    }
    menu.addItem({ icon: "iconRename", label: t("重命名"), click: () => void this.renameFromDock(item) });
    menu.addSeparator();
    menu.addItem({ icon: "iconTrash", label: t("删除…"), click: () => void this.deleteBoardFile(item) });
    menu.open({ x, y });
  }

  /** 行右键「在画板中打开」：未建档的板也照开（docId 空 = 没有存档文档可绑） */
  private openBoardFile(item: BoardFileItem): Promise<void> {
    return this.openStudioTab(item.dataPath, item.docId || undefined);
  }

  /**
   * 第四十轮：行菜单「插入到当前画布」——拖拽的兜底通道（有些人不用拖，或者
   * 两块画板不同窗口拖不到）。没有活动画布就直说，不静默丢动作。
   */
  private insertBoardCardToActive(item: BoardFileItem): void {
    const actions = this.activeActions();
    if (!actions) {
      showMessage(t("先打开一块白板，再往里插卡片"));
      return;
    }
    actions.insertBoardCard(toAssetRef(item.dataPath), boardDisplayName(item));
  }

  private openDocOf(docId: string): void {
    this.openDocumentById(docId);
  }

  /**
   * 打开文档：桌面走 openTab，移动端走内核的 openMobileFileById。
   * 移动端的 window.siyuan.openTab 与插件 openTab 都是空函数，共用桌面链路会静默失败。
   */
  private openDocumentById(docId: string): void {
    const host = window as unknown as {
      siyuan?: { mobile?: unknown; openMobileFileById?: (...args: unknown[]) => unknown };
      openMobileFileById?: (...args: unknown[]) => unknown;
    };
    const mobileOpen = host.openMobileFileById ?? host.siyuan?.openMobileFileById;
    if (host.siyuan?.mobile && typeof mobileOpen === "function") {
      try {
        mobileOpen(this.app, docId, [], "start");
        return;
      } catch (e) {
        console.warn("[excali-studio] 移动端打开文档失败，回落页签", e);
      }
    }
    void openTab({ app: this.app, doc: { id: docId } }).catch((e) => {
      showMessage(t("打开文档失败：{msg}", { msg: e instanceof Error ? e.message : String(e) }), 7000);
    });
  }

  /**
   * 第十八轮：删除一块白板 = 工程文件 + 覆盖备份（如有）+ 存档文档（如有）。
   * 顺序有讲究：先关页签再删文件——关页签的 dispose 会冲刷落盘，
   * 落了再删会被写回；skipDisposeFlush 让这次关闭不冲刷（文件紧接着就没）。
   * 思源删除没有回收站，确认框在宿主侧列清删什么（deletePlanOf 纯函数）。
   */
  private async deleteBoardFile(item: BoardFileItem): Promise<void> {
    const plan = deletePlanOf(item);
    const docNote = plan.doc ? `，以及存档文档《${plan.doc.title}》` : "";
    confirm(
      t("删除白板"),
      t("将删除白板文件 {name} 及其备份（如存在）{doc}。删除不可恢复；白板开着时，画布上未保存的改动也会一并丢弃。", {
        name: item.name,
        doc: docNote,
      }),
      () => {
        void (async () => {
          try {
            for (const s of [...this.tabs.values()]) {
              if (s.data.dataPath === item.dataPath) s.closeForDelete();
            }
            await removeSvg(plan.svgPath);
            // 备份链第五十四轮退役，但老用户库里还有存量档：删除逐档走——档数不固定
            // （从没覆盖过就一档都没有），每档都可能不存在，所以逐档 try/catch、
            // 失败不挡后面的档和删文档
            for (const bak of plan.bakPaths) {
              try {
                await removeSvg(bak);
              } catch {
                // 这一档不存在，忽略
              }
            }
            if (plan.doc) {
              try {
                await removeDoc(plan.doc.id);
              } catch (e) {
                console.warn("[excali-studio] 删除存档文档失败（文件已删）", plan.doc.id, e);
              }
            }
            this.boardFiles = this.boardFiles.filter((f) => f.dataPath !== item.dataPath);
            this.boardDocs = this.boardDocs.filter((d) => d.docId !== plan.doc?.id);
            if (plan.doc) this.boardSvgByDocId.delete(plan.doc.id);
            this.recent = this.recent.filter((p) => p !== item.dataPath);
            this.persist();
            this.dockRefresh?.();
            showMessage(t("已删除《{name}》", { name: item.name }), 5000);
          } catch (e) {
            showMessage(t("删除失败：{msg}", { msg: e instanceof Error ? e.message : String(e) }), 10000, "error");
          }
        })();
      },
    );
  }

  /** dock 头部「－删除当前白板」：只对当前活动画布有意义，其余情况提示 */
  private deleteActiveBoard(): void {
    const path = this.activeCustom ? this.tabs.get(this.activeCustom)?.data.dataPath : null;
    if (!path) {
      showMessage(t("没有可删除的白板：当前没有打开已保存的白板"), 7000);
      return;
    }
    const item = this.boardFiles.find((f) => f.dataPath === path);
    if (!item) {
      // 缓存还没刷到（刚保存的板）：现读一次目录再找
      void this.refreshBoardLib().then(() => {
        const fresh = this.boardFiles.find((f) => f.dataPath === path);
        if (fresh) void this.deleteBoardFile(fresh);
        else showMessage(t("删除失败：{msg}", { msg: path }), 7000, "error");
      });
      return;
    }
    void this.deleteBoardFile(item);
  }

  /** 行右键「重命名」：问个新名字 → renameBoard（文件读旧写新删旧 + 绑定同步）→ 开着的页签跟位 */
  private async renameFromDock(item: BoardFileItem): Promise<void> {
    const newName = await this.promptFileName(item.name, t("重命名白板"));
    if (!newName) return;
    try {
      const saved = await this.renameBoard(item.dataPath, newName);
      this.applyRenameToSession(item.dataPath, saved);
      showMessage(t("已重命名为 {name}", { name: fileNameOf(saved) }), 5000);
    } catch (e) {
      showMessage(t("重命名失败：{msg}", { msg: e instanceof Error ? e.message : String(e) }), 7000, "error");
    }
  }

  /** 宿主持有的页签会话跟位：data.dataPath 换了，去重比对/打开态徽标才继续成立 */
  private applyRenameToSession(oldPath: string, newPath: string): void {
    for (const s of this.tabs.values()) {
      if (s.data.dataPath === oldPath) {
        s.data.dataPath = newPath;
        s.tab.updateTitle(fileNameOf(newPath));
      }
    }
  }

  /**
   * 批4A：☰「复制此白板的引用」= 嵌入引用 `![[docId]]`（内核不支持给块嵌入定制显示
   * 文本，只有行内 `((docId "标题"))` 能带别名——demo 里的 `![[id "标题"]]` 是假口径）。
   * docId 优先取页签数据（首存/收编写入），旧会话恢复的页签没存过 docId 时按 svg 反查库缓存。
   */
  private copyBoardRefFor(custom: Custom): void {
    const session = this.tabs.get(custom);
    if (!session) return;
    const path = session.data.dataPath;
    const docId =
      session.data.docId ?? (path ? this.boardDocs.find((d) => toDataPath(d.svg) === path)?.docId : undefined);
    if (!docId) {
      showMessage(t("还没建档，复制不了引用：在白板行右键「建档」"), 7000);
      return;
    }
    this.copyText(embedRef(docId), t("已复制嵌入引用"));
  }

  /** 第十八轮：白板体检——先全量刷新库，再查一件事：文档绑的 svg 文件已不存在（断链）。
   *  文件即白板，没有「孤儿 SVG」一说了（未建档是正常状态，不是问题）。 */
  private async runCheckup(): Promise<void> {
    if (this.checkupRunning) return;
    this.checkupRunning = true;
    try {
      await this.refreshBoardLib();
      const missing: BoardDocItem[] = [];
      for (const d of this.boardDocs) {
        if (!(await fileExists(toDataPath(d.svg)))) missing.push(d);
      }
      if (missing.length === 0) {
        showMessage(t("体检完成：没有断链的白板文档"), 5000);
        return;
      }
      const rows = (items: Array<{ name: string; sub: string; tip: string }>): string =>
        items.length === 0
          ? `<p class="exs-check__none">${t("没有")}</p>`
          : items
              .map(
                (r) =>
                  `<div class="exs-check__row" title="${escapeAttr(r.tip)}"><span class="exs-check__name">${escapeHtml(r.name)}</span><code class="exs-check__path">${escapeHtml(r.sub)}</code></div>`,
              )
              .join("");
      new Dialog({
        title: t("白板体检"),
        width: "560px",
        content: `<div class="exs-check">
          <div class="exs-check__group">${t("断链文档：{n}", { n: missing.length })}</div>
          ${rows(missing.map((d) => ({ name: d.title, sub: fileNameOf(d.svg), tip: toDataPath(d.svg) })))}
          <p class="exs-check__hint">${t("断链文档需手动重新保存或删除；未建档的白板文件是正常状态，不用处理")}</p>
        </div>`,
      });
    } finally {
      this.checkupRunning = false;
    }
  }

  private promptOpenPath(): void {
    openInputDialog({
      title: t("按路径打开…"),
      label: t("工作空间内的 SVG 路径"),
      placeholder: "assets/excali-20261015-120000.svg",
      value: "",
      confirmText: t("打开"),
      onConfirm: (value, dialog) => {
        const v = value.trim();
        if (!v) return;
        void this.openExisting(toDataPath(v));
        dialog.destroy();
      },
    });
  }

  /**
   * 删掉用户敲下的「/白板」过滤词，并让这次删除进思源自己的输入管线。
   *
   * 思源 3.8.7 的斜杠分发里 `plugin*` 分支**不**调 range.deleteContents()
   * （内置项才会删），把清理责任交给插件；此时 toolbar.range 的起点已被收敛到 splitChar，
   * 所以圈住的正好是「/xxx」。加 startsWith("/") 守卫：万一 range 圈住的是用户选中内容，
   * 宁可留着残留文本也不能误删。
   *
   * 只 deleteContents 的话，DOM 与编辑器的 lastHTMLs 缓存脱节、撤销栈也记不到这一步；
   * 补一次 input 事件，思源的输入管线会 diff 出这次删除、写进撤销栈并落盘。
   */
  private clearSlashHint(protyle: Protyle): void {
    const range = protyle?.protyle?.toolbar?.range;
    if (!range || !range.toString().startsWith("/")) return;
    range.deleteContents();
    protyle.protyle?.wysiwyg?.element?.dispatchEvent(
      new InputEvent("input", { bubbles: true, inputType: "deleteContentBackward" }),
    );
  }

  /* ------------------------------ 存取闭环 ------------------------------ */

  /**
   * 第二十一轮：新建 = 文件先行（对齐 Obsidian Excalidraw：点一下就在库里落下
   * 一个文件，然后进画布）。弹命名框（取消 = 什么都不做）→ createBoardFile 落一份
   * 空 scene 文件并即时进库 → 开页签。此后的每一笔由画板侧防抖自动保存带走，
   * 用户再也不需要惦记「保存」。三个入口（dock ＋/顶栏右键/斜杠与命令）全走这里。
   */
  private async openNew(): Promise<void> {
    const name = await this.promptFileName(t("未命名白板"), t("新建白板"));
    if (!name) return;
    try {
      const { path, docId } = await this.createBoardFile(name);
      await this.openStudioTab(path, docId);
    } catch (e) {
      showMessage(t("创建白板失败：{msg}", { msg: e instanceof Error ? e.message : String(e) }), 7000, "error");
    }
  }

  private openExisting(dataPath: string): Promise<void> {
    return this.openStudioTab(dataPath);
  }

  /**
   * 第二十一轮：创建白板文件（新建链路的第一步）。
   * sanitize + 避重（撞名滚 `_0`/`_1`，不静默覆盖别人的板）→ 落一份**空 scene**的
   * SVG（elements 显式空数组，解码侧第二十一轮起按合法空画板解）→ 即时进库缓存 +
   * 最近列表（保存 → 库中立即可见 → 点条目再次进入的闭环，创建即成立）。
   * autoCreateDoc 开着时顺带建一篇存档文档（建档语义从「首次保存时」变为「新建时」）。
   */
  private async createBoardFile(name: string): Promise<{ path: string; docId?: string }> {
    const target = await uniqueTargetPath(this.settings.saveDir, sanitizeFileName(name, t("未命名白板")));
    const docId = this.settings.autoCreateDoc
      ? await this.adoptBoardFile({
          dataPath: target,
          name: fileNameOf(target),
          docId: "",
          docTitle: "",
          updated: Date.now(),
        })
      : null;
    // 建档只插文档块、不落 SVG——文件在它之后写（建档失败也不该挡住创建）
    const { sceneToSvgText } = await this.lazyMod();
    await putSvg(
      target,
      await sceneToSvgText({ elements: [], appState: {}, files: {} }),
    );
    refreshAssetImages(target);
    this.rememberRecent(target);
    this.rememberBoardFile(target, docId ?? undefined, fileNameOf(target).replace(/\.svg$/i, ""));
    void this.refreshBoardLib();
    return { path: target, docId: docId ?? undefined };
  }

  /**
   * 第二十一轮：覆盖保存——画板侧防抖自动保存 / ⌘S / ea 脚本的唯一落盘通道。
   * 只覆盖已有文件：新建走 createBoardFile（空 scene + 可选建档在那条链路）。
   * 第五十四轮：备份链退役——白板库一个目录里每块板只留一个文件，写坏的兜底
   * 交给思源自己的历史/数据快照。落盘前两道等价判定（正文逐字、载荷语义），
   * 归一化带来的字节差不再刷 mtime、不再惊动同步。
   */
  private async saveSvg(svgText: string, currentPath: string | null): Promise<{ path: string }> {
    if (!currentPath) throw new Error("saveSvg 只接受已有文件（新建走 createBoardFile）");
    const target = toDataPath(currentPath);
    let current: string | null = null;
    try {
      current = await getFileText(target);
    } catch {
      // 读不到就照常覆盖，下面的 putSvg 会给出真正的错误
    }
    if (current !== null && sceneTextsEquivalent(current, svgText)) return { path: currentPath };
    const saved = await putSvg(target, svgText);
    refreshAssetImages(saved);
    this.rememberRecent(saved);
    // 覆盖保存时项已在库里（创建/打开时就进了缓存），这里是空操作
    this.rememberBoardFile(saved);
    void this.refreshBoardLib();
    return { path: saved };
  }

  /** 第二十轮：保存落盘后把新文件补进库缓存（已存在则不动；docId/标题来自可选的建档分支） */
  private rememberBoardFile(dataPath: string, docId?: string, docTitle?: string): void {
    const normalized = toDataPath(dataPath);
    if (this.boardFiles.some((f) => f.dataPath === normalized)) return;
    this.boardFiles = [
      {
        dataPath: normalized,
        name: fileNameOf(normalized),
        docId: docId ?? "",
        docTitle: docTitle ?? "",
        updated: Date.now(),
      },
      ...this.boardFiles,
    ];
  }

  /** 2026-10-15 阶段 A：重命名（读旧写新删旧）。注意：只动文件，不碰画布上的未保存改动 */
  private async renameBoard(oldPath: string, newName: string): Promise<string> {
    const oldData = toDataPath(oldPath);
    // 第十九轮 D·重名避重：改名撞了别的白板同样滚到 _0/_1，不静默覆盖；
    // exclude=自己——改成原名走这条也回到 oldData，下面的同名早退照旧生效
    const target = await uniqueTargetPath(this.settings.saveDir, sanitizeFileName(newName), oldData);
    if (toDataPath(target) === oldData) return oldData; // 名字没变，什么都不做
    const saved = await renameSvg(oldData, target);
    // 第二十五轮：建档文档里的图片块还盯着旧路径，改名后正文引用一起改
    try {
      await rewriteAssetRefs(toAssetRef(oldData), toAssetRef(saved));
    } catch (e) {
      console.warn("[excali-studio] 重命名后更新正文资源引用失败", e);
    }
    // 第十七轮·批2：改了名要把绑定旧文件的文档属性一起搬走，否则列表/自动开板
    // 还指向已经不存在的 svg。失败只留日志（文件已经改名成功，不能回滚）。
    const bound = this.boardDocs.filter((d) => toDataPath(d.svg) === oldData);
    if (bound.length > 0) {
      const ref = toAssetRef(saved);
      for (const d of bound) {
        try {
          await setBlockAttrs(d.docId, { "custom-excali-svg": ref });
        } catch (e) {
          console.warn("[excali-studio] 重命名后同步白板绑定失败", d.docId, e);
        }
      }
      this.boardDocs = this.boardDocs.map((d) =>
        bound.some((b) => b.docId === d.docId) ? { ...d, svg: toAssetRef(saved) } : d,
      );
      this.boardSvgByDocId = new Map(this.boardDocs.map((d) => [d.docId, d.svg]));
    }
    void this.refreshBoardLib();
    // 最近列表：新路径置顶、旧路径移除（会话表里的 data.dataPath 由页签侧 wrapper 更新）
    this.recent = [saved, ...this.recent.filter((p) => p !== oldData && p !== saved)];
    this.persist();
    return saved;
  }

  /**
   * 第三十轮：图形模板库——Library 面板的持久层从「单文件 excali-library.json」
   * 升级为「<保存目录>/excali-libraries/ 下多个 .excalidrawlib 文件」（对标 Obsidian
   * StencilLibraryManager，设计照抄代码自写）：加载 = 合并文件夹全部库文件（本地优先、
   * id 去重、外部文件标 published）；保存 = diff 后回写各自的源文件。
   * 模板因此是普通文件：随思源多端同步、按主题拆分、丢一个文件进文件夹即装模板包。
   */

  private libCache: ReturnType<typeof mergeLibFiles> | null = null;

  private libDirRel(): string {
    return joinSavePath(this.settings.saveDir, "excali-libraries");
  }

  private localLibRel(): string {
    return joinSavePath(this.libDirRel(), LOCAL_LIB_NAME);
  }

  /**
   * 2026-10-18 B'：素材库「Add to Excalidraw」落地页 URL。
   *
   * 喂给 Excalidraw 组件的 libraryReturnUrl——组件库面板「Browse libraries」
   * 打开的素材库站会把按钮 referrer 指向它，用户点按钮即跳回本地页面
   * （#addLibrary=<库URL>），由 library-import.html 自动导入并落盘。
   *
   * 为什么带 dir 参数：页面读不到插件设置（插件数据在 conf/data/ 下，不在
   * /data/ 里，没有 HTTP 端点），库目录只能在点击时从 settings.saveDir 算好带过去。
   * 端口/协议用 location.origin（studio 页签就跑在内核 origin 上），自适应。
   */
  private libraryImportUrl(): string {
    const dir = encodeURIComponent(this.libDirRel());
    return `${location.origin}/plugins/${PLUGIN_WEB_DIR}/library-import.html?dir=${dir}`;
  }

  /** 旧单文件（阶段 B 的 excali-library.json）→ local.excalidrawlib，一次性（settings 标记） */
  private async migrateStencilLibrary(): Promise<void> {
    if (this.settings.stencilMigrated) return;
    try {
      const local = this.localLibRel();
      if (!(await fileExists(local))) {
        let legacy: unknown[] = [];
        try {
          legacy = parseLibFile(await getFileText(toDataPath(joinSavePath(this.settings.saveDir, "excali-library.json"))));
        } catch {
          legacy = []; // 旧文件不存在（新用户）或读不了
        }
        if (legacy.length > 0) {
          await putTextFile(local, serializeLibFile(legacy));
          showMessage(t("组件库已迁移到 {dir}", { dir: "excali-libraries" }), 3500);
        }
      }
    } catch (e) {
      console.warn("[excali-studio] 组件库迁移失败（旧文件保留，下次不再自动尝试）", e);
    } finally {
      // 成功失败都置位：失败时旧文件还在兜底，反复重试只会刷日志
      this.settings.stencilMigrated = true;
      this.persist();
    }
  }

  /** 合并加载 excali-libraries/ 下全部库文件（本地优先、id 去重、published 标记） */
  private async loadLibraryItems(): Promise<unknown[]> {
    await this.migrateStencilLibrary();
    const local = this.localLibRel();
    let paths: string[] = [];
    try {
      paths = await listFilesWithExt(this.libDirRel(), /\.excalidrawlib$/i);
    } catch {
      paths = []; // 目录还没有（新用户）
    }
    paths.sort((a, b) => (a === local ? -1 : b === local ? 1 : a.localeCompare(b)));
    const files: { path: string; items: unknown[] }[] = [];
    for (const path of paths) {
      try {
        files.push({ path, items: parseLibFile(await getFileText(path)) });
      } catch (e) {
        // 单个坏档不拖垮整个库：跳过并告警，其余文件照常进面板
        console.warn("[excali-studio] 模板库文件读取失败，已跳过", path, e);
      }
    }
    this.libCache = mergeLibFiles(files);
    return this.libCache.items;
  }

  /** diff 回写源文件（新增进本地库），写完重读一遍刷新缓存（文件少、频率低，不怕） */
  private async saveLibraryItems(items: unknown[]): Promise<void> {
    const merged = this.libCache ?? { items: [], sourceOf: new Map<string, string>(), byPath: new Map<string, unknown[]>() };
    const plan = planLibraryWrites(merged, items, this.localLibRel());
    for (const { path, items: fileItems } of plan) {
      try {
        if (fileItems.length === 0) {
          // 文件清空了就删掉（与 Obsidian 口径一致）；不存在就不动
          if (await fileExists(path)) await removeSvg(path);
          continue;
        }
        await putTextFile(path, serializeLibFile(fileItems));
      } catch (e) {
        console.error("[excali-studio] 模板库文件写入失败", path, e);
        showMessage(t("模板库保存失败：{path}", { path: fileNameOf(path) }), 5000, "error");
      }
    }
    // 以磁盘为准重建缓存（顺带吸收并发/同步改动的文件），下次 diff 才有正确基线
    this.libCache = null;
    await this.loadLibraryItems();
  }

  /**
   * 2026-10-15 阶段 A：问文件名（新建 / 重命名共用；title 必传）。
   * Dialog + destroyCallback 模式（与 doc-picker 一致）：点 ✕/遮罩/Esc 全走取消回 null，
   * 不会让画板侧的 await 悬挂。
   */
  private promptFileName(suggested: string, title: string): Promise<string | null> {
    return new Promise((resolve) => {
      let settled = false;
      const finish = (value: string | null) => {
        if (settled) return;
        settled = true;
        dialog.destroy();
        resolve(value);
      };
      const dialog = new Dialog({
        title,
        width: "420px",
        content: `<div class="exs-picker">
  <input class="b3-text-field fn__block exs-name-input" value="${escapeAttr(suggested)}" />
  <div class="exs-name-tip">${t("位置")}：${escapeHtml(this.settings.saveDir)}</div>
  <div class="exs-name-actions">
    <button class="b3-button exs-name-cancel" type="button">${t("取消")}</button>
    <button class="b3-button exs-name-ok" type="button">${t("确定")}</button>
  </div>
</div>`,
        destroyCallback: () => finish(null),
      });
      dialog.element.classList.add("exs-name-dialog");
      const input = dialog.element.querySelector<HTMLInputElement>(".exs-name-input")!;
      dialog.element.querySelector<HTMLButtonElement>(".exs-name-cancel")!.addEventListener("click", () => finish(null));
      const ok = (): void => finish(sanitizeFileName(input.value || suggested));
      dialog.element.querySelector<HTMLButtonElement>(".exs-name-ok")!.addEventListener("click", ok);
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          ok();
        } else if (e.key === "Escape") {
          e.preventDefault();
          finish(null);
        }
        e.stopPropagation();
      });
      setTimeout(() => {
        input.focus();
        input.select();
      }, 50);
    });
  }

  /**
   * 2026-10-16 第十三轮：「打开白板…」：搜索文件名 + 修改时间 + 已打开标记。
   * 列表一次读好交给选择器（纯内存过滤）；点已打开的项走 openExisting 的
   * 去重 → 直接聚焦已有页签，不重复开。读取失败/空目录仍在宿主侧先拦。
   * 第四十轮：选择段抽成 pickBoardRef（返回库内引用），☰「插入白板卡片…」共用——
   * 两个入口只差拿到引用之后干什么。
   */
  private async pickBoardRef(): Promise<string | null> {
    let entries: BoardFileEntry[] = [];
    try {
      entries = await listBoardEntries(this.settings.saveDir);
    } catch (e) {
      showMessage(t("读取目录失败：{msg}", { msg: e instanceof Error ? e.message : String(e) }), 7000, "error");
      return null;
    }
    if (entries.length === 0) {
      showMessage(t("目录里还没有白板文件"));
      return null;
    }
    const openPaths = new Set(
      [...this.tabs.values()]
        .map((s) => s.data.dataPath)
        .filter((p): p is string => typeof p === "string"),
    );
    return await pickBoardFile(entries, openPaths);
  }

  private async openBoardPicker(): Promise<void> {
    const picked = await this.pickBoardRef();
    if (picked) void this.openExisting(picked);
  }

  private rememberRecent(dataPath: string): void {
    const path = toDataPath(dataPath);
    this.recent = [path, ...this.recent.filter((p) => p !== path)].slice(0, RECENT_MAX);
    this.persist();
  }

  /** 第十三轮：清空最近列表（只动记录，不碰文件）；菜单每次右键现建，清完即生效 */
  private clearRecent(): void {
    this.recent = [];
    this.persist();
  }

  /* ------------------------------ 设置 ------------------------------ */

  private setupSetting(): void {
    let dirEl: HTMLInputElement | null = null;
    let accentEl: HTMLInputElement | null = null;
    let welcomeEl: HTMLInputElement | null = null;
    let gridEl: HTMLInputElement | null = null;
    let boardDirEl: HTMLInputElement | null = null;
    let autoOpenEl: HTMLInputElement | null = null;
    let autoCreateDocEl: HTMLInputElement | null = null;
    let imageBaseUrlEl: HTMLInputElement | null = null;
    let imageModelEl: HTMLInputElement | null = null;
    let imageApiKeyEl: HTMLInputElement | null = null;
    let imageSizeEl: HTMLInputElement | null = null;

    this.setting = new Setting({
      confirmCallback: () => {
        // 输入框可能没触发 change（比如用户直接点了保存），这里统一再收一次口
        this.settings = {
          ...this.settings,
          saveDir: dirEl?.value ?? this.settings.saveDir,
          accentStroke: accentEl?.checked ?? this.settings.accentStroke,
          showWelcome: welcomeEl?.checked ?? this.settings.showWelcome,
          gridModeEnabled: gridEl?.checked ?? this.settings.gridModeEnabled,
          boardDir: boardDirEl?.value ?? this.settings.boardDir,
          autoOpenBoard: autoOpenEl?.checked ?? this.settings.autoOpenBoard,
          autoCreateDoc: autoCreateDocEl?.checked ?? this.settings.autoCreateDoc,
          imageBaseUrl: imageBaseUrlEl?.value ?? this.settings.imageBaseUrl,
          imageModel: imageModelEl?.value ?? this.settings.imageModel,
          imageApiKey: imageApiKeyEl?.value ?? this.settings.imageApiKey,
          imageSize: imageSizeEl?.value ?? this.settings.imageSize,
        };
        this.settings = normalizeSettings(this.settings);
        this.persist();
      },
    });

    this.setting.addItem({
      title: t("保存目录"),
      description: t(
        "新白板保存的位置（工作空间相对路径，默认 assets/excali）。白板库只列这个目录里的 .svg；assets 根目录留给普通图片附件。",
      ),
      createActionElement: () => {
        const el = document.createElement("input");
        el.type = "text";
        el.className = "b3-text-field fn__block";
        el.value = this.settings.saveDir;
        el.placeholder = DEFAULT_SETTINGS.saveDir;
        el.addEventListener("change", () => {
          this.settings = { ...this.settings, saveDir: el.value };
          this.persist();
        });
        dirEl = el;
        return el;
      },
    });

    /* 2026-10-18 D：位图生图（OpenAI 兼容 images API）。
       Key 只进插件数据，界面用 password 输入，不写日志、不写白板文件。 */
    this.setting.addItem({
      title: t("图像生成 API 地址"),
      description: t("OpenAI 兼容的 images API 地址（如 https://api.openai.com/v1）；留空 = 关闭生图。"),
      createActionElement: () => {
        const el = document.createElement("input");
        el.type = "text";
        el.className = "b3-text-field fn__block";
        el.value = this.settings.imageBaseUrl;
        el.placeholder = "https://api.openai.com/v1";
        el.addEventListener("change", () => {
          this.settings = normalizeSettings({ ...this.settings, imageBaseUrl: el.value });
          this.persist();
        });
        imageBaseUrlEl = el;
        return el;
      },
    });

    this.setting.addItem({
      title: t("图像生成模型"),
      description: t("模型名（如 gpt-image-1、dall-e-3）；按服务商支持的型号填写。"),
      createActionElement: () => {
        const el = document.createElement("input");
        el.type = "text";
        el.className = "b3-text-field fn__block";
        el.value = this.settings.imageModel;
        el.placeholder = DEFAULT_SETTINGS.imageModel;
        el.addEventListener("change", () => {
          this.settings = normalizeSettings({ ...this.settings, imageModel: el.value });
          this.persist();
        });
        imageModelEl = el;
        return el;
      },
    });

    this.setting.addItem({
      title: t("图像生成 API Key"),
      description: t("只保存在插件数据里，不写日志、不写白板文件。"),
      createActionElement: () => {
        const el = document.createElement("input");
        el.type = "password";
        el.className = "b3-text-field fn__block";
        el.autocomplete = "off";
        el.spellcheck = false;
        el.value = this.settings.imageApiKey;
        el.placeholder = "sk-...";
        el.addEventListener("change", () => {
          this.settings = normalizeSettings({ ...this.settings, imageApiKey: el.value });
          this.persist();
        });
        imageApiKeyEl = el;
        return el;
      },
    });

    this.setting.addItem({
      title: t("图像生成尺寸"),
      description: t("传给 images API 的 size（如 1024x1024）；不同模型支持的尺寸不同，按服务商文档填写。"),
      createActionElement: () => {
        const el = document.createElement("input");
        el.type = "text";
        el.className = "b3-text-field fn__block";
        el.value = this.settings.imageSize;
        el.placeholder = DEFAULT_SETTINGS.imageSize;
        el.addEventListener("change", () => {
          this.settings = normalizeSettings({ ...this.settings, imageSize: el.value });
          this.persist();
        });
        imageSizeEl = el;
        return el;
      },
    });

    this.setting.addItem({
      title: t("画笔颜色跟随思源强调色"),
      description: t("新画板把第一笔的默认颜色设成当前主题强调色；只影响默认值，不覆盖已有图。"),
      createActionElement: () => {
        const el = document.createElement("input");
        el.type = "checkbox";
        el.className = "b3-switch fn__flex-center";
        el.checked = this.settings.accentStroke;
        el.addEventListener("change", () => {
          this.settings = { ...this.settings, accentStroke: el.checked };
          this.persist();
        });
        accentEl = el;
        return el;
      },
    });

    this.setting.addItem({
      title: t("空画板显示引导画面"),
      description: t("空白板中央显示手绘纸飞机和上手提示；落第一笔就消失，只影响新建的白板。"),
      createActionElement: () => {
        const el = document.createElement("input");
        el.type = "checkbox";
        el.className = "b3-switch fn__flex-center";
        el.checked = this.settings.showWelcome;
        el.addEventListener("change", () => {
          this.settings = { ...this.settings, showWelcome: el.checked };
          this.persist();
        });
        welcomeEl = el;
        return el;
      },
    });

    /* 2026-10-15 阶段 A → 第二十一轮：自动保存从可关开关收敛为唯一保存形态
       （防抖 + ⌘S），设置项删除——关掉它等于没有任何保存入口，是丢数据陷阱。
       第五十四轮：「覆盖前留备份」一并删除——备份链会在白板库里给每块板配出
       三档副本（实测 20MB 备份 / 2.7MB 白板），写坏文件的兜底交给思源历史。 */

    /* 2026-10-16 第七轮：网格是「视图偏好」而不是内容——记在设置里，开板时覆盖文件里的值 */
    this.setting.addItem({
      title: t("默认显示网格"),
      description: t(
        "在任意白板里切换网格都会记住这个值，之后所有白板（含还没保存过的空白板）打开时都按它显示。改这里只影响之后打开的页签。",
      ),
      createActionElement: () => {
        const el = document.createElement("input");
        el.type = "checkbox";
        el.className = "b3-switch fn__flex-center";
        el.checked = this.settings.gridModeEnabled;
        el.addEventListener("change", () => {
          this.settings = { ...this.settings, gridModeEnabled: el.checked };
          this.persist();
        });
        gridEl = el;
        return el;
      },
    });

    /* 2026-10-16 第十七轮·批1/批3：白板即文档的落点与自动开板 */
    this.setting.addItem({
      title: t("白板文档目录"),
      description: t("白板建档的落点（当前笔记本内的路径，默认 /Excali 白板）。只影响「建档」动作，SVG 工程文件不受它影响，仍存上面的保存目录。"),
      createActionElement: () => {
        const el = document.createElement("input");
        el.type = "text";
        el.className = "b3-text-field fn__block";
        el.value = this.settings.boardDir;
        el.placeholder = DEFAULT_SETTINGS.boardDir;
        el.addEventListener("change", () => {
          this.settings = { ...this.settings, boardDir: el.value };
          this.persist();
        });
        boardDirEl = el;
        return el;
      },
    });

    /* 2026-10-17 第十八轮 → 第二十一轮：建档从「首存必建」改成可选开关（默认关）；
       语义随文件先行改为「新建时建档」 */
    this.setting.addItem({
      title: t("新建时自动建档"),
      description: t(
        "关：新建只落 SVG 工程文件，白板库按文件列，文档树保持干净。开：新建白板时顺带建一篇文档绑定（可反链、可搜索、可文档树管理）。关着也能补建——Dock 白板行右键「建档」。",
      ),
      createActionElement: () => {
        const el = document.createElement("input");
        el.type = "checkbox";
        el.className = "b3-switch fn__flex-center";
        el.checked = this.settings.autoCreateDoc;
        el.addEventListener("change", () => {
          this.settings = { ...this.settings, autoCreateDoc: el.checked };
          this.persist();
        });
        autoCreateDocEl = el;
        return el;
      },
    });

    this.setting.addItem({
      title: t("打开白板文档时自动进入画板"),
      description: t("切到绑定了白板的文档会自动打开对应画板页签；每篇文档每次会话只自动开一次，已开着则直接聚焦。"),
      createActionElement: () => {
        const el = document.createElement("input");
        el.type = "checkbox";
        el.className = "b3-switch fn__flex-center";
        el.checked = this.settings.autoOpenBoard;
        el.addEventListener("change", () => {
          this.settings = { ...this.settings, autoOpenBoard: el.checked };
          this.persist();
        });
        autoOpenEl = el;
        return el;
      },
    });

    /* 批4B：体检 = 只读检查（刷新库 + 逐文档查 svg 存在性），不修任何东西 */
    this.setting.addItem({
      title: t("白板体检"),
      description: t("检查存档文档绑定的工程文件是否还存在（断链）。白板文件本身即白板，未建档是正常状态，不用处理。"),
      createActionElement: () => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "b3-button b3-button--outline fn__flex-center";
        btn.textContent = t("开始体检");
        btn.addEventListener("click", () => void this.runCheckup());
        return btn;
      },
    });
  }

  private async loadState(): Promise<void> {
    const raw = await this.loadData(STORAGE_KEY);
    const obj = (raw && typeof raw === "object" ? raw : {}) as {
      settings?: unknown;
      recent?: unknown;
      boards?: unknown;
      dirMigrated?: unknown;
    };
    this.settings = normalizeSettings(obj.settings);
    this.recent = Array.isArray(obj.recent)
      ? obj.recent.filter((p): p is string => typeof p === "string" && p !== "")
      : [];
    this.dirMigrated = obj.dirMigrated === true;
    // 第二十四轮的登记表只在迁移时当候选读一次；第二十五轮起以目录为真源，不再落盘
    this.legacyBoards = Array.isArray(obj.boards)
      ? obj.boards.filter((p): p is string => typeof p === "string")
      : [];
  }

  /**
   * 记住网格状态（画布上每次真的翻转才会进来，onChange 的高频回调已在 StudioApp 侧收口）。
   * 同值直接返回——否则拖拽一帧就多一次 saveData。
   */
  private rememberGrid(enabled: boolean): void {
    if (this.settings.gridModeEnabled === enabled) return;
    this.settings = { ...this.settings, gridModeEnabled: enabled };
    this.persist();
  }

  /** 设置/最近文件的落盘；调用点多为 fire-and-forget，所以自己吞掉异常只留日志 */
  private persist(): void {
    this.saveData(STORAGE_KEY, {
      settings: this.settings,
      recent: this.recent,
      dirMigrated: this.dirMigrated,
    }).catch((e) => console.error("[excali-studio] 保存设置失败", e));
  }
}
