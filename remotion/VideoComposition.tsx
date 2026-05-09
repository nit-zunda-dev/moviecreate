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
import { BgmTrack } from "./components/BgmTrack";
import { SeTrack } from "./components/SeTrack";
import { ChapterLowerThird } from "./components/ChapterLowerThird";
import { EndScreenOverlay } from "./components/EndScreenOverlay";
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
        <BgmTrack segments={manifest.bgmSegments} />
        <SeTrack events={manifest.seEvents} />
        {manifest.hook && (
          <Sequence from={0} durationInFrames={hookFrames}>
            <HookIntro hook={manifest.hook} width={width} height={height} />
          </Sequence>
        )}
        <ChapterLowerThird manifest={manifest} />
        <EndScreenOverlay manifest={manifest} />
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
        position: "relative",
        width,
        height,
        backgroundColor: "#0c0c14",
        overflow: "hidden",
      }}
    >
      {/* 全画面背景：cover で左右上下とも隙間なく敷く（行ごとに切替） */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width,
          height,
          zIndex: 0,
          overflow: "hidden",
        }}
      >
        <Background backgroundPath={backgroundPath} width={width} height={height} objectFit="cover" />
      </div>

      {/* 立ち絵：背景の上にオーバーレイ（左右に大きめ配置） */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width,
          height: mainH,
          zIndex: 2,
          pointerEvents: "none",
        }}
      >
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

      {/* 下部字幕帯：半透明黒グラデーションで読みやすく、背景画像も透けて見える */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          width,
          height: subtitleBlockH,
          background:
            "linear-gradient(0deg, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.7) 60%, rgba(0,0,0,0.0) 100%)",
          zIndex: 3,
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

      {/* BGM / SE トラック（Hook 区間も含めて全体に並ぶ） */}
      <BgmTrack segments={manifest.bgmSegments} />
      <SeTrack events={manifest.seEvents} />

      {/* 冒頭 Hook 区間：HookIntro を最前面に被せる */}
      {manifest.hook && (
        <Sequence from={0} durationInFrames={hookFrames}>
          <HookIntro hook={manifest.hook} width={width} height={height} />
        </Sequence>
      )}
      <ChapterLowerThird manifest={manifest} />
      <EndScreenOverlay manifest={manifest} />
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
