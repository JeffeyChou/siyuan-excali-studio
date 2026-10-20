/**
 * ☰ 主菜单：整棵换掉 vendor 的默认菜单，把插件动作挪进来。
 *
 * 三条宿主事实（0.18.1 产物里逐字核过）：
 * ① `MainMenu` 是 `withInternalFallback` 包过的组件——我们在 `<Excalidraw>` 的 children 里
 *    渲染一个非 fallback 实例，App 自己那个 `DefaultMainMenu`（`__fallback:true`）就返回 null，
 *    不会出现两份菜单叠在一起；
 * ② 点任意菜单项会发 `menu.itemSelect` → Content 的 onSelect → `setAppState({openMenu:null})`，
 *    所以跑完我们的回调菜单自动收起，**不再需要补发 Escape**（那是以前劫持 DOM 时才要的）；
 * ③ 项内容是 `flex + column-gap`、没有固定图标列 ⇒ 自绘项必须给图标，否则文字会比相邻内置项凸出来；
 *    图标尺寸不用传 size——第四十三轮起 index.css 把 `.dropdown-menu-item svg` 统一抬到 18px
 *    （vendor 原本压 1rem，15px 字配 16px 图标偏小），LineIcon 的 stroke 随缩放变粗一档，正合适。
 *
 * 刻意不放的四项：
 * - `DefaultItems.Export`：就是原来 ☰ 里那个「保存到 …」（Excalidraw 的 JSON 导出），
 *   以前只能靠捕获阶段劫持它的 DOM 改道；现在换成我们自己的「导出图片…」；
 * - `DefaultItems.SaveAsImage`：Excalidraw 自己的导出框，和我们的导出对话框重复；
 * - `DefaultItems.SaveToActiveFile`：predicate 要 `appState.fileHandle`，embed 方式下恒 null、永不渲染；
 * - 只读 / 禅模式：画布右键菜单里 vendor 固定给了这两项（连同网格、吸附、统计），不必占菜单位置。
 *
 * 第二十一轮：文件先行 + 防抖自动保存上线后，「保存」「保存副本…」两项删除——
 * 画板从第一帧起就归属文件，停手约 1 秒自动落盘，⌘S 强制落盘，菜单里不再有保存心智。
 *
 * 2026-10-19：素材库三项（导入 / 刷新 / 打开文件夹）从本菜单撤出——它们住进
 * 素材库面板自己的 ⋮ 菜单（vendor 硬编码无扩展点，经 library-menu-inject.ts
 * DOM 注入；见该文件头）。菜单只留「画布与文件」的心智。
 *
 * 第四十一轮：「插入白板卡片…」也从本菜单撤出——它作为**画布动作**住进右缘竖条
 * （settings.pinnedActions，默认钉住、可右键取消固定），脚本库里那份「画布动作」
 * 小节是它的兜底入口（右栏收进或被侧栏让位时仍能进）。
 */

import { MainMenu } from "@excalidraw/excalidraw";
import { t } from "../i18n";
import { menuShortcut } from "./hotkeys";
import { LineIcon } from "./line-icon";
import {
  ICON_AI,
  ICON_EMBED,
  ICON_EXPORT_IMAGE,
  ICON_HELP,
  ICON_MERMAID,
  ICON_RENAME,
  ICON_SAVE_AS,
  ICON_SCRIPT,
  ICON_ZOOM_FIT,
} from "./menu-icons";

export type StudioMenuProps = {
  /** 导出图片…：打开插件自己的导出对话框 */
  onExport: () => void;
  /** 重命名：读旧写新删旧 */
  onRename: () => void;
  /** 2026-10-16 批4A：复制此白板的嵌入引用（未建档时由宿主提示） */
  onCopyRef: () => void;
  /** 缩放适应：缩放并滚动到全部内容 */
  onZoomToFit: () => void;
  /** 第二十八轮：Mermaid 转图元…——打开 vendor 的 TTDDialog（Mermaid 页） */
  onMermaid: () => void;
  /** 第三十一轮：嵌入思源块…——粘贴块链接/块 ID，画布中建 Embeddable 元素 */
  onEmbedBlock: () => void;
  /** 2026-10-16 S3：运行脚本…：打开脚本选择器（宿主执行） */
  onRunScript: () => void;
  /** 第四十四轮：AI 通道…：打开四通道总览面板（studio 本地浮层） */
  onAiChannels: () => void;
  /** 2026-10-17 第二十轮：帮助：快捷键速查表（宿主弹 Dialog） */
  onHelp: () => void;
};

export function StudioMenu(props: StudioMenuProps) {
  return (
    <MainMenu>
      <MainMenu.DefaultItems.LoadScene />
      <MainMenu.Item
        icon={<LineIcon d={ICON_EXPORT_IMAGE} />}
        shortcut={menuShortcut(["cmd", "shift"], "E")}
        onSelect={props.onExport}
      >
        {t("导出图片…")}
      </MainMenu.Item>
      <MainMenu.Item icon={<LineIcon d={ICON_RENAME} />} onSelect={props.onRename}>
        {t("重命名")}
      </MainMenu.Item>
      <MainMenu.Item icon={<LineIcon d={ICON_SAVE_AS} />} onSelect={props.onCopyRef}>
        {t("复制此白板的引用")}
      </MainMenu.Item>
      <MainMenu.Item
        icon={<LineIcon d={ICON_ZOOM_FIT} />}
        title={t("缩放并滚动到全部内容")}
        onSelect={props.onZoomToFit}
      >
        {t("缩放适应")}
      </MainMenu.Item>
      {/* 第三十八轮：笔刷彻底不进菜单也不进右上角——荧光笔住在右缘脚本竖条，
          墨笔走 vendor 自己的铅笔工具 */}
      <MainMenu.Item icon={<LineIcon d={ICON_MERMAID} />} onSelect={props.onMermaid}>
        {t("Mermaid 转图元…")}
      </MainMenu.Item>
      <MainMenu.Item icon={<LineIcon d={ICON_EMBED} />} onSelect={props.onEmbedBlock}>
        {t("嵌入思源块…")}
      </MainMenu.Item>
      {/* 第四十一轮：「插入白板卡片…」从菜单撤出——它住进右缘竖条（画布动作），
          要临时插一次就从 ☰「运行脚本…」→ 脚本库 →「画布动作」进 */}
      <MainMenu.Item icon={<LineIcon d={ICON_SCRIPT} />} onSelect={props.onRunScript}>
        {t("运行脚本…")}
      </MainMenu.Item>
      {/* 第四十四轮：AI 通道总览（内置智能体 / 内核 MCP / CLI / 脚本体系四道门的开关）。
          生图的 API 地址/Key 不住这儿——面板管「开不开」，插件设置页管「怎么连」 */}
      <MainMenu.Item icon={<LineIcon d={ICON_AI} />} onSelect={props.onAiChannels}>
        {t("AI 通道…")}
      </MainMenu.Item>
      <MainMenu.Item icon={<LineIcon d={ICON_HELP} />} onSelect={props.onHelp}>
        {t("帮助")}
      </MainMenu.Item>
      <MainMenu.DefaultItems.SearchMenu />
      <MainMenu.DefaultItems.Help />
      <MainMenu.DefaultItems.ClearCanvas />
      <MainMenu.Separator />
      <MainMenu.Group title={t("Excalidraw 链接")}>
        <MainMenu.DefaultItems.Socials />
      </MainMenu.Group>
      <MainMenu.Separator />
      <MainMenu.DefaultItems.ToggleTheme />
      <MainMenu.DefaultItems.ChangeCanvasBackground />
    </MainMenu>
  );
}
