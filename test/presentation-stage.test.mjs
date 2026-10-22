/**
 * 第五十三轮·批 1B：镜头 + 幕布 + HUD + 键位打磨。
 *
 * 断言分三段：
 * ① 接线：舞台只住在 .exs-canvas 里（含块跟画布走，不许 fixed）、放映留白进偏好、
 *    幕布可关、相机飞行窗内换页排队不丢输入、按住方向键不连翻；
 * ② 舞台实现：SVG mask 挖洞 + rAF 跟随相机（屏幕 = (场景 + scroll) × zoom），
 *    相机静止时不写 DOM；HUD 只读 props、只发意图；
 * ③ 样式与文案：幕布压画布、HUD 压幕布、控件可点而画布不被挡住；双语齐全。
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const src = (rel) => readFileSync(resolve(ROOT, "src/" + rel), "utf8");
const json = (rel) => JSON.parse(readFileSync(resolve(ROOT, rel), "utf8"));
const stripComments = (code) => code.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'\\])\/\/[^\n]*/g, "$1");
const APP = stripComments(src("studio/StudioApp.tsx"));
const STAGE = stripComments(src("studio/PresentationStage.tsx"));
const CSS = src("index.css");

/* ------------------------------ ① 接线 ------------------------------ */

test("舞台住在画布里：幕布/HUD 跟着 .exs-canvas，不用 fixed", () => {
  assert.ok(APP.includes('from "./PresentationStage"'), "StudioApp 必须引入舞台层");
  const at = APP.indexOf("<PresentationStage");
  assert.ok(at > APP.indexOf('className="exs-canvas"'), "舞台在 .exs-canvas 之内");
  assert.ok(at < APP.indexOf('className="exs-bottom-dock"'), "舞台不是根节点的兄弟（含块必须是画布）");
  for (const prop of [
    "api={api}",
    "plan={presentPlan}",
    "titles={presentSnapRef.current?.titles ?? []}",
    "page={presenting.page}",
    "scrim={presentSnapRef.current?.scrim ?? true}",
    "onJump={presentJump}",
    "onExit={exitPresentation}",
  ]) {
    assert.ok(APP.includes(prop), `舞台缺 prop：${prop}`);
  }
  assert.match(APP, /presenting && presentPlan \?/, "只在放映且有当前页时渲染");
  const stageCss = CSS.slice(CSS.indexOf("批 1B：幕布"));
  assert.equal(/\.exs-present-(scrim|hud)[^{]*\{[^}]*position:\s*fixed/.test(stageCss), false, "舞台不许脱离画布用 fixed");
});

test("页名在进片场时定格：放映中不跟着片单重算", () => {
  assert.match(APP, /titles: shown\.map\(\(s\) => t\(slideTitle\(s\)\)\)/, "HUD 用与 plans 同序的页名快照");
  assert.match(APP, /const presentPlan = presenting \? presentSnapRef\.current\?\.plans\[presenting\.page\] : undefined/);
});

test("镜头：留白走进片场定格的偏好；飞行窗内换页排队，不丢输入", () => {
  assert.match(APP, /const PRESENT_CAM_MS = \d+;/, "飞行窗有常量");
  assert.match(APP, /\(frameId: string, fit = 0\.92\): void =>/, "focusFrame 留白兜底 0.92（实际取值来自设置 ps.fit）");
  assert.match(APP, /focusFrame\(plans\[nav\.page\]\.frameId, presentSnapRef\.current\.fit\)/, "进片场按偏好留白");
  assert.match(APP, /focusFrame\(snap\.plans\[next\.page\]\.frameId, snap\.fit\)/, "换页同一口径（放映中改设置不换镜头）");
  assert.match(APP, /presentCamUntilRef\.current = performance\.now\(\) \+ PRESENT_CAM_MS/, "换页时开飞行窗");
  assert.match(
    APP,
    /if \(pageChanged && performance\.now\(\) < presentCamUntilRef\.current\) \{[\s\S]{0,180}presentPendingRef\.current = \{ nav, kind \};\s*\n\s*return;/,
    "窗内只记意图（连同出场方式），不改游标（否则镜头会被反复重定向）",
  );
  const flushAt = APP.indexOf("const timer = window.setInterval");
  assert.ok(flushAt > 0, "必须有飞行窗结束后的追帧");
  const flush = APP.slice(flushAt, APP.indexOf("}, [presenting]);", flushAt));
  assert.match(flush, /presentPendingRef\.current = null;/, "追之前先取走，避免重复应用");
  assert.match(flush, /presentGoRef\.current\(pending\.nav, pending\.kind\);/, "追的是最后一次意图（带上出场方式）");
  assert.match(
    APP,
    /const cur = presentPendingRef\.current\?\.nav \?\? presentNavRef\.current;/,
    "连按以排队页 / 已落地导航状态为基准推进（否则两次快按算成同一目标）",
  );
  assert.match(APP, /navNext\(snap\.plans, snap\.graph, cur, direction\)/, "前进走图（Advanced Canvas 口径）");
  assert.match(APP, /navPrev\(snap\.plans, snap\.graph, cur\)/, "后退沿访问栈回退");
  assert.match(
    APP,
    /presentSnapRef\.current = null;\s*\n\s*presentPendingRef\.current = null;\s*\n\s*presentCamUntilRef\.current = 0;/,
    "退片场清掉排队与飞行窗",
  );
});

test("点进度点：落到整页态（最后一条）；放映中旧排队先清", () => {
  assert.match(
    APP,
    /presentPendingRef\.current = null;\s*\n\s*presentGo\(navJump\(snap\.plans, cur, page\), "jump"\)/,
    "点页码不该只露第一条——那会像翻到一张空页；跳页不打字",
  );
});

test("键位：按住不连翻，但重复事件照样吃干净", () => {
  const at = APP.indexOf("if (event.repeat) return;");
  assert.ok(at > APP.indexOf("event.stopImmediatePropagation();"), "先吞事件再挡连发，免得漏给 vendor 平移画布");
  assert.ok(at < APP.indexOf("act();", at), "挡连发在动作之前");
});

/* ------------------------------ ② 舞台实现 ------------------------------ */

test("幕布：SVG mask 挖洞，rAF 跟随相机", () => {
  assert.match(STAGE, /requestAnimationFrame/, "相机动画期间要逐帧跟随");
  assert.match(STAGE, /cancelAnimationFrame/, "卸载必须停帧");
  assert.match(STAGE, /const sx = \(x \+ \(st\.scrollX \|\| 0\)\) \* zoom;/, "屏幕 =（场景 + scroll）× zoom");
  assert.match(STAGE, /const sy = \(y \+ \(st\.scrollY \|\| 0\)\) \* zoom;/);
  assert.match(STAGE, /w \* zoom/, "洞的宽高也跟着 zoom");
  assert.match(STAGE, /setAttribute\("width"/, "洞的尺寸写到 SVG 属性上");
  assert.match(STAGE, /mask id=\{maskId\}/);
  assert.ok(STAGE.includes("url(#${maskId})"), "填充层用这张 mask");
  assert.match(STAGE, /const maskId = "exs-present-hole-" \+ \(props\.plan\.frameId/, "多画板并存时 mask id 不能撞（画框 id 工作区唯一）");
  assert.match(STAGE, /if \(sig === last\) return;/, "相机静止时不写 DOM");
  assert.equal(STAGE.includes("setState"), false, "不许每帧 setState 拖着整棵树重渲染");
  assert.match(STAGE, /HOLE_PAD/, "洞要比画框外扩一圈");
});

test("幕布开关：关掉只留 HUD，rAF 也不空转", () => {
  assert.match(STAGE, /if \(!props\.scrim\) return;/, "关幕布不启动跟随帧");
  assert.match(STAGE, /\{props\.scrim \? \(\s*\n\s*<svg ref=\{svgRef\} className="exs-present-scrim"/, "关幕布不渲染 SVG");
  assert.match(STAGE, /<\/svg>\s*\n\s*\) : null\}/, "开关是渲染条件，不是 CSS 隐藏");
  assert.match(STAGE, /className="exs-present-hud"/, "HUD 始终在（关幕布仍要翻页/退出）");
});

test("HUD：页名 / 进度点 / 页码 / 退出，只读 props、只发意图", () => {
  for (const cls of [
    "exs-present-hud__title",
    "exs-present-hud__dots",
    "exs-present-dot--on",
    "exs-present-hud__count",
    "exs-present-exit",
  ]) {
    assert.ok(STAGE.includes(cls), `HUD 缺 ${cls}`);
  }
  assert.match(STAGE, /aria-current=\{i === props\.page \? "step" : undefined\}/, "当前页对读屏可见");
  assert.match(STAGE, /onClick=\{props\.onExit\}/, "退出只上报");
  assert.match(STAGE, /onClick=\{\(\) => props\.onJump\(i\)\}/, "进度点只上报");
  assert.equal(STAGE.includes("api.updateScene"), false, "舞台只读 appState，不改场景");
  assert.equal(STAGE.includes("updateScene"), false);
});

test("分层：vendor 只进类型，不碰思源 API", () => {
  assert.ok(STAGE.includes('import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";'));
  assert.equal(/^import(?! type).*from "@excalidraw\/excalidraw/m.test(STAGE), false, "运行时不许 import vendor");
  assert.equal(STAGE.includes('from "siyuan"'), false);
  assert.equal(STAGE.includes('from "../..'), false);
});

/* ------------------------------ ③ 样式与文案 ------------------------------ */

test("层级：幕布压画布（5）、HUD 压幕布（7），都低于抽屉（8）", () => {
  assert.match(CSS, /\.exs-canvas \.exs-present-scrim \{[^}]*position: absolute;[^}]*inset: 0;[^}]*z-index: 5;/);
  assert.match(CSS, /\.exs-canvas \.exs-present-hud \{[^}]*position: absolute;[^}]*inset: 0;[^}]*z-index: 7;/);
  assert.match(CSS, /\.exs-present-scrim__fill \{[^}]*fill: rgba\(/, "幕布是半透明黑，不是纯黑");
  assert.match(CSS, /\.exs-present-hud \{[^}]*pointer-events: none;/, "HUD 整层不挡画布");
  assert.match(CSS, /\.exs-present-exit \{[^}]*pointer-events: auto;/, "退出键可点");
  assert.match(CSS, /\.exs-present-hud__bottom \{[^}]*pointer-events: auto;/, "底栏可点");
  assert.match(CSS, /\.exs-present-dot--on \{[^}]*width: 18px;[^}]*background: var\(--exs-accent\)/, "当前页的进度点拉长高亮");
});

test("i18n：新文案两份语言包都在，中文键值一致", () => {
  const zh = json("i18n/zh_CN.json");
  const en = json("i18n/en_US.json");
  for (const k of ["退出演示", "页码", "第 {n} 页"]) {
    assert.ok(k in zh, `zh_CN 缺键：${k}`);
    assert.ok(k in en, `en_US 缺键：${k}`);
    assert.equal(zh[k], k, `中文值必须等于键：${k}`);
  }
  const used = [...STAGE.matchAll(/\bt\("([^"]+)"/g)].map((m) => m[1]);
  assert.ok(used.length >= 3, `至少抓到 3 处 t()，实得 ${used.length}`);
  for (const k of used) {
    assert.ok(k in zh, `zh_CN 缺键：${k}`);
    assert.ok(k in en, `en_US 缺键：${k}`);
  }
});
