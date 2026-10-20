/**
 * 「打开白板…」选择器（第十三轮）：搜索文件名 + 修改时间 + 已打开标记。
 *
 * 与选文档框（doc-picker.ts）的异同：
 *   ① 列表由调用方一次性查好传进来，过滤是纯内存的，没有「慢响应后到覆盖新结果」
 *      的问题，所以不需要 seq；但 IME 组字期仍要守卫（拼音串会闪出一屏
 *      「没有匹配的白板」），组字结束 + 120ms 防抖再渲染，与选文档框同一手感；
 *   ② 数据源 readDir 自带 updated（见 storage.listBoardEntries），时间列不用读文件；
 *   ③ 「已打开」只负责打标：openPaths 是调用方当前页签会话的路径集合；
 *      点了已开的项，调用方走 openExisting 的去重逻辑直接聚焦，不重复开页签。
 */

import { Dialog } from "siyuan";
import { t } from "../i18n";
import { toDataPath, fileNameOf, type BoardFileEntry } from "../studio/storage";
import { boardTimeText, filterBoardEntries } from "../studio/board-list";

const ESC: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ESC[c]);
}

/**
 * 弹框选白板文件；返回相对工作空间的路径（assets/x.svg 形式，调用方直接
 * openExisting），取消 / 关闭 / Esc / 点遮罩都回 null。
 */
export function pickBoardFile(entries: BoardFileEntry[], openPaths: ReadonlySet<string>): Promise<string | null> {
  return new Promise((resolve) => {
    let settled = false;
    let composing = false;
    let timer: number | undefined;
    let rows = entries;
    let focusIdx = -1;

    const finish = (value: string | null) => {
      if (settled) return;
      settled = true;
      if (timer !== undefined) window.clearTimeout(timer);
      dialog.destroy();
      resolve(value);
    };

    const dialog = new Dialog({
      title: t("打开白板…"),
      width: "520px",
      content: `<div class="exs-picker">
  <input class="b3-text-field fn__block exs-picker__search" placeholder="${t("搜索文件名…")}" />
  <div class="exs-picker__list b3-list b3-list--background"></div>
</div>`,
      destroyCallback: () => finish(null),
    });

    const input = dialog.element.querySelector<HTMLInputElement>(".exs-picker__search")!;
    const list = dialog.element.querySelector<HTMLElement>(".exs-picker__list")!;

    const render = () => {
      if (rows.length === 0) {
        list.innerHTML = `<div class="exs-picker__empty">${t("没有匹配的白板")}</div>`;
        return;
      }
      list.innerHTML = rows
        .map((r, i) => {
          const cls = `b3-list-item exs-picker__item${i === focusIdx ? " b3-list-item--focus" : ""}`;
          const badge = openPaths.has(toDataPath(r.path)) ? `<span class="exs-picker__badge">${t("已打开")}</span>` : "";
          const time = boardTimeText(r.updated);
          const meta = badge || time ? `<span class="b3-list-item__meta">${badge}${escapeHtml(time)}</span>` : "";
          return `<div class="${cls}" data-idx="${i}" title="${escapeHtml(r.path)}"><span class="b3-list-item__text">${escapeHtml(fileNameOf(r.path))}</span>${meta}</div>`;
        })
        .join("");
    };

    const choose = (idx: number) => {
      const row = rows[idx];
      if (!row) return;
      finish(row.path);
    };

    const moveFocus = (delta: number) => {
      if (rows.length === 0) return;
      focusIdx = focusIdx < 0 ? (delta > 0 ? 0 : rows.length - 1) : (focusIdx + delta + rows.length) % rows.length;
      render();
      list.querySelector<HTMLElement>(".b3-list-item--focus")?.scrollIntoView({ block: "nearest" });
    };

    const scheduleFilter = () => {
      if (timer !== undefined) window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        timer = undefined;
        rows = filterBoardEntries(entries, input.value);
        focusIdx = -1;
        render();
      }, 120);
    };

    input.addEventListener("compositionstart", () => {
      composing = true;
    });
    input.addEventListener("compositionend", () => {
      composing = false;
      scheduleFilter();
    });
    input.addEventListener("input", () => {
      if (!composing) scheduleFilter();
    });
    input.addEventListener("keydown", (event) => {
      if (event.isComposing || event.keyCode === 229) return;
      if (event.key === "ArrowDown") {
        event.preventDefault();
        moveFocus(1);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        moveFocus(-1);
      } else if (event.key === "Enter") {
        event.preventDefault();
        choose(focusIdx >= 0 ? focusIdx : 0);
      } else if (event.key === "Escape") {
        event.preventDefault();
        finish(null);
      }
    });

    list.addEventListener("click", (event) => {
      const item = (event.target as Element | null)?.closest<HTMLElement>(".exs-picker__item");
      if (!item) return;
      choose(Number(item.dataset.idx));
    });

    input.focus();
    render();
  });
}
