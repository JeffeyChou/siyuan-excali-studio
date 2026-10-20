/**
 * T2 大场景压测：给「舒适」定基线数字。
 *
 * 生成 1000 元素 + 50 张图的白板 scene，实测三个数字：
 *   1) 保存侧：scene JSON → deflate → base64（落盘 SVG 里 payload 的编码全链，
 *      即 sceneToSvgText 中尺寸与耗时的主导段；exportToSvg 的 DOM 渲染部分
 *      Node 里测不了，真机开 Performance 面板可补）
 *   2) 文件体积：payload 编码后的字节数（即 SVG 文件大小的主导项）
 *   3) 打开侧：SVG 文本 → decodeSvgPayload（开板时 scene-codec 的解析全链）
 *
 * 另算一组「图片外置」对照：同样 1000 元素、图片改为外部文件引用（files 清空），
 * 量化 T1 能省下多少体积。跑法：node scripts/bench-large-scene.mjs
 */

import { deflate } from "pako";
import { randomBytes } from "node:crypto";
import { performance } from "node:perf_hooks";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { decodeSvgPayload } from "../src/studio/scene-codec.ts";

const HERE = dirname(fileURLToPath(import.meta.url));

/* ---------- 造数据 ---------- */

/** 真随机字节：真实 PNG/JPEG 导入件本身已是压缩格式，deflate 压不动——这是最贴近实际的不可压模型 */

/** 50 张「截图级」PNG：每张原始 ~40KB → base64 后 ~53KB，贴近真实导入图片 */
function makeFiles(count, bytesPerImage) {
  const files = {};
  for (let i = 0; i < count; i++) {
    const id = `file-bench-${String(i).padStart(3, "0")}`;
    const b64 = randomBytes(bytesPerImage).toString("base64");
    files[id] = { id, dataURL: `data:image/png;base64,${b64}`, mimeType: "image/png", created: 1760000000000 + i };
  }
  return files;
}

function makeElements(n) {
  const els = [];
  for (let i = 0; i < n; i++) {
    const kind = i % 10;
    if (kind < 4) {
      els.push({ id: `el-${i}`, type: "rectangle", x: (i * 37) % 8000, y: (i * 53) % 6000, width: 120, height: 80, angle: 0, strokeColor: "#1e1e1e", backgroundColor: "#a5d8ff", fillStyle: "solid", strokeWidth: 2, strokeStyle: "solid", roughness: 1, opacity: 100, groupIds: [], frameId: null, roundness: { type: 3 }, seed: i + 1, version: 1, versionNonce: i + 2, isDeleted: false, boundElements: null, updated: 1760000000, link: null, locked: false });
    } else if (kind < 7) {
      els.push({ id: `el-${i}`, type: "ellipse", x: (i * 41) % 8000, y: (i * 59) % 6000, width: 90, height: 90, angle: 0, strokeColor: "#e03131", backgroundColor: "transparent", fillStyle: "hachure", strokeWidth: 2, strokeStyle: "solid", roughness: 1, opacity: 100, groupIds: [], frameId: null, roundness: null, seed: i + 3, version: 1, versionNonce: i + 4, isDeleted: false, boundElements: null, updated: 1760000000, link: null, locked: false });
    } else if (kind < 9) {
      const pts = [];
      for (let p = 0; p < 60; p++) pts.push([p * 4.1, Math.sin(p + i) * 22]);
      els.push({ id: `el-${i}`, type: "freedraw", x: (i * 43) % 8000, y: (i * 61) % 6000, width: 244, height: 44, angle: 0, strokeColor: "#1e1e1e", backgroundColor: "transparent", fillStyle: "solid", strokeWidth: 2, strokeStyle: "solid", roughness: 1, opacity: 100, groupIds: [], frameId: null, roundness: null, seed: i + 5, version: 1, versionNonce: i + 6, isDeleted: false, boundElements: null, updated: 1760000000, link: null, locked: false, points: pts, pressures: [], simulatePressure: true, lastCommittedPoint: null });
    } else {
      els.push({ id: `el-${i}`, type: "text", x: (i * 47) % 8000, y: (i * 67) % 6000, width: 200, height: 25, angle: 0, strokeColor: "#1e1e1e", backgroundColor: "transparent", fillStyle: "solid", strokeWidth: 2, strokeStyle: "solid", roughness: 1, opacity: 100, groupIds: [], frameId: null, roundness: null, seed: i + 7, version: 1, versionNonce: i + 8, isDeleted: false, boundElements: null, updated: 1760000000, link: null, locked: false, text: "白板压测第 " + i + " 行文本内容", fontSize: 20, fontFamily: 5, textAlign: "left", verticalAlign: "top", containerId: null, originalText: "白板压测第 " + i + " 行文本内容", lineHeight: 1.25, baseline: 18 });
    }
  }
  return els;
}

const N_ELEMENTS = 1000;
const N_IMAGES = 50;
const IMAGE_BYTES = 40 * 1024;

const elements = makeElements(N_ELEMENTS);
const files = makeFiles(N_IMAGES, IMAGE_BYTES);
const appState = { viewBackgroundColor: "", gridSize: null, exportEmbedScene: true, exportWithDarkMode: false };

/* ---------- 保存侧：JSON → deflate → base64 ---------- */

const sceneJson = JSON.stringify({ type: "excalidraw", version: 2, source: "siyuan-excali-studio-bench", elements, files, appState });
const jsonBytes = Buffer.byteLength(sceneJson);

let t0 = performance.now();
const deflated = deflate(Buffer.from(sceneJson, "utf8"));
const tDeflate = performance.now() - t0;

const latin1 = Buffer.from(deflated); // deflate 输出当 latin1 字节串（vendor 的 bstring 编码同思路）
t0 = performance.now();
const b64 = latin1.toString("base64");
const tBase64 = performance.now() - t0;

/* 组装成 decodeSvgPayload 能吃的 SVG 文本（metadata 注释 + payload 段，和 vendor 产物同构）。
   bstring 编码：encoded 就是 deflate 字节串的 latin1 直存（解码侧 latin1ToBytes 还原）。 */
const encodedStr = Buffer.from(deflated).toString("latin1");
const payload = JSON.stringify({ version: "1", encoding: "bstring", compressed: true, encoded: encodedStr });
const b64Payload = Buffer.from(payload, "latin1").toString("base64"); // bstring：每字符一字节，对齐 vendor 的 btoa 语义
const svgText =
  `<svg xmlns="http://www.w3.org/2000/svg" width="8000" height="6000" viewBox="0 0 8000 6000">` +
  `<metadata>` +
  `<!-- payload-type:application/vnd.excalidraw+json -->` +
  `<!-- payload-version:2 -->` +
  `<!-- payload-start -->${b64Payload}<!-- payload-end -->` +
  `</metadata>` +
  `<g></g></svg>`;
const svgSize = Buffer.byteLength(svgText);

/* ---------- 打开侧：decodeSvgPayload ---------- */

// 预热一次（首跑含 JIT/正则编译，不算数）
decodeSvgPayload(svgText);
t0 = performance.now();
const decoded = decodeSvgPayload(svgText);
const tDecode = performance.now() - t0;

/* ---------- 对照：图片外置（T1 的收益量化） ---------- */

const sceneJsonExt = JSON.stringify({ type: "excalidraw", version: 2, source: "siyuan-excali-studio-bench", elements, files: {}, appState });
const deflatedExt = deflate(Buffer.from(sceneJsonExt, "utf8"));
const extPayload = JSON.stringify({ version: "1", encoding: "bstring", compressed: true, encoded: Buffer.from(deflatedExt).toString("latin1") });
const extSize = Buffer.byteLength(extPayload) + 300; // + metadata/SVG 骨架开销

/* ---------- 汇报 ---------- */

const fmtMB = (b) => (b / 1024 / 1024).toFixed(2) + " MB";
const fmtKB = (b) => Math.round(b / 1024) + " KB";
const fmtMs = (ms) => (ms >= 100 ? Math.round(ms) + " ms" : ms.toFixed(1) + " ms");

console.log("== T2 大场景压测基线（1000 元素 + 50 张 40KB 图） ==");
console.log(`scene JSON 原始体积        ${fmtMB(jsonBytes)}（其中图片 dataURL 约 ${fmtMB(N_IMAGES * IMAGE_BYTES * 1.37)}）`);
console.log(`保存·deflate 耗时          ${fmtMs(tDeflate)}`);
console.log(`保存·base64 耗时           ${fmtMs(tBase64)}`);
console.log(`保存·编码合计              ${fmtMs(tDeflate + tBase64)}`);
console.log(`落盘文件体积               ${fmtMB(svgSize)}`);
console.log(`打开·decodeSvgPayload 耗时 ${fmtMs(tDecode)}（解出 ${decoded.elements.length} 元素 + ${Object.keys(decoded.files ?? {}).length} 图）`);
console.log("");
console.log("== 对照：图片外置（T1 预期收益） ==");
console.log(`scene 体积（图片内嵌）     ${fmtKB(svgSize)}`);
console.log(`scene 体积（图片外置引用） ${fmtKB(extSize)}`);
console.log(`体积缩减                   ${(100 - (extSize / svgSize) * 100).toFixed(1)}%`);
console.log("");
console.log(`decode 结果一致性          ${decoded.elements.length === N_ELEMENTS && Object.keys(decoded.files ?? {}).length === N_IMAGES ? "OK" : "FAIL"}`);

writeFileSync(join(HERE, "bench-large-scene-baseline.json"), JSON.stringify({
  date: new Date().toISOString(), nElements: N_ELEMENTS, nImages: N_IMAGES, imageBytes: IMAGE_BYTES,
  jsonBytes, tDeflateMs: tDeflate, tBase64Ms: tBase64, svgSizeBytes: svgSize, tDecodeMs: tDecode,
  externalRefSizeBytes: extSize,
}, null, 2));
console.log("基线已写入 scripts/bench-large-scene-baseline.json");
