// Excalidraw zh-CN 语言包补丁（构建期 vite 插件）。
//
// 背景：插件把画布界面语言钉在 zh-CN，但上游 0.18.1 的 zh-CN 包与 en 包存在
// 91 处缺口（快捷键列表、画布右键菜单、元素右键菜单、命令面板、字体选择器、
// 协作者列表等）。上游 i18n 是自研的：setLanguage 把
// `await import("./locales/zh-CN-*.js")` 的**模块命名空间**存为当前字典，
// 查表 `WE(Ks, path) || WE(Hd, path)`（Hd 是英文字典），缺键逐级回落英文。
// 所以本脚本按组自动选两种补法：
//   ① 组已存在于 zh 导出（labels / helpDialog / stats …）⇒ 在模块体尾部对
//      **属主对象原地补键**——命名空间 frozen 不影响属主对象，查表直接命中中文；
//   ② 组在 zh 里**整组缺席**（elementLink / search / element / userList …）⇒
//      命名空间加不了属性，只能改写 `export{...}` 子句：追加 `__exsXxx as <组名>`
//      并在尾部定义对应对象。
// zh 包的局部变量名是压缩产物（u/t/x…），构建期从 export 子句**原位解析**；
// 需要的组解析不到就 throw——宁可构建失败，也不要静默回落英文。
//
// 维护：升级 @excalidraw/excalidraw 之后跑
//   node scripts/excalidraw-zh-cn-patch.mjs --check
// 比对 overlay 与 vendor 的 en/zh 双语包，报告过期键（上游改名）、新缺口
// （上游新增键）、冗余项（官方已补，overlay 正在覆盖官方译文，建议复核后从
// ZH_CN_PATCH 里删掉对应条目）。
import { readFileSync, readdirSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const VENDOR = resolve(ROOT, "node_modules/@excalidraw/excalidraw/dist/prod");

// ---------------------------------------------------------------------------
// overlay：组 → 键（叶）→ 中文。措辞与 zh 包既有译文对齐（显示网格/素材库/
// 画框/嵌入网页/…），`{{占位符}}` 与 `CtrlOrCmd` 原样保留。
// ---------------------------------------------------------------------------
export const ZH_CN_PATCH = {
  helpDialog: {
    createFlowchart: "从通用元素创建流程图",
    navigateFlowchart: "在流程图中导航",
    cropStart: "裁剪图像",
    cropFinish: "完成图像裁剪",
  },
  labels: {
    changeStroke: "更改描边颜色",
    changeBackground: "更改背景颜色",
    arrowhead_crowfoot_many: "鸦爪形（多）",
    arrowhead_crowfoot_one: "鸦爪形（单）",
    arrowhead_crowfoot_one_or_many: "鸦爪形（单或多）",
    more_options: "更多选项",
    arrowtypes: "箭头类型",
    arrowtype_sharp: "尖角箭头",
    arrowtype_round: "圆角箭头",
    arrowtype_elbowed: "折线箭头",
    clearCanvas: "清除画布",
    toggleGrid: "切换网格",
    loadScene: "从文件加载画布",
    showFonts: "显示字体选择器",
    theme: "主题",
    link: {
      hint: "在此输入或粘贴链接",
      goToElement: "跳转到目标元素",
    },
    lineEditor: {
      editArrow: "编辑箭头",
    },
    followUs: "关注我们",
    discordChat: "Discord 聊天",
    zoomToFitViewport: "缩放以适应视口",
    zoomToFitSelection: "缩放以适应选区",
    zoomToFit: "缩放以适应所有元素",
    installPWA: "将 Excalidraw 安装到本地（PWA）",
    autoResize: "启用文字自动调整大小",
    imageCropping: "图像裁剪",
    unCroppedDimension: "未裁剪尺寸",
    copyElementLink: "复制对象链接",
    linkToElement: "链接到对象",
    wrapSelectionInFrame: "将选区包裹进画框",
  },
  stats: {
    shapes: "形状",
    fullTitle: "画布与形状属性",
    generalStats: "常规",
    elementProperties: "形状属性",
  },
  element: {
    rectangle: "矩形",
    diamond: "菱形",
    ellipse: "椭圆",
    arrow: "箭头",
    line: "线条",
    freedraw: "自由书写",
    text: "文字",
    image: "图像",
    group: "编组",
    frame: "画框",
    magicframe: "线框图转代码",
    embeddable: "嵌入网页",
    selection: "选区",
    iframe: "IFrame",
  },
  hints: {
    dismissSearch: "按 Escape 关闭搜索",
    arrowTool: "单击开始绘制多点线段，拖动绘制单条直线。再按一次 {{arrowShortcut}} 切换箭头类型。",
    createFlowchart: "按住 CtrlOrCmd 与方向键创建流程图",
    enterCropEditor: "双击图像或按 ENTER 键裁剪图像",
    leaveCropEditor: "点击图像外部，或按 ENTER 或 ESCAPE 完成裁剪",
  },
  buttons: {
    copyLink: "复制链接",
    systemMode: "跟随系统",
  },
  errors: {
    saveLibraryError: "无法将素材库保存到本地存储。请将素材库保存为文件，以免丢失更改。",
  },
  toast: {
    copyToClipboardAsSvg: "已将 {{exportSelection}} 作为 SVG 复制到剪贴板\n({{exportColorScheme}})",
    elementLinkCopied: "链接已复制到剪贴板",
  },
  elementLink: {
    title: "链接到对象",
    desc: "点击画布上的图形，或粘贴一个链接。",
    notFound: "画布上找不到链接的对象。",
  },
  search: {
    title: "在画布上查找",
    noMatch: "没有匹配结果...",
    singleResult: "条结果",
    multipleResults: "条结果",
    placeholder: "在画布上查找文本...",
  },
  shareDialog: {
    or: "或",
  },
  quickSearch: {
    placeholder: "快速搜索",
  },
  fontList: {
    badge: { old: "旧" },
    sceneFonts: "本画布中",
    availableFonts: "可用字体",
    empty: "未找到字体",
  },
  userList: {
    empty: "未找到用户",
    hint: {
      text: "点击用户进行跟随",
      followStatus: "你正在跟随该用户",
      inCall: "用户正在语音通话中",
      micMuted: "用户已静音",
      isSpeaking: "用户正在发言",
    },
  },
  commandPalette: {
    title: "命令面板",
    shortcuts: {
      select: "选择",
      confirm: "确认",
      close: "关闭",
    },
    recents: "最近使用",
    search: {
      placeholder: "搜索菜单、命令，发现隐藏功能",
      noMatch: "没有匹配的命令...",
    },
    itemNotAvailable: "该命令当前不可用...",
    shortcutHint: "使用 {{shortcut}} 打开命令面板",
  },
};

// ---------------------------------------------------------------------------
// 纯函数层（测试直接调）
// ---------------------------------------------------------------------------

/** 收集组内全部字符串叶子 → [{ path: [键…], value }]（path 为组内相对路径） */
export function collectLeaves(tree, path = []) {
  const out = [];
  for (const [k, v] of Object.entries(tree)) {
    if (typeof v === "string") out.push({ path: [...path, k], value: v });
    else out.push(...collectLeaves(v, [...path, k]));
  }
  return out;
}

/** 解析全部 `export{局部名 as 导出名, …}` 子句 → Map<导出名, 局部名>；裸名两边相同 */
export function parseExportMap(code) {
  const map = new Map();
  const re = /export\s*\{([^}]*)\}/g;
  let m;
  while ((m = re.exec(code))) {
    for (const part of m[1].split(",")) {
      const p = part.trim();
      if (!p) continue;
      const renamed = /^([\w$]+)\s+as\s+([\w$]+)$/.exec(p);
      if (renamed) {
        map.set(renamed[2], renamed[1]);
        continue;
      }
      const bare = /^([\w$]+)$/.exec(p);
      if (bare) map.set(bare[1], bare[1]);
    }
  }
  return map;
}

/** 往最后一个 export 子句（优先含 `as labels` 的那个）末尾追加导出项 */
function appendExports(code, additions) {
  const re = /export\s*\{([^}]*)\}/g;
  let last = null;
  let target = null;
  let m;
  while ((m = re.exec(code))) {
    last = m;
    if (/\bas\s+labels\b/.test(m[1])) target = m;
  }
  const hit = target || last;
  if (!hit) {
    throw new Error("zh-CN 语言包里找不到 export 子句：Excalidraw 升级后结构可能变了，核对本补丁脚本");
  }
  const insert = additions.map(([local, name]) => `,${local} as ${name}`).join("");
  const at = hit.index + hit[0].length - 1; // 指向 '}'
  return code.slice(0, at) + insert + code.slice(at);
}

/**
 * 给 zh-CN 模块源码打补丁，返回新代码。
 * 组在导出表里 ⇒ 原地补键；组缺席 ⇒ 新对象 + 追加导出。
 */
export function buildModulePatch(code, patch = ZH_CN_PATCH) {
  const exportsMap = parseExportMap(code);
  const stmts = [];
  const exportAdds = [];

  for (const [group, tree] of Object.entries(patch)) {
    const local = exportsMap.get(group);
    if (local) {
      for (const { path, value } of collectLeaves(tree)) {
        let expr = local;
        for (const key of path.slice(0, -1)) {
          expr += `[${JSON.stringify(key)}]`;
          stmts.push(`${expr}=${expr}||{};`);
        }
        stmts.push(`${expr}[${JSON.stringify(path[path.length - 1])}]=${JSON.stringify(value)};`);
      }
    } else {
      const varName = "__exs" + group.charAt(0).toUpperCase() + group.slice(1);
      stmts.push(`var ${varName}=${JSON.stringify(tree)};`);
      exportAdds.push([varName, group]);
    }
  }

  let out = code + "\n/* excalidraw zh-CN 补丁（scripts/excalidraw-zh-cn-patch.mjs 生成） */\n";
  out += stmts.join("\n") + "\n";
  if (exportAdds.length) out = appendExports(out, exportAdds);
  return out;
}

// ---------------------------------------------------------------------------
// vite 插件
// ---------------------------------------------------------------------------

/** 在构建期给 zh-CN 语言包 chunk 打补丁；load 钩子早于 vite 内建读取 */
export function excalidrawZhCnPatch() {
  const ZH_RE = /[\\/]locales[\\/]zh-CN-[\w-]+\.js$/;
  return {
    name: "excalidraw-zh-cn-patch",
    enforce: "pre",
    load(id) {
      const file = id.split("?")[0];
      if (!ZH_RE.test(file)) return null;
      return buildModulePatch(readFileSync(file, "utf8"));
    },
  };
}

// ---------------------------------------------------------------------------
// --check：升级 vendor 后人工复核用
// ---------------------------------------------------------------------------

function pickLocale(dir, code) {
  const files = readdirSync(join(dir, "locales")).filter((f) =>
    new RegExp(`^${code}-[\\w-]+\\.js$`).test(f),
  );
  if (files.length !== 1) {
    throw new Error(`locales/ 下 ${code} 语言包找到 ${files.length} 个（期望 1 个）：${files.join(", ")}`);
  }
  return join(dir, "locales", files[0]);
}

async function runCheck() {
  const zhFile = pickLocale(VENDOR, "zh-CN");
  const enFile = pickLocale(VENDOR, "en");
  const zhCode = readFileSync(zhFile, "utf8");
  const exportsMap = parseExportMap(zhCode);

  const zhNs = (await import(zhFile)).default;
  const enNs = (await import(enFile)).default;
  const enLeaves = new Map(
    Object.entries(enNs).flatMap(([g, t]) => collectLeaves(t).map((l) => [[g, ...l.path].join("."), l.value])),
  );
  const zhLeaves = new Set(
    Object.entries(zhNs).flatMap(([g, t]) => collectLeaves(t).map((l) => [g, ...l.path].join("."))),
  );

  const inPlace = [];
  const missing = [];
  for (const group of Object.keys(ZH_CN_PATCH)) {
    (exportsMap.has(group) ? inPlace : missing).push(group);
  }

  const stale = []; // overlay 有、en 没有（上游改名/删键 → 本脚本要跟着改）
  const gap = []; // en 有、zh 无、overlay 无（新缺口 → 要补译）
  const redundant = []; // zh 已有且 overlay 也列了（官方已补，复核后可删 overlay 项）
  for (const group of Object.keys(ZH_CN_PATCH)) {
    for (const { path } of collectLeaves(ZH_CN_PATCH[group])) {
      const key = [group, ...path].join(".");
      if (!enLeaves.has(key)) stale.push(key);
      if (zhLeaves.has(key)) redundant.push(key);
    }
  }
  for (const key of enLeaves.keys()) {
    if (zhLeaves.has(key)) continue;
    const group = Object.keys(ZH_CN_PATCH).find((g) => key.startsWith(g + "."));
    const patched = group && collectLeaves(ZH_CN_PATCH[group]).some((l) => [group, ...l.path].join(".") === key);
    if (!patched) gap.push(key);
  }

  console.log(`zh-CN：${zhFile.split("/").pop()}（原地补键组 ${inPlace.length}：${inPlace.join(", ")}）`);
  console.log(`zh-CN 缺席组 ${missing.length}：${missing.join(", ")}（将改写 export 新增导出）`);
  console.log(`overlay 叶子 ${Object.values(ZH_CN_PATCH).reduce((n, t) => n + collectLeaves(t).length, 0)} 条`);
  console.log("");
  const report = (title, list) => {
    console.log(`${title}：${list.length}`);
    for (const k of list) console.log("  - " + k);
  };
  report("过期键（en 里不存在，需从 overlay 删除或改名）", stale);
  report("新缺口（en 有、zh 与 overlay 都没有，需补译）", gap);
  report("冗余项（官方已补，overlay 覆盖了官方译文，复核后可删）", redundant);
  if (stale.length || gap.length) {
    console.error("\n存在必须处理的问题：按上面报告更新 ZH_CN_PATCH 后重跑 --check");
    process.exitCode = 1;
  } else {
    console.log("\nOK：overlay 与 vendor 对齐（冗余项仅提示，不阻断）");
  }
}

if (process.argv.includes("--check")) {
  runCheck().catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
}
