/**
 * 2026-10-19：把插件的三项素材库动作（导入 / 刷新 / 打开文件夹）注入 vendor
 * 素材库面板右上角的 ⋮ 下拉菜单（「打开 / 保存到… / 重置素材库」那个菜单）。
 *
 * 为什么是 DOM 注入：vendor 0.18.1 的 LibraryDropdownMenu 完全硬编码——菜单项
 * 写死在 LibraryMenuHeaderContent.tsx 的 renderLibraryMenu() 里，组件不收任何
 * 自定义项的 props/context（源码逐字核过）。用户要求素材库动作住进面板自己的
 * 菜单（☰ 主菜单不再保留），注入是唯一路径。
 *
 * 注入形态完全复用 vendor 菜单项的样式类（dropdown-menu-item /
 * dropdown-menu-item-base / __icon / __text，见 common.ts 的
 * getDropdownMenuItemClassName 与 DropdownMenuItemContent.tsx），视觉与内置项
 * 一致、图标吃 currentColor 跟主题。
 *
 * 生命周期：菜单 open 时 vendor 才渲染 `.dropdown-menu.library-menu`
 * （DropdownMenuContent 非 portal，就地渲染在面板 header），关闭即卸载——
 * MutationObserver 盯 body，出现且未注入就 prepend 一组分隔线 + 三个按钮；
 * 点击执行回调后向 document 派发 Escape（vendor 的 Content 在 document
 * keydown capture 里吃 Escape → onClickOutside → 收菜单，见
 * DropdownMenuContent.tsx 的 onKeyDown）。
 */

import { t } from "../i18n";
import { ICON_FOLDER_OPEN, ICON_IMPORT_LIBRARY, ICON_REFRESH } from "./menu-icons";

export type LibraryMenuActions = {
  onImport: () => void;
  onRefresh: () => void;
  onOpenFolder: () => void;
};

const MENU_SELECTOR = ".dropdown-menu.library-menu";
const INJECTED_FLAG = "data-exs-injected";

function iconSvg(d: string): string {
  return (
    `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"` +
    ` stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">` +
    `<path d="${d}"></path></svg>`
  );
}

function menuItem(label: string, iconD: string, onClick: () => void): HTMLButtonElement {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "dropdown-menu-item dropdown-menu-item-base";
  btn.innerHTML =
    `<div class="dropdown-menu-item__icon">${iconSvg(iconD)}</div>` +
    `<div class="dropdown-menu-item__text"></div>`;
  btn.querySelector(".dropdown-menu-item__text")!.textContent = label;
  btn.addEventListener("click", () => {
    onClick();
    // vendor 的 Item 靠 React context 关菜单，DOM 注入项走同款效果：
    // 派发 Escape 让 Content 的 onKeyDown → onClickOutside → 收菜单
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  });
  return btn;
}

function separator(): HTMLElement {
  // vendor MenuSeparator 的同款内联样式（DropdownMenuSeparator.tsx）
  const div = document.createElement("div");
  div.style.cssText = "height:1px;background-color:var(--default-border-color);margin:.5rem 0";
  return div;
}

/**
 * 菜单出现时注入三项（分隔线 + 导入/刷新/打开文件夹，prepend 在内置项之前）。
 * actions 用 getter 取——每帧拿最新闭包（设置里的保存目录变了也跟手），observer
 * 不用重挂。返回断开函数（组件卸载时调）。
 */
export function startLibraryMenuInjection(getActions: () => LibraryMenuActions): () => void {
  const inject = (): void => {
    const content = document.querySelector<HTMLElement>(MENU_SELECTOR);
    if (!content || content.getAttribute(INJECTED_FLAG) === "1") return;
    content.setAttribute(INJECTED_FLAG, "1");
    const a = getActions();
    const frag = document.createDocumentFragment();
    frag.append(separator());
    frag.append(
      menuItem(t("导入素材库…"), ICON_IMPORT_LIBRARY, a.onImport),
      menuItem(t("刷新素材库"), ICON_REFRESH, a.onRefresh),
      menuItem(t("打开素材库文件夹"), ICON_FOLDER_OPEN, a.onOpenFolder),
    );
    content.prepend(frag);
  };
  const obs = new MutationObserver(() => {
    // React 高频渲染时回调很多：只做一次 selector 查询，没有新菜单就立刻返回
    if (document.querySelector(`${MENU_SELECTOR}:not([${INJECTED_FLAG}])`)) inject();
  });
  obs.observe(document.body, { childList: true, subtree: true });
  return () => obs.disconnect();
}
