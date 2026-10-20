/**
 * 2026-10-18 方案 A：素材库导入对话框（React 弹层，挂在 exs-root 内，参照 ExportDialog）。
 *
 * 三种入口，都汇到 vendor 的 updateLibrary（官方 importLibrary 的同款配方：
 * fetch → Blob → updateLibrary({libraryItems, merge, openLibraryMenu})）：
 *  ① 粘贴「Add to Excalidraw」跳转后地址栏里的链接（?addLibrary= / #addLibrary= 两形态）
 *  ② 粘贴「Download」按钮的 .excalidrawlib 直链
 *  ③ 选择本地 .excalidrawlib 文件（2026-10-19：桌面端优先思源主进程 showOpenDialog，
 *    初始目录=素材库文件夹、只列 .excalidrawlib；浏览器/移动端回落 input[type=file]）
 * 装完由 onLibraryChange（既有链路）自动落盘 excali-libraries/，并打开组件库面板。
 */

import { useEffect, useRef, useState } from "react";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { t } from "../i18n";
import { LIBRARY_IMPORT_ERROR_KEYS, parseLibraryInput } from "./library-import";
import { pickLibraryFile } from "./desktop-bridge.ts";

export type LibraryImportDialogProps = {
  api: ExcalidrawImperativeAPI | null;
  onClose: () => void;
  notify: (msg: string, timeout?: number) => void;
  /** 2026-10-19：素材库文件夹绝对路径（系统文件选择器的初始目录；空串 = 非思源宿主） */
  libDirAbs: string;
};

export function LibraryImportDialog(props: LibraryImportDialogProps) {
  const { api, onClose, notify, libDirAbs } = props;
  const [url, setUrl] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const importRemote = async (): Promise<void> => {
    const target = parseLibraryInput(url);
    if (target.kind === "error") {
      setErr(t(LIBRARY_IMPORT_ERROR_KEYS[target.reason]));
      return;
    }
    setErr("");
    setBusy(true);
    try {
      const res = await fetch(target.libraryUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      // 配方同官方 importLibrary：merge 合入、published 状态、装完打开组件库面板；
      // prompt=true = vendor 弹一次安装确认（防恶意链接，本地场景无 CSRF token 可免）
      await api?.updateLibrary({
        libraryItems: blob,
        prompt: true,
        merge: true,
        defaultStatus: "published",
        openLibraryMenu: true,
      });
      notify(t("素材库已导入"));
      onClose();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setErr(t("导入失败：{msg}", { msg }));
    } finally {
      setBusy(false);
    }
  };

  const importLocalFile = async (file: Blob): Promise<void> => {
    setErr("");
    setBusy(true);
    try {
      // 本地文件 = 用户自选，不弹确认、不标 published（与 vendor 的 Load 口径一致）
      await api?.updateLibrary({
        libraryItems: file,
        merge: true,
        openLibraryMenu: true,
      });
      notify(t("素材库已导入"));
      onClose();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setErr(t("导入失败：{msg}", { msg }));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="exs-mask" onMouseDown={onClose}>
      <div className="exs-lib-import-dialog" onMouseDown={(e) => e.stopPropagation()}>
        <h3>{t("导入素材库")}</h3>

        <p className="exs-lib-import-tip">{t("从 excalidraw.com 的素材库网站复制链接，或选择本地 .excalidrawlib 文件。")}</p>

        <form
          className="exs-lib-import-row"
          onSubmit={(e) => {
            e.preventDefault();
            void importRemote();
          }}
        >
          <input
            ref={inputRef}
            type="text"
            className="exs-lib-import-input"
            placeholder={t("粘贴「Add to Excalidraw」链接或 .excalidrawlib 直链")}
            value={url}
            disabled={busy}
            onChange={(e) => setUrl(e.target.value)}
          />
          <button type="submit" className="exs-lib-import-btn" disabled={busy || !url.trim()}>
            {busy ? t("导入中…") : t("导入")}
          </button>
        </form>

        <div className="exs-lib-import-row">
          <span className="exs-lib-import-or">{t("或者")}</span>
          <button
            type="button"
            className="exs-lib-import-btn ghost"
            disabled={busy}
            onClick={() => {
              // 2026-10-19：桌面端优先走思源主进程 showOpenDialog——能指定初始目录
              // （素材库文件夹）并过滤 .excalidrawlib，DOM input 做不到这两点；
              // 浏览器/移动端没有该通道，回落原 DOM input。
              void pickLibraryFile(libDirAbs).then((picked) => {
                if (picked.kind === "unavailable") {
                  fileRef.current?.click();
                  return;
                }
                if (picked.kind === "canceled") return;
                if (picked.kind === "read-error") {
                  setErr(t("无法读取所选文件"));
                  return;
                }
                void importLocalFile(picked.file.blob);
              });
            }}
          >
            {t("选择 .excalidrawlib 文件…")}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".excalidrawlib"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) void importLocalFile(file);
            }}
          />
        </div>

        {err ? <p className="exs-lib-import-err">{err}</p> : null}

        <div className="exs-lib-import-actions">
          <button type="button" className="exs-lib-import-btn ghost" disabled={busy} onClick={onClose}>
            {t("取消")}
          </button>
        </div>
      </div>
    </div>
  );
}
