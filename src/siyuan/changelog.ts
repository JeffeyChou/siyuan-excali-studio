/**
 * 第五十二轮：版本更新弹窗的纯逻辑（不碰思源 SDK，node 里能直接 import 跑单测）。
 *
 * 单一真源是插件根的 `CHANGELOG.md`——运行时读文件、按 `## v<当前版本>` 切出这一段，
 * 不在 src 里另存一份「本次更新」文案（两份文案迟早分叉，且每次发版都要改两处）。
 *
 * 版本号来自构建期注入（scripts/build.mjs 读 plugin.json 走 vite define），不读运行时
 * `this.version`：`siyuan.d.ts` 的 Plugin 类没有这个字段，取到 undefined 会每次都判定成
 * 「有新版本」，变成重启弹窗风暴。取不到就整条静默（unknown-version）。
 */

declare const __EXCALI_PLUGIN_VERSION__: string | undefined;

/** 当前插件版本（= plugin.json 的 version）；未注入时为空串 */
export const PLUGIN_VERSION: string =
  typeof __EXCALI_PLUGIN_VERSION__ === "string" ? __EXCALI_PLUGIN_VERSION__ : "";

/**
 * 「本机已经看过哪个版本」单独占一个槽，不塞进 excali-studio.json：
 * 那边 persist() 是整个对象覆写，多一个字段就要多改一处，漏一次就把版本记丢了。
 */
export const VERSION_SLOT = "excali-studio-version";

/** 该不该弹、要不要回写版本号——四种情形互斥，交给调用方按值分流 */
export type ChangelogAction = "unknown-version" | "first-install" | "up-to-date" | "show";

/**
 * 判定口径：
 * - unknown-version：版本号没注入（构建配置漏了 / 测试环境），什么都不做，也绝不回写；
 * - first-install：槽里没记录 = 首次安装（含从没有本功能的旧版升上来第一次记录），
 *   只静默记下版本号，不弹——用户装插件时不需要被弹窗迎接；
 * - up-to-date：记过的就是当前版本，不弹不回写（不浪费一次写盘）；
 * - show：记过的和当前不一样 = 升级了，弹一次并把新版本写回去。
 */
export function changelogDecision(stored: unknown, current: string): ChangelogAction {
  const cur = (current || "").trim();
  if (!cur) return "unknown-version";
  const seen = (typeof stored === "string" ? stored : "").trim();
  if (!seen) return "first-install";
  return seen === cur ? "up-to-date" : "show";
}

/** 更新日志在包内的位置（思源把 data/plugins/<name>/ 挂在 /data/ 下） */
export function changelogPath(pluginName: string): string {
  return `/data/plugins/${pluginName}/CHANGELOG.md`;
}

const ESC_MAP: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ESC_MAP[c]);
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * 读插件包里的文件。思源读不到文件时回的是 HTTP 200 + JSON 错误体，
 * 所以 content-type 与正文里的 "code":404 两道都要认，否则会把错误 JSON 当日志渲染出来。
 */
export async function fetchPluginFile(path: string): Promise<string> {
  const res = await fetch("/api/file/getFile", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path }),
  });
  if (!res.ok) throw new Error(`getFile HTTP ${res.status}`);
  const text = await res.text();
  if ((res.headers.get("content-type") || "").includes("application/json") || /"code"\s*:\s*404/.test(text)) {
    throw new Error(`getFile 读不到文件：${path}`);
  }
  return text;
}

/**
 * 切出 `## v<version>` 这一段的 markdown（含标题整行，标题里的日期是有用信息）。
 * 边界是下一个 `## `（两个井号）；`### ` 小节留在段内。段尾的分隔线 `---` 和空行剥掉。
 * 找不到该版本段回空串——发版忘了写日志时的正常形态，调用方静默。
 */
export function sliceVersionSection(markdown: string, version: string): string {
  const v = (version || "").trim();
  if (!v) return "";
  // `(?![0-9.])`：v0.2 不能把 v0.2.0 那行也认下来
  const head = new RegExp(`^##\\s+v?${escapeRe(v)}(?![0-9.])`, "m").exec(markdown);
  if (!head) return "";
  // tail 从标题行的下一行开头起算，所以段里含标题整行，而 ^##\s 只会命中真正的下一段
  const tailStart = (() => {
    const lineEnd = markdown.indexOf("\n", head.index);
    return lineEnd < 0 ? markdown.length : lineEnd + 1;
  })();
  const tail = markdown.slice(tailStart);
  const next = tail.search(/^##[ \t]/m);
  const bodyEnd = next < 0 ? markdown.length : tailStart + next;
  const body = markdown.slice(head.index, bodyEnd).replace(/\s+$/, "");
  return body.replace(/\n-{3,}$/, "").replace(/\s+$/, "");
}

/**
 * markdown → HTML。优先用思源自带的 Lute（和内置插件同一个渲染器，表格/代码块样式
 * 跟着 .b3-typography 走）；拿不到（移动端裁剪 / 加载顺序）就回落 <pre> 纯文本，
 * 转义后再塞，绝不把日志正文当 HTML 拼。
 */
export function renderChangelogHtml(section: string): string {
  const Lute = (globalThis as { Lute?: { New?: () => { Md2HTML?: (md: string) => string } } }).Lute;
  if (Lute?.New) {
    try {
      const html = Lute.New().Md2HTML?.(section);
      if (html) return html;
    } catch {
      // 渲染器抛错照样回落纯文本
    }
  }
  return `<pre class="exs-changelog__plain">${escapeHtml(section)}</pre>`;
}
