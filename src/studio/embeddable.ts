/**
 * 第三十一轮（方向 A）：画布内嵌思源块/文档。
 *
 * 机制与 Obsidian Excalidraw 的 transclusion、siyuan-embed-excalidraw 的 embed 页同路：
 * vendor 0.18.1 原生 Embeddable 元素，iframe 指向本插件 embed/siyuan 渲染页，
 * 页面与内核同源、直接 fetch /api/block/getBlockDOM 拿思源原生渲染的块 HTML
 * （渲染交给内核 Lute，本插件零渲染依赖、零第三方打包——比对标插件
 * 「exportMdContent + Vditor 自渲染」少 4MB 级静态资产）。
 *
 * 关于 newEmbeddableElement：vendor 的该工厂只从内部路径导出（子路径有 types
 * 条件、运行时不可 import），root 也没再导出——与 makeImageElement 同一局面，
 * 按字段形状手工构造（embeddable = 基础字段 + type + link；updateScene 时 vendor
 * 的 restore 分支明确支持 "embeddable"，会补齐缺省、重排 seed/index）。
 */

/** vendor 内部工厂不可用，embeddable 元素按类型形状手工构造（见文件头说明） */
export function makeEmbeddableElement(opts: {
  id: string;
  link: string;
  x: number;
  y: number;
  width: number;
  height: number;
  index: string;
  seed: number;
}): Record<string, unknown> {
  const now = Date.now();
  return {
    id: opts.id,
    type: "embeddable",
    x: opts.x,
    y: opts.y,
    width: opts.width,
    height: opts.height,
    angle: 0,
    strokeColor: "transparent",
    backgroundColor: "transparent",
    fillStyle: "solid",
    strokeWidth: 1,
    strokeStyle: "solid",
    roughness: 1,
    opacity: 100,
    groupIds: [],
    frameId: null,
    roundness: null,
    seed: opts.seed,
    version: 1,
    versionNonce: opts.seed,
    index: opts.index,
    isDeleted: false,
    boundElements: null,
    updated: now,
    link: opts.link,
    locked: false,
  };
}

/** 新嵌入元素的默认落位尺寸（600×420：足够读到一段正文，又不至于一屏塞不下两块） */
export const EMBED_DEFAULT_WIDTH = 600;
export const EMBED_DEFAULT_HEIGHT = 420;

/**
 * 渲染页链接（根相对路径；白板页签与内核同源 http://127.0.0.1:6806，浏览器按
 * origin 解析成 /plugins/…）。theme 带创建当时画布的明暗，iframe 按它选配色。
 */
export function embedPageLink(blockId: string, theme: string): string {
  const qs = new URLSearchParams({ blockId, theme });
  return `/plugins/siyuan-excali-studio/embed/siyuan/index.html?${qs.toString()}`;
}

/**
 * 嵌入元素的 link 白名单（ExcalidrawProps.validateEmbeddable）：
 * ① 本插件 embed 目录（思源块渲染页）一律放行；
 * ② 普通 http(s) 网页照常可嵌（Embeddable 的标准用法，vendor 默认语义）；
 * 其余（javascript:、data: 等）拒绝。
 */
export function isEmbeddableAllowed(link: unknown): boolean {
  if (typeof link !== "string") return false;
  if (link.startsWith("/plugins/siyuan-excali-studio/embed/")) return true;
  return /^https?:\/\//i.test(link);
}

/**
 * 思源块 ID 的形状：14 位日期时间 + 连字符 + 7 位字母数字
 * （如 20240101120000-abcdefg；文档/块同理）。按这个形状从任意输入里提取，
 * 兼容「siyuan://blocks/<id>」整链、裸 id、以及复制时带上的中文标注。
 */
const SIYUAN_BLOCK_ID_RE = /[0-9]{14}-[0-9a-zA-Z]{7}/;

export function parseSiYuanBlockRef(input: string): string | null {
  const m = SIYUAN_BLOCK_ID_RE.exec(input.trim());
  return m ? m[0] : null;
}
