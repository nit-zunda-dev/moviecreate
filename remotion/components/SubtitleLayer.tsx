import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { SUBTITLE_MAX_LINES } from "../../src/config/videoLayout";
import type { VideoManifest } from "../../src/types/videoManifest";

interface Props {
  manifest: VideoManifest;
  /** 旧: 固定高さの帯。非推奨（切れやすい） */
  barHeight?: number;
  /** スライド直下。指定時 `fixedBlockHeight` で3行分など固定し上段高さ不変 */
  underSlideBar?: boolean;
  /** 字幕ブロックの高さ（px）。未指定の underSlideBar は従来の可変高さ */
  fixedBlockHeight?: number;
  width?: number;
}

export const SubtitleLayer: React.FC<Props> = ({
  manifest,
  barHeight,
  underSlideBar,
  fixedBlockHeight,
  width: widthProp,
}) => {
  const frame = useCurrentFrame();
  const { fps, width: vcWidth } = useVideoConfig();
  const width = widthProp ?? vcWidth;
  const currentMs = frame * (1000 / fps);

  const activeLine = manifest.lines.find(
    (l) => l.startMs <= currentMs && currentMs < l.startMs + l.durationMs,
  );

  if (!activeLine?.text) return null;

  const subtitleColor =
    activeLine.character && manifest.characters[activeLine.character]
      ? manifest.characters[activeLine.character].subtitleColor
      : "#FFFFFF";

  if (underSlideBar) {
    const lh = 1.42;
    if (fixedBlockHeight == null) {
      throw new Error("SubtitleLayer: underSlideBar では fixedBlockHeight が必要です。");
    }
    const blockH = fixedBlockHeight;
    const fontSize = Math.min(
      24,
      Math.max(16, Math.floor((blockH - 20) / (SUBTITLE_MAX_LINES * lh))),
    );
    const maxTextHeightPx = Math.round(fontSize * lh * SUBTITLE_MAX_LINES);

    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: blockH,
          minHeight: blockH,
          boxSizing: "border-box",
          padding: "4px 8px",
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            backgroundColor: "rgba(0, 0, 0, 0.75)",
            color: subtitleColor,
            fontSize,
            fontFamily: "Noto Sans JP, Yu Gothic, Meiryo, sans-serif",
            fontWeight: "bold",
            padding: "6px 14px",
            borderRadius: 6,
            maxWidth: width * 0.95,
            maxHeight: maxTextHeightPx,
            textAlign: "center",
            lineHeight: `${lh}em`,
            whiteSpace: "pre-line",
            overflow: "hidden",
            boxSizing: "border-box",
            textShadow: "0 1px 2px rgba(0,0,0,0.8)",
            WebkitFontSmoothing: "antialiased",
          }}
        >
          {activeLine.text}
        </div>
      </div>
    );
  }

  const inBar = barHeight != null;
  const fontSize = inBar ? Math.min(32, Math.max(18, Math.round(barHeight! * 0.36))) : 38;
  const padY = inBar ? 4 : 10;

  return (
    <div
      style={{
        position: "absolute",
        ...(inBar ? { inset: 0 } : { bottom: 40, left: 0, width }),
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 2,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          backgroundColor: "rgba(0, 0, 0, 0.72)",
          color: subtitleColor,
          fontSize,
          fontFamily: "Noto Sans JP, Yu Gothic, Meiryo, sans-serif",
          fontWeight: "bold",
          padding: `${padY}px 16px`,
          borderRadius: 6,
          maxWidth: width * 0.92,
          textAlign: "center",
          lineHeight: 1.38,
          whiteSpace: "pre-line",
          boxSizing: "border-box",
          textShadow: "0 1px 2px rgba(0,0,0,0.8)",
          WebkitFontSmoothing: "antialiased",
        }}
      >
        {activeLine.text}
      </div>
    </div>
  );
};
