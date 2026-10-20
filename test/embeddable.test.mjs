// 画布内嵌思源块（第三十一轮，方向 A）：块引用解析 / Embeddable 元素构造 /
// 链接白名单 / 渲染页契约 / 构建-打包接线。
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  EMBED_DEFAULT_HEIGHT,
  EMBED_DEFAULT_WIDTH,
  embedPageLink,
  isEmbeddableAllowed,
  makeEmbeddableElement,
  parseSiYuanBlockRef,
} from "../src/studio/embeddable.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

test("parseSiYuanBlockRef：整链 / 裸 id / 带标注文本，无效返回 null", () => {
  const id = "20240101120000-abcdefg";
  assert.equal(parseSiYuanBlockRef(`siyuan://blocks/${id}`), id);
  assert.equal(parseSiYuanBlockRef(id), id);
  assert.equal(parseSiYuanBlockRef(`在思源中：${id} 请看这段`), id);
  assert.equal(parseSiYuanBlockRef(""), null);
  assert.equal(parseSiYuanBlockRef("siyuan://blocks/"), null);
  assert.equal(parseSiYuanBlockRef("12345-abc"), null);
  assert.equal(parseSiYuanBlockRef("https://example.com/20240101120000-abcdefg"), id);
});

test("embedPageLink：根相对路径 + blockId/theme 参数，同源直达渲染页", () => {
  const link = embedPageLink("20240101120000-abcdefg", "dark");
  assert.ok(link.startsWith("/plugins/siyuan-excali-studio/embed/siyuan/index.html?"));
  const qs = new URLSearchParams(link.split("?")[1]);
  assert.equal(qs.get("blockId"), "20240101120000-abcdefg");
  assert.equal(qs.get("theme"), "dark");
});

test("isEmbeddableAllowed：本插件 embed 放行、http(s) 放行、危险协议拒绝", () => {
  assert.equal(isEmbeddableAllowed("/plugins/siyuan-excali-studio/embed/siyuan/index.html?blockId=x"), true);
  assert.equal(isEmbeddableAllowed("/plugins/siyuan-excali-studio/embed/markdown/index.html"), true);
  assert.equal(isEmbeddableAllowed("https://excalidraw.com"), true);
  assert.equal(isEmbeddableAllowed("http://127.0.0.1:6806/plugins/x"), true);
  assert.equal(isEmbeddableAllowed("javascript:alert(1)"), false);
  assert.equal(isEmbeddableAllowed("data:text/html,<script>"), false);
  assert.equal(isEmbeddableAllowed("/plugins/other-plugin/x"), false);
  assert.equal(isEmbeddableAllowed(null), false);
  assert.equal(isEmbeddableAllowed(undefined), false);
  assert.equal(isEmbeddableAllowed(42), false);
});

test("makeEmbeddableElement：全字段形状与 vendor 期望一致（type/link/无多余必填）", () => {
  const el = makeEmbeddableElement({
    id: "emb-x",
    link: embedPageLink("20240101120000-abcdefg", "light"),
    x: 10,
    y: 20,
    width: EMBED_DEFAULT_WIDTH,
    height: EMBED_DEFAULT_HEIGHT,
    index: "a0",
    seed: 7,
  });
  assert.equal(el.type, "embeddable");
  assert.equal(el.id, "emb-x");
  assert.equal(el.link, embedPageLink("20240101120000-abcdefg", "light"));
  assert.equal(el.width, 600);
  assert.equal(el.height, 420);
  assert.equal(el.isDeleted, false);
  assert.equal(el.frameId, null);
  assert.equal(el.locked, false);
  // JSON 可序列化（ExcalidrawElement 的硬要求）
  assert.deepEqual(JSON.parse(JSON.stringify(el)), el);
});

test("渲染页契约：getBlockDOM 数据通道、blockId 参数、siyuan:// 打开链接、资源路径修正", () => {
  const html = readFileSync(join(ROOT, "src-embed/siyuan/index.html"), "utf8");
  assert.ok(html.includes("/api/block/getBlockDOM"), "数据通道必须走内核原生 DOM 接口");
  assert.ok(html.includes('qs.get("blockId")'), "从 URL 参数取块 ID");
  assert.ok(html.includes('qs.get("theme")'), "主题参数接入（明暗配色）");
  assert.ok(html.includes('siyuan://blocks/"'), "「在思源中打开」按钮指向块协议");
  assert.ok(html.includes('"assets\\//g'), "相对资源路径修正到根路径");
  assert.ok(!html.includes("vditor"), "零第三方渲染依赖（渲染交给内核）");
  assert.ok(html.includes("<!DOCTYPE html>"), "自包含单文件");
});

test("StudioApp 接线：validateEmbeddable 白名单 + 菜单动作连通", () => {
  const app = readFileSync(join(ROOT, "src/studio/StudioApp.tsx"), "utf8");
  assert.ok(app.includes("validateEmbeddable={isEmbeddableAllowed}"), "白名单 prop 挂到 vendor");
  assert.ok(app.includes("parseSiYuanBlockRef"), "输入解析进主流程");
  assert.ok(app.includes("embedPageLink(blockId, mode)"), "link 携带画布当前主题");
  const menu = readFileSync(join(ROOT, "src/studio/StudioMenu.tsx"), "utf8");
  assert.ok(menu.includes("onEmbedBlock"), "菜单有嵌入动作");
  assert.ok(menu.includes('t("嵌入思源块…")'), "菜单文案");
});

test("构建-打包接线：copy-dist 拷贝 embed 目录、pack 清单包含 embed/", () => {
  const copy = readFileSync(join(ROOT, "scripts/copy-dist.mjs"), "utf8");
  assert.ok(copy.includes('src-embed", "siyuan"'), "copy-dist 从 src-embed 拷贝");
  const pack = readFileSync(join(ROOT, "scripts/pack.mjs"), "utf8");
  assert.ok(/DIRS = \[[^\]]*"embed"/.test(pack), "发布包必须带 embed/ 渲染页");
  // 产品侧落地（构建后核验）
  const built = readFileSync(join(ROOT, "embed/siyuan/index.html"), "utf8");
  assert.ok(built.includes("/api/block/getBlockDOM"), "embed/siyuan/index.html 已随构建落位");
});

test("i18n：嵌入功能词条双语齐备", () => {
  const zh = JSON.parse(readFileSync(join(ROOT, "i18n/zh_CN.json"), "utf8"));
  const en = JSON.parse(readFileSync(join(ROOT, "i18n/en_US.json"), "utf8"));
  const keys = ["嵌入思源块…", "粘贴思源块链接或块 ID（siyuan://blocks/…）", "无法识别思源块 ID", "已嵌入思源块"];
  for (const k of keys) {
    assert.ok(zh[k], `zh_CN 缺词条：${k}`);
    assert.ok(en[k], `en_US 缺词条：${k}`);
  }
});
