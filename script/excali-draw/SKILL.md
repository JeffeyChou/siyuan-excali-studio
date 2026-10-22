---
name: excali-draw
description: 用 Excali Studio 在思源工作空间里新建或追加白板（流程图、架构图、思维导图、对比图）。当用户要求「画一张图/白板/流程图/脑图」且本机装有思源 Excali Studio 插件时使用；通过 scripts/excali-board.mjs 写 assets/excali/*.svg，不要手写 SVG。
---

# Excali 白板绘图

把结构化**计划 JSON** 交给 Excali Studio 的无头 CLI：它负责布局、配色、绑定箭头、内嵌 scene 与保存。你只描述「有哪些节点、怎么连」，不要写坐标，也不要手写 SVG。

## 定位 CLI

插件目录通常在工作空间下：

```bash
WS="<思源工作空间根目录>"          # 含 data/ 的目录
CLI="$WS/data/plugins/siyuan-excali-studio/scripts/excali-board.mjs"
node "$CLI" --help
```

- 需要 Node 22.6+（脚本已带 `--experimental-strip-types`；Node 23/24 默认支持 TS 擦除）。
- 不传 `--workspace` 时，CLI 从当前目录向上找含 `data/plugins` 的目录；外部智能体建议显式传。
- 白板目录 `assets/excali` 是**资产相对路径**，实际磁盘位置是 `$WS/data/assets/excali`。
- 所有结果输出一行 JSON：成功 `{"ok":true,...}`，失败 `{"ok":false,"error":"..."}`，退出码 1。
- 集市安装版（package.zip）不含 `scripts/` 源码；若插件目录里找不到 CLI，改用思源内置智能体的 `excali_draw_board`。

## 三个动作

```bash
# 1) 看看已有白板（追加前先找目标）
node "$CLI" list --workspace "$WS" [--query 关键词]

# 1b) 只看可用风格（内置预设 + 风格包）
node "$CLI" list --workspace "$WS" --list-styles

# 2) 新建（默认落在 assets/excali；同名自动 _0/_1）
node "$CLI" create --workspace "$WS" --plan /tmp/plan.json [--title 文件名] [--style 风格包名]

# 3) 追加到已有白板（按标题或路径；每块板只留一个文件，不再滚动 .bak）
node "$CLI" append --workspace "$WS" --board "已有白板标题" --plan /tmp/plan.json
```

也可以 `--plan -` 从 stdin 读，或 `--plan-json '<json>'` 直接传。`--dry-run` 只渲染、不落盘，用来校验计划。

## 计划 JSON

```json
{
  "title": "注册与登录流程",
  "caption": "本地优先，不依赖云端",
  "preset": "pencil",
  "layout": "lr",
  "nodes": [
    { "id": "open", "label": "打开思源", "shape": "rounded" },
    { "id": "check", "label": "已登录？", "shape": "diamond" },
    { "id": "board", "label": "进入白板", "group": "main" },
    { "id": "note", "label": "本地优先", "shape": "text" }
  ],
  "edges": [
    { "from": "open", "to": "check" },
    { "from": "check", "to": "board", "label": "是" },
    "board->note"
  ]
}
```

- `nodes` 可写字符串（节点文字）或对象；对象字段：
  - `id`：连边用，省略自动 `n1/n2…`。
  - `label`：必填，显示文字；`note` 会换行附在下面。
  - `shape`：`rounded`（默认）/`rectangle`/`ellipse`/`diamond`（判断）/`text`（裸文字）。
  - `group`：同组节点共用一种底色（marker 预设下明显）；再在顶层 `groups` 里给它起名，就会画框（见下）。
  - `rank`（可选，lr/tb）：把节点钉在第几层，0 起。自动分层不合意时用。
  - `order`（可选）：层内先后，与位次比较，`0` = 排最前；grid 里是第几格，radial 里是环上的先后。
- `edges` 可写 `"a->b"`、`["a","b","标签"]` 或 `{from,to,label}`；端点可写节点 `id` 或**完全相同的标签**。
- 布局：`lr` 从左到右（流程默认）、`tb` 从上到下（层级）、`grid` 方阵（并列项）、`radial` 中心放射（脑图）。
- 预设：
  - `pencil`：黑白手绘 + 米白纸，默认，适合流程/架构。
  - `marker`：彩色马克笔底色循环，适合头脑风暴/教学。
  - `blueprint`：蓝线技术图 + 等宽字，适合系统/接口。
  - 想固定自己的风格，写风格包（见下节），`preset` 直接填包名。
- `groups`（可选）：`{ "组名": "框标题" }`（或 `[{ "id", "label" }]`），组名对应节点的 `group`。列出来的组在成员外画一个带标题的虚线框，同组节点在层内挨着放。框是量出来的、不会推开别的节点：如果成员不在相邻的层或位置，框会包住非成员，这时 `warnings` 会点名，用 `rank`/`order` 让成员挨在一起再画。

```json
{
  "layout": "tb",
  "groups": { "client": "客户端", "server": "服务器" },
  "nodes": [
    { "id": "web", "label": "浏览器", "group": "client" },
    { "id": "gw", "label": "网关", "shape": "diamond" },
    { "id": "api", "label": "API", "group": "server", "rank": 2, "order": 0 },
    { "id": "db", "label": "数据库", "group": "server", "rank": 2 }
  ],
  "edges": ["web->gw", "gw->api", "api->db"]
}
```

- 提示都只表达意图，不写坐标；写错的提示（比如 `rank` 不是整数）会被忽略并记进 `warnings`，不会让整张图失败。
- 上限：40 节点 / 80 条边 / 单标签 200 字。超过请拆成多张白板；未知端点的边会被忽略并在 `warnings` 里返回。

## 固定风格（风格包）

批量出图要「同一套视觉」时，把风格写成一个 JSON 包放进 `$WS/data/assets/excali-styles/`，之后所有通道（CLI、内置智能体、MCP）都能用同名引用。

```bash
node "$CLI" create --workspace "$WS" --plan /tmp/plan.json --style axl-poster
node "$CLI" list --workspace "$WS" --list-styles          # 确认包已加载
node "$CLI" create ... --style-dir /绝对路径/目录          # 临时读别的目录（如插件自带示例）
```

插件自带示例：`data/plugins/siyuan-excali-studio/script/excali-draw/styles/`（`axl-poster`、`study-card`），用 `--style-dir` 指过去即可试用。集市安装版（package.zip）不含 `script/`，这时把示例 JSON 复制进 `data/assets/excali-styles/` 自己留一份。

包 schema——**只写想改的字段**，其余继承 `extends` 的基线（缺省 `pencil`）：

```json
{
  "name": "my-style",
  "label": "对外显示名",
  "extends": "marker",
  "background": "#fdf8ec",
  "ink": "#2b2b2b",
  "fill": "#ffffff",
  "edge": "#c2410c",
  "muted": "#7c6f64",
  "palette": ["#ffe9a8", "#d8edda"],
  "strokeWidth": 1,
  "roughness": 1,
  "fillStyle": "solid",
  "strokeStyle": "solid",
  "fontFamily": 1,
  "fontSizes": { "title": 34, "node": 17, "edge": 14, "caption": 14 },
  "nodeRoundness": { "type": 12 },
  "space": { "minW": 200, "minH": 90, "padX": 44, "padY": 32, "gapX": 150, "gapY": 56, "textWrap": 240 },
  "groupColor": { "mode": "roles", "roles": { "标题": "#ffe9a8", "正文": "#ffffff" } }
}
```

- `name` 省略时用文件名；只允许小写字母/数字/`._-`，最长 32。
- `palette` 是 `group` 未登记角色时的循环底色；`groupColor.mode = "roles"` 让固定分组永远拿固定颜色（批量图零漂移的关键）。
- `space` 管的是版面：节点最小宽高、内边距、层间距、网格间距、放射半径、单行换行宽度。字大图大时用 `minW`/`gapX`/`textWrap` 撑开。
- 坏包不会拖垮命令：这一条被跳过并写进结果 `styleWarnings`；其余包与内置照常。
- 包跟随基线：改 `pencil` 的默认配色，`extends: pencil` 的包自动受益（这正是「母版」思路）。

## 推荐工作流

1. 明确要「新建」还是「追加」。追加先 `list` 找到准确标题。
2. 把计划写成临时 JSON 文件（比 shell 引号安全）。
3. 先 `--dry-run` 校验，再真正执行。
4. 读 JSON 结果：`path`、`nodes`、`edges`、`warnings`、`unchanged`（计划没改变内容时为 true，文件未被重写）；用了风格包再看 `styleWarnings`（非空说明有包没加载上，得告诉用户）。
5. 告诉用户文件路径；让用户在思源里打开。新建文件若 dock 没立刻出现，用「打开白板…/选择器」或在白板库里刷新。

## 并发与安全（必须遵守）

- **白板正开在思源里时不要直接 append**：编辑器停手约 1 秒就会自动保存，会覆盖 CLI 写入。先让用户关闭该页签，或改用思源内置智能体的 `excali_draw_board` 能力（那条通道在画布里实时绘制）。
- 只写工作空间内、`assets/excali`（或 `--dir` 指定目录）下的 `.svg`；CLI 会拒绝路径穿越。
- 存量 `.bak*` 是老版本留下的备份档，CLI 不会新建、列表里也会排除；追加失败/解码失败时 CLI 会拒绝覆盖。
- 第五十四轮起备份链退役：每块板在目录里只留一个文件，写坏的兜底交给思源自己的历史/数据快照。

## 失败处理

- `plan:bad-shape` / `plan:bad-layout` / `plan:bad-preset`：按括号里的可选值修正（`bad-preset` 括号里含风格包清单）。
- `style:bad-json` / `style:bad-name` / `style:bad-extends` / `style:bad-field`：坏包只会进 `styleWarnings`，改完包再跑。
- `style:unknown-style` / `style:circular-extends`：`--list-styles` 核对包名与 `extends` 链（不要互相继承成环）。
- `plan:empty-plan`：没有可用节点。
- `plan:too-many-*`：拆分计划。
- `找不到白板`：先 `list`，标题必须完全一致（不含 `.svg`），或传相对路径。
- `目标白板不是有效的 Excali 场景`：不要覆盖；让用户确认或换目标。
