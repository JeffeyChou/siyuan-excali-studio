/**
 * 2026-10-15 阶段 A：导出对话框（React 弹层，挂在 exs-root 内）。
 * 参照 Obsidian Excalidraw 的 ExportDialog 最小集：格式 / 倍率 / 选中 / 透明 /
 * 暗色 / 内嵌 scene；动作只有「下载」与「复制」。白板本体是内嵌 scene 的 SVG
 * 文件，由保存链路负责，不走这个对话框。
 */

import { useState } from "react";
import {
  DEFAULT_EXPORT_OPTIONS,
  copyBlobToClipboard,
  downloadBlob,
  exportExt,
  exportFileName,
  exportScene,
  type ExportFormat,
  type ExportOptions,
  type ExportScene,
} from "./export";
import { t } from "../i18n";

const FORMAT_LABEL: Record<ExportFormat, string> = {
  png: "PNG",
  jpeg: "JPEG",
  webp: "WebP",
  svg: "SVG",
};

export type ExportDialogProps = {
  getScene: () => ExportScene | null;
  baseName: string;
  onClose: () => void;
  notify: (msg: string, timeout?: number) => void;
};

export function ExportDialog(props: ExportDialogProps) {
  const { getScene, baseName, onClose, notify } = props;
  const [opts, setOpts] = useState<ExportOptions>({ ...DEFAULT_EXPORT_OPTIONS });
  const [busy, setBusy] = useState(false);

  const set = <K extends keyof ExportOptions>(key: K, value: ExportOptions[K]): void =>
    setOpts((o) => ({ ...o, [key]: value }));

  const run = async (mode: "download" | "copy"): Promise<void> => {
    const scene = getScene();
    if (!scene || scene.elements.length === 0) {
      notify(t("画板为空，无可导出的内容"));
      return;
    }
    if (opts.selectionOnly && scene.appState && !hasSelection(scene)) {
      notify(t("没有选中任何元素"));
      return;
    }
    setBusy(true);
    try {
      const blob = await exportScene(scene, opts);
      const name = exportFileName(baseName, opts.format);
      if (mode === "download") {
        downloadBlob(blob, name);
        notify(t("已导出 {name}", { name }));
      } else {
        await copyBlobToClipboard(blob);
        notify(t("已复制到剪贴板"));
      }
      onClose();
    } catch (e) {
      notify(t("导出失败：{msg}", { msg: e instanceof Error ? e.message : String(e) }), 7000);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="exs-mask" onMouseDown={onClose}>
      <div className="exs-export-dialog" onMouseDown={(e) => e.stopPropagation()}>
        <h3>{t("导出白板")}</h3>

        <div className="exs-export-row">
          <span className="exs-export-label">{t("格式")}</span>
          <div className="exs-export-chips">
            {(Object.keys(FORMAT_LABEL) as ExportFormat[]).map((f) => (
              <button
                key={f}
                className={"exs-export-chip" + (opts.format === f ? " active" : "")}
                onClick={() => set("format", f)}
              >
                {FORMAT_LABEL[f]}
              </button>
            ))}
          </div>
        </div>

        {opts.format !== "svg" ? (
          <div className="exs-export-row">
            <span className="exs-export-label">{t("倍率")}</span>
            <div className="exs-export-chips">
              {[1, 2, 3].map((s) => (
                <button
                  key={s}
                  className={"exs-export-chip" + (opts.scale === s ? " active" : "")}
                  onClick={() => set("scale", s)}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <label className="exs-export-check">
          <input type="checkbox" checked={opts.selectionOnly} onChange={(e) => set("selectionOnly", e.target.checked)} />
          {t("仅导出选中元素")}
        </label>
        <label className="exs-export-check">
          <input type="checkbox" checked={opts.transparent} onChange={(e) => set("transparent", e.target.checked)} />
          {opts.format === "jpeg" ? t("透明背景（JPEG 不支持，将用白底）") : t("透明背景")}
        </label>
        <label className="exs-export-check">
          <input type="checkbox" checked={opts.dark} onChange={(e) => set("dark", e.target.checked)} />
          {t("按暗色主题导出")}
        </label>
        {opts.format === "svg" ? (
          <label className="exs-export-check">
            <input type="checkbox" checked={opts.embedScene} onChange={(e) => set("embedScene", e.target.checked)} />
            {t("内嵌可编辑 scene（可用本插件再次打开）")}
          </label>
        ) : null}

        <div className="exs-export-actions">
          <button className="exs-export-btn" disabled={busy} onClick={() => void run("download")}>
            {busy ? t("导出中…") : t("下载")}（{FORMAT_LABEL[opts.format]}.{exportExt(opts.format)}）
          </button>
          {opts.format !== "svg" ? (
            <button className="exs-export-btn" disabled={busy} onClick={() => void run("copy")}>
              {busy ? t("导出中…") : t("复制到剪贴板")}
            </button>
          ) : null}
          <button className="exs-export-btn ghost" disabled={busy} onClick={onClose}>
            {t("取消")}
          </button>
        </div>
      </div>
    </div>
  );
}

/** appState 里 selectedElementIds 非空即视为有选区（getScene 由调用方填好 appState） */
function hasSelection(scene: ExportScene): boolean {
  const ids = scene.appState?.selectedElementIds as unknown;
  return !!ids && typeof ids === "object" && Object.keys(ids as object).length > 0;
}
