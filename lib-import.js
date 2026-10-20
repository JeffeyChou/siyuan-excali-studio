function k(e) {
  try {
    const t = new URL(e), r = t.searchParams.get("addLibrary");
    if (r) return r;
    if (t.hash) {
      const n = new URLSearchParams(t.hash.slice(1)).get("addLibrary");
      if (n) return n;
    }
  } catch {
  }
  return null;
}
function x(e) {
  const t = e.trim();
  if (!t) return null;
  try {
    const r = new URL(t);
    return r.protocol !== "http:" && r.protocol !== "https:" || !r.pathname.toLowerCase().endsWith(".excalidrawlib") ? null : r.toString();
  } catch {
    return null;
  }
}
function v(e) {
  const t = e.trim();
  if (!t) return { kind: "error", reason: "empty" };
  const r = k(t);
  if (r !== null) {
    const i = x(r);
    return i ? { kind: "remote", libraryUrl: i } : { kind: "error", reason: "badLibraryUrl" };
  }
  const n = x(t);
  return n ? { kind: "remote", libraryUrl: n } : { kind: "error", reason: "unrecognized" };
}
const S = ".excalidrawlib", y = `local${S}`;
function A(e) {
  let t = [];
  try {
    const r = JSON.parse(e);
    if (Array.isArray(r))
      t = r;
    else if (r && typeof r == "object") {
      const n = r;
      Array.isArray(n.libraryItems) ? t = n.libraryItems : Array.isArray(n.library) && (t = n.library);
    }
  } catch {
  }
  return P(t);
}
function U(e) {
  if (!e || typeof e != "object") return "";
  const t = e;
  return `${typeof t.id == "string" ? t.id : ""}:${typeof t.versionNonce == "number" ? t.versionNonce : ""}`;
}
function m(e) {
  const t = e.map(U).sort().join("|");
  let r = 2166136261, n = 2166136261;
  for (let i = 0; i < t.length; i++) {
    const a = t.charCodeAt(i);
    r = Math.imul(r ^ a, 16777619) >>> 0, n = Math.imul(n ^ a, 2246822507) >>> 0;
  }
  return `lib-${r.toString(16).padStart(8, "0")}${n.toString(16).padStart(8, "0")}`;
}
function h(e) {
  return !!e && typeof e == "object" && typeof e.type == "string";
}
function C(e) {
  return Object.keys(e).filter((t) => /^\d+$/.test(t)).sort((t, r) => Number(t) - Number(r)).map((t) => e[t]).filter(h);
}
function P(e, t = "published") {
  const r = [];
  for (const n of e) {
    if (Array.isArray(n)) {
      const i = n.filter(h);
      if (i.length === 0) continue;
      r.push({ id: m(i), status: t, elements: i, created: Date.now() });
      continue;
    }
    if (n && typeof n == "object") {
      const i = n;
      if (Array.isArray(i.elements)) {
        const u = i.elements.filter(h);
        if (u.length === 0) continue;
        r.push({
          ...i,
          elements: u,
          id: typeof i.id == "string" && i.id !== "" ? i.id : m(u),
          status: typeof i.status == "string" ? i.status : t,
          created: typeof i.created == "number" ? i.created : Date.now()
        });
        continue;
      }
      const a = C(i);
      a.length > 0 && r.push({ id: m(a), status: t, elements: a, created: Date.now() });
      continue;
    }
  }
  return r;
}
function D(e, t = "siyuan-excali-studio") {
  return JSON.stringify({ type: "excalidrawlib", version: 2, source: t, libraryItems: e }, null, 2);
}
function N(e) {
  if (e && typeof e == "object") {
    const t = e.id;
    if (typeof t == "string" && t !== "") return t;
  }
  return null;
}
const j = "assets/excali/excali-libraries";
function g(e) {
  const t = e.replace(/^\/+/, "");
  return t === "data" || t.startsWith("data/") ? `/${t}` : `/data/${t}`;
}
function O(e) {
  const t = (e ?? "").trim();
  if (t === "") return j;
  const r = t.replace(/\\/g, "/").replace(/^\/+/, "").replace(/\/+$/, "");
  return r === "" || r.split("/").includes("..") || r.startsWith("data/") ? j : r;
}
function R(e) {
  return `${e.replace(/\/+$/, "")}/${y}`;
}
function F(e, t) {
  const r = new URLSearchParams(e.replace(/^#/, "")), n = new URLSearchParams(t.replace(/^\?/, ""));
  return {
    addLibrary: r.get("addLibrary") ?? n.get("addLibrary"),
    dir: n.get("dir")
  };
}
function b(e) {
  const t = N(e);
  return t !== null ? `id:${t}` : `json:${JSON.stringify(e)}`;
}
function H(e, t, r) {
  const n = [...r];
  let i = 0;
  for (const a of e) {
    if (t.has(b(a))) continue;
    const u = b(a);
    t.add(u), i++;
    const d = a && typeof a == "object" && !("status" in a) ? { ...a, status: "published" } : a;
    n.push(d);
  }
  return { newCount: i, localNext: i > 0 ? n : null };
}
async function B(e) {
  const r = await (await fetch("/api/file/readDir", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path: g(e) })
  })).json().catch(() => null);
  return !r || r.code !== 0 || !Array.isArray(r.data) ? [] : r.data.filter((n) => n && n.isDir !== !0 && typeof n.name == "string").map((n) => n.name).filter((n) => n.toLowerCase().endsWith(S));
}
async function J(e) {
  const t = await fetch("/api/file/getFile", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path: g(e) })
  });
  if ((t.headers.get("content-type") || "").includes("application/json")) {
    const r = await t.json().catch(() => null);
    throw new Error(r?.msg || `getFile HTTP ${t.status}`);
  }
  if (!t.ok) throw new Error(`getFile HTTP ${t.status}`);
  return t.text();
}
async function _(e, t) {
  const r = g(e), n = new FormData();
  n.append("path", r), n.append("isDir", "false"), n.append("file", new Blob([t], { type: "application/json;charset=utf-8" }), r.split("/").pop() || "x.json");
  const i = await fetch("/api/file/putFile", { method: "POST", body: n }), a = await i.json().catch(() => null);
  if (!i.ok || !a || a.code !== 0)
    throw new Error(a?.msg || `putFile HTTP ${i.status}`);
}
function o(e) {
  const t = document.getElementById(e);
  if (!t) throw new Error(`页面缺少 #${e}`);
  return t;
}
function c(e, t, r = "none") {
  o("state").textContent = e, o("detail").innerHTML = t, o("actions").hidden = r !== "import";
}
async function z() {
  const e = F(location.hash, location.search), t = O(e.dir);
  if (o("dir").textContent = t, e.addLibrary) {
    await E(e.addLibrary, t);
    return;
  }
  o("manual").hidden = !1, c("请粘贴素材库链接", "支持「Add to Excalidraw」跳转后的地址栏链接、.excalidrawlib 直链。");
  const r = o("manual-url"), n = async () => {
    const i = r.value.trim();
    i !== "" && await E(i, t);
  };
  o("btn-manual").addEventListener("click", () => void n()), r.addEventListener("keydown", (i) => {
    i.key === "Enter" && n();
  });
}
async function E(e, t) {
  o("manual").hidden = !0;
  let r;
  try {
    const s = e.includes("%") ? decodeURIComponent(e) : e;
    r = v(s);
  } catch {
    c("链接无法识别", "请从素材库站点点「Add to Excalidraw」后复制地址栏链接，或复制「Download」按钮的 .excalidrawlib 直链。");
    return;
  }
  if (r.kind !== "remote") {
    c("该链接不是远程素材库", "本地 .excalidrawlib 文件请在思源白板内导入（☰ 菜单 → 导入素材库… → 选择文件）。");
    return;
  }
  c("正在读取素材库…", l(r.libraryUrl));
  let n;
  try {
    const s = await fetch(r.libraryUrl);
    if (!s.ok) throw new Error(`HTTP ${s.status}`);
    n = A(await s.text());
  } catch (s) {
    c("素材库读取失败", `${l(r.libraryUrl)}<br><br>${l(w(s))}`);
    return;
  }
  if (n.length === 0) {
    c("这个素材库是空的", "文件里没有可导入的条目。");
    return;
  }
  const i = R(t);
  let a = /* @__PURE__ */ new Set(), u = [];
  try {
    const T = [...await B(t)].sort(
      (f, p) => f.toLowerCase() === y ? -1 : p.toLowerCase() === y ? 1 : f.localeCompare(p)
    );
    for (const f of T) {
      const p = A(await J(`${t}/${f}`));
      f.toLowerCase() === y && (u = p);
      for (const I of p) a.add(b(I));
    }
  } catch (s) {
    console.warn("[excali-studio] 落地页读取现有图库失败，按空库处理", s);
  }
  const { newCount: d, localNext: L } = H(n, a, u), $ = M(r.libraryUrl);
  if (L === null) {
    c("这些素材已经在库里了", `来源：${l($)}，共 ${n.length} 个条目，无需重复导入。<br><br>可以关闭此页，回到思源白板窗口即可在组件库面板使用。`);
    return;
  }
  c(
    `发现 ${d} 个新素材`,
    `来源：${l($)}（共 ${n.length} 个条目，其中 ${d} 个不在当前图库中）。<br>将写入：${l(i)}`,
    "import"
  ), o("btn-import").addEventListener("click", () => {
    (async () => {
      o("btn-import").setAttribute("disabled", "true"), o("btn-cancel").setAttribute("disabled", "true");
      try {
        await _(i, D(L)), c("导入完成", `已写入 ${d} 个新素材到 ${l(i)}。<br><br>可以关闭此页——回到思源白板窗口，素材库会自动合并进组件库面板；若没看到，点白板 ☰ 菜单 →「刷新素材库」。`);
      } catch (s) {
        c("写入失败", l(w(s))), o("btn-import").removeAttribute("disabled"), o("btn-cancel").removeAttribute("disabled");
      }
    })();
  }), o("btn-cancel").addEventListener("click", () => {
    c("已取消", "没有写入任何文件。可以关闭此页。");
  });
}
function l(e) {
  return e.replace(
    /[&<>"']/g,
    (t) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[t] ?? t
  );
}
function w(e) {
  return e instanceof Error ? e.message : String(e);
}
function M(e) {
  try {
    return new URL(e).host;
  } catch {
    return e;
  }
}
typeof document < "u" && typeof location < "u" && z().catch((e) => {
  console.error("[excali-studio] 素材库落地页异常", e);
  try {
    c("页面异常", l(w(e)));
  } catch {
  }
});
export {
  j as DEFAULT_LIB_DIR,
  b as itemSignature,
  R as localLibPath,
  F as parseLandingParams,
  H as planImport,
  O as resolveLibDir,
  g as toDataPath
};
