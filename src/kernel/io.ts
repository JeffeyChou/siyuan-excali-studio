/**
 * 2026-10-18 C：内核侧文件 IO。
 *
 * 不能复用 src/studio/storage.ts 的浏览器实现（那里吃 fetch/FormData/Blob），
 * 这里用 siyuan.client.fetch：
 * - 读：/api/file/getFile（成功回正文，失败回 JSON，按正文形态分流）
 * - 列：/api/file/readDir
 * - 写：/api/file/putFile + 手工 multipart（TextEncoder + Uint8Array）
 * - 删：/api/file/removeFile
 *
 * 写盘纪律与前端一致：同内容不重复落盘（正文逐字 + 载荷语义两道等价判定），
 * 备份链已于第五十四轮退役——白板库每块板只留一个文件。
 */

import { sceneTextsEquivalent } from "../studio/scene-codec.ts";
import { fileNameOf, toDataPath } from "../studio/storage.ts";

declare const siyuan: any;

export interface DirEntry {
  name: string;
  isDir?: boolean;
  updated?: number;
}

type KernelResponse = {
  ok: boolean;
  status: number;
  text: () => Promise<string>;
  json: () => Promise<any>;
  arrayBuffer: () => Promise<ArrayBuffer>;
};

function client(): any {
  const api = siyuan?.client;
  if (!api || typeof api.fetch !== "function") {
    throw new Error("当前思源内核不支持插件网络接口（请升级思源）");
  }
  return api;
}

async function request(path: string, init: Record<string, unknown>): Promise<KernelResponse> {
  return client().fetch(path, init);
}

async function jsonApi<T>(path: string, body: unknown): Promise<T> {
  const res = await request(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  let payload: any = null;
  try {
    payload = await res.json();
  } catch {
    throw new Error(`${path} 返回的不是 JSON`);
  }
  if (!res.ok || !payload || Number(payload.code) !== 0) {
    throw new Error(payload?.msg || `${path} 调用失败（HTTP ${res.status || "?"}）`);
  }
  return payload.data as T;
}

/**
 * 读文本。getFile 失败时 HTTP 200 + JSON({code!=0})，正常 SVG 是正文，
 * 所以先看开头是不是 `{`，能解析出 code!=0 才当失败。
 */
export async function readText(dataPath: string): Promise<string> {
  const res = await request("/api/file/getFile", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path: toDataPath(dataPath) }),
  });
  if (!res.ok) throw new Error(`读取文件失败（HTTP ${res.status}）`);
  const text = await res.text();
  if (text.trimStart().startsWith("{")) {
    let json: any = null;
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }
    if (json && typeof json === "object" && "code" in json && Number(json.code) !== 0) {
      throw new Error(json.msg || `读取文件失败（code ${json.code}）`);
    }
  }
  return text;
}

export async function readDir(dir: string): Promise<DirEntry[]> {
  const rows = await jsonApi<DirEntry[]>("/api/file/readDir", { path: toDataPath(dir) });
  return Array.isArray(rows) ? rows : [];
}

export async function fileExists(relPath: string): Promise<boolean> {
  const rel = String(relPath ?? "").replace(/^\/+/, "").replace(/^data\//, "");
  const slash = rel.lastIndexOf("/");
  const dir = slash >= 0 ? rel.slice(0, slash) : "";
  const name = slash >= 0 ? rel.slice(slash + 1) : rel;
  if (!name) return false;
  try {
    const rows = await readDir(dir);
    return rows.some((r) => r && r.name === name && r.isDir !== true);
  } catch {
    return false;
  }
}

function multipartField(boundary: string, name: string, value: string): string {
  return `--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`;
}

/** 写文本（SVG / JSON 共用）；失败时抛带内核 msg 的 Error */
export async function writeText(dataPath: string, text: string, mime = "image/svg+xml"): Promise<void> {
  const path = toDataPath(dataPath);
  const name = (fileNameOf(path) || "file").replace(/[\\/:*?"<>|\r\n]/g, "_");
  const boundary = `excali-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  const encoder = new TextEncoder();
  const head =
    multipartField(boundary, "path", path) +
    multipartField(boundary, "isDir", "false") +
    `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${name}"\r\nContent-Type: ${mime}; charset=utf-8\r\n\r\n`;
  const tail = `\r\n--${boundary}--\r\n`;
  const headBytes = encoder.encode(head);
  const bodyBytes = encoder.encode(text);
  const tailBytes = encoder.encode(tail);
  const body = new Uint8Array(headBytes.length + bodyBytes.length + tailBytes.length);
  body.set(headBytes, 0);
  body.set(bodyBytes, headBytes.length);
  body.set(tailBytes, headBytes.length + bodyBytes.length);

  const res = await request("/api/file/putFile", {
    method: "POST",
    headers: { "Content-Type": `multipart/form-data; boundary=${boundary}` },
    body: body.buffer,
  });
  let payload: any = null;
  try {
    payload = await res.json();
  } catch {
    payload = null;
  }
  if (!res.ok || !payload || Number(payload.code) !== 0) {
    throw new Error(payload?.msg || `写入文件失败（HTTP ${res.status || "?"}）`);
  }
}

export async function removeFile(dataPath: string): Promise<void> {
  await jsonApi("/api/file/removeFile", { path: toDataPath(dataPath) });
}

/** 写 SVG：内容有变才覆盖（正文逐字与载荷语义两道等价判定，与前端 saveSvg 同口径） */
export async function writeSvg(relPath: string, text: string): Promise<void> {
  const target = toDataPath(relPath);
  let current: string | null = null;
  try {
    current = await readText(target);
  } catch {
    // 文件还不存在，直接新建
  }
  if (current !== null && sceneTextsEquivalent(current, text)) return;
  await writeText(target, text, "image/svg+xml");
}

/** 读白板正文并校验内嵌 scene 标记（坏档在解码前先拦一道） */
export async function readBoardText(relPath: string): Promise<string> {
  const text = await readText(relPath);
  if (!text.includes("svg-source:excalidraw")) {
    throw new Error(`不是 Excali 白板（缺内嵌 scene）：${relPath}`);
  }
  return text;
}
