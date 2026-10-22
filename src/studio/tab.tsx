  /**
   * 页签内容三段生命周期：loading 占位 → host.load 读盘解码 → StudioApp
   * （读不回来就地显示错误，不开第二层弹窗）。关闭走思源自己的 ✕：
   * ✕ 的监听是挂在 .item__close 上的**冒泡**监听，我们在 headElement 捕获阶段
   * 先收事件。第十二轮起关闭策略收敛成一条：
   * - 没改动 → 直接关；
   * - 有改动 → 先经画板侧 flush 落盘（成功静默关，失败才弹确认）。
   * 第二十一轮：防抖自动保存成为唯一保存形态后，关闭不再有「自动保存开/关」分支——
   * 一律先冲刷再关。右键菜单「关闭」与 ⌘W 没有插件钩子、拦不到确认，但 dispose
   * 会在拆 React 树前兜底 flush 一次——最坏不再丢已有文件的白板。
   */

import { createRoot } from "react-dom/client";
import { confirm, showMessage, type Custom, type Tab } from "siyuan";
import { t } from "../i18n";
import { SceneError, type LoadedScene } from "./scene";
import { StudioApp, type StudioProps } from "./StudioApp";
import { fileNameOf, toDataPath } from "./storage";
import type { BoardActions } from "./board-actions";
import { STUDIO_TAB_TYPE, type StudioTabData } from "./tab-type";

export { STUDIO_TAB_TYPE };
export type { StudioTabData };

/** 宿主通道（index.ts 提供）；accent/showWelcome 用 getter 读，设置改了跟着变 */
export type StudioTabHost = Pick<
  StudioProps,
  | "accent"
  | "showWelcome"
  | "onOpenExisting"
  | "onNewBoard"
  | "promptFileName"
  | "onRename"
  | "loadLibraryItems"
  | "saveLibraryItems"
  | "onRunScript"
  | "listPinnedScripts"
  | "onRunScriptFile"
  | "onPinScript"
  | "listPinnedActions"
  | "onPinAction"
  | "scriptRailCollapsed"
  | "scriptRailTop"
  | "onScriptRailCollapsedChange"
  | "onScriptRailTopChange"
  | "highlighter"
  | "onHighlighterChange"
  | "onHelp"
  | "getAiChannels"
  | "onAiChannel"
  | "getPresentationSettings"
  | "onPresentationSetting"
  | "getLibraryImportUrl"
  | "libDirAbs"
  | "gridModeEnabled"
  | "onGridChange"
  | "boardDir"
  | "pickBoardPath"
> & {
  /** 2026-10-16 批4A：☰「复制此白板的引用」——不带 custom 的 Pick 形态拿不到页签标识，
   *  放进 & 区由 tab.tsx 渲染时闭包补上 custom（与 onBoardActive 同款） */
  copyBoardRef: (custom: Custom) => void;
  /** 2026-10-17 第十九轮：解码失败时从备份链取第一份可用档盖回原文件；true = 已恢复。
   *  页签侧恢复成功后重走一遍读盘渲染 */
  restoreFromBackup: (dataPath: string) => Promise<boolean>;
  /** 落盘通道（第二十一轮：只覆盖已有文件——新建走宿主 createBoardFile，路径开页签时就带好） */
  onSave: (svgText: string, currentPath: string | null) => Promise<{ path: string }>;
  /** 第二十六轮 T1：图片外置通道（dataURL → assets/excali-media 引用路径） */
  saveMedia: (dataURL: string, mime: string) => Promise<string>;
  /** 第二十六轮 T6：画布元素 `siyuan:doc/<id>` 链接点击 → 宿主开文档 */
  openDocLink: (link: string) => void;
  /** 读盘并解码；null 表示新建（不进读盘流程） */
  load: (dataPath: string | null) => Promise<LoadedScene | null>;
  /** 第二十五轮：读盘失败后按文件名到保存目录找迁移后的新路径；null = 没得换 */
  remapPath: (dataPath: string) => Promise<string | null>;
  /** 2026-10-16 S2：画布注册/注销动作窄接口（custom 标识是哪个页签） */
  onBoardActions: (custom: Custom, actions: BoardActions | null) => void;
  /** 2026-10-16 S2：画布成为当前活动（注册 + 每次 onChange） */
  onBoardActive: (custom: Custom) => void;
};

export type StudioTabSession = {
  tab: Tab;
  data: StudioTabData;
  /** 关闭策略见文件头注释；index.ts 的卸载清理也走这里 */
  requestClose: () => void;
  /** 2026-10-17 第十八轮：删除白板用——不等冲刷直接关（文件紧接着就删，落了盘也会再被删） */
  closeForDelete: () => void;
  /** 拆 React 树与监听（由思源的 destroy 钩子调用，幂等） */
  dispose: () => void;
};

/** 还原 custom.data（含 layout.json 恢复进来的），容忍脏值 */
export function parseTabData(raw: unknown): StudioTabData {
  const p = raw && typeof raw === "object" ? (raw as { dataPath?: unknown }).dataPath : null;
  const d = raw && typeof raw === "object" ? (raw as { docId?: unknown }).docId : undefined;
  return {
    dataPath: typeof p === "string" && p !== "" ? toDataPath(p) : null,
    docId: typeof d === "string" && d !== "" ? d : undefined,
  };
}

/** SceneError 的 reason → 可读提示；其他异常原样透传 */
export function describeSceneError(e: unknown): string {
  if (e instanceof SceneError) {
    switch (e.reason) {
      case "no-payload":
        return t("这个 SVG 里没有可编辑的白板数据（不是本插件或 Excalidraw 导出的）");
      case "wrong-type":
        return t("这个 SVG 里内嵌的不是 Excalidraw 场景");
      case "unsupported-encoding":
      case "unsupported-version":
        return t("这个白板用了暂不支持的格式：{detail}", { detail: e.detail || e.reason });
      default:
        return t("白板数据已损坏：{detail}", { detail: e.detail || e.reason });
    }
  }
  return t("打开失败：{msg}", { msg: e instanceof Error ? e.message : String(e) });
}

/** 把画板挂进这个页签；思源 destroy 钩子里记得调 session.dispose() */
export function attachStudioTab(custom: Custom, host: StudioTabHost): StudioTabSession {
  const element = custom.element as HTMLElement;
  const tab = custom.tab;
  element.classList.add("exs-panel");

  const data = parseTabData(custom.data);
  // 归一后写回：layout.json 存的就是这个对象（customModelData），
  // 首次保存拿到路径后原地补 dataPath，重启恢复就能直接定位文件
  custom.data = data;

  const root = createRoot(element);
  let dirty = false;
  let disposed = false;
  /** flush 期间再点 ✕/⌘W 不重入（一次关闭只走一条路） */
  let closing = false;
  /** 用户在确认框里选了「丢弃」：dispose 不再兜底 flush，否则等于偷偷又保存了 */
  let skipDisposeFlush = false;
  /** 画板注册的动作窄接口（holder 对象绕开 TS 对闭包内赋值变量的 null 收窄） */
  const actionsRef = { current: null as BoardActions | null };

  /** 兜底出口：自动保存不可用或冲刷失败时，弹确认（确认 = 丢弃并关闭） */
  const askDiscard = (): void => {
    confirm(t("关闭白板"), t("有未保存的改动，关闭后无法恢复。确定关闭？"), () => {
      skipDisposeFlush = true;
      tab.close();
    });
  };

  const requestClose = (): void => {
    if (disposed || closing) return;
    if (!dirty) {
      tab.close();
      return;
    }
    const actions = actionsRef.current;
    if (actions) {
      // 有改动先冲刷落盘，成功静默关——关页签不再等于丢改动（防抖的最后一毫秒也在这带走）
      closing = true;
      void actions.flush().then((saved) => {
        if (saved) {
          tab.close();
          return;
        }
        closing = false;
        askDiscard();
      });
      return;
    }
    askDiscard();
  };

  // 删除白板专用：宿主已在确认框里告知「未保存改动一并丢弃」，这里不再问、
  // 也不再冲刷（flush 会把场景写回即将被删的文件，制造竞态）。
  const closeForDelete = (): void => {
    if (disposed || closing) return;
    skipDisposeFlush = true;
    closing = true;
    tab.close();
  };

  // ✕ 的处理是 .item__close 上的冒泡监听；在 headElement 捕获阶段先收，
  // preventDefault + stopPropagation 后事件到不了目标，只有我们放行才真关
  const onHeadClick = (event: MouseEvent): void => {
    if (!(event.target instanceof Element) || !event.target.closest(".item__close, .exs-mobile-close")) return;
    event.preventDefault();
    event.stopPropagation();
    requestClose();
  };
  tab.headElement.addEventListener("click", onHeadClick, true);

  /**
   * 第十九轮：解码失败不再是死路。错误页给「从备份恢复」，宿主把备份链里
   * 第一份可用档盖回原文件，然后重走一遍读盘+渲染——坏板自救不用关页签重开。
   */
  let restoring = false;
  const renderLoadError = (e: unknown): void => {
    root.render(
      <div className="exs-loaderror">
        <div>
          <div>{describeSceneError(e)}</div>
          {data.dataPath ? (
            <div className="exs-loaderror__act">
              <button className="exs-export-btn" onClick={() => void tryRestore()}>
                {t("从备份恢复")}
              </button>
            </div>
          ) : null}
        </div>
      </div>,
    );
  };
  const tryRestore = async (): Promise<void> => {
    if (!data.dataPath || restoring) return;
    restoring = true;
    try {
      const ok = await host.restoreFromBackup(data.dataPath);
      if (disposed) return;
      if (!ok) {
        showMessage(t("没有找到可用的备份"), 5000, "error");
        return;
      }
      showMessage(t("已从备份恢复"));
      await open();
    } finally {
      restoring = false;
    }
  };
  const open = async (): Promise<void> => {
    root.render(<div className="exs-loading">{t("正在打开白板…")}</div>);
    let initial: LoadedScene | null = null;
    if (data.dataPath) {
      try {
        initial = await host.load(data.dataPath);
      } catch (e) {
        // 第二十五轮：白板被迁进专属目录后，layout 恢复的旧路径会读不到；
        // 换到保存目录里的同名文件再试一次，并把页签数据跟位——否则下一次
        // 覆盖保存会把文件写回旧路径，迁移等于白做。
        const remapped = await host.remapPath(data.dataPath);
        if (!remapped) {
          if (!disposed) renderLoadError(e);
          return;
        }
        data.dataPath = remapped;
        tab.updateTitle(fileNameOf(remapped));
        try {
          initial = await host.load(remapped);
        } catch (e2) {
          if (!disposed) renderLoadError(e2);
          return;
        }
      }
    }
    if (disposed) return;
    root.render(
      <StudioApp
        initial={initial}
        initialPath={data.dataPath}
        accent={host.accent}
        onSave={async (svgText, currentPath) => {
          const result = await host.onSave(svgText, currentPath);
          // 覆盖保存路径不变；data.dataPath 在创建时已写好（文件先行），这里原地确认
          data.dataPath = result.path;
          tab.updateTitle(fileNameOf(result.path));
          return result.path;
        }}
        saveMedia={host.saveMedia}
        onOpenDocLink={host.openDocLink}
        onRename={async (oldPath, newName) => {
          const saved = await host.onRename(oldPath, newName);
          // 重命名后路径换了：data / 标题 / 最近列表都要跟上
          data.dataPath = saved;
          tab.updateTitle(fileNameOf(saved));
          return saved;
        }}
        promptFileName={host.promptFileName}
        gridModeEnabled={host.gridModeEnabled}
        onGridChange={host.onGridChange}
        loadLibraryItems={host.loadLibraryItems}
        saveLibraryItems={host.saveLibraryItems}
        onRunScript={host.onRunScript}
        listPinnedScripts={host.listPinnedScripts}
        onRunScriptFile={host.onRunScriptFile}
        onPinScript={host.onPinScript}
        listPinnedActions={host.listPinnedActions}
        onPinAction={host.onPinAction}
        scriptRailCollapsed={host.scriptRailCollapsed}
        scriptRailTop={host.scriptRailTop}
        onScriptRailCollapsedChange={host.onScriptRailCollapsedChange}
        onScriptRailTopChange={host.onScriptRailTopChange}
        highlighter={host.highlighter}
        onHighlighterChange={host.onHighlighterChange}
        onHelp={host.onHelp}
        getAiChannels={host.getAiChannels}
        onAiChannel={host.onAiChannel}
        getPresentationSettings={host.getPresentationSettings}
        onPresentationSetting={host.onPresentationSetting}
        getLibraryImportUrl={host.getLibraryImportUrl}
        libDirAbs={host.libDirAbs}
        boardDir={host.boardDir}
        pickBoardPath={host.pickBoardPath}
        onCopyBoardRef={() => host.copyBoardRef(custom)}
        registerActions={(actions) => {
          // 留一份给自己：关页签的 flush 决策要用（宿主那份是 dock 路由用的）
          actionsRef.current = actions;
          host.onBoardActions(custom, actions);
        }}
        onBoardActive={() => host.onBoardActive(custom)}
        showWelcome={host.showWelcome}
        onOpenExisting={host.onOpenExisting}
        onNewBoard={host.onNewBoard}
        onDirtyChange={(value) => {
          if (value === dirty) return;
          dirty = value;
          // 页签图标上的脏点：挂 .item 上（自定义页签图标是 SVG，吃不了伪元素）
          tab.headElement.classList.toggle("exs-tab-dirty", value);
        }}
        notify={showMessage}
      />,
    );
  };
  void open();

  return {
    tab,
    data,
    requestClose,
    closeForDelete,
    dispose: () => {
      if (disposed) return;
      disposed = true;
      tab.headElement.removeEventListener("click", onHeadClick, true);
      tab.headElement.classList.remove("exs-tab-dirty");
      // 关闭兜底：⌘W / 右键「关闭」拦不到确认，但这里赶在拆 React 树前冲刷一次
      // （flush 同步取到场景快照，落盘异步进行，不用等它；确认过「丢弃」的跳过）
      if (!skipDisposeFlush) void actionsRef.current?.flush();
      root.unmount();
    },
  };
}
