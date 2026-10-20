/**
 * 第四十五轮：「仅外框颜色」——只把边框色补丁到图形上，绑定文字保持原色。
 *
 * 痛点是 vendor 属性面板的 changeProperty(includeBoundText=true)：改外框色会把
 * 容器里的绑定文字一起染色，用户得「先全白、再把文字改回黑」。这里绕过面板，
 * 直接对元素做 strokeColor 补丁（CaptureUpdateAction.IMMEDIATELY，可撤销）。
 *
 * 选中口径（纯函数，node 侧可测）：
 * - 选中的图形 → 只取有描边的类型（文字、图片、frame 没有可调外框）；
 * - 选中的绑定文字 → 折算成它的容器（用户常说「选中这个文字，把它的框改白」）；
 * - 独立文字忽略；同一容器被选中与经文字折算同时出现时去重。
 *
 * 色板数据也放这儿：颜色值是 vendor 标准色 + 透明，label 是 i18n key（中文原文）。
 */

/** 色板颜色（顺序即渲染顺序：白/黑是最高频的两次修补，排最前） */
export const OUTLINE_COLORS: ReadonlyArray<{ value: string; label: string }> = [
  { value: "#ffffff", label: "白色" },
  { value: "#1e1e1e", label: "黑色" },
  { value: "#868e96", label: "深灰" },
  { value: "#ced4da", label: "浅灰" },
  { value: "#e03131", label: "红色" },
  { value: "#f08c00", label: "橙色" },
  { value: "#2f9e44", label: "绿色" },
  { value: "#1971c2", label: "蓝色" },
  { value: "#9c36b5", label: "紫色" },
  { value: "transparent", label: "透明" },
];

/** 有可见描边、且外框色有意义的图元类型 */
const OUTLINE_TYPES = new Set(["rectangle", "ellipse", "diamond", "line", "arrow", "freedraw"]);

export type OutlineCandidate = {
  id: string;
  type: string;
  containerId?: string | null;
};

/**
 * 选中集合 → 真正该改外框的图元 id 列表（保序、去重）。
 * 返回空数组 = 没有可改的图形（调用方负责提示，不静默）。
 */
export function outlineTargets(
  elements: readonly OutlineCandidate[],
  selectedIds: readonly string[],
): string[] {
  const byId = new Map(elements.map((e) => [String(e.id), e]));
  const out: string[] = [];
  const add = (id: string): void => {
    if (!out.includes(id)) out.push(id);
  };
  for (const raw of selectedIds) {
    const el = byId.get(String(raw));
    if (!el) continue;
    if (el.type === "text") {
      const cid = el.containerId;
      if (!cid) continue; // 独立文字没有外框
      const box = byId.get(String(cid));
      if (box && OUTLINE_TYPES.has(box.type)) add(String(box.id));
      continue;
    }
    if (el.containerId) continue; // 绑定文字自身混进选中集时别当图形
    if (OUTLINE_TYPES.has(el.type)) add(String(el.id));
  }
  return out;
}
