/**
 * 2026-10-21 P1/P2：图片转素材对话框。
 *
 * 流程：选中一张图片 → 解码（裁切/翻转/降采样）→ 转换（笔画 freedraw / 轮廓 keyhole 填充）→
 * 预览（vendor exportToSvg，所见即所得）→ 替换到画布或加入素材库。
 *
 * 两条路线由 MATERIAL_MODES 并列切换，不是档位高低：笔画元素多适合简笔，
 * 轮廓元素少、还原度高，适合毛笔字/图标。轮廓档的结果带配方，入库后脚本可重生成。
 *
 * 这里只做「当前这一次转换」；常驻能力在 image-to-material.ts，纯逻辑可单测。
 * 替换走 CaptureUpdateAction.IMMEDIATELY，⌘Z 能整组退回原图。
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CaptureUpdateAction, exportToSvg } from "@excalidraw/excalidraw";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { t } from "../i18n";
import {
  MATERIAL_MODES,
  OUTLINE_DETAILS,
  TRACE_DETAILS,
  canvasReplacement,
  decodeImageForTrace,
  libraryItemFromStrokes,
  materialModeOf,
  outlineDetailOf,
  traceImageToOutline,
  traceImageToStrokes,
  type ImageLike,
  type MaterialBuild,
  type MaterialMode,
  type OutlineDetail,
  type TraceBuild,
  type TraceDetail,
  type TraceMeta,
} from "./image-to-material.ts";
import type { RgbaImage } from "./ink-trace.ts";

export type ImageToMaterialDialogProps = {
  api: ExcalidrawImperativeAPI | null;
  /** 打开时选中的那张图片；转换期间被删掉则提示并禁用动作 */
  imageId: string;
  onClose: () => void;
  notify: (msg: string, timeout?: number) => void;
};

function errText(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

export function ImageToMaterialDialog(props: ImageToMaterialDialogProps) {
  const { api, imageId, onClose, notify } = props;
  const [image, setImage] = useState<ImageLike | null>(null);
  const [originalUrl, setOriginalUrl] = useState("");
  const [rgba, setRgba] = useState<RgbaImage | null>(null);
  const [mode, setMode] = useState<MaterialMode>("outline");
  const [detail, setDetail] = useState<TraceDetail>("standard");
  const [outlineDetail, setOutlineDetail] = useState<OutlineDetail>("standard");
  const [build, setBuild] = useState<MaterialBuild | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [decoding, setDecoding] = useState(true);
  const [tracing, setTracing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  /** 同一次打开的所有重描共用一套 id/种子：换档位不会把分组换掉 */
  const metaRef = useRef<TraceMeta | null>(null);
  if (metaRef.current === null) {
    const now = Date.now();
    const token = Math.random().toString(36).slice(2, 8);
    metaRef.current = {
      groupId: `g-i2m-${now.toString(36)}-${token}`,
      idPrefix: `mk-i2m-${now.toString(36)}-${token}`,
      seedBase: Math.floor(Math.random() * 2 ** 31),
      now,
    };
  }

  /* 读选中图片 → 解码。getFiles 在打开白板时已把 path 引用水合成 dataURL。 */
  useEffect(() => {
    let alive = true;
    setDecoding(true);
    setBuild(null);
    setPreviewUrl("");
    setOriginalUrl("");
    setError("");

    if (!api) {
      setError(t("画布还没就绪"));
      setDecoding(false);
      return;
    }
    const el =
      (api.getSceneElements() as unknown as ImageLike[]).find(
        (e) => e.id === imageId && !e.isDeleted && e.type === "image",
      ) ?? null;
    if (!el) {
      setError(t("图片已不在画布上"));
      setDecoding(false);
      return;
    }

    const file = api.getFiles()[String(el.fileId ?? "")] as { dataURL?: string } | undefined;
    const dataURL = typeof file?.dataURL === "string" ? file.dataURL : "";
    if (!dataURL) {
      setError(t("这张图片没有内嵌数据，无法转换（请重新插入图片）。"));
      setDecoding(false);
      return;
    }

    setImage(el);
    setOriginalUrl(dataURL);
    void decodeImageForTrace(dataURL, el)
      .then((next) => {
        if (alive) setRgba(next);
      })
      .catch(() => {
        if (alive) setError(t("图片解码失败，无法转换。"));
      })
      .finally(() => {
        if (alive) setDecoding(false);
      });

    return () => {
      alive = false;
    };
  }, [api, imageId]);

  /* 像素或档位变化 → 重转。同步计算放到下一拍，让「转换中…」先画出来。 */
  useEffect(() => {
    if (!rgba || !image) return;
    let alive = true;
    setTracing(true);
    const timer = window.setTimeout(() => {
      try {
        const next: MaterialBuild =
          mode === "outline"
            ? traceImageToOutline(rgba, image, outlineDetail, metaRef.current ?? {}, { dataURL: originalUrl })
            : traceImageToStrokes(rgba, image, detail, metaRef.current ?? {});
        if (!alive) return;
        setBuild(next);
        setError(
          next.elements.length === 0
            ? t(
                mode === "outline"
                  ? "没有识别到墨迹：请选择透明底或纯色底的线条、毛笔或图标类图片（照片不适合转换）。"
                  : "没有识别到墨迹：请选择线条、毛笔或图标类图片（照片不适合描迹）。",
              )
            : "",
        );
      } catch (e) {
        if (!alive) return;
        setBuild(null);
        setError(t("转换失败：{msg}", { msg: errText(e) }));
      } finally {
        if (alive) setTracing(false);
      }
    }, 0);
    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
  }, [rgba, image, mode, detail, outlineDetail, originalUrl]);

  /* 预览：vendor 自己的导出器，freedraw 的压感/粗细与画布一致 */
  useEffect(() => {
    if (!build || build.elements.length === 0) {
      setPreviewUrl("");
      return;
    }
    let alive = true;
    let url = "";
    setPreviewUrl(""); // 旧 blob 已在上一次清理里 revoke，先摘掉引用避免闪一张碎图
    const appState = api?.getAppState() ?? {};
    void exportToSvg({
      elements: build.elements as never,
      appState: { ...appState, exportBackground: false, exportWithDarkMode: false } as never,
      files: {},
    })
      .then((svg: SVGSVGElement) => {
        if (!alive) return;
        const text = new XMLSerializer().serializeToString(svg);
        url = URL.createObjectURL(new Blob([text], { type: "image/svg+xml" }));
        setPreviewUrl(url);
      })
      .catch((e: unknown) => {
        console.warn("[excali-studio] 笔画预览失败", e);
        if (alive) setPreviewUrl("");
      });
    return () => {
      alive = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [build, api]);

  const busy = decoding || tracing || saving;
  const canUse = !!build && build.elements.length > 0 && !busy;

  const replaceOnCanvas = useCallback((): void => {
    if (!api || !image || !build || build.elements.length === 0) return;
    const next = canvasReplacement(api.getSceneElements(), image.id, build.elements);
    const selected: Record<string, true> = {};
    for (const el of build.elements) selected[String(el.id)] = true;
    api.updateScene({
      elements: next as never,
      appState: { selectedElementIds: selected } as never,
      captureUpdate: CaptureUpdateAction.IMMEDIATELY,
    });
    notify(
      mode === "outline"
        ? t("已换成 {n} 层可编辑填充（⌘Z 撤销）", { n: build.elements.length })
        : t("已换成 {n} 笔可编辑笔画（⌘Z 撤销）", { n: build.stats.strokes }),
    );
    onClose();
  }, [api, build, image, mode, notify, onClose]);

  const addToLibrary = useCallback(async (): Promise<void> => {
    if (!api || !build || build.elements.length === 0) return;
    setSaving(true);
    setError("");
    try {
      const item = libraryItemFromStrokes(build.elements, {
        name:
          mode === "outline"
            ? t("图片转轮廓（{n} 层）", { n: build.elements.length })
            : t("图片转笔画（{n} 笔）", { n: build.stats.strokes }),
        recipe: build.recipe,
      });
      await api.updateLibrary({
        libraryItems: [item] as never,
        merge: true,
        openLibraryMenu: true,
      });
      notify(t("已加入素材库"));
      onClose();
    } catch (e) {
      setError(t("加入素材库失败：{msg}", { msg: errText(e) }));
    } finally {
      setSaving(false);
    }
  }, [api, build, mode, notify, onClose]);

  const statsLine = useMemo(() => {
    if (!build || build.elements.length === 0) return "";
    if (mode === "outline" && build.outline) {
      return t("{n} 层填充 · {p} 个点 · {h} 个孔洞 · 填充色 {color}", {
        n: build.outline.layers,
        p: build.stats.points,
        h: build.outline.holes,
        color: build.outline.strokeColor,
      });
    }
    return t("{n} 笔 · {p} 个点 · 描边色 {color}", {
      n: build.stats.strokes,
      p: build.stats.points,
      color: build.stats.strokeColor,
    });
  }, [build, mode]);

  return (
    <div className="exs-mask" onMouseDown={onClose}>
      <div className="exs-i2m-dialog" onMouseDown={(e) => e.stopPropagation()}>
        <h3>{t("图片转可编辑素材")}</h3>

        <div className="exs-export-row">
          <span className="exs-export-label">{t("方式")}</span>
          <div className="exs-export-chips">
            {MATERIAL_MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                className={"exs-export-chip" + (mode === m.id ? " active" : "")}
                disabled={decoding}
                onClick={() => setMode(m.id)}
              >
                {t(m.label)}
              </button>
            ))}
          </div>
        </div>
        <p className="exs-lib-import-tip">{t(materialModeOf(mode).hint)}</p>

        <div className="exs-i2m-previews">
          <div className="exs-i2m-figure">
            <div className="exs-i2m-preview">
              {originalUrl ? <img src={originalUrl} alt="" /> : null}
            </div>
            <span className="exs-i2m-cap">{t("原图")}</span>
          </div>
          <div className="exs-i2m-figure">
            <div className="exs-i2m-preview">
              {tracing ? (
                <span className="exs-i2m-busy">{t("转换中…")}</span>
              ) : previewUrl ? (
                <img src={previewUrl} alt="" />
              ) : (
                <span className="exs-i2m-busy">{decoding ? t("读取图片…") : "—"}</span>
              )}
            </div>
            <span className="exs-i2m-cap">{t("转换结果")}</span>
          </div>
        </div>

        <div className="exs-export-row">
          <span className="exs-export-label">{mode === "outline" ? t("精细") : t("细节")}</span>
          <div className="exs-export-chips">
            {mode === "outline"
              ? OUTLINE_DETAILS.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    className={"exs-export-chip" + (outlineDetail === d.id ? " active" : "")}
                    disabled={decoding}
                    onClick={() => setOutlineDetail(d.id)}
                  >
                    {t(d.label)}
                  </button>
                ))
              : TRACE_DETAILS.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    className={"exs-export-chip" + (detail === d.id ? " active" : "")}
                    disabled={decoding}
                    onClick={() => setDetail(d.id)}
                  >
                    {t(d.label)}
                  </button>
                ))}
          </div>
        </div>

        {statsLine && !tracing ? <p className="exs-i2m-stats">{statsLine}</p> : null}
        {error ? <p className="exs-lib-import-err">{error}</p> : null}

        <div className="exs-lib-import-actions">
          <button type="button" className="exs-lib-import-btn ghost" disabled={saving} onClick={onClose}>
            {t("取消")}
          </button>
          <button
            type="button"
            className="exs-lib-import-btn ghost"
            disabled={!canUse}
            onClick={() => void addToLibrary()}
          >
            {t("加入素材库")}
          </button>
          <button type="button" className="exs-lib-import-btn" disabled={!canUse} onClick={replaceOnCanvas}>
            {t("替换到画布")}
          </button>
        </div>
      </div>
    </div>
  );
}
