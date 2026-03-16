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

  if (!activeLine?.text) {
    return null;
  }

  return (
    <div
      style={{
        position: "absolute",
        bottom: 24,
        left: 0,
        width,
        display: "flex",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          backgroundColor: "rgba(0, 0, 0, 0.7)",
          color: "#ffffff",
          fontSize: 32,
          fontFamily: "Noto Sans JP, Yu Gothic, sans-serif",
          padding: "12px 24px",
          borderRadius: 8,
          maxWidth: width * 0.85,
          textAlign: "center",
          lineHeight: 1.5,
        }}
      >
        {activeLine.text}
      </div>
    </div>
  );
};
