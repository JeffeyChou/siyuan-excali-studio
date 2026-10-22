/**
 * 移动端画板壳（iPad / 手机）。
 *
 * 思源移动端前端没有自定义页签：Plugin.addTab 是空实现，window.siyuan.openTab
 * 也是空函数。桌面那条「注册页签模型 → openTab(custom)」在 iPad 上会静默什么都不做，
 * 表现就是白板文件已经建好、画板永远不出现。
 *
 * 这里用宿主自己的全屏浮层承载同一套 StudioApp：仍然复用 tab.tsx 的
 * attachStudioTab（引擎 chunk 里），只把 Custom/Tab 换成最小可用替身——
 * element = 浮层内容区、tab.headElement = 浮层标题栏、tab.close = 拆浮层。
 * 这样关闭冲刷、脏点、重命名跟标题、动作注册等既有链路一条不用改。
 *
 * 本模块必须留在宿主 bundle：不能 import tab.tsx 的运行时（会提前拉进 8MB 引擎）。
 */

import type { Custom, Tab } from "siyuan";
import { t } from "../i18n";
import { fileNameOf } from "./storage";
import type { StudioTabSession } from "./tab";

/** 移动端前端（含 iPad 应用 / 移动浏览器）；桌面浏览器与 Electron 都返回 false */
export function isMobileFrontend(): boolean {
  const host = (window as unknown as { siyuan?: { mobile?: unknown } }).siyuan;
  return !!host?.mobile;
}

export type MobileStudioShell = {
  custom: Custom;
  /** 浮层内容区；引擎装载前可清掉占位 */
  body: HTMLElement;
  mount: (session: StudioTabSession) => void;
  showError: (message: string) => void;
  close: () => void;
  isClosed: () => boolean;
};

export type MobileStudioData = { dataPath: string | null; docId?: string };

/**
 * 建一个全屏浮层并返回可交给 attachStudioTab 的替身。
 * 同时只显示一块白板：打开第二块时把前一块 display:none，切回时再显示。
 */
export function createMobileStudioShell(opts: {
  data: MobileStudioData;
  onDispose: () => void;
}): MobileStudioShell {
  const shellEl = document.createElement("div");
  shellEl.className = "exs-mobile-shell";

  const header = document.createElement("div");
  header.className = "exs-mobile-header";
  const titleEl = document.createElement("div");
  titleEl.className = "exs-mobile-title";
  titleEl.textContent = opts.data.dataPath ? fileNameOf(opts.data.dataPath) : t("未命名白板");
  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  // tab.tsx 的捕获监听同时识别 .item__close 与 .exs-mobile-close
  closeBtn.className = "exs-mobile-close";
  closeBtn.setAttribute("aria-label", t("关闭"));
  closeBtn.textContent = "✕";
  header.append(titleEl, closeBtn);

  const bodyEl = document.createElement("div");
  bodyEl.className = "exs-mobile-body exs-panel";
  const loading = document.createElement("div");
  loading.className = "exs-loading";
  loading.textContent = t("正在打开白板…");
  bodyEl.appendChild(loading);

  shellEl.append(header, bodyEl);
  document.body.appendChild(shellEl);
  document.body.classList.add("exs-mobile-open");

  const show = (): void => {
    document.querySelectorAll<HTMLElement>(".exs-mobile-shell").forEach((el) => {
      if (el !== shellEl) el.style.display = "none";
    });
    shellEl.style.display = "flex";
  };
  show();

  let session: StudioTabSession | null = null;
  let closed = false;

  const close = (): void => {
    if (closed) return;
    closed = true;
    try {
      session?.dispose();
    } finally {
      session = null;
      shellEl.remove();
      if (!document.querySelector(".exs-mobile-shell")) document.body.classList.remove("exs-mobile-open");
      opts.onDispose();
    }
  };

  const tab = {
    headElement: header,
    updateTitle: (next: string) => {
      titleEl.textContent = next;
    },
    close,
    // 去重命中时走这里：把这块浮层重新提到最前
    parent: { switchTab: () => show() },
  } as unknown as Tab;

  const custom = {
    element: bodyEl,
    data: opts.data,
    tab,
  } as unknown as Custom;

  // 引擎还在装载（session 尚不存在）时，tab.tsx 的捕获监听还没挂上；
  // 这里兜底保证 ✕ 随时能关。装载完成后捕获监听会先截走点击，不会重复走到这。
  closeBtn.addEventListener("click", (event) => {
    if (session) return;
    event.preventDefault();
    event.stopPropagation();
    close();
  });

  return {
    custom,
    body: bodyEl,
    mount: (next) => {
      session = next;
    },
    showError: (message) => {
      bodyEl.replaceChildren();
      const box = document.createElement("div");
      box.className = "exs-loaderror";
      const text = document.createElement("div");
      text.textContent = message;
      box.appendChild(text);
      bodyEl.appendChild(box);
    },
    close,
    isClosed: () => closed,
  };
}
