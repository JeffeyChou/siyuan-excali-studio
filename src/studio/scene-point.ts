/**
 * 第四十二轮：画布坐标换算（client ↔ 场景）独立成模块。
 *
 * 为什么不留在 image-import.ts 里：那个模块运行时 import 了 vendor 引擎（带 CSS 副作用），
 * node 根本读不进来，而这两条公式恰恰是最需要**真数值断言**的纯数学——抄错一个符号，
 * 所有「落在视口中心」的动作都会静默跑偏（真机上只表现为「东西不知插到哪去了」）。
 *
 * vendor 的口径（dist 实测两条）：
 *   屏幕 = (场景 + scroll) × zoom    ⇒    场景 = 屏幕 / zoom − scroll
 *   可视区 = [−scrollX, −scrollY, −scrollX + width/zoom, −scrollY + height/zoom]
 * 第四十一轮踩的坑：viewportCenter 写成 `scrollX + width/2/zoom`（scroll 项漏负号），
 * 落点偏差 = 2×scroll；画面一平移，插入的白板卡片就跑到视野外面，用户点不到也看不见。
 */

export type Point = { x: number; y: number };

/** 只取换算要读的四个视图量（vendor 的 appState 是它们的超集，测试也能塞假对象） */
type ViewState = {
  scrollX?: number;
  scrollY?: number;
  width?: number;
  height?: number;
  zoom?: { value?: number };
};

export type View = { getAppState(): ViewState };

function zoomOf(s: ViewState): number {
  return s.zoom?.value || 1;
}

/** client 坐标 → 场景坐标（拖放落点、⌘ 点命中测试用；rect 是画布 canvas 的外框） */
export function clientToScene(view: View, rect: { left: number; top: number }, clientX: number, clientY: number): Point {
  const s = view.getAppState();
  const zoom = zoomOf(s);
  return {
    x: (clientX - rect.left) / zoom - (s.scrollX || 0),
    y: (clientY - rect.top) / zoom - (s.scrollY || 0),
  };
}

/**
 * 当前视口中心（场景坐标）。和 clientToScene 必须是同一套公式——它就是画布几何中心
 * 那个 client 点换算过去，所以「粘贴图片 / 路径转卡片 / 插入白板卡片 / 嵌入块」的落点
 * 才真的在用户眼前。
 */
export function viewportCenter(view: View): Point {
  const s = view.getAppState();
  const zoom = zoomOf(s);
  return {
    x: -(s.scrollX || 0) + (s.width || 0) / 2 / zoom,
    y: -(s.scrollY || 0) + (s.height || 0) / 2 / zoom,
  };
}
