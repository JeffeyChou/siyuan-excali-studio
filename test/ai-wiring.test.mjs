// 2026-10-18 A/B 接线契约：能力注册、路径白名单、共享渲染核心、CLI/Skill 资产、风格包（C 通道 + 内核）。
// 与 smoke-wiring 同口径：行为断言跑在去注释源码上，避免注释里的字样造成空洞通过。
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { normalizePlan } from "../src/studio/ai/plan.ts";
import { parseStylePack } from "../src/studio/ai/style-pack.ts";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function read(rel) {
  return readFileSync(resolve(ROOT, rel), "utf8");
}
function json(rel) {
  return JSON.parse(read(rel));
}
function stripComments(code) {
  return code.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'\\])\/\/[^\n]*/g, "$1");
}

const INDEX = stripComments(read("src/index.ts"));
const EA_HANDLE = stripComments(read("src/studio/ea-handle.ts"));
const CLI = read("scripts/excali-board.mjs");
const SKILL = read("script/excali-draw/SKILL.md");
const PACK = stripComments(read("scripts/pack.mjs"));
const KERNEL_BOARDS = stripComments(read("src/kernel/boards.ts"));
const KERNEL_INDEX = stripComments(read("src/kernel/index.ts"));

const ONLOAD = INDEX.slice(INDEX.indexOf("async onload()"), INDEX.indexOf("onunload()"));
const LIST_IMPL = INDEX.slice(INDEX.indexOf("private async agentListBoards"), INDEX.indexOf("private async agentOpenBoard"));
const OPEN_IMPL = INDEX.slice(INDEX.indexOf("private async agentOpenBoard"), INDEX.indexOf("private async agentDrawBoard"));
const DRAW_IMPL = INDEX.slice(INDEX.indexOf("private async agentDrawBoard"), INDEX.indexOf("private registerAgentCapabilities"));
const RESOLVE_IMPL = INDEX.slice(INDEX.indexOf("private async resolveAgentBoard"), INDEX.indexOf("private async waitForAgentActions"));
const ORIGIN_IMPL = INDEX.slice(INDEX.indexOf("private agentDrawOrigin"), INDEX.indexOf("private async agentListBoards"));
const IMAGE_IMPL = INDEX.slice(INDEX.indexOf("private async agentGenerateImage"), INDEX.indexOf("private agentImageDimension"));
const SETTINGS_IMPL = INDEX.slice(INDEX.indexOf("private setupSetting"), INDEX.indexOf("private async loadState"));

/** 按能力名切出注册块（到下一个注册点或方法结尾） */
function capability(name) {
  const at = INDEX.indexOf(`name: "${name}"`);
  assert.ok(at >= 0, `没有注册能力 ${name}`);
  const end = INDEX.indexOf("this.addAgentCapability({", at);
  return INDEX.slice(at, end === -1 ? undefined : end);
}

test("A·能力注册：onload 内、await ready 之前、老版本静默跳过", () => {
  assert.match(ONLOAD, /this\.setupSetting\(\);[\s\S]{0,200}this\.registerAgentCapabilities\(\);/, "注册要挂在 setupSetting 之后");
  const reg = ONLOAD.indexOf("this.registerAgentCapabilities()");
  const ready = ONLOAD.indexOf("await this.ready");
  assert.ok(reg >= 0 && ready >= 0 && reg < ready, "注册不能等到 ready 之后（老内核/迁移失败会拖住能力上线）");
  const impl = INDEX.slice(INDEX.indexOf("private registerAgentCapabilities"), INDEX.indexOf("private scriptPickerDialog"));
  assert.match(impl, /typeof this\.addAgentCapability !== "function"/, "老版本 SDK 没有该方法，必须能力探测");
  assert.match(impl, /try \{/, "降级路径要兜异常，不能把 onload 带崩");
  assert.match(impl, /catch \(e\)[\s\S]{0,120}注册智能体能力失败/, "失败要有日志");
});

test("A·三个能力名 + 副作用声明（列表/打开只读，绘制读写）", () => {
  const list = capability("excali_list_boards");
  const open = capability("excali_open_board");
  const draw = capability("excali_draw_board");
  assert.match(list, /effects:\s*\{\s*localRead:\s*true\s*\}/);
  assert.match(open, /effects:\s*\{\s*localRead:\s*true\s*\}/);
  assert.equal(/localWrite/.test(list), false, "列表不许写");
  assert.equal(/localWrite/.test(open), false, "打开不许写");
  assert.match(draw, /effects:\s*\{\s*localRead:\s*true,\s*localWrite:\s*true\s*\}/, "绘制会落盘，必须声明 localWrite（走思源确认）");
  for (const block of [list, open, draw]) {
    assert.match(block, /handler: \(args\) => this\.agentRun\(/, "handler 统一过 agentRun，异常转 {error}");
  }
  assert.match(draw, /required: \["plan"\]/, "plan 必填");
  assert.match(draw, /required: \["nodes"\]/, "计划里 nodes 必填");
  assert.match(draw, /style: \{ type: "string"/, "风格包名要能传（不能锁死三个内置枚举）");
  assert.match(draw, /preset: \{ type: "string", description:/, "preset 保留但不再枚举");
  assert.equal(/enum: \["pencil", "marker", "blueprint"\]/.test(draw), false, "风格已可扩展，枚举会把外部包挡在门外");
  assert.match(draw, /enum: \["lr", "tb", "grid", "radial"\]/);
  assert.match(draw, /append: \{ type: "boolean"/, "append 语义要在 schema 里写明");
});

test("A·list/open：读保存目录、限流、打开后等画布就绪", () => {
  assert.match(LIST_IMPL, /listBoardEntries\(this\.settings\.saveDir\)/);
  assert.match(LIST_IMPL, /Math\.max\(1, Math\.min\(100, Math\.floor\(rawLimit\)\)\)/, "limit 收敛到 1..100");
  assert.match(LIST_IMPL, /title: fileNameOf\(e\.path\)\.replace\(\/\\\.svg\$\/i, ""\)/, "标题去掉扩展名");
  assert.match(
    LIST_IMPL,
    /structuredContent: \{\s*dir: this\.agentBoardDir\(\),\s*total: filtered\.length,\s*boards,\s*styles,/,
    "列表回带可用风格，外部智能体才知道风格包名",
  );
  assert.match(OPEN_IMPL, /await this\.openStudioTab\(target\.path\)/);
  assert.match(OPEN_IMPL, /waitForAgentActions\(target\.path, 15000\)/, "打开后等引擎就绪（懒加载）");
  assert.match(OPEN_IMPL, /ready: !!actions/);
});

test("A·draw：计划解析 → 找板/建板 → 共享渲染 → 句柄绘制 → flush", () => {
  assert.match(DRAW_IMPL, /if \(typeof plan === "string"\)[\s\S]{0,160}JSON\.parse\(plan\)/, "能力入参常是 JSON 字符串");
  assert.match(DRAW_IMPL, /const append = args\.append !== false/, "默认追加");
  assert.match(DRAW_IMPL, /const existing = append \? await this\.resolveAgentBoard\(args\) : null/);
  assert.match(DRAW_IMPL, /if \(append && named && !existing\)[\s\S]{0,120}不自动改新建/, "点名了却找不到板要报错，不能偷偷新建");
  assert.match(DRAW_IMPL, /await this\.createBoardFile\(name\)/, "新建走宿主既有文件先行链路");
  assert.match(DRAW_IMPL, /await this\.openStudioTab\(target\.path, docId\)/);
  assert.match(DRAW_IMPL, /const handle = actions\?\.getEaHandle\(\)/);
  assert.match(DRAW_IMPL, /const origin = created \? \{ x: 0, y: 0 \} : this\.agentDrawOrigin\(handle\)/);
  assert.match(DRAW_IMPL, /const packs = await this\.loadAgentStyles\(\)/, "绘图前重读风格包目录（包是用户手改的 JSON）");
  assert.match(
    DRAW_IMPL,
    /renderPlan\(plan, \{\s*origin,\s*idPrefix: nextId\("ai"\),\s*preset: styleRaw,\s*layout: args\.layout,?\s*\}\)/,
    "绘制必须走共享 renderPlan（与 CLI 同口径），id 前缀防撞",
  );
  assert.match(DRAW_IMPL, /const styleRaw = \[args\.style, args\.preset\]/, "--style 与 preset 同义，style 优先");
  assert.ok(INDEX.includes("listFilesWithExt(STYLE_DIR"), "风格包只读 assets/excali-styles 目录");
  assert.match(DRAW_IMPL, /handle\.addElements\(rendered\.specs\)/);
  assert.match(DRAW_IMPL, /handle\.connectObjects\(route\.fromElementId, route\.side1, route\.toElementId, route\.side2, 4\)/);
  assert.match(DRAW_IMPL, /handle\.patchElements\(\[arrowId\], \{[\s\S]{0,220}points: route\.points/, "折线与样式要和 CLI 一致");
  assert.match(DRAW_IMPL, /handle\.selectElements\(rendered\.nodes\.map\(\(n\) => n\.elementId\)\)/, "画完选中新节点");
  assert.match(DRAW_IMPL, /handle\.scrollToContent\(\)/);
  assert.match(DRAW_IMPL, /saved = await actions\.flush\(\)/, "画完立即落盘");
  assert.match(DRAW_IMPL, /warnings: rendered\.plan\.warnings/, "计划警告原样回传");
  assert.match(DRAW_IMPL, /created,[\s\S]{0,200}path: toAssetRef\(target\.path\)/, "结构化结果给资产 ref");
});

test("A·路径白名单：只认 saveDir 下 .svg，标题大小写不敏感且原样优先", () => {
  assert.match(
    INDEX,
    /private agentBoardDir\(\): string \{\s*return toAssetRef\(toDataPath\(this\.settings\.saveDir\)\)\.replace\(\/\\\/\+\$\/, ""\);/,
    "白板目录 = 保存目录的资产 ref",
  );
  assert.match(RESOLVE_IMPL, /const rel = toAssetRef\(toDataPath\(pathArg\)\)/);
  assert.match(RESOLVE_IMPL, /if \(!\/\\\.svg\$\/i\.test\(rel\)\) return null/);
  assert.match(RESOLVE_IMPL, /if \(dir !== "" && !rel\.startsWith\(`\$\{dir\}\/`\)\) return null/, "目录外一律拒绝");
  assert.match(RESOLVE_IMPL, /await fileExists\(rel\)/);
  assert.match(RESOLVE_IMPL, /\.replace\(\/\\\.svg\$\/i, ""\)\.toLowerCase\(\) === wanted/);
  assert.match(RESOLVE_IMPL, /const exact = matches\.find/, "同名多档时原样大小写优先");
  assert.match(RESOLVE_IMPL, /const hit = exact \?\? matches\[0\]/, "找不到原样再回退第一个");
  assert.match(RESOLVE_IMPL, /return \{ path: toDataPath\(hit\.path\)/);
  assert.match(ORIGIN_IMPL, /box\.maxY \+ 80/, "追加落点 = 旧内容下方 80px");
  assert.match(ORIGIN_IMPL, /visible\.length === 0\) return \{ x: 0, y: 0 \}/);
});

test("A·等待画布：按 dataPath 找活页签，轮询 getEaHandle", () => {
  const wait = INDEX.slice(INDEX.indexOf("private async waitForAgentActions"), INDEX.indexOf("private agentDrawOrigin"));
  assert.match(wait, /session\.data\.dataPath !== target/);
  assert.match(wait, /this\.boardActions\.get\(custom\)/);
  assert.match(wait, /actions\?\.getEaHandle\(\)/);
  assert.match(wait, /setTimeout\(resolve, 120\)/);
  assert.match(wait, /while \(Date\.now\(\) < deadline\)/);
});

test("B·共享核心：前端与 CLI 用同一份 render/layout，前端绑定文字走 expandElementSpecs", () => {
  assert.match(INDEX, /import \{ renderPlan \} from "\.\/studio\/ai\/render"/);
  assert.match(EA_HANDLE, /expandElementSpecs\(specs\)/, "前端 addElements 也要展开绑定文字（否则 CLI 与画布样式不一致）");
  assert.match(EA_HANDLE, /hasBoundText\(s\) \? 2 : 1/, "返回 id 要按「容器占两项」对齐");
  assert.match(read("src/studio/ai/render.ts"), /import \{ layoutPlan[\s\S]*from "\.\/layout\.ts"/);
  assert.match(CLI, /import \{ renderPlan \} from "\.\.\/src\/studio\/ai\/render\.ts"/);
  assert.match(CLI, /import \{ planToSvg \} from "\.\.\/src\/studio\/ai\/headless\.ts"/);
  assert.match(CLI, /idPrefix/, "CLI 支持自定义 id 前缀");
});

test("B·CLI：真实 data/ 目录口径 + BAK 纪律 + 原子写 + dry-run", () => {
  assert.ok(CLI.startsWith("#!/usr/bin/env -S node --experimental-strip-types"), "shebang 要能直接执行");
  assert.match(CLI, /DEDICATED_BOARD_DIR/, "默认目录与插件设置同源");
  assert.match(CLI, /join\(workspace, "data"\)/, "资产路径落在 data/ 下");
  assert.match(CLI, /if \(!isInside\(dataDir, boardDir\)\) throw new Error\(`--dir 必须位于工作空间 data\/ 下/, "目录白名单");
  assert.match(CLI, /function boardPathCandidates/, "路径同时接受资产 ref 与 data/ 前缀");
  assert.match(CLI, /decodeSvgPayload\(oldText\)/, "追加前必须解码校验");
  assert.match(CLI, /不是有效的 Excali 场景，拒绝覆盖/, "坏场景不覆盖");
  assert.match(CLI, /hasNonEmptyScene\(oldText\)/, "空场景不污染备份链");
  assert.match(CLI, /for \(let slot = BACKUP_KEEP - 1; slot >= 1; slot--\)/, "三份滚动");
  assert.match(CLI, /args\["dry-run"\]/, "dry-run 分支");
  assert.match(CLI, /args\["no-backup"\] !== true/, "--no-backup 开关");
  assert.match(CLI, /const tmp = `\$\{file\}\.tmp-\$\{process\.pid\}`;[\s\S]{0,120}await rename\(tmp, file\)/, "原子写");
  assert.match(CLI, /uniqueBoardPath/, "同名 _0/_1 避重");
  assert.match(CLI, /if \(rendered\.specs\.some\(\(spec\) => spec\.id && ids\.has\(spec\.id\)\)\)/, "追加撞 id 换前缀");
});

test("B·Skill 与示例：可被外部智能体直接读用，并写明并发限制", () => {
  assert.ok(SKILL.startsWith("---\nname: excali-draw\n"), "Skill frontmatter 名称固定");
  assert.match(SKILL, /scripts\/excali-board\.mjs/);
  assert.match(SKILL, /--workspace/);
  assert.match(SKILL, /data\/assets\/excali/, "磁盘口径要写对");
  assert.match(SKILL, /不要手写 SVG/);
  assert.match(SKILL, /白板正开在思源里时不要直接 append/, "并发覆盖必须先警告");
  assert.match(SKILL, /excali_draw_board/, "集市版没有 CLI 时要指向内置智能体能力");
  assert.match(SKILL, /warnings/, "让模型读回警告");
  assert.ok(existsSync(resolve(ROOT, "script/excali-draw/example-plan.json")));
  const example = json("script/excali-draw/example-plan.json");
  const normalized = normalizePlan(example);
  assert.equal(normalized.warnings.length, 0, "示例计划不能带警告");
  assert.ok(normalized.nodes.length >= 5);
  assert.ok(normalized.edges.length >= 5);
});

test("B·打包：engine.js / kernel.js 必须进包（漏项回归）", () => {
  const m = PACK.match(/const FILES = \[([^\]]+)\]/);
  assert.ok(m, "pack.mjs 的 FILES 锚点失效");
  const files = [...m[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]);
  assert.ok(files.includes("engine.js"), "引擎产物漏打会导致集市版白板打不开");
  assert.ok(files.includes("kernel.js"), "内核产物漏打会导致智能体/MCP 能力缺失");
  assert.ok(files.includes("index.js") && files.includes("index.css"));
  assert.match(PACK, /f === "engine\.js"/, "缺 engine.js 时要提示先 build");
  assert.match(PACK, /f === "kernel\.js"/, "缺 kernel.js 时要提示先 build");
});

test("D·能力注册：excali_generate_image 只读+写、prompt 必填、参数齐全", () => {
  const block = capability("excali_generate_image");
  assert.match(block, /effects:\s*\{\s*localRead:\s*true,\s*localWrite:\s*true\s*\}/, "生图会开板/插图并落盘");
  assert.match(block, /required: \["prompt"\]/);
  assert.match(block, /prompt: \{ type: "string"/);
  assert.match(block, /size: \{ type: "string"/, "支持单次尺寸覆盖");
  assert.match(block, /width: \{ type: "number", minimum: 64, maximum: 4096/, "显示宽高有边界");
  assert.match(block, /handler: \(args\) => this\.agentRun\(\(\) => this\.agentGenerateImage\(args\)\)/);
});

test("D·生图实现：先生成再开板、共享 generateImage + 浏览器代理、addImage + flush", () => {
  assert.match(INDEX, /import \{ generateImage, type ImageGenResult \} from "\.\/studio\/ai\/imagegen"/);
  assert.match(INDEX, /import \{ createBrowserProxy \} from "\.\/studio\/ai\/proxy"/);
  assert.match(IMAGE_IMPL, /const append = args\.append !== false/);
  assert.match(IMAGE_IMPL, /const existing = append \? await this\.resolveAgentBoard\(args\) : null/, "先校验点名板存在，避免白花一次生图");
  assert.match(IMAGE_IMPL, /if \(append && named && !existing\)[\s\S]{0,120}不自动改新建/);
  assert.match(
    IMAGE_IMPL,
    /baseUrl: this\.settings\.imageBaseUrl,[\s\S]{0,120}model: this\.settings\.imageModel,[\s\S]{0,120}apiKey: this\.settings\.imageApiKey,[\s\S]{0,120}size: this\.settings\.imageSize/,
    "四项设置要接进 generateImage",
  );
  assert.match(IMAGE_IMPL, /createBrowserProxy\(\)/, "前端走思源 forwardProxy");
  const genAt = IMAGE_IMPL.indexOf("await generateImage(");
  const createAt = IMAGE_IMPL.indexOf("await this.createBoardFile(name)");
  assert.ok(genAt >= 0 && createAt > genAt, "先生成再建板：API 失败不能留下空板");
  assert.match(IMAGE_IMPL, /await this\.openStudioTab\(target\.path, docId\)/);
  assert.match(IMAGE_IMPL, /handle\.addImage\(image\.dataURL, \{ \.\.\.origin, width, height \}\)/, "位图走画布原生 addImage");
  assert.match(IMAGE_IMPL, /handle\.selectElements\(\[imageId\]\)/);
  assert.match(IMAGE_IMPL, /handle\.scrollToElement\(imageId\)/);
  assert.match(IMAGE_IMPL, /saved = await actions\.flush\(\)/, "插完立即落盘");
  assert.match(IMAGE_IMPL, /imageId,\s*width,\s*height,/, "结构化结果回传图片 id 与尺寸");
  assert.match(INDEX, /Math\.max\(64, Math\.min\(4096, Math\.round\(n\)\)\)/, "显示尺寸收敛到 64..4096");
  assert.equal(/console\.(log|info)\([^)]*imageApiKey/.test(INDEX), false, "Key 不许进日志");
});

test("D·设置面板：四项齐全、Key 用密码框、保存时归一化", () => {
  for (const field of ["imageBaseUrlEl", "imageModelEl", "imageApiKeyEl", "imageSizeEl"]) {
    assert.match(SETTINGS_IMPL, new RegExp(`let ${field}: HTMLInputElement \\| null = null`), `缺设置变量 ${field}`);
    assert.match(SETTINGS_IMPL, new RegExp(`${field} = el`), `${field} 没有接线`);
  }
  assert.match(SETTINGS_IMPL, /title: t\("图像生成 API 地址"\)/);
  assert.match(SETTINGS_IMPL, /title: t\("图像生成模型"\)/);
  assert.match(SETTINGS_IMPL, /title: t\("图像生成 API Key"\)/);
  assert.match(SETTINGS_IMPL, /title: t\("图像生成尺寸"\)/);
  assert.match(SETTINGS_IMPL, /el\.type = "password"/, "Key 不能明文输入");
  assert.match(SETTINGS_IMPL, /el\.autocomplete = "off"/);
  assert.match(SETTINGS_IMPL, /imageApiKey: imageApiKeyEl\?\.value \?\? this\.settings\.imageApiKey/, "confirmCallback 要收口");
  assert.match(SETTINGS_IMPL, /this\.settings = normalizeSettings\(this\.settings\)/, "保存前归一化");
});

test("A·i18n：能力文案双语齐备且英文确实是英文", () => {
  const zh = json("i18n/zh_CN.json");
  const en = json("i18n/en_US.json");
  const keys = [
    "列出 Excali 白板",
    "列出白板库里的白板（标题、路径、更新时间），可按 query 过滤。只读。",
    "打开 Excali 白板",
    "用 AI 计划绘制 Excali 白板",
    "按标题/路径过滤（不区分大小写）",
    "最多返回条数，默认 50",
    "白板路径，如 assets/excali/foo.svg",
    "board 指向已有白板时是否追加，默认 true",
    "AI 白板",
    "生成图片并插入 Excali 白板",
    "调用设置里的 OpenAI 兼容图像 API 生成一张位图，插入已有白板或新建白板；图片不可编辑。需要先在插件设置里填 API 地址和 Key。",
    "画面描述（主体、风格、构图；上限 4000 字符）",
    "新白板文件名；省略用「AI 图片」",
    "board 指向已有白板时是否插入到该板，默认 true",
    "图像显示宽度；省略按原图尺寸",
    "尺寸覆盖（如 1024x1024）；省略用设置里的值",
    "AI 图片",
    "图像生成 API 地址",
    "OpenAI 兼容的 images API 地址（如 https://api.openai.com/v1）；留空 = 关闭生图。",
    "图像生成模型",
    "图像生成 API Key",
    "只保存在插件数据里，不写日志、不写白板文件。",
    "图像生成尺寸",
    "pencil/marker/blueprint 或 data/assets/excali-styles 里的风格包名",
    "风格包名：内置预设，或 assets/excali-styles 目录里的 json 包；与 preset 同义，优先 style",
    "覆盖计划内的风格",
  ];
  for (const k of keys) {
    assert.ok(k in zh, `zh_CN 缺键：${k}`);
    assert.ok(k in en, `en_US 缺键：${k}`);
    assert.notEqual(en[k], k, `英文包漏译：${k}`);
  }
  assert.equal(en["列出 Excali 白板"], "List Excali boards");
  assert.equal(en["打开 Excali 白板"], "Open Excali board");
  assert.equal(en["AI 白板"], "AI Board");
});

test("C·内核风格包：先加载包再解析计划，style 覆盖 preset，列表回带可用风格", () => {
  assert.match(KERNEL_BOARDS, /import \{ STYLE_DIR, listStyles, loadStylePacks/, "内核必须用同一份风格包核心");
  assert.match(KERNEL_BOARDS, /const packs = await loadKernelStyles\(\)/, "绘图前先读包目录");
  assert.match(KERNEL_BOARDS, /const styleRaw = styleArgOf\(args\)/);
  assert.match(KERNEL_BOARDS, /\[args\.style, args\.preset\]/, "style 优先、preset 兼容");
  assert.match(KERNEL_BOARDS, /normalizePlan\(raw, \{ preset: styleRaw/, "参数里的风格要喂给计划归一");
  assert.match(KERNEL_BOARDS, /preset: styleRaw/, "renderPlan 用归一后的风格名，不能各说各话");
  assert.match(KERNEL_BOARDS, /styleWarnings: packs\.warnings/);
  assert.match(KERNEL_BOARDS, /const styles = listStyles\(\);[\s\S]{0,400}styles,/, "列表输出可用风格");

  assert.match(KERNEL_INDEX, /style: \{ type: "string"/, "MCP/内核工具要暴露 style 参数");
  assert.doesNotMatch(KERNEL_INDEX, /preset: \{ type: "string", enum:/, "风格包是动态的，preset 不能再写死 enum");
});

test("C·示例风格包：随 Skill 发布且能被解析（防文档腐坏）", () => {
  const dir = resolve(ROOT, "script", "excali-draw", "styles");
  const names = readdirSync(dir).filter((n) => n.endsWith(".json"));
  assert.ok(names.length >= 2, "至少两个示例包");
  for (const name of names) {
    const parsed = parseStylePack(readFileSync(join(dir, name), "utf8"), name);
    assert.match(parsed.name, /^[a-z0-9][a-z0-9._-]{0,31}$/, `${name} 的包名口径不对`);
    assert.ok(["pencil", "marker", "blueprint"].includes(parsed.extendsFrom), `${name} 的基线要挂在内置上`);
    assert.ok(Object.keys(parsed.diff).length > 0, `${name} 只写差异，不能是个空壳`);
  }
  assert.match(SKILL, /--style/, "Skill 要教会外部智能体用风格包");
  assert.match(SKILL, /excali-styles/, "Skill 要写明风格包目录口径");
});
