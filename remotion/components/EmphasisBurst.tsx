import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { TACHIE_SIDE_WIDTH_RATIO } from "../../src/config/videoLayout";
import type { ManifestEmphasis } from "../../src/types/videoManifest";

interface Props {
  emphases: ManifestEmphasis[] | undefined;
  width: number;
  height: number;
}

/**
 * 行ごとの emphasis を画面上寄りに「ドカン！」と叩き付けるオーバーレイ。
 *
 * - 1行に複数語が含まれる場合は、行の発話時間内で順送りに切替
 * - 各語：spring で scale 0.7→1.05→1 / opacity 0→1
 * - 終了 0.2秒は opacity 1→0 でフェードアウト
 * - 配置は「画面上 12〜18% 付近 × 横は左右の立ち絵カラムを避けた中央 60%」
 *   立ち絵が左右下から大きく出てくるレイアウトでも被らないようにしている。
 */
export const EmphasisBurst: React.FC<Props> = ({ emphases, width, height }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const currentMs = frame * (1000 / fps);

  if (!emphases || emphases.length === 0) return null;

  const active = emphases.find((e) => e.startMs <= currentMs && currentMs < e.endMs);
  if (!active || active.texts.length === 0) return null;

  // どの語を出すか：イベント内を等分して順送り
  const eventDurMs = Math.max(1, active.endMs - active.startMs);
  const slotMs = eventDurMs / active.texts.length;
  const elapsedMs = currentMs - active.startMs;
  const slotIdx = Math.min(active.texts.length - 1, Math.floor(elapsedMs / slotMs));
  const word = active.texts[slotIdx];
  if (!word) return null;

  const slotStartMs = slotIdx * slotMs;
  const slotElapsedMs = elapsedMs - slotStartMs;
  const slotElapsedFrames = (slotElapsedMs / 1000) * fps;
  const slotFrames = Math.max(1, Math.round((slotMs / 1000) * fps));
  const fadeOutFrames = Math.max(1, Math.round(0.18 * fps));
  const fadeOutStart = slotFrames - fadeOutFrames;

  // 登場アニメ
  const sp = spring({
    frame: slotElapsedFrames,
    fps,
    config: { damping: 9, stiffness: 220 },
  });
  const scale = interpolate(sp, [0, 1], [0.7, 1.0]);
  const opacityIn = interpolate(slotElapsedFrames, [0, 3], [0, 1], { extrapolateRight: "clamp" });
  const opacityOut =
    slotElapsedFrames >= fadeOutStart
      ? interpolate(slotElapsedFrames, [fadeOutStart, slotFrames], [1, 0], { extrapolateRight: "clamp" })
      : 1;
  const opacity = Math.min(opacityIn, opacityOut);

  // 立ち絵カラム（左右各 20%）を避けて中央 60% に収める
  const sideW = Math.round(width * TACHIE_SIDE_WIDTH_RATIO);
  const centerW = width - 2 * sideW;

  // フォントサイズ：文字数 + 中央領域の幅に応じて自動調整
  const baseFontSize = Math.round(centerW * 0.11);
  const lengthScale = word.length > 8 ? 8 / word.length : 1;
  const fontSize = Math.max(32, Math.round(baseFontSize * lengthScale));

  return (
    <div
      style={{
        position: "absolute",
        top: Math.round(height * 0.12),
        left: sideW,
        width: centerW,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        pointerEvents: "none",
        zIndex: 8,
      }}
    >
      <div
        style={{
          fontFamily: "Noto Sans JP, Yu Gothic, Meiryo, sans-serif",
          fontWeight: 900,
          color: "#fff200",
          fontSize,
          padding: "8px 20px",
          maxWidth: centerW - 24,
          backgroundColor: "rgba(255, 34, 68, 0.95)",
          border: "4px solid #fff200",
          borderRadius: 10,
          opacity,
          transform: `scale(${scale}) skewX(-4deg)`,
          textShadow: "0 4px 8px rgba(0,0,0,0.95), 0 0 14px rgba(0,0,0,0.7)",
          boxShadow: "0 12px 24px rgba(0,0,0,0.55)",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          WebkitFontSmoothing: "antialiased",
        }}
      >
        {word}
      </div>
    </div>
  );
};
