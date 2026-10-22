# 开发笔记（dev notes）

> 2026-10-20 由 README.md 精简迁出：按开发轮次记录的功能细节、仓库结构与内部取舍，面向维护者。
> 集市用户请看根目录 [README.md](../README.md)。
>
> **各轮条目是当时的口径，不回改**；被后续轮次推翻的地方以**最后一轮为准**，
> 或在「功能细节」开头那节（当前行为）里体现。例：第十九轮的 BAK 写侧已由第五十四轮退役。

# 功能细节（按开发轮次）


**存取闭环**

- 三个新建入口：顶栏图标（右键为菜单）、斜杠 `/白板`、快捷键 `⌘⌥E`（Windows `Ctrl+Alt+E`），
  dock 白板库头部「＋」同路
- **新建 = 文件先行**（第二十一轮起，对齐 Obsidian Excalidraw 的体验）：点任意入口先弹命名框
  （默认「未命名白板」，取消 = 什么都不做）→ 在 `data/assets/`（目录可在设置里改）落一份
  **空 scene 的 SVG**（撞名自动滚 `_0`/`_1`，不静默覆盖别人的板）→ **即时补进左 Dock 白板库**
  → 自动开页签进入画布。画布从第一帧起就归属文件，用户没有任何「保存」动作可做
- **画即所存**：作画停手约 1 秒（防抖）自动落盘；`⌘/Ctrl+S` 跳过防抖立即落盘；
  切换窗口 / 页签隐藏、关闭页签前都会强制冲刷一次（失败才弹「丢弃」确认）。
  ☰ 菜单里**没有**「保存 / 保存副本…」——保存是后台行为，不是用户义务
- 打开已有白板：dock 白板库点条目、顶栏菜单「最近打开」/「按路径打开…」，或**右键文档里的图**
  →「用 Excali 白板打开」（只对工作空间 `assets/*.svg` 出现，外链图不出现）
- 解码兼容：`exportEmbedScene` 的 v1/v2 两种 payload、压缩/未压缩、bstring 编码；
  空 scene（刚建还没画、或清空后没再画）按**合法空画板**打开，坏数据/非本格式才就地报错
- 想要「文档形态」（反链/可搜索）是**可选存档层**：dock 行右键「建档」把文件收编成一篇
  文档，或在设置里打开「新建时自动建档」；旧的「保存到文档…」「插入到当前文档」
  两条链路已删（第二十轮）
- 覆盖保存后自动给页面上已显示的同一张图挂 `?t=` 破缓存（只改 DOM，不碰 markdown）
- 页签图标带**脏点**：有未落盘改动时亮小圆点，落盘后消失（第十五轮起按场景指纹判定，
  平移画布、换工具、打开后一笔不动都不会亮）
- 重启思源后页签按 layout 恢复（`customModelData` 里存 `dataPath`），回到原来的白板

**阶段 A 新增（2026-10-15，对照 Obsidian Excalidraw 补基础功能）**

- **多格式导出**：☰ 菜单「导出图片…」或 `⌘/Ctrl+Shift+E` 打开导出对话框——
  PNG / JPEG / WebP / SVG，1–3 倍率，仅导出选中、透明背景、暗色主题、SVG 内嵌可编辑 scene；
  「下载」存到系统下载目录，「复制到剪贴板」直接贴图（位图格式）。落盘进白板库的仍是
  内嵌 scene 的 SVG（保存链路自动进行，不走这个对话框）
- **首次保存可命名**：已被「文件先行」取代（第二十一轮）——新建时命名，落盘即完成
- **重命名**：☰ 菜单「重命名」改文件名（读旧写新删旧）；注意只动文件，
  画布上未落盘的改动不会跟着过去（重命名后防抖会把它们写进新文件）
- **自动保存**（唯一保存形态，不可关）：新建即有文件，作画停手约 1 秒防抖落盘；
  `⌘S` 强制落盘；失焦/切走/关页签强制冲刷。两道避让闸（对齐 Obsidian autosave 清单）：
  空场景不落盘（清板不会把好文件写成空的）、正在画一笔/编辑文字时不落盘。
  第五十四轮起**不再写 `.bak` 备份档**（一块板在目录里只有一份文件），落盘前加两道等价门：
  正文逐字相同、或载荷语义相同（只是 vendor 归一化/键序差异）都直接返回、不重写文件
- **文件列表打开**：dock 白板库即文件列表（修改时间新的在前，「已打开」「已建档」角标，
  第二十二轮起改原生样式：无搜索框，行内悬停出重命名/删除），点即打开；顶栏右键
  「打开白板…」「按路径打开…」保留。删除文件用 dock 行右键（或行内悬停删除按钮）
  或思源资源面板即可（白板就是普通 assets 文件）
- 设置项「覆盖前留备份」已于第五十四轮随备份链一起删除（自动保存在第二十一轮就先成了
  唯一保存形态，开关那时已名存实亡）

**阶段 B 新增（2026-10-15）**

- **图片导入**：本地图片**拖放到画布**（落在落点）、**剪贴板粘贴图片**（贴在视口中心）；
  超过 2048px 长边自动等比压缩后插入；**第二十六轮起图片外置**——二进制落到
  `assets/excali-media/` 内容寻址文件（同图自动去重），scene 里只存引用，
  多图不再撑爆白板文件（压测：50 张 40KB 图的板 4.26 MB → 172 KB，缩 96%）
- **嵌入图点击即开**：文档里的白板嵌入图，点一下直接进画板页签（库里有登记的板才拦，
  没登记过的图仍是思源原生行为；经插件打开一次即登记）
- **图形点击跳文档**：选中图形后用脚本 `ea.setLink("selection", "siyuan:doc/<文档ID>")`
  写链接，画布上点击该图形即打开那篇文档（`siyuan:` 链接由插件接管，外链仍走 vendor）
- **AI 绘图（第三十六、三十七、三十九轮）**：三条通道——① 思源内置智能体直接「列白板 / 打开
  白板 / 按计划画图 / 生成图片」（`excali_*` 四能力，仅内置智能体可见）；② 内核
  `kernel.js` 注册 `excali_file_*` 四工具进共享工具表与内核 MCP（外部 WorkBuddy/Qoder
  经 `/mcp` 调用）；③ 能跑命令的 agent 用 `scripts/excali-board.mjs`（list/create/append）
  + `script/excali-draw/SKILL.md`。模型只写 nodes/edges 或一句画面描述，自动布局、配色、
  位图接入由插件负责；批量出图想「同一套视觉」写风格包（`data/assets/excali-styles/*.json`，
  只写与基线的差异），三条通道用同一包名引用
- **缩放适应**：☰ 菜单「缩放适应」缩放并滚动到全部内容（写入 API 驱动 `api.scrollToContent()`）
- **组件库（Library）**：☰ 菜单里打开官方图库面板；自建组件持久化到
  `<保存目录>/excali-library.json`（换电脑/重装后图库还在）
- **画布内文本搜索**：上游 0.18.1 自带——☰ 菜单「在画布上查找」（`MainMenu.DefaultItems.SearchMenu`）
  打开画布侧边搜索栏（原「本期不做」的判断已作废）
- **中文手写回落**（第二十九轮查证：上游内建，零开发）：默认字体 Excalifont 的回落链是
  `Xiaolai → Segoe UI Emoji`——画布写中文自动回落到 Xiaolai 手写体（209 个
  `unicode-range` 子分片按用到的码段懒加载，见「已知取舍·字体不裁」）。
  Obsidian 版的 CJKLoader 是 fork 自己的实现；官方 0.18.1 已内建等价能力，
  随第二十六轮字体拷贝（`fonts/Xiaolai/`，209 文件）即开即用

**第六轮（2026-10-16，动作收进 ☰ 主菜单）**

- 画布右上角那条自绘按钮条（保存 / 导出 / 重命名 / 适应视图 / 只读 / 禅模式）**整条撤掉**：
  前四项挪进 ☰ 主菜单，**只读与禅模式直接删**——画布空白处右键菜单里 Excalidraw 本来就固定给了
  这两项（`App.getContextMenuItems("canvas")` 里就是 `actionToggleZenMode` + `actionToggleViewMode`，
  同排还有切换网格、对齐吸附、对象统计），不必再占一处入口
- ☰ 菜单顺序：打开 → **导出图片…**（`Cmd+Shift+E`）→ **重命名** → **缩放适应** →
  在画布上查找 → 帮助 → 链接分组 → 主题 / 画布背景
  （原「保存」「保存到文档…」两项已随功能删除；第二十一轮起连「保存 / 保存副本…」也删了——
  文件先行 + 防抖自动保存，菜单里不再有保存心智）
- 顺带把分组标题的硬编码英文 `Excalidraw links` 换成中文「Excalidraw 链接」
- 副作用（都是好的）：不再需要捕获阶段劫持菜单项 DOM、不再补发 Escape 收菜单；
  `⌘⇧E` 也抢在 Excalidraw 自己的导出框之前，导出只有一条路

**第七轮（2026-10-16，EA 样式复刻 S1）**

- 右下角浮动按钮（FAB）：当轮加的 ➕ 按钮**第十一轮已整个删除**——它 16px 见方地压住
  vendor 自带的帮助「?」，四个动作工具栏全有；删除理由与快捷键体检见第十一轮
- **提示气泡胶囊化**：Excalidraw 的 hint（如「要移动画布…」）由工具栏下方通栏灰字覆写为
  居中圆角胶囊，跟随思源明暗主题（纯 CSS 覆写 `.HintViewer`）
- 顺带修复：`.exs-root` 补 `position:relative`（导出遮罩此前靠初始包含块碰巧盖住）

**第八轮（2026-10-16，左 Dock：EA 左侧主菜单的思源形态）**

- 左下角新增 **Excali 白板 Dock**（`addDock` LeftBottom，宽 300，可在思源布局里拖宽/折叠）：
  - **空态**（没有打开的白板页签）：「新建白板」「打开白板…」两个入口；
  - **画布背景色板**：10 色（含「默认」= 跟随主题），点选即改当前画布背景
    （`viewBackgroundColor`，改动参与脏状态，下次保存生效）；
  - **操作组**：保存 / 保存到文档… / 导出图片… / **插入到当前文档**（思源化「打开为
    Markdown」——把白板图插进当前正在编辑的文档，已有则只破缓存）/ 重置画布
    （宿主侧二次确认，只清画布不动文件）；
  - **其他**：设置 / 帮助（快捷键速查面板）
- 路由机制：画布挂载时向宿主注册「动作窄接口」（`BoardActions`：save/saveToDoc/export/
  insert/reset/背景），每次交互上报「我是当前活动画板」；dock 的动作永远路由到
  最近活动的那张板；页签关闭自动出账。跨分屏同时开多张板时取最近交互的那张
- 分层保持不变：dock/宿主在编排层、画布在 studio/ 层，两边只经窄接口通信，
  React 树依旧零思源 API（静态契约测试把守）

**第九轮（2026-10-16，S3 脚本引擎 v1）**

- **白板脚本引擎**：脚本 = `assets/excali-scripts/*.md` 工作空间文档（标题取 H1、
  代码取第一个 ``` 围栏、文件头 `@excalidraw-onload` = 画布打开时自动运行）——
  在思源里直接编辑/搜索/同步/版本历史
- **ea API v1**（~40 方法，命名对齐 ExcalidrawAutomate）：创建（addRect/addDiamond/
  addEllipse/addArrow/addLine/addText/addFrame/addImage）/ 场景（getElements/
  addElements/deleteElements/clear/selectElements/setStyle）/ 视图（zoomToFit/
  scrollToElement/getViewMode/setViewMode/背景）/ 导出（exportSVG/exportPNG）/
  宿主（save/saveToDoc/insertToActiveDoc/getDocMarkdown/getSelectedText/listFiles/
  addImageFromFile）/ utils（uuid/parseHeadings/parseList/parseTable）；
  全部脚本按 async 函数体执行，顶层 await 可用，console 被收集进运行结果
- **入口**：☰ 菜单「运行脚本…」+ dock「其他 → 运行脚本…」→ 脚本选择器（标题 + 
  onload 徽标 + 文件名）；首次启用自动安装 4 个内置脚本：
  **笔记标题→思维导图 / Markdown 表格→图表格 / 缩进列表→流程图 / 批量导入图片**
  （前三个直接读当前文档内容——EA 没有的思源通路）
- **onload 生命周期**：文件头 `@excalidraw-onload` 的脚本在画布首次就绪时自动运行
  （防重入：每个页签每轮只跑一次）；结果走 console，不弹窗
- **安全边界**：脚本 = 用户自有代码自有机器（与 EA 同信任级，无沙箱，README 明示）；
  同步死循环会卡界面（无超时中断，与 EA 一致）；**不做脚本市场/一键安装他人脚本**

**第十轮（2026-10-16，网格视图的全局记忆）**

- 「默认显示网格」：在**任意**白板里切换网格都会记住这个值，之后所有白板（含还没保存过的
  空白板）打开时都按它显示。语义是**视图偏好**而不是内容——打开时覆盖文件里内嵌的那个值，
  所以「开一次就一直开」；只记开关，不记 gridStep/gridSize/画布背景色
- 为什么必须记在插件设置里：空板有「存不下去」这道守卫（`saveFlow` 拒绝空场景落盘），
  而新板默认 `gridModeEnabled: false`——文件通路根本带不出这个偏好；已存文件的内嵌
  appState 只保留 4 个键（`gridSize`/`gridStep`/`gridModeEnabled`/`viewBackgroundColor`），
  网格本来能随文件往返，但那是「上一个人的这块板」而不是「我这个人的所有板」
- 回写走 `onChange` 的第二参数（vendor 签名 `(elements, appState, files)`，拖拽每帧都回调），
  所以用 `gridRef` 比对，只在真的翻转时 `saveData` 一次
- ☰ 菜单项「适应视图」改名**「缩放适应」**（与画布右键的「缩放以适应选区/所有元素/视口」同一口径）

**第十一轮（2026-10-16，删掉右下角 ➕ FAB＋帮助快捷键体检）**

- **右下角 ➕ FAB 整个删除**：S1 当轮加的 FAB 恰好压住 Excalidraw 自带的帮助「?」按钮
  （真机截图实锤）。四个动作全有替代：「插入图片」走拖放/粘贴（阶段 B 路已通），
  文本/矩形/画框在工具栏（T / R / 2 / F）与「更多工具 → 画框工具」里都有 ⇒ 不留替代入口，
  组件、样式、i18n 五键（快速添加/插入图片/文本/矩形/框架）一并清走
- **帮助弹窗快捷键逐条体检**（读 vendor 0.18.1 源码核对 keyTest）：除「命令面板」外全部
  真实存在可触发。几条容易没想到的：`⌘'` 切网格、`⌥Z` 禅模式、`⌥S` 对齐吸附、`⌥R` 只读、
  `⌥/` 对象统计、`⇧⌥C` 复制为 PNG、`⌘⇧V` 粘贴为新选择；帮助行里的「缩放以适应选区」
  是右键菜单项（`⇧2` 对应它），没有独立全局键
- **死项：命令面板（`⌘/`）**——上游把 `CommandPalette` 组件留在 npm 包里但从不渲染、
  也不在导出表里；`App.onKeyDown` 没有 `⌘/` 处理，按 `⌘P` 只弹一句 toast
  「使用 ⌘/ 打开命令面板」（中文补丁把这句也汉化了，反而更像真的）。裁决：**不做替代面板，
  仅记录**（详见「已知取舍」）
- 另记两处与帮助文案的偏差：`⌘⇧E` 按设计被插件抢占（弹我们自己的导出对话框，替代 vendor
  「导出为图片」）；「更多工具 → Generate」是 vendor 硬编码英文，语言包补丁够不到

**第十二轮（2026-10-16，手感修复：关页签冲刷 / 默认背景导出 / dock 打磨）**

- **关页签不再丢改动**：✕ / `⌘W` / 标签右键「关闭」三条路径统一先走「冲刷」——有改动且
  已落过盘的白板在关闭前把场景导出成 SVG 覆盖写回；没落过盘（无路径）才弹确认框。
  此前只有「点 ✕」有确认，`⌘W` 与右键关闭靠 60 秒自动保存兜底，最坏丢 60 秒
- **「默认」背景导出补底**：`viewBackgroundColor` 为空串（= 跟随主题）时，位图导出按当前
  主题补 `#ffffff` / `#121212` 底色（此前不勾「透明背景」的 PNG 仍是透明底）；
  SVG 导出的补底只进渲染树，内嵌 payload 里仍是空串——文件再次打开依旧跟随主题
- **dock 打磨**：「保存」升级为主色按钮；「其他」组新增「打开白板…」（与顶栏右键同一个
  文件列表）；文件名下新增状态行（「有未保存的改动」/「已保存 HH:MM」，行高固定不跳版）；
  新建白板的初始标题统一为「未命名白板」

**第十三轮（2026-10-16，入口增强：选择器搜索 / 清空最近 / 保存副本）**

- **「打开白板…」选择器重做**：加文件名搜索框（中文 IME 守卫 + 120ms 防抖，与选文档框同一
  手感）、每行带修改时间（今天/昨天说人话，跨年补年份）、已在页签里打开的白板标「已打开」
  角标；点已打开的项走原打开链路的去重逻辑直接聚焦，不重复开页签。列表数据一次读好
  （readDir 自带 `updated`），过滤纯内存完成，不边打边查
- **最近菜单可清空**：顶栏图标右键的「最近打开」下新增「清空最近记录」（只动记录不碰
  文件）；每条悬停可见工作空间内的完整路径，不同目录的同名文件可辨
- **☰ 菜单新增「保存副本…」**：当前场景问个新名字落成一份新文件（不覆盖原文件、不产生
  .bak），页签随之切到副本，之后的保存/自动保存都写给副本——与「重命名」（同一个文件换名）
  互补的「另存为」语义

**第十四轮（2026-10-16，每帧成本：dock 刷新合帧 + 同值跳过）**

拖拽时 Excalidraw 的 `onChange` **每帧**回调，而这条回调原先会一路打到左 Dock 面板：
每次重写文件名与状态行的 textContent、遍历 10 个色板切 classList。画面本身也在同一根
主线程上渲染，所以手感发"粘"。本轮把这些无谓的 DOM 写从帧数里摘出来：

- **合帧**：宿主侧「活动画布」上报改为排队到 `requestAnimationFrame`，一帧内多次回调只刷
  一次（约 16ms，肉眼不成延迟）；排队期间页签关了也无妨（刷新句柄是可选链）
- **同值跳过**：面板刷新前先比状态（标题 / 背景色 / 脏 / 保存时刻），完全相同就整段不动 DOM。
  比较函数在零依赖的 `src/studio/dock-state.ts`，纯函数可被 node 直接断言
- **哪些仍立即刷**：脏状态翻转、页签注册/注销、关页签——这几条决定"面板显示哪块板、有没有
  未保存改动"，慢一帧就会被读成"没保存"，属于正确性而非手感
- **行为不变**：色板点击后仍显式刷一次；背景色是异步落到 appState 的，那一拍可能读到旧值，
  由下一帧的合帧刷新纠正（原先靠每帧刷新兜底，故没有改成"活动板没变就完全不刷"）

**第十五轮（2026-10-16，脏判定：场景指纹取代「收到过 onChange 就算脏」）**

原先只要收到过一次 Excalidraw 的 `onChange` 就把白板标记成"有未保存的改动"。可这条回调
覆盖的动作远比"改了内容"宽：平移画布、缩放、换工具、点色板、甚至**打开一张没动过的白板**
都会回调。后果不只是页签上亮个假脏点——自动保存（定时/失焦）会跟着跑一整套
`exportToSvg` + 写文件 + 生成 `.bak` + 写设置，全是在用户没改任何东西时发生的。

- **判据换成指纹比较**：当前场景指纹 ≠ 落盘（或刚打开）那份的指纹才算脏。指纹三部分组成——
  元素（vendor 的 `hashElementsVersion`，读版本号）、图片集合（id + 字节数 + 类型）、
  内嵌 scene 会记住的那四个画布偏好（背景色 + 网格三项）。纯函数在零依赖的
  `src/studio/scene-dirty.ts`，node 直接断言
- **不落盘的状态不进指纹**：`currentItemStrokeColor` 那类工具栏选项改了也不会写进文件，
  进指纹就等于回到"换个颜色也变脏"
- **基线取 vendor 现场场景**，不是传进来的 `initial`：`restore` 会补齐默认 appState、
  `repairBindings` 会动元素版本号，拿未经归一的那份比，"打开没动"第一帧就被判成脏
- **每帧成本为零**：指纹只在"当前干净"时计算，一脏就不再算（脏态本不需要知道改了哪一点）。
  所以拖拽期间没有任何新增开销，只有松手后第一次真改动会算一次
- **落盘后是"设基线 → 复算"**，不再硬清脏：导出是异步的，期间用户又画了几笔的话，
  复算会让它们继续显示未保存（旧代码在这里会把改动吞掉）。三条保存路径（⌘S / 自动保存 /
  保存副本）统一走这一个收口
- **已知代价**：脏了之后不会自动回落——`⌘Z` 一路撤回存盘时的内容，页签仍显示"有未保存的
  改动"，因为它每帧都得重算指纹才能知道撤干净了，那正是本轮要避开的开销。多存一次无害

**第十六轮（2026-10-16，思源文档卡）**

往画布上放"思源文档的卡片"：拖、贴、选三种方式建卡，卡片带文档标题，点卡片上的链接徽标
直接打开那篇文档。

- **三个建卡入口**
  - **拖文档进画布**：从思源文件树（或编辑器里的文档引用）拖一篇文档到画布 → 在落点建卡
    （走思源的 `application/siyuan-file` 拖拽载荷，逗号分隔可多选、多张按 26px 错开叠放）
  - **粘贴文档链接**：复制文档引用（`siyuan://blocks/<id>`）后 `⌘V` → 在视口中心建卡；
    粘贴纯文本、在画布内编辑文字（textarea）时不受影响，仍由 Excalidraw 自己处理
  - **菜单入口**：☰「插入文档卡…」或 dock「操作 → 插入文档卡…」→ 选文档框（同保存框的
    搜索 + 最近列表）→ 建卡
- **卡片形态**：260 定宽矩形 + 自适应圆角（`roundness: {type: 3}`，与手绘矩形同语形）+ 文档
  标题作 label（16px、按宽度换行、高度自适应）；骨架由零依赖的 `src/studio/doc-card.ts`
  产出（`parseSiyuanUrl` / `docIdsFromDrop` / `docCardSkeletons`，node 直接真测），交给
  vendor 的 `convertToExcalidrawElements(..., { regenerateIds: true })` 转成真元素
- **点徽标打开文档**：卡片 `link = siyuan://blocks/<docId>` → Excalidraw 悬停时左上角出现
  链形徽标 → `onLinkOpen` 拦截（只拦 siyuan 链接，外链保持 vendor 默认）→ 宿主 `openTab`
  打开文档。**不做双击打开**——画布上的双击被 vendor 原生"编辑文字"占用
- **标题经 SQL 解析**：`resolveDocs` 两步批量查询（块 id → root_id → 文档标题），
  查不到（已删/无效 id）→ 提示「未找到该文档」、不建卡；多张建卡提示「已插入 {n} 张文档卡」，
  单张提示「已插入《{title}》」
- **边界**：卡片只是"带链接的矩形 + 标题文字"，不会随文档改名/删除而更新（标题是建卡时快照）；
  摘要行、标题跟随刷新、反向打标（往文档属性里记"被哪张白板引用"）、深链 `siyuan://plugins/…`
  均不在本轮

**第十七轮（2026-10-16，白板即文档：批1 建档 + 批2 白板库 + 批3 自动开板/菜单注入 + 批4 复制引用/体检）**

形态 1 落地：每张已保存的白板对应**一篇思源文档**（H1 标题 + 图片块）+ 一个 `assets/excali-*.svg`
工程文件，用块属性 `custom-excali-svg` 绑定。显示名=文档标题（可改可反链可搜索），
SVG 文件名永不改（工程文件身份稳定）。方案先在交互 demo 里走过一遍再动插件代码。

- **批1 首次保存建档**（`saveSvg`）：无路径的首次保存先 `createDocWithMd` 建档（落点=设置
  「白板文档目录」，标题=文件名剥掉 `.svg`），再写 SVG、追图片块、绑属性；查不到当前笔记本
  回落第一个笔记本，建档/绑定任何一步失败都**降级为只存 SVG**（老行为），不崩保存流程。
  页签会话数据带 `docId`（layout.json 可持久化）；文档标题与文件名同源只算一次时间戳，
  免得跨秒生出《…120100》配 `…120059.svg` 的错位
- **批2 dock 白板库**：dock 底部常显「白板库」区——SQL JOIN attributes 列所有白板文档
  （标题、`boardTimeText` 时间、引用数、绑定 SVG 名，tooltip 给 hpath），搜索按标题子串、
  带「已打开」徽标；**单击开画板**（走 openStudioTab 去重）、**双击开文档本体**。
  保存目录里没被任何文档绑定的 SVG 列进「未收编 N 个」页脚，点「收编」一步建档+绑定+开板。
  列表数据全在宿主缓存（`boardDocs`/`looseBoards`/`boardSvgByDocId`），面板只认
  `DockHost.getBoardLib()` 窄接口；同值跳过用 `libViewKey` 指纹（打开态进指纹），
  且 `refresh()` 先刷库再走状态早退——状态同值不能挡住库更新（dock 收起期脏点丢失的同款坑）。
  新建文档**手工记账进缓存**不等 SQL（内核索引有延迟，即时反查会闪出又消失），⟳ 手动全量重同步
- **批3 自动开画板 + 菜单注入**：`switch-protyle` 切到白板文档自动开对应画板页签，三条守卫：
  ①设置「打开白板文档时自动进入画板」总开关；②每会话每文档只自动开一次（**先占位**，
  查询失败/非白板也不再重来；属性现查一次后写 `boardSvgByDocId` 负缓存）；
  ③openStudioTab 自身去重，已开只聚焦。文档树右键（`open-menu-doctree`）与文件页签右键
  （`open-menu-filetab`）对白板文档加「在画板中打开」——菜单项必须同步建，所以只查缓存；
  doctree 判型走元素属性 `data-type==="navigation-file"`+`data-node-id`（`detail.type` 不可靠，
  re-todo B94 的教训），filetab 不在 siyuan.d.ts 类型里、照 reword 先例强转并整体 try/catch
- **纯逻辑分层**：时间戳解析（内核 `updated` 是 yyyymmddHHMMSS 整数不是毫秒）、引用数
  （refs JSON 按去重 root_id 计）、未收编划分、建档落点、库指纹全在零依赖
  `src/studio/board-lib.ts`，node 测试真断言（`test/board-lib.test.mjs`）
- **重命名同步**：`renameBoard` 改文件后把绑定旧路径的文档属性一起搬到新引用，
  失败只留日志（文件已改名成功，不能回滚），随后全量重同步库
- **批4A 复制白板引用**：dock 库行**右键** → 宿主 `siyuan Menu` 两项——「复制嵌入引用」
  （`![[块ID]]`，内核事实：块嵌入**不支持自定义显示文本**，demo 里 `![[id "标题"]]` 是假口径）与
  「复制行内引用」（`((块ID "标题"))`，别名先剥引号/换行再压空白）。☰ 里对应「复制此白板的引用」
  （复制嵌入形式；docId 先取页签数据、旧会话恢复的页签按 svg 反查库缓存；未建档只提示不动作）。
  引用文本纯函数 `embedRef/inlineRef` 在 board-lib 真断言；菜单与剪贴板全在宿主
  （dock 面板零 siyuan import 的断言不破），`navigator.clipboard` 失败回落 `execCommand("copy")`（reword 先例）。
- **批4B 白板体检**（设置页按钮）：先全量刷库，再查两件事——**断链文档**（`custom-excali-svg`
  绑的 SVG 已不存在，逐个 `getFile` 判存在性）与**孤儿 SVG**（保存目录里没被任何文档收编的）。
  Dialog 只读报告（行=标题+svg 名，tooltip=完整路径），收编入口指回 dock 库页脚；`checkupRunning`
  防重入，连点只跑一轮。边界：思源没有「删除文档前」钩子，拦不住删文档，只能靠体检找孤儿。
- **未做（批4 范围外，待指令）**：⌘/ 命令面板入口（只记录不实现）

**第十八轮（2026-10-17，Dock 白板库主体化 + 文档树弱化）**

形态反转：白板的第一性身份从「文档」改回「文件」。参考 kmind-zen 的 dock 列表
（面板主体、头部 －＋⟳）与 Obsidian Excalidraw 的文件树（点文件即进画布）后定的方向：
dock 白板库是唯一主入口，文档树降级为**可选存档层**（要反链/搜索时才建档）。
用户痛点驱动：白板文档自动建进 `/Excali 白板/` 会污染精心整理的文档树。

- **dock 面板重构**（`src/siyuan/ExcaliDock.ts` 重写）：白板库提为面板主体——
  顶部常驻「白板库 (N)」+ ＋新建 / －删除 / ⟳刷新 + 搜索框 + 文件列表（flex:1 自滚）；
  当前画布操作区（文件名/状态行/背景色板/保存等）降为下方区块，有活动画布才显示；
  底部一条 footer 常驻运行脚本…/设置/帮助。面板自己不再整块滚（列表 internal 滚）
- **库列表按文件列**（`toBoardFileItems`，board-lib 纯函数）：`listBoardEntries(saveDir)`
  列全部 SVG，`listBoardDocs()` 的 SQL 结果只用来给文件配「已建档」徽标与右键动作；
  「未收编 N 个」页脚与「收编」概念取消（建档 = 行右键一个动作 `adoptBoardFile`，
  不再自动开画板）；行显示名 = 文档标题（已建档）或剥后缀文件名
- **＋新建**：开空白板（空画板「存不下盘」守卫保留——画了内容 ⌘S 后才进列表，
  这是防污染设计，不与 kmind-zen「新建即见」对齐）
- **－删除**（`deleteBoardFile`）：确认框列清删什么（`deletePlanOf` 纯函数：
  文件 + .bak + 绑定文档）→ **先关页签再删文件**（`closeForDelete` 不等冲刷，
  否则 dispose 的 flush 会把场景写回即将删除的文件，制造竞态）→ removeFile /
  removeDoc → 缓存出账。dock 头部「－」只对当前活动画布生效，无活动画布时置灰
- **行右键菜单**（宿主 `openFileMenu`，siyuan Menu）：在画板中打开 / 建档（未建档时）/
  打开存档文档 + 复制嵌入/行内引用（已建档时）/ 重命名（`renameFromDock`，
  改名后 `applyRenameToSession` 让开着的页签 data/标题跟位）/ 删除…
- **建档门控**：新设置「首次保存时自动建档」**默认关**——saveSvg 不再自动
  createDocWithMd，首存只写 SVG，文档树零痕迹；「打开白板文档时自动进入画板」
  默认也改**关**（切文档安安静静看文档）。两个开关设置项都保留，老用户存过的值优先
- **体检瘦身**：只报断链文档（绑定的 SVG 已不存在）；「孤儿 SVG」项取消——
  文件即白板，未建档是正常状态不是问题
- 连带：`removeDoc` 封装进 doc.ts；`closeForDelete` 进 StudioTabSession；
  旧纯函数（partitionLoose / filterBoardDocs / libViewKey）与「收编」系文案全部删除；
  board-lib.test 重写（文件绑定/显示名/过滤/指纹/删除计划 + 门控/删除/菜单接线）

**第十九轮（2026-10-17，BAK 纪律 + 恢复入口 + 自动保存避让 + 重名避重——移植 Obsidian Excalidraw 的可靠性工程）**

> 第五十四轮把这一轮的**写侧**（滚 `.bak` 三份）整体退役了，读侧（列表排除、恢复入口、
> 改名搬链、删除扫档）留着收拾存量。下面这段是按当时口径写的历史记录。

对标调研（保存管线/BAK 语义/避让清单/失败可见）后拍板的移植子集：**不做覆盖确认**（Obsidian 也没有，
安全性来自备份纪律而非弹窗）、**不抄外部修改同步**（思源没有文件外部改动事件）、
**尾随补存不抄**（`applySavedBaseline` 的「先设基线再复算」已等价覆盖它的 revision 账本语义）。

- **备份滚动三份**：`.bak` 从单格改成链——`<名>.svg.bak.svg`（槽 1，**沿用旧名**，存量备份直接归进
  新链条）/ `.bak2` / `.bak3`（`BACKUP_KEEP=3`）。`writeBackup` 从旧档往新档挪再写槽 1；
  **空/坏内容不入链**（`hasNonEmptyScene` 门，对齐 Obsidian 的 `hasNonDeletedElements`）——
  BAK 恒等于「最后一次有效保存」，误操作最多回退三版
- **备份档不进列表**：`listBoardEntries` 排除 `*.bak*.svg`（`isBackupPath`），否则滚动档会把白板库灌满；
  重命名时 `renameSvg` 把整条备份链跟着搬（改名留旧名孤档 = 看不见也删不掉）；
  `deletePlanOf` 列全三档，删除逐档 best-effort
- **恢复入口**：解码失败页加「从备份恢复」按钮 → 宿主 `restoreFromBackup` 按链**新→旧逐档验内容**
  后盖回原文件（坏备份也滚动得进来，拿到不等于能用），成功重走页签同一条 `open()` 不用关页签重开；
  全链没有可用档提示「没有找到可用的备份」
- **flush 两道避让闸 + 失败可见**：空画板不冲刷（清板也会脏，冲下去就是把好文件写成空的，
  与 saveFlow 的手动空拦同一条门）；`editingTextElement || newElement`（正画一笔/编辑文字）跳过本轮——
  此刻快照是半成品，导出还可能打断输入。两道闸都只 `return false` 保持脏态，等下一轮定时/失焦；
  自动保存失败从 console 升级成 toast（后台静默保存失败不提示等于悄悄丢数据）
- **重名避重（D·列表细节）**：首次保存/另存为/改名时目标名撞了**别的白板**，不再静默覆盖——
  按 Obsidian `getNewUniqueFilepath` 语义逐档探存在性，生成 `名_0.svg`、`名_1.svg`…（备份槽不占位，
  改名撞自己不算撞、原样早退）。覆盖已打开的同一个文件不受影响（盖自己正是要的）；
  避重后的最终文件名同时喂给文档标题推导，标题与文件名照旧成对
- 纯函数进 storage/scene-codec 真断言（滚动命名、链条、`.bak` 判据、`hasNonEmptyScene`），
  宿主/页签/画板接线照惯例文本扫描（smoke-wiring / board-lib / smoke-artifact 产物字面量）

**第二十轮（2026-10-17，白板 = 文件：保存即入库 + dock 纯库化 + 三条「插进文档」功能链删除）**

用户看完第十八轮成品后提的方向：白板的第一性身份既然是文件，就不该再在保存前问「插进哪篇
文档」。对标 Obsidian Excalidraw「保存即落文件、点文件再进画布」的闭环，但文件列表放在
思源**独立的 Dock 白板库**里，与文档树彻底分开（这正是当初选 kmind-zen 路线的原因）。

- **「保存到文档…」整条删除**：☰ 菜单项、选文档框（`src/siyuan/doc-picker.ts` 整文件
  205 行，与文档卡共用）、`saveFlow` 里的选文档 / 追加图片块分支全部移除；
  「保存」只剩两种形态——首存问文件名、已存过静默覆盖
- **「插入文档卡…」整条删除**（用户拍板连同两个隐性入口一并删）：☰ 菜单项、
  `src/studio/doc-card.ts` 纯函数（106 行）、粘贴 `siyuan://` 链接成卡、从文档树拖文档
  成卡、`onLinkOpen` 的 siyuan 链接拦截、`resolveDocs` 两步 SQL 一并移除；画布回到纯白板
  语义（拖进来的文档不再被接管）
- **「插入到当前文档」删除**（用户拍板）：dock 操作组该项、宿主 `insertToActiveDoc`、
  `doc.ts` 的 `docHasAsset` 清除。要「文档形态」（反链/搜索）走**存档层**——dock 行右键
  「建档」把文件收编成一篇文档，那是可选的额外动作，不再是保存的一部分
- **保存即入库闭环**（E 组）：`saveSvg` 落盘后 `rememberBoardFile` 直接把新文件补进 dock
  库缓存（不等全量刷新，libLoading 在途时列表也已立即可见），再 `refreshBoardLib` 对齐
  updated 等真实数据——「保存 → 库里立即可见 → 点条目再次进入继续作画」一步到位；
  覆盖保存时项已在缓存里，这里是空操作
- **dock 纯库化**（A 组）：第十八轮下方那块画布操作区（文件名/状态行/背景色板/保存等
  按钮组）与 footer（运行脚本…/设置/帮助）**整块删除**，面板只剩「白板库 (N)」头部
  （＋新建 / －删除 / ⟳刷新）+ 搜索 + flex:1 自滚的文件列表。连带退役：第十四轮的合帧
  （`scheduleDockRefresh`）与同值跳过（`src/studio/dock-state.ts` 整文件）——没有每帧
  呈现的内容就不需要每帧路径；`onBoardDirty` 脏翻转通道与 dock 的 `getStatus` 一并删除。
  「－删除」新增置灰态（`hasActiveBoard`，只随开关页签的结构事件变）
- **☰ 菜单收尾**：自绘项 9 → 8——删「保存到文档…」「插入文档卡…」，加「帮助」（原 dock
  footer 的快捷键速查表；设置维持在顶栏图标右键菜单，用户拍板不动）
- **接口瘦身**：`BoardActions` 12 → 3 方法（save 留给 ea 脚本 / getEaHandle 给脚本引擎 /
  flush 关页签前冲刷）；`DockHost` 随画布动作族离去瘦身到 9 个方法；ea API 删
  `saveToDoc`/`insertToActiveDoc`（save 保留为脚本保存通道）；`StudioTabHost` 的 Pick
  删 6 键、加 `onHelp`
- 删除的文件：`src/siyuan/doc-picker.ts`、`src/studio/doc-card.ts`、
  `src/studio/dock-state.ts`、`test/doc-card.test.mjs`
- 引导画面文案跟着改口径：「画几笔，保存时再决定存进哪篇文档」→「画几笔，保存后从白板库
  随时接着画」；i18n 双文件各 147 键（删 33 个死键、补 1 个漏键）；17 个测试文件全绿

**第二十一轮（2026-10-17，文件先行 + 防抖自动保存：对齐 Obsidian Excalidraw 的创建体验）**

- **新建 = 文件先行**（用户拍板的起点：「点 ＋ 就在库里落下文件然后进画布，不要主动保存」）：
  `openNew()` 改为弹命名框（默认「未命名白板」，取消 = 无操作）→ `createBoardFile()`
  sanitize + `uniqueTargetPath` 避重 → `putSvg` 落一份**空 scene** 的 SVG →
  `rememberBoardFile` + `refreshBoardLib` 即时进库 → `openStudioTab(path)` 带着路径开页签。
  三个入口（顶栏/斜杠/命令）+ dock「＋」+ 引导画面「新建白板」全走这一条
- **空 scene 合法化**（`scene-codec.ts`）：`elements` 显式空数组按合法空画板解出，
  键缺失/非数组才判 `bad-payload`；`empty-scene` fail reason、tab.tsx 的 case、
  i18n 键「这个白板是空的」一并删除——刚建没画、清空后没再画的白板点开都是正常空画板
- **防抖自动保存**（`StudioApp.tsx`）：`handleChange` 每次回调重置 1 秒定时器
  （拖拽每帧刷 = 松手才落盘），触发走既有 `flush` 通道（导出 → 覆盖 → 基线复算的
  竞态处理都是现成的）；`⌘S` 改为直接 `flush`（跳过防抖的强制落盘）；失焦/页签隐藏
  立即冲刷；**60s 定时退役**；卸载清定时器。第十九轮的两道避让闸保留（空场景不落盘、
  画一笔/编辑文字中不落盘）——清板不会把好文件写成空的
- **保存心智整个删除**：☰ 菜单删「保存」「保存副本…」（自绘项 8 → 6），
  `saveFlow`/`saveAsFlow` 删除，`BoardActions` 3 → 2 方法（`save` 删；ea 脚本
  `ea.save()` 语义改为「立即冲刷落盘」），`saveSvg` 瘦身为纯覆盖保存（首存/建档职责
  移入 `createBoardFile`），`autoSave` 设置项删除（关掉它 = 没有任何保存入口 = 丢数据陷阱，
  自动保存成为唯一形态）；`tab.tsx` 关页签去掉 autoSave 分支——有改动一律先冲刷再关
- **建档语义迁移**：「首次保存时自动建档」→「新建时自动建档」（`autoCreateDoc` 开着时
  创建即建档，`adoptBoardFile` 改为返回 docId 供页签 data 落库，dock 行右键「建档」共用）
- 删除的键与文件：i18n 删 12 个死键（保存系/保存副本系/自动保存设置项/空板提示等）、
  pop 4 个改口径的键、补 4 个新键，双文件各 137 键；无文件删除
- 17 个测试文件全绿（menu 八项→六项、dock-refresh 改创建即入库、scene-dirty 改唯一落盘
  路径、smoke-wiring 新增「新建链路」与「防抖自动保存」两组契约）；tsc 过、build 过
  （index.js 8.4 MB / index.css 148.1 KB）

**第二十二轮（2026-10-17，Dock 面板复刻 KMind Zen 原生形态：用户拍板「这个样式不好看，照它复刻」）**

- **形态整个换成思源原生类**（对照装机插件 `siyuan-kmind-zen` 的 dock 面板逐行比对）：
  头部 = `block__icons`（`block__logo` 标题 + 数量 + `block__icon--show` 图标按钮），
  列表 = `b3-list--background` + `b3-list-item--narrow`（通铺行）+ `b3-list-item--hide-action`
  （行内动作悬停才显）；不再有自绘头部、文字按钮（＋/－/⟳）和两行排版
- **图标走全局精灵**：`<use xlink:href="#iconAdd / #iconTrashcan / #iconRefresh / #iconEdit">`
  （与 kmind-zen 同款，不自带 SVG）；tooltip 穿原生 `ariaLabel` / `b3-tooltips` 通道
- **搜索框按用户拍板删除**（纯复刻：kmind-zen 也没有）：查询词状态、board-lib 的内存
  过滤函数、i18n 键「搜索白板…」一并退役，「没有匹配」分支消失（选择器「打开白板…」
  自带的搜索不动）；库里找人靠滚动或思源全局搜索
- **行内悬停动作**：重命名 / 删除… 两个按钮（复用右键菜单同两条宿主链路，
  `DockHost` 加 `renameBoardFile` / `deleteBoardFile` 窄接口）；点击路由改为先认按钮
  再落行——否则点行内按钮会顺手把画板也开了。右键菜单本身不动（建档/开文档/复制引用还在）
- 删的与改的：CSS 删旧 dock 自绘段（libhead/libtitle/libtools/search/两行排版），
  i18n 双文件各 136 键；17 个测试文件全绿（dock/board-lib/smoke-wiring/smoke-artifact
  四组契约改原生结构断言）；tsc 过、build 过

**第二十三轮（2026-10-17，dock 行排版对齐 KMind Zen：文字不再贴左缘）**

- 用户目检对比截图拍板：白板库行文字比 kmind-zen 的列表贴左、字号也不对。根因两处——
  行穿 `b3-list-item--narrow` 通铺（左缘零内缩），且行标题是 `<button>`（UA 默认字体/边距，
  不随面板字体）。修法照抄 kmind-zen 的行参数：`.exs-lib__item.b3-list-item` 给
  `min-height:32px` + `margin:1px 6px` + `padding:2px 4px 2px 8px` + 原生圆角变量
  （行缩进成圆角卡片，hover 底色离面板边缘留缝，文字左缘与头部 `block__icons` 的 8px 同档）；
  `.exs-lib__text.b3-list-item__text` 重置 `font:inherit`、去按钮边框底色、28px 行高 + 省略号
- 只动 CSS 不动 markup（`--narrow` 类留着，被更高优先级的行规则有意盖过）；
  smoke-artifact 补两条产物断言（行缩进参数、标题字体重置）

**第二十四轮（2026-10-17，重启后白板从库里「消失」：根因修复 + 库登记制）**

- 症状：退出重进思源，白板库里之前的板**一条不剩**（文件还在 assets 里，是显示层丢）。
  真机日志 `temp/siyuan.log` 实锤：`sql query … failed: no such column: b.refs`（×19）——
  `listBoardDocs` 的 SELECT 带了本内核（3.6.x）blocks 表**不存在的 refs 列**，整条 SQL 每次都抛；
  而 `refreshBoardLib` 把 SQL 放在外层 try 里，一抛就跳过整段刷新 → `boardFiles` 永远停在
  「内存里 rememberBoardFile 补的那一项」，重启后内存清空 → 库空
- 修法①：SELECT 去掉 `b.refs`（反链数当前 UI 不用，`toBoardDocItem` 缺输入自然归 0）；
  产物测试加**回归锁**：`index.js` 里出现 `b.refs` 即失败
- 修法②（容错分层）：SQL 与 readDir **各自** try/catch——SQL 挂沿用上一次绑定（只缺徽标）、
  readDir 挂保留上一次列表，两段互不牵连；`libLoading` 防重入标志恢复「整轮结束才复位」
- 修法③（库登记制，对齐 KMind Zen「列表永远从 disk 真源重建」的思路）：data.json 新增
  `boards` 路径表——新建/覆盖保存/建档登记、删除注销、改名搬表；刷新时库 =**登记表 ∩ 磁盘
  .svg**。顺带治了「磁盘扫描把 assets 里 drawio/图标/别的 excalidraw 插件导出的 90 个 svg
  全灌进库」的隐患：外来文件不进库，但「打开白板…」照旧能手动打开，保存即登记
- 升级迁移：老 data.json 没有 `boards` 字段 → 用「最近打开」里的 .svg 播种；另外存档文档
  绑定的 svg 在每次刷新时自动补进表（登记表丢了也能从文档侧自愈）。归档只影响「已建档」
  徽标，不再有权清空文件列表

**第二十五轮（2026-10-17，白板专属目录 `assets/excali`：磁盘即库，退役登记表）**

- 动机：第二十四轮的 `boards` 登记表治了「重启丢板」，但仍是一层需要维护的第二真源
  （表丢了靠文档侧自愈；从外部拷进来/移走的文件不会自动同步）。参考 kmind-zen 改成
  **专属目录 = 库**：默认保存目录改为 `assets/excali`，白板库只列这个目录里的 `.svg`，
  磁盘就是唯一真源；把外来 svg 拷进这个目录即入库，拷走即出库
- 为什么不能直接拿 `assets` 根当库：里面混着 drawio/图标/别的 excalidraw 插件导出的
  90 个 svg，其中不少同样带 `svg-source:excalidraw` 标记，按内容扫描必然误收；建档用的
  `/assets/**` 图片块又要求文件必须留在 assets 下，所以选「assets 下的专属子目录」而不是
  petal 存储
- 一次性迁移（`dirMigrated` 落盘）：启动时从四类**可信来源**收集候选——最近打开、旧
  `boards` 登记表、文档绑定 `custom-excali-svg`、自动命名 `excali-YYYYMMDD-HHMMSS.svg`；
  只收 `assets` 根目录的直接子文件，跳过 `.bak*` 与非 svg，逐个搬进 `assets/excali`
  （重名照旧 `_0/_1` 避重，三档备份跟着主文件走）；随后把 recent、文档属性、页签会话里的
  旧路径一并 remap，形状库 `excali-library.json` 也搬家。全部成功才置 `dirMigrated=true`，
  有失败下次启动重试（已搬走的不再是候选）；用户自定义了别的保存目录则完全不碰旧文件
- 正文引用同步：搬家/改名（含手动「另存为」）会重写文档里指向旧 `assets/...svg` 的图片块
  （`getBlockKramdown` → `updateBlock`；SQL LIKE 对 `% _ \` 转义），归档文档不裂图
- 恢复布局的旧页签：会话里存着迁移前路径、读盘失败时，宿主按同名文件到 `settings.saveDir`
  再找一次，命中就更新页签标题与会话路径，不弹「文件不存在」
- 退役 `boardRegistry` / `boards` 持久化与登记/注销/搬表钩子：`listBoardEntries(saveDir)`
  成为库的唯一输入，SQL 只负责补「已建档」徽标；第二十四轮的「无 `b.refs` + 容错分层」
  原样保留（SQL 挂只缺徽标，扫描挂保留旧列表）

**第二十六轮（2026-10-17，Apple UI 第一批：强调色 token + 菜单层）**

- 前提结论：画板 UI 的紫色是 Excalidraw 自己的品牌色（vendor `--color-primary`
  `#6965db` / 暗色 `#a8a5ff`），既不是思源主题色也不是本插件写入——所以**不改 vendor
  的 `--color-primary`**（它同时管选中态、取色器、协作光标），只把菜单层收进插件 token，
  继续以紫色作品牌强调，Apple 化的是材质、字号、圆角与灰阶悬停
- `src/index.css` 新增 `.exs-root` 下的 `--exs-accent*`（主色/悬停/浅容器/容器前景/浅底/
  前景色）、`--exs-focus-ring`、`--exs-menu-*`（实色回落 + 半透明材质、描边、双层阴影）、
  `--exs-text(-secondary)` / `--exs-hover(-strong)` / `--exs-separator` / `--exs-danger*`、
  `--exs-font-ui`，浅/深各一套；`--focus-highlight-color` 桥到 `--exs-accent`
- 右键菜单：12px 圆角、5px 内边距、30px 行高、13px 字号、6px 行圆角、**灰阶悬停**
  （不再整行反紫）、11px 次级色快捷键、勾选标记挪到 28px 文本缩进并用强调色、
  `0.5px` 内缩发丝分隔线、120ms 浮现
- ☰ 主菜单/下拉：同套 Island 材质（`backdrop-filter: blur(20px) saturate(180%)`，无
  支持时回落实色）、组标题 11px/600、选中项走浅紫容器；vendor 的分隔线是无类名
  `<div style>`，用 `.dropdown-menu-container > div:not([class])` 改写为发丝线
- Tooltip 挂在 `document.body`（vendor 行为），选择器必须是 body 级：深色胶囊、
  12px/500、7px 圆角、细描边与柔阴影
- 焦点态：通用按钮/链接 `:focus-visible` 统一 2px 强调色环（`outline-offset: 2px`）；
  菜单行改用 inset 环，避免被全局规则盖掉。构建顺序仍是插件 CSS 在前、vendor 在后，
  所有覆盖靠 `.exs-root .excalidraw …` 提高特异性，不依赖先后
- `prefers-reduced-motion: reduce` 下关闭菜单浮现/悬停过渡；新增
  `test/apple-ui.test.mjs` 锁 token、产物选择器、vendor 前后顺序与减动效回退（19/19 绿）

**第二十六轮（2026-10-17，基础功能舒适化：图片外置 / 分包加载 / 双主题 / 点击即开 / 图形跳文档）**

对照 Obsidian Excalidraw 2.29.0 的调研结论（见 `scripts/bench-large-scene-baseline.json`
与工作区调研报告）落地五项 T 系任务，全部指向「用起来非常舒适」的底座：

- **T1 图片外置**：导入白板的图片不再以 dataURL 内嵌 scene（压测 50 张 40KB 图会把
  文件撑到 4.26 MB、保存顿 171ms），改为二进制落 `assets/excali-media/<sha1前16hex>.<ext>`
  内容寻址文件（同图自动去重），scene 载荷里只存 `{ id, mimeType, created, path }` 引用，
  打开时宿主读盘注水回 dataURL；旧内嵌白板照常打开，下一次保存自动外置。预览树与载荷
  **分离**：`exportToSvg` 不再让 vendor 内嵌 scene（`<image>` 预览照画），载荷由
  `scene-codec.encodeSvgPayload` 自编（与 vendor/excalidraw.com 格式同构，互认不破）
- **T3 分包加载**：构建从单文件改双单文件——主包 `index.js` 只剩插件壳（思源 API /
  dock / 白板库，**80 KB**），vendor 引擎进独立 `engine.js`（7.97 MB），首次开画板
  页签才 `require("./engine.js")`——插件启动不再解析 8MB 级代码（`scripts/build.mjs`
  两趟构建，vite.config.mts 退役）。开板页签先显示「正在打开白板…」占位
- **T4 双主题背景**：明/暗各存一份画布背景（载荷槽位），跟随思源主题切换（见「适配」）
- **T5 嵌入图点击即开**：文档里点白板嵌入图直接开画板页签（库登记同步判定，
  capture 监听，卸载摘除）
- **T6 图形跳文档**：`ea.setLink("selection", "siyuan:doc/<文档ID>")` 给图形写链接，
  画布上点击即开文档（`onLinkOpen` 拦 `siyuan:` 前缀，外链 vendor 自理）
- 压测基线入库：`scripts/bench-large-scene.mjs`（1000 元素 + 50 图：JSON 3.41 MB、
  编码 171ms、外置后 172KB 缩 96.1%）；i18n 双文件各 141 键；20 个测试文件全绿
  （新增 `media-ref.test.mjs`，`smoke-artifact` 全组改双产物断言，`build`/`dev`
  脚本改指 `scripts/build.mjs`）

**第二十八轮（2026-10-17，引擎装载修复 + Mermaid 转图元）**

- **修复真机打不开**：思源装载插件不是 Node 模块机制——`loader.ts` 把 index.js
  文本包进 `(function anonymous(require, module, exports){…})` 后 eval，插件里的
  `require` 是宿主注入的（`"siyuan"` → API，其余落 `window.require` 按宿主目录解析），
  `require("./engine.js")` 必炸 renderer_init。引擎装载改走 HTTP：fetch 插件根目录的
  engine.js 文本，用思源 loader 的**同款 anonymous 包装**执行，require 传插件作用域
  收到的那个（见 `index.ts loadEngineModule`）
- **Mermaid 转图元**：☰ 菜单新增「Mermaid 转图元…」——打开 vendor 自带的
  `TTDDialog`（`__fallback` 形态 = 只挂 Mermaid 页，不带要接生成服务的 AI 页）。
  打开通道 `updateScene({appState:{openDialog:{name:"ttd",tab:"mermaid"}}})`
  （官方 `App.updateScene` 直写 setState、不做 restore 过滤）；插入由对话框内部走
  `addElementsFromPasteOrLibrary({position:"center"})`。零自绘对话框、引擎零新增体积
  （mermaid 转换库 vendor 本来就带着，之前只是没接线）；i18n 双文件各 142 键

**第二十九轮（2026-10-17，笔刷预设 + 本地化核查）**

- **笔刷**：☰ 新增「笔刷」组（0.18.1 的 MainMenu 没有 SubMenu，用 Group 平铺），
  六支预设从 `studio/pens.ts` 数据渲染（着色圆点图标 + 双语标签）：钢笔（黑）/
  红笔（批注）/ 蓝笔（批注）/ 铅笔（灰）/ 荧光笔（黄）/ 荧光笔（绿）。选笔即套
  样式四键（`currentItemStrokeColor/Width/Roughness/Opacity`）并立即切手绘工具。
  已知边界：EA 的 penOptions（perfect-freehand 压感参数）官方 appState 不暴露，
  这层不做（契约测试盯死不许假装支持）
- **TTDDialog 本地化核查**：vendor zh-CN 的 mermaid 组五键全覆盖（标题/插入/描述/
  语法/预览），`--check` 三项缺口均为 0——补丁脚本无需动
- **图片裁剪不需要移植**：查证 vendor 0.18.1 原生带 `cropEditor`（选中单图 →
  双击/Enter 进裁剪 → Enter/Esc 完成，zh 词条早前已补）；Obsidian 的 CropImage
  是另一回事（frame + mask 蒙版导出），不搬
- 踩坑记录：`setOpenDialog` 只在 `AppClassProperties`（内部接口）——imperative api
  对象**没装配**这个方法，0.18.1 运行时调不到，tsc 拦截后回退 `updateScene` 直写；
  i18n 双文件各 150 键

**第三十轮（2026-10-17，图形模板库：Library 持久层升级为多文件文件夹）**

对标 Obsidian StencilLibraryManager（设计照抄、代码自写，AGPL 只借不搬）：

- **存哪变了**：组件库从单文件 `<保存目录>/excali-library.json` 升级为
  `<保存目录>/excali-libraries/` 下**多个 `.excalidrawlib` 文件**——模板变成普通
  文件：随思源多端同步、按主题拆库（流程图/UI 组件…）、丢一个库文件进文件夹
  （思源资源面板上传即可）就装好一套模板包
- **加载**：合并文件夹全部库文件——本地文件 `local.excalidrawlib` 优先、
  按 id 去重、外部文件的条目标 `published`（语义 = 共享来的）；单个坏档跳过不拖垮整库
- **保存**：面板里增删改后按 id diff，**写回各自的源文件**（新增落本地库，
  清空的库文件自动删除）——纯逻辑全在 `studio/stencil.ts`（解析/合并/diff 计划，
  宿主只做读写搬运），`test/stencil.test.mjs` 8 条单测盯死语义
- **迁移**：首次加载组件库时把旧 `excali-library.json` 内容写进
  `excali-libraries/local.excalidrawlib`（旧文件保留兜底，一次性，设置键
  `stencilMigrated` 标记）；UI 零新增——Library 面板照常用
- i18n 双文件各 152 键；21 个测试文件全绿（新增 `stencil.test.mjs`）

**第三十一轮（2026-10-17，画布内嵌思源块/文档）**

对标 siyuan-embed-excalidraw 的嵌入页机制（只借设计不抄代码，AGPL 纪律），
机制与 Obsidian Excalidraw 的 transclusion 同路（vendor 0.18.1 原生 Embeddable）：

- **入口**：☰ 菜单「嵌入思源块…」→ 粘贴 `siyuan://blocks/<id>` 整链 / 裸块 ID /
  带标注文本（按思源块 ID 形状 `14位时间-7位随机` 提取，`studio/embeddable.ts`）→
  视口中心落一个 **600×420 Embeddable 元素**并选中（手工构造全字段，vendor 的
  `newEmbeddableElement` 只在内部路径导出，与 `makeImageElement` 同一局面）
- **渲染通道升级**：iframe 页与内核同源，直接 `fetch /api/block/getBlockDOM` 拿
  **思源内核原生渲染的块 HTML**（Lute 渲染，质量与正文一致）——比对标插件的
  「exportMdContent + Vditor 自渲染」少 4MB 级静态资产，本插件零渲染依赖零打包
- **渲染页**：`src-embed/siyuan/index.html` 自包含单文件（build 时 copy-dist 拷到
  `embed/siyuan/`、pack 进发布包）——加载/错误态、右上角悬浮按钮（刷新 /
  在思源中打开 `siyuan://blocks/<id>`）、`assets/` 相对路径修正、明暗配色
  （link 带创建当时的画布主题，切换主题后重开画布生效）
- **安全**：`validateEmbeddable` prop 放行本插件 `embed/` 目录 + 普通 http(s) 网页
  （Embeddable 标准用法），其余协议（`javascript:`、`data:` 等）拒绝
- 已知边界：嵌入是快照视图（画布里不能改思源块内容，点「在思源中打开」跳出）；
  块删除后 iframe 显示读取失败；iframe 主题不随画布实时切换
- i18n 双文件各 156 键；22 个测试文件全绿（新增 `embeddable.test.mjs`）

**第三十二轮（2026-10-17，EaApi 补齐 + 内置脚本扩容）**

对标 ExcalidrawAutomate 全集（130+ 成员逐个核对，分「补/缓/不做」三档，不做社区
脚本库——按拍板只内置脚本）：

- **EaApi 34 → 45 方法**，全部走既有分层（board handle / api / host）：
  - 选中与布局：`getSelectedElements`、`getBoundingBox`（含旋转四角）、
    `setPosition`/`moveBy`（布局脚本原语）
  - **`connectObjects(id1, side1, id2, side2, padding?)`**：图形绑定连接（EA 生态
    最高频能力）——写 startBinding/endBinding + 维护两端 boundElements，side 支持
    top/bottom/left/right/**auto**（几何最近侧）；拖动图形箭头跟随
  - `group`/`unGroup`（v1 单组不嵌套）、`toFront`/`toBack`（交换分数 index 的等价
    操作，vendor 的 generateKeyBetween 不可 import，任意插位留 v2）
  - `measureText`/`wrapText`（与元素工厂同一中文 1/英文 0.56 字宽口径）
  - `addEmbeddable`（复用第三十一轮 embeddable.ts，脚本可嵌思源块/网页）
  - `getTheme`/`setTheme`（画布明暗读写，StudioApp 的 React 状态经 ThemeControl 传入句柄）
  - **`ea.siyuan.call(api, data)`**：思源内核 API **只读门面**（对标 ea.obsidian 的
    思源替代物）——宿主白名单只放行读类接口（getBlockKramdown/getBlockDOM/
    getBlockAttrs/query/sql/getFile 等），写类一律抛错
- **修复绑定文字**：`addRect({text})` 等图形带文字的口径此前被元素工厂忽略
  （表格/思维导图脚本会画出没字的格子）——handle.addElements 现拆成图形 +
  containerId 绑定文本（vendor 标准 bound text 形状），旧内置脚本自动受益
- **内置脚本 4 → 9 个**（首个启用自动安装缺失的；已装过的不覆盖用户改动）：
  对齐与分布（自适应对齐/等距）、序号标注（红框+①②③）、智能连线（选中两个
  图形按最近侧绑定连线）、任务清单→三列看板、导出分步图（按选中顺序逐张
  导出 step-N.png）、思维导图 v2（connectObjects 绑定连线替换手工折线）
- 明确不做（记录决策）：社区脚本库在线安装、ea.obsidian/PDF/YouTube、布尔运算、
  AI、事件钩子、CLI（理由见设计报告）
- i18n 无新增键；22 个测试文件全绿（`ea-script.test.mjs` 增 4 组：几何纯函数/
  wrapText/mock handle 走通全部新出口/内置脚本消费面静态检查）

**第三十三轮（2026-10-18，笔刷迁至画布右上角 + 真机修复）**

- **真机修复**：`ea.notify is not a function`——createEaApi 组装时漏挂宿主
  notify（接口也没声明），所有带提示的内置脚本真机必炸；已接线并加源码契约
  回归测试（单测 mock 手工带 notify 掩盖了漏挂，这类漏接线以后由契约盯）
- **笔刷预设落位迁移（用户拍板，对标 Obsidian Excalidraw custom pens）**：
  - 从 ☰ 菜单抽出，挂 vendor 原生 `renderTopRightUI` 扩展位 → 画布右上角
    常驻六枚色点按钮（`PenRail.tsx`），与 undo/redo 同层，一抬手就够到
  - 交互同 Obsidian：单击激活（切 freedraw + 套四键样式，圆点亮起）、
    **再点同一支复位默认笔**；tooltip 用笔名（双语键复用）
  - 激活态是 React state，圆点随亮灭；切换不再弹 toast（视觉反馈足够，
    Obsidian 同款无提示）；样式走 vendor 主题变量，明暗自适应
  - 菜单回归纯「文件与功能」入口；顺带改写历史契约：右上角只许挂笔刷条，
    旧自绘按钮层（exs-topright）仍禁回流
- i18n 双文件各 155 键（删「已切换笔刷」键）；22 个测试文件全绿
  （menu.test 计数 9→8、smoke-wiring 笔刷组改右上角条契约）

**第三十四轮（2026-10-18，表格脚本 v2：画布 Markdown 文本原地渲染）**

- 用户拍板：粘贴到画布的 Markdown 表格文本要**直接**变成渲染表格，不绕思源文档
- 「Markdown 表格 → 图表格」升级 v2（同名文件，已装副本需手动同步——不覆盖策略）：
  - **来源①（新）**：选中画布上含竖线的文本元素 → 原地（原文本坐标）生成
    渲染表格并**替换掉原文本**（可 Ctrl+Z 撤回）；来源②不变（当前文档第一个表格）
  - 单元格剥离行内 Markdown（\*\*加粗\*\*、\*斜体\*、\`代码\`）
  - 行高按 wrapText 换行数自适应（长释义自动撑高，不再固定 44px 挤成一坨）
  - 生成后自动选中新表格并缩放适应；坏选中文本（无竖线）安全回落文档来源、不删原文本
- 工程事实：TS 模板字符串里的脚本要按 JS 转义语义求值（\\→\、\`→`）再做语法审计，
  直读源码会把 \* 看成 \\*（仿真伪影）；表格脚本语法错已由 node --check 回归锁盯死
- 22 个测试文件全绿；真机验证清单见对话
- **脚本选择器加使用说明（对标 Obsidian ea-scripts 文档形态）**：顶部常驻
  「脚本使用说明」块（怎么跑/选中驱动 vs 读文档/存放位置/@excalidraw-onload）；
  每条脚本展示 md 说明文字（parseScriptDoc 新增 description 提取，无说明回落
  文件名，文件名进 tooltip）；i18n 158 键
- **额外字体（方案 A+B，第三十四轮内二次返工）**：
  - **第一版（已废弃）**：@font-face 注入 + apply-font-* 脚本写字符串
    fontFamily——用户真机反馈下拉里看不到六款字体后复查发现**前提错误**：
    vendor 0.18.1 的元素 fontFamily 是**数字枚举**（FONT_FAMILY：Virgil:1 /
    Helvetica:2 / Cascadia:3 / Excalifont:5 / Nunito:6 / Lilita One:7 /
    Comic Shanns:8 / Liberation:9），不是字符串；字符串写入不可restore、
    选择器也不列（只列 Fonts 注册表里的族），而 `Fonts` 类未从包根导出、
    `register` 是 private static，运行时没有公开扩展口
  - **正解（构建期 vendor 补丁）**：`scripts/excalidraw-fonts-patch.mjs`
    （vite 插件，仿 zh-CN 补丁手法）在构建期给字体注册 chunk 打两处补丁——
    FONT_FAMILY 枚举追加六个数字 id（101~106）+ `Fonts.init()` 注册序列
    注入六个 `n("族名",{uri:"./fonts/extra/<file>.woff2"})`（helper 内部
    自动回落 Excalifont 度量表）；无 `fallback:true` ⇒ 六款字体**原生出现**
    在字体选择器「可用字体」，选择/保存/重载/导出全链路走 vendor 原生机制，
    零自研运行时代码；幂等（重复打补丁原样返回）、锚点缺失即构建失败
  - 字体全量转 woff2（fonttools+brotli；ExcalidrawFontFace 按扩展名推断
    format，ttf 会产生非标准 `format('ttf')`，必须转）：霞鹜文楷 Lite
    （中文手写楷，13.9MB→5.3MB）、得意黑（中文斜体标题）、Caveat /
    Patrick Hand（西文手写）、Yusei Magic / Zen Kurenaido（日文手写），
    全 OFL 可分发，共约 9.2MB
  - 内置脚本回到 9 个（第一版加的 apply-font-* 六件套整组删除，用户工作
    空间已装的坏副本同步清掉）；「用户自备字体」通道随第一版一并移除
    （vendor 数字枚举体制下运行时 @font-face 注入无法进入选择器，方案 A
    留待 vendor 提供扩展口再议）
  - 顺带根治构建：vendor ESM 裸引用 `roughjs/bin/rough`，而 roughjs 4.6.4
    的 npm 包 bin/ 下只有 .d.ts 没有 .js（官方打包缺陷）——build.mjs 加
    构建别名指到官方 `bundled/rough.esm.js`，替代之前垫在 node_modules
    里的 fake 文件（npm install 会冲掉，别名可重建）
  - 23 个测试文件全绿（ea-script 断言 15→9、fonts-patch.test 新增：补丁
    纯函数单测 + engine.js 产物含六族名断言）
- **脚本侧边栏（用户拍板方案二：Obsidian 完全体——对标「固定按钮到 Excalidraw
  侧边栏」，调研确认 Obsidian 的脚本入口 = 工具面板图标按钮 + 右键固定到侧边栏，
  侧边栏即画布右缘竖条）**：
  - **右缘竖条（`ScriptRail.tsx`）**：常驻一枚「运行脚本…」入口（打开选择器）+
    被固定脚本一人一枚齿轮按钮（Obsidian 约定：脚本没配同名 SVG 就是 ⚙），
    点图标立即对当前活动画布执行、hover 出脚本名；绝对定位右缘，top 避开 vendor
    右上按钮簇、bottom 留出缩放控件，超高内部滚
  - **固定/取消固定闭环**：pin 的入口在脚本选择器——条目**右键 →「固定到侧边栏」**
    （已固定的显示主题色圆点，右键再点取消）；unpin 在侧边栏——固定按钮
    **右键 →「从侧边栏取消固定」**；☰ 菜单「运行脚本…」入口保留（双入口不冲突）
  - **状态与传播**：固定清单存设置 `pinnedScripts`（脚本文件名数组，normalize
    归一）；变更后宿主广播 window 事件 `exs:script-pin-changed`（常量独立成无
    React 依赖的 script-pin.ts，主包不为一个常量拉进 React 图），所有已开画布
    监听后重拉清单——选择器里固定的实时刷进已开的画布
  - 已知边界：长按固定（移动端）未做；脚本按钮暂无独立图标（统一齿轮，Obsidian
    的「同名 SVG 即图标」留待脚本库扩容后再说）
  - 23 个测试文件全绿（smoke-wiring 侧边栏闭环契约 + grid-memory 归一断言；
    i18n 158→163 键，说明块提示句补右键固定引导）
- **内置脚本 9 → 10：重复补间（repeat-tween，对标 Obsidian Repeat Elements）**：
  - 语义实测纠正：官方脚本真身是**两点补间**（选 2 个同型元素 → 输入数量 → 在
    两者之间线性插值位置/尺寸/角度 + **背景与描边 HSL 色相渐变**），不是阵列
    复制——色阶图/渐变进度条是它的杀手锏，按官方语义移植
  - **EaUtils.inputPrompt 立起来了**（对标 Obsidian ScriptEngine）：EaHost 声明
    （可返回 null）→ createEaApi 把取消转空串（脚本 parseInt("") 即 NaN 回落）→
    宿主 Dialog 实现（Enter 确定 / Escape 与关窗取消，Promise 永不悬挂）；
    后续带参数的脚本都走这条通道
  - 移植实现走自家 EaApi（getElement 读两端 → addElements 插值 spec → select），
    不抄官方的 elementsDict 直改；透明色不参与渐变；arrow/line 仅当两点数相同
    才插值折点；image/frame 明确拒绝
  - 仿真验证：位置/尺寸/角度插值精确到 1e-9、HSL 渐变中间色正确（红→蓝过紫）、
    取消路径零创建；ea-script 计数 9→10 + inputPrompt 三层接线契约
- **内置脚本 10 → 14（Obsidian 精选五件套收尾）**：
  - **选区加外框**（box-selection，对标 Box Selected Elements）：选区公共包围盒 +
    可调边距（inputPrompt，默认 20px）画虚线透明底矩形、自动垫底
  - **统一尺寸**（uniform-size，对标 Uniform size）：选中的矩形/菱形/椭圆/图片
    统一到选区最大宽高，**中心保持不动**（缩放后反向平移半差）；文本/箭头不参与
  - **反转箭头**（reverse-arrows，对标 Reverse arrows）：起端/末端箭头帽互换，
    几何不动
  - **形状互转**（change-shape，对标 Change shape）：矩形/椭圆/菱形一键换目标
    形状（几何与样式全保留）；绑定了文字的形状自动跳过并在结果里提示
    （ElementSpec 未暴露 containerId，bound text 跟不了形——已知边界）
  - **StylePatch 类型面放宽**：width/height（统一尺寸）与 start/endArrowhead
    （反转箭头）——底层 handle.patchElements 本来就是通用展开补丁，纯类型改动
  - 四脚本逐一 mock 仿真（外框几何、中心保持、帽互换、绑文字跳过）全过；
    ea-script 计数 10→14 + StylePatch 契约；官方 Obsidian 版全部仅作算法参考，
    一律按自家 EaApi 重写
- **内置脚本 14 → 15：文字编号（text-numbering，第三十五轮·用户拍板「一个脚本+弹窗选格式 / 自动替换旧编号」）**：
  - **按选择顺序编号**：`getSelectedElements()` = `Object.keys(selectedElementIds)`，
    vendor 是 `{...旧, [id]: true}` 增量构造、id 非整数键 → 插入序 = Shift 逐个
    点选顺序（拖框选择退化成创建顺序，脚本引导文案已注明）；number-badges
    （序号标注·外加红框徽标）早就是同款顺序假设，先例一致
  - **五种格式**：1=数字 2=罗马大写 3=罗马小写 4=字母大写 5=字母小写
    （inputPrompt 单问，number 型默认 1）；toRoman（含减写位 CM/IV…）与 toAlpha
    （Z 后进位 AA）纯函数内联在脚本里
  - **旧编号自动替换**：加新编号前先剥行首 `数字/罗马/字母 + . 、 ) ：` 前缀，
    可反复换格式重跑不叠加；副作用 = 正文恰好以「A. 」开头会被当旧编号替换
  - **新 EaApi 原语 `setText(id, text)`**：text/originalText 同步 + 宽 = 最宽行
    （estimateTextWidth 与元素工厂同口径）、高 = 行数 × lineHeight；容器绑定
    文本（containerId）与图形类型直接忽略（vendor redrawTextBoundingBox 未公开
    导出，脚本面内改绑定文字会错位，宁可不动并在结果里提示跳过数）
  - 仿真测试（点击序编号、罗马/字母转换、旧编号剥除、非文字跳过、空选引导）
    + ea-script 计数 14→15 + setText 消费面契约，23 文件全绿
- **第三十五轮 P1：侧边栏两态全手动（删图钉）+ 脚本专属图标**：
  - **删图钉**（用户拍板「不想要自动收起，全部手动」）：右缘竖条只剩 入口 +
    固定脚本 + » 收进 三个按钮；`hidden = scriptRailCollapsed` 单一来源；
    `tempOpen`/悬停判定/1.5s 宽限全删；`scriptRailPinned` 设置键、host getter、
    tab 接线、i18n 三键（固定侧边栏/取消固定（自动收进）/弹出脚本侧边栏）、
    ICON_PIN、`--on` 激活态样式一并清除（旧存档里的该键被设置白名单丢弃）
  - **脚本专属图标**（对标 Obsidian 同名 SVG）：`SCRIPT_ICONS: Record<文件名, 图标>`
    映射表，未配置回落齿轮；文字编号配 `ICON_NUMBERING`（编号列表语形），
    右栏固定按钮与脚本选择器条目标题行首都按映射取图标（内联 svg 随主题色）
  - 顺手根治：en_US.json 键序历史性漂移（键集相同但顺序错位导致键集校验假报警），
    重排与 zh_CN.json 同序（183 键）
  - 26 文件全绿（smoke-wiring 两态契约：无 railPinned/tempOpen/ICON_PIN 残留 +
    映射消费 + 选择器图标样式；grid-memory 旧键丢弃断言）；tsc 干净、构建绿
  - **竖条与脚本 Dialog「竞合」修复（真机截图反馈：选择器弹窗打开时竖条浮在
    弹窗上）**：根因是层级失控——思源 Dialog 是 inline `z-index =
    ++window.siyuan.zIndex`（计数器初始 10、随会话递增不可控），竖条写死
    `z-index: 60` 在计数器涨过 60 前稳压 Dialog。双重防御：① CSS 校准——竖条
    60→8、拉手 59→6（夹在 excalidraw sidebar 的 5 与 Dialog 最低 11 之间）；
    ② 行为让位——选择器打开时宿主广播 `pickerOpen`（RAIL_VIEW_EVENT 同通道），
    ScriptRail `hidden = railCollapsed || pickerOpen`，竖条与拉手一起隐藏，
    关窗自动恢复（不落盘）
- **第三十五轮 P2：脚本库面板（入口弹窗升级 + 行内脚本设置 + 行尾固定开关）**：
  - **形态**：「运行脚本…」弹窗升级为「脚本库」——每行 = 专属图标 + 标题/说明
    + 行尾两按钮：⚙ 设置（仅声明了参数的脚本显示）+ 📌 固定开关（点按翻转 +
    激活高亮；右键菜单保留，双入口互补）；行点按 = 运行（不变）
  - **设置四层机制**：① 声明——`SCRIPT_SETTING_SPECS: Record<文件名, Spec[]>`
    （key/label/type/default/options/min-max；加参数只改这一处）；② 存储——
    `settings.scriptSettings` 分桶（`{"text-numbering.md":{format:"3"}}`），归一
    只做结构校验 + 限量（桶 ≤50/键 ≤20），类型精校验在宿主读取时按 SPECS 做
    （settings.ts 不 import siyuan 层，防依赖翻转）；③ 原语——`EaHost`
    +get/setScriptSetting（宿主实现）+ `EaApi` +`ea.getScriptSetting(key, def)`
    /`ea.setScriptSetting(key, value)`，**隐式按当前脚本**（`createEaApi` 第三参
    scriptName，运行/onload 两条路径都传 `info.name`；对标 Obsidian EA 的
    getScriptSettings）；④ UI——行内展开抽屉（DOM 操作，**不弹新 Dialog**——
    思源每层 Dialog 都有遮罩会叠层变暗；change 委托落盘 + 手风琴互斥）
  - **运行时分层（v3 形态，已被 v4/v5 取代，见文末「编号交互 v4→v5 整改」）**：
    **监测驱动的条件弹窗**——脚本先用提出的
    `PREFIX_RE` 扫选中文字有没有旧编号：**新文字直跑**（读
    `ea.getScriptSetting("format","1")`，不弹窗，配置型参数一键完成）；
    **已有编号 = 重编号场景弹框换格式**（预填 `detectFormat` 反推出的旧格式——
    打开框看到的就是这批文字当前的格式，取消/无效输入回落检测值 = 保持原格式，
    幂等）。v4 起改为「Shift 显式弹窗 + toggle 去编号」，detectFormat 已删。
    **per-run 参数保留弹窗**——外框边距这种「这张图想贴紧、那张想宽松」
    的仍弹 inputPrompt（预填设置值、可临时改一次）。弹窗美化：宽度 380→340、
    number 型隐藏浏览器微调箭头、打开即聚焦全选（真机截图反馈「有点丑」）
  - **首配两个脚本**：text-numbering 的 format（select 5 种格式）、box-selection
    的 padding（number 0~200）；外框顺带配了 `ICON_BOX_SELECTION` 专属图标
  - 已知取舍：脚本被删后 settings 里的残桶 v1 容忍（有限量防护）；toggle 类型
    与「脚本内写设置」UI 入口留 P2b（原语已立）
  - 28 文件全绿（smoke-wiring P2 契约：SPECS/三参注入/行内 DOM 不新建 Dialog/
    change 落盘；grid-memory scriptSettings 归一；ea-script 仿真：设置值预填
    inputPrompt + createEaApi 读桶回落/写经宿主）；tsc 干净、构建绿
- **脚本侧边栏·液态玻璃返工（用户截图反馈三项：通高拉伸 / 几乎隐形 / 不能收起）**：
  - **玻璃质感（Apple Liquid Glass 通行做法）**：半透明面板 + `backdrop-filter:
    blur(18px) saturate(160%)`（画布透成柔焦）+ 1px 玻璃亮边 + 外阴影 + inset
    高光，圆角 16px；玻璃令牌 `--exs-glass-*` 亮暗各一套（跟 .exs-root 的
    data-theme-mode 切换）；按钮 32px、hover 浮起面、图钉亮起用 accent-container
  - **高度贴内容**：有几枚按钮撑多高（原 top:64/bottom:84 通高拉伸删除），上限
    视口减 160px、超出内部滚（滚动条隐藏）
  - **图钉开关**（scriptRailPinned，设置记忆，默认亮）：亮 = 常驻展开；灭 =
    自动收进（后经三态模型返工，见下）；图钉亮起用 accent 容器色高亮
  - **收起/展开**（scriptRailCollapsed，设置记忆）：跨画布一致、下次打开保持；
    getter 实时读设置（同 gridMode 口径）
  - 测试：23 文件全绿（smoke-wiring 侧边栏图钉/收起/玻璃契约 + grid-memory
    归一断言）；i18n 163→167 键
- **真机修复三连（用户反馈：拖不动 / 脚本连点无限嵌套变暗 / 图钉点了没反应）**：
  - **图钉没反应的根因**：图钉/收起状态走「getter 读设置」——落盘了但不触发
    React 重渲染，界面纹丝不动（collapse 同病）。修法：视图状态改 StudioApp
    本地 state，宿主落盘后广播 `exs:rail-view-changed`（RAIL_VIEW_EVENT），所有
    已开画布同步（与固定清单广播同套路）
  - **无限嵌套变暗的根因**：思源每层 Dialog 都带遮罩，脚本选择器/输入框可以
    无限叠层。修法：选择器改**单例**（开着就不再开第二层）+ inputPrompt **串行
    排队**（上一个 settle 后下一个才创建）
  - **可拖拽**：按住竖条空白处（按钮除外）沿右缘垂直拖动，落手按**画布高度
    百分比**记忆（scriptRailTop 0~0.85，窗口高度变化等比保持）；拖拽中投影加深、
    按钮禁点、收进暂停
  - 23 文件全绿（smoke-wiring 真机修复三连契约 + grid-memory scriptRailTop 归一）
- **侧边栏三态模型返工（用户两轮真机反馈 → 可交互 demo 拍板后落地；
  其中图钉/自动收进部分已在本轮 P1 删除，现行两态见上）**：
  - **展开态**：玻璃竖条常驻，高度贴内容不变；
  - **收进态**：点 » 整条 `translateX(calc(100% + 16px))` 滑出画面（240ms 过渡，
    visibility 延迟隐藏防焦点残留），右缘只留 ≈14×72px 贴边半露玻璃拉手（三点
    提示，scriptRailCollapsed 记忆），点拉手弹回展开；
  - ~~**图钉熄灭 = 自动收进**~~（P1 已删）：曾设计点图钉**立即**滑出（删掉
    1.5s AUTOHIDE_DELAY 宽限与 hoverPeek 误置逻辑），用户拍板「不想要自动
    收起，全部改成手动」后整体移除，只留手动收进/展开；
  - **拖拽跟手修复**（两轮才命中）：第一轮只把 rect 来源从 `rail.offsetTop`
    换成 `getBoundingClientRect()` 没用——真因是**坐标系错位**：竖条是
    absolute，`top` 相对真正包含块 `.exs-root`（offsetParent）结算，拖拽数学却
    用 `rail.parentElement`（画布包装层、非定位元素），两个基准差一整个工具栏
    高度 → 按下跳一帧、首帧再把页面坐标量当 `top` 渲染 → 往下弹一下再带着
    恒定偏差跟手。修法：全数学统一到 offsetParent 系——起点 = 当前实际 top
    （`railRect.top - cbRect.top`），移动 = 起点 + 纯指针增量；
  - 竖条与拉手共用同一垂直锚点（拖拽中像素、平时记忆百分比）；i18n 键改为
    「取消固定（自动收进）/收进边缘/弹出脚本侧边栏」（167→168 键，删「收起
    脚本侧边栏」）
  - 测试：23 文件全绿（smoke-wiring 三态契约：无 AUTOHIDE_DELAY、`--off` 滑出、
    拉手样式、rect 重算起点、offsetTop 禁用）
- **竖条与 vendor 右缘侧栏避让（2026-10-19 晨，用户截图反馈「竞合」）**：
  素材库侧栏（vendor 的 `openSidebar`，贴右缘）与脚本竖条（我们也贴右缘）硬叠，
  竖条浮在面板右缘挡住面板自己的 ⋮/✕。口径：`appState.openSidebar != null`
  （不限侧栏名——素材库、搜索都贴右缘）→ 竖条整条滑出，**拉手一起藏**（侧栏自己
  贴在右缘，拉手浮上去正是被投诉的那个遮挡）；侧栏关闭即恢复，不改用户的手动
  收进记忆（`scriptRailCollapsed` 原样）。实现：handleChange 每帧跟 openSidebar
  （翻转才 setState，零渲染风暴）+ 挂载时按 api 现读兜底（场景可能带着开着的
  侧栏落盘）；与既有的 pickerOpen 让位（防思源 Dialog 叠层）并列成让位三来源
  - 测试：30 文件全绿（smoke-wiring 新增「竖条与 vendor 右缘侧栏避让」契约块）

**第三十六轮（2026-10-18，AI 绘图 A+B：计划 DSL + 内置智能体三能力 + 外部 CLI/Skill）**

- 用户拍板先做 A+B（C 内核 `kernel.js`/MCP、D 位图图片生成当时未授权，第三十七轮已补齐）：
  模型只写「标题/说明/预设/布局/节点/边」，坐标与样式由插件算——不让模型直出元素
  JSON（坐标漂移、每次配色不统一）
- **共享核心 `src/studio/ai/`**（前端能力与 CLI 共用同一套，两边画出来一致）：
  - `plan.ts`：`normalizePlan` 消化松散输入（字符串节点；`"a->b"`/元组/对象三种边；
    端点按 id 或**完全相同的标签**解析；别名与默认值）。结构性错误抛 `PlanError.reason`
    （`bad-plan` / `empty-plan` / `duplicate-node-id` / `too-many-*` / `bad-shape` /
    `bad-preset` / `bad-layout`）；未知端点、自环、重复边这类可局部修复的进 `warnings`
    后丢弃，不整单失败。上限 40 节点 / 80 边 / 单标签 200 字 / 标题 120 字
  - `layout.ts`：`lr`/`tb`（Kahn 拓扑分层，有环强行开层）、`grid`（最多 4 列）、
    `radial`（最高度数节点居中）；节点矩形两两不重叠，边走 4 点折线（标签取中点）
  - `preset.ts`：`pencil`（米白纸/黑墨/Excalifont 5/roughness 1）、`marker`
    （8 色马克笔循环、红边）、`blueprint`（蓝单线/Cascadia 3/roughness 0）
  - `render.ts`：计划 → 元素 specs（不含箭头）；分组共用底色、标题/说明、
    `rectangle` 直角、其余形状跟随预设；绑定文字由
    `ea-element.expandElementSpecs` 展开（容器 + 居中文字，继承字族/颜色）
  - `headless.ts`：无 DOM/canvas 构建完整 scene——箭头 `startBinding/endBinding` +
    两端 `boundElements`、`index` 重排 z 序、背景补底、`encodeSvgPayload` 内嵌
    `<metadata>`（带 `svg-source:excalidraw` 标记，可被 excalidraw.com 互认）
- **思源内置智能体三能力**（`registerAgentCapabilities`，只对内置智能体可见、
  **不进 MCP**；老 SDK 没有 `addAgentCapability` 时安静跳过，不影响插件其余功能）：
  - `excali_list_boards`（localRead）：列保存目录下的白板（`query` 过滤、`limit`
    1..100，默认 50），返回 `dir/total/boards[{title,path,updated,updatedAt}]`
  - `excali_open_board`（localRead）：按 `board`（标题）或 `path` 打开页签，等画布
    就绪后返回 `ready`
  - `excali_draw_board`（localRead + localWrite，思源会弹写入确认）：接收计划对象
    或 JSON 字符串，默认 `append: true`；`board` 为空则新建（文件名取 `title`/计划
    标题/「AI 白板」），有值则**只追加到已存在的板**（找不到就报错，不偷偷新建）。
    画布就绪后走 `renderPlan` → `addElements` → `connectObjects` 绑箭头 +
    `patchElements` 补折线/预设样式 → 选中新元素并缩放适应 → `flush` 落盘；
    返回 `created/path/title/nodes/edges/preset/layout/saved/origin/warnings`
  - 路径白名单：只认当前保存目录（`assets/excali`）的 `.svg`；按标题匹配大小写
    不敏感、精确名优先；目录前缀 + 存在性校验
- **外部智能体 CLI + Skill**（WorkBuddy/Qoder 等能跑命令的 agent）：
  - `scripts/excali-board.mjs`：`list` / `create` / `append` 三个动作；
    `--workspace`、`--plan <文件|->`（`--plan-json` 直传）、`--board`、`--title`、
    `--dir`、`--query`、`--dry-run`（只渲染不写盘）；
    Node 22.6+（`--experimental-strip-types`），所有结果一行 JSON
  - 目录按**资产相对路径**解释：`assets/excali` → `{workspace}/data/assets/excali`
    （首版误写成 `{ws}/assets/excali`，实机核对后修正）；只允许写工作空间 `data/`
    内，拒绝路径穿越与非 `.svg`
  - 写入纪律与插件一致：坏场景拒绝覆盖、temp+rename 原子写、同名滚 `_0/_1`、
    已存在元素 id 加时间戳前缀；第五十四轮起 `--no-backup` 与 BAK 滚动一起删除，
    改为「正文逐字 + 载荷语义」等价门（等价则不重写，JSON 里回 `unchanged: true`）
  - `script/excali-draw/SKILL.md`：教模型写计划 JSON、先 `list` 再 `append`、
    **白板正开着时不要 CLI 直写**（画布自动保存会覆盖）、失败码处理；集市版
    `package.zip` 不含 `scripts/`，找不到 CLI 时回退内置智能体 `excali_draw_board`
- 门禁：26 个测试文件全绿（新增 `ai-plan` 14 项、`ai-cli` 8 项、`ai-wiring`
  11 项；CLI 测试在临时工作空间里真跑子进程，覆盖 create/append/dry-run/BAK/
  路径安全）

**第三十七轮（2026-10-18，C+D：内核能力与位图生图）**

- 用户授权补做 C（内核 `kernel.js` / MCP）与 D（位图图片生成）
- **C·内核产物**：新增 `src/kernel/*` → 构建为单文件 IIFE `kernel.js`（≈95 KB），由
  `plugin.json` 的 `"kernels": ["all"]` 加载。四个工具：`excali_file_list_boards`
  （列板，`query`/`limit`）、`excali_file_read_board`（结构摘要：元素数、文字、包围盒、
  前 200 个元素）、`excali_file_draw_board`（计划 JSON → 无头 scene → 新建/追加）、
  `excali_file_generate_image`（生成位图并插入）
- **注册路径**：优先 `siyuan.agent.registerCapability(name, {title,description,inputSchema,
  effects}, handler)`——进共享工具表，思源内置智能体与内核 MCP 都可见；老版本回退
  `siyuan.mcp.registerTool(...)`；`onunload` 逐个注销。写工具带
  `effects.localWrite`，由思源走写入确认；两套 API 都没有时安静跳过
- **接 /mcp 实测修订（同日深夜，3.8.7）**：照源码把契约钉准——
  - 3.8 起 `siyuan.mcp` **整个删掉了**（`kernel/plugin/sandbox.go` 只注 `injectAgent`），
    四工具走的就是 `siyuan.agent.registerCapability`；回退分支只在 3.7.x 生效，且 3.7 的
    `registerTool` 只读 title/description/inputSchema/outputSchema，**没有 `readOnly` 这个
    字段**（传了没人看），所以旧分支不再声明副作用
  - `effects` 四个字段名要和内核 `tools.ToolEffects` 的 json tag 逐字对齐：`localRead` /
    `localWrite` / `dataEgress` / `externalCost`。内核用 `json.Unmarshal` 收，**字段名写错
    不报错、只是静默少一项**——等于把「要用户确认的活」说成只读。生图要把提示词发给外部
    付费 API，故标 `dataEgress` + `externalCost`；`draw_board` 纯本地，不许带上
  - 两个注册 API 都返回 Promise，拒绝落在异步通道里——`try/catch` 接不住。补 `settle()`
    接 `.catch` 打 warn，否则真机上「注册失败」和「压根没这段代码」在日志里长得一模一样
  - MCP 侧的工具名由内核加前缀 `plugin__<插件名>__<能力名>`，**超过长度上限会截断再拼 12 位
    十六进制后缀**（实测 `plugin__siyuan_excali_studio__excali_file_draw_boa__34aa0c6…`）。
    外部客户端不能硬编码，必须先 `tools/list` 取实际名
  - **改 `kernel.js` 不必重启思源**：内核插件只在 boot 时装载（`loaded petals … isKernel=true`
    那行日志），但 `model.SetPetalEnabled(name, true)` 会先 `loadCode()` 从磁盘重读
    `kernel.js`/`index.js`/`index.css` 再 `StartPlugin`（内部先 `stopLocked` 再新建），等于
    一次热重载，顺带给这个插件挂上 `kernel.js` 源码监听（macOS 走轮询）。所以「今天 07:50
    起的内核、17:42 才第一次构建 kernel.js」这种错身而过，一个
    `POST /api/petal/setPetalEnabled {"packageName":"siyuan-excali-studio","enabled":true}`
    就解了，代价是前端插件一起重挂（白板页签会重建）
  - Qoder 侧接法：设置 → MCP → 自定义服务器，配置只写 `{"url": "http://127.0.0.1:6806/mcp"}`
    （本机回环不需要 token，Qoder 也不允许把凭据写进 MCP 配置）；`status: ready` 后新服务器
    要等会话重载才进 agent 的工具表
- **内核运行时**：goja 无 DOM/`atob`/`btoa`/`TextEncoder`——`runtime.ts` 仅在缺失时补
  纯 JS 垫片；文件 IO 全走 `/api/file/*`（读取失败是 HTTP 200 + JSON `code`，需二次判）、
  写文件手工 multipart；设置从 `siyuan.storage.get("excali-studio")` 读后
  `normalizeSettings` 归一化。路径一律限定在工作空间 `data/` 内，并新增 `..` 段拒绝
  （前缀检查挡不住 `assets/excali/../../x.svg`）
- **D·共享生图层 `src/studio/ai/imagegen.ts`**（前端与内核同一套）：
  `imageEndpointOf`（裸 base URL 自动补 `/images/generations`）、`buildImageRequest`
  （Bearer、不强制 `response_format`，兼容只回 b64 或只回 url 的服务）、
  `parseImageResponse`（`data[0].b64_json` / `data[0].url` / 根级同构 / API error）、
  格式嗅探 PNG/JPEG/GIF/BMP/WebP 得出尺寸，`MAX_IMAGE_BYTES = 12 MiB`
- **D·前端能力 `excali_generate_image`**：设置页新增「图像生成 API 地址 / 模型 /
  API Key（密码框，只存在插件数据里、不进日志）/ 尺寸」四项；能力**先生成、成功后才
  新建白板**（API 失败不留空板），再打开页签 → `handle.addImage` 落在旧内容下方 →
  选中并滚动到位
- **D·内核能力 `excali_file_generate_image`**：同一生成器经 `siyuan.client.fetch` 走
  forwardProxy；`url` 返回二次下载、inline 直接内嵌；追加时沿用「旧内容包围盒下方
  80px」落点，三档 BAK 照常
- 门禁：29 个测试文件全绿（新增 `imagegen` 9 项、`kernel` 11 项；`ai-wiring` 扩到
  14 项、`smoke-artifact` 覆盖三产物）。`kernel.test.mjs` 在 `vm` 沙箱（无
  `atob`/`btoa`/`TextEncoder`）里加载**真产物**，用假 `siyuan.client.fetch` 落盘临时
  工作空间，覆盖四工具、BAK、路径越界/`..`、URL 下载、未配置 Key、旧
  `mcp.registerTool` 回退、effects 四字段（含出网/花销）、注册被内核拒绝要可见

**编号交互 v4→v5 整改（2026-10-18 深夜，用户真机三症状：Shift 显式 + toggle 去编号 + 菜单自选 + 内置脚本自动更新）**

- **三症状的统一根因**：`installBuiltinScripts()` 的策略是「已存在则跳过，用户改过
  不覆盖」——用户工作空间里的 `text-numbering.md` 停留在**第一次装插件时的 v1 旧版**，
  改 `script-store.ts` 里的内置脚本源码不会更新磁盘文件。于是：旧文案「编号格式：
  1=数字…」、无条件弹窗（新文字也弹）、取消也运行（v1 取消回落 fmt=1 继续跑）全部
  由此解释；监测代码本身 8 个仿真用例全绿，用户从未跑到新代码
- **交互四代演进**：v1 无条件弹窗 → v2 全删纯设置驱动（「设好了还弹多余」）→
  v3 监测旧编号条件弹窗（「删了不好调整已有文字」）→ **v4**：显式 > 隐式，
  绕开监测的全部边界（正文恰以 "A." 开头误判、混合选择、旧编号想用默认格式重跑）
  → **v5（本轮）**：Shift 弹框从「输入框输 1~5」升级为**下拉菜单自选**
- **v5 三种操作**（用户拍板「按住 Shift 点按钮 = 弹框；不按 = 直跑；再点一次 = 去掉」）：
  ① **直接点按钮** = 读脚本库 ⚙ 设置里的 format 直跑（新文字一键编号，不弹任何窗）；
  ② **选中的文字全部带编号时再点一次** = toggle off，全部去掉编号（混合选择——
  部分有编号部分没有——按加编号处理，已有编号的按默认格式重编号，用户拍板口径）；
  ③ **按住 Shift 点按钮** = 弹出**格式菜单**（数字（1. 2. 3.）/ 罗马大写（I. II. III.）/
  罗马小写（i. ii. iii.）/ 字母大写（A. B. C.）/ 字母小写（a. b. c.），当前默认格式
  打勾），**点空白 / Esc / 点菜单外 = 什么都不做**
- **新原语 `ea.utils.selectOption({options, current, at})`**（对标 Obsidian EA 的
  下拉选择，思源侧用 `Menu` 实现）：点项返回值、关闭即取消返回 null（不像 inputPrompt
  把 null 转空串——「取消」与「空输入」必须可区分）；锚点 = 点击现场坐标，链上透传；
  串行链防连点叠菜单。通用原语，以后任何脚本「几选一」都能用
- **修饰键 + 锚点全链传递**：React onClick `e.shiftKey`/`e.clientX,Y` → ScriptRail
  `onRunScript(name, {shift, at})` → StudioApp → tab → 宿主 `runScriptFile(name, opts)` →
  `runScriptOnActiveBoard(info, opts)` → `createEaApi(handle, host, scriptName,
  modifiers)`（第四参 `ScriptRunOpts`）→ 脚本 `ea.getModifiers().shift` /
  `selectOption` 的 `at`；onload 路径无交互恒 false
- **内置脚本自动更新**（治本，替代「等用户手点重置」）：settings 记一份
  `builtinSnapshot`（文件名 → 我们上次写入内容的 djb2 指纹）；插件加载时
  `syncBuiltinScripts()` 比对——磁盘 == 内置最新版 → 记快照；磁盘旧但 == 快照
  （用户没动过）→ **自动更新 + toast 告知**；磁盘 != 快照（用户自己改过）→ 不覆盖，
  仍走脚本库顶部 `exs-picker__outdated` 手动提示条（`resetBuiltinScripts()` 只覆盖
  不一致的，自建脚本永不动）。首轮快照缺失按「没动过」一次性接管存量磁盘
- **取消语义统一（C）**：外框边距取消不再回落 20px 照画（`if (isNaN(parsed)) return;`）；
  换形状取消静默（空串直接 return，无效输入仍提示）；补间数量本就有正整数守卫
- i18n +1 键（228 键同序）；门禁：28 文件全绿（ea-script 编号仿真 v5 十用例——
  直跑/toggle off/菜单预勾选/点空白零调用/混合/跳过/空选/回落 + selectOption 契约；
  smoke-wiring v5 契约：Menu 实现/closeCB 取消/锚点链/自动更新/取消守卫；grid-memory
  快照归一）；tsc 干净、构建绿

**素材库导入·方案 A（2026-10-18 深夜：☰「导入素材库…」）**

- **背景（调研实锤）**：libraries.excalidraw.com 的「Add to Excalidraw」按钮生成的
  是 `https://excalidraw.com?addLibrary=<URL 编码的库文件>&token=<CSRF>`（从官方站
  跳过去时是 `#addLibrary=` hash 形态）。该 URL 由 excalidraw.com 自己的
  hashchange effect 承接（fetch → Blob → `updateLibrary({merge, openLibraryMenu})`），
  **只对官方站生效**；Excali Studio 是数据隔离的本地应用，点按钮只会把库装进官方
  网页版，思源侧什么都收不到（`APP_NAMES` 白名单只认 Excalidraw+/Excalidraw/
  Excalideck，插件不在体系内）
- **方案 A = 粘贴链接导入**：☰ 菜单新增「导入素材库…」→ 对话框三种入口——
  ① 粘贴「Add to Excalidraw」跳转后地址栏里的链接（`?addLibrary=` / `#addLibrary=`
  两形态，`parseLibraryInput` 纯函数解出库 URL，token 丢弃）；② 粘贴「Download」
  按钮的 `.excalidrawlib` 直链；③ 选择本地 `.excalidrawlib` 文件
  （`input[type=file]`，不经宿主机文件系统权限）
- **实现走官方同款配方**（0.18.1 vendor 的 importLibrary 只是 App 内部 effect、
  **不是 imperative API**，类型上不存在，必须自建）：远程 = `fetch(url)` → Blob →
  `api.updateLibrary({libraryItems: blob, prompt: true, merge: true,
  defaultStatus: "published", openLibraryMenu: true})`（prompt = vendor 弹一次安装
  确认，防恶意链接）；本地 = File 即 Blob 直接喂 updateLibrary（用户自选文件，
  不弹确认、不标 published，与 vendor Load 口径一致）。装完由既有 onLibraryChange
  链路自动落盘 `excali-libraries/`，并展开组件库面板
- **实测验证过的可行性前提**：libraries.excalidraw.com 的 `.excalidrawlib` 响应
  `access-control-allow-origin: *`，插件页面可直接 fetch；该域是 excalidraw.com
  子域，在 vendor 默认 URL 白名单内
- i18n +13 键（241 键同序）；门禁：29 文件全绿（新增 library-import.test.mjs
  14 用例——query/hash 两形态/token/裸直链/大小写/空白/空输入/坏库 URL/首页误粘/
  本地路径/javascript: 协议；smoke-wiring 方案 A 契约 21 断言——解析纯函数/菜单
  入口/挂载链/官方配方/本地分支/样式/i18n；menu.test.mjs 自绘项 8→9）；tsc 干净、
  构建绿
- **过渡期老路仍然有效**：素材库站「⬇️ Download」下载文件 → 画布 ☰ 菜单 →
  组件库 → Load 打开（vendor 原生能力，装完同样自动落盘）

**素材库导入·方案 B′（2026-10-18 深夜：「Add to Excalidraw」一键落地）**

- **调研结论（为什么 Obsidian 那个「直连」照搬不了）**：Obsidian Excalidraw 确实
  留了钩子（`ExcalidrawRoot.ts` 的 `libraryReturnUrl: "app://obsidian.md"`，全仓
  仅此一处业务引用），vendor 的 `useHandleLibrary` effect 也确实会在**页面加载时**
  解析 `#addLibrary=` 并自动导入——但 `app://` 深链不会被操作系统路由回运行中的
  Obsidian，社区文档明说该按钮「仅适用于 Excalidraw 在线版，对 Obsidian 插件不适用」。
  照搬 = 复制一个空转的摆设（我们原来的 `libraryReturnUrl="excali-studio"` 同类无效）
- **思源有两个 Obsidian 没有的先天条件（本轮实测）**：① 内核把插件静态文件挂在
  `http://127.0.0.1:6806/plugins/<插件>/` 下，**外部浏览器可直接加载**（curl 实测
  200）；② `/api/file/*` **免鉴权**（无 token / 错 token / 带 Origin 头均 200）。
  于是把 `libraryReturnUrl` 指向本地页面，浏览器点完按钮真的能跳回来
- **链路**：白板组件库面板点「Browse libraries」→ 素材库站打开（referrer = 落地页
  URL，`useHash=true`）→ 点「Add to Excalidraw」→ 跳回
  `http://127.0.0.1:6806/plugins/siyuan-excali-studio/library-import.html#addLibrary=<库URL>`
  → 落地页 fetch 库文件、与现有图库去重、新增项写入 `local.excalidrawlib` → 回思源即用
- **落地页 = 纯 JS 独立页，不挂 8MB 引擎**：`src-import/library-import.html`（静态壳，
  零依赖）+ `src/library-import-page.ts`（构建第四趟 → `dist-lib/lib-import.js`，
  ES 单文件仅 8KB；只 import 纯模块 library-import/stencil，不碰 vendor、不碰 siyuan）。
  页面三个文件 API（putFile/getFile/readDir）的 wire format 与 `studio/storage.ts`
  逐字对应（不 import 它：storage → scene-codec → pako，会把压缩库拖进落地页）
- **库目录怎么带**：插件数据在 `conf/data/` 下（不在 `/data/`，无 HTTP 端点可读），
  落地页读不到设置——所以 URL 带 `?dir=<库目录>`（点击时从 `settings.saveDir` 实时算，
  `location.origin` 端口自适应；`resolveLibDir` 防目录穿越）。用户在设置里改了保存
  目录后，画布侧重获焦点即刷新（函数 prop + focus 刷新，不写进搬家前的旧目录）
- **导入语义与方案 A 一致**：按 id 去重（已导入过 → 「这些素材已经在库里了」不写文件）、
  无 status 的新项补 `published`、只追加进本地库文件（不覆盖他人文件）、页面内一次
  确认再写盘（对应 vendor 的安装确认）
- **手动模式兜底**：直接打开落地页（没有 hash 参数）时显示粘贴框，三种链接形态复用
  方案 A 的 `parseLibraryInput`
- **端到端实测（除 DOM 外全真）**：解析 landing 参数 → 解库 URL → 真 fetch AWS 图标库
  （249 条目）→ readDir 空目录容错 → 导入计划 → putFile 真写盘 → getFile 读回一致
  （status=published）→ 重复导入幂等（零新增）→ 9/9 全过
- i18n 无新增（落地页是独立静态页，中文硬编码，与 embed 页同口径）；门禁：30 文件
  全绿（新增 library-import-page.test.mjs 14 用例——参数两形态/防穿越/去重/补
  published/批次内重复/空计划/wire format 契约/复用契约；smoke-wiring B' 契约——
  构建第四趟/拷贝/id 契约/函数 prop/聚焦刷新/libraryReturnUrl/宿主 URL/tab 透传）；
  tsc 干净、构建绿

**素材库导入·修复（2026-10-19 晨：v1 格式归一化 + 聚焦热刷新）**

- **事故**：用户照 B′ 流程导入，落地页显示「已写入 7 个新素材」，组件库面板却
  「尚未添加任何项目」。两个独立根因叠加：
  ① **官方素材库站的文件是 v1 格式**：`{type:"excalidrawlib", version:1, source,
  library:[[元素,元素],…]}`——条目是**裸元素数组**，没有 id/status/elements 外壳
  （实测 jumpingrivers/r.excalidrawlib：version:1 + library 键）。旧落地页的
  planImport 把数组当对象展开（`{...[元素数组], status:"published"}`），写出
  `{"0":{…元素…},"status":…}` 的数字键怪胎；vendor 的条目校验（restoreLibraryItems
  的 Tp：恢复不出合法 elements **整条丢弃**）全部扔掉 → 面板全空。用户工作区里
  那份 `local.excalidrawlib` 已用归一化结果重写（原档备份 `*.bak-20261019`）
  ② **studio 只有挂载那一次读盘合并**（updateLibrary merge），导入前就开着的
  页签永远不重读——切回思源也不会刷新
- **修复一·格式归一化**（`stencil.ts` 的 `normalizeLibItems`，口径逐字对齐 vendor
  0.18.1 的 restoreLibraryItems——chunk-K2UTITRG.js 的 Lp/Tp）：数组条目包成 v2
  item、对象条目补 id/status/created 缺省、恢复不出合法元素的条目丢弃；两条自有
  纪律：**v1 条目没有 id**，若学 vendor 发随机 id，「同一份库重复导入」将永远去重
  不掉——改用元素内容（id+versionNonce 排序拼接）FNV-1a 双哈希派生**确定性 id**
  （同内容同 id，落地页/studio 跨进程稳定）；**数字键怪胎回收**——对象条目没有
  elements 但 0/1/2… 键下是元素时按数字序回收成正常条目（旧档读一次即自愈）。
  `parseLibFile` 的所有读盘路径都过归一化，vendor 侧拿到的永远是干净 v2
- **修复二·热刷新**（StudioApp 的 `applyDiskLibrary` 三处复用）：① 挂载即加载；
  ② 窗口 focus/visibilitychange 防抖 250ms 重读合并——**磁盘签名没变整个跳过**
  （不惊动 onLibraryChange），自己刚存下去的那一届记住签名（不把自己存的当成
  「外部新增」弹 toast），有新增才提示「素材库已刷新，新增 N 个条目」；③ ☰ 菜单
  新增「刷新素材库」手动兜底（第 10 个自绘项 + ICON_REFRESH，多端同步完文件后的
  确定性刷新）。merge 幂等：vendor 按元素 id+versionNonce 去重，重复合并不出重复项
- **回归护栏**：官方 v1 文件走完整管线（parseLibFile → planImport → serialize →
  再解析 → 重复导入零新增）的用例落在 library-import-page.test.mjs；归一化四路
  （v1 数组/幂等/怪胎回收/丢弃）在 stencil.test.mjs；smoke-wiring 新增契约块盯
  归一化导出、三处 applyDiskLibrary、防抖与签名闸、菜单接线、i18n 三键
- i18n +3 键（244 键同序）；门禁：30 文件全绿；tsc 干净、构建绿
  （index.js/engine.js/kernel.js/lib-import.js 四包重新落盘）

**第三十八轮（2026-10-18，荧光笔：一枚按钮 + 不占位色板，笔刷条退役）**

- 用户口径：「荧光笔只需要出现一个荧光笔；颜色调整要在**不占右边侧边栏位置**（或可收起
  不占地方）的前提下新增；四只墨水笔就不需要了」。三项拍板：顶部 PenRail **整条撤掉**
  （只留 vendor 自己的素材库按钮）、**已激活时再点按钮 = 弹色板**（未激活 = 直接切笔）、
  离开手绘工具后**四键自动复位成 vendor 默认笔**
- **单一真源 `src/studio/pens.ts`**（纯数据 + 纯函数，不 import vendor / siyuan 层）：
  `settings.highlighter`（`{color,width,opacity}`）是工具偏好、跨画板记忆，
  **绝不写进白板文件**；`HL_COLORS` 六色（open-color，与 vendor 拾色器同源）、
  `HL_SIZES` 三档（细 3 / 中 4 / 粗 6）、`DEFAULT_HIGHLIGHTER` = 黄 `#ffd43b` / 中 / 45%、
  `HL_ROUGHNESS = 0`。`normalizeHighlighter` 收口脏值（非 `#rrggbb` 回落默认黄、
  width 夹 1..12、opacity 夹 10..100）；`isHighlighter` = 手绘工具 + 四键全等
- **笔宽口径纠偏**：vendor freedraw 是 `size = strokeWidth × 4.25`（chunk 里实测），
  上一版直接用 vendor 的「粗」（width 12 ≈ 51px）在笔记上是一整条宽带——这就是
  「看着不像荧光笔」的根因。本轮默认 width 4 ≈ **17px**，色板里按「约 Npx」显示
- **落位**：`ScriptRail` 首元素一枚荧光笔按钮（未激活也常驻笔尖色条 `.exs-hl-btn__chip`，
  走 `--exs-hl-color` 变量跟当前配置色）；色板 `.exs-hl-palette` 是竖条的**兄弟节点**
  而非子元素——竖条带 `overflow-y:auto` + `backdrop-filter`，子元素会被裁且被拉进它的
  层叠上下文；`position: fixed; z-index: 300` ⇒ **换色零占位**，
  竖条宽度不受色板影响。选择器（Dialog）开着时整条让位，色板跟着收
- **状态机两个维度**（`StudioApp`）：`hl`（配置）与 `hlActive`（这块画布正拿着荧光笔）。
  激活态真源是 vendor `appState`，`handleChange` 按**笔刷签名**去重后反推
  （`isHighlighter`），所以手动在 vendor 样式条上凑出同一组四键、脚本调
  `ea.highlighter()` 都会点亮同一枚指示，不需要额外通道；离开 `freedraw` 复位四键。
  「关闭荧光笔」只复位四键**不抢工具**；正拿着笔时改色即写 appState，关着改色只存配置
- **微感知**：激活态用 `inset` 阴影描边不加 `border`（加边框会把图标顶偏 1px）；
  色板读数 `flex:1 1 auto` 左对齐，「关闭荧光笔」钉在右侧不随读数长短位移；
  自定义色只在**收盘（blur）时提交**——原生取色器每挪一下都发 `input`，
  即时写会把磁盘刷爆；宿主 `rememberHighlighter` 同值短路
- **跨画布同步**：宿主落盘后广播 `exs:highlighter-changed`（`HIGHLIGHTER_EVENT`），
  其余画布重归一并跟随刷新；正拿着笔的画布顺手刷四键
- **进脚本库**：`ea.getPen()` / `ea.setPen(patch)`（先读当前再合并、脏值走 pens 归一、
  可选 `tool` 切工具）/ `ea.highlighter()`（读设置里那一份 + 零糙度 + 进 freedraw）三原语，
  都收敛到 `handle.applyPen` 一个落盘原语（四键走 `updateScene.appState`，
  切工具单独走 `setActiveTool`——`updateScene` 里写 `activeTool` 会被 vendor 自己的
  reconcile 覆盖）。内置脚本 `highlighter.md` 走**零参数**：两处各存一套迟早打架，
  竖向色板是唯一调色入口；配专属图标 `ICON_HIGHLIGHTER`，可固定到右栏当功能扩展
- **脏安全**：描边四键是纯 UI 状态、不落盘，`scene-dirty.ts` 的指纹只看背景/网格 ⇒
  换色/切笔不误报脏、不白跑自动保存
- 已知边界：官方 0.18.1 的 appState 不暴露 EA fork 的 `penOptions`（perfect-freehand
  压感、恒宽、叠加不加深），只能用「零糙度 + 半透明 + 粗笔宽」**近似**，
  代码里不许假装支持（测试卡死 `penOptions` 不出现在落面层）
- i18n：删「笔刷」与六支笔标签，加色板 18 键（荧光笔 / 颜色 / 六色名 / 自定义颜色 /
  粗细 / 三档 / 约 {n}px / 关闭荧光笔 等），双文件各 228 键同序
- 测试：28 文件全绿。`smoke-wiring` 第三十三轮笔刷条契约整段换成荧光笔三块契约
  （数据面 / 落面含**div 配对扫描**盯死「色板必须是竖条兄弟节点」/ 脚本库面）；
  `ea-script` 新增 `normalizeHighlighter` 夹界、`isHighlighter` 五拒、ea 三原语合并归一、
  `highlighter.md` 注册；`menu.test` 反转为「右上角不许再挂任何东西」
- 顺手清掉三处**既有红**（非本轮引入，属编号交互 v4 / selectOption 迁移轮未同步）：
  `inputPrompt("编号格式…")` 断言改指 `ea.utils.selectOption`（菜单取消 = `null`，
  无效输入场景已不存在故删除该用例）、选择器/右栏透传参数补上 `at` 坐标、
  内置脚本同步提示文案缺失的 i18n 键补进双文件
- **同日修订（真机截图反馈「色板盖住下面按钮了，往左一点」）**：色板水平位置原先写死
  `right: 58px`，但**色板是 `fixed`（包含块=视口）、竖条是 `absolute`（包含块=`.exs-root`）**，
  两个基准不是一回事——思源右 Dock 开着、或页签左右分栏时，`.exs-root` 的右缘不在窗口右缘，
  常量就把色板推到竖条上面去了。现改为**按荧光笔按钮的实测左缘锚定**：
  `right = window.innerWidth − rect.left + 12`（`getBoundingClientRect` 与 `innerWidth`
  同为视口坐标，恒等式与容器位置无关，竖条拖到哪儿都贴得准），并在画布太窄、色板要顶出
  左缘时回夹到离左缘 8px。CSS 里不再留 `right` 常量，位置单一真源在 JS；测试契约反向卡死
  （`.exs-hl-palette` 规则里不许再出现 `right:`，同时断言锚定式与夹紧式）

**素材库工作流·桌面端增强（2026-10-19 午：打开素材库文件夹 + 系统文件选择器）**

- **背景**：素材站「Add to Excalidraw」回跳被思源 3.8.4+ 的跨站拦截拦下（见上文分析，
  F5 即恢复），「Download → 手动导入」成为主路径——于是两件顺手的体验一起做了：
  ① 库站点 Download 后想少跳转：素材库文件夹应该**一键直达 Finder**；
  ② vendor 组件库 ⋮ 菜单的「打开」走 DOM `<input type="file">`，Chromium 安全模型
  **不允许网页指定初始目录**——弹出的 Finder 永远落在默认位置，任何代码都改不了，
  只能换我们自己的入口
- **桌面端桥**（`desktop-bridge.ts`）：拆思源 Electron 主进程实证（nodeIntegration 开启，
  官方设置页的「在 Finder 中显示」就走同款通道）——
  `ipcRenderer.send("siyuan-cmd", {cmd:"openPath", filePath})` 打开文件夹；
  `ipcRenderer.invoke("siyuan-get", {cmd:"showOpenDialog", …})` 弹**可指定初始目录**
  的原生文件选择器。浏览器/移动端没有 `window.require`，全部安全降级（回落 DOM input /
  菜单项提示仅桌面端支持）
- **☰「打开素材库文件夹」**（第 11 个自绘项 + ICON_FOLDER_OPEN）：直达
  `dataDir + 保存目录/excali-libraries`——下载的 `.excalidrawlib` 往里一放，
  切回思源即热刷新自动合并（上文修复二的能力）
- **导入对话框「选择本地文件」升级**：桌面端优先走主进程 showOpenDialog
  （初始目录 = 素材库文件夹、只列 .excalidrawlib），选中即 fs 读出转 Blob 喂
  updateLibrary；非桌面端回落原 DOM input
- **下载 → 入库的两条主路径**（都不经浏览器跳转，零拦截）：① 库站点 Download →
  浏览器下载栏把文件**拖进白板画布**（vendor 原生支持 .excalidrawlib 拖入，合并 +
  打开面板 + 落盘）；② 下载时另存到素材库文件夹（☰「打开素材库文件夹」直达）→
  切回思源热刷新自动合并
- 门禁：32 文件全绿（新增 desktop-bridge.test.mjs 7 例）；tsc 干净、四包重新落盘

**素材库动作归位（2026-10-19 午后：三项从 ☰ 迁入素材库面板 ⋮ 菜单）**

- 用户口径：素材库的动作就该住在素材库自己的菜单里——「打开、保存到…、重置素材库」
  那个 ⋮ 下拉，☰ 主菜单不再保留
- **vendor 无扩展点的实证**：LibraryMenuHeaderContent.tsx 的 renderLibraryMenu()
  把「打开/保存到/重置/发布」四项写死，组件不收自定义项（LibraryMenuControlButtons
  只是个按钮容器）——注入是唯一路径
- **DOM 注入器**（`library-menu-inject.ts`）：MutationObserver 盯 body，vendor 的
  ⋮ 菜单一打开（`.dropdown-menu.library-menu` 才渲染、关闭即卸载）就 prepend
  一组分隔线 + 三项（导入素材库… / 刷新素材库 / 打开素材库文件夹）；按钮完全
  复用 vendor 菜单项样式类（dropdown-menu-item…）与 LineIcon 同款 SVG，视觉
  与内置项一致、图标跟主题；点击执行回调后向 document 派发 Escape——vendor
  的 DropdownMenuContent 在 keydown capture 里吃 Escape → onClickOutside 收菜单
- **☰ 菜单瘦身**：StudioMenu 撤三项（11 → 8 个自绘项），actions 逻辑原样搬进
  StudioApp 的注入 effect（actions getter 每帧现取，保存目录/桌面端能力变了跟手）
- i18n 无新增键（注入项复用既有三键）；门禁 32 文件全绿、tsc 干净、引擎包重新落盘

**第三十九轮（2026-10-19，AI 绘图 E：风格包注册表，批量出图固定风格）**
- 用户口径：「假如我想固定风格从而可以批量生成对应内容，该怎么固定绘画风格」→ 拍板
  方案 A（风格包注册表）：风格是**数据不是代码**，一个 JSON 只写「与基线的差异」，
  三条通道（内置智能体 / 内核工具与 MCP / CLI）用同一个包名引用同一份视觉
- **`preset.ts` 从三张死表变成注册表**：`PLAN_PRESETS` 只剩内置三套，新增
  `registerStylePack` / `hasStyle` / `styleBaseOf` / `styleNames` / `presetOf`。
  外部包**懒解析 + 缓存**（注册即清缓存），好处有三：加载顺序无关、改基线自动跟随、
  `extends` 链成环时才报错（`style:circular-extends`，链长上限 8）
- **新 token 两类**：`space`（12 个版面尺寸：`minW/minH/padX/padY/gapX/gapY/gridGapX/
  gridGapY/radialMinRadius/radialGap/maxGridCols/textWrap`）把 `layout.ts` 里的一堆历史
  常量降级成 `DEFAULT_SPACE`；`groupColor`（`mode: hash|roles` + `roles`）让固定分组
  永远拿固定底色，同角色不随插入顺序漂移
- **`src/studio/ai/style-pack.ts`（新）**：`parseStylePack` 只校验「写了的字段」，未知
  字段忽略（以后加 token 不破坏旧包）；`loadStylePacks(io, dir)` 只吃注入的
  `{list, read}`，**每次绘图前重读目录**（包是用户手改的 JSON，缓存会吃到过期配色）。
  坏包只丢这一条 warning，其余包与内置照旧可用；包名走 `slugStyleName` 归一
  （空格/下划线→`-`），超长**拒绝而非截断**——静默截断会让两个长包名撞成一个键
- **磁盘口径**：`data/assets/excali-styles/*.json`；CLI 另给 `--style-dir`（绝对路径可读
  插件自带示例），`--style` 与 `--preset` 同义、优先 `--style`，`--list-styles` 只列风格
- **零漂移是硬约束**：不写风格包时产物逐字节不变，回归用例把 `width 160 / height 90 /
  gap 110 / title 28` 钉死；`styleWarnings` 一律附加在结果 JSON 里，不改既有字段
- 示例包随 Skill 发布：`script/excali-draw/styles/axl-poster.json`（海报暖纸，
  extends marker）、`study-card.json`（学习卡，extends pencil + hachure + roles 定色）
- 测试：31 文件全绿。`style-pack.test.mjs`（新，11 例）盯差异继承不污染基线、子集合并、
  坏包隔离、`space` 真进布局、`roles` 同角色同色、无 style 回归、`diffOf` round-trip、
  环形 extends、包名口径；`ai-cli.test.mjs` 加 3 例（`--list-styles` 目录口径、
  `--style` + `--style-dir` 进产物与未知包报错含清单、坏包容错只多 warning）；
  `ai-wiring.test.mjs` 加内核接线与示例包两例，并把「preset 不许再写死 enum」钉成契约
- 未做（按 demo 范围收敛）：母版白板（B）、脚本积木（C）、设置面板里的风格选择器；
  `diffOf(name)` 已导出，接 UI 时与 CLI 同 schema，不必再写一份

**第四十轮（2026-10-19，白板卡片：画布上放一块「可点开的白板」）**
- 用户口径：「白板库里的 excali 文件能不能放进画布做成链接，点了就跳过去」。研究
  Obsidian Excalidraw 2.29 的结论先立住：它拖进去的默认动作是**落一条文本链接**
  （`[[路径]]`），真·交互嵌入是另一条命令（`insertEmbeddableToView`）——所以本轮
  只做「卡片 + 链接」，不碰嵌入
- **协议在 `board-lib.ts`**：一条链接三种写法——`ref`（`assets/excali/x.svg`，人读、
  卡片副标题）、`link`（`siyuan:excali/<逐段 encodeURIComponent 的 ref>`，写进元素
  `link` 字段随 SVG 存盘）、`path`（`/data/…`，宿主读写盘）。判据即「能不能当白板打开」：
  必须 `.svg`、**排除备份档**（`.bak1.svg` 不该变成卡片）、不含 `..`；文档链接
  `siyuan:doc/` 与白板链接互不吃串（各有回归用例钉住）
- **卡片是三个普通元素**（新 `board-card.ts`）：圆角矩形（带 `link`、`roughness: 0`、
  按明暗两套固定配色）+ 标题（最多两行，超长截断加 `…`）+ 路径（一行），三者同
  `groupIds` 整体拖动。只有矩形带链接，所以 vendor 的 ↗ 徽标只出一枚；`link` 字段
  本来就随 scene 序列化，**没有新增任何持久化格式**
- **四条入口，落点各按场景**：dock 行直接拖进画布（自定义 MIME
  `application/x-siyuan-excali-board` 带 ref + 行上显示名，顺带一份 `text/plain` 路径，
  拖去别处落下仍是可读路径）；行右键「插入到当前画布」（不依赖拖，落视口中心，
  没有活动画布时提示而非静默）；「插入白板卡片」（复用「打开白板…」的选择器，抽成
  `pickBoardRef` 一条链路；第四十一轮起这一枚从 ☰ 搬进右缘竖条与脚本库）；粘/拖进来的是
  库内路径 → 自动转卡片（`boardRefFromText` 认路径 / `/data/…` / `[[…]]`，多行文本与
  库外 svg 一律不转）
- **点开的两条路**：↗ 徽标走 vendor 的 `onLinkOpen`（第二十六轮 T6 的 `siyuan:` 通道原样复用）；
  ⌘/Ctrl 点整卡是自绘命中测试——捕获阶段只听 `HTMLCanvasElement`（工具条、素材库面板、
  脚本竖条都是 DOM，不会误触），命中卡片包围盒才 `stopPropagation` 交回宿主。宿主的
  `openLinkedBoard` 先 `fileExists` 再开页签（`openExisting` 自带去重聚焦），文件被改名/
  删掉时提示「这块白板已经不在了：路径」，不做无声失败
- 未做（拍板时明确砍掉）：Shift 拖静态预览图（快照会过期、还会把位图灌进 scene）与
  真·交互嵌入（embeddable 路线，工程量另算）
- 测试：33 文件全绿。新 `board-link.test.mjs`（16 例）分三段——协议（可逆 / 串台 / 结构判据 /
  目录判据 / 文本转卡片 / 拖拽载荷）、卡片几何（元素形状、截断、命中盒内盒外）、接线契约
  （dock 写 MIME、画布读 MIME、⌘ 点分发、宿主验存在、分层不越界）+ 词条双语

**第四十一轮（2026-10-19，画布动作：内置能力也住进右缘竖条）**
- 用户口径：「把插入白板卡片放进右边侧边栏，让它成为脚本库里的一个功能，共用那颗钉子；
  左边菜单这一项挪到右边」。研究 Obsidian ea-scripts 后的结论：**能钉进竖条的不止脚本**——
  插件自带的「画布能力」（需要 React 侧画布 API + 宿主选择器的那类）该是第二类条目，
  与脚本共用交互、各走各的执行通道（方案 B，另两案见当时的调研）
- **为什么不伪装成一条 `.md` 脚本**：脚本由内核 goja 执行，拿不到 `getSceneElements` /
  视口中心 / 「挑一块白板」的宿主选择器；固定清单还要靠 `listScripts()` 解析标题，用户
  改名或删掉那个文件，功能就跟着没了。所以「能力」与「脚本」分成两类，元数据放新
  `src/studio/rail-actions.ts`（纯数据 + 只依赖 `menu-icons.ts`：id、i18n key、图标路径）
- **设置多一个键**：`pinnedActions: RailActionId[]`，默认 `["insert-board-card"]`。归一的
  关键区别——**键缺失回落默认**（老 `data.json` 升级即看得见，撤掉 ☰ 入口才不留空），
  而**显式空数组原样保留**（那是用户自己取消固定的结果，被默认值回填就等于固定不住）；
  未知 id 丢弃、重复去重、保序
- **共用一颗钉子、一份广播**：`SCRIPT_PIN_EVENT`（`script-pin.ts`，第三十四轮）不新增事件名，
  `refreshPinned()` 一次重拉两份清单；竖条里动作排在上、用户钉的脚本排在下，右键菜单
  「从侧边栏取消固定」按 `kind` 分流；脚本库面板顶部新增「画布动作」小节（`.exs-picker__group`
  分组标题），行结构照抄脚本行 → 样式零分叉，就地刷新固定态抽成 `markPinned`（原本三处
  抄了同一份 toggle）
- **两条执行通道是刻意的**：竖条那枚按钮在本画布里跑 `insertBoardCardFlow`（页签活动态
  未必等于竖条所在画布，绕宿主会插错板）；脚本库面板那行交宿主 `activeActions()` +
  `pickBoardRef()`，与点脚本同口径，没有活动画布时提示而非静默
- **☰ 菜单从九项变八项**：「插入白板卡片…」整条撤除（含 `onInsertBoardCard` 回调通道与
  图标 import）。可达性由 ☰「运行脚本…」→ 脚本库 →「画布动作」保证，且这条链路在竖条
  收起或让位给 vendor 侧栏时照样走得通
- 测试：34 文件全绿。新 `rail-action.test.mjs`（9 例）——元数据自洽与归一真跑、分层红线
  （`rail-actions` 不 import siyuan/React/i18n、消费方按 id 查表不抄第二份）、竖条排序与
  分流、画布本地通道、宿主落盘 + 广播、面板小节（**动作分支必须排在脚本分支之前**，
  因为它照抄了 `.exs-script-item` 类名却没有 `data-idx`）、☰ 撤干净、词条双语；
  `menu.test.mjs` 改八项、`board-link.test.mjs` 的 ☰ 断言换成竖条/面板通道、
  `grid-memory.test.mjs` 补 `pinnedActions` 归一

**第四十二轮（2026-10-19，修「竖条插入的白板卡片点了没反应」：落点公式符号错）**
- 用户实测：右缘竖条插入的卡片链接**完全没反应**，同一块白板从库里拖进画布的卡片却能跳。
  先证伪「链接写坏」——两条路都调同一个 `insertCard`，`link` 由 `boardLinkOf` 统一编码；
  再把工作区里那张已存盘的卡片解出来核对：`siyuan:excali/assets/excali/%E8%B5%84%E6%96%99.svg`
  反解回 `/data/assets/excali/资料.svg`，目标存在且是合法白板，协议侧无差别
- **真凶是落点**：`viewportCenter` 写成 `scrollX + width/2/zoom`，而 vendor 的口径是
  `屏幕 = (场景 + scroll) × zoom` ⇒ `场景 = 屏幕/zoom − scroll`（dist 里 `getCanvasCoords`
  与 `viewToScene` 两条实测一致）。符号漏了负号，**偏移量 = 2×scrollX**：画面一平移，
  卡片就落到视野外（那张卡 x=1200 落在全部内容右侧、正好被右缘竖条挡住），用户既看不见
  也点不着，于是表现成「链接坏了」。拖拽那条走 `clientToScene`（符号正确，落点跟指针），
  所以一直好——**两条公式不同源，才让这个 bug 藏了一整轮**
- 受影响的不止卡片：粘贴图片、粘贴库内路径转卡片、☰「嵌入思源块…」、dock 行菜单
  「插入到当前画布」、脚本库里的「插入白板卡片」动作——凡是「落在视口中心」的都跑偏
- **换算抽成纯模块 `scene-point.ts`**（`Point` / `clientToScene` / `viewportCenter`）：原来住
  在 `image-import.ts` 里，那个模块运行时 import vendor 引擎（带 CSS 副作用），node 读不进来，
  所以这两条公式一直没有真数值断言。挪出来才写得动测试
- 测试：35 文件全绿。新 `scene-point.test.mjs` 核心是一条**不变量**——`视口中心 ==
  把画布几何中心那个 client 点换算进场景`，对 5 组 scroll×zoom × 3 种视口尺寸逐一比对，
  再加旧公式值不许出现、脏值（缺 zoom 按 1）不 NaN、以及「公式只有 scene-point 一份」的
  同源检查（画布侧与 image-import 都不许再留第二套）

**第四十三轮（2026-10-20，☰ 菜单放大：C 档尺度）**
- 用户实测：对比原生 Excalidraw 菜单（图片 2），我们的 ☰ 菜单「比例有点小」。量 vendor
  产物 CSS 定基准：原生行 32（`height:2rem`）/ 字 14（`.875rem`）/ 容器 8（Island
  `padding×--space-factor`）/ 图文间距 12 / 快捷键同字号只降透明度；第二十六轮 Apple 化
  压成了 30/13/5/10/11，每一维都小一档
- 三档对照 demo（现状 / 原生口径 / 原生再抬一档）后用户拍板 **C 档**：行 **36** / 字
  **15** / 容器 **8** / 图文间距 **12** / 图标 **18** / 快捷键 **13** / 分组标题 **13**，
  ☰ 主菜单另加 `min-width:256px`；右键菜单同档（36/15/13），两个菜单并看不打架
- 图标 18 是靠 `.dropdown-menu-item svg{width:18px;height:18px}` 盖掉 vendor 的 1rem 压平
  ——之前 LineIcon 传的 size 在菜单里其实没生效；`CustomItem`（切换主题 / 更改画布背景）
  走 `dropdown-menu-item-bare` 不带 item 类，单独补齐 36/15/6px 圆角那套
- `min-width:256px` 只锚 ☰：`:has(input[type="file"])` 的锚是 LoadScene 的隐藏文件框，
  全画布只有它有；库菜单有 vendor 定宽 196，另加 `:not(.library-menu)` 双保险。描边粗细 /
  字体列表等其它下拉**不吃这个宽度**，只跟着尺度走
- 测试：35 文件全绿。`apple-ui.test.mjs` 新增 C 档尺度锁（源码 + 根产物双侧比对，
  归一化要剥空格、属性选择器引号和末分号——minifier 三样都动）

**第四十四轮（2026-10-20，AI 通道面板 + 四道门）**
- ☰ 菜单新增「AI 通道…」（排在「运行脚本…」之后、「帮助」之前）：打开一张居中浮层，
  四条通道（思源内置智能体 / 内核 MCP / 无头 CLI / 脚本体系）各一行——标题 + 一句话用途 +
  工具名徽标 + **门语义** + 可复制的调用示例 + 胶囊开关。文案单一真源在
  `src/studio/ai/channels.ts` 的 `CHANNEL_META`（title/desc/gate 都是 i18n key），
  面板只做渲染，改门语义必须先改这张表——测试盯着「组件里不许抄第二份」
- 开关落 `settings.aiChannels`（`{agent,mcp,cli,script}`，归一口径同 pinnedActions：
  缺键默认全开、显式 false 保留）。三条运行时都能读到同一份：宿主在内存、内核走
  `siyuan.storage.get("excali-studio")`、CLI 直接读 petal 文件（**不带 .json 后缀**，真机实测）
- **四道门的语义天然不同，面板如实标注、不许诺做不到的事**：
  - `agent` = **注册门**：宿主 onload 里早退，关 = 四能力不注册；改完要重载思源才见效，
    所以只有这一栏翻转时弹「需重载」提示
  - `mcp` = **调用门**：goja 的注册在前端管不到，工具始终在列表；四个 handler 统一走
    `settingsForCall()`，关 = 调用被拒并回「内核 MCP 通道已在「AI 通道」面板里关闭」
  - `cli` = **软门**：外部进程拦不住读代码，`create`/`append` 落盘前读设置拒写；
    `list` 与 `--dry-run` 不拦，读不到/解析失败视为开启（拦不住别把 CLI 打死）
  - `script` = **入口门**：纯前端，`openScriptPicker` 与 `runScriptOnActiveBoard` 成对拒开
    （竖条/脚本库/右键全走这条唯一执行口，一句提示两处共用）
- 样式走 `--exs-*` token：底是 fixed 全屏 + 毛玻璃（不动画布布局，零位移原则），开关
  40×24 胶囊、关态徽标划线，明暗两套同构；Escape 走捕获层（画布快捷键不抢）
- 测试：36 文件全绿。新增 `ai-channels.test.mjs`（归一真跑 + 分层红线 + 四道门契约 +
  i18n/样式对账）；`menu.test.mjs` 的 ☰ 项数契约 8→9 并锁「AI 通道…」的位置
- 真机冒烟（CLI 临时工作空间）：默认 create 落盘成功 → 写 `aiChannels.cli=false` 后
  create 被拒（退出码 1）、list 与 --dry-run 照常

**第五十四轮（2026-10-22，白板库「一块板一个文件」：备份链退役 + 落盘等价门 + 主题槽位不再互踩）**

问题（用户实测）：每次重新打开白板，保存目录就多出一份文件。三件事叠在一起：

1. **备份链本身**（第十九轮设计）：每次覆盖保存滚 `.bak`/`.bak2`/`.bak3` 三份。真实库里
   23.5MB 资源有 20.8MB 是备份档——占位的正是它。
2. **「打开没动」也算改动**（抖动①）：T4 双主题背景把 `viewBackgroundColor` 分别写进
   `excaliLightBg`/`excaliDarkBg`，但 vendor `restore()` 会把这两个自定义键从 appState 里
   剥掉，于是落盘时「另一主题的槽位」看不到旧值——亮色设过的 A 被暗色那次保存洗成空，
   重开又是另一份 appState，逐字比较永远不等。
3. **归一化差异永远逐字不等**（抖动②）：`boundElements: null` 读回来是 `[]`、缺省键被补齐、
   键序被重排。防抖自动保存一到期就把「内容其实没变」的文件重写一遍，顺带滚一次备份链。

拍板（用户选项）：**彻底关掉文件备份**、**存量 `.bak` 全部删光一档不留**、**两项抖动都修**。

- **写侧删干净**：`writeBackup` 从前端（`storage.ts`）、内核（`kernel/io.ts`）、无头 CLI
  （`scripts/excali-board.mjs`，连 `--no-backup` 一起）三处删除；设置项 `keepBackup`
  从类型、默认值、归一化白名单和设置页移除（老 settings.json 的残键静默丢弃）；
  两份 i18n 各删「覆盖前留备份」标题与说明两个键（键数保持对齐）。
- **读侧刻意留着**：插件已发布，别人库里还有存量链条。`BACKUP_KEEP`/`backupPathOf`/
  `backupChainOf`/`isBackupPath`、`listBoardEntries` 排除备份档、解码失败页「从备份恢复」、
  重命名把链条搬走、删除计划 `plan.bakPaths` 逐档清扫——一套都不动，只是不再产生新档。
- **等价门（`scene-codec.ts`）**：`sceneSemanticsOf` 把载荷规范成排序键、剥掉 `null`/`undefined`
  和空 `boundElements` 的 JSON 串；`sceneTextsEquivalent` 先逐字短路，再比语义，
  **任一侧解不出都算不等**（宁可多写一次，不许把能救的档当等价吞掉）。
  前端 `saveSvg` 与内核 `writeSvg`、CLI `append` 三条落盘口同口径。
- **主题槽位修好（`theme.ts`）**：`withThemeBgSlot(appState, mode, slots)` 第三参是打开时读到的
  槽位——vendor 剥掉的另一主题键从这里带回来；`StudioApp.flush` 传 `bgSlotsRef.current`。
  只有当前主题的槽位被写，另一主题的槽位原样保留；两边都空则不落键（与 `persistableAppState`
  剥空串同口径）。
- **存量清理**：删前逐块验主文件能解码且元素非空（25 份备份全删，15 块主板完好），
  一次回收约 20MB。
- 测试：47 文件全绿。`scene.test.mjs` 加语义门运行测（归一化等价 / 真改动不等 / 解不出不算等）；
  `media-ref.test.mjs` 加「vendor 剥键后另一主题槽位从 slots 带回」；`storage.test.mjs` 换成
  `renameSvg` 搬链不生新档；`board-lib.test.mjs` 两条备份断言改成「写侧无 `.bak`、读侧留存量」；
  `ai-cli`/`ai-wiring`/`kernel` 三处按新契约改写（CLI 回 `unchanged` 字段代替 `backup`）。

**第五十五轮（2026-10-22，演示模式：画框当幻灯片 + 有向图导航 + 打字机）**

对标调研 Obsidian Excalidraw Slideshow 脚本与 Advanced Canvas 的演示内核后拍板：**片单 = 画布上的
画框**，不新增元素类型（vendor 的 frame 本来就是「一块有名字的版面」，用户框选即得页）。

- **纯逻辑层拆开**：`presentation-plan.ts`（画框→片单、页序/排除元数据换算）、
  `presentation-graph.ts`（画框间箭头→有向图）、`presentation-nav.ts`（沿边走）、
  `presentation-run.ts`（逐条出场计划）、`presentation-typewriter.ts`（逐字放）——
  五个模块都不 import React / 思源 / vendor，node 侧直接跑单测。
- **元数据落点**：`frame.customData.presentation`（vendor 官方透传 customData、restore 原样保留），
  不新增元素字段、不进注册表。
- **页序口径**：没动过排序 = 按阅读顺序（先上后下、同行先左后右，`DECK_ROW_TOLERANCE=60`）；
  第一次显式排序才给每页写 `order`。⇒「画完就能放」，排过序的板子不因改画框名/挪位置跳页。
- **有向图导航**：节点=画框，边=画框之间的箭头。边识别走双通道（引擎绑定 + 几何判定端点落框内）；
  出边排序=有 label 的在前并按字母序；选边=第一条没走过的，全走过退回最后一条（成环）。
  后退沿访问栈弹回。**没有箭头时线性兜底**（片单顺序），零配置体验不受影响。
- **放映不隐藏整页内容**：只对「本页逐条出场还没轮到」的元素做 opacity 显隐；非当前页成员一律
  不碰（靠相机把它移出视口）。画框框线/名字靠
  `appState.frameRendering={enabled:false,name:false,outline:false,clip:false}` 消除，退出按快照还原。
  **绝不再用「画框 opacity 压 0」**（那是「放映全空」的根因）。
- **打字机**：只改 `element.text`，不碰 width/height/originalText（0.18.1 用 `text` 当显示内容、
  `originalText` 当换行与尺寸的度量源——截短 text 不会让文本框塌缩，帧间无抖动）。绑定文字
  （containerId != null）一律跳过。按字素切分（Intl.Segmenter）不按 UTF-16 码元，emoji/组合音标不劈开。
- **相机口径**：`scrollX = vw/(2*zoom) - cx`（**减号在前**，写成 `cx - vw/(2*zoom)` 会互为相反数 ⇒
  镜头飞到画布另一侧）。可用宽高要减掉 canvasOffsets 的 left/right/top/bottom。
- **产物归属**：StudioApp / overlay / 演示面板 / 文本折叠圆点都打在 `dist-engine/engine.js`，
  不是 `dist/index.js`（index.js 只有脚本库/picker）。grep 验证落盘别找错包。

**第五十六轮（2026-10-22，文本折叠：Notion 式折叠列表）**

- 形态：画布上一组垂直排列的元素，最上的当「折叠头」，其余收进它的 `excaliToggle` 字段；
  折叠头左侧由 `TextFoldOverlay` 画一个圆点控制钮（对标 Obsidian Canvas Folding 的 − 控制点）。
- 与 frame-collapse 的分工：frame 折叠面向「整块场景收放」，本模块面向「列表收放」——容器是
  普通元素（通常是文字），不占画布结构。
- 数据形状：折叠态 `{collapsed:true, elements:[成员深快照]}`；展开态 `{collapsed:false, memberIds:[]}`
  （再折叠按 id 收）。引擎 restore 的 `...element` 展开保证往返。
- 已知边界（与 frame-collapse 一致）：快照成员回传走 makeElement 重建，成员自带的自定义字段
  （如 `excaliRecipe` 配方）不保留；文本/位置/字号/字体无损。还原成员的 index 重置 ⇒ z 序被推到
  最上层（列表场景元素不重叠，无感）。

**第五十七轮（2026-10-22，多画板 radio 互斥串扰修复）**

- 根因（vendor 0.18.1 源码 + Chrome 实测双重坐实）：vendor 把形状工具渲染成**原生 radio**
  （`ToolButton type="radio" name="editor-current-shape"`），`name` 是**硬编码常量**（只有 `id`
  才带实例 id `${excalId}-${props.id}`），而 HTML radio 分组**只看 name**、跟属于哪个 React 树/
  哪个画板毫无关系。⇒ 开多个画板页签时，同 document 里出现多组同名 radio：A 点点箭头 → 浏览器
  按互斥规则取消 B 的选中 → B 的受控重渲染又把 checked=true 写回 → 反手抢掉 A 的选中，两个实例
  互相踩 ⇒ 高亮来回跳。高亮是纯 CSS 伪类驱动（`.ToolIcon_type_radio:checked + .ToolIcon__icon`），
  DOM 的 checked 一被改掉背景立刻消失。
- 修法：`radio-isolation.ts` 给每个画板实例分配独立的 radio `name`（`name` 实例唯一化），
  保留 vendor 原有 class 结构（`:checked` 选择器仍命中），不动 vendor 源码。
- 复现口径：开 ≥2 块白板 → 在任一块点形状工具 → 另一块的选中态**不许**跟着变。

**第五十八轮（2026-10-22，移动端画板壳）**

- 根因：思源移动端前端**没有自定义页签**——`Plugin.addTab` 是空实现、`window.siyuan.openTab`
  也是空函数。桌面那条「注册页签模型 → openTab(custom)」在 iPad 上静默什么都不做，表现是白板
  文件已建好、画板永远不出现。
- 修法：`mobile-studio.ts` 用宿主自己的全屏浮层承载同一套 StudioApp——仍复用 tab.tsx 的
  `attachStudioTab`（引擎 chunk 里），只把 Custom/Tab 换成最小可用替身：element = 浮层内容区、
  tab.headElement = 浮层标题栏、tab.close = 拆浮层。关闭冲刷、脏点、重命名跟标题、动作注册
  这些既有链路一条不用改。
- 约束：该模块必须留在宿主 bundle——**不能 import tab.tsx 的运行时**（会提前拉进 8MB 引擎）。

**第五十九轮（2026-10-22，AI 计划布局：正交避障走线 + 源点下沉 + 按词换行 + radial 多圈）**

- 根因（走线）：`routeEdges` 只看起止两个盒，固定走「中点折一次」的三段折线，路上有什么
  一概不管——跨层的线直接穿过中间层节点；层内又按输入顺序排，交叉没人收拾。
- 修法：新增 `ai/route.ts`。全图共用一张稀疏网格（障碍边界 + 节点中线 + 相邻线的中线），
  出入桩点恰好落在网格上，障碍判定只预算一次；每条边跑 A*，代价 = 长度 + 拐弯 + 走在已有
  线上的长度。起止边先试朝向对方的 2×2 种，不通再试 16 种，仍不通才退回旧折线。同一个口
  尽量不既进又出（同向汇流允许）。短边先布，输出仍按计划边序（`edge-N` 编号不变）。
- 标签放在最长一段上，避开节点与已放的标签。
- 上下（左右）相对、另一轴上有可落线重叠的两个节点直接一条直线，线放在重叠区中点；矩形避开两端圆角，
  菱形/椭圆只认中线（只有那里碰得到外框）。中心差十几像素时不再多出一个小台阶。
- 分层：没有入边的节点下沉到最近后继的上一层，不再顶在第 0 层拖一根跨层长线；层内用重心法
  上下各扫两遍（稳定排序，重心相同时仍按输入顺序）。
- radial：以前所有叶子挤在一圈、半径不看个数，12 个以上就互相重叠（重叠的节点之间根本没路
  可走）。现在按「相邻弦长 ≥ 节点对角线 + 间距」定每圈容量，放不下开外圈；外圈只用从中心
  直线看得见的方向（采样后贪心挑），挑不齐就把这一圈推远 15% 再试。radial 的线优先直线放射，
  被挡住才走正交。
- 换行（`wrapTextByWidth`）：以前逐字断，「Excali tools」断成「Excali t / ools」、「3.8.8」断成
  「3.8 / .8」。现在中文逐字、其余按词，只有单词本身超宽才逐字断；行首行尾空格不保留。
- 性能（上限 40 节点 / 80 边）：lr/tb/grid ≈ 150–200ms，radial ≈ 350ms。
- 测试：`test/ai-route.test.mjs`——不穿节点（含上限规模四种布局，斜线按真正的线段/矩形相交判）、
  源点下沉、进出口分离、边序不变、标签不压节点、radial 不重叠且放射为直线、按词换行。

**第六十轮（2026-10-22，计划 DSL 的可选布局提示：rank / order / groups）**

- 动机：自动布局只能猜。模型知道「这两个是一组」「网关必须在中间那层」，以前没法说；能说的只有
  坐标，而坐标恰恰是 DSL 不让模型碰的。所以补的是**意图**，不是坐标。
- `node.rank`（lr/tb）：钉层，在源点下沉之后最后生效。grid/radial 写了会在 `warnings` 里说明被忽略。
- `node.order`：层内（grid 是格子、radial 是环上）的先后，与位次比较；平局时写了 order 的在前，
  所以 `order: 0` 就是「排第一」。
- `groups`（`{ 组名: 标题 }` 或 `[{ id, label }]`，组名对应 `node.group`）：列出的组画框，同组节点
  在层内挨着放（整组落在组内最靠前成员的位次上）。框是**事后量出来的**，不推开别的节点；包住了
  非成员、或两个框相叠，就在 `warnings` 里点名，提示用 rank/order 调整——宁可报出来，也不悄悄
  画一张框错的图。只写 `node.group`、不列进 `groups` 的组照旧只上底色，行为与以前一致。
- 框的画法：透明底、虚线、圆角的普通矩形 + 左上角标题，排在节点前（z 序在下），与成员同一个
  Excalidraw 组（拖整组时框跟着走）。不用 Excalidraw frame：frame 会裁剪并接管子元素，事后编辑别扭。
- 有框时层间距自动撑开（容下上一层框的下沿 + 下一层框的标题行）；框的标题与四条边线进标签避让，
  连线标签不会压在虚线上。框的标题在成员上方，坐标会为负，布局最后整体平移回左上角 = 0。
- 写错的提示（rank 非整数、order 非数字、groups 指向没人用的组）只记 `warnings`，不整单失败。
- schema：内核 MCP 工具与前端智能体的 `plan` 都加了 `groups` 与 `nodes` 的字段说明（i18n 两份同步）；
  `script/excali-draw/SKILL.md` 补了用法与示例。
- 测试：`test/ai-hints.test.mjs`——不写提示时布局不变、rank 钉层、order 排序（层内/grid/radial）、
  框包住成员且在节点下层、框不与标题重叠且坐标非负、标签不压框线、包住非成员时报 warning、
  错误提示只记 warning、数组写法。

**适配**

- 跟随思源明暗主题；可选「画笔颜色跟随思源强调色」（只影响新建画板第一笔的默认色）
- **双主题背景（第二十六轮）**：画布背景按明/暗各存一份（载荷槽位 `excaliLightBg` /
  `excaliDarkBg`），切换思源主题时画布背景跟着换、下次落盘写进当前主题的槽位；
  没设过的主题保持「跟随主题默认」
- **空画板引导画面**（默认开）：纸飞机（`min(320px, 26vh)` 见方，虚线尾迹圈）**中心落在画布约
  1/3 高度处**（参照 Obsidian Excalidraw 那把剑的构图，实测其 logo 中心 ≈ 31%），下面依次是四行
  上手提示与三个入口——帮助（`?` 弹窗）、「按路径打开…」、「新建白板」（带平台快捷键）。
  用 Excalidraw 官方 `WelcomeScreen` 组件树挂进画板，出现/消失由 App 判定：
  空板 + 选择工具 + 非禅模式才显示，**落第一笔即消失**，不进 scene、不会被存进 SVG
- 插件 UI 中英双语（`i18n/`，中文原文即 key）；画布 UI 跟随思源语言（zh/en 映射
  Excalidraw 语言包，其余回落英文）
- **画布 UI 全中文**：上游 zh-CN 包与 en 包有 91 处键差（快捷键列表、画布/元素右键菜单、
  命令面板、字体选择器、协作者列表等，查表时缺失键会回落英文），构建期由
  `scripts/excalidraw-zh-cn-patch.mjs` 打补丁补齐（机制见「已知取舍」）
- 移动端：`plugin.json` 声明 `mobile` / `browser-mobile`，页签形态在移动端同样可用；
  触屏手势与双指缩放由 Excalidraw 自带（实机未验，见文末清单）
- 设置页（插件自带 `openSetting`）：保存目录、画笔颜色跟随思源强调色、空画板引导画面开关、默认显示网格、白板文档目录、新建时自动建档、打开白板文档时自动进入画板、白板体检按钮；最近打开在顶栏右键菜单里（第五十四轮删掉「覆盖前留备份」——备份链已退役，设置项 `keepBackup` 一并从模型与归一化白名单里去掉，老 settings.json 里残键会被忽略）
- 斜杠命令执行后会清掉留在正文里的 `/白板` 半截文本，且**走思源事务**
  （补发一个 `input` 事件让撤销栈与落盘都认这次删除）


---

## 目录

```
src/index.ts                 插件入口：入口注册、块菜单、设置页、状态持久化、保存/建档编排
src/i18n.ts                  中文原文即 key，缺失回落中文
src/index.css                插件样式：dock / 选择器 / 导出框 / 引导画面 / 解码失败页
src/siyuan/doc.ts            文档侧（存档层）：活跃编辑器推算、追加图片块、破缓存、块元素→svg 判定、removeDoc
src/siyuan/ExcaliDock.ts     左 Dock 面板：纯白板库，原生形态复刻 kmind-zen（block__icons 头 + b3-list 行；只认 DockHost 窄接口，零 siyuan import）
src/siyuan/board-picker.ts   「打开白板…」选择器：文件名搜索 + 修改时间 + 已打开角标（第十三轮）
src/siyuan/script-store.ts   白板脚本存储：assets/excali-scripts/*.md（H1 标题 + 代码围栏）
src/siyuan/script-runner.ts  脚本运行器：new Function + ea 注入，console 收集进运行结果
src/studio/board-list.ts     选择器纯逻辑：时间文案 + 关键字过滤（node 可直接单测）
src/studio/board-lib.ts      白板库纯逻辑：文件↔文档绑定 / 显示名 / 库指纹 / 删除计划 / 存量备份链（第十七、十九轮；第五十四轮起只服务读侧）
src/studio/scene-dirty.ts    脏判定的场景指纹（零依赖，node 可直接单测；第十五轮取代「收到回调即脏」）
src/studio/assets.ts         离线字体基址
src/studio/icons.ts          addIcons 的 symbol 与斜杠项 html（两处共用同一个图标 id）
src/studio/theme.ts          思源明暗主题读取/订阅 + 强调色读取
src/studio/scene-codec.ts    纯解码器：SVG 文本 → 内嵌 scene（零 vendor 依赖，可单测）
src/studio/scene.ts          解码 + Excalidraw restore 归一化（修绑定等）
src/studio/svg.ts            scene → 内嵌 scene 的 SVG 文本（带标记自检）
src/studio/storage.ts        putFile/getFile 落盘、存量备份链（读侧）、重名避重与路径归一
src/studio/settings.ts       设置模型与归一化
src/studio/welcome.ts        引导画面数据层：手绘纸飞机路径常量 + 菜单行小图标
src/studio/hotkeys.ts        快捷键文案（menuShortcut 走 Cmd+/Ctrl+，boardHotkey 走符号：那列只有 3rem）
src/studio/line-icon.tsx     自绘线性图标渲染器（引导画面与 ☰ 菜单共用）
src/studio/menu-icons.ts     ☰ 菜单自绘项的图标路径（24 网格、绝对坐标）
src/studio/StudioWelcome.tsx 引导画面：官方 WelcomeScreen 组件树（Logo/Heading/Menu）
src/studio/StudioMenu.tsx    ☰ 主菜单：整棵替换 vendor 默认菜单，插件动作接在这里
src/studio/tab.tsx           页签宿主：panelElement 挂 React 树、loading/错误态、✕ 拦截与关前冲刷、脏点
src/studio/StudioApp.tsx     画板宿主：保存/导出/重命名编排、⌘S 与 ⌘⇧E、图片导入、主题与图库
src/studio/board-actions.ts  画布动作窄接口：save / getEaHandle / flush 三个方法（第二十轮瘦身）
src/studio/ea-api.ts         ea 脚本 API（ExcalidrawAutomate 最小子集，命名对齐）
src/studio/ea-handle.ts      EaBoardHandle 工厂：把 vendor imperative api 包成脚本画布句柄
src/studio/ea-element.ts     ea 元素工厂纯函数（可 node 单测）
src/studio/ai/plan.ts        AI 绘图计划 DSL：松散输入归一化、上限、PlanError/warnings
src/studio/ai/layout.ts      计划布局：lr/tb/grid/radial、源点下沉 + 层内重心排序、radial 多圈（间距读 preset.space）
src/studio/ai/route.ts       走线：共享网格上的正交避障 A*、radial 直线放射、标签避让（第五十九轮）
src/studio/ai/preset.ts      风格注册表：内置 pencil/marker/blueprint + 外部包（extends 懒解析）
src/studio/ai/style-pack.ts  风格包 JSON：校验/注册/目录加载（data/assets/excali-styles）
src/studio/ai/render.ts      计划 → 元素 specs/节点 id/路线/包围盒（前端与 CLI 共用）
src/studio/ai/headless.ts    无 DOM/canvas 场景构建 + SVG 编码（CLI 用）
src/studio/ai/imagegen.ts    位图生成：OpenAI 兼容 images API、b64/url 解析、格式嗅探（前端与内核共用）
src/studio/ai/proxy.ts       前端 forwardProxy 代理（生图请求经思源网络层）
src/kernel/index.ts          内核入口：四工具注册（agent.registerCapability / mcp.registerTool 回退）
src/kernel/boards.ts         内核白板：列/读/画/生图、路径白名单、_0/_1 避重（第五十四轮起不写 BAK）
src/kernel/io.ts             内核文件 IO：/api/file/*、手工 multipart、同内容不落盘的等价门
src/kernel/proxy.ts          内核 forwardProxy（siyuan.client.fetch）
src/kernel/runtime.ts        goja 垫片：atob/btoa/TextEncoder/TextDecoder
src/kernel/state.ts          内核设置读取：storage.get("excali-studio") + normalizeSettings
src/studio/doc-parse.ts      markdown 解析纯函数：标题层级 / 第一个表格 / 缩进列表 / 代码围栏
src/studio/export.ts         多格式导出数据层：PNG/JPEG/WebP/SVG 与各项开关
src/studio/ExportDialog.tsx  导出对话框（React 弹层，挂在 exs-root 内）
src/studio/image-fit.ts      图片长边压缩策略纯函数（2048px，可 node 单测）
src/studio/image-import.ts   图片导入：拖放进画布 / 剪贴板粘贴（落在落点/视口中心）
scripts/copy-dist.mjs        dist + vendor 样式 + fonts → 插件根
scripts/pack.mjs             package.zip 打包（集市上传件）
scripts/excali-board.mjs     外部智能体 CLI：list/create/append（Node 22.6+）
script/excali-draw/SKILL.md  外部智能体绘图技能说明（计划 JSON 契约与并发纪律）
script/excali-draw/styles/   示例风格包（axl-poster 海报暖纸 / study-card 学习卡）
scripts/excalidraw-zh-cn-patch.mjs  zh-CN 语言包补丁：vite 插件 + overlay + --check 自检
scripts/icon.svg             icon.png 的矢量源（品牌紫底 + iconExcaliStudio 同形符号）
```

## 已知取舍

- **包体**：运行时 ≈ 21 MB（第二十六轮起拆双文件，第三十七轮加内核：主包
  `index.js` ≈ 143 KB 插件壳 + `engine.js` 8.39 MB 引擎（首次开画板才加载）+
  `kernel.js` ≈ 95 KB 内核 + `fonts/` 13 MB）。
  `index.js` 大是因为 `inlineDynamicImports` 把 Excalidraw 55 份语言包全内联了
  （它用字面量 glob 映射动态 import，不内联运行时就取不到 chunk）。
- **AI 绘图分三条通道，CLI/Skill 不进 `package.zip`**：① 思源内置智能体走前端四能力
  （`excali_list_boards` / `excali_open_board` / `excali_draw_board` /
  `excali_generate_image`），只对内置智能体可见；② 内核 `kernel.js` 的
  `excali_file_*` 四工具进共享工具表与内核 MCP，外部 WorkBuddy/Qoder 经 `/mcp` 调用；
  ③ 能跑命令的 agent 走 `scripts/excali-board.mjs` + `script/excali-draw/SKILL.md`。
  `pack.mjs` 只打运行时文件，所以集市安装版没有 `scripts/`，SKILL 里已写回退到内置
  能力。CLI 要求 Node 22.6+，与前端共用 `src/studio/ai/` 核心；**白板正开着时不要
  CLI 直写**——画布约 1 秒的防抖保存会覆盖外部写入。内核与前端同时持有同一块板时同理，
  以最后落盘者为准。
- **语言包不裁**：裁掉的语言会回落英文，收益只是 index.js 小几百 KB，不值当。
- **字体不裁**：Xiaolai（中文手绘体）12 MB 是上游按 `unicode-range` **预切好的 209 个分片**
  （每个 60–84 KB），运行时由 Excalidraw 的字体监听按用到的码段懒加载，不整包下载；
  CSS 里没有 Xiaolai 的 `@font-face`（运行时按 `EXCALIDRAW_ASSET_PATH` 注入）。
  二次子集化收益小、缺字风险大，保留原样。对比：同类 `siyuan-embed-excalidraw` 整包 32 MB。
- **字体子集化 worker 跑在主线程**：`subset-worker.chunk.js` 依赖 `import.meta.url`，
  单文件 CJS 产物里拿不到，Excalidraw 自身有 try/catch 回退；功能不受影响、导出稍慢。
- **页签而非弹层**：画板挂在思源原生页签（`addTab`/`openTab`）的 `panelElement` 上，
  与文档页签并排、可拖动拆分屏。两个边界要知道：
  ① 关闭页签不丢改动（第十二轮起，第二十一轮简化）：点 ✕ 走
  `headElement` 捕获拦截、冲刷落盘后静默关；标签右键「关闭」与 `⌘W` 没有插件钩子，
  由页签 `dispose` 兜底冲刷。确认框只在冲刷失败、或用户主动选「丢弃」时出现（仅 ✕ 路径）；
  ② 同一路径的白板全局去重（连跨分屏也只开一个）靠插件自己的会话表，
  思源自带去重只在同一分屏里找；新建白板固定 `openNewTab: true`，
  否则两张新白板 `data` 相同会被思源并成一张。
- **☰ 主菜单整棵是我们渲染的**（2026-10-16 第六轮起）：`MainMenu` 是包导出的
  `withInternalFallback` 组件，只要在 `<Excalidraw>` 的 children 里放一个非 fallback 实例，
  App 自己的 `DefaultMainMenu` 就返回 null（不会两份菜单叠加）。这替掉旧写法：以前只能
  在根节点捕获阶段拦 Excalidraw 的 Export 项（`data-testid="json-export-button"`）、
  跑完再补发 Escape 收菜单，现在「导出图片… / 重命名 / 帮助」是直接接回调的自有项。
  代价是**四项不再出现**：`Export`（.excalidraw JSON 导出对话框）、`SaveAsImage`（它自己的
  导出框，和我们的重复）、`SaveToActiveFile`（predicate 要 `fileHandle`，embed 下恒 null、
  本来也永不渲染）、以及右上角那条自绘按钮条。JSON 工程文件这条不亏：插件存的 SVG 本身就
  内嵌可再编辑的 scene，**它就是工程文件本体**（第二十轮起保存只走这一条路）。
  点菜单项会自己收起（`menu.itemSelect` → Content 的 onSelect → `openMenu:null`），不用管。
  另：菜单项是 `flex + column-gap`、**没有固定图标列**，所以自绘项必须给图标，否则文字会
  比相邻内置项凸出来；尺寸不用管，vendor 的 `.dropdown-menu-item svg{width:1rem}` 会压平。
- **脏判定只看指纹（第十五轮起）**，两处漏判是明知后接受的，别再"顺手修"：
  ① **脏了不会自动回落**——`⌘Z` 撤回存盘时的内容，页签仍显示脏；要判"撤干净了"就得每帧
  重算指纹，那正是本轮要消掉的开销，而代价只是多存一次无害的内容；
  ② **图片正文不进指纹**（只取 id + 字节数 + MIME），"同 id 换成字节数完全相同的一张图"
  会漏判；画布内没有这条路径（换图必然新增 fileId 或改尺寸），而 base64 是几百 KB，
  放进每帧比较里比原来的每帧 DOM 写还贵。
- **线性图标反制**：思源 `base.css` 有全局 `svg{fill:currentColor}`，而 Excalidraw
  工具栏图标的线性样式（`fill="none"` 等）写在**呈现属性**上，优先级低于任何样式表规则，
  会被灌成实心黑。`index.css` 里 `.exs-root svg[fill="none"]{fill:none}` 拉回来，
  只命中自带 `fill="none"` 的 svg，实心图标（path 自带 fill）不受影响。
- **引导画面的三个边界**：① 开关只在**打开页签时**读一次（与强调色同一口径），改设置不影响
  已经开着的画板，重开页签才生效；② 入口刻意**不用**官方 `Center.MenuItemLoadScene`——它走
  Excalidraw 自己的文件选择器，绕开思源的落盘与插图链路，选了会出现「图在磁盘上、文档里没有」；
  ③ 不挂 `Hints` 的三个箭头（工具栏/菜单/帮助指引），vendor 在移动端用 `display:none!important`
  收掉它们，桌面端思源页签里位置也不准（工具栏是浮层、☰ 是我们自己渲染的菜单）。
  纸飞机的抖点是**离线算好写死**在 `welcome.ts` 的常量里的，不在运行时生成：产物要能 grep、
  画面每次要一样。
- **引导画面的纵向位置靠「顶部百分比留白」**：vendor 的 `.welcome-screen-center` 把**整组**居中
  （飞机在组顶 ⇒ 偏上），改成上下各插一个 `flex:1` 的等分留白又能把飞机中心精确压到画布正中
  （真机反馈「太低」）。最终口径：**顶部留白 `flex:0 0 15%` + 整组 `justify-content:flex-start` +
  下方块 `flex:1 1 auto`** ⇒ 飞机中心 ≈ 画布高 31%（与 Obsidian 那把剑同位），文字永远贴着飞机往下排，
  多出来的空白全落在画面底部。下方块刻意**不写** `min-height:0`：内容装不下时它不缩，
  缩的是顶部留白，文字不会压到飞机上；窗口高 ≤760px 时先隐藏四行提示。
  尺寸 `min(320px, 26vh)` 给**外层 logo div**、svg `width:100%` 铺满——百分比宽度落在
  「宽度由内容决定」的 flex 项上会解析出偏左的盒子（首版飞机偏左就是这个原因）。
- **zh-CN 语言包补丁走构建期改写**：上游 i18n 是自研的——查表
  `WE(当前语言命名空间, path) || WE(英文命名空间, path)`，命名空间 frozen、属主对象可写。
  构建期（vite `load` 钩子）把 zh-CN chunk 改成：已存在的组（labels/helpDialog/stats…）
  在属主对象上原地补键；zh 里**整组缺席**的组（elementLink/search/commandPalette…）
  改写 `export{...}` 追加导出。新增 `index.js` 只多 ~40 KB。上游升级后跑
  `node scripts/excalidraw-zh-cn-patch.mjs --check`：会报告过期键（上游改名）、
  新缺口（上游新增键）与冗余项（官方已补、overlay 在覆盖官方译文）；
  语言包测试也会先红提醒。
- **命令面板（`⌘/`）在 embed 版里是死功能**：上游 0.18.1 的 `CommandPalette` 组件
  存在于 npm 包内，但没有任何渲染入口、也不在包导出表里；`App.onKeyDown` 没有 `⌘/`
  处理器，`⌘P` 只会弹「使用 ⌘/ 打开命令面板」的 toast（zh-CN 补丁连这句一起汉化了）。
  帮助弹窗里「命令面板」一行因此点了没反应。裁决（2026-10-16）：不做替代面板，
  能等价替代的入口本来就有（⌘K 开图库、⌘F 查找、☰ 与 dock 各自收口）。
- **「更多工具 → Generate」是 vendor 硬编码英文**：字符串写死在 `Actions.tsx` 的 JSX 里
  （不是 `t()` 键），语言包级补丁够不到；要动只能改包源或打产物字符串补丁，不值当。
  其余「更多工具」项（画框工具 / 嵌入网页 / 激光笔 / Mermaid 至 Excalidraw）均已中文。
- 导出走 `appState.exportEmbedScene = true`（不是 `exportToSvg` 的形参，`.d.ts` 里也只在
  内部 `scene/export` 声明中可见）。产物必须含 `<!-- svg-source:excalidraw -->` 标记，
  `svg.ts` 缺标记即抛错，避免「提示成功但图不可编辑」。

