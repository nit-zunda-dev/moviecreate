import React from "react";
import { Audio, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import type { VideoManifest } from "../src/types/videoManifest";
import { SUBTITLE_BLOCK_HEIGHT_RATIO, TACHIE_SIDE_WIDTH_RATIO } from "../src/config/videoLayout";
import { Background } from "./components/Background";
import { CharacterLayer } from "./components/CharacterLayer";
import { SubtitleLayer } from "./components/SubtitleLayer";
import { HookIntro } from "./components/HookIntro";
import { EmphasisBurst } from "./components/EmphasisBurst";
import { CalloutBadge } from "./components/CalloutBadge";
import { ClassroomVideoComposition } from "./ClassroomVideoComposition";

interface Props {
  manifest: VideoManifest;
}

export const VideoComposition: React.FC<Props> = ({ manifest }) => {
  const { width, height, fps } = useVideoConfig();
  const frame = useCurrentFrame();
  const currentMs = frame * (1000 / fps);

  // Hook 区間（任意）。本編音声と本編 lines の startMs は manifestBuilder で
  // hookOffsetMs ぶん後ろにずらしてあるので、ここでは Audio を Sequence で
  // hookFrames だけ後ろから再生開始するだけで時間軸が一致する。
  const hookFrames = manifest.hook
    ? Math.max(1, Math.round((manifest.hook.durationMs / 1000) * fps))
    : 0;

  const activeLine = manifest.lines.find(
    (l) => l.startMs <= currentMs && currentMs < l.startMs + l.durationMs,
  );
  const backgroundPath = activeLine?.backgroundFile ?? manifest.defaultBackground;

  if (manifest.transparent) {
    return (
      <div style={{ width, height, position: "relative", overflow: "hidden" }}>
        <CharacterLayer manifest={manifest} frameHeight={height} />
        <SubtitleLayer manifest={manifest} />
        <EmphasisBurst emphases={manifest.emphases} width={width} height={height} />
        <CalloutBadge callouts={manifest.callouts} width={width} />
        <MainAudio audioFile={manifest.audioFile} hookFrames={hookFrames} />
        {manifest.hook && (
          <Sequence from={0} durationInFrames={hookFrames}>
            <HookIntro hook={manifest.hook} width={width} height={height} />
          </Sequence>
        )}
      </div>
    );
  }

  if (manifest.videoFrameFile) {
    return <ClassroomVideoComposition manifest={manifest} />;
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

      {/* 本編に重ねる演出オーバーレイ（Hook 区間中は startMs が hookOffsetMs 以降なので発火しない） */}
      <EmphasisBurst emphases={manifest.emphases} width={width} height={height} />
      <CalloutBadge callouts={manifest.callouts} width={width} />

      {/* 本編音声は Hook 終了後から再生開始 */}
      <MainAudio audioFile={manifest.audioFile} hookFrames={hookFrames} />

      {/* 冒頭 Hook 区間：HookIntro を最前面に被せる */}
      {manifest.hook && (
        <Sequence from={0} durationInFrames={hookFrames}>
          <HookIntro hook={manifest.hook} width={width} height={height} />
        </Sequence>
      )}
    </div>
  );
};

/** Hook 区間中は無音、Hook 終了直後から本編音声を再生する。 */
const MainAudio: React.FC<{ audioFile: string; hookFrames: number }> = ({ audioFile, hookFrames }) => {
  if (hookFrames > 0) {
    return (
      <Sequence from={hookFrames}>
        <Audio src={staticFile(audioFile)} />
      </Sequence>
    );
  }
  return <Audio src={staticFile(audioFile)} />;
};
