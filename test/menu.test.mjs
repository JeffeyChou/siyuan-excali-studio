// ☰ 主菜单（第六轮）：把右上角工具条的动作挪进主菜单，并撤掉只读/禅模式按钮。
// 第二十一轮：文件先行 + 防抖自动保存上线后，「保存」「保存副本…」删除
// （画板从第一帧起归属文件，停手约 1 秒自动落盘，⌘S 强制落盘）——自绘项从八个变六个。
//
// 四条最容易被改坏的不变量：
//   ① 菜单必须走包导出的 MainMenu（渲染进 MainMenuTunnel），App 的 DefaultMainMenu
//      靠 withInternalFallback 自动让位；自己往 DOM 插一层菜单 = 两份菜单叠加；
//   ② 自绘项必须带图标：菜单项是 flex + column-gap、没有固定图标列，缺图标文字会凸出来；
//   ③ 不再劫持 Excalidraw 的 Export 项（data-testid="json-export-button"），也不补发 Escape；
//   ④ 只读 / 禅模式不在我们的 UI 里 —— 画布右键菜单 vendor 固定给了这两项
//      （App.getContextMenuItems("canvas") 里就是 actionToggleZenMode + actionToggleViewMode）。
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { menuShortcut, boardHotkey } from "../src/studio/hotkeys.ts";
import {
  ICON_EXPORT_IMAGE,
  ICON_FOLDER_OPEN,
  ICON_FRAME_COLLAPSE,
  ICON_HELP,
  ICON_HIGHLIGHTER,
  ICON_REFRESH,
  ICON_RENAME,
  ICON_SAVE_AS,
  ICON_SELECTION_FOLD,
  ICON_ZOOM_FIT,
  SCRIPT_ICONS,
} from "../src/studio/menu-icons.ts";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(resolve(ROOT, rel), "utf8");
const src = (rel) => read("src/" + rel);
const json = (rel) => JSON.parse(read(rel));
const stripComments = (code) => code.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'\\])\/\/[^\n]*/g, "$1");

const MENU = stripComments(src("studio/StudioMenu.tsx"));
const APP = stripComments(src("studio/StudioApp.tsx"));

/* ------------------------------ 数据层：纯函数 ------------------------------ */

test("menuShortcut：与 vendor 内置项同一写法（Cmd+… / Ctrl+…），不猜平台", () => {
  const mac = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36";
  const win = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";
  assert.equal(menuShortcut(["cmd"], "s", mac), "Cmd+S");
  assert.equal(menuShortcut(["cmd", "shift"], "e", mac), "Cmd+Shift+E");
  assert.equal(menuShortcut(["cmd", "shift"], "e", win), "Ctrl+Shift+E");
  assert.equal(menuShortcut([], "r", win), "R", "无修饰键时只剩键名");
  // 顺序固定 cmd→shift→alt，跟截图里的 Cmd+Shift+E 对齐
  assert.equal(menuShortcut(["shift", "cmd"], "e", mac), "Cmd+Shift+E");
  // 引导画面那一列只有 3rem，装不下 Cmd+Alt+E，所以它走符号写法：两个函数不能合并
  assert.equal(boardHotkey(mac), "⌘⌥E");
});

test("菜单图标：24 网格、绝对坐标，改坏会被卡住", () => {
  const icons = {
    ICON_SAVE_AS,
    ICON_EXPORT_IMAGE,
    ICON_RENAME,
    ICON_ZOOM_FIT,
    ICON_HELP,
    ICON_HIGHLIGHTER,
    ICON_REFRESH,
    ICON_FOLDER_OPEN,
    ICON_FRAME_COLLAPSE,
    ICON_SELECTION_FOLD,
  };
  for (const [name, d] of Object.entries(icons)) {
    assert.match(d, /^M/, `${name} 必须以 M 起笔`);
    assert.equal(/[a-z]/.test(d.replace(/M|L|Q|T|A|C|S|Z|H|V/g, "")), false, `${name} 混进了相对命令，坐标卡界会失真`);
    for (const n of d.match(/-?\d+(?:\.\d+)?/g) ?? []) {
      const v = Number(n);
      assert.ok(v >= 0 && v <= 24, `${name} 坐标 ${v} 越界（0..24）`);
    }
  }
  // 2026-10-22：两个折叠脚本必须各有专属图标——都走齿轮回落时竖条上两枚八齿圆
  // 小尺寸下像两太阳，用户分不清谁是谁（实测报障）
  assert.equal(SCRIPT_ICONS["frame-collapse.md"], ICON_FRAME_COLLAPSE, "画框折叠配画框+下 V 图标");
  assert.equal(SCRIPT_ICONS["selection-fold.md"], ICON_SELECTION_FOLD, "选区折叠配 ▶+文本行图标");
  assert.notEqual(SCRIPT_ICONS["frame-collapse.md"], SCRIPT_ICONS["selection-fold.md"], "两个折叠脚本图标不许相同");
  // 第二十/二十一轮删除的功能的图标不该还在（留着就是死代码）
  assert.equal(read("src/studio/menu-icons.ts").includes("ICON_SAVE_TO_DOC"), false);
  assert.equal(read("src/studio/menu-icons.ts").includes("ICON_DOC_CARD"), false);
  assert.equal(read("src/studio/menu-icons.ts").includes("ICON_SAVE "), false, "「保存」菜单项已删（第二十一轮）");
});

/* ------------------------------ 菜单组成 ------------------------------ */

test("StudioMenu：走包导出的 MainMenu，九个独立自绘项，各带图标；素材库三项住在面板 ⋮ 菜单", () => {
  assert.match(MENU, /import \{ MainMenu \} from "@excalidraw\/excalidraw"/, "必须用包导出的 MainMenu，才会顶掉 DefaultMainMenu");
  assert.match(MENU, /<MainMenu>/, "根节点是 MainMenu");
  for (const item of ["导出图片…", "重命名", "复制此白板的引用", "缩放适应", "Mermaid 转图元…", "嵌入思源块…", "拓展功能…", "AI 通道…", "帮助"]) {
    assert.ok(MENU.includes(`t("${item}")`), `菜单项缺了：${item}`);
  }
  // 第五十一轮：「运行脚本…」更名「拓展功能…」（面板拆「拓展功能/脚本库」两类后 umbrella 改口）
  // 第四十四轮：AI 通道… 夹在「拓展功能…」和「帮助」之间（能力入口挨着，帮助永远垫底）
  const order = ["拓展功能…", "AI 通道…", "帮助"].map((s) => MENU.indexOf(`t("${s}")`));
  assert.ok(order[0] < order[1] && order[1] < order[2], "「AI 通道…」必须排在「拓展功能…」之后、「帮助」之前");
  // 第三十三轮：笔刷组迁出菜单 → 画布右上角 PenRail；第三十八轮：PenRail 整条退役，
  // 荧光笔进右缘脚本竖条、墨笔交回 vendor 铅笔工具。菜单始终是纯「文件与功能」入口。
  // （2026-10-19：素材库三项（导入/刷新/打开文件夹）迁出 ☰——用户要求它们住进
  //   素材库面板自己的 ⋮ 菜单（vendor 硬编码无扩展点，DOM 注入，见 library-menu-inject.ts），
  //   菜单里不许残留。）
  assert.equal((MENU.match(/<MainMenu\.Item\b/g) ?? []).length, 9, "9 个独立自绘项（第四十四轮：加「AI 通道…」）");
  assert.equal((MENU.match(/icon=\{/g) ?? []).length, 9, "每个自绘项都得给图标（菜单项没有固定图标列）");
  for (const gone of ["导入素材库…", "刷新素材库", "打开素材库文件夹"]) {
    assert.equal(MENU.includes(`t("${gone}")`), false, `素材库项该住在面板 ⋮ 菜单，不许留在 ☰：${gone}`);
  }
  assert.equal(MENU.includes("笔刷"), false, "笔刷组已迁出菜单（不能残留组标题）");
  assert.equal(MENU.includes("PENS"), false, "菜单不再消费 pens 数据");
  assert.equal(MENU.includes("荧光笔"), false, "荧光笔不进菜单——它是竖条上的常驻工具");
  assert.equal(MENU.includes("onPickPen"), false, "onPickPen 通道已撤");
  assert.match(MENU, /onSelect=\{props\.onHelp\}/, "「帮助」接宿主快捷键速查对话框（原 dock footer 入口）");
  assert.match(MENU, /onSelect=\{props\.onCopyRef\}/, "「复制此白板的引用」接宿主剪贴板通道");
  assert.match(MENU, /onSelect=\{props\.onZoomToFit\}/, "「缩放适应」接 api.scrollToContent");
  assert.match(MENU, /onSelect=\{props\.onMermaid\}/, "「Mermaid 转图元…」接 vendor TTDDialog 开启通道");
  assert.match(MENU, /onSelect=\{props\.onRunScript\}/, "「拓展功能…」接宿主脚本选择器");
  // 第四十一轮：「插入白板卡片…」从 ☰ 撤出——它是右缘竖条里的拓展功能（契约见 rail-action.test）
  assert.equal(MENU.includes("插入白板卡片"), false, "「插入白板卡片…」已撤出菜单");
  assert.equal(MENU.includes("onInsertBoardCard"), false, "菜单回调通道已删");
  assert.equal(APP.includes("onInsertBoardCard="), false, "StudioMenu 不再有插入卡片回调");
  // 第二十一轮：删除的保存两项不许回来
  assert.equal(MENU.includes('t("保存")'), false, "「保存」已删（防抖自动保存 + ⌘S，菜单无保存心智）");
  assert.equal(MENU.includes("保存副本"), false, "「保存副本…」已删");
  // 第二十轮：两个删除的功能不许回来
  assert.equal(MENU.includes("保存到文档"), false, "「保存到文档…」已删");
  assert.equal(MENU.includes("插入文档卡"), false, "「插入文档卡…」已删");
});

test("StudioMenu：保留的内置项与刻意不放的四项", () => {
  for (const keep of [
    "LoadScene",
    "SearchMenu",
    "Help",
    "ClearCanvas",
    "Socials",
    "ToggleTheme",
    "ChangeCanvasBackground",
  ]) {
    assert.ok(MENU.includes(`MainMenu.DefaultItems.${keep}`), `内置项没了：${keep}`);
  }
  assert.match(MENU, /<MainMenu\.Group title=\{t\("Excalidraw 链接"\)\}>/, "分组标题自己给中文（vendor 的 DefaultMainMenu 硬编码英文）");
  for (const drop of ["Export", "SaveAsImage", "SaveToActiveFile"]) {
    assert.equal(MENU.includes(`MainMenu.DefaultItems.${drop}`), false, `${drop} 不该回来（见 StudioMenu.tsx 顶部注释）`);
  }
});

/* ------------------------------ StudioApp 侧的减法 ------------------------------ */

test("StudioApp：右上角只剩 vendor 扩展位里的一枚演示按钮（第三十八轮 PenRail 退役，第五十三轮重新开窗）", () => {
  // 第三十三轮曾把自绘笔刷条挂上 renderTopRightUI；第三十八轮整条撤掉。
  // 第五十三轮重新用这个 prop，但只挂一枚演示 ▶，且走 vendor 官方扩展位——
  // 位置由 vendor 排在「素材库」⧉ 左侧，不再有自绘绝对定位层。
  assert.match(APP, /renderTopRightUI=\{renderTopRightUI\}/, "右上角扩展位重新启用：只给演示入口");
  assert.equal((APP.match(/renderTopRightUI=/g) || []).length, 1, "扩展位只挂一处，不许再塞别的按钮");
  assert.match(APP, /className="exs-present-fab"/, "右上角那枚就是演示 FAB");
  assert.equal(APP.includes("PenRail"), false, "PenRail.tsx 已整文件删除");
  assert.equal(APP.includes("exs-topright"), false, "旧自绘按钮层的类名不许回流");
  assert.match(APP, /<StudioMenu/, "菜单必须作为 Excalidraw 的 children 渲染（tunnel 才接得上）");
  for (const cb of ["onExport=", "onRename=", "onZoomToFit=", "onCopyRef=", "onHelp="]) {
    assert.ok(APP.includes(cb), `StudioMenu 少了一个回调：${cb}`);
  }
  // 2026-10-19：素材库三项迁出 ☰ 菜单 → 素材库面板 ⋮ 菜单（DOM 注入）；接线契约在 smoke-wiring
  assert.match(APP, /startLibraryMenuInjection\(/, "StudioApp 启动面板 ⋮ 菜单注入");
  assert.equal(APP.includes("onImportLibrary="), false, "☰ 菜单不再有素材库入口");
  assert.equal(APP.includes("onRefreshLibrary="), false, "☰ 菜单不再有刷新入口");
  assert.equal(APP.includes("onOpenLibraryFolder="), false, "☰ 菜单不再有打开文件夹入口");
  assert.match(APP, /onCopyBoardRef/, "批4A：StudioApp 要收 onCopyBoardRef 再转给菜单");
  // 第二十一轮：保存入口只剩 ⌘S（立即落盘）与防抖，菜单项/流程不许残留
  assert.equal(APP.includes("saveFlow"), false, "saveFlow 已删（无首存分支：文件先行）");
  assert.equal(APP.includes("saveAsFlow"), false, "保存副本已删");
  assert.equal(APP.includes("onSave="), false, "菜单「保存」回调已删");
  assert.equal(APP.includes("onSaveAs="), false, "菜单「保存副本…」回调已删");
  assert.match(APP, /void flushRef\.current\(\)/, "⌘S = 跳过防抖立即落盘（flush 通道）");
  // 第二十轮：删掉的两个功能的回调与流程不许残留
  assert.equal(APP.includes("onSaveToDoc"), false, "「保存到文档…」回调已删");
  assert.equal(APP.includes("onInsertCard"), false, "「插入文档卡…」回调已删");
  assert.equal(APP.includes("insertCardFlow"), false, "文档卡流程已删");
  assert.equal(APP.includes("insertCards"), false, "文档卡建造已删");
  assert.equal(APP.includes("parseSiyuanUrl"), false, "链接拦截已删（恢复 vendor 默认行为）");
  assert.equal(APP.includes("resolveDocs"), false, "文档解析通道已删");
  assert.equal(APP.includes('from "./doc-card"'), false, "doc-card.ts 已整文件删除");
});

test("只读 / 禅模式：我们不再自己实现（画布右键菜单已有）", () => {
  // 第五十三轮：放映期间会把 viewModeEnabled 临时打开、退出按快照复原。
  // 这不是「自己做只读开关」——它没有菜单项、没有工具条按钮，只活在放映进/出两处。
  assert.equal(APP.includes("zenModeEnabled"), false, "同上，禅模式走 actionToggleZenMode");
  assert.equal(APP.includes("zenMode"), false);
  assert.equal(APP.includes("actionToggleViewMode"), false, "不许把 vendor 的只读动作搬到我们自己菜单里");
  const at = APP.indexOf("const enterPresentation");
  const end = APP.indexOf("const startPresentation", at);
  // 快照类型里有一个 `viewModeEnabled: boolean` 字段（只是记下进片场前的值），
  // 它不构成开关；把类型声明剥掉之后，外面不许再有任何读写。
  const outside = (APP.slice(0, at) + APP.slice(end)).replace(/viewModeEnabled\s*:\s*boolean;?/g, "");
  assert.equal(outside.includes("viewModeEnabled"), false, "viewModeEnabled 只许出现在放映的进/出两处");
  assert.equal((APP.match(/viewModeEnabled:\s*true/g) ?? []).length, 1, "进片场只开一次口子");
  assert.equal((APP.match(/viewModeEnabled:\s*snap\.viewModeEnabled/g) ?? []).length, 1, "退片场按快照复原");
});

/* ------------------------------ 文案与样式 ------------------------------ */

test("菜单文案两份语言包都有，且中文原文即 key", () => {
  const zh = json("i18n/zh_CN.json");
  const en = json("i18n/en_US.json");
  const used = [...MENU.matchAll(/\bt\("([^"]+)"/g)].map((m) => m[1]);
  assert.ok(used.length >= 6, `至少抓到 6 处 t()，实得 ${used.length}`);
  for (const k of used) {
    assert.ok(k in zh, `zh_CN 缺键：${k}`);
    assert.ok(k in en, `en_US 缺键：${k}`);
    assert.equal(zh[k], k, `值必须等于键：${k}`);
  }
});

test("撤掉的按钮不留文案与样式残留", () => {
  const zh = json("i18n/zh_CN.json");
  const en = json("i18n/en_US.json");
  for (const k of [
    "只读",
    "退出只读",
    "禅模式",
    "退出禅模式",
    "导出",
    // 第三十八轮：六支笔随 PenRail 一起退役，文案不留
    "笔刷",
    "钢笔（黑）",
    "红笔（批注）",
    "蓝笔（批注）",
    "铅笔（灰）",
    "荧光笔（黄）",
    "荧光笔（绿）",
  ]) {
    assert.equal(k in zh, false, `zh_CN 还留着没人用的键：${k}`);
    assert.equal(k in en, false, `en_US 还留着没人用的键：${k}`);
  }
  const css = stripComments(read("src/index.css"));
  for (const gone of ["exs-topright", "exs-tr-btn", "exs-pen"]) {
    assert.equal(css.includes(gone), false, `样式残留：${gone}`);
  }
});
