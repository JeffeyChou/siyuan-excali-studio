/**
 * 第二十五轮：旧 assets 根目录 → 专属目录（assets/excali）的一次性迁移（纯逻辑）。
 *
 * 为什么不能“把 assets 里的 .svg 全搬走”：assets 是所有图片/附件的公共池，
 * 里面还躺着 drawio、思源自带 excalidraw 导出、tikz 等外来 svg。只收四条
 * 能证明“这块板是本插件建的”的来源：
 *   ① 最近打开（用户用过的路径）
 *   ② 第二十四轮的旧登记表（如果落过盘）
 *   ③ 存档文档的 custom-excali-svg 绑定
 *   ④ 本插件自动命名 excali-YYYYMMDD-HHMMSS.svg
 * 且只搬 legacy 目录**直下**的 .svg（.bak 由 renameSvg 随主文件搬）。
 */

import { isBackupPath, toDataPath } from "./storage.ts";

export const LEGACY_BOARD_DIR = "assets";

/** 自动命名（stampFileName）：用户重命名过的板靠 recent/登记表/绑定兜住 */
export function isAutoNamedBoard(name: string): boolean {
  return /^excali-\d{8}-\d{6}\.svg$/i.test(name);
}

/** /data/assets/x.svg → assets（目录引用形式） */
export function parentDirOf(dataPath: string): string {
  const ref = toDataPath(dataPath).replace(/^\/data\//, "");
  const at = ref.lastIndexOf("/");
  return at < 0 ? "" : ref.slice(0, at);
}

/** 路径是否正好落在 dir 下一层（子目录里的不算） */
export function isDirectChildOf(dataPath: string, dir: string): boolean {
  return parentDirOf(dataPath) === dir.replace(/^\/+|\/+$/g, "");
}

export type MigrationSources = {
  recent: readonly string[];
  /** 第二十四轮 data.json 的 boards 字段；只作为候选，不再持久化 */
  registry: readonly string[];
  docSvgs: readonly string[];
  autoNamed: readonly string[];
};

/**
 * 收候选：归一 /data 路径、去重、保序（recent 最新在前），
 * 只留 legacy 直下、非备份的 .svg。脏值一律丢，不抛。
 */
export function migrationCandidates(sources: MigrationSources, legacyDir = LEGACY_BOARD_DIR): string[] {
  const dir = legacyDir.replace(/^\/+|\/+$/g, "");
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of [...sources.recent, ...sources.registry, ...sources.docSvgs, ...sources.autoNamed]) {
    if (typeof raw !== "string" || !/\.svg$/i.test(raw) || isBackupPath(raw)) continue;
    const path = toDataPath(raw);
    if (!isDirectChildOf(path, dir) || seen.has(path)) continue;
    seen.add(path);
    out.push(path);
  }
  return out;
}

/** 按换名表重写一串路径（recent 用）：未命中的原样保留，结果去重保序 */
export function remapPaths(paths: readonly string[], remap: ReadonlyMap<string, string>): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of paths) {
    const path = toDataPath(raw);
    const next = remap.get(path) ?? path;
    if (seen.has(next)) continue;
    seen.add(next);
    out.push(next);
  }
  return out;
}
