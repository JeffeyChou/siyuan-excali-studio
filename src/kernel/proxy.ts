/**
 * 2026-10-18 C/D：内核侧 forwardProxy 适配器。
 *
 * 外部 HTTP 统一走 /api/network/forwardProxy（内核发请求，绕开前端 CORS）。
 * 响应形状与 reword 的 forwardProxyRaw 对齐：{code,msg,data:{status,headers,body}}。
 */

import type { ProxyCall, ProxyResponse } from "../studio/ai/imagegen.ts";

declare const siyuan: any;

export function createKernelProxy(): ProxyCall {
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

    const res = await siyuan.client.fetch("/api/network/forwardProxy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    let json: any = null;
    try {
      json = await res.json();
    } catch {
      throw new Error("forwardProxy 返回的不是 JSON");
    }
    const data = json?.data && typeof json.data === "object" ? json.data : {};
    return {
      code: typeof json?.code === "number" ? json.code : -1,
      msg: typeof json?.msg === "string" ? json.msg : "",
      status: typeof data.status === "number" ? data.status : 0,
      headers: data.headers && typeof data.headers === "object" ? data.headers : {},
      body: typeof data.body === "string" ? data.body : data.body != null ? JSON.stringify(data.body) : "",
    };
  };
}
