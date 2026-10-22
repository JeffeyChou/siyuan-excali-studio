/**
 * 落盘 / 读回：思源工作空间文件的读写口径。
 *
 * /api/file/putFile 的 path 必须带 `/data` 前缀（思源内核按工作空间相对路径解析），
 * 且失败时 HTTP 200 + `code !== 0`（不抛异常），所以这里必须自己校验 code。
 * /api/file/getFile 成功时直接回文件正文，失败时才回 JSON（同为 HTTP 200），
 * 于是读回必须按 Content-Type 分流，不能无脑 JSON.parse。
 */

// 相对导入带 .ts 后缀：本模块被 node --experimental-strip-types 的测试直接 import

/** 归一化到 /data/... 形式：/data/x → 原样；data/x → 补前导斜杠；x → 加 /data/ */
export function toDataPath(relative: string): string {
  const p = relative.replace(/^\/+/, "");
  if (p === "data" || p.startsWith("data/")) return `/${p}`;
  return `/data/${p}`;
}

/** /data/assets/x.svg → assets/x.svg（写进 markdown / 展示给人看的形式） */
export function toAssetRef(dataPath: string): string {
  return dataPath.replace(/^\/+/, "").replace(/^data\//, "");
}

/** assets/x.svg → /data/assets/x.svg */
export function fromAssetRef(ref: string): string {
  return toDataPath(ref);
}

/** 浏览器取这个资源的 URL 路径（DOM 里 img.src 的 pathname 就是它） */
export function assetWebPath(dataPath: string): string {
  return `/${toAssetRef(dataPath)}`;
}

/** /data/assets/x.svg → x.svg（页签标题、菜单项展示用） */
export function fileNameOf(dataPath: string): string {
  return toAssetRef(dataPath).split("/").pop() || dataPath;
}

export function stampFileName(now = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return [
    "excali-",
    now.getFullYear(),
    p(now.getMonth() + 1),
    p(now.getDate()),
    "-",
    p(now.getHours()),
    p(now.getMinutes()),
    p(now.getSeconds()),
    ".svg",
  ].join("");
}

/** 拼接保存目录与文件名，容忍用户把目录写成 `assets` / `assets/` / `/data/assets` */
export function joinSavePath(dir: string, fileName: string): string {
  const d = dir.trim().replace(/\\/g, "/").replace(/^\/+/, "").replace(/\/+$/, "");
  const base = d === "" ? "assets" : d;
  return `${base}/${fileName}`;
}

/**
 * 2026-10-15 阶段 A：用户输入的文件名 → 安全文件名（带 .svg 后缀）。
 * 剥掉路径分隔与控制字符、去首尾点（隐藏文件）、超长截断；空结果回落默认名。
 */
export function sanitizeFileName(input: string, fallback = "excali-board.svg"): string {
  const base = String(input ?? "")
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, "")
    .replace(/^\.+/, "")
    .trim();
  const noExt = base.replace(/\.svg$/i, "");
  const name = (noExt || fallback.replace(/\.svg$/i, "")).slice(0, 80);
  return `${name}.svg`;
}

/**
 * 备份链条的**读侧**（第五十四轮起插件不再写 `.bak`，这里只服务存量档）。
 *
 * 命名口径沿用第十九轮：槽 1 是 `<名>.svg.bak.svg`，之后 `.bak2`、`.bak3`。
 * 为什么留着不删：
 * - 集市上已发布的版本在用户库里滚出了真档，坏板自救（`restoreFromBackup`）、
 *   删除白板、重命名搬家三条路都要能认出并清掉它们；
 * - 白板库列表必须过滤 `.bak*`，否则存量链条会继续把库灌满。
 * 新写的文件不会再有第二个。
 */
export const BACKUP_KEEP = 3;

export function backupPathOf(dataPath: string, slot = 1): string {
  const base = dataPath.replace(/\.svg$/i, "");
  return slot <= 1 ? `${base}.svg.bak.svg` : `${base}.svg.bak${slot}.svg`;
}

/** 备份链，新→旧（恢复时按这个顺序找第一份能用的） */
export function backupChainOf(dataPath: string): string[] {
  const target = toDataPath(dataPath);
  return Array.from({ length: BACKUP_KEEP }, (_, i) => backupPathOf(target, i + 1));
}

/** 备份文件名判据：库列表要排除它们，否则滚动的 .bak 会把白板库灌满 */
export function isBackupPath(path: string): boolean {
  return /\.bak\d*\.svg$/i.test(path);
}

/**
 * 2026-10-17 第十九轮·D 列表细节：首存/改名的目标文件与别的板重名时**不静默覆盖**，
 * 自动加 `_0`/`_1` 后缀避重（Obsidian `getNewUniqueFilepath` 语义，治调研报告漏洞④
 * 「手输同名直盖」）。逐档探存在性（getFile），只看白板文件本身——备份槽不占位；
 * exclude 传自己（改名场景），命中自身就原样返回。50 档全撞几乎不可能，兜回原名。
 */
export async function uniqueTargetPath(dir: string, fileName: string, exclude?: string): Promise<string> {
  const base = fileName.replace(/\.svg$/i, "");
  for (let i = 0; i < 50; i++) {
    const cand = toDataPath(joinSavePath(dir, i === 0 ? fileName : `${base}_${i - 1}.svg`));
    if (exclude && cand === exclude) return cand;
    if (!(await fileExists(cand))) return cand;
  }
  return toDataPath(joinSavePath(dir, fileName));
}

export async function putSvg(dataPath: string, text: string): Promise<string> {
  const path = toDataPath(dataPath);
  const form = new FormData();
  form.append("path", path);
  form.append("isDir", "false");
  form.append("file", new Blob([text], { type: "image/svg+xml;charset=utf-8" }), path.split("/").pop() || "x.svg");

  const res = await fetch("/api/file/putFile", { method: "POST", body: form });
  const json = (await res.json().catch(() => null)) as { code?: number; msg?: string; data?: unknown } | null;
  if (!res.ok || !json || json.code !== 0) {
    throw new Error(json?.msg || `putFile HTTP ${res.status}`);
  }
  return path;
}

export async function getFileText(dataPath: string): Promise<string> {
  const res = await fetch("/api/file/getFile", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path: toDataPath(dataPath) }),
  });
  if (!res.ok) throw new Error(`getFile HTTP ${res.status}`);
  const text = await res.text();
  // 思源的错误响应是 JSON（HTTP 200 + code!==0），正常文件是 SVG 正文（image/svg+xml）
  if ((res.headers.get("content-type") || "").includes("application/json")) {
    let json: unknown = null;
    try {
      json = JSON.parse(text);
    } catch {
      return text;
    }
    if (json && typeof json === "object" && "code" in json && (json as { code: number }).code !== 0) {
      const msg = (json as { msg?: string }).msg;
      throw new Error(msg || `getFile code ${(json as { code: number }).code}`);
    }
  }
  return text;
}

/**
 * 2026-10-16 批4B：文件存在性体检用。getFile 的失败口径有两层——HTTP 非 200
 * 或 HTTP 200 + JSON（code!==0），存在时直接回正文，所以按 Content-Type 分流。
 */
export async function fileExists(dataPath: string): Promise<boolean> {
  try {
    const res = await fetch("/api/file/getFile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: toDataPath(dataPath) }),
    });
    if (!res.ok) return false;
    if ((res.headers.get("content-type") || "").includes("application/json")) {
      const json = (await res.json().catch(() => null)) as { code?: number } | null;
      return !json || json.code === 0;
    }
    return true;
  } catch {
    return false;
  }
}

/* ---------------- 2026-10-15 阶段 A：文件管理 / 备份 ---------------- */

/** 内核 JSON API 小封装（成功返回 data，失败抛带 msg 的 Error） */
async function fileApi<T = unknown>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json().catch(() => null)) as { code?: number; msg?: string; data?: T } | null;
  if (!res.ok || !json || json.code !== 0) throw new Error(json?.msg || `${path} HTTP ${res.status}`);
  return json.data as T;
}

/** 2026-10-16 第十三轮：白板文件 + 修改时间（选择器展示/排序用） */
export type BoardFileEntry = { path: string; updated: number };

/**
 * 列出目录下的白板候选（所有 .svg，修改时间新的在前）。
 * 读目录用 /api/file/readDir；只列不读内容，
 * 「是不是本插件的白板」交给打开时的解码判断。
 * updated 是内核给的毫秒时间戳（选文档框那种目录层级没有它，所以只能这么取）。
 */
export async function listBoardEntries(dir: string): Promise<BoardFileEntry[]> {
  const rel = dir.trim().replace(/\\/g, "/").replace(/^\/+/, "").replace(/\/+$/, "");
  const base = rel === "" ? "assets" : rel;
  const rows = await fileApi<Array<{ name?: string; isDir?: boolean; updated?: number }>>(
    "/api/file/readDir",
    { path: toDataPath(base) },
  );
  const files = Array.isArray(rows)
    ? rows.filter((r) => r && r.isDir !== true && typeof r.name === "string" && /\.svg$/i.test(r.name) && !isBackupPath(r.name))
    : [];
  return files
    .map((r) => ({ path: `${base}/${r.name as string}`, updated: typeof r.updated === "number" ? r.updated : 0 }))
    .sort((a, b) => b.updated - a.updated);
}

/** 只要路径的旧口径：脚本 API host.listFiles 继续吃 string[] */
export async function listBoardFiles(dir: string): Promise<string[]> {
  return (await listBoardEntries(dir)).map((e) => e.path);
}

/**
 * 第三十轮：按扩展名列目录下的文件（图形模板库等资源池用）。
 * 与 listBoardEntries 同一套 readDir 口径，只是不筛 .svg、不排修改时间、
 * 不排除备份链（调用方自己拿正则卡扩展名）。
 * ext 省略 = 列全部文件（脚本 API host.listFiles 用：脚本侧自己按需过滤）。
 */
export async function listFilesWithExt(dir: string, ext?: RegExp): Promise<string[]> {
  const rel = dir.trim().replace(/\\/g, "/").replace(/^\/+/, "").replace(/\/+$/, "");
  const base = rel === "" ? "assets" : rel;
  const rows = await fileApi<Array<{ name?: string; isDir?: boolean }>>(
    "/api/file/readDir",
    { path: toDataPath(base) },
  );
  return Array.isArray(rows)
    ? rows
        .filter((r) => r && r.isDir !== true && typeof r.name === "string" && (!ext || ext.test(r.name as string)))
        .map((r) => `${base}/${r.name as string}`)
    : [];
}

/** 删除文件（重命名的旧路径清理用） */
export async function removeSvg(dataPath: string): Promise<void> {
  await fileApi("/api/file/removeFile", { path: toDataPath(dataPath) });
}

/**
 * 重命名 = 读旧内容 → 写新路径 → 删旧路径（不依赖 renameFile，
 * 行为对插件完全可控）。调用方负责把引用方（文档）的事后处理。
 * 存量备份链跟着搬——插件已不再写 `.bak`，但老用户库里还有：留在旧名下就是
 * 看不见（列表已排除 .bak）、删不掉（删除计划按新名算）、也恢复不到（恢复链按新名找）的孤档。
 */
export async function renameSvg(oldPath: string, newPath: string): Promise<string> {
  const old = toDataPath(oldPath);
  const target = toDataPath(newPath);
  const text = await getFileText(old);
  const saved = await putSvg(target, text);
  if (saved !== old) {
    await removeSvg(old);
    for (let slot = 1; slot <= BACKUP_KEEP; slot++) {
      try {
        const bakText = await getFileText(backupPathOf(old, slot));
        await putSvg(backupPathOf(saved, slot), bakText);
        await removeSvg(backupPathOf(old, slot));
      } catch {
        // 这一档不存在（没备份过）或搬不动；坏一档不影响其余，继续
      }
    }
  }
  return saved;
}

/** 2026-10-15 阶段 B：写文本文件（图库 JSON 用） */
export async function putTextFile(dataPath: string, text: string): Promise<string> {
  const path = toDataPath(dataPath);
  const form = new FormData();
  form.append("path", path);
  form.append("isDir", "false");
  form.append("file", new Blob([text], { type: "application/json;charset=utf-8" }), path.split("/").pop() || "x.json");
  const res = await fetch("/api/file/putFile", { method: "POST", body: form });
  const json = (await res.json().catch(() => null)) as { code?: number; msg?: string } | null;
  if (!res.ok || !json || json.code !== 0) {
    throw new Error(json?.msg || `putFile HTTP ${res.status}`);
  }
  return path;
}

/* ---------------- 第二十六轮 T1：图片外置的二进制读写 ---------------- */

/** 写二进制文件（excali-media 的图片本体；putFile 收 Blob，字节直接进） */
export async function putBytes(dataPath: string, bytes: Uint8Array, mime: string): Promise<string> {
  const path = toDataPath(dataPath);
  const form = new FormData();
  form.append("path", path);
  form.append("isDir", "false");
  form.append("file", new Blob([bytes as unknown as BlobPart], { type: mime }), path.split("/").pop() || "x.bin");
  const res = await fetch("/api/file/putFile", { method: "POST", body: form });
  const json = (await res.json().catch(() => null)) as { code?: number; msg?: string } | null;
  if (!res.ok || !json || json.code !== 0) {
    throw new Error(json?.msg || `putFile HTTP ${res.status}`);
  }
  return path;
}

/** 读二进制文件（打开白板时把 path 引用注水回 dataURL 用）；错误口径与 getFileText 相同 */
export async function getFileBytes(dataPath: string): Promise<Uint8Array> {
  const res = await fetch("/api/file/getFile", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path: toDataPath(dataPath) }),
  });
  if (!res.ok) throw new Error(`getFile HTTP ${res.status}`);
  if ((res.headers.get("content-type") || "").includes("application/json")) {
    const json = (await res.json().catch(() => null)) as { code?: number; msg?: string } | null;
    throw new Error(json?.msg || `getFile code ${json?.code ?? "?"}`);
  }
  return new Uint8Array(await res.arrayBuffer());
}
