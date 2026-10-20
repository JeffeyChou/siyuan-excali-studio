/**
 * 快捷键文案。Excalidraw 的菜单项与引导画面只吃字符串、不做平台换算，所以自己拼。
 *
 * 两套写法是刻意的：☰ 菜单里跟 vendor 自己的内置项对齐（截图里就是 `Cmd+O`、
 * `Cmd+Shift+E`），用 `Cmd+…`；引导画面的快捷键列只有 3rem 宽，装不下
 * `Cmd+Alt+E`，所以那里用符号 `⌘⌥E`。
 */

function isApple(ua?: string): boolean {
  const s = ua ?? (typeof navigator === "undefined" ? "" : navigator.userAgent);
  return /Mac|iPhone|iPad|iPod/.test(s);
}

export type Modifier = "cmd" | "shift" | "alt";

/** ☰ 菜单项右侧的快捷键栏：`menuShortcut(["cmd","shift"], "E")` → `Cmd+Shift+E` */
export function menuShortcut(mods: Modifier[], key: string, ua?: string): string {
  const names = isApple(ua)
    ? { cmd: "Cmd", shift: "Shift", alt: "Opt" }
    : { cmd: "Ctrl", shift: "Shift", alt: "Alt" };
  const ordered: Modifier[] = ["cmd", "shift", "alt"];
  return [...ordered.filter((m) => mods.includes(m)).map((m) => names[m]), key.toUpperCase()].join("+");
}

/**
 * 「新建白板」在引导画面里显示的快捷键（注册的是思源的 ⌘⌥E，Windows 自动是 Ctrl+Alt+E）。
 */
export function boardHotkey(ua?: string): string {
  return isApple(ua) ? "⌘⌥E" : "Ctrl+Alt+E";
}
