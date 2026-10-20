// 2026-10-18 D：位图生成纯逻辑。
// 不发请求、不起服务器：请求构造 / 响应解析 / 尺寸嗅探 / 代理编排全在这里钉住。
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildImageRequest,
  generateImage,
  imageEndpointOf,
  imageSizeOfBase64,
  MAX_IMAGE_BYTES,
  parseImageResponse,
  sniffImageMime,
} from "../src/studio/ai/imagegen.ts";

const CFG = {
  baseUrl: "https://api.example.com/v1",
  model: "gpt-image-1",
  apiKey: "sk-imagegen-test",
  size: "1024x1024",
};

function pngBase64(width, height) {
  const b = Buffer.alloc(33);
  b.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
  b.writeUInt32BE(13, 8);
  b.write("IHDR", 12, "ascii");
  b.writeUInt32BE(width, 16);
  b.writeUInt32BE(height, 20);
  b[24] = 8;
  b[25] = 2;
  return b.toString("base64");
}

function jpegBase64(width, height) {
  const b = Buffer.alloc(24);
  b.set([0xff, 0xd8, 0xff, 0xc0, 0x00, 0x11, 0x08], 0);
  b.writeUInt16BE(height, 7);
  b.writeUInt16BE(width, 9);
  b[11] = 3;
  return b.toString("base64");
}

function gifBase64(width, height) {
  const b = Buffer.alloc(13);
  b.write("GIF89a", 0, "ascii");
  b.writeUInt16LE(width, 6);
  b.writeUInt16LE(height, 8);
  return b.toString("base64");
}

function bmpBase64(width, height) {
  const b = Buffer.alloc(30);
  b.write("BM", 0, "ascii");
  b.writeUInt32LE(width, 18);
  b.writeUInt32LE(height, 22);
  return b.toString("base64");
}

function webpVp8xBase64(width, height) {
  const b = Buffer.alloc(30);
  b.write("RIFF", 0, "ascii");
  b.write("WEBP", 8, "ascii");
  b.write("VP8X", 12, "ascii");
  const w = width - 1;
  const h = height - 1;
  b[24] = w & 0xff;
  b[25] = (w >> 8) & 0xff;
  b[26] = (w >> 16) & 0xff;
  b[27] = h & 0xff;
  b[28] = (h >> 8) & 0xff;
  b[29] = (h >> 16) & 0xff;
  return b.toString("base64");
}

function proxyOk(body, headers = { "Content-Type": "application/json" }) {
  return { code: 0, msg: "", status: 200, headers, body };
}

test("imageEndpointOf：base URL 补 /images/generations，完整端点原样，非法地址拒绝", () => {
  assert.equal(imageEndpointOf("https://api.example.com/v1"), "https://api.example.com/v1/images/generations");
  assert.equal(imageEndpointOf("https://api.example.com/v1/"), "https://api.example.com/v1/images/generations");
  assert.equal(
    imageEndpointOf("https://api.example.com/v1/images/generations"),
    "https://api.example.com/v1/images/generations",
  );
  assert.throws(() => imageEndpointOf(""), /未配置图像 API 地址/);
  assert.throws(() => imageEndpointOf("api.example.com/v1"), /http:\/\/ 或 https:\/\//);
});

test("buildImageRequest：Bearer 头、不发 response_format、size 覆盖优先", () => {
  const req = buildImageRequest(CFG, "  一只在画板上的猫  ", { size: "1536x1024" });
  assert.equal(req.url, "https://api.example.com/v1/images/generations");
  assert.equal(req.headers.Authorization, "Bearer sk-imagegen-test");
  assert.equal(req.headers["Content-Type"], "application/json");
  const body = JSON.parse(req.payload);
  assert.deepEqual(body, { model: "gpt-image-1", prompt: "一只在画板上的猫", n: 1, size: "1536x1024" });
  assert.equal("response_format" in body, false, "gpt-image-1 不接受 response_format");
  assert.equal(body.prompt.includes("  "), false, "prompt 要去首尾空白");
});

test("buildImageRequest：空 prompt / 超长 prompt / 空 key 都报错，错误不回显 key", () => {
  assert.throws(() => buildImageRequest(CFG, "   "), /prompt 不能为空/);
  assert.throws(() => buildImageRequest(CFG, "x".repeat(4001)), /prompt 过长/);
  let message = "";
  try {
    buildImageRequest({ ...CFG, apiKey: "  " }, "猫");
  } catch (e) {
    message = e.message;
  }
  assert.match(message, /未配置图像 API Key/);
  assert.equal(message.includes("sk-imagegen-test"), false);
});

test("parseImageResponse：b64_json / data URL / url / 根级字段 / 错误对象", () => {
  const inline = parseImageResponse({ data: [{ b64_json: pngBase64(8, 6), revised_prompt: "改过的提示" }] });
  assert.equal(inline.kind, "inline");
  assert.equal(inline.revisedPrompt, "改过的提示");

  const dataUrl = parseImageResponse({ data: [{ b64_json: `data:image/webp;base64,${webpVp8xBase64(8, 6)}` }] });
  assert.equal(dataUrl.kind, "inline");
  assert.equal(dataUrl.base64, webpVp8xBase64(8, 6));

  const byUrl = parseImageResponse({ data: [{ url: "https://img.example.com/a.png" }] });
  assert.deepEqual(byUrl, { kind: "url", url: "https://img.example.com/a.png" });

  const rootLevel = parseImageResponse({ b64_json: pngBase64(4, 4) });
  assert.equal(rootLevel.kind, "inline");

  assert.throws(() => parseImageResponse({ error: { message: "额度不足" } }), /图像 API：额度不足/);
  assert.throws(() => parseImageResponse({ data: [{}] }), /没有返回图片/);
  assert.throws(() => parseImageResponse("nope"), /不是 JSON 对象/);
});

test("尺寸嗅探：PNG / JPEG / GIF / BMP / WebP(VP8X)", () => {
  assert.ok(sniffImageMime(pngBase64(10, 10)) === "image/png");
  assert.ok(sniffImageMime(jpegBase64(10, 10)) === "image/jpeg");
  assert.ok(sniffImageMime(gifBase64(10, 10)) === "image/gif");
  assert.ok(sniffImageMime(bmpBase64(10, 10)) === "image/bmp");
  assert.ok(sniffImageMime(webpVp8xBase64(10, 10)) === "image/webp");
  assert.deepEqual(imageSizeOfBase64(pngBase64(640, 480)), { width: 640, height: 480 });
  assert.deepEqual(imageSizeOfBase64(jpegBase64(320, 200)), { width: 320, height: 200 });
  assert.deepEqual(imageSizeOfBase64(gifBase64(64, 32)), { width: 64, height: 32 });
  assert.deepEqual(imageSizeOfBase64(bmpBase64(100, 60)), { width: 100, height: 60 });
  assert.deepEqual(imageSizeOfBase64(webpVp8xBase64(1500, 900)), { width: 1500, height: 900 });
  assert.equal(imageSizeOfBase64("bm90IGFuIGltYWdl"), null);
});

test("generateImage：inline b64 直接返回 dataURL 与真实宽高", async () => {
  const calls = [];
  const png = pngBase64(640, 480);
  const out = await generateImage(CFG, "画一只猫", async (req) => {
    calls.push(req);
    return proxyOk(JSON.stringify({ data: [{ b64_json: png, revised_prompt: "猫" }] }));
  });
  assert.equal(calls.length, 1, "inline 不需要二次下载");
  assert.equal(calls[0].method, "POST");
  assert.equal(calls[0].url, "https://api.example.com/v1/images/generations");
  assert.equal(out.mime, "image/png");
  assert.equal(out.base64, png);
  assert.equal(out.dataURL, `data:image/png;base64,${png}`);
  assert.equal(out.width, 640);
  assert.equal(out.height, 480);
  assert.equal(out.revisedPrompt, "猫");
});

test("generateImage：url 响应经代理下载，content-type 决定 MIME", async () => {
  const calls = [];
  const bytes = Buffer.from("fake-jpeg-bytes").toString("base64");
  const out = await generateImage(CFG, "猫", async (req) => {
    calls.push(req);
    if (calls.length === 1) return proxyOk(JSON.stringify({ data: [{ url: "https://cdn.example.com/a.jpg" }] }));
    return proxyOk(bytes, { "Content-Type": "image/jpeg; charset=binary" });
  });
  assert.equal(calls.length, 2);
  assert.equal(calls[1].method, "GET");
  assert.equal(calls[1].url, "https://cdn.example.com/a.jpg");
  assert.equal(calls[1].responseEncoding, "base64");
  assert.equal(out.mime, "image/jpeg");
  assert.equal(out.dataURL, `data:image/jpeg;base64,${bytes}`);
  assert.equal(out.width, 1024, "认不出尺寸时回退 1024");
  assert.equal(out.height, 1024);
});

test("generateImage：HTTP / 转发 / JSON / 下载 / 超限各失败路径", async () => {
  await assert.rejects(
    generateImage(CFG, "猫", async () => ({ ...proxyOk("unauthorized"), status: 401 })),
    /图像 API HTTP 401：unauthorized/,
  );
  await assert.rejects(
    generateImage(CFG, "猫", async () => ({ code: -1, msg: "请求超时", status: 0, headers: {}, body: "" })),
    /思源转发失败：请求超时/,
  );
  await assert.rejects(generateImage(CFG, "猫", async () => proxyOk("<html>")), /不是 JSON/);
  await assert.rejects(
    generateImage(CFG, "猫", async (req) =>
      req.method === "GET"
        ? { code: 0, msg: "", status: 404, headers: {}, body: "" }
        : proxyOk(JSON.stringify({ data: [{ url: "https://cdn.example.com/a.png" }] })),
    ),
    /图片下载 HTTP 404/,
  );
  await assert.rejects(
    generateImage(CFG, "猫", async (req) =>
      req.method === "GET"
        ? proxyOk("aGVsbG8=", { "Content-Type": "image/png" })
        : proxyOk(JSON.stringify({ data: [{ url: "ftp://cdn.example.com/a.png" }] })),
    ),
    /不是 http\(s\)/,
  );

  const huge = "A".repeat(Math.ceil(((MAX_IMAGE_BYTES + 1) * 4) / 3));
  await assert.rejects(
    generateImage(CFG, "猫", async () => proxyOk(`{"data":[{"b64_json":"${huge}"}]}`)),
    /生成的图片过大/,
  );
});

test("generateImage：错误信息不含 Authorization / API Key", async () => {
  let message = "";
  try {
    await generateImage(CFG, "猫", async () => proxyOk(JSON.stringify({ error: { message: "invalid key" } })));
  } catch (e) {
    message = e.message;
  }
  assert.match(message, /图像 API：invalid key/);
  assert.equal(message.includes("sk-imagegen-test"), false);
  assert.equal(message.toLowerCase().includes("authorization"), false);
});
