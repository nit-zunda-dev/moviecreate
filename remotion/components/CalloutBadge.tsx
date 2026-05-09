import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { ManifestCallout } from "../../src/types/videoManifest";

interface Props {
  callouts: ManifestCallout[] | undefined;
  width: number;
}

interface StyleSpec {
  bg: string;
  fg: string;
  border: string;
  icon: string;
  label: string;
}

const STYLES: Record<string, StyleSpec> = {
  exam: { bg: "#ff3b3b", fg: "#fff200", border: "#fff200", icon: "🔥", label: "試験頻出" },
  warn: { bg: "#ff9500", fg: "#1a1a1a", border: "#ffd699", icon: "⚠️", label: "注意" },
  tip: { bg: "#22c2ff", fg: "#0a1a2e", border: "#cff0ff", icon: "💡", label: "豆知識" },
  breaking: { bg: "#1a1a1a", fg: "#ff4d4d", border: "#ff4d4d", icon: "🚨", label: "速報" },
};

/**
 * 画面右上の常駐テロップ（4スタイル: exam/warn/tip/breaking）。
 * 行ごとの callout を時刻イベントとして受け取り、現在時刻にマッチしたものだけ描画する。
 */
export const CalloutBadge: React.FC<Props> = ({ callouts, width }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const currentMs = frame * (1000 / fps);

  if (!callouts || callouts.length === 0) return null;

  const active = callouts.find((c) => c.startMs <= currentMs && currentMs < c.endMs);
  if (!active) return null;

  const style = STYLES[active.style] ?? STYLES.tip;

  // 出現アニメ：spring で右からスライドイン
  const elapsedMs = currentMs - active.startMs;
  const elapsedFrames = (elapsedMs / 1000) * fps;
  const eventFrames = Math.max(1, Math.round(((active.endMs - active.startMs) / 1000) * fps));
  const fadeOutFrames = Math.max(1, Math.round(0.25 * fps));
  const fadeOutStart = eventFrames - fadeOutFrames;

  const sp = spring({ frame: elapsedFrames, fps, config: { damping: 14, stiffness: 200 } });
  const slideIn = interpolate(sp, [0, 1], [120, 0]);
  const opacityIn = interpolate(elapsedFrames, [0, 4], [0, 1], { extrapolateRight: "clamp" });
  const opacityOut =
    elapsedFrames >= fadeOutStart
      ? interpolate(elapsedFrames, [fadeOutStart, eventFrames], [1, 0], { extrapolateRight: "clamp" })
      : 1;
  const opacity = Math.min(opacityIn, opacityOut);

  const fontSize = Math.max(20, Math.round(width * 0.022));

  return (
    <div
      style={{
        position: "absolute",
        top: 24,
        right: 24,
        zIndex: 7,
        opacity,
        transform: `translateX(${slideIn}px)`,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 10,
          padding: "10px 18px",
          backgroundColor: style.bg,
          color: style.fg,
          border: `3px solid ${style.border}`,
          borderRadius: 999,
          fontFamily: "Noto Sans JP, Yu Gothic, Meiryo, sans-serif",
          fontWeight: 900,
          fontSize,
          boxShadow: "0 8px 18px rgba(0,0,0,0.45), 0 0 0 2px rgba(0,0,0,0.25)",
          textShadow: "0 1px 2px rgba(0,0,0,0.45)",
          WebkitFontSmoothing: "antialiased",
          maxWidth: Math.round(width * 0.6),
          whiteSpace: "nowrap",
        }}
      >
        <span style={{ fontSize: fontSize * 1.15, lineHeight: 1 }}>{style.icon}</span>
        <span>{active.text}</span>
      </div>
    </div>
  );
};
