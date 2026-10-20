/**
 * 2026-10-17 第二十二轮：Excali 左 Dock 面板（纯白板库，原生形态复刻 kmind-zen）。
 *
 * 形态决策：用户拍板「复刻 KMind Zen 的样式」——面板全部用思源原生类搭，
 * 不自绘头部、不自排行样式，视觉与系统面板一致：
 *   ① 头部 = 原生 block__icons（block__logo 标题 + 数量 + block__icon 图标按钮），
 *      图标走全局精灵 <use xlink:href="#iconAdd">（与 kmind-zen 同款，不自带 SVG）；
 *   ② 列表 = 原生 b3-list--background + b3-list-item--narrow（通铺行）
 *      + b3-list-item--hide-action（行内动作悬停才显，原生行为）；
 *   ③ 搜索框按用户拍板整个删除（kmind-zen 也没有）：查询词状态与 board-lib 里的
 *      内存过滤函数一并退役，库里找人靠滚动或思源全局搜索。
 * 行内保留两个悬停动作（重命名 / 删除…）——复用右键菜单同一条宿主链路，
 * 只是入口从「右键」多一个按钮；右键菜单本身不动（建档/开文档/复制引用还在）。
 *
 * 通信：本文件只认 DockHost 窄接口（宿主 index.ts 实现），不直接碰页签/画布。
 * 面板零 siyuan import（board-lib 测试断言）——右键菜单、删除确认都在宿主建。
 * 刷新只由结构事件触发（开/关页签、保存、删除、重命名、建档、⟳）：没有每帧路径。
 */

import { t } from "../i18n";
import { boardTimeText } from "../studio/board-list";
import { boardDisplayName, BOARD_DRAG_MIME, fileLibViewKey, type BoardFileItem } from "../studio/board-lib";
import { toAssetRef } from "../studio/storage";

/** dock 文件库的视图数据；opened = 当前开着页签的 SVG（/data 路径）集合 */
export type BoardFileView = {
  files: BoardFileItem[];
  opened: Set<string>;
};

export type DockHost = {
  /** ＋新建：开一张空白板 */
  openNew: () => void;
  /** －删除：删当前活动画布对应的文件（宿主已做二次确认；没有活动画布时提示） */
  deleteActiveBoard: () => void;
  /** 2026-10-17 第十八轮：文件库视图（宿主给缓存的列表 + 实时打开态） */
  getBoardFiles: () => BoardFileView;
  /** ⟳：宿主重跑 SQL + readDir 后再 dockRefresh */
  refreshBoardLib: () => void;
  /** 单击列表项：开画板页签（已开则聚焦，宿主去重） */
  openBoardFile: (item: BoardFileItem) => void;
  /** 双击列表项：开绑定文档本体（未建档时无动作） */
  openDocOf: (docId: string) => void;
  /** 第二十二轮：行内「重命名」按钮——与右键菜单同一条宿主链路（弹命名框） */
  renameBoardFile: (item: BoardFileItem) => void;
  /** 第二十二轮：行内「删除…」按钮——与右键菜单同一条宿主链路（二次确认后删） */
  deleteBoardFile: (item: BoardFileItem) => void;
  /** 行右键：宿主用 siyuan Menu 弹「建档 / 打开文档 / 复制引用 / 重命名 / 删除」。
   *  面板零 siyuan import（board-lib 测试断言），菜单只能在宿主建 */
  openFileMenu: (item: BoardFileItem, x: number, y: number) => void;
  /** 当前有没有打开着的白板——头部删除按钮的置灰态；只随结构事件（开关页签）变 */
  hasActiveBoard: () => boolean;
  /** 宿主登记 refresh：库/打开态变化时调用，面板重渲染 */
  onRefresh: (refresh: () => void) => void;
};

const ESC: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
const esc = (s: string): string => s.replace(/[&<>"']/g, (c) => ESC[c]);

/** 建面板 DOM；返回 element + refresh（宿主在库/打开态变化时调用） */
export function createDockPanel(host: DockHost): { element: HTMLElement; refresh: () => void } {
  const element = document.createElement("div");
  element.className = "exs-dock";

  // 头部照 kmind-zen：block__logo（标题 + 数量）占满，右侧 ＋ / 删除 / ⟳ 三个原生图标按钮。
  // 图标一律内联字面量（不走辅助函数插值）——dock 契约测试按源码文本断言这些 id。
  // 按钮穿原生 block__icon--show（常显）+ ariaLabel（思源原生 tooltip 通道）。
  element.innerHTML = `
  <div class="block__icons exs-dock__head">
    <div class="block__logo fn__flex-1"><span class="fn__ellipsis">${t("白板库")}</span><span class="exs-dock__count" data-role="libcount"></span></div>
    <span class="fn__space"></span>
    <button class="block__icon block__icon--show ariaLabel" data-act="new" aria-label="${t("新建白板")}" data-position="north" title="${t("新建白板")}" type="button"><svg aria-hidden="true" focusable="false"><use xlink:href="#iconAdd"></use></svg></button>
    <button class="block__icon block__icon--show ariaLabel" data-act="delete-active" data-role="del-active" aria-label="${t("删除当前白板")}" data-position="north" title="${t("删除当前白板")}" type="button" disabled><svg aria-hidden="true" focusable="false"><use xlink:href="#iconTrashcan"></use></svg></button>
    <button class="block__icon block__icon--show ariaLabel" data-act="lib-refresh" aria-label="${t("刷新")}" data-position="north" title="${t("刷新")}" type="button"><svg aria-hidden="true" focusable="false"><use xlink:href="#iconRefresh"></use></svg></button>
  </div>
  <ul class="b3-list b3-list--background exs-dock__liblist" data-role="liblist"></ul>`;

  const libCountEl = element.querySelector<HTMLElement>('[data-role="libcount"]')!;
  const libListEl = element.querySelector<HTMLElement>('[data-role="liblist"]')!;
  const delActiveBtn = element.querySelector<HTMLButtonElement>('[data-role="del-active"]')!;

  /* ---------------- 白板库（面板主体） ---------------- */

  // 同值跳过：宿主 SQL/readDir 每次都会敲一遍 refresh，内容没变就不碰 DOM。
  let lastLibKey = "";
  let libFiles: BoardFileItem[] = [];

  const renderLib = (): void => {
    const view = host.getBoardFiles();
    const key = fileLibViewKey(view.files, view.opened);
    if (key === lastLibKey) return;
    lastLibKey = key;
    libFiles = view.files;
    libCountEl.textContent = view.files.length > 0 ? String(view.files.length) : "";
    if (view.files.length === 0) {
      libListEl.innerHTML = `<li class="exs-lib__hint">${t("还没有白板")}</li>`;
      return;
    }
    libListEl.innerHTML = view.files
      .map((f) => {
        const open = view.opened.has(f.dataPath);
        const bound = f.docId !== "";
        // meta 只放修改时间：单行排版里「时间 · 文件名」会把名字挤没（实测名字被压到
        // 一个字），文件名在行 tooltip（完整 /data 路径）与重命名框里都拿得到
        const meta = boardTimeText(f.updated);
        const badges =
          (open ? `<span class="exs-lib__badge">${t("已打开")}</span>` : "") +
          (bound ? `<span class="exs-lib__badge exs-lib__badge--doc">${t("已建档")}</span>` : "");
        return `<li class="b3-list-item b3-list-item--narrow b3-list-item--hide-action exs-lib__item${open ? " is-open" : ""}" data-file="${esc(f.dataPath)}" title="${esc(f.dataPath)}" draggable="true">
          <button class="b3-list-item__text exs-lib__text" type="button">${esc(boardDisplayName(f))}</button>${badges}
          <span class="fn__space"></span>
          <span class="exs-lib__meta">${esc(meta)}</span>
          <button class="b3-list-item__action b3-tooltips b3-tooltips__w" data-act="row-rename" title="${t("重命名")}" type="button"><svg aria-hidden="true"><use xlink:href="#iconEdit"></use></svg></button>
          <button class="b3-list-item__action b3-tooltips b3-tooltips__w exs-lib__act--danger" data-act="row-delete" title="${t("删除…")}" type="button"><svg aria-hidden="true"><use xlink:href="#iconTrashcan"></use></svg></button>
        </li>`;
      })
      .join("");
  };

  // 第二十二轮：只剩库区 + 头部删除按钮置灰态，两者都只随结构事件变，没有每帧路径
  const refresh = (): void => {
    renderLib();
    delActiveBtn.disabled = !host.hasActiveBoard();
  };

  /** 行内按钮 → 所在行的文件项（行数据在 libFiles 里按 /data 路径对齐） */
  const fileOfBtn = (btn: HTMLElement): BoardFileItem | undefined => {
    const row = btn.closest<HTMLElement>(".exs-lib__item");
    const file = row ? libFiles.find((f) => f.dataPath === row.dataset.file) : undefined;
    return file;
  };

  element.addEventListener("click", (e) => {
    const target = e.target as HTMLElement;
    // 先按钮后行：行内动作按钮嵌在行里，不先拦下来就会顺手把画板也开了
    const btn = target.closest<HTMLElement>("[data-act]");
    if (btn && !(btn as HTMLButtonElement).disabled) {
      switch (btn.dataset.act) {
        case "new":
          host.openNew();
          return;
        case "delete-active":
          host.deleteActiveBoard();
          return;
        case "lib-refresh":
          host.refreshBoardLib();
          return;
        case "row-rename": {
          const file = fileOfBtn(btn);
          if (file) host.renameBoardFile(file);
          return;
        }
        case "row-delete": {
          const file = fileOfBtn(btn);
          if (file) host.deleteBoardFile(file);
          return;
        }
      }
    }
    const row = target.closest<HTMLElement>(".exs-lib__item");
    if (row) {
      const file = libFiles.find((f) => f.dataPath === row.dataset.file);
      if (file) host.openBoardFile(file);
    }
  });

  // 双击开绑定文档本体（未建档的行没有文档可开，无动作）。
  // 注意双击前会先落两次单击（开画板）——与第十七轮同款接受度。
  element.addEventListener("dblclick", (e) => {
    const row = (e.target as HTMLElement).closest<HTMLElement>(".exs-lib__item");
    if (!row) return;
    const docId = libFiles.find((f) => f.dataPath === row.dataset.file)?.docId;
    if (docId) host.openDocOf(docId);
  });

  /**
   * 第四十轮：行 = 白板拖拽源。写自己的 MIME（JSON：ref + 行上显示名），
   * 顺带写一份 text/plain 路径——拖去别处（正文、别的画布）落下的仍是可读路径，
   * 而且本插件的「粘/拖路径自动转卡片」认的就是同一条 ref，两种入口结果一致。
   */
  element.addEventListener("dragstart", (e) => {
    const row = (e.target as HTMLElement).closest<HTMLElement>(".exs-lib__item");
    if (!row) return;
    const file = libFiles.find((f) => f.dataPath === row.dataset.file);
    const dt = e.dataTransfer;
    if (!file || !dt) return;
    const ref = toAssetRef(file.dataPath);
    dt.effectAllowed = "copy";
    dt.setData("text/plain", ref);
    dt.setData(BOARD_DRAG_MIME, JSON.stringify({ ref, title: boardDisplayName(file) }));
  });

  // 行右键 → 宿主建 siyuan Menu；preventDefault 挡掉浏览器/dock 默认上下文菜单
  element.addEventListener("contextmenu", (e) => {
    const row = (e.target as HTMLElement).closest<HTMLElement>(".exs-lib__item");
    if (!row) return;
    const file = libFiles.find((f) => f.dataPath === row.dataset.file);
    if (!file) return;
    e.preventDefault();
    host.openFileMenu(file, e.clientX, e.clientY);
  });

  host.onRefresh(refresh);
  refresh();
  return { element, refresh };
}
