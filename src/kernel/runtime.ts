/**
 * 2026-10-18 C：kernel.js 的运行时垫片。
 *
 * 内核脚本跑在 goja 里（不是浏览器也不是 Node）：没有 atob/btoa，部分版本
 * 也没有 TextEncoder/TextDecoder。共享的 scene-codec / media-ref 依赖这些接口，
 * 所以必须在调用任何能力之前补上。只补「缺什么补什么」，不覆盖宿主原生实现。
 */

type AnyGlobal = Record<string, unknown>;
const g = globalThis as unknown as AnyGlobal;

const B64_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
const B64_LOOKUP: Record<string, number> = {};
for (let i = 0; i < B64_ALPHABET.length; i++) B64_LOOKUP[B64_ALPHABET[i]] = i;

/** btoa 等价物：输入按 latin1 二进制串处理（每字符一个字节） */
function encodeBase64(input: string): string {
  const text = String(input ?? "");
  const chunks: string[] = [];
  let out = "";
  for (let i = 0; i < text.length; i += 3) {
    const c1 = text.charCodeAt(i);
    const has2 = i + 1 < text.length;
    const has3 = i + 2 < text.length;
    const c2 = has2 ? text.charCodeAt(i + 1) : 0;
    const c3 = has3 ? text.charCodeAt(i + 2) : 0;
    if (c1 > 0xff || (has2 && c2 > 0xff) || (has3 && c3 > 0xff)) {
      throw new Error("btoa: The string to be encoded contains characters outside of the Latin1 range.");
    }
    out += B64_ALPHABET[c1 >> 2];
    out += B64_ALPHABET[((c1 & 3) << 4) | (c2 >> 4)];
    out += has2 ? B64_ALPHABET[((c2 & 15) << 2) | (c3 >> 6)] : "=";
    out += has3 ? B64_ALPHABET[c3 & 63] : "=";
    if (out.length >= 0x8000) {
      chunks.push(out);
      out = "";
    }
  }
  if (out !== "") chunks.push(out);
  return chunks.join("");
}

/** atob 等价物：返回二进制串（每字符一个字节） */
function decodeBase64(input: string): string {
  const clean = String(input ?? "").replace(/[\t\n\f\r ]+/g, "");
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(clean)) throw new Error("atob: Invalid character");
  const body = clean.replace(/=+$/, "");
  if (body.length % 4 === 1) throw new Error("atob: The string to be decoded is not correctly encoded.");
  const chunks: string[] = [];
  let out = "";
  for (let i = 0; i < body.length; i += 4) {
    const n =
      ((B64_LOOKUP[body[i]] ?? 0) << 18) |
      ((B64_LOOKUP[body[i + 1]] ?? 0) << 12) |
      ((B64_LOOKUP[body[i + 2]] ?? 0) << 6) |
      (B64_LOOKUP[body[i + 3]] ?? 0);
    out += String.fromCharCode((n >> 16) & 0xff);
    if (i + 2 < body.length) out += String.fromCharCode((n >> 8) & 0xff);
    if (i + 3 < body.length) out += String.fromCharCode(n & 0xff);
    if (out.length >= 0x8000) {
      chunks.push(out);
      out = "";
    }
  }
  if (out !== "") chunks.push(out);
  return chunks.join("");
}

/** 最小 TextEncoder（UTF-8） */
class KernelTextEncoder {
  get encoding(): string {
    return "utf-8";
  }

  encode(input = ""): Uint8Array {
    const text = String(input ?? "");
    const bytes: number[] = [];
    for (let i = 0; i < text.length; i++) {
      let code = text.charCodeAt(i);
      if (code >= 0xd800 && code <= 0xdbff && i + 1 < text.length) {
        const next = text.charCodeAt(i + 1);
        if (next >= 0xdc00 && next <= 0xdfff) {
          code = 0x10000 + ((code - 0xd800) << 10) + (next - 0xdc00);
          i += 1;
        } else {
          code = 0xfffd;
        }
      } else if (code >= 0xd800 && code <= 0xdfff) {
        code = 0xfffd;
      }
      if (code < 0x80) bytes.push(code);
      else if (code < 0x800) bytes.push(0xc0 | (code >> 6), 0x80 | (code & 63));
      else if (code < 0x10000) bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 63), 0x80 | (code & 63));
      else bytes.push(0xf0 | (code >> 18), 0x80 | ((code >> 12) & 63), 0x80 | ((code >> 6) & 63), 0x80 | (code & 63));
    }
    return new Uint8Array(bytes);
  }

  encodeInto(input: string, dest: Uint8Array): { read: number; written: number } {
    const bytes = this.encode(input);
    const n = Math.min(bytes.length, dest.length);
    dest.set(bytes.subarray(0, n));
    return { read: input.length, written: n };
  }
}

/** 最小 TextDecoder（UTF-8；坏字节回落 U+FFFD） */
class KernelTextDecoder {
  get encoding(): string {
    return "utf-8";
  }

  decode(input?: Uint8Array): string {
    const bytes = input ?? new Uint8Array(0);
    let out = "";
    let i = 0;
    while (i < bytes.length) {
      const b0 = bytes[i++];
      let code = -1;
      let extra = 0;
      if (b0 < 0x80) {
        code = b0;
      } else if (b0 >= 0xc2 && b0 <= 0xdf) {
        code = b0 & 0x1f;
        extra = 1;
      } else if (b0 >= 0xe0 && b0 <= 0xef) {
        code = b0 & 0x0f;
        extra = 2;
      } else if (b0 >= 0xf0 && b0 <= 0xf4) {
        code = b0 & 0x07;
        extra = 3;
      }
      if (code < 0) {
        out += "\ufffd";
        continue;
      }
      let ok = true;
      for (let k = 0; k < extra; k++) {
        if (i >= bytes.length || (bytes[i] & 0xc0) !== 0x80) {
          ok = false;
          break;
        }
        code = (code << 6) | (bytes[i++] & 0x3f);
      }
      if (!ok) {
        out += "\ufffd";
        continue;
      }
      if (code > 0x10ffff || (code >= 0xd800 && code <= 0xdfff)) {
        out += "\ufffd";
      } else if (code > 0xffff) {
        const v = code - 0x10000;
        out += String.fromCharCode(0xd800 + (v >> 10), 0xdc00 + (v & 0x3ff));
      } else {
        out += String.fromCharCode(code);
      }
    }
    return out;
  }
}

if (typeof g.atob !== "function") g.atob = decodeBase64;
if (typeof g.btoa !== "function") g.btoa = encodeBase64;
if (typeof g.TextEncoder !== "function") g.TextEncoder = KernelTextEncoder;
if (typeof g.TextDecoder !== "function") g.TextDecoder = KernelTextDecoder;
