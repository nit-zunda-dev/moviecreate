import React from "react";
import { Audio, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import type { VideoManifest } from "../src/types/videoManifest";
import { SUBTITLE_BLOCK_HEIGHT_RATIO, TACHIE_SIDE_WIDTH_RATIO } from "../src/config/videoLayout";
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

  const activeLine = manifest.lines.find(
    (l) => l.startMs <= currentMs && currentMs < l.startMs + l.durationMs,
  );
  const backgroundPath = activeLine?.backgroundFile ?? manifest.defaultBackground;

  if (manifest.transparent) {
    return (
      <div style={{ width, height, position: "relative", overflow: "hidden" }}>
        <CharacterLayer manifest={manifest} frameHeight={height} />
        <SubtitleLayer manifest={manifest} />
        <Audio src={staticFile(manifest.audioFile)} />
      </div>
    );
  }

  const sideW = Math.round(width * TACHIE_SIDE_WIDTH_RATIO);
  const centerW = width - 2 * sideW;
  const subtitleBlockH = Math.round(height * SUBTITLE_BLOCK_HEIGHT_RATIO);
  const mainH = height - subtitleBlockH;

  return (
    <div
      style={{
        width,
        height,
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#0c0c14",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "relative",
          flex: "0 0 auto",
          minWidth: 0,
          width: "100%",
          height: mainH,
          display: "flex",
          flexDirection: "row",
          backgroundColor: "#0c0c14",
        }}
      >
        <div
          style={{
            width: sideW,
            minWidth: sideW,
            height: "100%",
            backgroundColor: "#0c0c14",
            overflow: "visible",
          }}
        />
        <div
          style={{
            position: "relative",
            width: centerW,
            minWidth: 0,
            height: "100%",
            backgroundColor: "#12121a",
          }}
        >
          <Background
            backgroundPath={backgroundPath}
            width={centerW}
            height={0}
            objectFit="contain"
            fillColumn
          />
        </div>
        <div
          style={{
            width: sideW,
            minWidth: sideW,
            height: "100%",
            backgroundColor: "#0c0c14",
            overflow: "visible",
          }}
        />
        <CharacterLayer
          manifest={manifest}
          frameHeight={height}
          flankLayout={{
            sideWidth: sideW,
            centerWidth: centerW,
            centerLeft: sideW,
            topRowFillsFrame: true,
            frameHeightForTachie: mainH,
          }}
        />
      </div>
      <div
        style={{
          flex: "0 0 auto",
          width: "100%",
          height: subtitleBlockH,
          minHeight: subtitleBlockH,
          backgroundColor: "#0a0a12",
          zIndex: 2,
        }}
      >
        <SubtitleLayer
          manifest={manifest}
          underSlideBar
          fixedBlockHeight={subtitleBlockH}
          width={width}
        />
      </div>
      <Audio src={staticFile(manifest.audioFile)} />
    </div>
  );
};
