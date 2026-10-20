/**
 * 第三十四轮：脚本侧边栏（ScriptRail）的固定状态广播事件名。
 * 独立成无 React 依赖的小模块：宿主 index.ts（主包）和 studio 组件（引擎包）都要用，
 * 不能让主包为了一个常量把 ScriptRail/React 图拉进来。
 */

/** 宿主在固定状态变化后 dispatch 的 window CustomEvent；已开画布听到就重拉固定清单 */
export const SCRIPT_PIN_EVENT = "exs:script-pin-changed";

/**
 * 第三十四轮·液态玻璃返工：侧边栏视图偏好（图钉/收起/垂直位置）变化广播。
 * getter 读设置不触发 React 重渲染（真机 bug：图钉点了没反应）——所以视图状态
 * 以 StudioApp 本地 state 为准，翻转后由宿主落盘并广播此事件，所有已开画布同步。
 */
export const RAIL_VIEW_EVENT = "exs:rail-view-changed";

/**
 * 第三十八轮：荧光笔配置变化广播。
 * 同 RAIL_VIEW_EVENT 的教训——getter 读设置不触发 React 重渲染，所以配置以
 * StudioApp 本地 state 为准，色板改完由宿主落盘并广播此事件，所有已开画布同步；
 * 内置脚本/智能体走 eaHost.getHighlighter() 读同一份，不需要事件。
 */
export const HIGHLIGHTER_EVENT = "exs:highlighter-changed";
