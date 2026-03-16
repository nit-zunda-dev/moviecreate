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
          // くっきりした単色バーで可読性を確保（半透明だと動画でにじみやすいためやや濃いめ）
          backgroundColor: "rgba(0, 0, 0, 0.75)",
          color: subtitleColor,
          fontSize: 26,
          fontFamily: "Noto Sans JP, Yu Gothic, Meiryo, sans-serif",
          fontWeight: "bold",
          padding: "10px 20px",
          borderRadius: 8,
          maxWidth: width * 0.64,
          textAlign: "center",
          lineHeight: 1.5,
          boxSizing: "border-box",
          // 文字は軽いシャドウのみでエッジをきれいに
          textShadow: "0 1px 2px rgba(0,0,0,0.8)",
          WebkitFontSmoothing: "antialiased",
        }}
      >
        {activeLine.text}
      </div>
    </div>
  );
};
