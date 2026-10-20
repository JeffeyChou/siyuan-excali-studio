/**
 * 自定义图标
 * ------------------------------------------------------------------
 * 图标的真正来源是 addIcons() 注册的 <symbol>（思源把插件 SVG 合并进全局 <svg> 精灵），
 * 顶栏 icon / 页签 icon / 斜杠命令 <use xlink:href="#..."> 都引用这里的 id。
 * 漏注册会让思源抛 "Icon must be svg id or svg tag"。
 *
 * 视觉口径与同仓库 siyuan-plugin-reader 的 iconREReader 一致：
 * viewBox 0 0 1024 1024、线性单色（stroke=currentColor、fill=none）、stroke-width 56
 * （顶栏 16px 档约 0.88px 描边，与阅读器图标同权重）。
 */

export const STUDIO_ICON_ID = "iconExcaliStudio";

/** 画板 + 手绘曲线：一块白板，上面有一笔随性的线 */
export const STUDIO_ICON_SVG =
  `<symbol id="${STUDIO_ICON_ID}" viewBox="0 0 1024 1024">` +
  `<g fill="none" stroke="currentColor" stroke-width="56" stroke-linecap="round" stroke-linejoin="round">` +
  `<rect x="128" y="168" width="768" height="588" rx="56"/>` +
  `<path d="M272 616c72-152 148 92 224-56 44-88 96-36 152-72"/>` +
  `</g>` +
  `</symbol>`;

/**
 * 斜杠命令列表项的 html —— 结构必须照抄思源内置项，否则菜单里显示成空白行：
 * `<div class="b3-list-item__first"><svg class="b3-list-item__graphic"><use xlink:href="#图标"></use></svg><span class="b3-list-item__text">标题</span></div>`
 * （从 SiYuan 3.8.7 前端包 common.*.js 里的内置 slash 项逐字比对得到）
 */
export function slashItemHtml(text: string): string {
  return (
    `<div class="b3-list-item__first">` +
    `<svg class="b3-list-item__graphic"><use xlink:href="#${STUDIO_ICON_ID}"></use></svg>` +
    `<span class="b3-list-item__text">${text}</span>` +
    `</div>`
  );
}
