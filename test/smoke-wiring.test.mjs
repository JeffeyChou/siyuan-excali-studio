// M0 静态契约测试：起画板这一轮最容易「半落地」（代码写了但没接线），
// 所以断言全部盯**接线点**，不盯函数存在性。
// 口径与 siyuan-plugin-reader 一致：行为断言跑在去注释后的源码上，
// 涉及注释文本的断言必须跑在原文上（去注释后恒不命中 = 空洞通过）。
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function src(rel) {
  return readFileSync(resolve(ROOT, "src", rel), "utf8");
}
function json(rel) {
  return JSON.parse(readFileSync(resolve(ROOT, rel), "utf8"));
}

/** 去 // 与 /* *\/ 注释（不处理字符串内的伪注释；本仓库源码刻意避免那种写法） */
function stripComments(code) {
  return code.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'\\])\/\/[^\n]*/g, "$1");
}

const INDEX = stripComments(src("index.ts"));
const ASSETS = stripComments(src("studio/assets.ts"));
const THEME = stripComments(src("studio/theme.ts"));
const SVG = stripComments(src("studio/svg.ts"));
const STORAGE = stripComments(src("studio/storage.ts"));
const APP = stripComments(src("studio/StudioApp.tsx"));
const TAB = stripComments(src("studio/tab.tsx"));
const TAB_TYPE = stripComments(src("studio/tab-type.ts"));
const LAZY = stripComments(src("studio/lazy.ts"));
const BUILD_SCRIPT = stripComments(src("../scripts/build.mjs"));
const I18N = stripComments(src("i18n.ts"));
const ICONS = stripComments(src("studio/icons.ts"));
const SCENE = stripComments(src("studio/scene.ts"));
const CODEC = stripComments(src("studio/scene-codec.ts"));
const DOC = stripComments(src("siyuan/doc.ts"));
const SETTINGS = stripComments(src("studio/settings.ts"));
const WELCOME_TSX = stripComments(src("studio/StudioWelcome.tsx"));
const MENU_TSX = stripComments(src("studio/StudioMenu.tsx"));
const DOCK = stripComments(src("siyuan/ExcaliDock.ts"));
const EXPORT = stripComments(src("studio/export.ts"));
const BOARD_LIST = stripComments(src("studio/board-list.ts"));
const BOARD_PICKER = stripComments(src("siyuan/board-picker.ts"));

test("契约·离线字体基址：写全局 + 按 origin 根拼址", () => {
  assert.match(ASSETS, /\.EXCALIDRAW_ASSET_PATH\s*=\s*base/, "没有把基址写到 window.EXCALIDRAW_ASSET_PATH");
  assert.match(ASSETS, /new URL\([^)]*location\.origin/, "基址必须由 location.origin 解析；用 document.baseURI 会被页面路径带偏");
  assert.equal(ASSETS.includes("document.baseURI"), false, "基址不该再读 document.baseURI");
  assert.match(ASSETS, /plugins\/\$\{PLUGIN_WEB_DIR\}\//, "基址模板必须是 plugins/<插件目录>/");
  assert.equal(json("plugin.json").name, "siyuan-excali-studio");
  assert.match(ASSETS, /const PLUGIN_WEB_DIR = "siyuan-excali-studio"/, "插件目录名与 plugin.json.name 必须一致，否则字体 404");
});

test("契约·onload 注册顺序：i18n → 命令 → 字体基址，且命令前无 await", () => {
  const onload = INDEX.slice(INDEX.indexOf("async onload()"), INDEX.indexOf("onunload()"));
  const i18n = onload.indexOf("initI18n(");
  const cmd = onload.indexOf("this.addCommand(");
  const asset = onload.indexOf("installExcalidrawAssetPath()");
  assert.ok(i18n >= 0 && cmd >= 0 && asset >= 0, `三处调用缺一不可 (i18n=${i18n}, cmd=${cmd}, asset=${asset})`);
  assert.ok(i18n < cmd, "initI18n 必须早于 addCommand：命令显示文本要过 t()");
  assert.equal(onload.slice(0, cmd).includes("await "), false, "addCommand 之前不允许出现 await（思源会在 await 期间派发快捷键）");
  assert.match(onload, /langKey:\s*"openExcaliStudio"/, "命令 langKey 必须稳定，改它等于改用户的快捷键绑定");
});

test("契约·可点击入口：图标 → 顶栏 → 斜杠，全部抢在 await 之前", () => {
  const onload = INDEX.slice(INDEX.indexOf("async onload()"), INDEX.indexOf("onunload()"));
  const i18n = onload.indexOf("initI18n(");
  const icons = onload.indexOf("this.addIcons(");
  const topbar = onload.indexOf("this.addTopBar(");
  const slash = onload.indexOf("this.protyleSlash.push(");
  const cmd = onload.indexOf("this.addCommand(");
  assert.ok(icons >= 0, "没有 addIcons：顶栏按钮会抛 Icon must be svg id or svg tag");
  assert.ok(topbar >= 0, "没有 addTopBar：用户只能靠快捷键进画板");
  assert.ok(slash >= 0, "没有 protyleSlash：编辑区里敲 / 找不到入口");
  assert.ok(icons < topbar, "图标必须先于 addTopBar 注册");
  assert.ok(i18n < topbar && i18n < slash, "顶栏 title 与斜杠文案都要过 t()，initI18n 必须更早");
  assert.equal(onload.slice(0, Math.max(icons, topbar, slash, cmd)).includes("await "), false, "入口注册不允许出现在 await 之后");
  // 顶栏引用的图标 id 必须就是 addIcons 注册的那个
  assert.match(onload, /icon:\s*STUDIO_ICON_ID/, "addTopBar 的 icon 必须用 STUDIO_ICON_ID 常量，别写字符串字面量");
  assert.match(ICONS, /export const STUDIO_ICON_ID = "iconExcaliStudio"/);
  assert.match(ICONS, /<symbol id="\$\{STUDIO_ICON_ID\}"/, "symbol 的 id 必须由同一个常量拼出来，避免两处各写一遍");
  assert.match(ICONS, /viewBox="0 0 1024 1024"/, "与同仓库图标族保持同一坐标系");
  assert.match(ICONS, /<g fill="none" stroke="currentColor"/, "线性单色：描边走 currentColor 才能跟随主题");
  assert.equal(ICONS.includes('fill="currentColor"'), false, "不能靠填充着色，否则深色下会糊成一团");
  assert.equal(/fill="#/.test(ICONS), false, "不能写死填充色，必须跟随主题");
  // 斜杠项的 html 必须是思源内置项的结构，否则菜单里是一行空白
  assert.match(ICONS, /b3-list-item__first/);
  assert.match(ICONS, /b3-list-item__graphic/);
  assert.match(ICONS, /b3-list-item__text/);
  assert.match(ICONS, /xlink:href="#\$\{STUDIO_ICON_ID\}"/, "斜杠项图标同样引用 addIcons 注册的 symbol");
});

test("契约·斜杠残留清理：只在圈住 /xxx 时删，且这一步要进撤销栈", () => {
  const clear = INDEX.slice(INDEX.indexOf("private clearSlashHint"), INDEX.indexOf("private openNew"));
  assert.match(clear, /toolbar\?\.range/, "要从 protyle.protyle.toolbar.range 取思源收敛好的斜杠区间");
  assert.match(clear, /toString\(\)\.startsWith\("\/"\)/, "必须守卫：range 万一圈住的是选中内容，宁留残留也不能误删");
  assert.match(clear, /deleteContents\(\)/, "思源对 plugin* 分支不代删「/xxx」，插件自己删");
  assert.match(
    clear,
    /new InputEvent\("input"/,
    "只 deleteContents 不会进思源的撤销栈也不会落盘，必须补一发 input 事件走它的输入管线",
  );
  assert.match(clear, /inputType:\s*"deleteContentBackward"/, "inputType 要语义正确（思源按它分流 escapeInline 等分支）");
  assert.match(INDEX, /this\.clearSlashHint\(protyle\)/, "斜杠 callback 里要调用清理");
});

test("契约·M1 打开已有白板：读回 → 解码 → 覆盖同一个文件", () => {
  assert.match(INDEX, /getFileText\(dataPath\)/, "打开已有白板必须先读文件正文");
  assert.match(INDEX, /decodeSvgScene\(/, "读回来必须解码内嵌 scene，否则只是打开一张死图");
  assert.match(TAB, /e instanceof SceneError/, "解码失败要按 reason 给可读提示（页签里就地显示，不开弹窗）");
  assert.match(INDEX, /uniqueTargetPath\(this\.settings\.saveDir, sanitizeFileName\(name, t\("未命名白板"\)\)\)/, "新建时生成文件名（撞名滚 _0/_1，第十九轮 D），之后 flush 覆盖同一个文件");
  assert.match(INDEX, /refreshAssetImages\(saved\)/, "覆盖保存后要刷新页面上已显示的图，否则用户以为没生效");
  assert.match(INDEX, /rememberRecent\(saved\)/, "保存后要进最近列表");
  assert.match(INDEX, /rememberRecent\(dataPath\)/, "打开成功的文件也要进最近列表");
  assert.match(STORAGE, /api\/file\/getFile/, "读回走 getFile");
  assert.match(STORAGE, /content-type/, "getFile 成功回正文、失败回 JSON，必须按 Content-Type 分流");
  // 归一交给 Excalidraw 自己的 restore，外部导出的图才能直接编辑
  assert.match(SCENE, /restore\(/, "解码后要过 restore 归一");
  assert.match(SCENE, /repairBindings:\s*true/, "绑定（容器/箭头）要修，外部的散图带过来常缺绑定");
  // 解码本体在 codec 里，且必须真的在解压缩/兼容三种载荷
  assert.match(CODEC, /inflate\(/, "v2 载荷是 deflate 的，必须解压");
  assert.match(CODEC, /payload-version/, "版本注释决定解压与否，必须读");
  assert.match(CODEC, /encoding !== "bstring"/, "编码白名单只认 bstring，别把未知编码硬解成乱码");
});

test("契约·覆盖保存后文件名不变（不产生第二份图）", () => {
  // 画板侧记路径：pathRef 里是当前文件，flush 时把它交给宿主去覆盖
  assert.match(APP, /const saved = await onSave\(svgText, path\);/, "把当前路径交给宿主，宿主才知道该覆盖谁");
  assert.match(APP, /pathRef\.current = saved;/, "覆盖成功后路径原样留住（创建时已在，不会变）");
});

test("契约·保存入口：☰ 无保存项（第二十一轮），⌘/Ctrl+S = 立即落盘", () => {
  // 2026-10-16 第六轮：菜单整棵换成 studio/StudioMenu.tsx，DOM 劫持随之撤销。
  // 旧写法（捕获阶段拦 data-testid="json-export-button" + 补发 Escape）已经不需要，
  // 留着反而会误导后来者以为 Excalidraw 的菜单项不可控。
  assert.equal(APP.includes("json-export-button"), false, "不该再有 DOM 劫持：菜单项是我们自己渲染的，直接接回调");
  assert.equal(/dispatchEvent\(new KeyboardEvent\("keydown", \{ key: "Escape"/.test(APP), false, "不需要补发 Escape 收菜单");
  assert.match(APP, /<StudioMenu/, "主菜单挂在 Excalidraw 的 children 里（见 StudioMenu.tsx 的 withInternalFallback 说明）");
  // 第二十一轮：保存成为后台行为（防抖自动保存），菜单里不再有「保存 / 保存副本…」
  assert.equal(APP.includes('t("保存")'), false, "菜单保存项已删");
  assert.equal(APP.includes("保存副本"), false, "保存副本已删");

  assert.match(APP, /window\.addEventListener\("keydown", onKeyDown, true\)/, "⌘S 挂 window 捕获：先于浏览器与 Excalidraw 拿到");
  assert.match(APP, /key === "s" && !event\.shiftKey && !event\.altKey/, "大小写都认；⌘⇧S 与 ⌘S 不抢（浏览器另有用处）");
  assert.match(APP, /event\.metaKey \|\| event\.ctrlKey/, "mac 用 ⌘，win/linux 用 Ctrl");
  assert.match(APP, /el\.contains\(event\.target\)/, "焦点不在画板内就放行：与 Excalidraw handleKeyboardGlobally=false 的语义对齐");
  assert.match(APP, /event\.stopImmediatePropagation\(\)/, "挡掉后续监听，避免下游再处理一次");
  assert.match(APP, /void flushRef\.current\(\)/, "⌘S = 跳过防抖立即落盘（flush 通道）");
  assert.match(APP, /key === "e" && event\.shiftKey/, "⌘⇧E 要抢在 Excalidraw 的 actionSaveAsImage 之前，否则弹它自己的导出框");
  assert.match(APP, /else setExportOpen\(true\)/, "⌘⇧E 开我们的导出对话框");
});

test("契约·新建链路（第二十一轮文件先行）：命名 → 建空文件 → 带着路径进画布", () => {
  assert.match(INDEX, /const name = await this\.promptFileName\(t\("未命名白板"\), t\("新建白板"\)\);/, "openNew 先问名（默认未命名白板）");
  assert.match(INDEX, /if \(!name\) return;/, "取消命名 = 什么都不做，文件都不建");
  assert.match(INDEX, /const \{ path, docId \} = await this\.createBoardFile\(name\);/, "创建落盘拿路径（+ 可选建档的 docId）");
  assert.match(INDEX, /await this\.openStudioTab\(path, docId\);/, "页签带着路径开：画布从第一帧起就归属文件");
  assert.match(INDEX, /sceneToSvgText\(\{ elements: \[\], appState: \{\}, files: \{\} \}\)/, "落一份空 scene 的 SVG（创建即文件）");
  assert.match(INDEX, /this\.rememberBoardFile\(target, docId \?\? undefined/, "新文件即时进库缓存：库里立即可见");
  assert.match(INDEX, /创建白板失败：\{msg\}/, "创建失败给可见提示，不静默");
  // 画板侧：路径开页签时就带好，saveFlow/saveAsFlow 整套删除
  assert.equal(APP.includes("saveFlow"), false, "首存分支删除：文件先行后没有「第一次保存」");
  assert.equal(APP.includes("saveAsFlow"), false, "保存副本删除（第二十一轮菜单无保存心智）");
  assert.match(APP, /const pathRef = useRef<string \| null>\(initialPath\);/, "路径初始值直接来自页签 data（新建也有）");
});

test("契约·M2 文档内入口：块图标菜单只对 assets/*.svg 出现", () => {
  assert.match(INDEX, /"click-blockicon"/, "块菜单事件没接，文档里的图就没有回编辑的入口");
  assert.match(INDEX, /svgAssetPathOf\(detail\.blockElements\)/, "判定必须基于被点的块，不能猜选中的是哪个");
  assert.match(INDEX, /detail\.menu\.addItem\(/, "菜单项要同步 addItem");
  assert.match(DOC, /export function svgAssetPathOf/, "块元素 → svg 路径的判定在 doc.ts，两处入口共用");
  assert.match(DOC, /\/\\\.svg\$\/i/, "只对 .svg 出现：/\\\\.svg$/i 这种正则字面量必须留在源码里");
  assert.match(DOC, /\/assets\//, "只对工作空间 assets 下的资源出现，外链图不能拦");
});

test("契约·M2 存档层：建档 = appendBlock 落文档根 + 绑属性（第二十一轮：建档在 adoptBoardFile，新建/右键共用）", () => {
  assert.match(DOC, /api\/block\/appendBlock/, "建档时图片块走 appendBlock");
  assert.match(DOC, /parentID:\s*rootID/, "appendBlock 必须给文档根 id");
  assert.match(DOC, /dataType:\s*"markdown",\s*data:\s*markdown/, "走 markdown 图片块，让思源自己转成 DOM");
  assert.equal(DOC.includes("insertBlock"), false, "旧「插到光标块之后」的路已删干净，别留半截");
  assert.match(DOC, /export function sq/, "SQL 字面量转义要独立成函数，用户输入不许直插 SQL");
  assert.match(INDEX, /const ref = toAssetRef\(item\.dataPath\);/, "建档前把 /data 路径转成文档引用的 assets/ 相对路径");
  assert.match(INDEX, /await appendImageBlock\(docId, ref, title\);/, "图片块落进新建的存档文档（adoptBoardFile，创建/右键共用）");
  assert.match(INDEX, /await setBlockAttrs\(docId, \{ "custom-excali-svg": ref \}\);/, "绑定属性：文档树菜单/自动开板/复制引用都靠它");
  assert.match(INDEX, /return docId;[\s\S]{0,200}catch \(e\) \{[\s\S]*?建档失败：\{msg\}/, "adoptBoardFile 成功回 docId（新建链路要用），失败只提示");
  assert.equal(INDEX.includes("docHasAsset"), false, "「保存到文档」的同文档去重已随功能删除");
  assert.equal(INDEX.includes("insertToDoc"), false, "insertToDoc 通道已删");
  assert.equal(INDEX.includes("insertImageBlock"), false, "旧入口已删：插入落点不再由「当前光标」猜");
  assert.equal(APP.includes("insertToDoc"), false, "画板侧也不留插入文档的回调");
});

test("契约·「当前文档」推算：聚焦编辑器事件 + 断连回退（建档选址用）", () => {
  assert.match(DOC, /switch-protyle/, "要跟最后停留的页签，getAllEditor 顺序不保证等于当前文档");
  assert.match(DOC, /click-editorcontent/, "点亮别的页签后要更新");
  assert.match(DOC, /isConnected/, "页签关了要判定断连再回退 getAllEditor");
  assert.match(DOC, /const p = activeProtyle\(\);[\s\S]{0,120}p\?\.block\?\.rootID/, "「当前文档」从活跃编辑器取，不猜");
});

test("契约·M2 覆盖后破缓存：只改 img.src 不碰 markdown", () => {
  assert.match(DOC, /searchParams\.set\("t"/, "长缓存 + 同 URL ⇒ 必须给预览图挂 ?t=");
  assert.match(DOC, /decodeURIComponent\(url\.pathname\) !== want/, "按 pathname 比对（带 query 的旧 src 也要认得出来）");
});

test("契约·M3 设置页：两项 + confirmCallback 收口 + loadData/saveData", () => {
  assert.match(INDEX, /new Setting\(\{/);
  assert.match(INDEX, /confirmCallback:\s*\(\)\s*=>/, "「保存」按钮要落盘，否则改完就丢");
  assert.ok(
    (INDEX.match(/this\.setting\.addItem\(/g) || []).length >= 2,
    "保存目录 / 强调色两项都要接线",
  );
  assert.equal(INDEX.includes("autoInsert"), false, "「保存后自动插图」已删：存档只由建档显式驱动");
  assert.equal(SETTINGS.includes("autoInsert"), false, "设置归一里也不该再有 autoInsert");
  assert.match(INDEX, /this\.openSetting\(\)/, "设置入口用插件自带 openSetting，别自己造 Dialog");
  assert.match(INDEX, /normalizeSettings\(/, "读盘必须过归一，脏数据不能把插件带崩");
  assert.match(INDEX, /this\.loadData\(STORAGE_KEY/, "持久化读走 loadData");
  assert.match(INDEX, /this\.saveData\(STORAGE_KEY/, "持久化写走 saveData");
  assert.match(SETTINGS, /saveDir: dir/, "saveDir 空串要回落默认值");
});

test("契约·M3 强调色：只作默认画笔色，不覆盖已有图", () => {
  assert.match(THEME, /readSiyuanAccent/, "强调色从 --b3-theme-primary 现读");
  assert.match(INDEX, /settings\.accentStroke \?\s*readSiyuanAccent\(\)\s*:\s*null/, "设置里关掉就不传（页签 host 的 getter 现读）");
  assert.match(APP, /currentItemStrokeColor/, "强调色落到 appState.currentItemStrokeColor");
  assert.match(APP, /\.\.\.initial\.appState, \.\.\.\(stroke \?\? \{\}\)/, "已有图只在缺省时才吃强调色");
});

test("契约·前端矩阵含移动（页签形态在全部前端可用）", () => {
  const p = json("plugin.json");
  assert.deepEqual(p.frontends.sort(), ["browser-desktop", "browser-mobile", "desktop", "mobile"]);
  assert.match(TAB, /custom\.element/, "面板挂 custom.element：各前端的 panelElement 都经它暴露");
});

test("契约·卸载拆除：onunload 关闭全部页签并提示", () => {
  const onunload = INDEX.slice(INDEX.indexOf("onunload()"), INDEX.indexOf("private async openStudioTab"));
  assert.ok(
    INDEX.indexOf("private async openStudioTab") > INDEX.indexOf("onunload()"),
    "锚点顺序变了，先修切片区间再谈断言",
  );
  assert.match(onunload, /\[\.\.\.this\.tabs\.values\(\)\]/, "先拷贝再关：close 会同步改 map，边遍历边删会漏页签");
  assert.match(onunload, /s\.tab\.close\(\)/);
  assert.match(onunload, /this\.tabs\.clear\(\)/);
  assert.match(onunload, /showMessage\(/, "有页签被强关时要说清未保存的改动会丢");
});

test("契约·页签打开：addTab 注册 + openTab 带稳定 id/图标/数据", () => {
  assert.match(INDEX, /this\.addTab\(\{/, "没有 addTab 注册，openTab 找不到页签模型");
  assert.match(INDEX, /type:\s*STUDIO_TAB_TYPE/);
  assert.match(TAB_TYPE, /export const STUDIO_TAB_TYPE = "board"/);
  assert.match(INDEX, /id:\s*this\.name \+ STUDIO_TAB_TYPE/, "custom.id 必须是 plugin.name+type：思源按它找回模型、做去重");
  assert.match(INDEX, /icon:\s*STUDIO_ICON_ID/, "页签图标必须用 addIcons 注册的那个 id");
  assert.match(INDEX, /await openTab\(\{/, "打开页签走思源导出的 openTab");
  assert.match(
    INDEX,
    /data:\s*\{\s*dataPath:\s*target,\s*docId\s*\}\s*satisfies\s+StudioTabData/,
    "data 放可 JSON 化的 dataPath + docId（layout.json 会持久化它）",
  );
  assert.match(INDEX, /openNewTab:\s*true/, "两张新白板的 data 相同，不绕开思源按 data 深比的复用就会把第二张并进第一张");
});

test("契约·页签去重：同一文件只开一个，已开则聚焦", () => {
  assert.match(INDEX, /s\.data\.dataPath === target/, "先在自己的会话表里按路径查（思源自带去重只看同一分屏）");
  assert.match(INDEX, /\.parent\.switchTab\(/, "已开就聚焦，不再开第二个页签");
  assert.match(INDEX, /new Set\(this\.tabs\.values\(\)\)/, "新开页签靠「开前后差集」定位，不依赖 openTab 的返回值");
});

test("契约·页签关闭拦截：✕ 捕获先收，脏了先确认", () => {
  assert.match(TAB, /\.item__close/, "必须认出思源的关闭按钮");
  assert.match(TAB, /addEventListener\("click", onHeadClick, true\)/, "捕获阶段监听才能抢在思源自带的冒泡监听前");
  assert.match(TAB, /event\.stopPropagation\(\)/, "不挡掉原监听，点 ✕ 会直接关掉");
  assert.match(TAB, /confirm\(/, "脏了要先给确认再关");
  assert.match(TAB, /tab\.close\(\)/, "确认后走思源自己的 close");
});

test("契约·页签销毁：unmount + 摘掉捕获监听 + 标题/数据跟随保存", () => {
  assert.match(TAB, /createRoot\(element\)/);
  assert.match(TAB, /root\.unmount\(\)/, "不 unmount 会在重载插件后残留 React 树与字体监听");
  assert.match(TAB, /removeEventListener\("click", onHeadClick, true\)/, "监听不摘，页签重建后会挂着旧会话");
  assert.match(TAB, /updateTitle\(fileNameOf\(saved\)\)/, "首次保存后页签标题要变成文件名");
  assert.match(TAB, /data\.dataPath = saved/, "保存后的路径要写进 data：重启恢复与去重比对都靠它");
  assert.match(TAB, /custom\.data = data/, "归一后的 data 要写回 custom：layout.json 存的就是它");
  assert.match(INDEX, /destroy:\s*function/, "destroy 钩子里的 this 就是 Custom 实例");
  assert.match(INDEX, /plugin\.tabs\.get\(this\)\?\.dispose\(\)/);
  assert.match(INDEX, /plugin\.tabs\.delete\(this\)/, "销毁要把会话出账，否则卸载时会对已关页签再 close 一次");
});

test("契约·页签脏点：脏状态点亮，dispose 摘除", () => {
  assert.match(APP, /onDirtyChange\(dirty\)/, "脏状态必须上报出去，页签侧才有点亮的依据");
  assert.match(
    TAB,
    /tab\.headElement\.classList\.toggle\("exs-tab-dirty", value\)/,
    "把脏点挂在页签 .item 上：自定义页签图标是 SVG，吃不了伪元素",
  );
  assert.match(TAB, /tab\.headElement\.classList\.remove\("exs-tab-dirty"\)/, "dispose 要清掉，重开页签不能带旧脏点");
});

test("契约·主题接线：初值读取 + 订阅回调 setState + 取消订阅", () => {
  assert.match(THEME, /getAttribute\("data-theme-mode"\)/, "明暗判定要读思源的主钩子");
  assert.ok(THEME.includes(String.raw`/\btheme--dark\b/`), "要兼容在 html/body 挂 theme--dark 类的版本");
  assert.match(THEME, /attributeFilter:\s*\["data-theme-mode",\s*"class"\]/);
  assert.match(THEME, /observer\.observe\(document\.body/, "部分版本只在 body 上挂类，必须一并观察");
  assert.match(THEME, /return \(\) => observer\.disconnect\(\)/, "必须返回取消订阅函数");
  assert.match(THEME, /cb\(last\)/, "订阅时要以当前值立即回调一次，否则深色下重载会停在浅色初值");

  assert.match(APP, /useState<ThemeMode>\(\(\) => readSiyuanThemeMode\(\)\)/, "主题 state 的初值要现读 DOM，不能写死 light");
  assert.match(APP, /useEffect\(\(\) => watchSiyuanThemeMode\(setMode\), \[\]\)/, "订阅函数必须直接作为 useEffect 返回值（漏了 = 不取消订阅）");
  assert.match(APP, /<Excalidraw[^>]*theme=\{mode\}/, "mode 必须真的传进 Excalidraw");
});

test("契约·导出链路（第二十六轮 T1 重写）：预览与载荷分离 + 图片外置 + 缺标记即报错", () => {
  // T1 起编码不再交给 vendor：exportToSvg 只出预览树（<image> 照画），载荷自己编——
  // vendor 内嵌会把 files 的 dataURL 原样塞进载荷（文件膨胀 2.1 倍的根源）
  assert.equal(/exportEmbedScene/.test(SVG), false, "vendor 内嵌已摘掉：预览与载荷分离");
  assert.match(SVG, /encodeSvgPayload\(/, "载荷走 scene-codec 的自有编码（与 vendor 同构、互认不破）");
  assert.match(SVG, /opts\?\.saveMedia/, "saveMedia 传入时 files 换成外置引用；不传保持内嵌（旧口径兼容）");
  assert.match(SVG, /payloadFiles\[id\] = \{\s*id,\s*mimeType/, "外置条目 = { id, mimeType, created, path }，不带 dataURL");
  assert.match(SVG, /includes\(SCENE_MARKER\)/, "导出后必须校验标记，否则「导出成功」是假的");
  assert.match(SVG, /XMLSerializer/);
  // 编码侧在纯模块里：白名单 appState + bstring 镜像解码
  assert.match(CODEC, /export function encodeSvgPayload/, "编码进 scene-codec（纯逻辑可单测）");
  assert.match(CODEC, /export function persistableAppState/, "appState 白名单（vendor 四键 + T4 双主题槽位）");
  assert.match(STORAGE, /return `\/data\/\$\{p\}`/, "putFile 的 path 必须带 /data 前缀");
  assert.match(STORAGE, /api\/file\/putFile/);
  assert.match(STORAGE, /json\.code !== 0/, "putFile 失败是 HTTP 200 + code!==0，不抛异常，必须自己判");
  // T1 的二进制 IO：图片本体走 excali-media
  assert.match(STORAGE, /export async function putBytes/, "二进制写（图片外置）");
  assert.match(STORAGE, /export async function getFileBytes/, "二进制读（打开注水）");
});

test("契约·第二十六轮：分包加载 / 图片外置接线 / 嵌入图点击 / 图形跳文档", () => {
  // T3 分包：思源装载插件不是 Node 模块机制（loader.ts 把 index.js 文本包进
  // anonymous(require, module, exports) 后 eval，require 是宿主注入的 requireFunc，
  // 相对路径必炸 renderer_init）——引擎走 HTTP fetch + 思源同款包装执行（loadEngineModule）
  assert.match(INDEX, /loadEngineModule\(\): Promise/, "vendor 引擎经 engine.js 单文件懒加载（HTTP fetch + eval 包装）");
  assert.match(INDEX, /anonymous\(require, module, exports\)/, "与思源 loader.ts 同款包装，引擎内 require(siyuan) 才能解析");
  assert.match(INDEX, /this\.lazyEngine \?\?= this\.loadEngineModule\(\)/, "并发首开只装载一次");
  const staticVendorImports = INDEX.replace(/import type[^;]+;/g, "").match(/from "\.\/studio\/(svg|scene|tab)"|attachStudioTab,/);
  assert.equal(staticVendorImports, null, "vendor 模块不许静态 import 进主包（只有 import type）");
  assert.match(BUILD_SCRIPT, /inlineDynamicImports: true/, "两趟构建都内联 vendor 内部动态导入（不炸哈希 chunk）");
  assert.match(BUILD_SCRIPT, /src\/studio\/lazy\.ts/, "引擎入口 = lazy 边界模块");
  assert.match(BUILD_SCRIPT, /"engine\.js"/, "引擎产物固定名 engine.js");
  // T1 接线：StudioApp 拿 saveMedia，宿主写 excali-media 内容寻址文件
  assert.match(APP, /saveMedia: \(dataURL: string, mime: string\) => Promise<string>/, "画板侧图片外置通道");
  assert.match(INDEX, /MEDIA_DIR,\s*bytesToDataURL,\s*mediaFileName,\s*parseDataUrl/, "media-ref 纯工具静态进主包");
  assert.match(INDEX, /private async saveBoardMedia/, "宿主实现 dataURL → 内容寻址文件");
  // T1 打开注水：loadScene 带 hydrate
  assert.match(INDEX, /decodeSvgScene\(text, \(files\) => this\.hydrateSceneFiles\(files\)\)/, "打开时把 path 引用读回 dataURL");
  // T5：文档里点白板嵌入图开画板（capture 监听 + 库缓存同步判定 + 卸载摘除）
  assert.match(INDEX, /private registerEmbedClick/, "嵌入图点击入口");
  assert.match(INDEX, /document\.addEventListener\("click", this\.embedClickHandler, true\)/, "capture 阶段拦，来得及按住思源图片预览");
  assert.match(INDEX, /document\.removeEventListener\("click", this\.embedClickHandler, true\)/, "卸载要摘监听");
  // T6：`siyuan:doc/<id>` 拦截 + ea.setLink
  assert.match(APP, /onLinkOpen=\{\(element, event\) => \{/, "画布链接点击钩子");
  assert.match(APP, /link\.startsWith\("siyuan:"\)/, "思源链接拦下走宿主，其余 vendor 自理");
  assert.match(INDEX, /private openBoardDocLink/, "宿主开文档通道");
  assert.match(INDEX, /openDocLink: \(link\) => this\.openBoardDocLink\(link\)/, "tab host 接线");
});

test("契约·空画板与并发保护", () => {
  assert.match(APP, /if \(scene\.elements\.length === 0\) return false;/, "空画板 flush 要拦：清板不会把好文件写成空的");
  assert.match(APP, /if \(busyRef\.current\) return !dirtyRef\.current;/, "导出中（busy）要短路：关页签等不起第二次导出");
  assert.match(APP, /\} finally \{\s*busyRef\.current = false;/, "异常路径也要复位 busy，否则一次失败后保存永远哑火");
});

test("契约·右下角 ➕ FAB 已删：图片入口只剩拖放 / 粘贴（第十一轮）", () => {
  // 删除理由：FAB 16px 见方地压住 vendor 右下角的帮助「?」，且四项动作
  //（文本/矩形/框架/图片）工具栏与「更多工具」里本来就有。
  assert.equal(APP.includes("QuickAddFab"), false, "FAB 组件已删，StudioApp 不该再引用");
  assert.equal(INDEX.includes("QuickAddFab"), false, "宿主 index.ts 也不该再引用 FAB");
  // 删 FAB 不能连坐：拖放与粘贴是图片进画布仅剩的非工具栏路径
  assert.match(APP, /insertImageFiles\(api, files, at\)/, "拖放/粘贴共用的导入管线要留着");
  assert.match(APP, /window\.addEventListener\("paste", onPaste, true\)/, "粘贴入口要留着");
  assert.match(APP, /onDrop=\{onCanvasDrop\}/, "拖放入口要留着");
});

test("契约·关闭页签前冲刷（第十二轮起，第二十一轮去掉 autoSave 分支）", () => {
  // 画布侧：flush 是「关页签前落盘」唯一通道，旧的两条静默保存通道合并进来
  assert.match(APP, /const flush = useCallback\(async \(\): Promise<boolean>/, "flush 必须是单一保存通道（防抖 / ⌘S / 关页签 / ea.save 共用）");
  assert.equal(APP.includes("silentSave"), false, "静默保存已并进 flush，不留旧名字的两条路");
  assert.match(APP, /sceneRef\.current = \{ elements: elements as ExportScene\["elements"\], appState, files \}/, "onChange 要留影子快照：flush 在拆树前后取它");
  assert.match(APP, /dirtyRef\.current = true;\s*setDirty\(true\);/, "变脏要同步刷 ref：flush 的 busy 早退要读它");
  assert.match(APP, /savedAtRef\.current = Date\.now\(\);/, "保存成功要记时间戳");
  assert.match(APP, /getEaHandle: \(\) => eaHandle,\s*flush,\s*insertBoardCard: \(/, "脚本引擎句柄 + 冲刷 + 白板卡片插入（save 方法随保存菜单一起删）");

  // 页签侧：有改动一律先冲刷（第二十一轮：自动保存成为唯一形态，没有开关分支）
  assert.match(TAB, /if \(actions\) \{/, "关页签先冲刷，成功静默关");
  assert.match(TAB, /actions\.flush\(\)\.then\(\(saved\) =>/, "flush 结果决定静默关还是弹确认");
  assert.match(TAB, /skipDisposeFlush = true/, "确认「丢弃」后 dispose 不许再兜底保存");
  assert.match(TAB, /if \(!skipDisposeFlush\) void actionsRef\.current\?\.flush\(\);\s*root\.unmount\(\)/, "dispose 兜底 flush 必须在拆 React 树之前");
  assert.match(TAB, /actionsRef\.current = actions;/, "画布注册的动作要留一份给关闭决策");

  // 宿主侧：dock 只由结构事件刷新（第二十轮：状态行/合帧整套退役，见 dock-refresh.test.mjs）
  assert.match(INDEX, /onBoardActive: \(custom\) => \{[\s\S]{0,140}this\.activeCustom = custom;/, "每帧路径只更新活动位，不触发刷新");
  assert.equal(INDEX.includes("onBoardDirty"), false, "脏翻转通道已删：没有状态行要跟着翻");
  assert.equal(INDEX.includes("getState"), false, "dock getState 通道已删");
  assert.equal(INDEX.includes("scheduleDockRefresh"), false, "合帧入口已删");
});

test("契约·防抖自动保存（第二十一轮）：每次 onChange 重排，停手约 1 秒落盘", () => {
  assert.match(APP, /const AUTOSAVE_DELAY = 1000;/, "防抖窗口 1 秒（模块级常量）");
  assert.match(APP, /autoSaveTimer\.current = window\.setTimeout\(\(\) => \{[\s\S]{0,160}void flushRef\.current\(\);/, "定时器触发走 flush");
  assert.match(APP, /if \(autoSaveTimer\.current !== null\) window\.clearTimeout\(autoSaveTimer\.current\);/, "每次回调先清旧定时器：拖拽每帧重置，松手才落");
  assert.match(APP, /scheduleAutoSave\(\);/, "handleChange 末尾无条件重排（busy/守卫跳过的轮次也靠后续交互补上）");
  assert.match(APP, /useEffect\(\s*\(\) => \(\) => \{[\s\S]{0,140}window\.clearTimeout\(autoSaveTimer\.current\);/, "卸载清定时器：悬空 timer 会打空气 api");
  assert.equal(APP.includes("setInterval"), false, "60s 定时退役：防抖已覆盖，blur/vis 保留立即冲刷");
  assert.match(APP, /window\.addEventListener\("blur", onBlur\)/, "失焦立即冲刷：切窗不丢最近一笔");
  assert.match(APP, /document\.addEventListener\("visibilitychange", onVis\)/, "切走（页签隐藏）立即冲刷");
});

test("契约·「默认」背景导出补底（第十二轮）", () => {
  // 具体色值真源
  assert.match(THEME, /export function themeDefaultCanvasColor/, "默认画布色要有单一出处");
  assert.match(THEME, /readSiyuanThemeMode\(\) === "dark" \? "#121212" : "#ffffff"/, "与 vendor CSS 的 --default-bg-color 同值");
  // 保存路径（内嵌 scene）：payload 里的空串不动，只给渲染树补底
  assert.match(SVG, /if \(viewBackgroundColor\) return;/, "vendor 自己画过底就不能重复补");
  assert.match(SVG, /ensureSvgBackground\(svg, scene\.appState\.viewBackgroundColor, false\)/, "保存 SVG 路径也要补底（否则落盘的白板是透明底）");
  assert.match(SVG, /svg\.insertBefore\(rect, svg\.firstChild\)/, "补的 rect 必须垫在所有图形之前");
  // 导出对话框：svg 走同一补底；位图把空串落成具体色
  assert.match(EXPORT, /ensureSvgBackground\(svg, scene\.appState\.viewBackgroundColor, opts\.dark\)/, "导出 SVG 走同一补底；dark 导出还要预补偿 vendor 的 invert 滤镜");
  assert.match(EXPORT, /if \(exportBackground && !appState\.viewBackgroundColor\)/, "位图导出：空串背景要材料化，否则 PNG 透明");
  assert.match(EXPORT, /appState\.viewBackgroundColor = opts\.dark \? "#121212" : themeDefaultCanvasColor\(\)/, "暗色导出给深底，否则给当前主题默认色");
});

test("契约·dock 纯库化（第二十轮）→ 原生复刻（第二十二轮）：状态行 / 主按钮 / 画布区 / 搜索框全删", () => {
  assert.equal(DOCK.includes('data-role="status"'), false, "状态行随画布区删除");
  assert.equal(DOCK.includes("exs-dock__btn--primary"), false, "保存主按钮随画布区删除（保存已无入口：防抖 + ⌘S）");
  assert.equal(DOCK.includes('data-role="canvas"'), false, "画布操作区整块删除");
  assert.equal(DOCK.includes("exs-dock__foot"), false, "页脚删除：脚本/帮助进 ☰，设置留顶栏菜单");
  assert.equal(DOCK.includes('data-role="lib-search"'), false, "第二十二轮：搜索框按用户拍板删除（纯复刻 kmind-zen）");
  assert.match(DOCK, /block__icons/, "头部穿原生 block__icons");
  assert.match(DOCK, /b3-list b3-list--background/, "列表穿原生 b3-list");
  assert.match(INDEX, /title: target \? fileNameOf\(target\) : t\("未命名白板"\)/, "页签标题取文件名（新建也带路径：文件先行）；兜底未命名白板");
});

test("契约·「打开白板…」重构（第十三轮）：一次读好 + 已开标注 + 原打开链路", () => {
  // 数据源：readDir 的 updated 直接可用，列表不再只拿文件名
  assert.match(STORAGE, /export async function listBoardEntries/, "列表数据源换成带修改时间的版本");
  // 宿主：读取与失败/空目录短路留在宿主侧，过滤与展示归选择器模块。
  // 第四十轮：选择段抽成 pickBoardRef（☰「插入白板卡片…」共用），切片从它起。
  const picker = INDEX.slice(INDEX.indexOf("private async pickBoardRef"), INDEX.indexOf("private rememberRecent"));
  assert.ok(picker.length > 0, "pickBoardRef/openBoardPicker 切片锚点失效");
  assert.match(picker, /await listBoardEntries\(this\.settings\.saveDir\)/, "一次读好整份列表交给选择器，纯内存过滤");
  assert.match(picker, /s\.data\.dataPath/, "「已打开」集合从页签会话现取（dataPath 是归一过的 /data 路径）");
  assert.match(picker, /await pickBoardFile\(entries, openPaths\)/, "选择器独立成模块（siyuan/board-picker.ts）");
  assert.match(picker, /if \(picked\) void this\.openExisting\(picked\)/, "选中走原打开链路：已开的白板被去重逻辑直接聚焦");
  assert.match(picker, /读取目录失败：\{msg\}/, "读目录失败的 toast 仍在宿主");
  assert.match(picker, /目录里还没有白板文件/, "空目录短路，不弹空选择器");
  assert.equal(picker.includes("exs-board-item"), false, "旧的自拼列表已删，别再挂回去");
});

test("契约·最近菜单清空 + 完整路径 tooltip（第十三轮）", () => {
  const menu = INDEX.slice(INDEX.indexOf("private buildTopMenu"), INDEX.indexOf("private promptOpenPath"));
  assert.ok(menu.length > 0, "buildTopMenu 切片锚点失效");
  assert.match(menu, /t\("清空最近记录"\)/, "最近非空时给清空入口（空态只剩只读占位，不该出现它）");
  assert.match(menu, /click: \(\) => this\.clearRecent\(\)/);
  assert.match(menu, /el instanceof HTMLElement/, "内核实现不给元素就跳过：subMenu.addItem 类型是 void，tooltip 是增强不是依赖");
  assert.match(menu, /el\.setAttribute\("title", path\)/, "悬停出完整路径：不同目录的同名文件可辨");
  const clear = INDEX.slice(INDEX.indexOf("private clearRecent"), INDEX.indexOf("private clearRecent") + 200);
  assert.match(clear, /this\.recent = \[\]/);
  assert.match(clear, /this\.persist\(\)/, "清空要落盘，重开思源不能复活");
  assert.equal(clear.includes("removeFile"), false, "只动记录，不碰文件");
});

test("契约·保存副本（第十三轮 → 第二十一轮删除）：不许回来", () => {
  // 删除理由：文件先行 + 防抖自动保存后，「另存为」心智没有必要——
  // 每块板从创建就是独立文件，复制一份请新建后再「重命名」或从库里拖走。
  assert.equal(APP.includes("saveAsFlow"), false, "saveAsFlow 已删");
  assert.equal(APP.includes("onSaveAs"), false, "菜单回调已删");
  assert.equal(APP.includes("保存副本"), false, "文案与建议名后缀一并清场");
});

test("契约·t() 缺失回落中文 + 变量插值", () => {
  assert.match(I18N, /typeof raw === "string" \? raw : text/, "查不到必须回落中文原文");
  assert.ok(I18N.includes(String.raw`/\{(\w+)\}/g`), "要支持 {name} 变量插值");
});

test("契约·i18n 语言包键对齐（zh_CN 与 en_US 同键，中文即 key）", () => {
  const zh = json("i18n/zh_CN.json");
  const en = json("i18n/en_US.json");
  const missing = Object.keys(zh).filter((k) => !(k in en));
  assert.deepEqual(missing, [], "zh_CN 有而 en_US 缺的键");
  for (const k of Object.keys(zh)) {
    if (k === "displayName" || k === "description") continue;
    assert.equal(zh[k], k, `zh_CN 的值必须等于键本身（中文原文即 key）：${k}`);
  }
});

test("契约·t() 用到的文案都在语言包里", () => {
  const zh = json("i18n/zh_CN.json");
  const used = new Set();
  for (const blob of [INDEX, APP, TAB, I18N, DOC, WELCOME_TSX, MENU_TSX, DOCK, BOARD_LIST, BOARD_PICKER]) {
    for (const m of blob.matchAll(/\bt\("([^"]+)"/g)) used.add(m[1]);
  }
  assert.ok(used.size >= 5, `应当至少抓到 5 处 t() 调用，实得 ${used.size}`);
  const missing = [...used].filter((k) => !(k in zh));
  assert.deepEqual(missing, [], "代码里 t() 了但语言包没有的文案");
});

test("第十九轮·flush 两道避让闸 + 失败可见（对齐 Obsidian autosave 避让清单）", () => {
  // 空画板不落盘：清板也会变脏，冲下去就是把好文件写成空的（唯一落盘路径 flush 的门）
  assert.match(APP, /if \(scene\.elements\.length === 0\) return false;/, "空场景跳过本轮、保持脏");
  // 正在画一笔（newElement）/编辑文字（editingTextElement）时避让：快照是半成品，导出还可能打断输入
  assert.match(APP, /if \(scene\.appState\.editingTextElement \|\| scene\.appState\.newElement\) return false;/, "活跃笔迹避让");
  // 失败从 console 升级成 toast：后台静默保存失败不然是悄悄丢数据
  assert.match(APP, /notify\(t\("自动保存失败：\{msg\}", \{ msg: errText\(e\) \}\), 7000\);/, "自动保存失败要给可见提示");
  // 避让都只「跳过本轮」：两道闸里除 return false 不许有任何改脏/基线的动作（整段体积极小，扫长度兜住）
  assert.match(APP, /if \(scene\.elements\.length === 0\) return false;\n\s*if \(scene\.appState\.editingTextElement \|\| scene\.appState\.newElement\) return false;\n\s*busyRef\.current = true;/, "两道闸之间不许夹带别的状态写入");
});

test("第二十八轮·Mermaid 转图元：vendor TTDDialog 接线（零自绘对话框、零新增 bundle 体积）", () => {
  // 菜单入口：自绘项必须带图标（菜单项是 flex+column-gap、无固定图标列，缺图标文字凸出）
  assert.match(MENU_TSX, /ICON_MERMAID/, "菜单项带 Mermaid 图标");
  assert.match(MENU_TSX, /t\("Mermaid 转图元…"\)/, "菜单文案过 i18n");
  // 打开通道：updateScene → setState 直写 appState（官方 App.updateScene 不做 restore 过滤，
  // openDialog 能安全进；不写成别的方式——比如 updateScene 之外的 setState 拿不到）
  assert.match(APP, /openDialog: \{ name: "ttd", tab: "mermaid" \}/, "updateScene 直写 openDialog（imperative api 没装配 setOpenDialog，0.18.1 运行时调不到）");
  // vendor TTDDialog 常驻 children：openDialog 非 ttd 时它自己渲染 null；
  // __fallback = 只挂 Mermaid 页、不带 AI 的 text-to-diagram 页（那个要接生成服务，本插件不提供）
  assert.match(APP, /<TTDDialog __fallback \/>/, "TTDDialog 以 __fallback 形态常驻");
  assert.equal(APP.includes("onTextSubmit"), false, "不许接 AI text-to-diagram 的 onTextSubmit");
  // 脏安全：openDialog 不进脏指纹（scene-dirty.ts 的 canvasBitsOf 只看背景/网格）——开关对话框不误报脏
  const dirty = stripComments(src("studio/scene-dirty.ts"));
  assert.equal(dirty.includes("openDialog"), false, "openDialog 不进脏指纹");
});

test("第三十八轮·荧光笔数据面：pens.ts 收窄成一份配置，六色三档 + 归一 + 判据", () => {
  const PENS = stripComments(src("studio/pens.ts"));
  const zh = json("i18n/zh_CN.json");
  const en = json("i18n/en_US.json");
  // 数据面：预设六色（色板就从这份数据渲染，不许 UI 里手写死）
  const colorLabels = [...PENS.matchAll(/\{ label: "([^"]+)", value: "#[0-9a-f]{6}" \}/g)].map((m) => m[1]);
  const colorVals = [...PENS.matchAll(/value: "(#[0-9a-f]{6})"/g)].map((m) => m[1]);
  assert.equal(colorLabels.length, 6, "预设六色");
  assert.equal(new Set(colorVals).size, 6, "色值不重复");
  // 三档粗细 + 默认档。默认 width 4 ≈ 17px：vendor 的「粗」是 width 12 ≈ 51px，
  // 一整条宽带糊在笔记上，就是上一版「看着不像荧光笔」的根因之一。
  const sizeLabels = [...PENS.matchAll(/\{ label: "([^"]+)", width: (\d+) \}/g)].map((m) => m[1]);
  assert.equal(sizeLabels.length, 3, "粗细三档");
  assert.match(PENS, /DEFAULT_HIGHLIGHTER: HighlighterConfig = \{ color: "#ffd43b", width: 4, opacity: 45 \}/, "默认＝黄 / 中 / 45%");
  assert.match(PENS, /STROKE_PX = 4\.25/, "笔宽→像素按 vendor chunk 的 4.25 系数（只用于显示）");
  assert.match(PENS, /HL_ROUGHNESS = 0/, "糙度 0：像记号笔而不是蜡笔");
  // 标签双语齐备（色板走 t(label) 动态查表，i18n 扫描器抓不到，这里盯死）
  for (const label of [...colorLabels, ...sizeLabels]) {
    assert.ok(label in zh && label in en, `色板标签双语齐备：${label}`);
  }
  // 归一：脏 data.json / 脚本乱传参在这一层收口（唯一出口，别处不再各自 clamp）
  assert.match(PENS, /HEX\.test\(r\.color\.trim\(\)\)/, "非 #rrggbb 回落默认色");
  assert.match(PENS, /clamp\(Number\(r\.width\), 1, 12,/, "笔宽夹到 vendor 的 1-12");
  assert.match(PENS, /clamp\(Number\(r\.opacity\), 10, 100,/, "透明度夹到 10-100（低于 10 基本看不见）");
  // 判据：四键全等 + 手绘工具，缺一样就不算「正拿着荧光笔」
  assert.match(PENS, /snap\.tool === "freedraw"/, "判据要认工具");
  assert.match(PENS, /snap\.roughness === HL_ROUGHNESS/, "判据要认糙度");
  // 六支墨水笔的预设已退役（四色笔 vendor 铅笔工具就能画，常驻六枚反而挤占右缘竖条）
  assert.equal(PENS.includes('id: "'), false, "PENS 六支笔数组不许回流");
});

test("第三十八轮·荧光笔落面：竖条一枚按钮 + 不占位色板 + 状态机反向同步", () => {
  const SRAIL = stripComments(src("studio/ScriptRail.tsx"));
  const HANDLE = stripComments(src("studio/ea-handle.ts"));
  const CSS = src("index.css");
  // 顶部条整体退役（拍板：只留 vendor 自己的素材库按钮）
  assert.equal(APP.includes("renderTopRightUI"), false, "vendor 右上角扩展位不再挂自绘条");
  assert.equal(APP.includes("PenRail"), false, "PenRail.tsx 已整文件删除");
  assert.equal(APP.includes("penOptions"), false, "penOptions（压感/描边轮廓）不许假装支持，官方 appState 不暴露");
  // 按钮：整条只有一枚；未激活=切荧光笔，已激活=弹色板（拍板口径）
  assert.equal((SRAIL.match(/onClick=\{onHlBtnClick\}/g) ?? []).length, 1, "只有一枚荧光笔按钮");
  assert.match(SRAIL, /title=\{props\.hlActive \? t\("荧光笔（已激活，再点换色）"\) : t\("荧光笔"\)\}/, "两态 tooltip 分流");
  assert.match(SRAIL, /aria-pressed=\{props\.hlActive\}/, "激活态可及性标注");
  assert.match(SRAIL, /\["--exs-hl-color" as string\]: props\.highlighter\.color/, "当前配置色用 CSS 变量下传给笔尖色条");
  // 色板内容：六色 + 自定义 + 三档粗细，全部数据驱动
  assert.match(SRAIL, /HL_COLORS\.map/, "预设色从 pens.ts 渲染");
  assert.match(SRAIL, /HL_SIZES\.map/, "粗细三档从 pens.ts 渲染");
  assert.match(SRAIL, /t\("约 \{n\}px", \{ n: highlighterPx/, "笔宽显示成人话像素");
  assert.match(SRAIL, /props\.onHighlighterChange\(\{ color: c\.value \}\);\n\s*setPalOpen\(false\);/, "选预设色即收板（一次性动作）");
  assert.match(SRAIL, /onBlur=\{\(\) => \{[\s\S]*?customColor\.toLowerCase\(\) !== props\.highlighter\.color/, "自定义色只在收盘时提交（原生取色器每挪一下都发 input，否则会刷爆磁盘）");
  assert.match(SRAIL, /if \(palOpen && \(railOff \|\| !props\.hlActive\)\) setPalOpen\(false\);/, "收进竖条 / 关掉荧光笔 → 色板跟着收");
  // 结构面：色板必须是竖条的**兄弟节点**——竖条有 overflow-y:auto + backdrop-filter，
  // 子元素会被裁切并被拉进它的层叠上下文。用 div 配对扫描盯死这条线。
  const railDiv = SRAIL.lastIndexOf("<div", SRAIL.indexOf("ref={rootRef}"));
  assert.ok(railDiv >= 0, "竖条根节点");
  const tag = /<div\b[^>]*\/>|<div\b|<\/div>/g;
  tag.lastIndex = railDiv;
  let depth = 0;
  let railClose = -1;
  for (let m; (m = tag.exec(SRAIL)); ) {
    if (m[0].startsWith("</")) depth -= 1;
    else if (m[0].endsWith("/>")) continue;
    else depth += 1;
    if (depth === 0) {
      railClose = m.index;
      break;
    }
  }
  const pal = SRAIL.indexOf('className="exs-hl-palette"');
  assert.ok(railClose > railDiv && pal > railClose, "色板渲染在竖条 </div> 之后（不是子元素）");
  // 样式面：fixed 悬浮 = 换色不占竖条宽度；激活态不加 border（会顶偏图标 1px）
  const palRule = CSS.slice(CSS.indexOf(".exs-hl-palette {"), CSS.indexOf("}", CSS.indexOf(".exs-hl-palette {")));
  assert.match(palRule, /position: fixed;[\s\S]*?z-index: 300;/, "色板 fixed 悬浮");
  assert.equal(/right:/.test(palRule), false, "水平位置不许写死常量（真机反馈：盖住竖条下面的按钮）");
  // 锚定：色板右缘按荧光笔按钮的实测左缘下发，画布过窄时再往回夹
  assert.match(SRAIL, /setPalRight\(window\.innerWidth - r\.left \+ PAL_GAP\)/, "右缘 = 视口宽 − 按钮左缘 + 间隙（rect 与 innerWidth 同为视口坐标）");
  assert.match(SRAIL, /style=\{\{ top: palTop, right: palRight \}\}/, "top/right 都由 JS 下发");
  assert.match(SRAIL, /const nextRight = Math\.min\(palRight, Math\.max\(8, vw - pal\.offsetWidth - 8\)\)/, "窄画布往回让，不顶出左缘");
  assert.match(CSS, /\.exs-hl-btn__chip \{[\s\S]*?background: var\(--exs-hl-color/, "笔尖色条吃变量");
  const onBlock = CSS.slice(CSS.indexOf(".exs-hl-btn--on {"), CSS.indexOf(".exs-hl-palette {"));
  assert.match(onBlock, /box-shadow: inset/, "激活环走 inset 阴影");
  assert.equal(/border:/.test(onBlock), false, "激活态不许加 border（零位移口径）");
  assert.match(CSS, /\.exs-hl-palette__readout \{[\s\S]*?flex: 1 1 auto;[\s\S]*?min-width: 0;/, "读数可伸缩，「关闭荧光笔」按钮不随读数变长而位移");
  // 落盘原语：四键走 updateScene（不进脏指纹），切工具只在显式带 tool 时
  assert.match(HANDLE, /currentItemStrokeColor: pen\.color/, "描边色");
  assert.match(HANDLE, /currentItemStrokeWidth: pen\.width/, "笔宽");
  assert.match(HANDLE, /currentItemRoughness: pen\.roughness/, "糙度");
  assert.match(HANDLE, /currentItemOpacity: pen\.opacity/, "透明度");
  assert.match(HANDLE, /if \(tool\) api\.setActiveTool\(\{ type: tool \}\)/, "复位只换笔不抢工具");
  // 状态机：配置（hl）与「这块画布拿着荧光笔」（hlActive）是两个维度，别混
  assert.match(APP, /const \[hl, setHl\] = useState<HighlighterConfig>\(\(\) => normalizeHighlighter\(highlighter\)\)/, "配置初值过归一（老 data.json 缺键也不炸）");
  assert.match(APP, /const \[hlActive, setHlActive\] = useState\(false\)/, "激活态默认关");
  assert.match(APP, /eaHandleRef\.current\?\.applyPen\(\{ \.\.\.cfg, roughness: HL_ROUGHNESS \}, "freedraw"\)/, "激活＝套四键 + 切手绘");
  assert.match(APP, /eaHandleRef\.current\?\.applyPen\(\{ \.\.\.INK_DEFAULT, roughness: INK_ROUGHNESS \}\)/, "关闭＝复位 vendor 默认笔");
  assert.match(APP, /if \(hlActiveRef\.current\) eaHandleRef\.current\?\.applyPen\(\{ \.\.\.next, roughness: HL_ROUGHNESS \}\)/, "关着换色只存配置，不抢用户当前那支笔");
  // 反向同步：真源是 vendor appState（手动凑出同一组四键、脚本调 ea.highlighter() 都会点亮）
  assert.match(APP, /const sig = `\$\{tool\}\|\$\{appState\.currentItemStrokeColor\}\|\$\{appState\.currentItemStrokeWidth\}\|\$\{appState\.currentItemOpacity\}\|\$\{appState\.currentItemRoughness\}`;/, "笔刷签名（vendor 每帧回调，靠它去重）");
  assert.match(APP, /const was = hlActiveRef\.current;\n\s*if \(was !== still\)/, "先取旧值再翻转（翻转后才判「曾经激活」会恒 false）");
  assert.match(APP, /if \(was && !still && tool !== "freedraw"\)/, "离开手绘工具自动复位四键");
  assert.match(APP, /addEventListener\(HIGHLIGHTER_EVENT, onHlChanged\)/, "跨画布同步配置（A 板改色，B 板色板不留在旧的）");
  // 脏安全：描边四键是纯 UI 状态、不落盘，进指纹就回到「换颜色也变脏」
  const dirty = stripComments(src("studio/scene-dirty.ts"));
  assert.equal(dirty.includes("Stroke"), false, "脏指纹不看描边四键");
  // 接线：StudioApp ↔ ScriptRail ↔ tab ↔ 宿主，一条不能少
  assert.match(APP, /highlighter=\{hl\}/, "配置下传竖条");
  assert.match(APP, /hlActive=\{hlActive\}/, "激活态下传竖条");
  assert.match(APP, /onActivateHighlighter=\{activateHighlighter\}/, "激活通道");
  assert.match(APP, /onDeactivateHighlighter=\{deactivateHighlighter\}/, "关闭通道");
  assert.match(APP, /onHighlighterChange=\{changeHighlighter\}/, "改配置通道");
  assert.match(TAB, /highlighter=\{host\.highlighter\}/, "宿主配置进页签");
  assert.match(TAB, /onHighlighterChange=\{host\.onHighlighterChange\}/, "宿主回写通道进页签");
  assert.match(INDEX, /rememberHighlighter\(cfg: HighlighterConfig\): void/, "宿主落盘方法");
  assert.match(INDEX, /if \(cur\.color === next\.color && cur\.width === next\.width && cur\.opacity === next\.opacity\) return;/, "同值短路（连点同色不刷盘）");
  assert.match(INDEX, /dispatchEvent\(new CustomEvent\(HIGHLIGHTER_EVENT, \{ detail: next \}\)\)/, "落盘后广播给其余画布");
  assert.match(SETTINGS, /highlighter: normalizeHighlighter\(r\.highlighter\)/, "highlighter 是正式设置键并走归一");
});

test("第三十八轮·荧光笔进脚本库：ea 三原语 + 内置 highlighter.md + 专属图标", () => {
  const EA = stripComments(src("studio/ea-api.ts"));
  const STORE = src("siyuan/script-store.ts");
  const ICONS = stripComments(src("studio/menu-icons.ts"));
  const zh = json("i18n/zh_CN.json");
  const en = json("i18n/en_US.json");
  // 脚本原语：读 / 打补丁 / 一键切（三者都收敛到 handle.applyPen 这一个原语）
  assert.match(EA, /getPen: \(\) => handle\.getPen\(\)/, "ea.getPen 读当前笔刷");
  assert.match(EA, /setPen: \(patch\) => \{[\s\S]*?const cur = handle\.getPen\(\);/, "ea.setPen 先读当前再合并（只改颜色不该动糙度）");
  assert.match(EA, /handle\.applyPen\(\{ \.\.\.normalizeHighlighter\(style\), roughness: style\.roughness \}, patch\.tool\)/, "越界宽窄/脏色由 pens 层收口");
  assert.match(EA, /highlighter: \(\) => handle\.applyPen\(\{ \.\.\.host\.getHighlighter\(\), roughness: HL_ROUGHNESS \}, "freedraw"\)/, "ea.highlighter() 读设置里那一份：脚本零参，两处各存一套迟早打架");
  assert.match(EA, /getHighlighter: \(\) => HighlighterConfig;/, "EaHost 读口声明");
  assert.match(INDEX, /getHighlighter: \(\) => normalizeHighlighter\(plugin\.settings\.highlighter\)/, "宿主实现读设置（同一份真源）");
  // 内置脚本：注册进 BUILTIN_SCRIPTS，正文调 ea.highlighter()
  assert.match(STORE, /file: "highlighter\.md"/, "highlighter.md 已注册为内置脚本");
  assert.match(STORE, /ea\.highlighter\(\);/, "脚本正文一键切荧光笔");
  assert.equal(STORE.includes("SCRIPT_SETTING_SPECS"), true, "声明表仍在（highlighter 刻意不带参数，不进声明表）");
  // 专属图标：右栏固定按钮与选择器行首都按映射取（回落齿轮）
  assert.match(ICONS, /"highlighter\.md": ICON_HIGHLIGHTER/, "荧光笔脚本配了专属图标");
  // 文案双语齐备（含色板里动态查表的那批标签）
  for (const k of ["荧光笔", "荧光笔（已激活，再点换色）", "荧光笔设置", "颜色", "自定义颜色", "粗细", "约 {n}px", "关闭荧光笔"]) {
    assert.ok(k in zh && k in en, `色板文案双语齐备：${k}`);
  }
  // 六支笔的文案已清场
  for (const k of ["笔刷", "钢笔（黑）", "红笔（批注）", "蓝笔（批注）", "铅笔（灰）", "荧光笔（黄）", "荧光笔（绿）"]) {
    assert.equal(k in zh || k in en, false, `退役笔刷键不许回流：${k}`);
  }
});

test("第三十轮·图形模板库：Library 持久层升级为多文件文件夹（对标 Obsidian StencilLibraryManager）", () => {
  // 加载面：excali-libraries/ 全量合并 + 一次性迁移旧单文件
  assert.match(INDEX, /listFilesWithExt\(this\.libDirRel\(\), \/\\.excalidrawlib\$\/i\)/, "列 excali-libraries 下的库文件");
  assert.match(INDEX, /mergeLibFiles\(files\)/, "合并走纯模块（本地优先 + id 去重 + published）");
  assert.match(INDEX, /migrateStencilLibrary\(\)/, "首次加载先跑迁移");
  assert.match(INDEX, /stencilMigrated = true/, "迁移一次性标记（成功失败都置位）");
  // 保存面：diff 计划写回源文件；清空文件删除；写完重建缓存基线
  assert.match(INDEX, /planLibraryWrites\(merged, items, this\.localLibRel\(\)\)/, "保存走纯 diff 计划");
  assert.match(INDEX, /if \(fileItems\.length === 0\)/, "清空的库文件删除（与 Obsidian 口径一致）");
  assert.match(INDEX, /this\.libCache = null;\n\s*await this\.loadLibraryItems\(\);/, "写完重读磁盘重建 diff 基线");
  // 容错：单个坏档不拖垮整个库
  assert.match(INDEX, /模板库文件读取失败，已跳过/, "坏档跳过并告警");
  // 设置：迁移标记进 settings 归一
  const SETTINGS = stripComments(src("studio/settings.ts"));
  assert.match(SETTINGS, /stencilMigrated/, "迁移标记是正式设置键");
});

test("第三十四轮·脚本选择器：顶部使用说明块 + 每条脚本展示 description", () => {
  assert.match(INDEX, /exs-picker__hint/, "选择器顶部有使用说明块");
  assert.match(INDEX, /t\("脚本使用说明"\)/, "说明块标题走 i18n");
  assert.match(INDEX, /exs-script-desc/, "脚本条目有说明文字行");
  assert.match(INDEX, /s\.description\s*\?/, "有说明展示说明、无说明回落文件名 meta");
  assert.match(INDEX, /title="\$\{escapeHtml\(s\.name\)\}"/, "文件名进悬浮 tooltip（不占版面）");
  assert.match(src("index.css"), /exs-picker__hint/, "说明块有样式");
});

test("第三十四轮·脚本侧边栏：右缘竖条 + 固定/取消固定闭环（对标 Obsidian 固定按钮到侧边栏）", () => {
  const RAIL = stripComments(src("studio/ScriptRail.tsx"));
  const PIN = stripComments(src("studio/script-pin.ts"));
  const CSS = src("index.css");
  // 组件：入口按钮 + 固定脚本按钮 + 右键取消固定（Obsidian pin 交互）
  assert.match(RAIL, /exs-script-rail/, "侧边栏样式类");
  assert.match(RAIL, /onContextMenu=/, "固定按钮右键出菜单");
  assert.match(RAIL, /t\("从侧边栏取消固定"\)/, "右键菜单取消固定");
  assert.match(RAIL, /onOpenPicker/, "「运行脚本…」入口按钮回调");
  assert.match(RAIL, /ICON_SCRIPT_GEAR/, "固定脚本用齿轮图标（Obsidian：无同名 SVG 即 ⚙）");
  // 广播通道：宿主改设置 → 所有已开画布重拉清单
  assert.match(PIN, /exs:script-pin-changed/, "事件名常量独立成无 React 依赖模块");
  assert.match(APP, /addEventListener\(SCRIPT_PIN_EVENT, refreshPinned\)/, "画布监听广播重拉清单");
  assert.match(INDEX, /dispatchEvent\(new CustomEvent\(SCRIPT_PIN_EVENT\)\)/, "宿主固定状态变化后广播");
  // 三通道接线：tab.tsx ↔ StudioProps ↔ index.ts
  assert.match(TAB, /listPinnedScripts=\{host\.listPinnedScripts\}/, "固定清单通道");
  assert.match(TAB, /onRunScriptFile=\{host\.onRunScriptFile\}/, "点固定脚本即跑通道");
  assert.match(TAB, /onPinScript=\{host\.onPinScript\}/, "取消固定通道");
  assert.match(INDEX, /listPinnedScripts: \(\) => this\.listPinnedScripts\(\)/);
  assert.match(INDEX, /onRunScriptFile: \(name, opts\) => void this\.runScriptFile\(name, opts\)/, "宿主签名带修饰键透传");
  assert.match(INDEX, /onPinScript: \(name, pinned\) => this\.rememberScriptPin\(name, pinned\)/);
  // 选择器：右键固定/取消固定 + 已固定标记（pin 的入口在选择器，unpin 在侧边栏）
  assert.match(INDEX, /addEventListener\("contextmenu"/, "选择器条目右键出固定菜单");
  assert.match(INDEX, /t\("固定到侧边栏"\)/, "固定动作文案");
  assert.match(INDEX, /exs-script-pin/, "已固定标记（圆点）");
  assert.match(INDEX, /rememberScriptPin\(info\.name, !pinNow\)/, "右键点击翻转固定状态");
  // 设置与样式
  assert.match(SETTINGS, /pinnedScripts/, "固定清单是正式设置键（持久化）");
  assert.match(CSS, /\.exs-script-rail \{/, "侧边栏有样式（绝对定位右缘）");
});

test("第三十五轮·侧边栏两态全手动：展开 / 收进拉手（删图钉，无任何自动收进）", () => {
  const RAIL = stripComments(src("studio/ScriptRail.tsx"));
  // 图钉与自动收进整体删除（用户拍板：收进/展开一律手动）
  assert.ok(!/ICON_PIN/.test(RAIL), "图钉图标已删");
  assert.ok(!/railPinned|tempOpen|AUTOHIDE_DELAY|onMouseLeave/.test(RAIL), "无图钉/临时弹出/宽限/悬停判定残留");
  // 两态：railOff 看记忆的 scriptRailCollapsed；脚本选择器 / vendor 侧栏开着时整体让位
  assert.match(RAIL, /const railOff = props\.railCollapsed \|\| props\.pickerOpen \|\| props\.sidebarOpen;/, "收进状态单一来源 + 两档让位");
  assert.match(RAIL, /pickerOpen: boolean;/, "pickerOpen prop 声明");
  assert.match(RAIL, /sidebarOpen: boolean;/, "sidebarOpen prop 声明（2026-10-19 侧栏避让）");
  // 收进态：整条滑出画面，右缘贴边拉手待命
  assert.match(RAIL, /exs-script-rail--off/, "收进态整条滑出");
  assert.match(RAIL, /exs-script-rail-handle/, "贴边拉手（点按弹出）");
  assert.match(RAIL, /t\("展开脚本侧边栏"\)/, "拉手弹出动作");
  assert.match(RAIL, /t\("收进边缘"\)/, "手动收进动作");
  // 状态记忆：设置键 + 宿主 getter/翻转 + tab 接线
  assert.match(SETTINGS, /scriptRailCollapsed/, "收进是正式设置键");
  assert.ok(!/scriptRailPinned/.test(SETTINGS), "scriptRailPinned 设置键已删");
  assert.match(INDEX, /rememberScriptRail\(/, "宿主落盘方法");
  assert.match(INDEX, /get scriptRailCollapsed\(\)/, "getter 实时读设置");
  assert.ok(!/scriptRailPinned/.test(INDEX), "宿主无图钉 getter/回调残留");
  assert.match(TAB, /scriptRailCollapsed=\{host\.scriptRailCollapsed\}/);
  assert.ok(!/scriptRailPinned/.test(TAB), "tab 无图钉接线残留");
  // 脚本专属图标（P1b）：映射表 + 右栏消费 + 选择器行首图标
  const ICONS = stripComments(src("studio/menu-icons.ts"));
  assert.match(ICONS, /ICON_NUMBERING/, "文字编号专属图标");
  assert.match(ICONS, /SCRIPT_ICONS: Record<string, string>/, "脚本图标映射表");
  assert.match(ICONS, /"text-numbering\.md": ICON_NUMBERING/, "编号脚本已配图标");
  assert.match(RAIL, /SCRIPT_ICONS\[s\.name\] \?\? ICON_SCRIPT_GEAR/, "右栏固定脚本按映射取图标（回落齿轮）");
  assert.match(INDEX, /SCRIPT_ICONS\[name\] \?\? ICON_SCRIPT_GEAR/, "选择器行首按映射取图标");
  assert.match(src("index.css"), /exs-script-item__icon/, "选择器行首图标样式");
  // 液态玻璃：blur 饱和玻璃层 + 玻璃令牌（亮暗各一套）+ 整条滑出动画
  const CSS = src("index.css");
  assert.match(CSS, /backdrop-filter:\s*blur\(18px\) saturate\(160%\)/, "玻璃模糊层");
  assert.match(CSS, /--exs-glass-bg/, "玻璃背景令牌");
  assert.match(CSS, /\.exs-root\[data-theme-mode="dark"\][\s\S]*--exs-glass-bg/, "暗色玻璃令牌");
  assert.match(CSS, /translateX\(calc\(100% \+ 16px\)\)/, "收进态整条滑出动画");
  assert.match(CSS, /\.exs-script-rail-handle--show/, "拉手淡入样式");
  assert.ok(!/\.exs-script-rail \{[\s\S]*?bottom:\s*84px/.test(CSS), "不许再通高拉伸");
  // 层级校准（真机 bug：竖条浮在脚本 Dialog 上「竞合」）：思源 Dialog 是 inline
  // z-index = ++window.siyuan.zIndex（计数器初始 10，Dialog ≥11 且随会话递增），
  // excalidraw 自家 sidebar 是 5。竖条/拉手必须夹在 6~10 之间。
  assert.match(CSS, /\.exs-script-rail \{[\s\S]*?z-index: 8;/, "竖条压过画布 UI（>5）且低于 Dialog（<11）");
  assert.match(CSS, /\.exs-script-rail-handle \{[\s\S]*?z-index: 6;/, "拉手同口径");
  const railBlock = CSS.slice(CSS.indexOf(".exs-script-rail {"), CSS.indexOf(".exs-script-rail--off"));
  const handleBlock = CSS.slice(CSS.indexOf(".exs-script-rail-handle {"), CSS.indexOf(".exs-script-rail-handle__dot"));
  assert.ok(!/z-index: (1[1-9]|[2-9]\d|\d{3,})/.test(railBlock + handleBlock), "竖条/拉手层级必须 < 11（思源 Dialog 最低 inline 值）");
  // 选择器开/关广播 pickerOpen（行为让位，双保险）
  assert.match(INDEX, /new CustomEvent\(RAIL_VIEW_EVENT, \{ detail: \{ pickerOpen: true \} \}\)/, "选择器开着：广播让位");
  assert.match(INDEX, /new CustomEvent\(RAIL_VIEW_EVENT, \{ detail: \{ pickerOpen: false \} \}\)/, "选择器关闭：解除让位");
  assert.match(APP, /setPickerOpen/, "StudioApp 监听让位广播");
});

test("第三十四轮·真机修复三连：侧边栏可拖拽 + 视图状态广播 + 对话框不叠层", () => {
  const RAIL = stripComments(src("studio/ScriptRail.tsx"));
  // ① 拖拽：pointer 按住空白处拖动，落手按画布高度百分比记忆
  assert.match(RAIL, /onPointerDown=/, "竖条响应 pointer 拖拽");
  assert.match(RAIL, /onRailTopChange/, "拖拽落手回调");
  assert.match(RAIL, /exs-script-rail--dragging/, "拖拽中样式");
  assert.match(RAIL, /rail\.offsetParent/, "拖拽基准取真正包含块 offsetParent（用 parentElement 会先弹一下）");
  assert.match(RAIL, /railRect\.top - cbRect\.top/, "拖拽起点 = 当前实际 top（包含块坐标系）");
  assert.match(RAIL, /topPx0 \+ \(ev\.clientY - clientY0\)/, "拖拽增量 = 起点 + 指针位移（同一坐标系全程跟手）");
  assert.ok(!/offsetTop/.test(RAIL), "不再用 offsetTop 口径（与 CSS clamp 位置错位会先滑一段）");
  assert.match(INDEX, /onScriptRailTopChange: \(topPct\) => this\.rememberScriptRail\("scriptRailTop", topPct\)/, "宿主记忆位置");
  // ② 收起/位置即时生效：本地 state + RAIL_VIEW_EVENT 广播（getter 不触发重渲染的真机教训）
  const PIN = stripComments(src("studio/script-pin.ts"));
  assert.match(PIN, /exs:rail-view-changed/, "视图偏好广播事件");
  assert.match(APP, /useState\(\(\) => scriptRailCollapsed\)/, "视图状态以本地 state 为准");
  assert.match(APP, /addEventListener\(RAIL_VIEW_EVENT, onView\)/, "监听广播同步视图状态");
  assert.match(INDEX, /dispatchEvent\(new CustomEvent\(RAIL_VIEW_EVENT/, "宿主落盘后广播");
  assert.match(INDEX, /get scriptRailTop\(\)/, "位置 getter");
  // ③ 对话框不叠层：选择器单例 + inputPrompt 串行排队（思源每层 Dialog 都有遮罩）
  assert.match(INDEX, /scriptPickerDialog: Dialog \| null = null/, "选择器单例字段");
  assert.match(INDEX, /if \(this\.scriptPickerDialog\) return/, "已开着不再叠层");
  assert.match(INDEX, /inputPromptChain: Promise<unknown> = Promise\.resolve\(\)/, "inputPrompt 串行链");
  assert.match(INDEX, /this\.inputPromptChain\.then\(run, run\)/, "排队执行");
});

test("P2·脚本库面板：行内设置抽屉 + 行尾固定开关（不弹新 Dialog 防遮罩叠层）", () => {
  // ① 选择器升级为脚本库：标题 + 行尾动作组 + 行内抽屉
  assert.match(INDEX, /title: t\("脚本库"\)/, "选择器标题改为脚本库");
  assert.match(INDEX, /exs-script-item__actions/, "行尾动作按钮组");
  assert.match(INDEX, /data-act="gear"/, "设置按钮（仅声明了参数的脚本显示）");
  assert.match(INDEX, /data-act="pin"/, "固定开关按钮（点按翻转，右键菜单保留）");
  assert.match(INDEX, /exs-script-settings/, "行内设置抽屉");
  assert.match(INDEX, /querySelectorAll\(".exs-script-settings"\)/, "手风琴互斥（同时只展开一个抽屉）");
  assert.match(INDEX, /SCRIPT_SETTING_SPECS\[/, "按声明表生成表单");
  // ② 设置落盘：change 委托 → 宿主 → persist
  assert.match(INDEX, /getScriptSetting: \(scriptName, key\)/, "宿主读实现（按 SPECS 校验回落）");
  assert.match(INDEX, /setScriptSetting: \(scriptName, key, value\)/, "宿主写实现");
  assert.match(INDEX, /plugin\.persist\(\)/, "写即落盘");
  assert.match(INDEX, /new CustomEvent\(RAIL_VIEW_EVENT, \{ detail: \{ pickerOpen: true \} \}\)/, "选择器让位广播保留");
  // ③ 防叠层：openScriptPicker 内 new Dialog 只有一次（设置/固定全是 DOM 操作）
  const pickerBody = INDEX.slice(INDEX.indexOf("private openScriptPicker"), INDEX.indexOf("private async listPinnedScripts"));
  assert.equal((pickerBody.match(/new Dialog\(/g) || []).length, 1, "设置交互不新建 Dialog（防遮罩叠层变暗）");
  // ④ 运行时原语：createEaApi 注入当前脚本名（运行路径带修饰键，onload 路径无交互）
  assert.match(INDEX, /createEaApi\(handle, this\.eaHost\(\), info\.name, opts\)/, "运行路径：脚本名 + 修饰键");
  assert.match(INDEX, /createEaApi\(handle, this\.eaHost\(\), info\.name\)/, "onload 路径：脚本名（无修饰键）");
  const EA = stripComments(src("studio/ea-api.ts"));
  assert.match(EA, /createEaApi\(handle: EaBoardHandle, host: EaHost, scriptName = ""/, "第三参 scriptName（默认空串）");
  assert.match(EA, /getScriptSetting: \(key, defaultValue\)/, "EaApi 读原语（缺键回落 default）");
  assert.match(EA, /setScriptSetting: \(key, value\)/, "EaApi 写原语（宿主落盘）");
  // ⑤ 声明表 + 两个脚本的消费
  const STORE = src("siyuan/script-store.ts");
  assert.match(STORE, /export interface ScriptSettingSpec/, "参数声明类型");
  assert.match(STORE, /export const SCRIPT_SETTING_SPECS/, "参数声明表");
  assert.match(STORE, /"text-numbering\.md": \[/, "编号脚本声明 format");
  assert.match(STORE, /"box-selection\.md": \[/, "外框脚本声明 padding");
  assert.match(STORE, /ea\.getScriptSetting\("format", "1"\)/, "编号脚本读设置默认格式");
  assert.match(STORE, /ea\.getScriptSetting\("padding", 20\)/, "外框脚本读设置默认边距");
  assert.match(STORE, /getModifiers\(\)\.shift\) \{[\s\S]*?ea\.utils\.selectOption\(\{/, "格式选择只出现在 Shift 显式重编号分支（新文字直跑不弹）");
  assert.match(STORE, /PREFIX_RE/, "编号前缀正则共用（检测 + 剥离同源）");
  assert.match(STORE, /getModifiers\(\)\.shift/, "Shift+点按钮 = 显式请求弹框");
  assert.match(STORE, /const allNumbered = texts\.every\(\(t\) => PREFIX_RE\.test\(String\(t\.text \?\? ""\)\)\)/, "toggle 判定：选中的文字全带编号才去编号");
  assert.match(STORE, /已去掉 " \+ texts\.length \+ " 条文字的编号/, "toggle off 提示");
  assert.ok(!/detectFormat/.test(STORE), "监测启发式已删（改 Shift 显式）");
  assert.match(STORE, /if \(picked === null\) return;/, "菜单取消 = 什么都不做");
  assert.match(STORE, /fmt = \[1, 2, 3, 4, 5\]\.includes\(parsed\) \? parsed : 1;/, "脏设置值静默回落 1（不再二次弹窗追问）");
  // 内置脚本更新通道（installBuiltinScripts 已存在不覆盖 → 升级后旧版残留）
  assert.match(STORE, /export async function outdatedBuiltinScripts/, "过期检测导出");
  assert.match(STORE, /export async function resetBuiltinScripts/, "重置导出（只覆盖不一致的）");
  assert.match(INDEX, /exs-picker__outdated/, "脚本库面板顶部更新提示条");
  assert.match(INDEX, /data-act="reset"/, "重置按钮");
  assert.match(INDEX, /runScriptOnActiveBoard\(info, \{ shift: e\.shiftKey, at: \{ x: e\.clientX, y: e\.clientY \} \}\)/, "选择器点条目透传 Shift + 点击现场坐标（selectOption 菜单锚点）");
  // P2v4：几选一菜单（selectOption）——声明 / createEaApi 透传 / 宿主 Menu 实现
  assert.match(EA, /selectOption: \(spec: SelectOptionSpec\) => Promise<string \| null>/, "EaHost + EaUtils 同款 selectOption 声明");
  assert.match(EA, /export interface SelectOptionSpec \{/, "菜单声明类型（选项 + 当前值 + 锚点）");
  assert.match(EA, /selectOption: \(spec\) => host\.selectOption\(\{ \.\.\.spec, at: spec\.at \?\? modifiers\.at \}\)/, "createEaApi 透传 spec + 注入现场锚点");
  assert.match(INDEX, /selectOption: \(spec\) => \{/, "宿主实现 selectOption");
  assert.match(INDEX, /new Menu\("excali-select-option"/, "思源 Menu 下拉（不是 Dialog，无遮罩不叠层）");
  assert.match(INDEX, /if \(!picked\) resolve\(null\);/, "点空白/Esc/点菜单外 = 取消（closeCB 捕获）");
  assert.match(INDEX, /current: opt\.value === spec\.current,/, "当前默认格式打勾");
  assert.match(INDEX, /label: opt\.hint \? `\$\{opt\.label\}（\$\{opt\.hint\}）` : opt\.label,/, "菜单项带预览文案（如 数字（1. 2. 3.））");
  assert.match(INDEX, /menu\.open\(\{ x: at\.x, y: at\.y \}\)/, "在点击现场开菜单（缺省视口中央偏上）");
  assert.match(INDEX, /selectOptionChain: Promise<unknown> = Promise\.resolve\(\);/, "菜单串行链（连点两个脚本不叠菜单）");
  // P2v4：内置脚本自动更新（快照判定用户没动过才覆盖；onload 同步 + toast 告知）
  assert.match(STORE, /export async function syncBuiltinScripts/, "自动更新导出");
  assert.match(STORE, /export function hashContent/, "内容指纹 djb2");
  assert.match(STORE, /known === undefined \|\| known === hashContent\(disk\)/, "没动过（含首轮接管）才自动覆盖；用户改过的进 drifted 走手动条");
  assert.match(INDEX, /await syncBuiltinScripts\(this\.settings\.builtinSnapshot\)/, "onload 跑同步（装在 installBuiltinScripts 之后）");
  assert.match(INDEX, /内置脚本已更新到最新版/, "更新了要 toast 告知（不静默）");
  assert.match(SETTINGS, /builtinSnapshot: Record<string, number>/, "快照设置键");
  // C：取消语义统一（外框边距取消不再回落 20 照画；换形状取消静默、无效输入仍提示）
  assert.match(STORE, /if \(isNaN\(parsed\)\) return; \/\/ 取消\/无效输入 = 什么都不做/, "外框边距：取消/无效 = 不动");
  assert.match(STORE, /if \(target === ""\) return; \/\/ 取消 = 什么都不做/, "换形状：取消静默");
  // 修饰键传递链：按钮事件 → ScriptRail → StudioApp → tab → 宿主 → createEaApi
  const RAIL = stripComments(src("studio/ScriptRail.tsx"));
  assert.match(RAIL, /onRunScript\(s\.name, \{ shift: e\.shiftKey, at: \{ x: e\.clientX, y: e\.clientY \} \}\)/, "右栏按钮透传 Shift + 坐标");
  assert.match(APP, /onRunScriptFile: \(name: string, opts\?: ScriptRunOpts\) => void/, "StudioApp 签名带修饰键/坐标（ScriptRunOpts 是共享类型）");
  assert.match(TAB, /onRunScriptFile=\{host\.onRunScriptFile\}/, "tab 通道不变（签名在 StudioProps）");
  assert.match(INDEX, /onRunScriptFile: \(name, opts\) => void this\.runScriptFile\(name, opts\)/, "宿主签名带修饰键");
  assert.match(INDEX, /createEaApi\(handle, this\.eaHost\(\), info\.name, opts\)/, "修饰键进 ea");
  assert.match(INDEX, /runScriptOnActiveBoard\(info, opts\)/, "runScriptFile 透传修饰键");
  assert.match(EA, /createEaApi\(handle: EaBoardHandle, host: EaHost, scriptName = "", modifiers: ScriptRunOpts = \{\}\)/, "第四参 modifiers（类型即 ScriptRunOpts，坐标也在这条链上）");
  assert.match(EA, /export interface ScriptRunOpts \{[\s\S]*?shift\?: boolean;[\s\S]*?at\?: \{ x: number; y: number \};/, "ScriptRunOpts：Shift + 点击现场坐标");
  assert.match(EA, /getModifiers: \(\) => \{ shift: boolean \}/, "EaApi 声明 getModifiers");
  assert.match(EA, /getModifiers: \(\) => \(\{ shift: !!modifiers\.shift \}\)/, "getModifiers 实现");
  // inputPrompt 弹窗美化（真机截图反馈「有点丑」）：收窄 + number 去微调箭头
  assert.match(INDEX, /width: "340px"/, "参数弹窗收窄（380 对一输入框+两按钮太空旷）");
  assert.match(src("index.css"), /::-webkit-inner-spin-button/, "隐藏 number 型微调箭头");
  assert.match(src("studio/menu-icons.ts"), /"box-selection\.md": ICON_BOX_SELECTION/, "外框脚本配专属图标");
  // ⑥ 设置键进设置面
  assert.match(SETTINGS, /scriptSettings: Record<string, Record<string, string \| number \| boolean>>/, "scriptSettings 设置键");
  assert.match(src("index.css"), /\.exs-script-item__actions/, "行尾按钮样式");
  assert.match(src("index.css"), /\.exs-script-settings/, "抽屉样式");
});

test("方案 A·素材库导入：面板 ⋮ 菜单注入入口 + 链接解析 + updateLibrary 官方配方", () => {
  // A0：解析纯函数（query/hash 两形态 + 裸直链 + 后缀/协议校验）
  const PARSE = stripComments(src("studio/library-import.ts"));
  assert.match(PARSE, /searchParams\.get\("addLibrary"\)/, "query 形态取 addLibrary");
  assert.match(PARSE, /new URLSearchParams\(u\.hash\.slice\(1\)\)\.get\("addLibrary"\)/, "hash 形态取 addLibrary");
  assert.match(PARSE, /endsWith\("\.excalidrawlib"\)/, "裸直链必须 .excalidrawlib 结尾");
  assert.match(PARSE, /u\.protocol !== "http:" && u\.protocol !== "https:"/, "只收 http(s)");
  // A1：入口 = 素材库面板 ⋮ 菜单注入（2026-10-19 从 ☰ 迁入；vendor LibraryDropdownMenu
  //    硬编码无扩展点，DOM 注入 + 复用 vendor 菜单项样式类）
  const INJECT = stripComments(src("studio/library-menu-inject.ts"));
  assert.match(INJECT, /MENU_SELECTOR = "\.dropdown-menu\.library-menu"/, "盯 vendor 菜单容器（DropdownMenuContent 非 portal）");
  assert.match(INJECT, /dropdown-menu-item dropdown-menu-item-base/, "复用 vendor 菜单项样式类（视觉与内置项一致）");
  assert.match(INJECT, /KEYS|Escape/, "点击后派发 Escape 关菜单（vendor onKeyDown 吃 Escape）");
  assert.match(INJECT, /MutationObserver/, "菜单 open 才渲染，observer 盯 body 等出现");
  assert.match(INJECT, /t\("导入素材库…"\)/, "注入项文案");
  assert.match(src("studio/menu-icons.ts"), /export const ICON_IMPORT_LIBRARY =/, "导入图标定义");
  // A2：StudioApp 挂载对话框（api 传得进）
  assert.match(APP, /import \{ LibraryImportDialog \}/, "StudioApp 引入对话框");
  assert.match(APP, /onImport: \(\) => setImportLibOpen\(true\)/, "注入项开对话框");
  assert.match(APP, /startLibraryMenuInjection\(/, "StudioApp 启动注入");
  assert.match(APP, /<LibraryImportDialog api=\{api\}/, "api 传入对话框（updateLibrary 的载体）");
  // A3：对话框 = 官方 importLibrary 同款配方（fetch → Blob → updateLibrary merge）
  const DLG = stripComments(src("studio/LibraryImportDialog.tsx"));
  assert.match(DLG, /parseLibraryInput\(url\)/, "输入先过解析纯函数");
  assert.match(DLG, /await fetch\(target\.libraryUrl\)/, "远程：fetch 库文件");
  assert.match(DLG, /if \(!res\.ok\) throw new Error\(`HTTP \$\{res\.status\}`\)/, "远程：HTTP 非 2xx 快速失败");
  assert.match(
    DLG,
    /libraryItems: blob,\s*prompt: true,\s*merge: true,\s*defaultStatus: "published",\s*openLibraryMenu: true/,
    "远程配方对齐官方 importLibrary（merge + published + 开组件库面板 + 安装确认）",
  );
  assert.match(DLG, /libraryItems: file,/, "本地文件：File 即 Blob，直接喂 updateLibrary");
  assert.match(DLG, /accept="\.excalidrawlib"/, "本地选择器只收 .excalidrawlib");
  assert.match(DLG, /type="file"/, "本地入口是 input[type=file]（不经宿主机文件系统权限）");
  assert.match(DLG, /disabled=\{busy \|\| !url\.trim\(\)\}/, "空 URL 禁导入按钮");
  // A4：对话框样式与 i18n 键落地
  assert.match(src("index.css"), /\.exs-lib-import-dialog \{/, "导入对话框样式");
  const zh = json("i18n/zh_CN.json");
  for (const k of ["导入素材库…", "导入素材库", "素材库已导入", "导入失败：{msg}", "请先粘贴素材库链接"]) {
    assert.ok(k in zh, `i18n 键存在：${k}`);
  }
});

test("方案 B'·素材库落地页：libraryReturnUrl 指向本地导入页 + 构建/拷贝/页面/调用链全接线", () => {
  // B'0：页面模块（src/library-import-page.ts）——纯模块 + 浏览器守卫 + 复用方案 A/stencil
  const PAGE = stripComments(src("library-import-page.ts"));
  assert.match(PAGE, /from "\.\/studio\/library-import\.ts"/, "复用方案 A 的链接解析");
  assert.match(PAGE, /from "\.\/studio\/stencil\.ts"/, "复用 stencil 的库文件读写纯函数");
  assert.match(PAGE, /typeof document !== "undefined" && typeof location !== "undefined"/, "DOM 引导有守卫（node import 安全）");
  assert.match(PAGE, /export const DEFAULT_LIB_DIR = "assets\/excali\/excali-libraries"/, "默认图库目录与 settings 对齐");
  for (const ep of ["/api/file/putFile", "/api/file/getFile", "/api/file/readDir"]) {
    assert.ok(PAGE.includes(ep), `页面直连内核文件 API：${ep}`);
  }
  // B'1：构建第四趟（ES 单文件，页面 <script type="module"> 加载）
  assert.match(BUILD_SCRIPT, /function libImportConfig\(\)/, "build.mjs 有落地页构建配置");
  assert.match(BUILD_SCRIPT, /formats: \["es"\]/, "ES 格式（浏览器 module）");
  assert.match(BUILD_SCRIPT, /resolve\(ROOT, "src\/library-import-page\.ts"\)/, "入口是页面模块");
  assert.match(BUILD_SCRIPT, /outDir: "dist-lib"/, "产物目录 dist-lib");
  assert.match(BUILD_SCRIPT, /await build\(libImportConfig\(\)\)/, "第四趟真的跑了");
  // B'2：拷贝脚本把两个新产物搬到插件根（内核 web 根下外部浏览器可达）
  const COPY = stripComments(src("../scripts/copy-dist.mjs"));
  assert.match(COPY, /dist-lib", "lib-import\.js"/, "拷贝构建产物");
  assert.match(COPY, /resolve\(ROOT, "lib-import\.js"\)/, "落到插件根 lib-import.js");
  assert.match(COPY, /src-import", "library-import\.html"/, "拷贝静态壳");
  assert.match(COPY, /resolve\(ROOT, "library-import\.html"\)/, "落到插件根 library-import.html");
  // B'3：静态壳与 JS 的 id 契约（JS 按 id 取元素，对不上就静默失效）
  const HTML = src("../src-import/library-import.html");
  assert.match(HTML, /<script type="module" src="\.\/lib-import\.js"><\/script>/, "页面加载 ES 引导脚本");
  for (const id of ["state", "detail", "actions", "btn-import", "btn-cancel", "manual", "manual-url", "btn-manual", "dir"]) {
    assert.ok(HTML.includes(`id="${id}"`), `静态壳有 #${id}`);
  }
  // B'4：StudioApp——函数 prop + 聚焦刷新 + 喂给 libraryReturnUrl
  assert.match(APP, /getLibraryImportUrl: \(\) => string/, "StudioProps 声明函数 prop");
  assert.match(APP, /getLibraryImportUrl,/, "解构进组件");
  assert.match(APP, /useState\(getLibraryImportUrl\)/, "初始值现算");
  assert.match(APP, /window\.addEventListener\("focus", refresh\)/, "聚焦刷新（改保存目录后回画布即生效）");
  assert.match(APP, /libraryReturnUrl=\{libraryImportUrl\}/, "喂给 Excalidraw 组件的 libraryReturnUrl");
  assert.ok(!/libraryReturnUrl="excali-studio"/.test(APP), "旧的无效值已清除");
  // B'5：宿主 index.ts——点击时算 URL（location.origin 端口自适应 + dir 参数带库目录）
  assert.match(INDEX, /getLibraryImportUrl: \(\) => plugin\.libraryImportUrl\(\)/, "host 提供函数 prop");
  assert.match(INDEX, /private libraryImportUrl\(\): string \{/, "宿主 URL 计算方法");
  assert.match(INDEX, /encodeURIComponent\(this\.libDirRel\(\)\)/, "库目录编码进 URL（页面读不到插件设置）");
  assert.match(INDEX, /library-import\.html\?dir=\$\{dir\}/, "指向落地页并带 dir 参数");
  assert.match(INDEX, /plugins\/\$\{PLUGIN_WEB_DIR\}\/library-import\.html/, "走 PLUGIN_WEB_DIR 常量");
  // B'6：tab.tsx——Pick 与传递（漏一个就 TS 报错，但也防回归）
  assert.match(TAB, /"getLibraryImportUrl"/, "StudioTabHost Pick 含新字段");
  assert.match(TAB, /getLibraryImportUrl=\{host\.getLibraryImportUrl\}/, "页签侧透传");
});

test("2026-10-19·素材库导入修复：v1 格式归一化 + 聚焦热刷新 + 手动刷新", () => {
  // 事故复盘：官方素材库站的文件是 v1 形态 {…, library:[[元素,元素],…]}（条目是裸
  // 元素数组），旧落地页把数组当对象展开成 {"0":{…},"status":…} 写盘，vendor 的
  // Tp 校验（恢复不出 elements）整条丢弃 →「导入完成但组件库面板空空如也」；
  // 且 studio 只有挂载那一次读盘，导入前就开着的页签永远不刷新。
  const STENCIL = stripComments(src("studio/stencil.ts"));
  assert.match(STENCIL, /export function normalizeLibItems\(/, "归一化纯函数导出（可单测）");
  assert.match(STENCIL, /export function deriveItemId\(/, "确定性 id 派生导出");
  assert.match(STENCIL, /return normalizeLibItems\(raw\)/, "parseLibFile 的输出过归一化（所有读盘路径受益）");
  assert.ok(STENCIL.includes("o.libraryItems") && STENCIL.includes("o.library"), "v1 的 library 键照旧认（官方站就是这形态）");
  assert.match(STENCIL, /lib-/, "派生 id 带 lib- 前缀（不与真实 id 撞）");
  assert.match(STENCIL, /numericKeyElements\(/, "数字键怪胎回收（旧 bug 产物自愈）");

  // StudioApp：applyDiskLibrary 三处复用（挂载 / 聚焦自动 / 菜单手动）
  assert.match(APP, /async \(source: "mount" \| "auto" \| "manual"\)/, "applyDiskLibrary 带来源参数");
  assert.match(APP, /void applyDiskLibrary\("mount"\)/, "挂载即加载");
  assert.match(APP, /void applyDiskLibrary\("auto"\)/, "聚焦热刷新（防抖 250ms）");
  assert.match(APP, /void applyDiskLibrary\("manual"\)/, "☰ 手动刷新");
  assert.match(APP, /document\.addEventListener\("visibilitychange", refresh\)/, "切回窗口的另一条触发（最小化恢复）");
  assert.match(APP, /document\.visibilityState !== "visible"/, "窗口不可见不读盘");
  assert.match(APP, /if \(sig === libSigRef\.current\) return/, "磁盘没变整个跳过（不惊动 onLibraryChange）");
  assert.match(APP, /libSigRef\.current = libSignature\(items as unknown\[\]\)/, "自己存下去的那一届记住签名（防误报外部新增）");
  // StudioMenu：⋮ 菜单注入（第 10 个自绘项 → 面板菜单注入项，2026-10-19 迁移）
  assert.match(APP, /onRefresh: \(\) => void applyDiskLibrary\("manual"\)/, "⋮ 菜单注入项接手动刷新");
  const INJECT = stripComments(src("studio/library-menu-inject.ts"));
  assert.match(INJECT, /t\("刷新素材库"\)/, "注入项文案");
  assert.match(INJECT, /ICON_REFRESH/, "刷新图标被注入器消费");
  assert.match(src("studio/menu-icons.ts"), /export const ICON_REFRESH =/, "刷新图标常量");

  // i18n：三个新键两种语言都在
  const zh = json("i18n/zh_CN.json");
  const en = json("i18n/en_US.json");
  for (const k of ["刷新素材库", "素材库已刷新，共 {n} 个条目", "素材库已刷新，新增 {n} 个条目"]) {
    assert.ok(k in zh, `zh_CN 缺键：${k}`);
    assert.ok(k in en, `en_US 缺键：${k}`);
  }

  // 落地页：成功文案告知自动合并 + 手动兜底（用户唯一的反馈渠道）
  const PAGE = src("library-import-page.ts");
  assert.ok(PAGE.includes("自动合并进组件库面板"), "成功页说明切回窗口即合并");
  assert.ok(PAGE.includes("刷新素材库"), "成功页给出手动兜底入口");
});

test("2026-10-19·竖条与 vendor 右缘侧栏避让（素材库/搜索开着即让位，拉手一起藏）", () => {
  // 用户实机反馈：素材库侧栏（vendor 右缘）与脚本竖条（我们贴右缘）互相遮挡，
  // 竖条浮在面板右缘挡面板自己的 ⋮/✕。口径：任何 openSidebar 开着 → 竖条整条
  // 滑出 + 拉手也藏（侧栏自己贴右缘，拉手浮上去正是被投诉的遮挡）；关掉即恢复，
  // 不改用户的手动收进记忆。
  const RAIL = stripComments(src("studio/ScriptRail.tsx"));
  assert.match(RAIL, /sidebarOpen: boolean;/, "竖条收 sidebarOpen prop");
  assert.match(RAIL, /const railOff = props\.railCollapsed \|\| props\.pickerOpen \|\| props\.sidebarOpen;/, "让位三来源");
  assert.match(RAIL, /const handleShow = railOff && !props\.sidebarOpen;/, "侧栏开着连拉手一起藏");
  assert.match(RAIL, /handleShow \? " exs-script-rail-handle--show"/, "拉手显隐只看 handleShow");
  assert.match(RAIL, /aria-hidden=\{!handleShow\}/, "拉手 aria 同步");
  // StudioApp：openSidebar → 状态（每帧跟 + 翻转才渲染）+ 挂载现读兜底 + 传 props
  assert.match(APP, /const \[sidebarOpen, setSidebarOpen\] = useState\(false\);/, "让位状态");
  assert.match(APP, /const sidebar = appState\.openSidebar != null;/, "真源是 appState.openSidebar（不限名字：素材库/搜索都贴右缘）");
  assert.match(APP, /if \(sidebar !== sidebarOpenRef\.current\)/, "签名去重：只在翻转时 setState（每帧回调不渲染风暴）");
  assert.match(APP, /api\.getAppState\(\)\.openSidebar/, "挂载现读兜底（场景可能带着开着的侧栏落盘）");
  assert.match(APP, /sidebarOpen=\{sidebarOpen\}/, "传给竖条");
});

test("2026-10-19·打开素材库文件夹 + 导入对话框系统选择器（桌面端 openPath / showOpenDialog）", () => {
  // 用户需求：① 库站 Download 后少手动跳转——素材库文件夹一键直达 Finder；
  // ② vendor ⋮「打开」的 DOM input 指定不了初始目录（Chromium 限制），换用
  //    思源主进程通道。拆包事实：nodeIntegration 下 ipcRenderer
  //    send("siyuan-cmd",{cmd:"openPath"}) / invoke("siyuan-get",{cmd:"showOpenDialog"}) 可用。
  const BRIDGE = stripComments(src("studio/desktop-bridge.ts"));
  assert.match(BRIDGE, /send\("siyuan-cmd", \{ cmd: "openPath", filePath: p \}\)/, "openPath 通道与键名锁死");
  assert.match(BRIDGE, /invoke\("siyuan-get", \{ cmd: "showOpenDialog"/, "showOpenDialog 走 siyuan-get");
  assert.match(BRIDGE, /extensions: \["excalidrawlib"\]/, "只列 .excalidrawlib");
  assert.match(BRIDGE, /return \{ kind: "unavailable" \}/, "非桌面端安全降级（不抛错）");
  assert.match(BRIDGE, /siyuan\?\.config\?\.system\?\.dataDir/, "dataDir 即工作区/data 的绝对路径");

  // 宿主：素材库绝对路径 = dataDir + 保存目录实时推导（设置改了保存目录也跟手）
  const INDEX = stripComments(src("index.ts"));
  assert.match(INDEX, /get libDirAbs\(\) \{/, "宿主 getter（实时推导）");
  assert.match(INDEX, /joinPosix\(workspaceDataDir\(\), plugin\.libDirRel\(\)\)/, "dataDir + libDirRel 拼接");

  // tab：libDirAbs 进 StudioTabHost 并传给画布
  const TAB = stripComments(src("studio/tab.tsx"));
  assert.match(TAB, /\| "libDirAbs"/, "Pick 类型放行");
  assert.match(TAB, /libDirAbs=\{host\.libDirAbs\}/, "render 接线");

  // 面板 ⋮ 菜单注入项（☰ 菜单已删这三项）
  const INJECT2 = stripComments(src("studio/library-menu-inject.ts"));
  assert.match(INJECT2, /t\("打开素材库文件夹"\)/, "注入项文案");
  assert.match(INJECT2, /ICON_FOLDER_OPEN/, "文件夹图标被注入器消费");
  assert.match(src("studio/menu-icons.ts"), /export const ICON_FOLDER_OPEN =/, "文件夹图标定义");
  assert.match(APP, /onOpenFolder: \(\) => \{/, "注入项处理块在 StudioApp");
  assert.match(APP, /openPathInFileManager\(libDirAbs\)/, "调用 desktop-bridge 的 openPathInFileManager");
  assert.match(APP, /仅桌面端支持在文件管理器中打开文件夹/, "非桌面端有降级提示");
  assert.match(APP, /libDirAbs=\{libDirAbs\}/, "libDirAbs 传给导入对话框（系统文件选择器初始目录）");

  // 导入对话框：桌面端优先系统选择器，非桌面端回落 DOM input
  const DIALOG = stripComments(src("studio/LibraryImportDialog.tsx"));
  assert.match(DIALOG, /pickLibraryFile\(libDirAbs\)/, "先试主进程选择器");
  assert.match(DIALOG, /fileRef\.current\?\.click\(\)/, "unavailable 回落原 DOM input");
  assert.match(DIALOG, /importLocalFile\(picked\.file\.blob\)/, "读出的 Blob 喂 updateLibrary");

  // i18n：三个新键两种语言都在
  const zh = json("i18n/zh_CN.json");
  const en = json("i18n/en_US.json");
  for (const k of ["打开素材库文件夹", "仅桌面端支持在文件管理器中打开文件夹", "无法读取所选文件"]) {
    assert.ok(k in zh, `zh_CN 缺键：${k}`);
    assert.ok(k in en, `en_US 缺键：${k}`);
  }
});
