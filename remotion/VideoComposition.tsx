import React from "react";
import { Audio, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import type { VideoManifest } from "../src/types/videoManifest";
import { Background } from "./components/Background";
import { CharacterLayer } from "./components/CharacterLayer";
import { SubtitleLayer } from "./components/SubtitleLayer";

interface Props {
  manifest: VideoManifest;
}

export const VideoComposition: React.FC<Props> = ({ manifest }) => {
  const { width, height, fps } = useVideoConfig();
  const frame = useCurrentFrame();
  const currentMs = frame * (1000 / fps);

  // 現在再生中のセリフを探し、そのシーン背景を取得する
  const activeLine = manifest.lines.find(
    (l) => l.startMs <= currentMs && currentMs < l.startMs + l.durationMs,
  );
  const backgroundPath = activeLine?.backgroundFile ?? manifest.defaultBackground;

  return (
    <div style={{ width, height, position: "relative", overflow: "hidden" }}>
      {/* 透過モードのとき背景を描画しない */}
      {!manifest.transparent && (
        <Background
          backgroundPath={backgroundPath}
          width={width}
          height={height}
        />
      )}
      <CharacterLayer manifest={manifest} />
      <SubtitleLayer manifest={manifest} />
      <Audio src={staticFile(manifest.audioFile)} />
    </div>
  );
};
