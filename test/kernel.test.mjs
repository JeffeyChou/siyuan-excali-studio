// 2026-10-18 C/D：内核产物行为测试。
//
// 用 vm 跑**插件根目录的 kernel.js**（这才是思源实际加载的文件），沙箱里没有
// atob/btoa/TextEncoder/TextDecoder——逼出 runtime.ts 的垫片；siyuan 用假实现，
// 文件 API 落到 os.tmpdir 的临时工作空间，不碰真实白板。
import { after, test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { decodeSvgPayload } from "../src/studio/scene-codec.ts";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const KERNEL = resolve(ROOT, "kernel.js");
const workspaces = [];

after(() => {
  for (const ws of workspaces) rmSync(ws, { recursive: true, force: true });
});

function makeWorkspace() {
  const root = mkdtempSync(join(tmpdir(), "excali-kernel-"));
  mkdirSync(join(root, "data/assets/excali"), { recursive: true });
  workspaces.push(root);
  return root;
}

function pngBase64(width, height) {
  const b = Buffer.alloc(33);
  b.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
  b.writeUInt32BE(13, 8);
  b.write("IHDR", 12, "ascii");
  b.writeUInt32BE(width, 16);
  b.writeUInt32BE(height, 20);
  b[24] = 8;
  b[25] = 2;
  return b.toString("base64");
}

function textResponse(text) {
  return {
    ok: true,
    status: 200,
    text: async () => text,
    json: async () => JSON.parse(text),
    arrayBuffer: async () => Buffer.from(text).buffer,
  };
}

function jsonResponse(payload) {
  return textResponse(JSON.stringify(payload));
}

function parseMultipart(init) {
  const boundary = /boundary=([^;]+)/.exec(init.headers["Content-Type"])[1];
  const text = Buffer.from(init.body).toString("utf8");
  const path = /name="path"\r\n\r\n([^\r]*)\r\n/.exec(text)?.[1] ?? "";
  const fileAt = text.indexOf('name="file"');
  if (fileAt < 0) throw new Error("multipart 里没有 file 字段");
  const contentStart = text.indexOf("\r\n\r\n", fileAt) + 4;
  const contentEnd = text.lastIndexOf(`\r\n--${boundary}--`);
  return { path, content: text.slice(contentStart, contentEnd) };
}

/** 假思源后端：文件 API 落到临时工作空间；forwardProxy 交给测试注入 */
function makeServer(ws, opts = {}) {
  const state = { settings: opts.settings ?? null };
  const calls = { put: [], proxy: [] };
  const toAbs = (dataPath) => join(ws, String(dataPath).replace(/^\/+/, ""));

  const fetch = async (url, init = {}) => {
    switch (url) {
      case "/api/file/getFile": {
        const body = JSON.parse(init.body);
        const abs = toAbs(body.path);
        if (!existsSync(abs) || statSync(abs).isDirectory()) {
          return jsonResponse({ code: -1, msg: `open ${body.path}: no such file` });
        }
        return textResponse(readFileSync(abs, "utf8"));
      }
      case "/api/file/readDir": {
        const body = JSON.parse(init.body);
        const abs = toAbs(body.path);
        if (!existsSync(abs)) return jsonResponse({ code: -1, msg: "no such dir" });
        const rows = readdirSync(abs, { withFileTypes: true }).map((d) => ({
          name: d.name,
          isDir: d.isDirectory(),
          updated: statSync(join(abs, d.name)).mtimeMs,
        }));
        return jsonResponse({ code: 0, data: rows });
      }
      case "/api/file/putFile": {
        const parsed = parseMultipart(init);
        const abs = toAbs(parsed.path);
        mkdirSync(dirname(abs), { recursive: true });
        writeFileSync(abs, parsed.content);
        calls.put.push(parsed.path);
        return jsonResponse({ code: 0 });
      }
      case "/api/file/removeFile": {
        const body = JSON.parse(init.body);
        rmSync(toAbs(body.path), { force: true });
        return jsonResponse({ code: 0 });
      }
      case "/api/network/forwardProxy": {
        const body = JSON.parse(init.body);
        calls.proxy.push(body);
        const reply = opts.proxy
          ? opts.proxy(body, calls.proxy.length)
          : { code: -1, msg: "测试未注入 proxy", status: 0, headers: {}, body: "" };
        return jsonResponse({
          code: reply.code ?? 0,
          msg: reply.msg ?? "",
          data: { status: reply.status ?? 200, headers: reply.headers ?? {}, body: reply.body ?? "" },
        });
      }
      default:
        throw new Error(`测试未实现的内核接口：${url}`);
    }
  };
  return { fetch, calls, state };
}

function loadKernel(ws, opts = {}) {
  assert.ok(existsSync(KERNEL), "缺根 kernel.js：先跑 npm run build");
  const server = makeServer(ws, opts);
  const registered = new Map();
  const legacyRegistered = new Map();
  const warns = [];
  // 内核的 registerCapability 返回 Promise，拒绝走的是异步通道——opts.reject 用来验这条
  const register = (map) => (name, config, handler) => {
    if (opts.reject) return Promise.reject(new Error(`假内核拒绝注册 ${name}`));
    map.set(name, { config, handler });
    return Promise.resolve({ name });
  };
  const agent = opts.legacy
    ? undefined
    : {
        registerCapability: register(registered),
        unregisterCapability(name) {
          registered.delete(name);
        },
      };
  const mcp = opts.legacy
    ? {
        registerTool: register(legacyRegistered),
        unregisterTool(name) {
          legacyRegistered.delete(name);
        },
      }
    : undefined;
  const lifecycle = {};
  const sandbox = {
    siyuan: {
      plugin: { lifecycle },
      ...(agent ? { agent } : {}),
      ...(mcp ? { mcp } : {}),
      storage: {
        get: async () =>
          server.state.settings ? { text: async () => JSON.stringify({ settings: server.state.settings }) } : undefined,
      },
      client: { fetch: server.fetch },
    },
    console: { log() {}, warn: (...a) => warns.push(a.join(" ")), error() {} },
  };
  vm.runInNewContext(readFileSync(KERNEL, "utf8"), sandbox, { filename: "kernel.js" });
  return { lifecycle, registered, legacyRegistered, server, sandbox, warns };
}

async function boot(ws, opts = {}) {
  const kernel = loadKernel(ws, opts);
  await kernel.lifecycle.onload();
  return kernel;
}

function cap(kernel, name) {
  const hit = kernel.registered.get(name);
  assert.ok(hit, `没有注册能力 ${name}`);
  return hit;
}

function decodeBoard(ws, relPath) {
  return decodeSvgPayload(readFileSync(join(ws, "data", relPath), "utf8"));
}

const BASE_SETTINGS = {
  saveDir: "assets/excali",
  imageBaseUrl: "https://api.example.com/v1",
  imageModel: "gpt-image-1",
  imageApiKey: "sk-kernel-test",
  imageSize: "1024x1024",
};

test("内核注册：四个能力、只读/读写副作用、卸载注销", async () => {
  const ws = makeWorkspace();
  const kernel = await boot(ws, { settings: BASE_SETTINGS });
  assert.deepEqual(
    [...kernel.registered.keys()].sort(),
    ["excali_file_draw_board", "excali_file_generate_image", "excali_file_list_boards", "excali_file_read_board"],
  );
  const readonly = ["excali_file_list_boards", "excali_file_read_board"];
  for (const name of readonly) {
    const effects = cap(kernel, name).config.effects;
    assert.equal(effects.localRead, true, `${name} 只读`);
    assert.equal(effects.localWrite, undefined, `${name} 不许写`);
  }
  for (const name of ["excali_file_draw_board", "excali_file_generate_image"]) {
    const effects = cap(kernel, name).config.effects;
    assert.equal(effects.localRead, true, `${name} 读`);
    assert.equal(effects.localWrite, true, `${name} 会落盘`);
  }
  /* effects 的四个字段名要和内核 tools.ToolEffects 的 json tag 逐字对齐（localRead/localWrite/
     dataEgress/externalCost）。内核那边是 json.Unmarshal，字段名写错不报错、只是静默少一项，
     等于把"要确认的活"说成只读。生图要把提示词发给外部付费 API，出网和花销必须如实带上。 */
  assert.equal(cap(kernel, "excali_file_draw_board").config.effects.dataEgress, undefined, "draw 纯本地，不许标出网");
  const genEffects = cap(kernel, "excali_file_generate_image").config.effects;
  assert.equal(genEffects.dataEgress, true, "generate 要把 prompt 发给外部 API");
  assert.equal(genEffects.externalCost, true, "generate 要花钱");
  assert.match(cap(kernel, "excali_file_draw_board").config.inputSchema.required.join(","), /plan/);
  assert.match(cap(kernel, "excali_file_generate_image").config.inputSchema.required.join(","), /prompt/);

  await kernel.lifecycle.onunload();
  assert.equal(kernel.registered.size, 0, "onunload 要注销全部能力");
});

test("注册被内核拒绝：Promise 拒绝要变成日志，不能静默吞掉", async () => {
  const ws = makeWorkspace();
  const kernel = loadKernel(ws, { reject: true, settings: BASE_SETTINGS });
  await kernel.lifecycle.onload();
  await new Promise((r) => setTimeout(r, 0)); // 拒绝在微任务里落地，等一拍
  assert.equal(kernel.registered.size, 0, "被拒绝的能力不该算注册成功");
  assert.equal(kernel.warns.length, 4, `四个能力各一条警告，实际 ${kernel.warns.length} 条`);
  assert.match(kernel.warns.join("\n"), /excali_file_draw_board 注册被内核拒绝/);
});

test("runtime 垫片：goja 缺的 atob/btoa/TextEncoder/TextDecoder 被补齐", async () => {
  const ws = makeWorkspace();
  const kernel = loadKernel(ws);
  for (const name of ["atob", "btoa", "TextEncoder", "TextDecoder"]) {
    assert.equal(typeof kernel.sandbox[name], "function", `${name} 未补齐`);
  }
  assert.equal(kernel.sandbox.btoa("excali"), "ZXhjYWxp");
  assert.equal(kernel.sandbox.atob("5Lit5paH").length, 6, "atob 返回二进制串（不是 UTF-8 解码）");
  const bytes = new kernel.sandbox.TextEncoder().encode("中文🙂");
  assert.equal(new kernel.sandbox.TextDecoder().decode(bytes), "中文🙂");
});

test("draw：新建到默认专属目录，list/read 能看见（中文标题与标签）", async () => {
  const ws = makeWorkspace();
  const kernel = await boot(ws, { settings: BASE_SETTINGS });
  const draw = cap(kernel, "excali_file_draw_board").handler;
  const list = cap(kernel, "excali_file_list_boards").handler;
  const read = cap(kernel, "excali_file_read_board").handler;

  const res = await draw({ plan: { title: "测试板", nodes: ["甲", "乙"], edges: ["甲->乙"] } });
  assert.equal(res.ok, true);
  assert.equal(res.created, true);
  assert.match(res.path, /^assets\/excali\/测试板\.svg$/);
  assert.equal(res.nodes, 2);
  assert.equal(res.edges, 1);

  const payload = decodeBoard(ws, res.path);
  assert.ok(payload.elements.length >= 3, "两个节点 + 一条箭头");
  assert.equal(payload.appState.viewBackgroundColor, "#fffdf7", "pencil 预设的纸面底色");

  const listed = await list({});
  assert.equal(listed.ok, true);
  assert.equal(listed.dir, "assets/excali");
  assert.equal(listed.total, 1);
  assert.equal(listed.boards[0].title, "测试板");
  assert.equal(listed.boards[0].path, res.path);

  const detail = await read({ board: "测试板" });
  assert.equal(detail.path, res.path);
  assert.ok(detail.elementCount >= 3);
  assert.ok(detail.texts.includes("甲") && detail.texts.includes("乙"), `texts=${detail.texts.join("|")}`);
  assert.ok(detail.bounds.width > 0 && detail.bounds.height > 0);
  assert.equal(detail.elements.filter((e) => e.type === "image").length, 0);
});

test("draw：追加到已有白板、落点在新内容下方、不生出备份档", async () => {
  const ws = makeWorkspace();
  const kernel = await boot(ws, { settings: BASE_SETTINGS });
  const draw = cap(kernel, "excali_file_draw_board").handler;

  const first = await draw({ plan: { title: "追加板", nodes: ["甲", "乙"], edges: ["甲->乙"] } });
  const file = join(ws, "data", first.path);
  const beforeText = readFileSync(file, "utf8");
  const before = decodeSvgPayload(beforeText);
  const oldVisible = before.elements.filter((e) => e.isDeleted !== true);
  const oldMaxY = Math.max(...oldVisible.map((e) => Number(e.y ?? 0) + Number(e.height ?? 0)));

  const second = await draw({ board: "追加板", plan: { nodes: ["丙"] } });
  assert.equal(second.ok, true);
  assert.equal(second.created, false);
  assert.equal(second.path, first.path);

  const after = decodeSvgPayload(readFileSync(file, "utf8"));
  const oldIds = new Set(before.elements.map((e) => e.id));
  const added = after.elements.filter((e) => !oldIds.has(e.id));
  assert.ok(added.length > 0, "没有追加新元素");
  assert.ok(
    Math.min(...added.map((e) => Number(e.y ?? 0))) >= oldMaxY + 80 - 1,
    "追加内容要落在旧包围盒下方 80px",
  );

  // 第五十四轮：备份链退役——覆盖三次，目录里也只有这一块板一个文件
  const third = await draw({ board: "追加板", plan: { nodes: ["丁"] } });
  assert.equal(third.created, false);
  const dirFiles = readdirSync(join(ws, "data", "assets", "excali")).filter((n) => n.endsWith(".svg"));
  assert.deepEqual(dirFiles, [first.path.split("/").pop()], "内核写侧不许生出 .bak");

  const listed = await cap(kernel, "excali_file_list_boards").handler({});
  assert.equal(listed.total, 1, ".bak 不能进白板列表");
});

test("draw：命名板不存在不自动新建；路径越界与 .. 穿越都拒绝", async () => {
  const ws = makeWorkspace();
  const kernel = await boot(ws, { settings: BASE_SETTINGS });
  const draw = cap(kernel, "excali_file_draw_board").handler;

  await assert.rejects(draw({ board: "不存在的板", plan: { nodes: ["甲"] } }), /找不到白板/);
  await assert.rejects(draw({ path: "assets/other/foo.svg", plan: { nodes: ["甲"] } }), /只允许访问/);
  await assert.rejects(
    draw({ path: "assets/excali/../../assets/other/foo.svg", plan: { nodes: ["甲"] } }),
    /不允许包含 \.\./,
  );
  await assert.rejects(draw({ path: "assets/excali/foo.png", plan: { nodes: ["甲"] } }), /必须是 \.svg/);

  const listed = await cap(kernel, "excali_file_list_boards").handler({});
  assert.equal(listed.total, 0, "失败调用不能落盘");
});

test("draw：saveDir 设置生效，标题过滤与 limit 收敛", async () => {
  const ws = makeWorkspace();
  mkdirSync(join(ws, "data/assets/custom"), { recursive: true });
  const kernel = await boot(ws, { settings: { ...BASE_SETTINGS, saveDir: "assets/custom" } });
  const draw = cap(kernel, "excali_file_draw_board").handler;
  const list = cap(kernel, "excali_file_list_boards").handler;

  const a = await draw({ plan: { title: "流程图", nodes: ["A"] } });
  await draw({ plan: { title: "架构图", nodes: ["B"] } });
  assert.match(a.path, /^assets\/custom\/流程图\.svg$/);

  const all = await list({});
  assert.equal(all.total, 2);
  assert.deepEqual(all.boards.map((b) => b.title).sort(), ["架构图", "流程图"].sort());
  const filtered = await list({ query: "流程" });
  assert.equal(filtered.total, 1);
  assert.equal(filtered.boards[0].title, "流程图");
  assert.equal((await list({ limit: 0 })).boards.length, 1, "limit 下限收敛到 1");
});

test("generate_image：inline b64 插入 image 元素与 files，请求形状正确且不回显 Key", async () => {
  const ws = makeWorkspace();
  await capDrawSeed(ws);
  const png = pngBase64(640, 480);
  const kernel = await boot(ws, {
    settings: BASE_SETTINGS,
    proxy: () => ({
      code: 0,
      msg: "",
      status: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: [{ b64_json: png, revised_prompt: "一只猫" }] }),
    }),
  });
  const generate = cap(kernel, "excali_file_generate_image").handler;

  const res = await generate({ prompt: "一只猫", board: "种子板" });
  assert.equal(res.ok, true);
  assert.equal(res.created, false);
  assert.equal(res.width, 640);
  assert.equal(res.height, 480);
  assert.equal(res.mime, "image/png");
  assert.match(res.imageId, /^kimg/);
  assert.equal(res.revisedPrompt, "一只猫");
  assert.equal(JSON.stringify(res).includes("sk-kernel-test"), false, "返回值不能带出 API Key");

  const payload = decodeBoard(ws, res.path);
  const image = payload.elements.find((e) => e.type === "image" && e.fileId === res.imageId);
  assert.ok(image, "没插 image 元素");
  assert.equal(image.width, 640);
  assert.equal(image.height, 480);
  const file = payload.files[res.imageId];
  assert.equal(file.mimeType, "image/png");
  assert.equal(file.dataURL, `data:image/png;base64,${png}`);

  const forwarded = kernel.server.calls.proxy[0];
  assert.match(forwarded.url, /\/images\/generations$/);
  assert.equal(forwarded.method, "POST");
  const auth = forwarded.headers.find((h) => "Authorization" in h)?.Authorization;
  assert.equal(auth, "Bearer sk-kernel-test");
  const body = JSON.parse(forwarded.payload);
  assert.deepEqual(body, { model: "gpt-image-1", prompt: "一只猫", n: 1, size: "1024x1024" });
  assert.equal("response_format" in body, false);

  const read = await cap(kernel, "excali_file_read_board").handler({ board: "种子板" });
  assert.equal(read.elements.filter((e) => e.type === "image").length, 1);
});

test("generate_image：url 响应二次下载；未配置 Key 直接报错", async () => {
  const ws = makeWorkspace();
  await capDrawSeed(ws);
  const png = pngBase64(320, 240);
  const kernel = await boot(ws, {
    settings: { ...BASE_SETTINGS, imageApiKey: "" },
    proxy: () => ({ code: 0, msg: "", status: 200, headers: {}, body: "" }),
  });
  const generate = cap(kernel, "excali_file_generate_image").handler;
  await assert.rejects(generate({ prompt: "猫" }), /未配置图像 API Key/);
  assert.equal(kernel.server.calls.proxy.length, 0, "没 Key 不该发请求");

  const okKernel = await boot(ws, {
    settings: BASE_SETTINGS,
    proxy: (body) =>
      body.method === "GET"
        ? { code: 0, msg: "", status: 200, headers: { "Content-Type": "image/png" }, body: png }
        : {
            code: 0,
            msg: "",
            status: 200,
            headers: {},
            body: JSON.stringify({ data: [{ url: "https://cdn.example.com/a.png" }] }),
          },
  });
  const res = await cap(okKernel, "excali_file_generate_image").handler({
    prompt: "猫",
    board: "种子板",
    width: 200,
    height: 100,
  });
  assert.equal(res.width, 200, "显式宽高优先");
  assert.equal(res.height, 100);
  assert.equal(okKernel.server.calls.proxy.length, 2, "url 响应要再下载一次");
  assert.equal(okKernel.server.calls.proxy[1].method, "GET");
  assert.equal(okKernel.server.calls.proxy[1].responseEncoding, "base64");

  const payload = decodeBoard(ws, res.path);
  const image = payload.elements.find((e) => e.type === "image" && e.fileId === res.imageId);
  assert.equal(image.width, 200);
  assert.equal(payload.files[res.imageId].dataURL, `data:image/png;base64,${png}`);
});

test("generate_image：新建白板（同名避重）与路径越界", async () => {
  const ws = makeWorkspace();
  const png = pngBase64(64, 64);
  const kernel = await boot(ws, {
    settings: BASE_SETTINGS,
    proxy: () => ({
      code: 0,
      msg: "",
      status: 200,
      headers: {},
      body: JSON.stringify({ data: [{ b64_json: png }] }),
    }),
  });
  const generate = cap(kernel, "excali_file_generate_image").handler;

  const a = await generate({ prompt: "猫" });
  const b = await generate({ prompt: "狗" });
  assert.equal(a.created, true);
  assert.equal(b.created, true);
  assert.notEqual(a.path, b.path, "同名白板不能静默覆盖");
  assert.match(b.path, /_0\.svg$/, "首撞后缀是 _0");
  assert.ok(existsSync(join(ws, "data", a.path)));
  assert.ok(existsSync(join(ws, "data", b.path)));

  await assert.rejects(generate({ prompt: "猫", path: "assets/other/x.svg" }), /只允许访问/);
  await assert.rejects(generate({ prompt: "猫", path: "assets/excali/../../../x.svg" }), /不允许包含 \.\./);
});

test("旧内核回退：只有 siyuan.mcp.registerTool 时也能注册/注销", async () => {
  const ws = makeWorkspace();
  const kernel = await boot(ws, { legacy: true, settings: BASE_SETTINGS });
  assert.equal(kernel.registered.size, 0);
  assert.deepEqual(
    [...kernel.legacyRegistered.keys()].sort(),
    ["excali_file_draw_board", "excali_file_generate_image", "excali_file_list_boards", "excali_file_read_board"],
  );
  /* 3.7 的 registerTool 只读 title/description/inputSchema/outputSchema（源码里没有 readOnly 分支），
     传 readOnly 没人看，所以旧回退分支不声明副作用——effects 是 3.8 agent API 才有的东西。 */
  for (const name of ["excali_file_list_boards", "excali_file_draw_board"]) {
    const config = capLegacy(kernel, name).config;
    assert.ok(config.description, `${name} 要有描述`);
    assert.equal(config.inputSchema.type, "object", `${name} 要有 inputSchema`);
    assert.equal(config.effects, undefined, "旧 API 不该带 effects");
  }
  const res = await capLegacy(kernel, "excali_file_draw_board").handler({ plan: { title: "旧内核板", nodes: ["A"] } });
  assert.equal(res.created, true);
  await kernel.lifecycle.onunload();
  assert.equal(kernel.legacyRegistered.size, 0);
});

function capLegacy(kernel, name) {
  const hit = kernel.legacyRegistered.get(name);
  assert.ok(hit, `旧内核回退没有注册 ${name}`);
  return hit;
}

/** 生成图片测试的前置：先画一块有内容的板，验证「插入已有板」而不是只测新建 */
async function capDrawSeed(ws) {
  const kernel = await boot(ws, { settings: BASE_SETTINGS });
  await cap(kernel, "excali_file_draw_board").handler({ plan: { title: "种子板", nodes: ["已有内容"] } });
  await kernel.lifecycle.onunload();
}
