/**
 * 2026-10-22：多画板页签 ⇒ 工具栏按钮高亮闪烁的修复。
 *
 * ── 根因（vendor 0.18.1 源码 + Chrome 实测双重坐实）──
 *
 * vendor 把工具栏的形状工具渲染成**原生 radio**：
 *   components/Actions.tsx
 *     <ToolButton type="radio" name="editor-current-shape"
 *                 checked={activeTool.type === value} … />
 *   components/HandButton.tsx
 *     <ToolButton type="radio" name="editor-current-shape" … />
 *   components/ToolButton.tsx
 *     <input type="radio" name={props.name} checked={props.checked}
 *            id={`${excalId}-${props.id}`} … />
 *
 * `name` 是**硬编码常量**（只有 `id` 才带实例 id：`${excalId}-${props.id}`），
 * 而 HTML radio 分组**只看 name**（同 document 内同名 radio 互斥成一组），
 * 跟它们分属哪个 React 树 / 哪个画板毫无关系。
 *
 * 于是开多个画板页签时（每个页签一个 <Excalidraw> 实例 ⇒ 同一个 document 里
 * 出现多组 `name="editor-current-shape"` 的 radio）：
 *   · 在页签 A 点「箭头」→ 浏览器按 radio 互斥规则，**把页签 B 的 radio 全部取消选中**；
 *   · 页签 B 随后 React 受控重渲染又把 `checked=true` 写回 → **反手抢掉页签 A 的选中**。
 * 两个实例来回踩 ⇒ 按钮高亮来回跳 = 用户看到的「箭头按钮莫名地选中与被选中」。
 *
 * 高亮是纯 CSS 伪类驱动的（vendor index.css）：
 *   .excalidraw .ToolIcon .ToolIcon_type_radio:checked + .ToolIcon__icon {
 *     background: var(--color-surface-primary-container); … }
 * 所以 DOM 的 checked 一被浏览器改掉，高亮背景立刻消失——肉眼就是闪烁。
 *
 * 单开一个画板时只有一个实例 ⇒ 只有一组同名 radio ⇒ 不互斥 ⇒ 不闪。
 * **这就是「多开才闪」的确切原因。**
 *
 * ── 修法 ──
 *
 * 给每个实例的 radio 加**实例唯一后缀**（`editor-current-shape-<key>`），
 * 让各实例的 radio 组彼此独立：
 *   · 组内仍然同名 ⇒ 同一实例内工具互斥的原有行为**完全不变**；
 *   · 跨实例不同名 ⇒ 互不干扰，各自的选中态独立保持。
 *
 * 为什么不能靠 React 重新渲染修正 `checked`：那是拿「受控值」去对抗浏览器的
 * 互斥规则——两个实例各自的 React 都会把 `checked` 写回自己的 activeTool，
 * 于是永远在互相覆盖（就是闪烁本身）。必须从**分组依据**这一层断开。
 *
 * ── 两个实现细节（都是实测踩出来的）──
 *
 * ① **实例标识用 vendor 的 excalId，不用随机数**。
 *    radio 的 `id` 形如 `<excalId>-<props.id>`，其中 excalId 是 vendor 给每个
 *    Excalidraw 实例生成的 nanoid（App.tsx 里 `this.id = nanoid()`）。用它做后缀：
 *    权威、跨挂载稳定、能直接对上「哪个 radio 属于哪个实例」。
 *    退路：拿不到 id 时用随机串。
 *
 * ② **必须同时监听 attributes 与 childList**。
 *    实测：React 受控重渲染时**复用同一个 DOM 节点**并把 `name` 属性写回硬编码常量
 *    （只监听 childList 抓不到，新元素还没插入时属性就已经被改了），
 *    也会**整体替换**工具栏节点组。两种都得兜住，所以：
 *      · attributes: 盯 name 变化 → 改回常量就立刻补后缀；
 *      · childList:   盯新增节点 → 新 radio 立刻补后缀。
 */

/** vendor 硬编码的 radio 组名（Actions.tsx / HandButton.tsx） */
const VENDOR_RADIO_NAMES = ["editor-current-shape"] as const;

/** 已被隔离的标记（便于测试断言与排查） */
const ISOLATED_ATTR = "data-exs-radio-isolated";

/** 容器里 vendor 工具栏的 radio 选择器 */
const RADIO_SELECTOR = 'input[type="radio"][name^="editor-current-shape"]';

/** vendor 原始组名（精确匹配） */
function isVendorName(name: string | null): boolean {
  return !!name && VENDOR_RADIO_NAMES.some((n) => name === n);
}

/** 取实例键：优先用 vendor 的 excalId（radio id 的前缀），退路用随机串 */
export function detectInstanceKey(root: ParentNode | null): string {
  const first = root?.querySelector<HTMLInputElement>('input[type="radio"][id]');
  const id = first?.getAttribute("id") ?? "";
  // vendor 的 id 形如 `${excalId}-${props.id}`；excalId 是 nanoid（21 字符）
  const dash = id.indexOf("-");
  if (dash > 0) {
    const prefix = id.slice(0, dash);
    if (prefix.length >= 8) return prefix;
  }
  return Math.random().toString(36).slice(2, 8);
}

/**
 * 把传入节点子树内、仍用 vendor 原始组名的 radio 改成带实例后缀的组名。
 * 幂等：已带后缀的跳过。
 *
 * @param root 容器（通常是本实例的 .excalidraw 元素）
 * @param key  实例唯一键
 * @returns 改了多少个
 */
export function isolateRadioGroup(root: ParentNode | null, key: string): number {
  if (!root) return 0;
  const suffix = `-${key}`;
  let changed = 0;
  const nodes = root.querySelectorAll<HTMLInputElement>(RADIO_SELECTOR);
  nodes.forEach((el) => {
    const name = el.getAttribute("name");
    if (!name) return;
    // 已经是本实例的组 → 跳过
    if (name.endsWith(suffix)) return;
    // 不是 vendor 原始组名（可能是别的组，或已被别的实例改过）→ 跳过
    if (!isVendorName(name)) return;
    el.setAttribute("name", `${name}${suffix}`);
    el.setAttribute(ISOLATED_ATTR, key);
    changed++;
  });
  return changed;
}

/**
 * 在本实例的容器上挂 radio 组隔离。
 *
 * @param container 本实例的 .excalidraw 容器元素
 * @returns 卸载函数（断开 observer）
 */
export function installRadioIsolation(container: HTMLElement | null): () => void {
  if (!container) return () => {};
  const key = detectInstanceKey(container);
  isolateRadioGroup(container, key);

  const fixOne = (el: Element): void => {
    if (!el.matches?.(RADIO_SELECTOR)) return;
    const name = el.getAttribute("name");
    if (!isVendorName(name)) return;
    el.setAttribute("name", `${name}-${key}`);
    el.setAttribute(ISOLATED_ATTR, key);
  };

  const observer = new MutationObserver((records) => {
    for (const rec of records) {
      // ① 属性被改回硬编码常量（React 复用节点写回 name）→ 立刻补后缀
      if (rec.type === "attributes" && rec.target instanceof Element) {
        fixOne(rec.target);
        continue;
      }
      // ② 新增节点（vendor 重建工具栏 / 展开 extra-tools 下拉）→ 补后缀
      for (const node of Array.from(rec.addedNodes)) {
        if (node.nodeType !== Node.ELEMENT_NODE) continue;
        const el = node as Element;
        fixOne(el);
        isolateRadioGroup(el, key);
      }
    }
  });
  observer.observe(container, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["name"],
  });
  return () => observer.disconnect();
}
