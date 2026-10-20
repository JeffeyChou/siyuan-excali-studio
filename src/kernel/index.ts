/**
 * 2026-10-18 C：kernel.js 入口——把 Excali 白板能力暴露给思源智能体 / 内核 MCP。
 *
 * 由 plugin.json 的 `kernels: ["all"]` 加载，运行在 goja：
 * - 优先 siyuan.agent.registerCapability(name, {title, description, inputSchema, effects}, handler)
 *   （3.8.7 实测签名，返回 Promise）——能力进共享工具表，思源内置智能体和内核 MCP 都能用；
 *   MCP 侧的工具名会被内核加上前缀 plugin__<插件名>__<能力名>；
 * - effects 四个字段 localRead / localWrite / dataEgress / externalCost，按 tools.ToolEffects 的
 *   json tag 严格对齐（写错不报错，只是静默少一项，等于把要确认的活说成只读）；
 * - 旧版回退 siyuan.mcp.registerTool（3.7 的 API，3.8 已删）；
 * - 两者都没有就安静跳过，不影响前端白板。
 *
 * 工具名带 file_ 前缀，与前端 addAgentCapability 的三件套区分（前端能力只进内置智能体）。
 */

import "./runtime.ts";
import { drawBoard, generateBoardImage, listBoards, readBoard } from "./boards.ts";
import { loadSettings } from "./state.ts";

declare const siyuan: any;

type ToolArgs = Record<string, unknown>;
type Handler = (args: ToolArgs) => Promise<Record<string, unknown>>;

interface ToolDef {
  name: string;
  title: string;
  description: string;
  inputSchema: Record<string, unknown>;
  readOnly: boolean;
  /** 会请求外部付费 API（生图）：effects 里要如实带上出网和花销，由思源走确认 */
  external?: boolean;
  handler: Handler;
}

/** 内核 tools.ToolEffects 的字段名：localRead / localWrite / dataEgress / externalCost */
function effectsOf(tool: ToolDef): Record<string, boolean> {
  if (tool.readOnly) return { localRead: true };
  return tool.external
    ? { localRead: true, localWrite: true, dataEgress: true, externalCost: true }
    : { localRead: true, localWrite: true };
}

const PLAN_SCHEMA = {
  type: "object",
  description:
    "绘图计划：{ title, caption, preset, layout, nodes: [{id,label,shape,group}], edges: [{from,to,label}] }",
  properties: {
    title: { type: "string" },
    caption: { type: "string" },
    preset: { type: "string", description: "pencil/marker/blueprint，或 data/assets/excali-styles 下的风格包名" },
    layout: { type: "string", enum: ["lr", "tb", "grid", "radial"] },
    nodes: { type: "array", items: { type: ["string", "object"] } },
    edges: { type: "array", items: { type: ["string", "object", "array"] } },
  },
  required: ["nodes"],
};

/** 第四十四轮·调用门：MCP 通道关闭时工具仍在列表，但调用在这里被拒（一次性拒四个）。 */
async function settingsForCall(): Promise<Awaited<ReturnType<typeof loadSettings>>> {
  const settings = await loadSettings();
  if (!settings.aiChannels.mcp) {
    throw new Error("内核 MCP 通道已在「AI 通道」面板里关闭");
  }
  return settings;
}

const TOOLS: ToolDef[] = [
  {
    name: "excali_file_list_boards",
    title: "列出 Excali 白板（内核）",
    description:
      "列出 Excali 保存目录里的白板（标题、路径、更新时间），并按 query 过滤；同时回带可用风格（内置预设 + assets/excali-styles 的风格包）。只读；不列 .bak 备份。",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "按标题/路径过滤（不区分大小写）" },
        limit: { type: "number", minimum: 1, maximum: 100, description: "最多返回条数，默认 50" },
      },
    },
    readOnly: true,
    handler: async (args) => listBoards(args, await settingsForCall()),
  },
  {
    name: "excali_file_read_board",
    title: "读取 Excali 白板（内核）",
    description:
      "读取一块白板的结构摘要（元素数、文字、包围盒、前 200 个元素）。只读；board 传标题，path 传保存目录下的路径。",
    inputSchema: {
      type: "object",
      properties: {
        board: { type: "string", description: "白板标题（可带或不带 .svg）" },
        path: { type: "string", description: "白板路径，如 assets/excali/foo.svg" },
      },
    },
    readOnly: true,
    handler: async (args) => readBoard(args, await settingsForCall()),
  },
  {
    name: "excali_file_draw_board",
    title: "绘制 Excali 白板（内核）",
    description:
      "把结构化计划画成白板并直接落盘：board 为空则新建，有值则追加到已有白板；自动布局、配色、滚动备份。",
    inputSchema: {
      type: "object",
      properties: {
        plan: PLAN_SCHEMA,
        board: { type: "string", description: "追加到已有白板的标题或路径；省略则新建" },
        path: { type: "string", description: "白板路径（与 board 二选一）" },
        title: { type: "string", description: "新建白板的文件名；省略用计划标题或「AI 白板」" },
        append: { type: "boolean", description: "board 指向已有白板时是否追加，默认 true" },
        style: { type: "string", description: "风格包名：内置预设，或 data/assets/excali-styles 目录里的 json 包；与 preset 同义，优先 style" },
        preset: { type: "string", description: "覆盖计划内的风格（同 style）" },
        layout: { type: "string", enum: ["lr", "tb", "grid", "radial"], description: "覆盖计划内的布局" },
      },
      required: ["plan"],
    },
    readOnly: false,
    handler: async (args) => drawBoard(args, await settingsForCall()),
  },
  {
    name: "excali_file_generate_image",
    title: "生成图片并插入 Excali 白板（内核）",
    description:
      "调用设置里的 OpenAI 兼容图像 API 生成一张位图，插入已有白板或新建白板。需要先在插件设置里填 API 地址和 Key。",
    inputSchema: {
      type: "object",
      properties: {
        prompt: { type: "string", description: "画面描述（主体、风格、构图；上限 4000 字符）" },
        board: { type: "string", description: "插入到已有白板的标题或路径；省略则新建" },
        path: { type: "string", description: "白板路径（与 board 二选一）" },
        title: { type: "string", description: "新白板文件名；省略用「AI 图片」" },
        append: { type: "boolean", description: "board 指向已有白板时是否追加，默认 true" },
        width: { type: "number", minimum: 64, maximum: 4096, description: "图片显示宽度；省略按原图尺寸" },
        height: { type: "number", minimum: 64, maximum: 4096, description: "图片显示高度；省略按原图尺寸" },
        size: { type: "string", description: "尺寸覆盖（如 1024x1024）；省略用设置里的值" },
      },
      required: ["prompt"],
    },
    readOnly: false,
    external: true,
    handler: async (args) => generateBoardImage(args, await settingsForCall()),
  },
];

interface Registration {
  register: (tool: ToolDef) => void;
  unregister: (name: string) => void;
}

/** 两个版本的注册 API 都返回 Promise，拒绝不接住就静默丢了（真机上没人看得见） */
function settle(name: string, result: unknown): void {
  const p = result as { catch?: (e: unknown) => unknown } | null;
  if (p && typeof p.catch === "function") {
    p.catch((e: unknown) => console.warn(`[excali-studio/kernel] ${name} 注册被内核拒绝`, e));
  }
}

function runtimeOf(): Registration | null {
  const agent = siyuan?.agent;
  if (agent && typeof agent.registerCapability === "function") {
    return {
      register: (tool) => {
        settle(
          tool.name,
          agent.registerCapability(
            tool.name,
            {
              title: tool.title,
              description: tool.description,
              inputSchema: tool.inputSchema,
              effects: effectsOf(tool),
            },
            (args: unknown) => tool.handler(args && typeof args === "object" ? (args as ToolArgs) : {}),
          ),
        );
      },
      unregister: (name) => {
        if (typeof agent.unregisterCapability === "function") agent.unregisterCapability(name);
      },
    };
  }
  const legacy = siyuan?.mcp;
  if (legacy && typeof legacy.registerTool === "function") {
    return {
      register: (tool) => {
        settle(
          tool.name,
          legacy.registerTool(
            tool.name,
            {
              title: tool.title,
              description: tool.description,
              inputSchema: tool.inputSchema,
            },
            (args: unknown) => tool.handler(args && typeof args === "object" ? (args as ToolArgs) : {}),
          ),
        );
      },
      unregister: (name) => {
        if (typeof legacy.unregisterTool === "function") legacy.unregisterTool(name);
      },
    };
  }
  return null;
}

let registered: Registration | null = null;

async function onload(): Promise<void> {
  const rt = runtimeOf();
  if (!rt) {
    console.warn("[excali-studio/kernel] 当前思源不支持智能体能力注册，内核白板能力已跳过");
    return;
  }
  registered = rt;
  for (const tool of TOOLS) {
    try {
      rt.register(tool);
    } catch (e) {
      console.warn(`[excali-studio/kernel] 注册 ${tool.name} 失败`, e);
    }
  }
}

async function onunload(): Promise<void> {
  const rt = registered;
  registered = null;
  if (!rt) return;
  for (const tool of TOOLS) {
    try {
      rt.unregister(tool.name);
    } catch {
      // 卸载阶段尽力而为
    }
  }
}

const lifecycle = siyuan?.plugin?.lifecycle;
if (lifecycle && typeof lifecycle === "object") {
  lifecycle.onload = onload;
  lifecycle.onunload = onunload;
  if ("onrunning" in lifecycle) lifecycle.onrunning = () => undefined;
} else {
  void onload();
}
