/**
 * 2026-10-19：桌面端桥——思源 Electron 主进程通道的薄封装。
 *
 * 宿主事实（拆 /Applications/SiYuan.app/Contents/Resources/app/electron/main.js 实证，
 * nodeIntegration:true + contextIsolation:false，插件 window.require("electron") 直用）：
 *  - `ipcRenderer.send("siyuan-cmd", {cmd:"openPath", filePath})` → shell.openPath（Finder 打开）
 *  - `ipcRenderer.invoke("siyuan-get", {cmd:"showOpenDialog", ...options})`
 *    → dialog.showOpenDialog(options)（options 平铺透传：defaultPath/properties/filters…；
 *      返回 {canceled, filePaths}）
 *
 * 浏览器端 / 移动端没有 window.require，这里全部安全降级（null / false），调用方回落。
 * 拆包同款先例：思源官方 UI（设置里 pandoc 路径的「在 Finder 中显示」）就走这两条通道。
 */

type ElectronIpc = {
  send(channel: string, data: unknown): void;
  invoke(channel: string, data: unknown): Promise<unknown>;
};

/** POSIX 风格拼路径：过滤空段、压平重复斜杠、保尾段。测试喂怪值用的纯函数。 */
export function joinPosix(...parts: string[]): string {
  const joined = parts
    .map((p) => String(p ?? "").trim())
    .filter((p) => p !== "")
    .join("/")
    .replace(/\/{2,}/g, "/");
  return joined;
}

/**
 * 工作区 /data 目录的绝对路径。思源前端 `window.siyuan.config.system.dataDir`
 * 的值就是内核的 DataDir（= <工作区>/data），素材库的相对路径（如
 * assets/excali/excali-libraries）直接拼在它后面即绝对路径。
 * 拿不到（非思源宿主/异常）返回空串。
 */
export function workspaceDataDir(): string {
  try {
    const host = window as unknown as {
      siyuan?: { config?: { system?: { dataDir?: unknown } } };
    };
    const d = host.siyuan?.config?.system?.dataDir;
    return typeof d === "string" ? d.trim() : "";
  } catch {
    return "";
  }
}

function desktopIpc(): ElectronIpc | null {
  try {
    const req = (window as unknown as { require?: (m: string) => unknown }).require;
    if (typeof req !== "function") return null;
    const electron = req("electron") as { ipcRenderer?: ElectronIpc } | undefined;
    const ipc = electron?.ipcRenderer;
    if (ipc && typeof ipc.send === "function" && typeof ipc.invoke === "function") return ipc;
    return null;
  } catch {
    return null;
  }
}

/**
 * 在系统文件管理器中打开文件夹（macOS Finder / Windows 资源管理器）。
 * 返回 false = 非桌面端或路径为空（调用方负责提示）。
 */
export function openPathInFileManager(absDir: string): boolean {
  const p = String(absDir ?? "").trim();
  const ipc = desktopIpc();
  if (p === "" || !ipc) return false;
  ipc.send("siyuan-cmd", { cmd: "openPath", filePath: p });
  return true;
}

export type PickedLibraryFile = { path: string; blob: Blob };

export type PickLibraryResult =
  | { kind: "unavailable" }
  | { kind: "canceled" }
  | { kind: "picked"; file: PickedLibraryFile }
  | { kind: "read-error"; path: string };

/** showOpenDialog 的 options（独立导出便于契约测试断言形态）。 */
export function buildOpenDialogOptions(defaultDir: string): Record<string, unknown> {
  return {
    defaultPath: String(defaultDir ?? "").trim() || undefined,
    properties: ["openFile"],
    filters: [{ name: "Excalidraw Library", extensions: ["excalidrawlib"] }],
  };
}

function readFilePaths(raw: unknown): string[] {
  if (!raw || typeof raw !== "object") return [];
  const o = raw as { canceled?: unknown; filePaths?: unknown };
  if (o.canceled === true) return [];
  if (!Array.isArray(o.filePaths)) return [];
  return o.filePaths.filter((p): p is string => typeof p === "string" && p !== "");
}

function readLocalTextFile(absPath: string): string | null {
  try {
    const req = (window as unknown as { require?: (m: string) => unknown }).require;
    if (typeof req !== "function") return null;
    const fs = req("fs") as { readFileSync?: (p: string, enc: string) => unknown } | undefined;
    const text = fs?.readFileSync?.(absPath, "utf-8");
    return typeof text === "string" ? text : null;
  } catch {
    return null;
  }
}

/**
 * 系统文件选择器选一个 .excalidrawlib（初始目录 = 素材库文件夹）。
 * 桌面端用主进程对话框（可以指定初始目录——DOM input 做不到）；读出内容转 Blob，
 * 喂给 vendor 的 updateLibrary（它只认内容，不挑 MIME）。
 */
export async function pickLibraryFile(defaultDir: string): Promise<PickLibraryResult> {
  const ipc = desktopIpc();
  if (!ipc) return { kind: "unavailable" };
  let raw: unknown;
  try {
    raw = await ipc.invoke("siyuan-get", { cmd: "showOpenDialog", ...buildOpenDialogOptions(defaultDir) });
  } catch {
    return { kind: "unavailable" };
  }
  const paths = readFilePaths(raw);
  if (paths.length === 0) return { kind: "canceled" };
  const path = paths[0]!;
  const text = readLocalTextFile(path);
  if (text === null) return { kind: "read-error", path };
  return {
    kind: "picked",
    file: { path, blob: new Blob([text], { type: "application/json" }) },
  };
}
