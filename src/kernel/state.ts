/**
 * 2026-10-18 C：内核读取插件设置。
 *
 * 前端用 plugin.loadData/saveData（STORAGE_KEY = "excali-studio"），落盘为
 * data/storage/petal/siyuan-excali-studio/excali-studio；内核用 siyuan.storage.get
 * 读同一份 petal。读到什么归一化什么，读失败回默认值（不阻塞能力注册）。
 */

import { normalizeSettings, type StudioSettings } from "../studio/settings.ts";

declare const siyuan: any;

export async function loadSettings(): Promise<StudioSettings> {
  try {
    const blob = await siyuan?.storage?.get?.("excali-studio");
    if (!blob) return normalizeSettings(null);
    const text = typeof blob.text === "function" ? await blob.text() : String(blob ?? "");
    const state = text ? JSON.parse(text) : null;
    return normalizeSettings(state?.settings);
  } catch (e) {
    console.warn("[excali-studio/kernel] 读取设置失败，使用默认值", e);
    return normalizeSettings(null);
  }
}
