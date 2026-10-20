/**
 * 第四十四轮：AI 通道（四条对外能力通道的总览与开关）。
 *
 * 纯数据模块——不 import siyuan / vendor / React，node 单测直接跑
 * （studio 层相对导入必须带 .ts 后缀，见 rail-actions.ts 同款注释）。
 *
 * 四条通道的「开关」语义天然不同，面板与文档都必须如实标注，别许诺做不到的事：
 * - agent  注册门：宿主 onload 时检查，关 = 四能力根本不注册（改动要重载思源才见效）
 * - mcp    调用门：goja 注册在前端管不到，只能每次工具执行前读设置、拒绝调用
 * - cli    软门：外部进程拦不住读代码，落盘前读设置拒绝写入
 * - script 入口门：纯前端，关 = ☰ / 竖条 / 脚本库三处入口全部拒开
 */

import { ICON_AGENT, ICON_CLI, ICON_MCP, ICON_SCRIPT } from "../menu-icons.ts";

export type ChannelId = "agent" | "mcp" | "cli" | "script";

export type AiChannels = Record<ChannelId, boolean>;

export const CHANNEL_IDS: ChannelId[] = ["agent", "mcp", "cli", "script"];

export const DEFAULT_AI_CHANNELS: AiChannels = { agent: true, mcp: true, cli: true, script: true };

/**
 * 归一口径与 pinnedActions 同款：缺键 = 默认全开（老 data.json 升级零感知），
 * 只认真正的 false——显式关闭必须保留，脏值（字符串/对象）按默认处理。
 */
export function normalizeAiChannels(raw: unknown): AiChannels {
  const src = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const out: AiChannels = { ...DEFAULT_AI_CHANNELS };
  for (const id of CHANNEL_IDS) {
    if (src[id] === false) out[id] = false;
    else if (src[id] === true) out[id] = true;
  }
  return out;
}

export interface ChannelMeta {
  id: ChannelId;
  /** i18n key（中文原文即 key） */
  title: string;
  /** 一句话：这条通道是给谁用的 */
  desc: string;
  /** 开关语义：关闭后到底发生什么（必须与实现一致） */
  gate: string;
  /** 状态徽标：工具名/能力数这类不需要翻译的硬事实 */
  badge: string;
  /** 可复制的调用示例；空串 = 无示例 */
  sample: string;
  /** menu-icons.ts 里的图标 d（LineIcon 直接吃） */
  icon: string;
}

export const CHANNEL_META: ChannelMeta[] = [
  {
    id: "agent",
    title: "思源内置智能体",
    desc: "列板 / 开板 / 按计划画图 / 生图插板，仅思源内置智能体可见",
    gate: "开关 = 注册门：关闭后不再注册四能力，需重载思源生效",
    badge: "excali_* ×4",
    sample: "excali_list_boards · excali_read_board · excali_draw_board · excali_generate_image",
    icon: ICON_AGENT,
  },
  {
    id: "mcp",
    title: "内核 MCP",
    desc: "WorkBuddy / Qoder 等外部智能体经 /mcp 调用，由 kernel.js 注册",
    gate: "开关 = 调用门：工具仍在列表，调用被拒并回「通道已关闭」",
    badge: "excali_file_* ×4",
    sample: "plugin__siyuan-excali-studio__excali_file_draw_board",
    icon: ICON_MCP,
  },
  {
    id: "cli",
    title: "无头 CLI",
    desc: "能跑命令的智能体直接落盘 SVG，配 script/excali-draw/SKILL.md",
    gate: "开关 = 软门：CLI 落盘前读本设置，关闭后拒绝写入（读不拦）",
    badge: "list / create / append",
    sample: "node scripts/excali-board.mjs create --workspace <WS> --plan plan.json",
    icon: ICON_CLI,
  },
  {
    id: "script",
    title: "脚本体系",
    desc: "assets/excali-scripts/*.md + ea API，可让智能体现写脚本现跑",
    gate: "开关 = 入口门：关闭后 ☰、竖条、脚本库入口全部拒绝运行",
    badge: "ea.*",
    sample: "",
    icon: ICON_SCRIPT,
  },
];

export function channelMetaOf(id: ChannelId): ChannelMeta {
  return CHANNEL_META.find((m) => m.id === id) as ChannelMeta;
}
