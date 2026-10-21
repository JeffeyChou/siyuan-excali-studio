/**
 * 2026-10-16 S3：白板脚本存储（assets/excali-scripts/*.md）。
 *
 * 脚本 = 工作空间里的普通 markdown 文档：标题取 H1、代码取第一个 ``` 围栏、
 * 文件头出现 `@excalidraw-onload` 则画布打开时自动跑（v1 仅 manual + onLoad 两种生命周期）。
 * 在思源里可直接编辑/搜索/同步/版本历史——这是相对 EA 的思源原生优势。
 */

import { getFileText, putTextFile, toAssetRef, toDataPath } from "../studio/storage.ts";
import { parseScriptDoc } from "../studio/doc-parse.ts";
import { t } from "../i18n.ts";

export const SCRIPTS_DIR = "assets/excali-scripts";
const SCRIPTS_LIMIT = 50;

/** P2 脚本库：一个可配置参数的声明（脚本库面板行内 ⚙ 抽屉的数据源）。
 *  type=select 用 options；type=number 用 min/max；toggle 预留给布尔开关（P2b）。 */
export interface ScriptSettingSpec {
  key: string;
  label: string;
  type: "select" | "number" | "toggle";
  default: string | number | boolean;
  options?: Array<{ value: string; label: string }>;
  min?: number;
  max?: number;
}

/** 已声明参数的脚本（键 = 脚本文件名）；未声明的脚本在脚本库里不显示 ⚙。
 *  新增脚本参数只改这里——面板表单、设置存储校验、脚本读取全自动跟上。 */
export const SCRIPT_SETTING_SPECS: Record<string, ScriptSettingSpec[]> = {
  "text-numbering.md": [
    {
      key: "format",
      label: t("默认编号格式"),
      type: "select",
      default: "1",
      options: [
        { value: "1", label: t("数字（1. 2. 3.）") },
        { value: "2", label: t("罗马大写（I. II. III.）") },
        { value: "3", label: t("罗马小写（i. ii. iii.）") },
        { value: "4", label: t("字母大写（A. B. C.）") },
        { value: "5", label: t("字母小写（a. b. c.）") },
      ],
    },
  ],
  "box-selection.md": [
    { key: "padding", label: t("外框边距（像素）"), type: "number", default: 20, min: 0, max: 200 },
  ],
};

export interface ScriptInfo {
  /** 工作空间相对路径（assets/excali-scripts/x.md） */
  path: string;
  /** 文件名（展示用） */
  name: string;
  title: string;
  /** 使用说明文字（H1 后、围栏前的正文；第三十四轮起选择器常驻展示） */
  description: string;
  onload: boolean;
  builtin: boolean;
}

/** 列目录（readDir 返回 [{name,isDir}]），失败按空处理 */
async function listDir(dir: string): Promise<string[]> {
  const res = await fetch("/api/file/readDir", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path: toDataPath(dir) }),
  });
  const json = (await res.json().catch(() => null)) as
    | { code?: number; data?: Array<{ name?: string; isDir?: boolean }> }
    | null;
  if (!res.ok || !json || json.code !== 0) return [];
  return Array.isArray(json.data)
    ? json.data.filter((r) => r && r.isDir !== true && typeof r.name === "string").map((r) => r.name as string)
    : [];
}

/** 读脚本（标题 + onload + 代码 + 使用说明文字） */
export async function readScript(relPath: string): Promise<ReturnType<typeof parseScriptDoc>> {
  const text = await getFileText(toDataPath(relPath));
  return parseScriptDoc(text);
}

/** 列出全部脚本（每个都读一次拿标题/说明/onload；脚本量级 <50，开销可接受） */
export async function listScripts(): Promise<ScriptInfo[]> {
  let names: string[] = [];
  try {
    names = await listDir(SCRIPTS_DIR);
  } catch {
    return [];
  }
  const infos: ScriptInfo[] = [];
  for (const name of names.filter((n) => /\.md$/i.test(n)).sort().slice(0, SCRIPTS_LIMIT)) {
    const path = `${SCRIPTS_DIR}/${name}`;
    try {
      const meta = await readScript(path);
      infos.push({
        path,
        name,
        title: meta.title || name.replace(/\.md$/i, ""),
        description: meta.description,
        onload: meta.onload,
        builtin: BUILTIN_FILES.has(name),
      });
    } catch {
      // 读不了的文件跳过（不该阻塞列表）
    }
  }
  return infos;
}

/** 保证目录存在（putFile isDir=true；幂等） */
async function ensureDir(dir: string): Promise<void> {
  const form = new FormData();
  form.append("path", toDataPath(dir));
  form.append("isDir", "true");
  await fetch("/api/file/putFile", { method: "POST", body: form }).catch(() => undefined);
}

/** 首次启用把内置脚本写进工作空间（已存在则跳过，用户改过不覆盖） */
export async function installBuiltinScripts(): Promise<number> {
  let existing: string[] = [];
  try {
    existing = await listDir(SCRIPTS_DIR);
  } catch {
    existing = [];
  }
  const missing = BUILTIN_SCRIPTS.filter((s) => !existing.includes(s.file));
  if (missing.length === 0) return 0;
  await ensureDir(SCRIPTS_DIR);
  let installed = 0;
  for (const s of missing) {
    try {
      await putTextFile(toDataPath(`${SCRIPTS_DIR}/${s.file}`), s.content);
      installed++;
    } catch (e) {
      console.warn("[excali-studio] 内置脚本写入失败", s.file, e);
    }
  }
  return installed;
}

/** 内容与内置不一致的内置脚本（用户改过，或插件升级后旧版残留）。
 *  真机教训：installBuiltinScripts「已存在不覆盖」，升级后用户磁盘上的内置脚本
 *  停在旧版——行为与插件预期不一致且无感知。这个函数给面板做更新提示用。 */
export async function outdatedBuiltinScripts(): Promise<string[]> {
  const out: string[] = [];
  for (const s of BUILTIN_SCRIPTS) {
    try {
      const disk = await getFileText(toDataPath(`${SCRIPTS_DIR}/${s.file}`));
      if (disk.trim() !== s.content.trim()) out.push(s.file);
    } catch {
      // 磁盘没有（未安装）不算过期
    }
  }
  return out;
}

/** 强制重置内置脚本为最新版（只覆盖不一致的；用户自建脚本不动）。返回重置数量。 */
export async function resetBuiltinScripts(): Promise<number> {
  const outdated = new Set(await outdatedBuiltinScripts());
  if (outdated.size === 0) return 0;
  await ensureDir(SCRIPTS_DIR);
  let n = 0;
  for (const s of BUILTIN_SCRIPTS) {
    if (!outdated.has(s.file)) continue;
    try {
      await putTextFile(toDataPath(`${SCRIPTS_DIR}/${s.file}`), s.content);
      n++;
    } catch (e) {
      console.warn("[excali-studio] 内置脚本重置失败", s.file, e);
    }
  }
  return n;
}

/** 内容指纹（djb2）：只判断「用户动过没有」，不要求密码学强度 */
export function hashContent(text: string): number {
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = (h * 33) ^ text.charCodeAt(i);
  return h >>> 0;
}

/** 加载时同步内置脚本（P2v4 自动更新通道——治本：不依赖用户手点「重置」）。
 *  口径：
 *   - 磁盘 == 内置最新版 → 原样记入快照（新装的也在这里进快照）；
 *   - 磁盘 != 内置版 且 磁盘 == 快照（用户没动过）→ 自动更新 + 记快照；
 *   - 磁盘 != 内置版 且 磁盘 != 快照（用户自己改过）→ 不覆盖，进 drifted
 *     （脚本库顶部提示条仍可手动重置）。
 *  快照缺失（本功能首次上线）按「没动过」处理——一次性接管存量磁盘。 */
export async function syncBuiltinScripts(
  prevSnapshot: Record<string, number>,
): Promise<{ updated: string[]; drifted: string[]; snapshot: Record<string, number> }> {
  const snapshot: Record<string, number> = { ...prevSnapshot };
  const updated: string[] = [];
  const drifted: string[] = [];
  for (const s of BUILTIN_SCRIPTS) {
    let disk: string;
    try {
      disk = await getFileText(toDataPath(`${SCRIPTS_DIR}/${s.file}`));
    } catch {
      continue; // 磁盘没有（未安装）——installBuiltinScripts 负责，下次加载自然进快照
    }
    if (disk.trim() === s.content.trim()) {
      snapshot[s.file] = hashContent(disk);
      continue;
    }
    const known = snapshot[s.file];
    if (known === undefined || known === hashContent(disk)) {
      // 没动过（或首轮接管）→ 自动更新到最新版
      try {
        await putTextFile(toDataPath(`${SCRIPTS_DIR}/${s.file}`), s.content);
        snapshot[s.file] = hashContent(s.content);
        updated.push(s.file);
      } catch (e) {
        console.warn("[excali-studio] 内置脚本自动更新失败", s.file, e);
        drifted.push(s.file);
      }
    } else {
      drifted.push(s.file); // 用户改过——不覆盖，手动提示条里自行重置
    }
  }
  return { updated, drifted, snapshot };
}

/* ------------------------------------------------------------------ */
/* 内置脚本（内容即文档：H1 + 说明 + ```js 围栏；用户可随意改）          */
/* 第三十二轮：+5 个新脚本，思维导图升级 v2（connectObjects 绑定连线）  */
/* ------------------------------------------------------------------ */

const MINDMAP_SCRIPT = `# 笔记标题 → 思维导图

把当前文档的标题（1~3 级）画成右侧树：根在左，逐级向右。连线用图形绑定
（拖动节点时箭头自动跟随），布局按子树叶子数自动摊开。
只读文档、不修改；生成后可用「缩放适应」看全貌。

\`\`\`js
const md = await ea.getDocMarkdown();
const headings = ea.utils.parseHeadings(md).filter((h) => h.level <= 3);
if (headings.length === 0) {
  ea.notify("当前文档没有 1~3 级标题");
} else {
  const root = { text: headings[0].text, level: 1, children: [] };
  const stack = [root];
  for (const h of headings.slice(1)) {
    const node = { text: h.text, level: h.level, children: [] };
    while (stack.length > 1 && stack[stack.length - 1].level >= h.level) stack.pop();
    stack[stack.length - 1].children.push(node);
    stack.push(node);
  }
  const BOX_W = 150, BOX_H = 34, GAP_X = 230, GAP_Y = 54;
  let slot = 0;
  const walk = (node, depth) => {
    const mySlot = node.children.length === 0 ? slot++ : null;
    node.children.forEach((c) => walk(c, depth + 1));
    node.slot = mySlot !== null ? mySlot : (node.children[0].slot + node.children[node.children.length - 1].slot) / 2;
    node.id = ea.addRect({
      x: 40 + depth * GAP_X,
      y: node.slot * GAP_Y,
      width: BOX_W,
      height: BOX_H,
      backgroundColor: depth === 0 ? "#dbeafe" : "transparent",
      text: node.text,
    });
    node.children.forEach((c) => {
      ea.connectObjects(node.id, "right", c.id, "left", 8);
    });
  };
  walk(root, 0);
  ea.zoomToFit();
  ea.notify("思维导图已生成");
}
\`\`\`
`;

const TABLE_SCRIPT = `# Markdown 表格 → 渲染表格

把 Markdown 表格直接画成画布上的渲染表格（表头浅蓝底、单元格白底、
列宽按内容自适应、长释义自动撑高行）。两种来源二选一：

① 画布上选中含竖线的文本元素（粘贴的 Markdown 表格草稿）→ 跑本脚本，
   原地生成表格并**替换掉原文本**（误删可 Ctrl+Z 撤回）；
② 不选中任何东西 → 读当前打开文档的第一个 Markdown 表格。

\`\`\`js
// 来源①：画布选中的文本元素（含竖线才算 Markdown 表格草稿）
const sourceIds = ea.getSelectedElements();
const selTexts = sourceIds
  .map((id) => ea.getElement(id))
  .filter((el) => el && el.type === "text" && typeof el.text === "string" && el.text.includes("|"))
  .map((el) => el.text);
const fromCanvas = selTexts.length > 0;

const table = fromCanvas
  ? ea.utils.parseTable(selTexts.join("\\n"))
  : ea.utils.parseTable(await ea.getDocMarkdown());

if (!table) {
  ea.notify(
    fromCanvas
      ? "选中文本里没有 Markdown 表格（需要 | 分隔 + --- 分隔行）"
      : "当前文档没有 Markdown 表格",
  );
} else {
  // 去掉单元格里的行内 Markdown（**加粗**、*斜体*、\`代码\`），画出来更干净
  const plain = (s) =>
    s.replace(/\\*\\*([^*]*)\\*\\*/g, "$1").replace(/\\*([^*]*)\\*/g, "$1").replace(/\\\`([^\\\`]*)\\\`/g, "$1");
  const headers = table.headers.map(plain);
  const rows = table.rows.map((r) => r.map(plain));

  const FONT = 14;
  const colW = headers.map(
    (_, i) =>
      Math.min(280, Math.max(90, ...rows.map((r) => (r[i] || "").length), headers[i].length) * 12 + 24),
  );
  // 行高按换行后的行数自适应（长释义自动撑高，不再一排固定高度挤成一坨）
  const rowH = (cells) => {
    let n = 1;
    cells.forEach((cell, i) => {
      n = Math.max(n, ea.wrapText(cell, (colW[i] || 90) - 24, FONT).length);
    });
    return n * Math.ceil(FONT * 1.35) + 10;
  };

  // 来源①：表格画在原文本元素的位置（原地替换）；来源②：从 (40, 40) 起画
  const originEl = fromCanvas
    ? sourceIds.map((id) => ea.getElement(id)).find((e) => e && e.type === "text")
    : null;
  const ox = originEl ? originEl.x : 40;
  const oy = originEl ? originEl.y : 40;

  const ids = [];
  let y = oy;
  const drawRow = (cells, isHead) => {
    let x = ox;
    const h = rowH(cells);
    cells.forEach((cell, i) => {
      ids.push(
        ea.addRect({
          x, y, width: colW[i], height: h,
          backgroundColor: isHead ? "#dbeafe" : "#ffffff",
          text: cell, fontSize: FONT,
        }),
      );
      x += colW[i];
    });
    y += h;
  };
  drawRow(headers, true);
  rows.forEach((r) => drawRow(r, false));

  if (fromCanvas) {
    ea.deleteElements(sourceIds); // 原文本已被表格取代
    ea.notify("表格已生成（原文本已删，误删可 Ctrl+Z 撤回）");
  } else {
    ea.notify("表格已生成");
  }
  ea.selectElements(ids);
  ea.zoomToFit();
}
\`\`\`
`;

const FLOWCHART_SCRIPT = `# 缩进列表 → 流程图

把当前文档第一个缩进列表（- 或 1.）画成纵向流程图：节点按子树叶子数摊开，
父节点在子节点上方居中，折线箭头向下。复杂流程建议生成后再手动调。

\`\`\`js
const md = await ea.getDocMarkdown();
const tree = ea.utils.parseList(md);
if (tree.length === 0) {
  ea.notify("当前文档没有列表");
} else {
  const BOX_W = 170, BOX_H = 34, GAP_Y = 60;
  let slot = 0;
  const walk = (node, depth) => {
    node.children.forEach((c) => walk(c, depth + 1));
    node.slot = node.children.length === 0 ? slot++ : (node.children[0].slot + node.children[node.children.length - 1].slot) / 2;
    node.x = 40 + depth * 240;
    node.y = node.slot * GAP_Y;
    ea.addRect({ x: node.x, y: node.y, width: BOX_W, height: BOX_H, text: node.text });
    node.children.forEach((c) => {
      ea.addArrow({
        x: node.x + BOX_W / 2, y: node.y + BOX_H,
        points: [
          [0, 0],
          [0, (c.slot - node.slot) * GAP_Y / 2],
          [c.x + BOX_W / 2 - (node.x + BOX_W / 2), (c.slot - node.slot) * GAP_Y / 2],
          [c.x + BOX_W / 2 - (node.x + BOX_W / 2), (c.slot - node.slot) * GAP_Y - BOX_H / 2],
        ],
      });
    });
  };
  tree.forEach((n) => walk(n, 0));
  ea.zoomToFit();
  ea.notify("流程图已生成");
}
\`\`\`
`;

const BATCH_IMAGE_SCRIPT = `# 批量导入图片

把保存目录（默认 assets）里的图片全部插入画布，4 列网格排布。
目录可在插件设置里改；只会导入图片格式，其它文件跳过。

\`\`\`js
const dir = ea.settings.saveDir || "assets";
const files = await ea.listFiles(dir);
let n = 0;
for (const f of files) {
  if (!/\\.(png|jpe?g|webp|gif|bmp)$/i.test(f)) continue;
  try {
    await ea.addImageFromFile(f, { x: (n % 4) * 260, y: Math.floor(n / 4) * 210 });
    n++;
  } catch (e) {
    console.warn("跳过", f, e);
  }
}
ea.notify(\`已插入 \${n} 张图片\`);
\`\`\`
`;

const ALIGN_SCRIPT = `# 对齐与分布

对选中的元素（≥2 个）自动判断布局意图：
全部元素几乎在同一水平带 → 垂直居中对齐（y 对齐公共中心线）；
几乎在同一垂直带 → 水平居中对齐；否则 → 按 x 排序做等水平间距分布。

\`\`\`js
const ids = ea.getSelectedElements();
if (ids.length < 2) {
  ea.notify("请先选中至少 2 个元素");
} else {
  const els = ids.map((id) => ea.getElement(id)).filter(Boolean);
  const box = ea.getBoundingBox(ids);
  const avgH = els.reduce((s, e) => s + e.height, 0) / els.length;
  const avgW = els.reduce((s, e) => s + e.width, 0) / els.length;
  const sameBand = Math.max(...els.map((e) => e.y + e.height / 2)) - Math.min(...els.map((e) => e.y + e.height / 2));
  const sameColumn = Math.max(...els.map((e) => e.x + e.width / 2)) - Math.min(...els.map((e) => e.x + e.width / 2));
  if (sameBand < avgH * 0.5) {
    els.forEach((e) => ea.setPosition(e.id, e.x, box.cy - e.height / 2));
    ea.notify("已做垂直居中对齐");
  } else if (sameColumn < avgW * 0.5) {
    els.forEach((e) => ea.setPosition(e.id, box.cx - e.width / 2, e.y));
    ea.notify("已做水平居中对齐");
  } else {
    const sorted = els.slice().sort((a, b) => a.x - b.x);
    const totalW = sorted.reduce((s, e) => s + e.width, 0);
    const gap = (box.width - totalW) / (sorted.length - 1);
    let x = box.minX;
    sorted.forEach((e) => {
      ea.setPosition(e.id, x, e.y);
      x += e.width + gap;
    });
    ea.notify("已做等水平间距分布");
  }
}
\`\`\`
`;

const BADGES_SCRIPT = `# 序号标注

给选中的每个元素外加红色虚线框 + 红底白字序号徽标（①②③…按选择顺序），
适合演示、批注、走查图。

\`\`\`js
const ids = ea.getSelectedElements();
if (ids.length === 0) {
  ea.notify("请先选中要标注的元素");
} else {
  ids.forEach((id, i) => {
    const b = ea.getBoundingBox([id]);
    const pad = 8;
    ea.addRect({
      x: b.minX - pad, y: b.minY - pad,
      width: b.width + pad * 2, height: b.height + pad * 2,
      strokeColor: "#e03131", backgroundColor: "transparent",
      strokeStyle: "dashed", strokeWidth: 1.5,
    });
    ea.addEllipse({
      x: b.minX - pad - 22, y: b.minY - pad - 6,
      width: 22, height: 22,
      strokeColor: "#e03131", backgroundColor: "#e03131", roughness: 0,
    });
    ea.addText({
      x: b.minX - pad - 22, y: b.minY - pad - 6,
      width: 22, height: 22,
      text: String(i + 1), fontSize: 14,
      strokeColor: "#ffffff", textAlign: "center",
    });
  });
  ea.zoomToFit();
  ea.notify("已加 " + ids.length + " 个序号标注");
}
\`\`\`
`;

const CONNECT_SCRIPT = `# 智能连线

选中恰好 2 个图形，自动按几何方位在最近的两条边之间画绑定箭头
（之后拖动图形，箭头自动跟随）。替代手工拉线，怎么摆都不脱节。

\`\`\`js
const ids = ea.getSelectedElements();
if (ids.length !== 2) {
  ea.notify("请选中恰好 2 个图形");
} else {
  const arrowId = ea.connectObjects(ids[0], "auto", ids[1], "auto", 6);
  ea.notify(arrowId ? "已连线（绑定：拖动图形箭头跟随）" : "连线失败：元素不可绑定");
}
\`\`\`
`;

const KANBAN_SCRIPT = `# 任务清单 → 三列看板

把当前文档的任务列表画成「待办 / 进行中 / 完成」三列看板：
- [ ] 开头 → 待办；- [x] 开头 → 完成；其余列表项 → 进行中。
只读文档、不修改。

\`\`\`js
const md = await ea.getDocMarkdown();
const tree = ea.utils.parseList(md);
const flat = [];
const walk = (nodes) => nodes.forEach((n) => { flat.push(n.text); walk(n.children); });
walk(tree);
if (flat.length === 0) {
  ea.notify("当前文档没有列表");
} else {
  const todo = flat.filter((t) => /\\[\\s?\\]/.test(t)).map((t) => t.replace(/\\[\\s?\\]\\s*/, ""));
  const done = flat.filter((t) => /\\[[xX]\\]/.test(t)).map((t) => t.replace(/\\[[xX]\\]\\s*/, ""));
  const doing = flat.filter((t) => !/\\[[xX\\s?]\\]/.test(t));
  const columns = [
    { title: "待办", color: "#dbeafe", items: todo },
    { title: "进行中", color: "#fff3bf", items: doing },
    { title: "完成", color: "#d3f9d8", items: done },
  ];
  const COL_W = 220, HEAD_H = 40, CARD_H = 40, GAP = 10;
  columns.forEach((col, ci) => {
    const x = 40 + ci * (COL_W + GAP);
    ea.addRect({ x, y: 40, width: COL_W, height: HEAD_H, backgroundColor: col.color, text: col.title + "（" + col.items.length + "）" });
    col.items.forEach((t, i) => {
      ea.addRect({ x, y: 40 + HEAD_H + GAP + i * (CARD_H + GAP), width: COL_W, height: CARD_H, text: t, fontSize: 14 });
    });
  });
  ea.zoomToFit();
  ea.notify("看板已生成");
}
\`\`\`
`;

const STEPS_SCRIPT = `# 导出分步图

把选中的元素按出现顺序逐步显现，导出成 step-1.png、step-2.png…（N 张，
浏览器逐张下载）——演示时一张图讲完一个过程。

\`\`\`js
const ids = ea.getSelectedElements();
if (ids.length < 2) {
  ea.notify("请选中 2 个以上元素（将按它们在画布中的出现顺序逐步显现）");
} else {
  const sceneIds = ea.getElements().map((e) => e.id);
  const ordered = sceneIds.filter((id) => ids.includes(id));
  for (let k = 1; k <= ordered.length; k++) {
    const blob = await ea.exportPNG(2, ordered.slice(0, k));
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "step-" + k + ".png";
    a.click();
    URL.revokeObjectURL(url);
  }
  ea.notify("已导出 " + ordered.length + " 张分步图");
}
\`\`\`
`;

const TWEEN_SCRIPT = `# 重复补间（选中 2 个）

在两个**同类型**元素之间线性插值出 N 个中间元素：位置、尺寸、角度渐变，
背景与描边颜色还会做 HSL 色相渐变——做色阶图、渐变进度条、明暗过渡一气呵成。
对标 Obsidian Excalidraw 的 Repeat Elements。

\`\`\`js
const picked = ea.getSelectedElements().map((id) => ea.getElement(id));
if (picked.length !== 2 || !picked[0] || !picked[1]) {
  ea.notify("请选中恰好 2 个元素");
  return;
}
const a = picked[0].x <= picked[1].x ? picked[0] : picked[1];
const b = a === picked[0] ? picked[1] : picked[0];
if (a.type !== b.type) {
  ea.notify("两个元素必须同类型（同是矩形/椭圆/箭头…）");
  return;
}
if (a.type === "image" || a.type === "frame") {
  ea.notify("暂不支持图像与画框，请选形状、箭头或文本");
  return;
}
const n = parseInt(await ea.utils.inputPrompt("补间数量（在两者之间插入几个）", "number", "5"), 10);
if (!n || n < 1) {
  ea.notify("请输入正整数（取消则中断）");
  return;
}

// hex(#rgb/#rrggbb/#rrggbbaa) <-> HSL；透明色不参与渐变（保持原色）
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const parseHex = (c) => {
  if (typeof c !== "string") return null;
  const m = c.replace("#", "");
  if (m.length === 3) return [parseInt(m[0] + m[0], 16), parseInt(m[1] + m[1], 16), parseInt(m[2] + m[2], 16), 1];
  if (m.length === 6) return [parseInt(m.slice(0, 2), 16), parseInt(m.slice(2, 4), 16), parseInt(m.slice(4, 6), 16), 1];
  if (m.length === 8) return [parseInt(m.slice(0, 2), 16), parseInt(m.slice(2, 4), 16), parseInt(m.slice(4, 6), 16), parseInt(m.slice(6, 8), 16) / 255];
  return null;
};
const rgbToHsl = (r, g, bl) => {
  r /= 255; g /= 255; bl /= 255;
  const max = Math.max(r, g, bl), min = Math.min(r, g, bl);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - bl) / d + (g < bl ? 6 : 0)) / 6;
    else if (max === g) h = ((bl - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  return [h * 360, s, l];
};
const hslToHex = (h, s, l) => {
  h = (((h % 360) + 360) % 360) / 360;
  const f = (p, q, t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  let r, g, bl;
  if (s === 0) { r = l; g = l; bl = l; }
  else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = f(p, q, h + 1 / 3); g = f(p, q, h); bl = f(p, q, h - 1 / 3);
  }
  const to = (v) => Math.round(clamp(v, 0, 1) * 255).toString(16).padStart(2, "0");
  return "#" + to(r) + to(g) + to(bl);
};
const lerpColor = (c1, c2, t) => {
  const p1 = parseHex(c1), p2 = parseHex(c2);
  if (!p1 || !p2) return c1 ?? c2 ?? "#000000";
  const h1 = rgbToHsl(p1[0], p1[1], p1[2]);
  const h2 = rgbToHsl(p2[0], p2[1], p2[2]);
  let dh = h2[0] - h1[0];
  if (dh > 180) dh -= 360;
  if (dh < -180) dh += 360;
  const alpha = p1[3] + (p2[3] - p1[3]) * t;
  const hex = hslToHex(h1[0] + dh * t, h1[1] + (h2[1] - h1[1]) * t, h1[2] + (h2[2] - h1[2]) * t);
  return alpha >= 1 ? hex : hex + Math.round(clamp(alpha, 0, 1) * 255).toString(16).padStart(2, "0");
};

const specs = [];
for (let i = 1; i <= n; i++) {
  const t = i / (n + 1);
  const spec = {
    type: a.type,
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    width: (a.width ?? 0) + ((b.width ?? 0) - (a.width ?? 0)) * t,
    height: (a.height ?? 0) + ((b.height ?? 0) - (a.height ?? 0)) * t,
    angle: (a.angle ?? 0) + ((b.angle ?? 0) - (a.angle ?? 0)) * t,
    strokeColor: lerpColor(a.strokeColor, b.strokeColor, t),
    backgroundColor: lerpColor(a.backgroundColor, b.backgroundColor, t),
    fillStyle: a.fillStyle,
    strokeWidth: (a.strokeWidth ?? 2) + ((b.strokeWidth ?? 2) - (a.strokeWidth ?? 2)) * t,
    strokeStyle: a.strokeStyle,
    roughness: a.roughness,
    opacity: a.opacity,
  };
  if (a.type === "text") {
    spec.text = a.text;
    spec.fontSize = a.fontSize;
    spec.fontFamily = a.fontFamily;
    spec.textAlign = a.textAlign;
  }
  if ((a.type === "arrow" || a.type === "line") && a.points && b.points && a.points.length === b.points.length) {
    spec.points = a.points.map((p, j) => [
      p[0] + (b.points[j][0] - p[0]) * t,
      p[1] + (b.points[j][1] - p[1]) * t,
    ]);
    spec.startArrowhead = a.startArrowhead;
    spec.endArrowhead = a.endArrowhead;
  }
  specs.push(spec);
}
const newIds = ea.addElements(specs);
ea.selectElements(newIds);
ea.notify("已生成 " + n + " 个补间元素");
\`\`\`
`;

const BOX_SCRIPT = `# 选区加外框

给选中的整组元素套一个大外框（虚线矩形、透明底、自动垫到最底层）——圈重点、
做分组卡片、给示意图框版都靠它；对标 Obsidian Excalidraw 的 Box Selected Elements。

\`\`\`js
const ids = ea.getSelectedElements();
if (ids.length === 0) {
  ea.notify("请先选中要加外框的元素");
  return;
}
const box = ea.getBoundingBox(ids);
if (!box) {
  ea.notify("选区没有可框的内容");
  return;
}
const parsed = parseInt(await ea.utils.inputPrompt("外框边距（像素）", "number", String(ea.getScriptSetting("padding", 20))), 10);
if (isNaN(parsed)) return; // 取消/无效输入 = 什么都不做
const pad = Math.max(0, parsed);
const rectId = ea.addRect({
  x: box.minX - pad,
  y: box.minY - pad,
  width: box.maxX - box.minX + pad * 2,
  height: box.maxY - box.minY + pad * 2,
  backgroundColor: "transparent",
  strokeStyle: "dashed",
  strokeWidth: 1,
});
ea.toBack([rectId]);
ea.notify("已加外框（边距 " + pad + "px）");
\`\`\`
`;

const UNIFORM_SCRIPT = `# 统一尺寸（选中 2 个以上）

把选中的形状统一到选区里最大的宽高（中心保持不动）——流程图节点大小不一的救星；
对标 Obsidian Excalidraw 的 Uniform size。文本与箭头不参与（尺寸由内容/端点决定）。

\`\`\`js
const ids = ea.getSelectedElements();
const shapes = ids
  .map((id) => ea.getElement(id))
  .filter((e) => e && (e.type === "rectangle" || e.type === "diamond" || e.type === "ellipse" || e.type === "image"));
if (shapes.length < 2) {
  ea.notify("请选中 2 个以上可调尺寸的形状（矩形/菱形/椭圆/图片）");
  return;
}
const maxW = Math.max(...shapes.map((e) => e.width ?? 0));
const maxH = Math.max(...shapes.map((e) => e.height ?? 0));
let changed = 0;
for (const e of shapes) {
  const dw = maxW - (e.width ?? 0);
  const dh = maxH - (e.height ?? 0);
  if (dw === 0 && dh === 0) continue;
  ea.setStyle([e.id], { width: maxW, height: maxH });
  ea.moveBy([e.id], -dw / 2, -dh / 2); // 中心保持不动
  changed++;
}
ea.notify("已把 " + changed + " 个形状统一到 " + Math.round(maxW) + "×" + Math.round(maxH));
\`\`\`
`;

const REVERSE_SCRIPT = `# 反转箭头

把选中箭头的头尾对调（起端箭头帽与末端互换，几何不动）——画完流程图想改方向
不用重画；对标 Obsidian Excalidraw 的 Reverse arrows。

\`\`\`js
const ids = ea.getSelectedElements();
const arrows = ids.map((id) => ea.getElement(id)).filter((e) => e && e.type === "arrow");
if (arrows.length === 0) {
  ea.notify("请选中要反转的箭头");
  return;
}
for (const el of arrows) {
  ea.setStyle([el.id], {
    startArrowhead: el.endArrowhead ?? null,
    endArrowhead: el.startArrowhead ?? null,
  });
}
ea.notify("已反转 " + arrows.length + " 支箭头");
\`\`\`
`;

const RESHAPE_SCRIPT = `# 形状互转

把选中的矩形/椭圆/菱形一键换成目标形状（位置、尺寸、样式全保留）——
画流程图常改主意；对标 Obsidian Excalidraw 的 Change shape。
绑定了文字的形状暂不换形（文字会掉，先解绑或删除文字再跑）。

\`\`\`js
const target = (await ea.utils.inputPrompt("目标形状：rectangle / ellipse / diamond", "text", "ellipse")).trim().toLowerCase();
if (target === "") return; // 取消 = 什么都不做
if (!["rectangle", "ellipse", "diamond"].includes(target)) {
  ea.notify("只支持 rectangle / ellipse / diamond");
  return;
}
const ids = ea.getSelectedElements();
const convertible = ids
  .map((id) => ea.getElement(id))
  .filter((e) => e && ["rectangle", "ellipse", "diamond"].includes(e.type) && e.type !== target);
const skippable = new Set(convertible.filter((e) => (e.boundElements ?? []).some((x) => x.type === "text")).map((e) => e.id));
const doable = convertible.filter((e) => !skippable.has(e.id));
if (doable.length === 0) {
  ea.notify("选区里没有可换形的形状（矩形/椭圆/菱形；绑文字的已跳过）");
  return;
}
const createdIds = [];
for (const e of doable) {
  const newId = ea.addElements([
    {
      type: target,
      x: e.x,
      y: e.y,
      width: e.width,
      height: e.height,
      angle: e.angle,
      strokeColor: e.strokeColor,
      backgroundColor: e.backgroundColor,
      fillStyle: e.fillStyle,
      strokeWidth: e.strokeWidth,
      strokeStyle: e.strokeStyle,
      roughness: e.roughness,
      opacity: e.opacity,
    },
  ])[0];
  createdIds.push(newId);
}
ea.deleteElements(doable.map((e) => e.id));
if (createdIds.length) ea.selectElements(createdIds);
ea.notify("已换形 " + createdIds.length + " 个" + (skippable.size ? "（跳过绑文字的 " + skippable.size + " 个）" : ""));
\`\`\`
`;

const NUMBERING_SCRIPT = `# 文字编号（按选择顺序）

给选中的文字前面加序号——1. 2. 3. / I. II. III. / A. B. C. 都行。
**直接点按钮** = 按脚本库 ⚙ 设置里的格式编号（默认数字）；选中的文字全都带编号时再点一次 = 全部去掉编号；
**按住 Shift 点按钮** = 弹出格式菜单自选（预勾选当前默认格式，点空白 = 不动）；
用 Shift 逐个点选文字，点选顺序就是编号顺序（拖框选择不保证顺序）。

\`\`\`js
const PREFIX_RE = /^\\s*(\\d{1,3}|[IVXLCDM]+|[ivxlcdm]+|[A-Za-z])[.、)．:：]\\s*/;
const ids = ea.getSelectedElements();
const texts = ids
  .map((id) => ea.getElement(id))
  .filter((e) => e && e.type === "text" && !e.containerId);
if (texts.length === 0) {
  ea.notify("请先用 Shift 逐个点选要编号的文字（绑在图形上的说明文字不参与）");
  return;
}
const allNumbered = texts.every((t) => PREFIX_RE.test(String(t.text ?? "")));
let fmt;
if (ea.getModifiers().shift) {
  // Shift+点按钮 = 显式重编号：菜单选格式（预勾选脚本库默认格式）；
  // 点空白 / Esc / 点菜单外 = 什么都不做
  const picked = await ea.utils.selectOption({
    options: [
      { value: "1", label: "数字", hint: "1. 2. 3." },
      { value: "2", label: "罗马大写", hint: "I. II. III." },
      { value: "3", label: "罗马小写", hint: "i. ii. iii." },
      { value: "4", label: "字母大写", hint: "A. B. C." },
      { value: "5", label: "字母小写", hint: "a. b. c." },
    ],
    current: String(ea.getScriptSetting("format", "1")),
  });
  if (picked === null) return;
  fmt = parseInt(picked, 10);
} else if (allNumbered) {
  // 不按 Shift 且全都带编号 = toggle off：去掉编号
  for (const t of texts) ea.setText(t.id, String(t.text ?? "").replace(PREFIX_RE, ""));
  ea.notify("已去掉 " + texts.length + " 条文字的编号");
  return;
} else {
  // 不按 Shift 且存在无编号文字 = 按脚本库设置直跑（getScriptSetting 已校验，脏值回落默认 "1"）
  const parsed = parseInt(String(ea.getScriptSetting("format", "1")), 10);
  fmt = [1, 2, 3, 4, 5].includes(parsed) ? parsed : 1;
}
const toRoman = (n) => {
  const tab = [[1000,"M"],[900,"CM"],[500,"D"],[400,"CD"],[100,"C"],[90,"XC"],[50,"L"],[40,"XL"],[10,"X"],[9,"IX"],[5,"V"],[4,"IV"],[1,"I"]];
  let s = "";
  for (const [v, r] of tab) { while (n >= v) { s += r; n -= v; } }
  return s;
};
const toAlpha = (n) => {
  let s = "";
  while (n > 0) { n--; s = String.fromCharCode(65 + (n % 26)) + s; n = Math.floor(n / 26); }
  return s;
};
const prefixOf = (n) =>
  fmt === 2 ? toRoman(n) + "." :
  fmt === 3 ? toRoman(n).toLowerCase() + "." :
  fmt === 4 ? toAlpha(n) + "." :
  fmt === 5 ? toAlpha(n).toLowerCase() + "." :
  n + ".";
for (let i = 0; i < texts.length; i++) {
  const body = String(texts[i].text ?? "").replace(PREFIX_RE, "");
  ea.setText(texts[i].id, prefixOf(i + 1) + " " + body);
}
const skipped = ids.length - texts.length;
ea.notify(
  "已给 " + texts.length + " 条文字编号" +
  (skipped > 0 ? "（跳过 " + skipped + " 个非文字/绑定文字元素）" : ""),
);
\`\`\`
`;

const HIGHLIGHTER_SCRIPT = `# 荧光笔

把笔刷切到荧光笔并进入手绘工具，之后直接在画布上拖拽就行——对标 Obsidian Excalidraw
的 Highlighter tool。

颜色 / 粗细 / 透明度读的是插件设置里那一份，和右缘竖条色板**同一个配置**（在色板改完
这里立刻跟着变）。脚本侧刻意不带参数：两处各存一套迟早打架，竖向色板是唯一的调色入口。

\`\`\`js
ea.highlighter();
const p = ea.getPen();
ea.notify("荧光笔：" + p.color + " · 约 " + Math.round(p.width * 4.25) + "px · " + p.opacity + "%");
\`\`\`
`;

const MATERIAL_RECIPE_SCRIPT = `# 素材配方（改色 / 重新生成）

把「图片转轮廓」生成的素材按配方重做一遍：换墨色、整体透明度、缩放，或调每一层的浓淡与
简化程度。选中一个素材元素组即可——配方会从元素上读回来（不必先入库）。

前提：素材必须由「右缘竖条 → 图片转素材 → 轮廓（高保真）」生成，也只有那种素材才带
配方。普通的矩形/椭圆/手绘元素没有配方，脚本会直接提示。

- 墨色填` + "`#1e1e1e`" + ` 这类 16 进制值；留空表示不改。
- 缩放填倍数（` + "`1.5`" + ` = 放大五成）；留空表示不改。
- 整体透明度填 0-100；留空表示不改。
- 分层浓淡留空 = 用原配方；填 ` + "`浓,淡,很浓" + ` 这样按层给（逗号分隔，从最淡到最浓）。

改完按「替换选中」直接改画布，或按「另存为新素材」写进素材库（可反复复用）。

\`\`\`js
const RECIPE_KEY = "excaliRecipe";

const ids = ea.getSelectedElements();
if (ids.length === 0) {
  ea.notify("请先选中一个「图片转轮廓」生成的素材");
  return;
}

const els = ids.map((id) => ea.getElement(id)).filter(Boolean);
const recipe = els.map((e) => e[RECIPE_KEY]).find(Boolean);
if (!recipe || typeof recipe !== "object" || !Array.isArray(recipe.layers)) {
  ea.notify("选区里没有配方：请用「图片转素材 → 轮廓（高保真）」生成后再选中它");
  return;
}

const box = ea.getBoundingBox(ids);
if (!box) {
  ea.notify("选区没有可处理的内容");
  return;
}

// 逐层读回原来的浓度；新的整体透明度与颜色留空 = 不改
const baseOpacity = els.length ? els[0].opacity : 100;
const baseColor = els.length ? els[0].backgroundColor : "#1e1e1e";

const color = (await ea.utils.inputPrompt("墨色（16 进制，如 #1e1e1e；留空不改）", "text", "")).trim();
const scaleRaw = (await ea.utils.inputPrompt("缩放倍数（留空不改）", "text", "")).trim();
const opacityRaw = (await ea.utils.inputPrompt("整体透明度 0-100（留空不改）", "text", "")).trim();
const layersRaw = (await ea.utils.inputPrompt("分层浓淡（逗号分隔，从最淡到最浓；留空沿用原配方）", "text", "")).trim();

const opacity = opacityRaw === "" ? baseOpacity : Math.max(1, Math.min(100, parseFloat(opacityRaw) || baseOpacity));
const scale = scaleRaw === "" ? 1 : Math.max(0.05, parseFloat(scaleRaw) || 1);

let layers = recipe.layers.slice();
if (layersRaw !== "") {
  const parts = layersRaw.split(/[,，]/).map((s) => parseFloat(s)).filter((n) => !isNaN(n));
  if (parts.length > 0) {
    layers = layers.map((l, i) => (i < parts.length ? Object.assign({}, l, { opacity: Math.max(1, Math.min(100, parts[i])) }) : l));
  }
}

const fill = color !== "" && /^#[0-9a-fA-F]{3,8}$/.test(color) ? color : baseColor;
const changes = [];
if (fill !== baseColor) changes.push("颜色 " + baseColor + " → " + fill);
if (opacity !== baseOpacity) changes.push("透明度 " + baseOpacity + "% → " + opacity + "%");
if (scale !== 1) changes.push("缩放 ×" + scale);
if (layersRaw !== "") changes.push("分层 " + layersRaw);
if (changes.length === 0) {
  ea.notify("没有改动任何参数，什么都没做");
  return;
}

const patch = { backgroundColor: fill, opacity: opacity };
ea.setStyle(ids, patch);
if (scale !== 1) {
  // 等比缩放：先按倍数挪左上角，再按倍数改宽高（points 由引擎按新尺寸重算）
  const w = Math.max(1, Math.round(box.width * scale));
  const h = Math.max(1, Math.round(box.height * scale));
  ea.setPosition(ids[0], box.minX, box.minY);
  ea.setStyle(ids, { width: w, height: h });
}

// 配方随元素一起带走：setStyle 走 updateScene，未知字段引擎会原样保留
const nextRecipe = Object.assign({}, recipe, {
  strokeColor: fill,
  layers: layers,
  v: 1,
});
ea.setStyle(ids, { excaliRecipe: nextRecipe });

const where = await ea.utils.selectOption({
  options: [
    { value: "canvas", label: "替换选中（改画布上这一份）" },
    { value: "library", label: "另存为新素材（写进素材库）" },
  ],
});

if (where === "library") {
  const now = Date.now();
  await ea.addLibraryItem({
    id: "lib-recipe-" + now.toString(36),
    name: "配方素材 " + new Date(now).toLocaleTimeString(),
    elements: ea.getElements().filter((e) => ids.indexOf(e.id) >= 0),
    excaliRecipe: nextRecipe,
  });
  ea.notify("已写入素材库：" + changes.join("，"));
  return;
}

ea.notify("已按配方重做：" + changes.join("，"));
\`\`\`
`;

export const BUILTIN_SCRIPTS: Array<{ file: string; content: string }> = [
  { file: "mindmap-from-headings.md", content: MINDMAP_SCRIPT },
  { file: "table-from-markdown.md", content: TABLE_SCRIPT },
  { file: "flowchart-from-list.md", content: FLOWCHART_SCRIPT },
  { file: "batch-import-images.md", content: BATCH_IMAGE_SCRIPT },
  { file: "align-and-distribute.md", content: ALIGN_SCRIPT },
  { file: "number-badges.md", content: BADGES_SCRIPT },
  { file: "smart-connect.md", content: CONNECT_SCRIPT },
  { file: "kanban-from-list.md", content: KANBAN_SCRIPT },
  { file: "export-steps.md", content: STEPS_SCRIPT },
  { file: "repeat-tween.md", content: TWEEN_SCRIPT },
  { file: "box-selection.md", content: BOX_SCRIPT },
  { file: "uniform-size.md", content: UNIFORM_SCRIPT },
  { file: "reverse-arrows.md", content: REVERSE_SCRIPT },
  { file: "change-shape.md", content: RESHAPE_SCRIPT },
  { file: "text-numbering.md", content: NUMBERING_SCRIPT },
  { file: "highlighter.md", content: HIGHLIGHTER_SCRIPT },
  { file: "material-recipe.md", content: MATERIAL_RECIPE_SCRIPT },
];

const BUILTIN_FILES = new Set(BUILTIN_SCRIPTS.map((s) => s.file));

/** 运行入口展示名（i18n key 即中文原文） */
export function scriptDisplayName(info: ScriptInfo): string {
  return info.title || t("未命名脚本");
}

export { toAssetRef };
