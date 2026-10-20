/**
 * 空画板的引导画面：Excalidraw 官方 WelcomeScreen 组件树。
 *
 * 三条要知道的宿主事实（都在 0.18.1 的产物里逐字核过）：
 * ① npm 包**自己从不渲染**欢迎画面——WelcomeScreen 只有「定义 + 导出」两处引用，
 *    内容靠 4 个 tunnel 的 .Out 出口挂载，而出口只在条件成立时挂载。所以这一层
 *    是「从零加上」，不会跟官方默认画面打架；关掉它 = 不传 children。
 * ② 出现条件由 App 判定：!isLoading && showWelcomeScreen && 选择工具 && 非禅模式
 *    && 画板无元素，且空板时 App 会把 showWelcomeScreen 强行翻回 true —— 所以
 *    「一落笔就消失、下次空板又回来」不用我们写任何判定。
 * ③ Center.Heading 在 0.18.1 只吃 children（Obsidian 那版传 message/color 是它
 *    自己 fork 的旧签名，照抄会 tsc 报错），颜色由 vendor 的 .welcome-screen-decor
 *    给成 gray-40 / 深色 gray-60，正好是我们要的跟随主题。
 *
 * 它是 UI 层：不进 scene、不会被保存进导出的 SVG。这里只渲染 Center（与 Obsidian 一致），
 * 不挂 Hints 的三个箭头 —— 移动端 vendor 用 display:none!important 收掉了它们。
 */

import { WelcomeScreen } from "@excalidraw/excalidraw";
import { t } from "../i18n";
import { boardHotkey } from "./hotkeys";
import { LineIcon } from "./line-icon";
import { ICON_NEW_BOARD, ICON_OPEN_BOARD, PLANE_BODY, PLANE_CREASE, PLANE_FIN, PLANE_TRAIL } from "./welcome";

export type StudioWelcomeProps = {
  /** 「按路径打开…」：宿主弹输入框 */
  onOpenExisting: () => void;
  /** 「新建白板」：宿主开一个新页签 */
  onNewBoard: () => void;
};

/** 手绘纸飞机：路径常量见 studio/welcome.ts，线条吃 currentColor 所以跟着主题走 */
function PaperPlane() {
  return (
    <svg viewBox="0 0 200 200" role="img" aria-label={t("Excali 白板")}>
      <g fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
        <path d={PLANE_BODY} />
        <path d={PLANE_CREASE} />
        <path d={PLANE_FIN} />
        <path d={PLANE_TRAIL} strokeWidth="2.2" strokeDasharray="9 11" />
      </g>
    </svg>
  );
}

export function StudioWelcome(props: StudioWelcomeProps) {
  const { Center } = WelcomeScreen;
  return (
    <WelcomeScreen>
      <Center>
        {/* 顶部留白按容器高取百分比（见 index.css 的 .exs-welcome__spacer）：
            飞机中心落在画布约 1/3 高度处，文字贴着飞机往下排，空白留在画面底部。 */}
        <div className="exs-welcome__spacer" aria-hidden="true" />
        <Center.Logo>
          <PaperPlane />
        </Center.Logo>
        <div className="exs-welcome__below">
          <Center.Heading>
            <div className="exs-welcome__title">{t("Excali 白板")}</div>
            <div className="exs-welcome__tips">
              <div>{t("画几笔，文件自动跟着存")}</div>
              <div>{t("正文里打 /白板，随时开一张新板")}</div>
              <div>{t("右键文档里的手绘图，可以再打开继续画")}</div>
              <div>{t("☰ 菜单里能重命名、导出图片")}</div>
            </div>
          </Center.Heading>
          <Center.Menu>
            <Center.MenuItemHelp />
            <Center.MenuItem icon={<LineIcon d={ICON_OPEN_BOARD} />} shortcut={null} onSelect={props.onOpenExisting}>
              {t("按路径打开…")}
            </Center.MenuItem>
            <Center.MenuItem icon={<LineIcon d={ICON_NEW_BOARD} />} shortcut={boardHotkey()} onSelect={props.onNewBoard}>
              {t("新建白板")}
            </Center.MenuItem>
          </Center.Menu>
        </div>
      </Center>
    </WelcomeScreen>
  );
}
