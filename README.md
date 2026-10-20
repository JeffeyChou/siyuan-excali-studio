# Excali 白板（siyuan-excali-studio）

思源笔记里的自建 [Excalidraw](https://excalidraw.com/) 白板：以 React 库方式集成进插件**原生页签**（非 iframe、非弹层），导出的 SVG **内嵌可再次编辑的场景**——既是正文里能看的图，也是能再次打开的工程图，与 excalidraw.com、集市 `siyuan-embed-excalidraw` 存的老图互认。

## ✨ AI 绘图效果展示

以下作品全部由 AI 通过本插件的结构化绘图管线生成，风格可固化、可复用。

**人生蓝图** —— 放射状思维导图（7 领域 · 34 条目 · 可变粗细笔触）：

![人生蓝图](demo/human-blueprint-preview.png)

**掌控习惯** —— 整页信息图（书籍要点 · 习惯回路表 · 陷阱对照）：

![掌控习惯](demo/atomic-habits-preview.png)

## 功能特性

### 白板核心

- 三个入口进白板：左侧 dock 白板库、顶栏图标、文档右键「最近打开」
- 新建即命名：先弹命名框，空画布自动建档并打开，从第一帧起就归属文件
- 自动保存：停笔约 1 秒防抖落盘，`⌘/Ctrl+S` 立即强存，关页签自动冲刷不丢改动
- 保存位置可自定义（默认 `data/assets/`），页签图标实时显示白板缩略图
- 页签布局记忆，重启思源后恢复原样

### 画布与兼容

- Excalidraw 0.18.1 原生页签集成，跟随思源明暗主题，中文手写字体回落链开箱可用
- 17 款字体：中文小赖体、霞鹜文楷、得意黑 + 多款拉丁手写体
- 导出 PNG / JPEG / WebP / SVG；SVG 内嵌场景，任何时候都能再次编辑
- 直接打开 Obsidian Excalidraw 格式文件（1v1 / 1v2 payload，压缩与空场景容错）
- 图片拖放入画布、剪贴板粘贴；文档里的白板嵌入图点击即开

### AI 绘图

- 结构化管线：plan DSL → 风格包 → 自动布局 → 渲染，一次成图
- 四条通道：思源内置智能体 `excali_*` / 内核 MCP / 无头 CLI / `ea.*` 脚本
- 外部风格包：`data/assets/excali-styles/*.json`（diff-only 继承），内置 pencil / marker / blueprint 三预设
- 素材库：官方组件面板 + 自建组件本地持久化 + 磁盘变更热刷新

### 进阶：脚本引擎

- 脚本即文档：`data/assets/excali-scripts/*.md`，`ea` API v1（约 40 个方法）
- 文件头 `@excalidraw-onload` 的脚本在画布就绪时自动运行

## 快速开始

1. 思源集市搜索「Excali 白板」安装；或从 [Release](https://github.com/LongDarkroom/siyuan-excali-studio/releases) 下载 `package.zip`，在思源「设置 → 集市 → 已下载」中导入
2. 顶栏白板图标或 dock「+」新建画布，即写即存
3. AI 绘图：对思源内置智能体说「帮我画一张 XX 思维导图」，或用 CLI：

```bash
# Node 22.6+；--workspace 指向含 data/ 的工作空间
node scripts/excali-board.mjs list   --workspace <WS> [--query 关键词] [--list-styles]
node scripts/excali-board.mjs create --workspace <WS> --plan plan.json [--title 名称] [--style 包名]
node scripts/excali-board.mjs append --workspace <WS> --board 标题 --plan plan.json
```

## 数据与保存

- **保存即文件**：每张白板是 `data/assets/` 下的一份 SVG 文件（内嵌场景），重命名、备份、同步都走普通文件
- **覆盖保护**：保存前按设置把上一版滚进 `.bak` 链（默认 3 份）；空文件与损坏内容不入链
- 开发细节与发版验收清单见 [`docs/`](docs/) 目录

## 字体授权与致谢

本插件打包分发以下字体文件（`fonts/` 目录），均为 SIL Open Font License 1.1 或等效免费商用授权，允许随本软件捆绑再分发（依据 OFL 1.1，不得单独售卖字体文件本身）：

| 字体 | 用途 | 授权 / 来源 |
|---|---|---|
| Virgil / Excalifont | Excalidraw 手写体 | Excalidraw 项目（MIT） |
| Cascadia / Liberation Sans / Assistant / Nunito / Lilita One | 拉丁 UI 字体 | SIL OFL 1.1 |
| Xiaolai 小赖体 | 中文手写体 | SIL OFL 1.1 · [lxgw/kose-font](https://github.com/lxgw/kose-font) |
| LXGW WenKai Lite 霞鹜文楷 | 中文正文 | SIL OFL 1.1 · [lxgw/LxgwWenKai](https://github.com/lxgw/LxgwWenKai) |
| Smiley Sans 得意黑 | 中文展示体 | SIL OFL 1.1 · [atelier-anchor/smiley-sans](https://github.com/atelier-anchor/smiley-sans) |
| Caveat / Yusei Magic / Zen Kurenaido | 拉丁手写装饰 | SIL OFL 1.1 |
| Comic Shanns | 拉丁手写体 | Excalidraw 生态免费字体 |

Canvas 内核为 [Excalidraw](https://github.com/excalidraw/excalidraw)（MIT），本插件含其定制构建产物 `engine.js`（含中文文案补丁与扩展字体注册）。

## 开源许可

本插件源码以 MIT 许可发布（见仓库 `LICENSE`）。
