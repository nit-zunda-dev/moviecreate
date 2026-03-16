import React from "react";
import { Audio, staticFile, useVideoConfig } from "remotion";
import type { VideoManifest } from "../src/types/videoManifest";
import { Background } from "./components/Background";
import { CharacterLayer } from "./components/CharacterLayer";
import { SubtitleLayer } from "./components/SubtitleLayer";

interface Props {
  manifest: VideoManifest;
}

export const VideoComposition: React.FC<Props> = ({ manifest }) => {
  const { width, height } = useVideoConfig();

  return (
    <div style={{ width, height, position: "relative", overflow: "hidden" }}>
      <Background
        backgroundPath={manifest.defaultBackground}
        width={width}
        height={height}
      />
      <CharacterLayer manifest={manifest} />
      <SubtitleLayer manifest={manifest} />
      <Audio src={staticFile(manifest.audioFile)} />
    </div>
  );
};
