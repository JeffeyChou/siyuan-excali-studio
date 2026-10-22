// M1 内嵌 scene 解码：往返测试用的编码器是**照格式独立重写**的一份（只借 pako，
// 不 import vendor），避免「用同一份错误假设自证正确」。
//
// 三种形态各走一遍（都是真实存在过的导出格式）：
//   v2 + compressed —— 插件与 excalidraw.com 现在的形态
//   v2 + 未压缩      —— encoding:"bstring" 但 compressed:false
//   v1               —— 更早的裸 base64(utf8 JSON scene)
//
// 字节口径（对齐 vendor 的 Li/Di）：
//   v2 外层 = base64( JSON 字符串的 **latin1 字节** )  ← btoa 只接受 ≤0xFF 的字符
//   v1 内层 = base64( scene JSON 的 **utf8 字节** )
// 两者不对称是历史包袱，这里刻意按各自的真实口径写，不做统一。
import { test } from "node:test";
import assert from "node:assert/strict";
import { deflate } from "pako";
import { SceneError, decodeSvgPayload, encodeSvgPayload, hasEmbeddedScene, hasNonEmptyScene, sceneSemanticsOf, sceneTextsEquivalent } from "../src/studio/scene-codec.ts";

const SCENE = {
  type: "excalidraw",
  version: 2,
  source: "https://excalidraw.com",
  elements: [
    { id: "text-1", type: "text", text: "白板 · hand-drawn ✓", fontSize: 20, x: 0, y: 0 },
    { id: "rect-1", type: "rectangle", width: 120, height: 80, x: 10, y: 20 },
  ],
  appState: { viewBackgroundColor: "#ffffff", exportEmbedScene: true },
  files: { "file-1": { id: "file-1", mimeType: "image/png", dataURL: "data:image/png;base64,AAAA" } },
};

/** 按 vendor 的 I7 拼 metadata：注释三段 + 中间一个纯文本节点 */
function wrapSvg(version, base64) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" version="1.1">
  <!-- svg-source:excalidraw -->
  <metadata>
    <!-- payload-type:application/vnd.excalidraw+json -->
    <!-- payload-version:${version} -->
    <!-- payload-start -->${base64}<!-- payload-end -->
  </metadata>
  <rect x="0" y="0" width="120" height="80"/>
</svg>`;
}

function encodeV2(scene, compressed) {
  const sceneJson = JSON.stringify(scene);
  const encoded = compressed
    ? Buffer.from(deflate(Buffer.from(sceneJson, "utf8"))).toString("latin1")
    : Buffer.from(sceneJson, "utf8").toString("latin1");
  const outer = JSON.stringify({ version: "1", encoding: "bstring", compressed, encoded });
  return wrapSvg(2, Buffer.from(outer, "latin1").toString("base64"));
}

function encodeV1(scene) {
  return wrapSvg(1, Buffer.from(JSON.stringify(scene), "utf8").toString("base64"));
}

/** 插件自己写出的形态（payload-version:2 + compressed），语义门测的就是这个 */
const svgOf = (scene) => `<svg xmlns="http://www.w3.org/2000/svg">${encodeSvgPayload(scene)}</svg>`;

test("往返·v2 压缩载荷（现行导出形态）", () => {
  const svg = encodeV2(SCENE, true);
  assert.equal(hasEmbeddedScene(svg), true);
  const scene = decodeSvgPayload(svg);
  assert.equal(scene.elements.length, 2);
  assert.equal(scene.elements[0].text, "白板 · hand-drawn ✓", "多字节字符要完整穿过去");
  assert.equal(scene.elements[1].width, 120);
  assert.equal(scene.appState.viewBackgroundColor, "#ffffff");
  assert.equal(scene.files["file-1"].mimeType, "image/png");
});

test("往返·v2 未压缩载荷（bstring 但不 deflate）", () => {
  const scene = decodeSvgPayload(encodeV2(SCENE, false));
  assert.equal(scene.elements.length, 2);
  assert.equal(scene.elements[0].text, "白板 · hand-drawn ✓");
});

test("往返·v1 裸 base64(utf8 JSON)", () => {
  const scene = decodeSvgPayload(encodeV1(SCENE));
  assert.equal(scene.elements.length, 2);
  assert.equal(scene.elements[1].type, "rectangle");
});

test("hasNonEmptyScene：BAK 链条门——非空真，空画板/坏档/无载荷假且不抛（第十九轮）", () => {
  assert.equal(hasNonEmptyScene(encodeV2(SCENE, true)), true);
  assert.equal(hasNonEmptyScene(encodeV1(SCENE)), true, "v1 老形态同样认");
  assert.equal(hasNonEmptyScene(encodeV2({ ...SCENE, elements: [] }, true)), false, "空画板不配进备份链");
  assert.equal(hasNonEmptyScene("<svg></svg>"), false, "没载荷直接假，不该走到抛错");
  assert.equal(hasNonEmptyScene(wrapSvg(2, "!!!坏 base64!!!")), false, "坏载荷吞成 false");
});

test("往返·metadata 被格式化过（payload 前后有空白）也要认", () => {
  const svg = encodeV2(SCENE, true).replace("<!-- payload-end -->", "\n    <!-- payload-end -->");
  assert.equal(decodeSvgPayload(svg).elements.length, 2, "vendor 的 mp 允许空白，我们也得允许");
});

test("失败原因可区分：没载荷 / 类型不对 / 载荷坏了 / 编码不支持 / 空图", () => {
  const plain = `<svg xmlns="http://www.w3.org/2000/svg"><rect/></svg>`;
  assert.equal(hasEmbeddedScene(plain), false);
  assert.throws(() => decodeSvgPayload(plain), (e) => e instanceof SceneError && e.reason === "no-payload");

  // 有 payload-type 但没有 start/end 标记
  const half = `<svg><!-- payload-type:application/vnd.excalidraw+json --><!-- payload-version:2 --></svg>`;
  assert.throws(() => decodeSvgPayload(half), (e) => e.reason === "no-payload");

  // 载荷是合法 base64 但解出来不是 excalidraw
  const alien = wrapSvg(2, Buffer.from(JSON.stringify({ hello: "world" })).toString("base64"));
  assert.throws(() => decodeSvgPayload(alien), (e) => e.reason === "wrong-type");

  // base64 圈了非 base64 的东西
  const broken = wrapSvg(2, "!!!not-base64!!!");
  assert.throws(() => decodeSvgPayload(broken), (e) => e.reason === "bad-payload");

  // 编码字段不认识
  const weird = wrapSvg(
    2,
    Buffer.from(JSON.stringify({ version: "1", encoding: "utf8-ish", compressed: false, encoded: "x" })).toString("base64"),
  );
  assert.throws(() => decodeSvgPayload(weird), (e) => e.reason === "unsupported-encoding");

  // 第二十一轮：空 scene（显式空数组）是合法状态——创建即文件产生的空白板、
  // 用户清空后没再画的文件都是它，点开该是正常空画板而不是错误页
  const empty = encodeV2({ type: "excalidraw", elements: [], appState: {}, files: {} }, true);
  const decoded = decodeSvgPayload(empty);
  assert.equal(decoded.elements.length, 0, "空 scene 应解出 0 元素");

  // 键缺失仍是坏档（不是本插件写出的 scene）
  const noElements = encodeV2({ type: "excalidraw", appState: {}, files: {} }, true);
  assert.throws(() => decodeSvgPayload(noElements), (e) => e.reason === "bad-payload");
});

test("失败原因可读：SceneError.message 带 reason，detail 可空", () => {
  const err = new SceneError("wrong-type", "png");
  assert.equal(err.name, "SceneError");
  assert.match(err.message, /scene:wrong-type \(png\)/);
  assert.match(new SceneError("no-payload").message, /scene:no-payload$/);
});

/* ---------- 第五十四轮：语义等价门（同一段 scene 的两份文本不许再落盘） ----------
 * 逐字比较不够用：vendor 的 restore 会把 boundElements: null 读成 []、按键序重排，
 * 于是「打开没动」也能算出两份不同的 SVG 文本，把备份链滚出去、把 mtime 刷掉。
 */

test("sceneSemanticsOf：不是白板/载荷坏了都回 null，不许拿 null 当「两边相同」", () => {
  assert.equal(sceneSemanticsOf("<svg><rect/></svg>"), null, "无载荷");
  assert.equal(sceneSemanticsOf("<svg><!-- svg-source:excalidraw --><metadata>x</metadata></svg>"), null, "载荷解不出");
  assert.notEqual(sceneSemanticsOf(svgOf({ elements: [], appState: {}, files: {} })), null, "空画板也有签名");
});

test("sceneTextsEquivalent：归一化差异算等价，真改动算不等", () => {
  const scene = {
    elements: [{ id: "r1", type: "rectangle", x: 0, y: 0, width: 10, height: 10, boundElements: [] }],
    appState: { viewBackgroundColor: "#ffffff" },
    files: {},
  };
  const a = svgOf(scene);
  assert.equal(sceneTextsEquivalent(a, a), true, "逐字相同先短路");

  // boundElements: null 与 [] 与缺失 —— 三种写法是同一份内容
  const nullish = svgOf({
    ...scene,
    elements: [{ id: "r1", type: "rectangle", x: 0, y: 0, width: 10, height: 10, boundElements: null }],
  });
  assert.equal(sceneTextsEquivalent(a, nullish), true, "null 视同空数组");
  const stripped = svgOf({
    ...scene,
    elements: [{ id: "r1", type: "rectangle", x: 0, y: 0, width: 10, height: 10 }],
  });
  assert.equal(sceneTextsEquivalent(a, stripped), true, "键整段消失也等价");

  // 键序不同（vendor 重排过）
  const reordered = svgOf({
    elements: [{ type: "rectangle", height: 10, width: 10, y: 0, x: 0, id: "r1", boundElements: [] }],
    appState: { viewBackgroundColor: "#ffffff" },
    files: {},
  });
  assert.equal(sceneTextsEquivalent(a, reordered), true, "键序不算改动");

  // 真改动：几何、appState、图片任一处变了都必须落盘
  const moved = svgOf({ ...scene, elements: [{ id: "r1", type: "rectangle", x: 40, y: 0, width: 10, height: 10 }] });
  assert.equal(sceneTextsEquivalent(a, moved), false, "挪了 40px 要写");
  const bg = svgOf({ ...scene, appState: { viewBackgroundColor: "#f8f5ee" } });
  assert.equal(sceneTextsEquivalent(a, bg), false, "画布背景变了要写");
  const withFile = svgOf({ ...scene, files: { "f1": { id: "f1", mimeType: "image/png", dataURL: "data:image/png;base64,AAAA" } } });
  assert.equal(sceneTextsEquivalent(a, withFile), false, "贴图多了要写");

  // 任一侧解不出 = 不认等价，照常写（宁可多写一次，不许把能修的档当等价吞掉）
  assert.equal(sceneTextsEquivalent(a, "<svg>x</svg>"), false);
  assert.equal(sceneTextsEquivalent("<svg>x</svg>", "<svg>y</svg>"), false);
});
