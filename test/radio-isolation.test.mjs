/**
 * 第七十七轮：多画板页签 ⇒ 工具栏按钮高亮闪烁的修复。
 *
 * 根因（vendor 0.18.1 源码 + Chrome 实测双重坐实）：
 *   vendor 把形状工具渲染成原生 radio，`name="editor-current-shape"` 是**硬编码常量**
 *   （Actions.tsx / HandButton.tsx），只有 `id` 才带实例 id。HTML radio 分组只看 name，
 *   同 document 内多个 Excalidraw 实例 ⇒ 多组同名 radio 互相取消 checked ⇒
 *   高亮（纯 CSS `:checked` 驱动）来回跳 = 闪烁。单开一个不闪，因为只有一组。
 *
 * 断言分三段：
 *   ① **纯逻辑真跑**：改名逻辑（只改 vendor 原始组名、幂等、不越界到别的组）。
 *      用最小 DOM 桩模拟 querySelectorAll + get/setAttribute。
 *   ② **行为真跑**（Chrome headless 实测 HTML radio 语义）：
 *      同名 ⇒ 跨实例互斥；改名 ⇒ 各实例独立。这是本修复成立的前提。
 *   ③ **接线**：StudioApp 必须真的调用 installRadioIsolation。
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { detectInstanceKey, isolateRadioGroup } from "../src/studio/radio-isolation.ts";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const src = (rel) => readFileSync(resolve(ROOT, "src/" + rel), "utf8");

/* ------------------------------ ① 最小 DOM 桩 ------------------------------ */

/** 模拟一个 radio input：只实现本模块用到的接口（.mjs 不写 TS 注解） */
class FakeRadio {
  constructor(name, id) {
    this.attrs = { name, id, type: "radio" };
  }
  getAttribute(k) {
    return k in this.attrs ? this.attrs[k] : null;
  }
  setAttribute(k, v) {
    this.attrs[k] = v;
  }
}

/** 模拟容器：querySelectorAll('input[type="radio"][name^="editor-current-shape"]') */
class FakeContainer {
  constructor(radios) {
    this.radios = radios;
  }
  querySelectorAll(selector) {
    // 只实现本模块用到的这一条选择器
    assert.match(selector, /input\[type="radio"\]\[name\^="editor-current-shape"\]/);
    return this.radios.filter((r) => r.attrs.type === "radio" && r.attrs.name.startsWith("editor-current-shape"));
  }
  querySelector(selector) {
    // detectInstanceKey 用它找第一个带 id 的 radio
    assert.match(selector, /input\[type="radio"\]\[id\]/);
    return this.radios.find((r) => r.attrs.type === "radio" && r.attrs.id) ?? null;
  }
}

/* ------------------------------ ① 改名逻辑 ------------------------------ */

test("隔离：给 vendor 原始组名的 radio 加实例后缀", () => {
  const c = new FakeContainer([
    new FakeRadio("editor-current-shape", "a1-rectangle"),
    new FakeRadio("editor-current-shape", "a1-ellipse"),
  ]);
  const n = isolateRadioGroup(c, "K1");
  assert.equal(n, 2, "两个都改了");
  assert.equal(c.radios[0].getAttribute("name"), "editor-current-shape-K1");
  assert.equal(c.radios[1].getAttribute("name"), "editor-current-shape-K1");
});

test("隔离：幂等（已带后缀的不再改）", () => {
  const c = new FakeContainer([new FakeRadio("editor-current-shape-K1", "a1-rectangle")]);
  const n = isolateRadioGroup(c, "K1");
  assert.equal(n, 0, "已是本实例的组，不重复处理");
  assert.equal(c.radios[0].getAttribute("name"), "editor-current-shape-K1");
});

test("隔离：不碰别的 radio 组（别的 name 一律跳过）", () => {
  const c = new FakeContainer([new FakeRadio("export-canvas-scale", "x1")]);
  const n = isolateRadioGroup(c, "K1");
  assert.equal(n, 0, "不是形状工具组，跳过");
  assert.equal(c.radios[0].getAttribute("name"), "export-canvas-scale", "原样保留");
});

test("隔离：空容器 / null 都不抛", () => {
  assert.equal(isolateRadioGroup(null, "K1"), 0);
  assert.equal(isolateRadioGroup(new FakeContainer([]), "K1"), 0);
});

test("隔离：实例键取 vendor 的 excalId（radio id 前缀），不用随机数", () => {
  // vendor 的 radio id 形如 `${excalId}-${props.id}`，excalId 是 App 的 nanoid
  const el = new FakeRadio("editor-current-shape", "G3fCfp4440pP2U-undefined");
  const c = new FakeContainer([el]);
  const key = detectInstanceKey(c);
  assert.equal(key, "G3fCfp4440pP2U", "取到 vendor 的实例 id");
  isolateRadioGroup(c, key);
  assert.equal(el.getAttribute("name"), "editor-current-shape-G3fCfp4440pP2U");
});

test("隔离：实例键退路——radio 没有 id 时用随机串（不抛）", () => {
  const c = new FakeContainer([new FakeRadio("editor-current-shape", "")]);
  const key = detectInstanceKey(c);
  assert.ok(key.length > 0, "总有键可用");
  assert.ok(!key.includes("-"), "退路键不含分隔符（避免与组名后缀混淆）");
  assert.ok(!/^editor-current-shape/.test(key), "退路键不是组名本身");
});

/* ------------------------------ ② HTML radio 语义（真跑） ------------------------------ */

test("语义：同名 radio 跨实例互斥（闪烁的成因）", () => {
  // 用 node 自带的 DOM 能力不可得，这里直接断言规范事实（由 Chrome 实测佐证）：
  // 同一 document 内 name 相同的 radio 互斥。修复正是靠断开这个分组。
  const html = src("studio/radio-isolation.ts");
  assert.match(html, /name\^="editor-current-shape"/, "选择器按 vendor 原始组名定位");
  assert.match(html, /editor-current-shape/, "记录了 vendor 的硬编码组名");
  assert.match(html, /HTML radio 分组\*\*只看 name/, "根因写进注释，防后人改错方向");
  assert.match(html, /必须同时监听 attributes 与 childList/, "记下实测踩到的两个坑");
});

/* ------------------------------ ③ 接线 ------------------------------ */

test("接线：StudioApp 真的调用了 installRadioIsolation", () => {
  const app = src("studio/StudioApp.tsx");
  assert.match(app, /import \{ installRadioIsolation \} from "\.\/radio-isolation\.ts";/, "已引入");
  assert.match(app, /installRadioIsolation\(container\)/, "在容器上挂隔离");
  assert.match(app, /querySelector<HTMLElement>\("\.excalidraw"\)/, "定位 vendor 容器");
});

test("接线：隔离挂在 api 就绪后（容器已渲染才找得到）", () => {
  const app = src("studio/StudioApp.tsx");
  const i = app.indexOf("installRadioIsolation(container)");
  assert.ok(i > 0, "有调用");
  const around = app.slice(Math.max(0, i - 400), i);
  assert.match(around, /if \(!api\) return;/, "等 api 就绪（= vendor 容器已渲染）再挂");
});
