import React from "react";
import { Img, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import type { VideoManifest } from "../../src/types/videoManifest";

interface Props {
  manifest: VideoManifest;
}

export const CharacterLayer: React.FC<Props> = ({ manifest }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const currentMs = frame * (1000 / fps);

  const activeLine = manifest.lines.find(
    (l) => l.startMs <= currentMs && currentMs < l.startMs + l.durationMs,
  );

  if (!activeLine?.imageFile) {
    return null;
  }

  return (
    <Img
      src={staticFile(activeLine.imageFile)}
      style={{
        position: "absolute",
        bottom: 80,
        left: "50%",
        transform: "translateX(-50%)",
        height: "75%",
        objectFit: "contain",
      }}
    />
  );
};
