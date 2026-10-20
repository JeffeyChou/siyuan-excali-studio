// Apple UI 第一批：强调色 token + 菜单层。
// 这一组锁三件事：
//   ① 强调色是 Excalidraw 品牌紫的插件 token，不再散落 --b3-theme-primary；
//   ② 菜单/Tooltip/焦点态的覆盖规则确实进了根 index.css；
//   ③ 构建顺序没有反转：插件覆盖仍排在 vendor CSS 之前，靠特异性取胜。
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = readFileSync(resolve(ROOT, "src/index.css"), "utf8");
const BUILT = readFileSync(resolve(ROOT, "index.css"), "utf8");

test("强调色 token 落在 .exs-root，浅/深两套都指向 Excalidraw 品牌紫", () => {
  assert.match(SRC, /--exs-accent:\s*#6965db/);
  assert.match(SRC, /--exs-accent:\s*#a8a5ff/);
  assert.match(SRC, /--exs-accent-container:\s*#e0dfff/);
  assert.match(SRC, /--exs-accent-container:\s*#403e6a/);
  // vendor 的 --color-primary 是画布 UI 的真源，插件不该改它（改了连选中态/取色器一起变）
  assert.equal(SRC.includes("--color-primary:"), false, "不要覆盖 vendor 的 --color-primary，强调色走 --exs-accent-*");
  assert.match(SRC, /--focus-highlight-color:\s*var\(--exs-accent\)/);
});

test("右键菜单与下拉菜单的 Apple 覆盖进了根产物", () => {
  const spots = [
    ".exs-root .excalidraw .context-menu{",
    ".exs-root .excalidraw .context-menu-item{",
    ".exs-root .excalidraw .context-menu-item.checkmark:before",
    ".exs-root .excalidraw .context-menu-item-separator",
    ".exs-root .excalidraw .dropdown-menu .Island.dropdown-menu-container{",
    ".exs-root .excalidraw .dropdown-menu .dropdown-menu-item--selected",
    ".exs-root .excalidraw .dropdown-menu-container>div:not([class]){",
    "backdrop-filter:blur(20px) saturate(180%)",
  ];
  const missing = spots.filter((s) => !BUILT.includes(s));
  assert.deepEqual(missing, [], "Apple 菜单覆盖没进根 index.css：跑 npm run build（含 copy-dist）");
});

test("Tooltip 与焦点态覆盖存在且 Tooltip 是 body 级（vendor 会把它挂到 body）", () => {
  assert.match(BUILT, /body \.excalidraw-tooltip\{/);
  assert.ok(BUILT.includes("border-radius:7px"), "Tooltip 胶囊圆角没进产物");
  assert.ok(
    BUILT.includes(".exs-root .excalidraw .context-menu .context-menu-item:focus-visible"),
    "右键菜单的 inset 焦点环没进产物（会被通用按钮焦点规则盖掉）",
  );
  assert.ok(
    BUILT.includes(".exs-root .excalidraw .dropdown-menu .dropdown-menu-item:focus-visible"),
    "下拉菜单的 inset 焦点环没进产物",
  );
  assert.ok(BUILT.includes("outline:2px solid var(--exs-focus-ring)"), "通用焦点环没进产物");
});

test("覆盖规则仍排在 vendor CSS 之前（构建顺序没变，必须靠特异性赢）", () => {
  const vendorMark = BUILT.indexOf("/* ===== @excalidraw/excalidraw dist/prod/index.css ===== */");
  assert.ok(vendorMark > 0, "根 index.css 里找不到 vendor 拼接标记：copy-dist 口径变了");
  for (const s of [
    ".exs-root .excalidraw .context-menu{",
    ".exs-root .excalidraw .dropdown-menu .Island.dropdown-menu-container{",
    "body .excalidraw-tooltip{",
  ]) {
    const at = BUILT.indexOf(s);
    assert.ok(at > 0 && at < vendorMark, `${s} 应排在 vendor CSS 之前`);
  }
});

test("prefers-reduced-motion 有回退，菜单动画/过渡不会硬撑", () => {
  assert.ok(BUILT.includes("@media (prefers-reduced-motion: reduce)"));
  const at = BUILT.indexOf("@media (prefers-reduced-motion: reduce)");
  const tail = BUILT.slice(at, at + 700);
  assert.ok(tail.includes("animation:none"));
  assert.ok(tail.includes("transition:none"));
});

// 第四十三轮·C 档尺度：☰ 菜单对齐 vendor 原生（行32/字14）再抬一档到 行36/字15/图标18，
// 右键菜单同档。数值散在两条规则里，锁数字比锁选择器更有用——改回小口径必须先过这条。
test("第四十三轮·菜单 C 档尺度（行 36 / 字 15 / 图标 18 / 容器 8）进源码也进产物", () => {
  // 产物里 minifier 会剥空格、属性选择器引号和末个分号，两边都归一再比
  const flat = (s) => s.replace(/\s+/g, "").replace(/"/g, "").replace(/;}/g, "}");
  const spots = [
    // ☰ 下拉：容器 8、行 36/字 15、图标 18、图文间距 12、快捷键 13、分组标题 13
    ".exs-root .excalidraw .dropdown-menu .dropdown-menu-container{padding:8px",
    '.dropdown-menu:not(.library-menu):has(input[type="file"]) .dropdown-menu-container{min-width:256px',
    ".dropdown-menu .dropdown-menu-item{width:calc(100% - 8px);height:36px",
    ".dropdown-menu .dropdown-menu-item svg{width:18px;height:18px}",
    ".dropdown-menu .dropdown-menu-item__text{gap:12px}",
    ".dropdown-menu .dropdown-menu-item__shortcut{opacity:1;color:var(--exs-text-secondary);font-family:var(--exs-font-ui);font-size:13px",
    ".dropdown-menu .dropdown-menu-group-title{margin:8px 12px 4px",
    // 右键菜单同档：容器 8、行 36/字 15、快捷键 13
    ".exs-root .excalidraw .context-menu{min-width:min(15rem,80vw);margin:0;padding:8px",
    ".context-menu-item{min-width:0;height:36px;padding:0 10px 0 12px",
  ];
  for (const s of spots) {
    assert.ok(flat(SRC).includes(flat(s)), `src/index.css 缺 C 档规则：${s}`);
    assert.ok(flat(BUILT).includes(flat(s)), `根 index.css 产物缺 C 档规则（跑 npm run build）：${s}`);
  }
  // 字号 15 锁在 item 与 item-base 两处（base 是 vendor 14px 的正面盖写）
  for (const sel of [".dropdown-menu .dropdown-menu-item{", ".dropdown-menu .dropdown-menu-item-base{"]) {
    const at = flat(BUILT).indexOf(flat(sel));
    assert.ok(at > 0 && flat(BUILT).slice(at, at + 260).includes("font-size:15px"), `${sel} 没带上 15px 字号`);
  }
});
