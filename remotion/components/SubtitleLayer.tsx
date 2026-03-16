import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import type { VideoManifest } from "../../src/types/videoManifest";

interface Props {
  manifest: VideoManifest;
}

export const SubtitleLayer: React.FC<Props> = ({ manifest }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const currentMs = frame * (1000 / fps);

  const activeLine = manifest.lines.find(
    (l) => l.startMs <= currentMs && currentMs < l.startMs + l.durationMs,
  );

  if (!activeLine?.text) return null;

  const subtitleColor =
    activeLine.character && manifest.characters[activeLine.character]
      ? manifest.characters[activeLine.character].subtitleColor
      : "#FFFFFF";

  // 立ち絵の中央付近（上端から50%）に字幕を合わせる
  // charHeight = height * 0.30, charBottom = 88
  // 立ち絵中央 = charBottom + charHeight * 0.50
  const charHeight = height * 0.30;
  const subtitleBottom = Math.round(88 + charHeight * 0.50);

  return (
    <div
      style={{
        position: "absolute",
        bottom: subtitleBottom,
        left: 0,
        width,
        display: "flex",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          backgroundColor: "rgba(0, 0, 0, 0.72)",
          borderLeft: `4px solid ${subtitleColor}`,
          color: subtitleColor,
          fontSize: 28,
          fontFamily: "Noto Sans JP, Yu Gothic, Meiryo, sans-serif",
          fontWeight: "bold",
          padding: "8px 20px",
          borderRadius: "0 8px 8px 0",
          maxWidth: width * 0.82,
          textAlign: "center",
          lineHeight: 1.6,
          textShadow: "0 1px 4px rgba(0,0,0,0.8)",
        }}
      >
        {activeLine.text}
      </div>
    </div>
  );
};
