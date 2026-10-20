/**
 * 2026-10-16 第十五轮（流畅度第二批 ③）：场景指纹与「脏」判定（纯函数、零依赖）。
 *
 * 原来只要收到过一次 vendor 的 onChange 就置脏——可 Excalidraw 平移画布、换工具、
 * 点色板、甚至打开一张没动过的白板都会回调，于是页签图标平白亮起脏点、dock 显示
 * 「有未保存的改动」、自动保存还会跑一整套 exportToSvg + putFile + .bak + 写设置。
 * 这一轮把判据换成「当前场景指纹 ≠ 落盘那份的指纹」：只有真改了内容才算脏。
 *
 * 单独成模块的口径（照 board-list.ts / dock-state.ts）：StudioApp 在 node 测试里只能
 * 被文本扫描，而「哪些字段算变」判错会静默丢改动，这条必须能真断言。
 *
 * 指纹只覆盖**会落进文件**的东西：元素（vendor 的 hashElementsVersion 读 versionNonce）、
 * 图片文件集合、以及内嵌 scene 里那四个 appState 键（viewBackgroundColor + 网格三项）。
 * currentItemStrokeColor 那类纯 UI 状态不落盘，进指纹就等于回到「换颜色也变脏」。
 *
 * 不用 JSON.stringify 整棵树：vendor 每个元素带一堆派生字段，一次拖拽就重算一次
 * 几百 KB 字符串，比原本的每帧 DOM 写还贵。
 */

/** 内嵌 scene 会记住的 appState 字段；Partial 是因为导出侧的 appState 是残缺的 */
export type CanvasAppState = {
  viewBackgroundColor?: string | null;
  gridModeEnabled?: boolean | null;
  gridSize?: number | null;
  gridStep?: number | null;
};

export type SceneStampParts = {
  /** 元素指纹：vendor hashElementsVersion 的结果（有序数值哈希，本模块不碰元素对象） */
  elementsHash: number;
  /** 图片集合指纹：filesStampOf 的结果 */
  files: string;
  /** 画布级偏好：canvasBitsOf 的结果 */
  canvas: {
    background: string;
    grid: boolean;
    gridSize: number;
    gridStep: number;
  };
};

/**
 * 图片集合指纹 = 按 id 排序的「id:字节数:类型」。
 *
 * 不哈希 dataURL 正文：一张截图的 base64 是几百 KB，而本函数所在的比较在「干净态」的
 * 每一次 onChange 里都要跑（一帧一次），拖拽又会变回每帧卡。id 集合变（增删图）、
 * 换一张不同大小的图都能抓到；「同 id 换成字节数完全相同的图」这一种会漏判，
 * 但那种改动只能来自外部替换文件，画布内没有这条路。
 */
export function filesStampOf(files: object | null | undefined): string {
  if (!files) return "";
  const map = files as Record<string, { dataURL?: string; mimeType?: string } | undefined>;
  return Object.keys(map)
    .sort()
    .map((id) => {
      const item = map[id];
      return `${id}:${item?.dataURL?.length ?? 0}:${item?.mimeType ?? ""}`;
    })
    .join(",");
}

/** 画布偏好归一：缺省值统一成 vendor 的默认，避免 undefined 与默认值互判成脏 */
export function canvasBitsOf(appState: CanvasAppState | null | undefined): SceneStampParts["canvas"] {
  return {
    background: appState?.viewBackgroundColor ?? "",
    grid: !!appState?.gridModeEnabled,
    gridSize: appState?.gridSize ?? 20,
    gridStep: appState?.gridStep ?? 5,
  };
}

/**
 * 三部分拼成一根串。「|」不会出现在颜色、数字或 files 指纹（只用「:」和「,」）里，
 * 所以不需要额外转义，也不会出现拼接撞车。
 */
export function sceneStampOf(parts: SceneStampParts): string {
  const c = parts.canvas;
  return `${parts.elementsHash}|${c.background}|${c.grid ? 1 : 0}|${c.gridSize}|${c.gridStep}|${parts.files}`;
}

/**
 * 脏判定。两种 null 的含义相反，别合并：
 * - current 为 null：指纹算不出来（vendor 内部异常），判不了就当脏，宁可多存一次；
 * - baseline 为 null：还没建立基线。挂载初期 vendor 也会回调一次 onChange，那不算用户改过，
 *   所以基线缺失一律判不脏；基线在拿到 api 的那一刻就会补上，之后不存在这个窗口。
 */
export function dirtyFromStamp(current: string | null, baseline: string | null): boolean {
  if (baseline === null) return false;
  if (current === null) return true;
  return current !== baseline;
}
