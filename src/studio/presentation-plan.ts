/**
 * 第五十三轮：演示模式的**纯逻辑层**——画框 → 幻灯片清单，以及页序/排除的元数据换算。
 *
 * 载体是 vendor 的画框（frame）：它本来就是「一块有名字的版面」，用户在画布上
 * 框选元素就能得到一页，不需要学新概念。演示相关的私有状态一律写进
 * `frame.customData.presentation`（vendor 官方透传 customData，restore 原样保留），
 * 不新增元素字段、不进注册表。
 *
 * 顺序口径对齐 Obsidian Slideshow 脚本：**没动过排序 = 按阅读顺序**（先上后下、
 * 同行先左后右），第一次显式排序才给每一页写 `order`。于是"画完就能放"，
 * 而排过序的板子不会因为改画框名/挪位置就跳页。
 *
 * 本模块不 import React / 思源 / vendor：node 侧直接跑单测。
 */

/** 幻灯片元数据在 customData 里的命名空间 */
export const PRESENTATION_KEY = "presentation";

/** 算「同一行」的垂直容差（场景坐标 px）：中心差在此之内按左右排 */
export const DECK_ROW_TOLERANCE = 60;

export type Slide = {
  id: string;
  /** 画框名（vendor 里可改）；空名由 slideTitle() 回落成 i18n key */
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  /** 显式页序；null = 还没排过序，按阅读顺序 */
  order: number | null;
  /** 是否入片（false = 留在面板里但不放映） */
  included: boolean;
  /**
   * 出场方式：auto = 逐条（跟随全局设置）；all = 这一页整页一起出。
   * 只存「例外」——默认按全局走，所以没写过元数据的老画框不用补数据。
   */
  reveal: "auto" | "all";
};

/** 只读接口：vendor 的 ExcalidrawElement 结构上满足它 */
export type FrameLike = {
  id: string;
  type?: string;
  isDeleted?: boolean;
  name?: string | null;
  x: number;
  y: number;
  width?: number;
  height?: number;
  customData?: unknown;
};

export type Deck = { slides: Slide[]; hasOrdered: boolean };

/** 一次元数据写入：{presentation:{order:2}} → 只改 order，customData 其余字段保留 */
export type DeckPatch = { id: string; patch: Record<string, Record<string, unknown>> };

function num(v: unknown, fallback: number): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

function metaOf(frame: FrameLike): { order?: unknown; included?: unknown; reveal?: unknown } {
  const raw = (frame.customData as Record<string, unknown> | undefined)?.[PRESENTATION_KEY];
  return typeof raw === "object" && raw !== null
    ? (raw as { order?: unknown; included?: unknown; reveal?: unknown })
    : {};
}

/** 场景元素 → 片单。非 frame / 已删除的一律不看 */
export function deckOf(elements: readonly FrameLike[]): Deck {
  const frames = elements.filter((e) => e.type === "frame" && !e.isDeleted);
  const slides = frames.map((f): Slide => {
    const meta = metaOf(f);
    return {
      id: f.id,
      name: typeof f.name === "string" ? f.name : "",
      x: num(f.x, 0),
      y: num(f.y, 0),
      w: num(f.width, 0),
      h: num(f.height, 0),
      order: typeof meta.order === "number" && Number.isFinite(meta.order) ? meta.order : null,
      included: meta.included !== false,
      reveal: meta.reveal === "all" ? "all" : "auto",
    };
  });
  return { slides: sortSlides(slides), hasOrdered: slides.some((s) => s.order !== null) };
}

/** 排序用的最小盒子：幻灯片和页内条目共用同一套阅读顺序 */
export type ReadingBox = { id: string; x: number; y: number; w?: number; h?: number };

/**
 * 阅读顺序比较器（先上后下、同行先左后右，最后按 id 定全序）。
 * 片单和「页内分条」都走它——两处口径一旦分叉，改页序和逐条出场会打架。
 */
export function compareReadingOrder(a: ReadingBox, b: ReadingBox): number {
  const ay = a.y + (a.h ?? 0) / 2;
  const by = b.y + (b.h ?? 0) / 2;
  const byRow = Math.abs(ay - by) > DECK_ROW_TOLERANCE ? ay - by : a.x - b.x;
  return byRow !== 0 ? byRow : a.id.localeCompare(b.id);
}

/**
 * 排序：有显式 order 的按 order（同值按 id 定全序，不把插入顺序当稳定性的运气）；
 * 一个都没有才按阅读顺序（先上后下、同行先左后右）。混排（只给一部分写过 order）
 * 也走 order 分支，没写过的那批落在末尾——那是数据被手工改坏时的兜底，不是常态。
 */
export function sortSlides(slides: readonly Slide[]): Slide[] {
  const out = [...slides];
  if (!out.some((s) => s.order !== null)) {
    return out.sort(compareReadingOrder);
  }
  return out.sort((a, b) => {
    const ao = a.order ?? Number.MAX_SAFE_INTEGER;
    const bo = b.order ?? Number.MAX_SAFE_INTEGER;
    return ao !== bo ? ao - bo : a.id.localeCompare(b.id);
  });
}

/** 放映用的那份：排除页剔掉 */
export function visibleSlides(deck: Deck): Slide[] {
  return deck.slides.filter((s) => s.included);
}

/**
 * 把第 from 页挪到 to 位（下标与面板所见同一份顺序）。
 * 关键：**整份重编**——第一次排序就给每一页都写上 order，此后改画框名、挪画框
 * 都不再影响页序（Slideshow 同款语义）。
 */
export function moveSlide(deck: Deck, from: number, to: number): DeckPatch[] {
  const slides = deck.slides;
  if (from < 0 || from >= slides.length || to < 0 || to >= slides.length || from === to) return [];
  const next = [...slides];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next.map((s, i) => ({
    id: s.id,
    patch: { [PRESENTATION_KEY]: { order: i, included: s.included, reveal: s.reveal } },
  }));
}

/**
 * 入片/排除一页。同样整份重编 order：排除不该顺手把没排过序的板子改成按 order 走，
 * 但既然要写元数据，就一次写全，免得同一块板子半排半不排。
 */
export function toggleSlide(deck: Deck, id: string): DeckPatch[] {
  if (!deck.slides.some((s) => s.id === id)) return [];
  return deck.slides.map((s, i) => ({
    id: s.id,
    patch: {
      [PRESENTATION_KEY]: { order: i, included: s.id === id ? !s.included : s.included, reveal: s.reveal },
    },
  }));
}

/**
 * 一页的出场方式：逐条（auto）↔ 整页（all）。
 * 只写这一页的 reveal——它不影响页序，没必要整份重编。
 */
export function toggleSlideReveal(deck: Deck, id: string): DeckPatch[] {
  const target = deck.slides.find((s) => s.id === id);
  if (!target) return [];
  return [{ id, patch: { [PRESENTATION_KEY]: { reveal: target.reveal === "all" ? "auto" : "all" } } }];
}

/** 页标题：空画框名回落「未命名页」这个 i18n key，由消费方 t() */
export function slideTitle(slide: Slide): string {
  return slide.name.trim() === "" ? "未命名页" : slide.name.trim();
}

/**
 * 片单签名：抽屉开着时 onChange 每帧都跑，拿它做去重键避免无谓 setState。
 * 画框挪动/改名也算变化（面板要跟着重排），但不含画框里的元素内容。
 */
export function deckSignature(deck: Deck): string {
  return deck.slides
    .map(
      (s) =>
        `${s.id}:${s.order ?? ""}:${s.included ? 1 : 0}:${s.reveal}:${s.name}:${Math.round(s.x)},${Math.round(s.y)}`,
    )
    .join("|");
}
