/**
 * 跟随思源明暗主题。
 *
 * 思源换主题的可观测钩子在不同版本里不止一个（与 siyuan-plugin-reader 的
 * src/ui/theme-bridge.ts 同一结论）：
 * - <html data-theme-mode="light|dark">   ← 主钩子，思源自己的样式也用它
 * - <html> / <body> 上增删 theme--dark 类  ← 部分版本走这条
 * 三个都盯，任一变化即重新判定，避免「重载后画板停在浅色」。
 */

export type ThemeMode = "light" | "dark";

export function readSiyuanThemeMode(): ThemeMode {
  const html = document.documentElement;
  const mode = html.getAttribute("data-theme-mode");
  if (mode === "dark" || mode === "light") return mode;
  const cls = `${html.className} ${document.body ? document.body.className : ""}`;
  if (/\btheme--dark\b/.test(cls)) return "dark";
  return "light";
}

/** 订阅明暗变化，返回取消订阅函数。订阅时立即以当前值回调一次。 */
export function watchSiyuanThemeMode(cb: (mode: ThemeMode) => void): () => void {
  let last = readSiyuanThemeMode();
  cb(last);
  const notify = () => {
    const next = readSiyuanThemeMode();
    if (next === last) return;
    last = next;
    cb(next);
  };
  const observer = new MutationObserver(notify);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme-mode", "class"],
  });
  const observeBody = () => {
    if (document.body) observer.observe(document.body, { attributes: true, attributeFilter: ["class"] });
  };
  observeBody();
  if (!document.body) document.addEventListener("DOMContentLoaded", observeBody, { once: true });
  return () => observer.disconnect();
}

/**
 * 思源当前主题下画布「默认」背景的具体色值，与 vendor CSS 的 --default-bg-color 同口径
 * （light #ffffff / dark #121212）。空串 viewBackgroundColor 在屏幕上有 CSS 兜底，
 * 但导出物没有 CSS 可依——补底、位图材料化都要用它。
 */
export function themeDefaultCanvasColor(): string {
  return readSiyuanThemeMode() === "dark" ? "#121212" : "#ffffff";
}

/**
 * 读思源当前强调色（--b3-theme-primary）。拿不到或不认识的格式返回 null ——
 * 这个值会直接塞给 Excalidraw 的 currentItemStrokeColor，
 * 塞进 var(...) 之类的非具体色值会让画笔颜色变透明。
 */
export function readSiyuanAccent(): string | null {
  let raw = "";
  try {
    raw = getComputedStyle(document.documentElement).getPropertyValue("--b3-theme-primary").trim();
  } catch {
    return null;
  }
  if (!raw) return null;
  return /^(#[0-9a-f]{3,8}|rgba?\(|hsla?\()/i.test(raw) ? raw : null;
}

/* ---------------- 第二十六轮 T4：双主题背景槽位 ---------------- */

/** 载荷里两个主题各自的画布背景槽位键（persistableAppState 的白名单同步维护） */
export type ThemeBgSlots = { light: string; dark: string };

/**
 * 从（解码出的）appState 里读两个主题的背景槽位；没存过的槽位是空串 = 未设置
 * （打开时回落 viewBackgroundColor / 主题默认）。
 */
export function readThemeBgSlots(appState: Record<string, unknown> | undefined): ThemeBgSlots {
  const read = (key: string): string =>
    appState && typeof appState[key] === "string" ? (appState[key] as string) : "";
  return { light: read("excaliLightBg"), dark: read("excaliDarkBg") };
}

/** 当前主题下打开画布该用的背景：槽位有值用槽位，否则回落载荷里的 viewBackgroundColor */
export function themeBgForMode(
  slots: ThemeBgSlots,
  mode: ThemeMode,
  fallbackViewBackgroundColor: string | undefined,
): string {
  const slot = mode === "dark" ? slots.dark : slots.light;
  if (slot !== "") return slot;
  return typeof fallbackViewBackgroundColor === "string" ? fallbackViewBackgroundColor : "";
}

/**
 * 落盘前的 appState 补槽：把当前背景写进**当前主题**的槽位（另一主题的槽位
 * 原样保留——用户只在亮色设过 A 的话，切到暗色不会被亮色值覆盖成 A）。
 * 空背景（跟随主题默认）也照存：槽位为空串 = 「这个主题用默认」，persistableAppState
 * 会把空串槽位剥掉，双方口径一致。
 */
export function withThemeBgSlot(
  appState: Record<string, unknown>,
  mode: ThemeMode,
): Record<string, unknown> {
  const bg = typeof appState.viewBackgroundColor === "string" ? appState.viewBackgroundColor : "";
  return mode === "dark"
    ? { ...appState, excaliDarkBg: bg }
    : { ...appState, excaliLightBg: bg };
}
