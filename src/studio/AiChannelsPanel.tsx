/**
 * 第四十四轮：AI 通道面板（☰「AI 通道…」打开的 fixed 浮层）。
 *
 * 形态 = 居中弹层 + 半透明底：低频设置类面板，用完即关，不常驻占位
 * （荧光笔色板那种贴边浮层适合高频工具，这里不适用）。
 * 文案全部来自 ai/channels.ts 的元数据——四道门的语义（注册门/调用门/软门/
 * 入口门）必须与实现一字不差，改门先改元数据。
 */

import { useEffect, useState } from "react";
// 相对导入带 .ts 后缀（node --experimental-strip-types 不认无后缀相对路径；Vite 两边都认）
import { t } from "../i18n";
import { CHANNEL_META, type AiChannels, type ChannelId } from "./ai/channels";
import { LineIcon } from "./line-icon";

export type AiChannelsPanelProps = {
  channels: AiChannels;
  onToggle: (id: ChannelId, on: boolean) => void;
  onClose: () => void;
};

export function AiChannelsPanel(props: AiChannelsPanelProps) {
  const { channels, onToggle, onClose } = props;
  const [copied, setCopied] = useState<ChannelId | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [onClose]);

  const copy = (id: ChannelId, text: string) => {
    void navigator.clipboard
      ?.writeText(text)
      .then(() => {
        setCopied(id);
        setTimeout(() => setCopied((c) => (c === id ? null : c)), 1600);
      })
      .catch(() => undefined);
  };

  return (
    <div className="exs-ai-scrim" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="exs-ai-panel" role="dialog" aria-label={t("AI 通道")}>
        <div className="exs-ai-panel__head">
          <b>{t("AI 通道")}</b>
          <span>{t("四条通道共用同一套计划 DSL 与风格包")}</span>
          <button className="exs-ai-panel__close" title={t("关闭")} onClick={onClose}>
            ✕
          </button>
        </div>
        {CHANNEL_META.map((m) => (
          <div className="exs-ai-row" key={m.id}>
            <LineIcon d={m.icon} size={20} />
            <div className="exs-ai-row__mid">
              <div className="exs-ai-row__nm">
                {t(m.title)}
                <span className={`exs-ai-badge${channels[m.id] ? "" : " exs-ai-badge--off"}`}>{m.badge}</span>
              </div>
              <div className="exs-ai-row__ds">{t(m.desc)}</div>
              <div className="exs-ai-row__gate">{t(m.gate)}</div>
              {m.sample ? (
                <div className="exs-ai-row__sample">
                  <code>{m.sample}</code>
                  <button onClick={() => copy(m.id, m.sample)}>{copied === m.id ? t("已复制") : t("复制")}</button>
                </div>
              ) : null}
            </div>
            <button
              className={`exs-ai-sw${channels[m.id] ? " exs-ai-sw--on" : ""}`}
              role="switch"
              aria-checked={channels[m.id]}
              title={channels[m.id] ? t("已开启") : t("已关闭")}
              onClick={() => onToggle(m.id, !channels[m.id])}
            />
          </div>
        ))}
        <div className="exs-ai-panel__foot">
          {t("全关 = 白板退回纯手动模式；开关即时写入插件设置（内置智能体一栏需重载生效）")}
        </div>
      </div>
    </div>
  );
}
