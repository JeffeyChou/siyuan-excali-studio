// 2026-10-18 B：无头 CLI 的行为测试。全部跑在 os.tmpdir 的临时工作空间里，
// 不碰真实白板；重点盯「真实思源目录口径（data/assets/excali）、BAK 滚动、路径白名单」。
import { after, test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { decodeSvgPayload } from "../src/studio/scene-codec.ts";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CLI = resolve(ROOT, "scripts/excali-board.mjs");
const workspaces = [];
const styleDirs = [];

function makeWorkspace() {
  const root = mkdtempSync(join(tmpdir(), "excali-cli-"));
  mkdirSync(join(root, "data"), { recursive: true });
  workspaces.push(root);
  return root;
}

/** 跑一次 CLI，取 stdout 最后一行 JSON（错误也走 stdout，退出码 1） */
function cli(ws, args, opts = {}) {
  return new Promise((done) => {
    const child = spawn(process.execPath, ["--experimental-strip-types", CLI, ...args], {
      cwd: opts.cwd ?? ws,
      stdio: ["pipe", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (d) => (stdout += d));
    child.stderr.on("data", (d) => (stderr += d));
    child.stdin.end(opts.stdin ?? "");
    child.on("close", (code) => {
      const lines = stdout.trim().split("\n").filter(Boolean);
      let json = null;
      try {
        json = JSON.parse(lines.at(-1) ?? "");
      } catch {
        json = null;
      }
      done({ code, stdout: stdout.trim(), stderr, json });
    });
  });
}

function boardFile(ws, title, dir = "assets/excali") {
  return join(ws, "data", ...dir.split("/"), `${title}.svg`);
}

function decodeFile(file) {
  return decodeSvgPayload(readFileSync(file, "utf8"));
}

function planJson(plan) {
  return JSON.stringify(plan);
}

after(() => {
  for (const ws of workspaces) rmSync(ws, { recursive: true, force: true });
  for (const dir of styleDirs) rmSync(dir, { recursive: true, force: true });
});

test("list·空库：目录落 data/assets/excali，输出资产相对路径", async () => {
  const ws = makeWorkspace();
  const r = await cli(ws, ["list", "--workspace", ws]);
  assert.equal(r.code, 0);
  assert.equal(r.json.ok, true);
  assert.equal(r.json.dir, "assets/excali");
  assert.equal(r.json.total, 0);
  assert.deepEqual(r.json.boards, []);
});

test("create·计划落盘可解码 + 同名自动 _0（真实 data/ 布局）", async () => {
  const ws = makeWorkspace();
  const plan = { preset: "marker", nodes: ["打开", "登录", "白板"], edges: ["打开->登录", "登录->白板"] };
  const first = await cli(ws, ["create", "--workspace", ws, "--title", "注册流程", "--plan-json", planJson(plan)]);
  assert.equal(first.code, 0);
  assert.equal(first.json.ok, true);
  assert.equal(first.json.action, "create");
  assert.equal(first.json.path, "assets/excali/注册流程.svg");
  assert.equal(first.json.boardTitle, "注册流程");
  assert.equal(first.json.nodes, 3);
  assert.equal(first.json.edges, 2);
  assert.equal(first.json.preset, "marker");
  assert.equal(first.json.layout, "lr");
  assert.ok(first.json.svgBytes > 1000);
  assert.deepEqual(first.json.warnings, []);
  const file = boardFile(ws, "注册流程");
  assert.ok(existsSync(file), "白板必须落在 data/assets/excali 下");
  const scene = decodeFile(file);
  assert.equal(scene.appState.viewBackgroundColor, "#ffffff");
  assert.equal(scene.elements.length, 8, "3 节点 ×（容器+文字）+ 2 箭头");
  assert.equal(scene.elements.filter((el) => el.type === "arrow").length, 2);
  assert.deepEqual(
    scene.elements.map((el) => el.index),
    Array.from({ length: 8 }, (_, i) => `a${String(i + 1).padStart(8, "0")}`),
  );
  const n1 = scene.elements.find((el) => el.id === "ai-n1");
  assert.equal(n1.type, "rectangle");
  assert.ok(n1.boundElements.some((x) => x.type === "text"));
  assert.ok(scene.elements.some((el) => el.containerId === "ai-n1"));
  assert.equal(scene.elements.find((el) => el.type === "arrow").startBinding.elementId, "ai-n1");

  const second = await cli(ws, ["create", "--workspace", ws, "--title", "注册流程", "--plan-json", planJson(plan)]);
  assert.equal(second.json.path, "assets/excali/注册流程_0.svg", "重名不静默覆盖");
  assert.ok(existsSync(boardFile(ws, "注册流程_0")));
});

test("create·--dry-run 不落盘；--dir 支持资产相对与 data/ 前缀", async () => {
  const ws = makeWorkspace();
  const plan = planJson({ nodes: ["甲", "乙"], edges: ["甲->乙"] });
  const dry = await cli(ws, ["create", "--workspace", ws, "--title", "草稿", "--plan-json", plan, "--dry-run"]);
  assert.equal(dry.json.ok, true);
  assert.equal(dry.json.dryRun, true);
  assert.equal(dry.json.path, "assets/excali/草稿.svg");
  assert.equal(existsSync(boardFile(ws, "草稿")), false);

  const custom = await cli(ws, [
    "create",
    "--workspace",
    ws,
    "--dir",
    "assets/excali/sub",
    "--title",
    "子目录",
    "--plan-json",
    plan,
  ]);
  assert.equal(custom.json.ok, true);
  assert.equal(custom.json.path, "assets/excali/sub/子目录.svg");
  assert.ok(existsSync(join(ws, "data", "assets", "excali", "sub", "子目录.svg")));

  const listed = await cli(ws, ["list", "--workspace", ws, "--dir", "data/assets/excali/sub"]);
  assert.equal(listed.json.total, 1, "data/ 前缀应被接受");
  assert.equal(listed.json.dir, "assets/excali/sub");
  assert.equal(listed.json.boards[0].title, "子目录");
});

test("append·BAK 三份滚动 + 新内容画在旧内容下方 + --no-backup", async () => {
  const ws = makeWorkspace();
  const base = await cli(ws, [
    "create",
    "--workspace",
    ws,
    "--title",
    "基线",
    "--plan-json",
    planJson({ nodes: ["A1", "A2"], edges: ["A1->A2"] }),
  ]);
  assert.equal(base.json.ok, true);
  const file = boardFile(ws, "基线");
  const v1 = readFileSync(file, "utf8");
  assert.equal(decodeSvgPayload(v1).elements.length, 5);

  const runAppend = (name) =>
    cli(ws, ["append", "--workspace", ws, "--board", "基线", "--plan-json", planJson({ nodes: [name] })]);

  const b = await runAppend("B");
  assert.equal(b.json.ok, true);
  assert.equal(b.json.backup, true);
  assert.ok(b.json.origin.y > 130, "追加落点应在旧内容包围盒下方");
  const v2 = readFileSync(file, "utf8");
  assert.equal(readFileSync(`${file}.bak.svg`, "utf8"), v1);
  assert.equal(decodeSvgPayload(v2).elements.length, 7);

  const c = await runAppend("C");
  assert.equal(c.json.backup, true);
  const v3 = readFileSync(file, "utf8");
  assert.equal(readFileSync(`${file}.bak2.svg`, "utf8"), v1);
  assert.equal(readFileSync(`${file}.bak.svg`, "utf8"), v2);

  const d = await runAppend("D");
  assert.equal(d.json.backup, true);
  const v4 = readFileSync(file, "utf8");
  assert.equal(readFileSync(`${file}.bak3.svg`, "utf8"), v1);
  assert.equal(readFileSync(`${file}.bak2.svg`, "utf8"), v2);
  assert.equal(readFileSync(`${file}.bak.svg`, "utf8"), v3);

  const noBackup = await cli(ws, [
    "append",
    "--workspace",
    ws,
    "--board",
    "基线",
    "--plan-json",
    planJson({ nodes: ["E"] }),
    "--no-backup",
  ]);
  assert.equal(noBackup.json.backup, false);
  assert.equal(readFileSync(`${file}.bak.svg`, "utf8"), v3, "关掉备份不许动旧槽位");
  const finalScene = decodeSvgPayload(readFileSync(file, "utf8"));
  assert.equal(finalScene.elements.length, 13, "5 + 4 次追加 × 2");
  const ids = finalScene.elements.map((el) => el.id);
  assert.equal(new Set(ids).size, ids.length, "重复追加不能撞 id");
  assert.notEqual(readFileSync(file, "utf8"), v4);
});

test("append·目标解析：标题、资产 ref、data/ 前缀、update 别名；backup 不进列表", async () => {
  const ws = makeWorkspace();
  const plan = planJson({ nodes: ["甲"] });
  await cli(ws, ["create", "--workspace", ws, "--title", "大小写板", "--plan-json", plan]);
  await cli(ws, ["create", "--workspace", ws, "--title", "另一块", "--plan-json", plan]);

  for (const board of ["大小写板", "大小写板.svg", "assets/excali/大小写板.svg", "data/assets/excali/大小写板.svg"]) {
    const r = await cli(ws, ["append", "--workspace", ws, "--board", board, "--plan-json", plan, "--dry-run"]);
    assert.equal(r.json.ok, true, `目标解析失败：${board}`);
    assert.equal(r.json.path, "assets/excali/大小写板.svg");
  }

  const alias = await cli(ws, ["update", "--workspace", ws, "--board", "大小写板", "--plan-json", plan, "--dry-run"]);
  assert.equal(alias.json.ok, true);
  assert.equal(alias.json.action, "append", "update 是 append 的别名");

  await cli(ws, ["append", "--workspace", ws, "--board", "大小写板", "--plan-json", plan]);
  const listed = await cli(ws, ["list", "--workspace", ws]);
  assert.equal(listed.json.total, 2);
  assert.equal(listed.json.boards.some((b) => /\.bak\d*\.svg$/i.test(b.path)), false, ".bak 不进白板列表");
  const filtered = await cli(ws, ["list", "--workspace", ws, "--query", "大小写"]);
  assert.equal(filtered.json.total, 1);
  assert.equal(filtered.json.boards[0].title, "大小写板");
});

test("create·stdin 计划 + --preset/--layout 覆盖", async () => {
  const ws = makeWorkspace();
  const r = await cli(
    ws,
    ["create", "--workspace", ws, "--title", "蓝图", "--plan", "-", "--preset", "blueprint", "--layout", "grid"],
    { stdin: planJson({ preset: "marker", nodes: ["A", "B", "C"] }) },
  );
  assert.equal(r.json.ok, true);
  assert.equal(r.json.preset, "blueprint", "命令行参数覆盖计划");
  assert.equal(r.json.layout, "grid");
  const scene = decodeFile(boardFile(ws, "蓝图"));
  assert.equal(scene.appState.viewBackgroundColor, "#f8fbff");
});

test("安全·路径穿越 / 越出目录 / 坏场景 / 坏计划全部拒绝且不写盘", async () => {
  const ws = makeWorkspace();
  const plan = planJson({ nodes: ["甲"] });
  await cli(ws, ["create", "--workspace", ws, "--title", "安全板", "--plan-json", plan]);
  const file = boardFile(ws, "安全板");

  const badWorkspace = await cli(ws, ["list", "--workspace", join(ws, "nope")]);
  assert.equal(badWorkspace.code, 1);
  assert.equal(badWorkspace.json.ok, false);

  for (const dir of ["../outside", "/tmp", "data/../.."]) {
    const r = await cli(ws, ["list", "--workspace", ws, "--dir", dir]);
    assert.equal(r.json?.ok, false, `--dir ${dir} 应被拒绝`);
  }

  const traversal = await cli(ws, ["append", "--workspace", ws, "--board", "../../evil.svg", "--plan-json", plan]);
  assert.equal(traversal.code, 1);
  assert.equal(traversal.json.ok, false);
  assert.match(traversal.json.error, /越出工作空间/);

  const outsideDir = await cli(ws, [
    "append",
    "--workspace",
    ws,
    "--board",
    "data/assets/other/板.svg",
    "--plan-json",
    plan,
  ]);
  assert.equal(outsideDir.json.ok, false);
  assert.match(outsideDir.json.error, /不在 .*assets\/excali/);

  const badBoard = join(ws, "data", "assets", "excali", "坏图.svg");
  writeFileSync(badBoard, "<svg xmlns='http://www.w3.org/2000/svg'><rect/></svg>", "utf8");
  const badScene = await cli(ws, ["append", "--workspace", ws, "--board", "坏图.svg", "--plan-json", plan]);
  assert.equal(badScene.json.ok, false);
  assert.match(badScene.json.error, /不是有效的 Excali 场景/);
  assert.match(readFileSync(badBoard, "utf8"), /<rect\/>/, "拒绝覆盖时必须原样保留");

  const before = readFileSync(file, "utf8");
  for (const args of [
    ["create", "--workspace", ws, "--title", "坏 JSON", "--plan-json", "{"],
    ["create", "--workspace", ws, "--title", "坏形状", "--plan-json", planJson({ nodes: [{ label: "x", shape: "hexagon" }] })],
    ["create", "--workspace", ws, "--title", "缺计划"],
    ["frobnicate", "--workspace", ws],
  ]) {
    const r = await cli(ws, args);
    assert.equal(r.code, 1, `应当失败：${args.join(" ")}`);
    assert.equal(r.json?.ok, false);
    assert.ok(r.json?.error, "失败要给一行 JSON 错误");
  }
  assert.equal(readFileSync(file, "utf8"), before, "失败命令不许改已有白板");
});

test("workspace·未传 --workspace 时从 cwd 向上找到工作空间", async () => {
  const ws = makeWorkspace();
  const pluginDir = join(ws, "data", "plugins", "siyuan-excali-studio");
  mkdirSync(pluginDir, { recursive: true });
  const r = await cli(pluginDir, ["list"], { cwd: pluginDir });
  assert.equal(r.code, 0);
  assert.equal(r.json.ok, true);
  assert.equal(realpathSync(r.json.workspace), realpathSync(ws));
});

/** 风格包目录：临时目录 + 绝对路径（--style-dir 的常用姿势） */
function makeStyleDir(files) {
  const dir = mkdtempSync(join(tmpdir(), "excali-styles-"));
  for (const [name, text] of Object.entries(files)) writeFileSync(join(dir, name), text, "utf8");
  styleDirs.push(dir);
  return dir;
}

test("风格包·--list-styles 默认只报内置，目录口径 assets/excali-styles", async () => {
  const ws = makeWorkspace();
  const r = await cli(ws, ["list", "--workspace", ws, "--list-styles"]);
  assert.equal(r.code, 0);
  assert.equal(r.json.action, "styles");
  assert.equal(r.json.styleDir, join(ws, "data", "assets", "excali-styles"));
  assert.deepEqual(r.json.styles.map((s) => s.name), ["pencil", "marker", "blueprint"]);
  assert.equal(r.json.styles[0].extends, "-", "内置包没有 extends，用 - 占位");
  assert.ok(r.json.styles.every((s) => s.label), "每条都要有展示名");
  assert.deepEqual(r.json.warnings, []);
});

test("风格包·--style + --style-dir 生效（配色与间距进产物），未知包报错含清单", async () => {
  const ws = makeWorkspace();
  const dir = makeStyleDir({
    "test-pack.json": JSON.stringify({
      extends: "pencil",
      background: "#fafafa",
      fontSizes: { node: 20 },
      space: { minW: 240 },
    }),
  });
  const plan = planJson({ nodes: ["甲", "乙"], edges: ["甲->乙"] });
  const r = await cli(ws, [
    "create",
    "--workspace",
    ws,
    "--title",
    "风格板",
    "--plan-json",
    plan,
    "--style",
    "test-pack",
    "--style-dir",
    dir,
  ]);
  assert.equal(r.json.ok, true);
  assert.equal(r.json.preset, "test-pack", "回显真正用到的风格名");
  assert.deepEqual(r.json.styleWarnings, []);
  const scene = decodeFile(boardFile(ws, "风格板"));
  assert.equal(scene.appState.viewBackgroundColor, "#fafafa", "包里的背景色要进场景");
  assert.ok(
    scene.elements.some((el) => el.type === "rectangle" && el.width === 240),
    "space.minW 要压进节点宽度",
  );

  const unknown = await cli(ws, [
    "create",
    "--workspace",
    ws,
    "--title",
    "未知风格",
    "--plan-json",
    plan,
    "--style",
    "no-such-pack",
    "--style-dir",
    dir,
  ]);
  assert.equal(unknown.code, 1);
  assert.equal(unknown.json.ok, false);
  assert.match(unknown.json.error, /no-such-pack/);
  assert.match(unknown.json.error, /test-pack/, "报错要列出可用风格");
  assert.ok(!existsSync(boardFile(ws, "未知风格")), "坏风格名不许落盘");
});

test("风格包·坏包只丢这一条并出 warning，其余包与命令照常", async () => {
  const ws = makeWorkspace();
  const dir = makeStyleDir({
    "good-pack.json": JSON.stringify({ extends: "marker", background: "#fffbe8" }),
    "broken-pack.json": "{",
    "bad-extends.json": JSON.stringify({ extends: "nope" }),
    "bad-field.json": JSON.stringify({ strokeWidth: 999 }),
  });
  const listed = await cli(ws, ["list", "--workspace", ws, "--list-styles", "--style-dir", dir]);
  assert.equal(listed.json.ok, true);
  assert.deepEqual(listed.json.styles.map((s) => s.name), ["pencil", "marker", "blueprint", "good-pack"]);
  assert.equal(listed.json.warnings.length, 3, "每个坏包一条 warning");

  const r = await cli(ws, [
    "create",
    "--workspace",
    ws,
    "--title",
    "容错板",
    "--plan-json",
    planJson({ nodes: ["甲"] }),
    "--style",
    "good-pack",
    "--style-dir",
    dir,
  ]);
  assert.equal(r.json.ok, true);
  assert.equal(r.json.styleWarnings.length, 3);
  assert.equal(decodeFile(boardFile(ws, "容错板")).appState.viewBackgroundColor, "#fffbe8");
});
