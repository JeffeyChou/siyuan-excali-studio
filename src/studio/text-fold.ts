/**
 * 2026-10-22：文本折叠（Notion 式 toggle list）——纯数据逻辑层。
 *
 * 形态：画布上一组垂直排列的元素，最上的当「折叠头」，其余收进它的自定义
 * 字段 `excaliToggle`；折叠头左侧由 TextFoldOverlay 画一个圆点控制钮
 * （对标 Obsidian Canvas Folding 的 − 控制点），点击 = 收起/展开。
 *
 * 与 frame-collapse（画框折叠）的分工：frame 折叠面向「整块场景收放」，
 * 本模块面向「列表收放」——容器是普通元素（通常是文本），不占画布结构。
 *
 * 数据形状（挂在头元素上的自定义字段，引擎 restore 的 `...element` 展开保证往返）：
 * - 折叠态：{ collapsed: true,  elements: [成员深快照…] }
 * - 展开态：{ collapsed: false, memberIds: [成员 id…] }   // 再折叠按 id 收
 *
 * 已知边界（演示版，与 frame-collapse 一致）：
 * - 快照成员回传走 makeElement 重建（ElementSpec 已知字段）——成员自带的
 *   自定义字段（如 excaliRecipe 配方）不保留；文本/位置/字号/字体无损。
 * - 还原成员的 index 重置 ⇒ z 序被推到最上层（列表场景元素不重叠，无感）。
 */

/** 元素上的折叠状态字段（窄型，只读本模块关心的两个键） */
export interface ExcaliToggle {
  collapsed: boolean;
  /** 折叠态：成员深快照（绝对坐标，回传时直接当 ElementSpec 用） */
  elements?: Array<Record<string, unknown>>;
  /** 展开态：成员 id 备忘（再次折叠按 id 收集现存成员） */
  memberIds?: string[];
}

/** 折叠头/成员的最小元素面（脚本与 overlay 都只摸这几个字段） */
export interface FoldCandidate {
  id: string;
  type: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  fontSize?: number;
}

/** 从场景里安全读 excaliToggle（脏数据一律当没有） */
export function toggleOf(el: unknown): ExcaliToggle | null {
  const raw = (el as { excaliToggle?: unknown } | null | undefined)?.excaliToggle;
  if (!raw || typeof raw !== "object") return null;
  const t = raw as Partial<ExcaliToggle>;
  if (typeof t.collapsed !== "boolean") return null;
  return t as ExcaliToggle;
}

/** 折叠/展开产生的场景操作三元组（调用方落给 handle 的 add/patch/delete） */
export interface FoldOps {
  /** 头部补丁（excaliToggle 新值） */
  headPatch: Record<string, unknown>;
  /** 待删成员 id（折叠时用） */
  deleteIds: string[];
  /** 待还原成员 spec（展开时用；保快照里的 id） */
  specs: Array<Record<string, unknown>>;
}

/**
 * 从选区挑折叠头：按 y 升序（y 同按 x）取最上的一个，优先文本；
 * 其余全部是成员。不足 2 个返回 null（一个当头 + 至少一个下属）。
 */
export function pickFoldHead(
  els: FoldCandidate[],
): { head: FoldCandidate; members: FoldCandidate[] } | null {
  if (els.length < 2) return null;
  const sorted = [...els].sort((a, b) => a.y - b.y || a.x - b.x);
  const firstText = sorted.find((e) => e.type === "text");
  const head = firstText ?? sorted[0];
  const members = sorted.filter((e) => e.id !== head.id);
  return members.length > 0 ? { head, members } : null;
}

/** 折叠：先存快照再删成员（反了中途失败就是数据丢失）。 */
export function planFold(head: FoldCandidate, members: FoldCandidate[]): FoldOps {
  return {
    headPatch: {
      excaliToggle: {
        collapsed: true,
        elements: members.map((m) => JSON.parse(JSON.stringify(m))),
      },
    },
    deleteIds: members.map((m) => m.id),
    specs: [],
  };
}

/**
 * 展开：快照成员当 spec 回传（makeElement 保 id）+ 头转展开态（记 memberIds，
 * 下次点头上的 − 按 id 收集）。快照为空/损坏返回 null。
 *
 * aliveIds（可选）：传了就把**已在画布上**的成员从 specs 里剔掉——用户折叠后
 * ⌘Z 撤回过删除时会留下「头标记折叠态、成员却还在场」的不一致态，不剔就会
 * 拿快照 id 重复进场（场景里两个同 id 元素，vendor 直接乱）。
 * memberIds 仍然记全部快照 id（再折叠时按现存收集，在场的正好收）。
 */
export function planUnfold(
  head: FoldCandidate & { excaliToggle?: unknown },
  aliveIds?: ReadonlySet<string>,
): FoldOps | null {
  const snap = toggleOf(head);
  if (!snap || snap.collapsed !== true || !Array.isArray(snap.elements) || snap.elements.length === 0) {
    return null;
  }
  return {
    headPatch: {
      excaliToggle: {
        collapsed: false,
        memberIds: (snap.elements as Array<{ id?: unknown }>).map((e) => String(e.id ?? "")),
      },
    },
    deleteIds: [],
    specs: snap.elements
      .filter((e) => !aliveIds || !aliveIds.has(String((e as { id?: unknown }).id ?? "")))
      .map((e) => ({ ...(e as Record<string, unknown>) })),
  };
}

/**
 * 再折叠（点头上的 −）：收集**现存**成员。
 * 成员被用户删光的返回 null（调用方提示）；部分被删的只收剩下的。
 *
 * 两种头形态都收：展开态走 memberIds；折叠态走快照 id——后者覆盖「折叠后
 * ⌘Z 撤回过删除」的不一致态（成员还在场，点头 = 把在场的收干净）。
 */
export function planRefold(
  head: FoldCandidate & { excaliToggle?: unknown },
  elements: ReadonlyArray<FoldCandidate>,
): FoldOps | null {
  const snap = toggleOf(head);
  if (!snap) return null;
  const alive = new Set(elements.map((e) => e.id));
  const ids =
    snap.collapsed === true && Array.isArray(snap.elements)
      ? snap.elements.map((e) => String((e as { id?: unknown }).id ?? ""))
      : Array.isArray(snap.memberIds)
        ? snap.memberIds.map((id) => String(id))
        : [];
  const members = ids
    .map((id) => elements.find((e) => e.id === id))
    .filter((e): e is FoldCandidate => !!e && alive.has(e.id));
  if (members.length === 0) return null;
  return planFold(head, members);
}

/** 场景里所有带 excaliToggle 的头元素（overlay 轮询用；折叠态+展开态都要） */
export function foldHeadsOf(
  elements: ReadonlyArray<unknown>,
): Array<{ el: FoldCandidate; toggle: ExcaliToggle }> {
  const out: Array<{ el: FoldCandidate; toggle: ExcaliToggle }> = [];
  for (const el of elements) {
    const t = toggleOf(el);
    if (!t) continue;
    const e = el as FoldCandidate;
    if (typeof e.id !== "string" || typeof e.x !== "number" || typeof e.y !== "number") continue;
    out.push({ el: e, toggle: t });
  }
  return out;
}

/** 视口面（overlay 定位用；字段名与 vendor AppState 对齐） */
export interface FoldViewport {
  zoom: number;
  scrollX: number;
  scrollY: number;
  offsetLeft: number;
  offsetTop: number;
}

/** 圆点半径（CSS px，与 .exs-fold-badge 的 18px 宽高对齐） */
export const BADGE_R = 9;
/** 圆点与文本左缘的视觉留白（CSS px，屏幕上恒定——跟着缩放走才算真「贴前面」） */
const BADGE_GAP = 6;

/** 圆点随缩放的比例（钉住上下限：缩到 0.3 时圆点比字还大，放到 4 倍时又成针尖） */
export function badgeScale(zoom: number): number {
  const z = Number.isFinite(zoom) && zoom > 0 ? zoom : 1;
  return Math.min(1.8, Math.max(0.65, z));
}

/**
 * 圆点控制钮的锚点：折叠头左侧、垂直居中于第一行文本（返回的是**圆心**，
 * CSS 用 translate(-50%,-50%) 对齐）。
 *
 * 场景 → 视口口径与 vendor sceneCoordsToViewportCoords 一致：
 * screenX = (sceneX + scrollX) * zoom + offsetLeft（zoom 是 AppState.zoom.value）。
 *
 * 2026-10-22 修正：水平偏移改成**屏幕像素**（圆点半径 + 6px 留白），
 * 不再是 22 个场景单位——后者在缩小时间距被一起缩小，圆点会压到字上；
 * 竖直仍是「首行中线」，随 zoom 缩放（与文本同比例）。
 */
export function badgeAnchor(
  head: FoldCandidate,
  view: FoldViewport,
): { left: number; top: number } {
  const zoom = view.zoom || 1;
  const lineH = (head.fontSize ?? 20) * 1.25;
  const textLeft = (head.x + view.scrollX) * zoom + view.offsetLeft;
  const textTop = (head.y + view.scrollY) * zoom + view.offsetTop;
  return {
    left: textLeft - (BADGE_R * badgeScale(zoom) + BADGE_GAP),
    top: textTop + (lineH / 2) * zoom,
  };
}

/** 折叠态徽章上显示的隐藏成员数：快照里**已不在画布上**的个数。
 *  传 aliveIds（场景现存 id 集）——折叠后 ⌘Z 撤回过删除时成员还在场，
 *  此时返回 0，overlay 会把徽章改显成展开态（−），点头即把在场的收干净。 */
export function hiddenCount(toggle: ExcaliToggle, aliveIds: ReadonlySet<string>): number {
  if (!toggle.collapsed || !Array.isArray(toggle.elements)) return 0;
  return toggle.elements.filter((e) => !aliveIds.has(String((e as { id?: unknown }).id ?? ""))).length;
}

/** overlay 的渲染项（组件只负责画，不算数） */
export interface FoldBadge {
  id: string;
  collapsed: boolean;
  count: number;
  left: number;
  top: number;
  /** 圆点随缩放的比例（CSS 用 --exs-fold-scale 吃） */
  scale: number;
}

/**
 * 一帧的徽章快照：场景元素 + 视口 → 每个折叠头一个渲染项。
 *
 * 位置随元素走（head.x/y 直接进算），所以**拖动折叠头 / 编辑文本改变宽高时
 * 徽章必须重算**——组件侧的签名里要带上 x/y/width/height，否则 rAF 轮询会
 * 认为「什么都没变」而把旧坐标留着（2026-10-22 用户报的「圆点不跟着
 * strategy 走」就是这个：签名只有 id + collapsed + 视口）。
 */
export function foldBadgesOf(
  elements: ReadonlyArray<unknown>,
  view: FoldViewport,
): FoldBadge[] {
  const aliveIds = new Set(elements.map((e) => (e as { id?: unknown }).id).filter((id): id is string => typeof id === "string"));
  const scale = badgeScale(view.zoom || 1);
  return foldHeadsOf(elements).map(({ el, toggle }) => {
    const a = badgeAnchor(el, view);
    const missing = hiddenCount(toggle, aliveIds);
    return {
      id: el.id,
      // 折叠态但成员都还在场（⌘Z 撤消过删除的不一致态）→ 显展开态 −，
      // 点头把在场的收干净；其余照 collapsed 走
      collapsed: toggle.collapsed && missing > 0,
      count: missing,
      left: a.left,
      top: a.top,
      scale,
    };
  });
}

/**
 * 徽章快照的签名（rAF 轮询去重用）：位置随元素/视口变，所以几何必须进签名。
 * 计数用 count 而不是 aliveIds：成员增删已经体现在 count 上，无关元素变动
 * 不必触发重渲染。
 */
export function foldBadgesSig(badges: ReadonlyArray<FoldBadge>): string {
  return badges
    .map((b) => `${b.id}:${b.collapsed ? 1 : 0}:${b.count}:${b.left.toFixed(1)},${b.top.toFixed(1)}@${b.scale.toFixed(2)}`)
    .join("|");
}
