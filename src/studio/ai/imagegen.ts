/**
 * 2026-10-18 D：位图图像生成（OpenAI 兼容 images API）的纯逻辑层。
 *
 * 前端与内核共用：请求构造、响应解析、图片尺寸嗅探都在这里，网络只通过注入的
 * ProxyCall 走（前端 fetch / 内核 siyuan.client.fetch）。这样单测不用起服务器，
 * 两边的错误口径也不会漂移。
 *
 * 约定：
 * - 不发送 response_format：gpt-image-1 不接受该字段，dall-e-3 默认回 url；
 *   两种返回（b64_json / url）本模块都吃。
 * - Key 只进 Authorization 头；错误信息不回显请求头，避免日志泄密钥。
 * - 图片本体上限 12 MiB（base64 近似值），超限直接拒绝，避免白板文件失控。
 */

export interface ImageGenConfig {
  baseUrl: string;
  model: string;
  apiKey: string;
  size: string;
}

export interface ProxyRequest {
  url: string;
  method?: string;
  headers?: Record<string, string>;
  payload?: string;
  contentType?: string;
  timeout?: number;
  responseEncoding?: string;
}

export interface ProxyResponse {
  code: number;
  msg: string;
  status: number;
  headers: Record<string, unknown>;
  body: string;
}

export type ProxyCall = (req: ProxyRequest) => Promise<ProxyResponse>;

export interface ImageRequest {
  url: string;
  headers: Record<string, string>;
  payload: string;
  size: string;
}

export interface ImageGenResult {
  dataURL: string;
  mime: string;
  base64: string;
  width: number;
  height: number;
  revisedPrompt?: string;
}

export const MAX_IMAGE_BYTES = 12 * 1024 * 1024;
export const DEFAULT_IMAGE_SIZE = "1024x1024";
export const DEFAULT_IMAGE_MODEL = "gpt-image-1";

function headerValue(headers: Record<string, unknown>, name: string): string {
  const wanted = name.toLowerCase();
  for (const [k, v] of Object.entries(headers ?? {})) {
    if (k.toLowerCase() !== wanted) continue;
    if (Array.isArray(v)) return String(v[0] ?? "");
    return typeof v === "string" ? v : String(v ?? "");
  }
  return "";
}

/** 兼容完整 endpoint 与 base URL 两种写法 */
export function imageEndpointOf(baseUrl: string): string {
  const raw = String(baseUrl ?? "").trim().replace(/\/+$/, "");
  if (!raw) throw new Error("未配置图像 API 地址");
  if (!/^https?:\/\//i.test(raw)) throw new Error("图像 API 地址必须以 http:// 或 https:// 开头");
  return /\/images\/generations$/i.test(raw) ? raw : `${raw}/images/generations`;
}

export function buildImageRequest(
  cfg: ImageGenConfig,
  prompt: string,
  opts: { size?: string } = {},
): ImageRequest {
  const text = String(prompt ?? "").trim();
  if (!text) throw new Error("prompt 不能为空");
  if (text.length > 4000) throw new Error("prompt 过长（上限 4000 字符）");
  const apiKey = String(cfg.apiKey ?? "").trim();
  if (!apiKey) throw new Error("未配置图像 API Key");
  const model = String(cfg.model ?? "").trim() || DEFAULT_IMAGE_MODEL;
  const size = String(opts.size ?? cfg.size ?? "").trim() || DEFAULT_IMAGE_SIZE;
  return {
    url: imageEndpointOf(cfg.baseUrl),
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    payload: JSON.stringify({ model, prompt: text, n: 1, size }),
    size,
  };
}

export type ParsedImageResponse =
  | { kind: "inline"; base64: string; revisedPrompt?: string }
  | { kind: "url"; url: string; revisedPrompt?: string };

function normalizeBase64(raw: string): string {
  const body = raw.replace(/\s+/g, "").replace(/-/g, "+").replace(/_/g, "/");
  const pad = body.length % 4;
  return pad === 0 ? body : body + "=".repeat(4 - pad);
}

function stripDataUrl(raw: string): { base64: string; mime: string } | null {
  const m = /^data:([^;,]+);base64,([\s\S]+)$/i.exec(raw.trim());
  if (!m) return null;
  return { mime: m[1] || "image/png", base64: normalizeBase64(m[2]) };
}

/** 解析 OpenAI 兼容的 images/generations 响应；错误信息不含请求头 */
export function parseImageResponse(json: unknown): ParsedImageResponse {
  if (!json || typeof json !== "object") throw new Error("图像 API 返回的不是 JSON 对象");
  const root = json as Record<string, unknown>;
  if (root.error) {
    const err = root.error;
    const message =
      err && typeof err === "object" && typeof (err as Record<string, unknown>).message === "string"
        ? (err as Record<string, unknown>).message
        : typeof err === "string"
          ? err
          : "图像 API 返回错误";
    throw new Error(`图像 API：${message}`);
  }
  const raw = Array.isArray(root.data) ? root.data[0] : root.data;
  const item = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : root;
  const revisedPrompt =
    typeof item.revised_prompt === "string"
      ? item.revised_prompt
      : typeof root.revised_prompt === "string"
        ? root.revised_prompt
        : undefined;
  const b64 = typeof item.b64_json === "string" ? item.b64_json : typeof root.b64_json === "string" ? root.b64_json : "";
  if (b64) {
    const dataUrl = stripDataUrl(b64);
    return {
      kind: "inline",
      base64: dataUrl ? dataUrl.base64 : normalizeBase64(b64),
      ...(revisedPrompt ? { revisedPrompt } : {}),
    };
  }
  const url = typeof item.url === "string" ? item.url : typeof root.url === "string" ? root.url : "";
  if (url) return { kind: "url", url, ...(revisedPrompt ? { revisedPrompt } : {}) };
  throw new Error("图像 API 没有返回图片（b64_json / url 都为空）");
}

function base64ToBytes(base64: string): Uint8Array {
  const bin = atob(normalizeBase64(base64));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i) & 0xff;
  return out;
}

function u16be(b: Uint8Array, i: number): number {
  return (b[i] << 8) | b[i + 1];
}
function u32be(b: Uint8Array, i: number): number {
  return ((b[i] << 24) | (b[i + 1] << 16) | (b[i + 2] << 8) | b[i + 3]) >>> 0;
}
function u16le(b: Uint8Array, i: number): number {
  return b[i] | (b[i + 1] << 8);
}
function u24le(b: Uint8Array, i: number): number {
  return b[i] | (b[i + 1] << 8) | (b[i + 2] << 16);
}
function u32le(b: Uint8Array, i: number): number {
  return (b[i] | (b[i + 1] << 8) | (b[i + 2] << 16) | (b[i + 3] << 24)) >>> 0;
}

/** 按文件头嗅探 MIME（只认常见位图；认不出按 PNG） */
export function sniffImageMime(base64: string): string {
  let b: Uint8Array;
  try {
    b = base64ToBytes(base64.slice(0, 64));
  } catch {
    return "image/png";
  }
  if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png";
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.length >= 4 && b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46) return "image/gif";
  if (
    b.length >= 12 &&
    b[0] === 0x52 &&
    b[1] === 0x49 &&
    b[2] === 0x46 &&
    b[3] === 0x46 &&
    b[8] === 0x57 &&
    b[9] === 0x45 &&
    b[10] === 0x42 &&
    b[11] === 0x50
  ) {
    return "image/webp";
  }
  if (b.length >= 2 && b[0] === 0x42 && b[1] === 0x4d) return "image/bmp";
  return "image/png";
}

/** 位图宽高嗅探（PNG/GIF/JPEG/WebP/BMP）；认不出返回 null */
export function imageSizeOfBase64(base64: string): { width: number; height: number } | null {
  let b: Uint8Array;
  try {
    b = base64ToBytes(base64);
  } catch {
    return null;
  }
  if (b.length >= 24 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) {
    return { width: u32be(b, 16), height: u32be(b, 20) };
  }
  if (b.length >= 10 && b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46) {
    return { width: u16le(b, 6), height: u16le(b, 8) };
  }
  if (b.length >= 26 && b[0] === 0x42 && b[1] === 0x4d) {
    const h = u32le(b, 22);
    return { width: u32le(b, 18), height: h > 0x7fffffff ? 0x100000000 - h : h };
  }
  if (
    b.length >= 30 &&
    b[0] === 0x52 &&
    b[1] === 0x49 &&
    b[2] === 0x46 &&
    b[3] === 0x46 &&
    b[8] === 0x57 &&
    b[9] === 0x45 &&
    b[10] === 0x42 &&
    b[11] === 0x50
  ) {
    const fourcc = String.fromCharCode(b[12], b[13], b[14], b[15]);
    if (fourcc === "VP8X" && b.length >= 30) {
      return { width: u24le(b, 24) + 1, height: u24le(b, 27) + 1 };
    }
    if (fourcc === "VP8 " && b.length >= 30) {
      return { width: u16le(b, 26) & 0x3fff, height: u16le(b, 28) & 0x3fff };
    }
    if (fourcc === "VP8L" && b.length >= 25) {
      const bits = b[21] | (b[22] << 8) | (b[23] << 16) | (b[24] << 24);
      return { width: (bits & 0x3fff) + 1, height: ((bits >>> 14) & 0x3fff) + 1 };
    }
    return null;
  }
  // JPEG：逐段找 SOF（C0-C3 / C5-C7 / C9-CB / CD-CF）
  if (b.length >= 4 && b[0] === 0xff && b[1] === 0xd8) {
    let i = 2;
    while (i + 3 < b.length) {
      if (b[i] !== 0xff) {
        i += 1;
        continue;
      }
      const marker = b[i + 1];
      if (marker === 0xd8 || marker === 0xd9 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
        i += 2;
        continue;
      }
      const len = u16be(b, i + 2);
      if (len < 2) break;
      const isSof =
        (marker >= 0xc0 && marker <= 0xc3) ||
        (marker >= 0xc5 && marker <= 0xc7) ||
        (marker >= 0xc9 && marker <= 0xcb) ||
        (marker >= 0xcd && marker <= 0xcf);
      if (isSof && i + 8 < b.length) {
        return { width: u16be(b, i + 7), height: u16be(b, i + 5) };
      }
      i += 2 + len;
    }
  }
  return null;
}

/**
 * 生成一张图：POST images/generations；返回 b64 直接用，返回 url 再经代理下载。
 * 所有失败都抛 Error（调用方决定怎么展示）。
 */
export async function generateImage(
  cfg: ImageGenConfig,
  prompt: string,
  proxy: ProxyCall,
  opts: { size?: string } = {},
): Promise<ImageGenResult> {
  const req = buildImageRequest(cfg, prompt, opts);
  const resp = await proxy({
    url: req.url,
    method: "POST",
    headers: req.headers,
    payload: req.payload,
    contentType: "application/json",
    timeout: 180000,
  });
  if (resp.code !== 0) throw new Error(`思源转发失败：${resp.msg || `code ${resp.code}`}`);
  if (resp.status < 200 || resp.status >= 300) {
    throw new Error(`图像 API HTTP ${resp.status}：${String(resp.body ?? "").slice(0, 300)}`);
  }
  let json: unknown;
  try {
    json = JSON.parse(resp.body);
  } catch {
    throw new Error("图像 API 返回的不是 JSON");
  }
  const parsed = parseImageResponse(json);

  let base64: string;
  let mime: string;
  if (parsed.kind === "inline") {
    base64 = parsed.base64;
    mime = sniffImageMime(base64);
  } else {
    if (!/^https?:\/\//i.test(parsed.url)) throw new Error("图像 API 返回的图片 URL 不是 http(s)");
    const dl = await proxy({
      url: parsed.url,
      method: "GET",
      headers: {},
      payload: "",
      contentType: "application/octet-stream",
      timeout: 120000,
      responseEncoding: "base64",
    });
    if (dl.code !== 0) throw new Error(`图片下载失败：${dl.msg || `code ${dl.code}`}`);
    if (dl.status < 200 || dl.status >= 300) throw new Error(`图片下载 HTTP ${dl.status}`);
    base64 = normalizeBase64(dl.body || "");
    if (!base64) throw new Error("图片下载返回空内容");
    const contentType = headerValue(dl.headers, "content-type").split(";")[0].trim().toLowerCase();
    mime = /^image\//.test(contentType) ? contentType : sniffImageMime(base64);
  }

  const approxBytes = Math.floor((base64.length * 3) / 4);
  if (approxBytes > MAX_IMAGE_BYTES) {
    throw new Error(`生成的图片过大（约 ${(approxBytes / 1024 / 1024).toFixed(1)} MiB，上限 12 MiB）`);
  }
  const size = imageSizeOfBase64(base64);
  return {
    dataURL: `data:${mime};base64,${base64}`,
    mime,
    base64,
    width: size?.width && size.width > 0 ? size.width : 1024,
    height: size?.height && size.height > 0 ? size.height : 1024,
    ...(parsed.revisedPrompt ? { revisedPrompt: parsed.revisedPrompt } : {}),
  };
}
