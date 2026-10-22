/**
 * 内嵌 scene 的**纯解码**（SVG 文本 → scene JSON 对象）
 * ------------------------------------------------------------------
 * 与 scene.ts 分开的原因：这一步不依赖 @excalidraw/excalidraw（那个包会 import CSS，
 * Node 里跑不了），于是单测可以直接喂 SVG 文本做往返。
 *
 * 编码侧在 Excalidraw 里（exportToSvg + appState.exportEmbedScene），
 * 这里只做反向解码。算法逐条对齐 0.18.1 产物里的 I7 / Di / Si / vi / mp
 * （node_modules/@excalidraw/excalidraw/dist/prod/chunk-*.js），
 * 因为 `decodeSvgBase64Payload` 这些内部函数**没有公开导出**：
 *
 * 1) `<metadata>` 里是若干注释：
 *      <!-- payload-type:application/vnd.excalidraw+json -->
 *      <!-- payload-version:2 -->
 *      <!-- payload-start --><纯 ASCII base64><!-- payload-end -->
 * 2) version ≥ 2 时：base64 → JSON 字符串，形如
 *      {version:"1", encoding:"bstring", compressed:true, encoded:<deflate 后的 latin1 字节串>}
 *    再 pako.inflate 得到真正的 scene JSON。（version 1 是早期的裸 scene JSON。）
 * 3) encoded 包装在 vendor 里有两处分支，这里**两种都支持**：
 *    - `encoded` 字段存在 → 按 encoding/compressed 解；
 *    - 否则若 `type === "excalidraw"` → 该 JSON 本身就是 scene。
 */

import { deflate, inflate } from "pako";

/** Excalidraw 内嵌 scene 的识别标记：导出时写在 <svg> 首个注释节点 */
export const SCENE_MARKER = "svg-source:excalidraw";

/** scene 载荷的类型标识，来自 Excalidraw 的 MIME_TYPES.excalidraw（写死不引包，避免解码模块依赖组件库内部常量） */
const PAYLOAD_TYPE = "application/vnd.excalidraw+json";
/** 与 vendor 的 mp 同一口径：payload-start/end 两侧允许空白（美化过的 SVG 会带缩进换行） */
const PAYLOAD_START = /<!-- payload-start -->\s*([\s\S]+?)\s*<!-- payload-end -->/;
const PAYLOAD_VERSION = /<!-- payload-version:(\d+) -->/;

export type ScenePayload = {
  elements: unknown[];
  appState: Record<string, unknown>;
  files: Record<string, unknown>;
};

export type SceneFailReason =
  | "no-payload"
  | "wrong-type"
  | "bad-payload"
  | "unsupported-encoding"
  | "unsupported-version";

export class SceneError extends Error {
  // 不用「构造函数参数属性」写法：测试跑在 node --experimental-strip-types（strip-only）下，
  // 那种语法过不了解析（ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX）。
  readonly reason: SceneFailReason;
  readonly detail?: string;

  constructor(reason: SceneFailReason, detail?: string) {
    super(`scene:${reason}${detail ? ` (${detail})` : ""}`);
    this.reason = reason;
    this.detail = detail;
    this.name = "SceneError";
  }
}

/** latin1 字符串 → 字节（vendor 的 d6 等价物） */
function latin1ToBytes(s: string): Uint8Array {
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i) & 0xff;
  return out;
}

/** latin1 字符串 → UTF-8 字符串（vendor 的 c6 等价物） */
function latin1ToUtf8(s: string): string {
  return new TextDecoder("utf-8").decode(latin1ToBytes(s));
}

/** base64 → 字符串；compressed=true 时按 pako(deflate) 解压 */
function base64ToText(b64: string, compressed: boolean): string {
  const bin = atob(b64);
  return compressed ? inflate(latin1ToBytes(bin), { to: "string" }) : latin1ToUtf8(bin);
}

/** 这个 SVG 是否带 Excali 白板的内嵌数据（用于入口菜单判定，不抛错） */
export function hasEmbeddedScene(svgText: string): boolean {
  return svgText.includes(SCENE_MARKER) && PAYLOAD_START.test(svgText);
}

/**
 * 2026-10-17 第十九轮：内容是否是一份「非空白板」（不抛版：解不出或零元素都算 false）。
 * BAK 链条的入链/恢复门都吃它——坏文件和空画板不该挤掉好备份
 * （对齐 Obsidian 的 hasNonDeletedElements 门：备份恒为最后一次有效保存的内容）。
 * 第二十一轮注：空 scene 现在解得出（合法状态），这里仍按零元素判 false——
 * 「能打开」和「有备份价值」是两回事，空白板入链只会挤掉好备份。
 */
export function hasNonEmptyScene(svgText: string): boolean {
  if (!hasEmbeddedScene(svgText)) return false;
  try {
    return decodeSvgPayload(svgText).elements.length > 0;
  } catch {
    return false;
  }
}

/** 从导出过的 SVG 文本里解出 scene 三件套（未做 Excalidraw 归一）。失败一律抛 SceneError。 */
export function decodeSvgPayload(svgText: string): ScenePayload {
  if (!svgText.includes(PAYLOAD_TYPE)) throw new SceneError("no-payload");
  const versionMatch = PAYLOAD_VERSION.exec(svgText);
  const version = versionMatch ? Number(versionMatch[1]) : 1;
  const match = PAYLOAD_START.exec(svgText);
  if (!match) throw new SceneError("no-payload", "缺 payload-start/end 标记");

  // version 1 的载荷是 base64(utf8 JSON)，且**不解压**；≥2 是 base64(包装 JSON)
  let outer: string;
  try {
    outer = version === 1 ? base64ToText(match[1], false) : atob(match[1]);
  } catch (e) {
    throw new SceneError("bad-payload", e instanceof Error ? e.message : String(e));
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(outer);
  } catch {
    throw new SceneError("bad-payload", "载荷不是合法 JSON");
  }
  if (!parsed || typeof parsed !== "object") throw new SceneError("bad-payload", "载荷不是对象");

  const scene = unwrapPayload(parsed as Record<string, unknown>);
  if (scene.type !== "excalidraw") throw new SceneError("wrong-type", String(scene.type));

  // 第二十一轮：创建即文件，空 scene（显式空数组）是合法状态——新建的白板文件
  // 还没画一笔，用户清空后没再画的文件也是它，点开都该是正常空画板。
  // 键缺失/非数组仍是坏档（不是本插件写出的 scene）。
  if (!Array.isArray(scene.elements)) throw new SceneError("bad-payload", "scene 缺 elements 数组");
  const elements = scene.elements;

  return {
    elements,
    appState: (scene.appState && typeof scene.appState === "object" ? scene.appState : {}) as Record<string, unknown>,
    files: (scene.files && typeof scene.files === "object" ? scene.files : {}) as Record<string, unknown>,
  };
}

/** 处理 encoded 包装（vendor 的 Si/vi 对）；返回 scene 对象 */
function unwrapPayload(outer: Record<string, unknown>): Record<string, unknown> {
  if (!("encoded" in outer)) {
    if (outer.type === "excalidraw") return outer;
    throw new SceneError("wrong-type", typeof outer.type === "string" ? outer.type : "unknown");
  }
  const encoding = outer.encoding;
  if (encoding !== "bstring") throw new SceneError("unsupported-encoding", String(encoding));
  const encoded = outer.encoded;
  if (typeof encoded !== "string") throw new SceneError("bad-payload", "encoded 字段不是字符串");
  const compressed = outer.compressed === true;
  let text: string;
  try {
    text = compressed ? inflate(latin1ToBytes(encoded), { to: "string" }) : latin1ToUtf8(encoded);
  } catch (e) {
    throw new SceneError("bad-payload", e instanceof Error ? e.message : String(e));
  }
  let inner: unknown;
  try {
    inner = JSON.parse(text);
  } catch {
    throw new SceneError("bad-payload", "scene JSON 解析失败");
  }
  if (!inner || typeof inner !== "object") throw new SceneError("bad-payload", "scene 不是对象");
  return inner as Record<string, unknown>;
}

/**
 * 第五十四轮：两份 SVG 的**语义**比较（同一段 scene 的两份文本可能字节不同）。
 *
 * 起因是实测：一块板什么都没编辑，重开后磁盘上仍会多一次覆盖写。差异全来自
 * vendor 的归一化——`boundElements: null` 读回来变 `[]`、缺省键被补齐。字节比
 * 一定不等，于是每次保存都刷一次 mtime（多端同步跟着抖、最近列表跟着跳）。
 *
 * 这里把载荷规范化成一根可比的串：
 * - 递归丢键（按名排序，键序变化不算差异）、丢掉值为 null/undefined 的键
 *   （Excalidraw 里「没有这个键」和「显式 null」同义）；
 * - `boundElements` 的空数组等同于缺键（归一化的主要产物）；
 * - 解不出载荷回 null，调用方按「判不了就写」处理，绝不因为比较失败而丢改动。
 */
function canonicalScene(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalScene);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    const src = value as Record<string, unknown>;
    for (const key of Object.keys(src).sort()) {
      const v = src[key];
      if (v === null || v === undefined) continue;
      if (key === "boundElements" && Array.isArray(v) && v.length === 0) continue;
      out[key] = canonicalScene(v);
    }
    return out;
  }
  return value;
}

/** SVG 文本 → 载荷的语义签名；解不出（不是白板 / 载荷坏了）返回 null */
export function sceneSemanticsOf(svgText: string): string | null {
  if (!hasEmbeddedScene(svgText)) return null;
  try {
    const scene = decodeSvgPayload(svgText);
    return JSON.stringify(canonicalScene({ elements: scene.elements, appState: scene.appState, files: scene.files }));
  } catch {
    return null;
  }
}

/** 两份落盘文本是否语义等价（任一侧解不出都算不等，交给调用方照常写） */
export function sceneTextsEquivalent(a: string, b: string): boolean {
  if (a === b) return true;
  const sa = sceneSemanticsOf(a);
  const sb = sceneSemanticsOf(b);
  return sa !== null && sa === sb;
}

/* ---------------------- 编码侧（第二十六轮 T1） ----------------------
 * 过去编码全交给 vendor（exportToSvg + exportEmbedScene），vendor 会把 files 的
 * dataURL 原样塞进载荷——图片内嵌正是文件膨胀 2.1 倍的根源。T1 起「预览交给
 * vendor、载荷自己编」：exportToSvg 不带 exportEmbedScene（<image> 预览照画），
 * 载荷由 encodeSvgPayload 生成（files 可以换成外置引用），再注入 <metadata>。
 * 编码算法就是上面解码的镜像，格式与 vendor/excalidraw.com 产物同构，互认不破。
 */

/** 字节 → latin1 字符串（vendor bstring 的写入侧） */
function bytesToLatin1(bytes: Uint8Array): string {
  let out = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    out += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return out;
}

/** 落盘时保留的 appState 键白名单（对齐 vendor 的四键 + T4 双主题槽位） */
const PERSISTED_APP_STATE_KEYS = [
  "viewBackgroundColor",
  "gridSize",
  "gridStep",
  "gridModeEnabled",
  "excaliLightBg",
  "excaliDarkBg",
] as const;

/** 全量 appState → 载荷里的小 appState（只留会话间有意义的键，undefined 的槽位不写） */
export function persistableAppState(appState: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of PERSISTED_APP_STATE_KEYS) {
    const value = appState[key];
    if (value === undefined) continue;
    if ((key === "excaliLightBg" || key === "excaliDarkBg") && value === "") continue;
    out[key] = value;
  }
  return out;
}

export type EncodableScene = {
  elements: unknown[];
  appState: Record<string, unknown>;
  files: Record<string, unknown>;
};

/**
 * scene 三件套 → SVG `<metadata>` 载荷段（含 svg-source 标记注释）。
 * 返回值以 `<!-- svg-source:excalidraw -->` 开头、`</metadata>` 结尾，
 * 调用方负责插进 `<svg ...>` 开标签之后。bstring 编码：deflate → latin1
 * 字节串 → base64（latin1 包 base64，对齐 vendor 的 btoa 语义）。
 */
export function encodeSvgPayload(scene: EncodableScene): string {
  const inner = JSON.stringify({
    type: "excalidraw",
    version: 2,
    source: "siyuan-excali-studio",
    elements: scene.elements,
    files: scene.files,
    appState: persistableAppState(scene.appState),
  });
  const wrapper = JSON.stringify({
    version: "1",
    encoding: "bstring",
    compressed: true,
    encoded: bytesToLatin1(deflate(new TextEncoder().encode(inner))),
  });
  const b64 = btoa(wrapper);
  return (
    `<!-- ${SCENE_MARKER} -->` +
    `<metadata>` +
    `<!-- payload-type:application/vnd.excalidraw+json -->` +
    `<!-- payload-version:2 -->` +
    `<!-- payload-start -->${b64}<!-- payload-end -->` +
    `</metadata>`
  );
}
