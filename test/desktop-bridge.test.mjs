// desktop-bridge（2026-10-19）：思源 Electron 主进程通道的薄封装。
//
// 拆包事实（/Applications/SiYuan.app/.../electron/main.js）：
//   - ipcRenderer.send("siyuan-cmd", {cmd:"openPath", filePath}) → shell.openPath
//   - ipcRenderer.invoke("siyuan-get", {cmd:"showOpenDialog", ...options}) → dialog.showOpenDialog
// 本文件锁住三件最容易改坏的事：
//   ① 通道名与数据形态（cmd 字段、filePath 键名——主进程按这个分发，写错就是静默无效）；
//   ② 非桌面端（没有 window.require）必须安全降级，绝不能抛错炸画布；
//   ③ 路径拼接把 dataDir（= 工作区/data）与素材库相对路径接成合法绝对路径。
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  joinPosix,
  buildOpenDialogOptions,
  pickLibraryFile,
  openPathInFileManager,
  workspaceDataDir,
} from "../src/studio/desktop-bridge.ts";

/* ------------------------------ 纯函数 ------------------------------ */

test("joinPosix：dataDir + 素材库相对路径 → 合法绝对路径，容忍尾斜杠与重复斜杠", () => {
  assert.equal(
    joinPosix("/Users/x/思源笔记/data", "assets/excali/excali-libraries"),
    "/Users/x/思源笔记/data/assets/excali/excali-libraries",
  );
  assert.equal(joinPosix("/ws/data/", "/assets//excali"), "/ws/data/assets/excali");
  assert.equal(joinPosix("", "assets/x"), "assets/x", "dataDir 缺失时退化为相对路径（调用方判空降级）");
  assert.equal(joinPosix("/a", "", "b"), "/a/b", "空段被过滤");
});

test("buildOpenDialogOptions：初始目录 + 只列 .excalidrawlib（形态锁死，主进程平铺透传）", () => {
  const o = buildOpenDialogOptions("/ws/data/assets/excali/excali-libraries");
  assert.equal(o.defaultPath, "/ws/data/assets/excali/excali-libraries");
  assert.deepEqual(o.properties, ["openFile"]);
  assert.deepEqual(o.filters, [{ name: "Excalidraw Library", extensions: ["excalidrawlib"] }]);
  assert.equal(buildOpenDialogOptions("").defaultPath, undefined, "空目录不传 defaultPath（回落系统默认位置）");
});

/* ------------------------------ 桌面端通道 ------------------------------ */

function withWindow(win) {
  globalThis.window = win;
}

test("pickLibraryFile：siyuan-get showOpenDialog 选文件 → fs 读出 → Blob", async () => {
  const calls = [];
  const fakeIpc = {
    send: (ch, data) => calls.push(["send", ch, data]),
    invoke: async (ch, data) => {
      calls.push(["invoke", ch, data]);
      return { canceled: false, filePaths: ["/ws/data/assets/excali/excali-libraries/pack.excalidrawlib"] };
    },
  };
  withWindow({
    require: (m) =>
      m === "electron"
        ? { ipcRenderer: fakeIpc }
        : m === "fs"
          ? { readFileSync: (p, enc) => '{"type":"excalidrawlib","library":[]}' }
          : null,
  });
  const r = await pickLibraryFile("/ws/data/assets/excali/excali-libraries");
  assert.equal(r.kind, "picked");
  assert.ok(r.file.path.endsWith("pack.excalidrawlib"));
  assert.equal(await r.file.blob.text(), '{"type":"excalidrawlib","library":[]}', "内容转 Blob（updateLibrary 只认内容）");
  const [, channel, payload] = calls.find((c) => c[0] === "invoke");
  assert.equal(channel, "siyuan-get");
  assert.equal(payload.cmd, "showOpenDialog");
  assert.equal(payload.defaultPath, "/ws/data/assets/excali/excali-libraries", "初始目录 = 素材库文件夹");
});

test("pickLibraryFile：用户取消 → canceled；读文件失败 → read-error（不带路径逃逸）", async () => {
  withWindow({
    require: (m) =>
      m === "electron"
        ? { ipcRenderer: { send: () => {}, invoke: async () => ({ canceled: true, filePaths: [] }) } }
        : m === "fs"
          ? { readFileSync: () => { throw new Error("boom"); } }
          : null,
  });
  assert.equal((await pickLibraryFile("/x")).kind, "canceled");

  withWindow({
    require: (m) =>
      m === "electron"
        ? { ipcRenderer: { send: () => {}, invoke: async () => ({ canceled: false, filePaths: ["/bad.excalidrawlib"] }) } }
        : m === "fs"
          ? { readFileSync: () => { throw new Error("boom"); } }
          : null,
  });
  const r = await pickLibraryFile("/x");
  assert.equal(r.kind, "read-error");
  assert.equal(r.path, "/bad.excalidrawlib");
});

test("openPathInFileManager：siyuan-cmd openPath 通道与 filePath 键名锁死；空路径不发", () => {
  const sends = [];
  withWindow({
    require: (m) =>
      m === "electron"
        ? { ipcRenderer: { send: (ch, data) => sends.push([ch, data]), invoke: async () => ({}) } }
        : null,
  });
  assert.equal(openPathInFileManager("/ws/data/assets/excali/excali-libraries"), true);
  assert.deepEqual(sends, [["siyuan-cmd", { cmd: "openPath", filePath: "/ws/data/assets/excali/excali-libraries" }]]);
  sends.length = 0;
  assert.equal(openPathInFileManager("   "), false, "空路径不发命令");
  assert.equal(sends.length, 0);
});

/* ------------------------------ 非桌面端降级 ------------------------------ */

test("非桌面端（无 window.require）：全部安全降级，不抛错", async () => {
  withWindow({});
  assert.equal(openPathInFileManager("/x"), false);
  assert.equal((await pickLibraryFile("/x")).kind, "unavailable");
  assert.equal(workspaceDataDir(), "");
  // 连 window 都没有（早期/异常宿主）也不许炸
  delete globalThis.window;
  assert.equal(openPathInFileManager("/x"), false);
  assert.equal((await pickLibraryFile("/x")).kind, "unavailable");
  assert.equal(workspaceDataDir(), "");
});

test("workspaceDataDir：读 window.siyuan.config.system.dataDir（= 工作区/data）", () => {
  withWindow({ siyuan: { config: { system: { dataDir: "/ws/data" } } } });
  assert.equal(workspaceDataDir(), "/ws/data");
  withWindow({ siyuan: { config: { system: { dataDir: 42 } } } });
  assert.equal(workspaceDataDir(), "", "非字符串视同缺失");
});
