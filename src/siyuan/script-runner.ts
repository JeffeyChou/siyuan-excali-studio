/**
 * 2026-10-16 S3：脚本运行器（new Function + ea 注入）。
 *
 * 信任级与 EA 相同：用户自己的脚本在自己机器上跑，renderer 内无额外沙箱
 * （EA 的 ea 脚本同理）。README 明示；不做脚本市场/一键安装他人脚本。
 *
 * 形态：所有脚本按 async 函数体执行（顶层 await 可用）；console 被替换成
 * 收集器，log/warn/error 都进 logs；异常连同堆桩回传。
 * 已知边界：同步死循环会卡住界面（无超时中断能力）——与 EA 一致，文档明示。
 */

import type { EaApi } from "../studio/ea-api";

export interface ScriptRunResult {
  ok: boolean;
  /** console 收集（含 warn/error 前缀） */
  logs: string[];
  error?: string;
  durationMs: number;
}

export async function runScriptCode(
  code: string,
  ea: EaApi,
  utils: EaApi["utils"],
): Promise<ScriptRunResult> {
  const logs: string[] = [];
  const push = (level: string) => (...args: unknown[]) => {
    try {
      logs.push(`[${level}] ${args.map((a) => (typeof a === "string" ? a : JSON.stringify(a))).join(" ")}`);
    } catch {
      logs.push(`[${level}] <无法序列化的输出>`);
    }
  };
  const fakeConsole = { log: push("log"), warn: push("warn"), error: push("error"), info: push("log"), debug: push("log") };
  const started = Date.now();
  try {
    // async 函数体包裹：顶层 await 可用；"use strict" 隔离 var
    const fn = new Function(
      "ea",
      "utils",
      "console",
      `"use strict";\nreturn (async () => {\n${code}\n})();`,
    );
    await fn(ea, utils, fakeConsole);
    return { ok: true, logs, durationMs: Date.now() - started };
  } catch (e) {
    const msg = e instanceof Error ? `${e.message}\n${e.stack ?? ""}` : String(e);
    return { ok: false, logs, error: msg, durationMs: Date.now() - started };
  }
}
