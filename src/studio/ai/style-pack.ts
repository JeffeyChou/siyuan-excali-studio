/**
 * 2026-10-19 第三十九轮（AI 绘图 E，方案 A）：风格包（Style Pack）——把 preset.ts 的视觉口径落成可复用的 JSON。
 *
 * 一份包 = `extends`（基线，默认 pencil）+ **只写不一样的字段**。前端能力、内核工具与
 * CLI 共用这里的 parse/load/校验，加载器只吃注入的 list/read（纯函数、node 可直接跑），
 * 且每次绘图前重读目录（包是用户手改的 JSON，缓存会吃到过期配色）。
 * 坏包跳过并回 warning，内置三套永远可用；`diffOf` 把已注册包反写回同 schema，
 * 这样「设置面板导出」和「手写 JSON」是同一份东西。
 */

import {
  hasStyle,
  presetOf,
  registerStylePack,
  styleBaseOf,
  slugStyleName,
  styleNames,
  unregisterStylePacks,
  type PlanGroupColor,
  type PlanFontSize,
  type PlanPresetDiff,
  type PlanPresetSpec,
  type PlanSpace,
} from "./preset.ts";

/** 风格包目录（资产相对路径，实际落在 {ws}/data/assets/excali-styles） */
export const STYLE_DIR = "assets/excali-styles";

const NAME_RE = /^[a-z0-9][a-z0-9._-]{0,31}$/;
const COLOR_RE = /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const FILL_STYLES = ["solid", "hachure", "cross-hatch"] as const;
const STROKE_STYLES = ["solid", "dashed", "dotted"] as const;
const SPACE_KEYS: Array<keyof PlanSpace> = [
  "minW", "minH", "padX", "padY", "gapX", "gapY",
  "gridGapX", "gridGapY", "radialMinRadius", "radialGap", "maxGridCols", "textWrap",
];
const SPACE_FIELDS = new Set<string>(SPACE_KEYS);
const SPACE_MAX = 4000;
const FONT_SIZE_MIN = 8;
const FONT_SIZE_MAX = 96;
const STROKE_WIDTH_MAX = 20;
const ROUGHNESS_VALUES = [0, 1, 2];
const FONT_FAMILY_MAX = 20;
const PALETTE_MAX = 32;
const ROLES_MAX = 64;
const GROUP_NAME_MAX = 40;

export type StylePackErrorReason = "bad-json" | "bad-pack" | "bad-name" | "bad-extends" | "bad-field";

export class StylePackError extends Error {
  readonly reason: StylePackErrorReason;
  readonly source: string;

  constructor(reason: StylePackErrorReason, detail: string, source: string) {
    super(`style:${reason} (${source}) ${detail}`);
    this.reason = reason;
    this.source = source;
    this.name = "StylePackError";
  }
}

export interface ParsedStylePack {
  name: string;
  extendsFrom: string;
  label: string;
  diff: PlanPresetDiff;
}

export interface StyleIO {
  /** 目录下的 .json 文件名（只要名字，路径由 read 拼） */
  list: () => Promise<string[]>;
  read: (fileName: string) => Promise<string>;
}

export interface LoadedStylePack {
  name: string;
  extends: string;
  label: string;
}

export interface StyleLoadResult {
  loaded: LoadedStylePack[];
  warnings: string[];
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function fileNameOf(source: string): string {
  const base = source.replace(/\\/g, "/").split("/").pop() ?? "";
  return base.replace(/\.json$/i, "");
}


function fail(reason: StylePackErrorReason, detail: string, source: string): never {
  throw new StylePackError(reason, detail, source);
}

function wantColor(value: unknown, field: string, source: string): string {
  if (typeof value !== "string" || !COLOR_RE.test(value.trim())) {
    fail("bad-field", `${field} 需要 #rgb/#rrggbb 形式的颜色`, source);
  }
  return value.trim();
}

function wantInt(value: unknown, field: string, min: number, max: number, source: string): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < min || n > max) {
    fail("bad-field", `${field} 需要 ${min}..${max} 的整数（收到 ${String(value)}）`, source);
  }
  return n;
}

function wantEnum<T extends string>(
  value: unknown,
  field: string,
  allowed: readonly T[],
  source: string,
): T {
  if (typeof value !== "string" || !(allowed as readonly string[]).includes(value)) {
    fail("bad-field", `${field} 只能是 ${allowed.join("/")}（收到 ${String(value)}）`, source);
  }
  return value as T;
}

function parseFontSizes(raw: unknown, source: string): Partial<PlanFontSize> {
  if (!isRecord(raw)) fail("bad-field", "fontSizes 需要对象 {title,node,edge,caption}", source);
  const out: Partial<PlanFontSize> = {};
  for (const key of ["title", "node", "edge", "caption"] as const) {
    const value = (raw as Record<string, unknown>)[key];
    if (value === undefined) continue;
    out[key] = wantInt(value, `fontSizes.${key}`, FONT_SIZE_MIN, FONT_SIZE_MAX, source);
  }
  const extra = Object.keys(raw).filter((k) => !["title", "node", "edge", "caption"].includes(k));
  if (extra.length) fail("bad-field", `fontSizes 有未知字段 ${extra.join(",")}`, source);
  if (Object.keys(out).length === 0) fail("bad-field", "fontSizes 是空对象", source);
  return out;
}

function parsePalette(raw: unknown, source: string): string[] {
  if (!Array.isArray(raw) || raw.length === 0) fail("bad-field", "palette 需要非空数组", source);
  if (raw.length > PALETTE_MAX) fail("bad-field", `palette 最多 ${PALETTE_MAX} 色`, source);
  return raw.map((c, i) => wantColor(c, `palette[${i}]`, source));
}

function parseSpace(raw: unknown, source: string): Partial<PlanSpace> {
  if (!isRecord(raw)) fail("bad-field", "space 需要对象（gapX/gapY/padX/padY…）", source);
  const out: Partial<PlanSpace> = {};
  for (const key of SPACE_KEYS) {
    const value = (raw as Record<string, unknown>)[key];
    if (value === undefined) continue;
    out[key] = wantInt(value, `space.${key}`, 0, SPACE_MAX, source);
  }
  const extra = Object.keys(raw).filter((k) => !SPACE_FIELDS.has(k));
  if (extra.length) fail("bad-field", `space 有未知字段 ${extra.join(",")}`, source);
  if (Object.keys(out).length === 0) fail("bad-field", "space 是空对象", source);
  return out;
}

function parseGroupColor(raw: unknown, source: string): PlanGroupColor {
  if (!isRecord(raw)) fail("bad-field", "groupColor 需要对象 {mode,roles}", source);
  const mode = wantEnum(raw.mode, "groupColor.mode", ["hash", "roles"] as const, source);
  if (mode !== "roles") return { mode };
  const rawRoles = raw.roles;
  if (!isRecord(rawRoles)) fail("bad-field", "groupColor.roles 需要 {分组名:颜色}", source);
  const entries = Object.entries(rawRoles);
  if (entries.length === 0) fail("bad-field", "groupColor.roles 是空对象", source);
  if (entries.length > ROLES_MAX) fail("bad-field", `groupColor.roles 最多 ${ROLES_MAX} 组`, source);
  const roles: Record<string, string> = {};
  for (const [group, color] of entries) {
    const key = group.trim().slice(0, GROUP_NAME_MAX);
    if (!key) fail("bad-field", "groupColor.roles 有空的分组名", source);
    roles[key] = wantColor(color, `groupColor.roles.${key}`, source);
  }
  return { mode, roles };
}

function parseRoundness(raw: unknown, source: string): { type: number } | null {
  if (raw === null) return null;
  if (typeof raw === "number") return { type: raw };
  if (isRecord(raw) && typeof raw.type === "number") return { type: raw.type };
  return fail("bad-field", "nodeRoundness 需要 null / {type:number}", source);
}

/**
 * JSON 正文 → 注册表条目。name 缺省取文件名；只校验「写了的字段」，
 * 未知字段忽略（方便以后加 token 不破坏旧包）。
 */
export function parseStylePack(text: string, source = "inline", known: Set<string> = new Set()): ParsedStylePack {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (e) {
    return fail("bad-json", `不是合法 JSON：${e instanceof Error ? e.message : String(e)}`, source);
  }
  if (!isRecord(raw)) return fail("bad-pack", "风格包必须是 JSON 对象", source);

  const nameRaw = typeof raw.name === "string" && raw.name.trim() ? raw.name : fileNameOf(source);
  const name = slugStyleName(nameRaw);
  if (!NAME_RE.test(name)) {
    fail("bad-name", `${nameRaw} → ${name || "(空)"}（要求小写字母/数字/._-，首字符字母数字，≤32）`, source);
  }
  const extendsRaw = raw.extends === undefined || raw.extends === null || raw.extends === ""
    ? "pencil"
    : slugStyleName(String(raw.extends));
  if (!hasStyle(extendsRaw) && !known.has(extendsRaw)) {
    fail("bad-extends", `${extendsRaw} 不存在（内置之外可用 ${[...known].join("/") || "无"}）`, source);
  }
  if (extendsRaw === name) fail("bad-extends", "不能 extends 自己", source);

  const diff: PlanPresetDiff = {};
  const colorFields = ["background", "ink", "fill", "edge", "muted"] as const;
  for (const field of colorFields) {
    if (raw[field] !== undefined) diff[field] = wantColor(raw[field], field, source);
  }
  if (raw.palette !== undefined) diff.fillPalette = parsePalette(raw.palette, source);
  if (raw.strokeWidth !== undefined) {
    diff.strokeWidth = wantInt(raw.strokeWidth, "strokeWidth", 0, STROKE_WIDTH_MAX, source);
  }
  if (raw.roughness !== undefined) {
    const n = wantInt(raw.roughness, "roughness", 0, 2, source);
    if (!ROUGHNESS_VALUES.includes(n)) fail("bad-field", "roughness 只能是 0/1/2", source);
    diff.roughness = n;
  }
  if (raw.fillStyle !== undefined) {
    diff.fillStyle = wantEnum(raw.fillStyle, "fillStyle", FILL_STYLES, source);
  }
  if (raw.strokeStyle !== undefined) {
    diff.strokeStyle = wantEnum(raw.strokeStyle, "strokeStyle", STROKE_STYLES, source);
  }
  if (raw.fontFamily !== undefined) {
    diff.fontFamily = wantInt(raw.fontFamily, "fontFamily", 1, FONT_FAMILY_MAX, source);
  }
  if (raw.fontSizes !== undefined) diff.fontSizes = parseFontSizes(raw.fontSizes, source);
  if (raw.nodeRoundness !== undefined) diff.nodeRoundness = parseRoundness(raw.nodeRoundness, source);
  if (raw.space !== undefined) diff.space = parseSpace(raw.space, source);
  if (raw.groupColor !== undefined) diff.groupColor = parseGroupColor(raw.groupColor, source);

  const label = typeof raw.label === "string" && raw.label.trim() ? raw.label.trim().slice(0, 40) : name;
  return { name, extendsFrom: extendsRaw, label, diff };
}

export function registerStylePackJson(text: string, source = "inline", known?: Set<string>): LoadedStylePack {
  const pack = parseStylePack(text, source, known);
  registerStylePack(pack.name, { extendsFrom: pack.extendsFrom, diff: { ...pack.diff, label: pack.label } });
  return { name: pack.name, extends: pack.extendsFrom, label: pack.label };
}

/**
 * 目录 → 注册表。每次先清空外部包（删掉的包不该继续生效），
 * 单个包出错只丢这一条 warning，其余包与内置照旧可用。
 */
export async function loadStylePacks(io: StyleIO, dir = STYLE_DIR): Promise<StyleLoadResult> {
  unregisterStylePacks();
  const warnings: string[] = [];
  let names: string[] = [];
  try {
    names = (await io.list()).filter((n) => /\.json$/i.test(n)).sort();
  } catch (e) {
    warnings.push(`${dir} 目录读不了，只用内置风格：${e instanceof Error ? e.message : String(e)}`);
    return { loaded: [], warnings };
  }
  const known = new Set(names.map((n) => slugStyleName(fileNameOf(n))));
  const loaded: LoadedStylePack[] = [];
  for (const fileName of names) {
    const source = `${dir}/${fileName}`;
    let text: string;
    try {
      text = await io.read(fileName);
    } catch (e) {
      warnings.push(`${source} 读不到，已跳过：${e instanceof Error ? e.message : String(e)}`);
      continue;
    }
    try {
      loaded.push(registerStylePackJson(text, source, known));
    } catch (e) {
      if (e instanceof StylePackError) warnings.push(e.message);
      else warnings.push(`${source} 加载失败：${e instanceof Error ? e.message : String(e)}`);
    }
  }
  // 全部注册完再解析一遍：extends 指向坏包/成环在这里就报出来，不等绘图
  for (const pack of loaded) {
    try {
      presetOf(pack.name);
    } catch (e) {
      warnings.push(`style:${pack.name} 解析失败，绘图时不可用：${e instanceof Error ? e.message : String(e)}`);
    }
  }
  return { loaded, warnings };
}

/** 已注册风格包（内置在前），坏链的包不出现（loadStylePacks 已给过 warning） */
export function listStyles(): LoadedStylePack[] {
  const out: LoadedStylePack[] = [];
  for (const name of styleNames()) {
    try {
      out.push({ name, extends: styleBaseOf(name) ?? "-", label: presetOf(name).label ?? name });
    } catch {
      // extends 坏掉：跳过
    }
  }
  return out;
}

const DIFF_FIELDS = [
  "background", "ink", "fill", "edge", "muted",
  "strokeWidth", "roughness", "fillStyle", "strokeStyle", "fontFamily", "nodeRoundness",
] as const;

/**
 * 反写 diff-only JSON（导出与手写同 schema）。
 * 内置包返回完整规格；外部包只回与基线不同的字段。
 */
export function diffOf(name: string): Record<string, unknown> {
  const spec = presetOf(name);
  const base = styleBaseOf(name);
  if (!base) return { ...spec };
  const baseline = presetOf(base);
  const out: Record<string, unknown> = { name, extends: base, label: spec.label ?? name };
  for (const field of DIFF_FIELDS) {
    if (JSON.stringify(baseline[field]) !== JSON.stringify(spec[field])) out[field] = spec[field] ?? null;
  }
  if (JSON.stringify(baseline.fillPalette) !== JSON.stringify(spec.fillPalette)) {
    if (spec.fillPalette) out.palette = spec.fillPalette.slice();
  }
  const fonts = subsetDiff(baseline.fontSizes, spec.fontSizes);
  if (fonts) out.fontSizes = fonts;
  const space = subsetDiff(baseline.space, spec.space);
  if (space) out.space = space;
  if (JSON.stringify(baseline.groupColor) !== JSON.stringify(spec.groupColor)) {
    if (spec.groupColor) out.groupColor = spec.groupColor;
  }
  return out;
}

function subsetDiff<T extends object>(base: T | undefined, spec: T | undefined): Record<string, unknown> | null {
  if (!spec) return null;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(spec)) {
    if (JSON.stringify((base as Record<string, unknown> | undefined)?.[key]) !== JSON.stringify(value)) {
      out[key] = value;
    }
  }
  return Object.keys(out).length ? out : null;
}
