/**
 * 2026-10-15 阶段 B：图片导入（拖放进画布 / 剪贴板粘贴图片）。
 *
 * 上游组件没有 onDrop/onPaste 回调（0.18.1 props 里没有），所以拖放监听由
 * 调用方挂在画布根节点上、粘贴监听挂 window，图片的「解码 → addFiles →
 * 建 image 元素 → updateScene」流程收在本模块。
 *
 * 关于 newImageElement：0.18.1 的 exports 只给子路径开了 types 条件（运行时
 * 不可 import），root 也未再导出它，所以这里按 ExcalidrawImageElement 的
 * 字段形状手工构造（该结构跨版本稳定；index/seed 取安全默认值，Excalidraw
 * 的 restore/normalize 会自行重排）。
 *
 * 尺寸策略：超过 MAX_EDGE 的长边等比压到 MAX_EDGE（dataURL 也按压缩后的
 * canvas 重新导出），避免把 4K 截图原样塞进 scene 把文件撑爆。
 */

import { CaptureUpdateAction } from "@excalidraw/excalidraw";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { fitDimensions, MAX_EDGE } from "./image-fit";
import type { Point } from "./scene-point.ts";

export { MAX_EDGE, fitDimensions };

export interface LoadedImage {
  dataURL: string;
  mimeType: string;
  width: number;
  height: number;
  /** 是否被压缩过 */
  resized: boolean;
}

/** File → dataURL（超限时经 canvas 重采样压缩） */
export async function loadImageFile(file: File): Promise<LoadedImage | null> {
  if (!file.type.startsWith("image/")) return null;
  const raw = await readAsDataURL(file);
  const img = await loadHTMLImage(raw);
  const fit = fitDimensions(img.naturalWidth, img.naturalHeight);
  if (fit.width === img.naturalWidth && fit.height === img.naturalHeight) {
    return { dataURL: raw, mimeType: file.type || "image/png", width: fit.width, height: fit.height, resized: false };
  }
  const canvas = document.createElement("canvas");
  canvas.width = fit.width;
  canvas.height = fit.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0, fit.width, fit.height);
  const mimeType = /jpe?g|webp/i.test(file.type) ? file.type : "image/png";
  const dataURL = canvas.toDataURL(mimeType, 0.92);
  return { dataURL, mimeType, width: fit.width, height: fit.height, resized: true };
}

/** 手工构造 image 元素（见文件头说明） */
function makeImageElement(opts: {
  id: string;
  fileId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  index: string;
  seed: number;
}): Record<string, unknown> {
  const now = Date.now();
  return {
    id: opts.id,
    type: "image",
    x: opts.x,
    y: opts.y,
    width: opts.width,
    height: opts.height,
    angle: 0,
    strokeColor: "transparent",
    backgroundColor: "transparent",
    fillStyle: "solid",
    strokeWidth: 1,
    strokeStyle: "solid",
    roughness: 1,
    opacity: 100,
    groupIds: [],
    frameId: null,
    roundness: null,
    seed: opts.seed,
    version: 1,
    versionNonce: opts.seed,
    index: opts.index,
    isDeleted: false,
    boundElements: null,
    updated: now,
    link: null,
    locked: false,
    status: "saved",
    fileId: opts.fileId,
    scale: [1, 1],
    crop: null,
  };
}

/**
 * 把一批图片文件插进画布：at 为场景坐标（第一张落点，后续错开 24px 防完全重叠）。
 * 返回成功插入的张数；单张失败跳过不中断整批。
 */
export async function insertImageFiles(api: ExcalidrawImperativeAPI, files: File[], at: Point): Promise<number> {
  let inserted = 0;
  for (const file of files) {
    try {
      const img = await loadImageFile(file);
      if (!img) continue;
      const id = `file-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
      api.addFiles([
        {
          id,
          dataURL: img.dataURL,
          mimeType: img.mimeType,
          created: Date.now(),
        } as never,
      ]);
      const el = makeImageElement({
        id: `img-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
        fileId: id,
        x: at.x + inserted * 24,
        y: at.y + inserted * 24,
        width: img.width,
        height: img.height,
        index: `a${inserted}`,
        seed: 123456789 + inserted,
      });
      api.updateScene({
        elements: [...api.getSceneElements(), el as never],
        appState: { selectedElementIds: { [el.id as string]: true } },
        captureUpdate: CaptureUpdateAction.IMMEDIATELY,
      });
      inserted++;
    } catch (e) {
      console.warn("[excali-studio] 图片插入失败，跳过", file?.name, e);
    }
  }
  return inserted;
}

function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("读取失败"));
    reader.readAsDataURL(file);
  });
}

function loadHTMLImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("图片解码失败"));
    img.src = src;
  });
}

/** dataURL → 原始尺寸（ea 句柄建 image 元素用；同步拿不到，必须异步） */
export async function imageNaturalSize(dataURL: string): Promise<{ width: number; height: number }> {
  const img = await loadHTMLImage(dataURL);
  return { width: img.naturalWidth, height: img.naturalHeight };
}
