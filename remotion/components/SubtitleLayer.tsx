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

  // 画面のより下側・中央寄せに字幕を配置して、立ち絵と重なりにくくする
  // 立ち絵は bottom=88, 高さは 30% 程度なので、そのさらに下（例: 40px）に配置
  const subtitleBottom = 40;

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
          // 背景の黒い帯をなくし、文字のみ表示
          backgroundColor: "transparent",
          borderLeft: "none",
          color: subtitleColor,
          fontSize: 28,
          fontFamily: "Noto Sans JP, Yu Gothic, Meiryo, sans-serif",
          fontWeight: "bold",
          padding: 0,
          borderRadius: 0,
          // 横幅は維持しつつ、テキストだけを中央寄せで表示
          maxWidth: width * 0.64,
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
