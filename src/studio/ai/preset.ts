/**
 * 2026-10-18 A：AI 绘图的「房屋风格」。
 * 2026-10-19 A+：三套内置预设变成**风格包注册表**——外部 JSON 包（extends + 只写差异）
 * 与内置同源，配色/字号/笔触/间距/分组取色全部成为可固化的 token，批量绘图不再漂移。
 *
 * 计划 DSL 只描述节点/连线，视觉口径集中在这里，避免模型每次自由发挥配色。
 * 都按 Excalidraw 元素字段取合法值（fontFamily 5 = Excalifont，3 = Cascadia；
 * roughness 0/1/2；fillStyle solid/hachure/cross-hatch；opacity 不进预设）。
 */

export type PlanPreset = "pencil" | "marker" | "blueprint";

export type PlanFontSize = {
  title: number;
  node: number;
  edge: number;
  caption: number;
};

/** 布局间距（原 layout.ts 常量，2026-10-19 起可按风格包覆盖；缺省=历史值） */
export type PlanSpace = {
  minW: number;
  minH: number;
  padX: number;
  padY: number;
  gapX: number;
  gapY: number;
  gridGapX: number;
  gridGapY: number;
  radialMinRadius: number;
  radialGap: number;
  maxGridCols: number;
  textWrap: number;
};

/** 分组底色策略：hash=按 group 名哈希取调色板；roles=内容角色→固定色 */
export type PlanGroupColor = {
  mode: "hash" | "roles";
  roles?: Record<string, string>;
};

export type PlanPresetSpec = {
  background: string;
  ink: string;
  fill: string;
  /** 多色循环（marker 用；其余预设不填 = 所有节点同色） */
  fillPalette?: string[];
  edge: string;
  muted: string;
  strokeWidth: number;
  roughness: number;
  fillStyle: "solid" | "hachure" | "cross-hatch";
  strokeStyle: "solid" | "dashed" | "dotted";
  fontFamily: number;
  fontSizes: PlanFontSize;
  /** 圆角策略："rounded" 形状用；rectangle 形状固定直角 */
  nodeRoundness: { type: number } | null;
  /** 展示名（风格包 label，计划与 CLI 只用 key） */
  label?: string;
  space?: Partial<PlanSpace>;
  groupColor?: PlanGroupColor;
};

/** 风格包只写差异：fontSizes/space 允许只给子集 */
export type PlanPresetDiff = Partial<Omit<PlanPresetSpec, "fontSizes" | "space">> & {
  fontSizes?: Partial<PlanFontSize>;
  space?: Partial<PlanSpace>;
};

export const PLAN_PRESETS: Record<PlanPreset, PlanPresetSpec> = {
  pencil: {
    background: "#fffdf7",
    ink: "#1e1e1e",
    fill: "#ffffff",
    edge: "#495057",
    muted: "#868e96",
    strokeWidth: 2,
    roughness: 1,
    fillStyle: "solid",
    strokeStyle: "solid",
    fontFamily: 5,
    fontSizes: { title: 28, node: 16, edge: 14, caption: 14 },
    nodeRoundness: { type: 3 },
  },
  marker: {
    background: "#ffffff",
    ink: "#1e1e1e",
    fill: "#ffec99",
    fillPalette: ["#ffec99", "#b2f2bb", "#a5d8ff", "#ffc9c9", "#d0bfff", "#ffd8a8", "#c3fae8", "#e9fac8"],
    edge: "#e03131",
    muted: "#868e96",
    strokeWidth: 2,
    roughness: 1,
    fillStyle: "solid",
    strokeStyle: "solid",
    fontFamily: 5,
    fontSizes: { title: 28, node: 16, edge: 14, caption: 14 },
    nodeRoundness: { type: 3 },
  },
  blueprint: {
    background: "#f8fbff",
    ink: "#1971c2",
    fill: "#e7f5ff",
    edge: "#1971c2",
    muted: "#4dabf7",
    strokeWidth: 1,
    roughness: 0,
    fillStyle: "solid",
    strokeStyle: "solid",
    fontFamily: 3,
    fontSizes: { title: 26, node: 15, edge: 13, caption: 12 },
    nodeRoundness: { type: 3 },
  },
};

export const PLAN_PRESET_NAMES = Object.keys(PLAN_PRESETS) as PlanPreset[];

/** 外部风格包：name → {extends, diff}；解析推迟到 presetOf（加载顺序无关 + 改基线自动跟随） */
type StyleEntry = { extendsFrom: string; diff: PlanPresetDiff };
const STYLE_PACKS = new Map<string, StyleEntry>();
const STYLE_CACHE = new Map<string, PlanPresetSpec>();
const STYLE_CHAIN_MAX = 8;

const PRESET_ALIASES: Record<string, PlanPreset> = {
  hand: "pencil",
  handdrawn: "pencil",
  "hand-drawn": "pencil",
  sketch: "pencil",
  ink: "pencil",
  color: "marker",
  colour: "marker",
  crayon: "marker",
  vivid: "marker",
  highlight: "marker",
  technical: "blueprint",
  line: "blueprint",
  wireframe: "blueprint",
  mono: "blueprint",
};

/** 包名口径：空格/下划线折算成连字符，其余非法字符丢弃（「Axl Poster」→ axl-poster）。
 *  超长不截断——静默截断会让两个长包名撞成同一个键，交给 NAME_RE 拒掉。 */
export function slugStyleName(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9._-]/g, "")
    .replace(/^-+|-+$/g, "");
}

/** 别名归一（模型常写 hand/sketch/technical）；内置→别名→注册表；未知返回 null 由调用方报错 */
export function normalizePresetName(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const key = slugStyleName(raw);
  if (key in PLAN_PRESETS) return key;
  const alias = PRESET_ALIASES[key];
  if (alias) return alias;
  return STYLE_PACKS.has(key) ? key : null;
}

export function hasStyle(name: string): boolean {
  return slugStyleName(name) in PLAN_PRESETS || STYLE_PACKS.has(slugStyleName(name));
}

/** 注册/覆盖一个外部风格包（同名校准最后一次）；解析推迟，坏 extends 在 presetOf 才报 */
export function registerStylePack(name: string, entry: StyleEntry): void {
  STYLE_PACKS.set(name, entry);
  STYLE_CACHE.clear();
}

export function unregisterStylePacks(): void {
  STYLE_PACKS.clear();
  STYLE_CACHE.clear();
}

/** 外部包的基线名（内置返回 null）；diff-only 导出与列表展示用 */
export function styleBaseOf(name: string): string | null {
  return STYLE_PACKS.get(name)?.extendsFrom ?? null;
}

/** 内置在前、注册表按名排序在后（报错与 --list-styles 共用） */
export function styleNames(): string[] {
  return [...PLAN_PRESET_NAMES, ...[...STYLE_PACKS.keys()].sort()];
}

function resolveStyle(name: string, seen: string[]): PlanPresetSpec {
  const cached = STYLE_CACHE.get(name);
  if (cached) return cached;
  const builtin = (PLAN_PRESETS as Record<string, PlanPresetSpec>)[name];
  if (builtin) return builtin;
  const entry = STYLE_PACKS.get(name);
  if (!entry) throw new Error(`style:unknown-style (${name})`);
  if (seen.includes(name) || seen.length >= STYLE_CHAIN_MAX) {
    throw new Error(`style:circular-extends (${[...seen, name].join(" <- ")})`);
  }
  const base = resolveStyle(entry.extendsFrom, [...seen, name]);
  const fonts = entry.diff.fontSizes;
  const spec: PlanPresetSpec = {
    ...base,
    ...entry.diff,
    fontSizes: {
      title: fonts?.title ?? base.fontSizes.title,
      node: fonts?.node ?? base.fontSizes.node,
      edge: fonts?.edge ?? base.fontSizes.edge,
      caption: fonts?.caption ?? base.fontSizes.caption,
    },
    ...(entry.diff.space ? { space: { ...base.space, ...entry.diff.space } } : {}),
    ...(entry.diff.fillPalette ? { fillPalette: entry.diff.fillPalette.slice() } : {}),
  };
  STYLE_CACHE.set(name, spec);
  return spec;
}

export function presetOf(name: string): PlanPresetSpec {
  return resolveStyle(name, []);
}

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * 节点底色：roles 策略下按 group 固定取色（批量零漂移），否则有调色板时按
 * group（优先）或序号稳定哈希，同一 group 同色；无调色板回 preset.fill。
 */
export function fillFor(preset: PlanPresetSpec, index: number, group?: string): string {
  const roles = preset.groupColor?.roles;
  if (preset.groupColor?.mode === "roles" && group && roles) {
    const direct = roles[group] ?? roles[group.toLowerCase()];
    if (direct) return direct;
  }
  const palette = preset.fillPalette;
  if (!palette || palette.length === 0) return preset.fill;
  const key = group && group !== "" ? `g:${group}` : `i:${index}`;
  return palette[hashString(key) % palette.length];
}
