/**
 * 2026-10-18 D：前端 forwardProxy 适配器（与 kernel/proxy.ts 同口径）。
 *
 * 生图请求走思源内核转发，绕开浏览器 CORS；Key 只出现在这一次 POST 的 body 里，
 * 不写日志、不落盘。响应统一成 {code,msg,status,headers,body} 给 imagegen 纯逻辑层。
 */

import type { ProxyCall, ProxyResponse } from "./imagegen";

export function createBrowserProxy(): ProxyCall {
  return async (req): Promise<ProxyResponse> => {
    const body: Record<string, unknown> = {
      url: req.url,
      method: req.method || "POST",
      timeout: req.timeout ?? 120000,
      contentType: req.contentType || "application/json",
      headers: Object.entries(req.headers ?? {}).map(([k, v]) => ({ [k]: v })),
      payload: req.payload ?? "",
    };
    if (req.responseEncoding) body.responseEncoding = req.responseEncoding;

    const res = await fetch("/api/network/forwardProxy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = (await res.json().catch(() => null)) as {
      code?: unknown;
      msg?: unknown;
      data?: unknown;
    } | null;
    if (!json || typeof json !== "object") {
      throw new Error(`forwardProxy 返回异常（HTTP ${res.status}）`);
    }
    const data = json.data && typeof json.data === "object" ? (json.data as Record<string, unknown>) : {};
    const rawBody = data.body;
    return {
      code: typeof json.code === "number" ? json.code : -1,
      msg: typeof json.msg === "string" ? json.msg : "",
      status: typeof data.status === "number" ? data.status : 0,
      headers: data.headers && typeof data.headers === "object" ? (data.headers as Record<string, unknown>) : {},
      body: typeof rawBody === "string" ? rawBody : rawBody != null ? JSON.stringify(rawBody) : "",
    };
  };
}
