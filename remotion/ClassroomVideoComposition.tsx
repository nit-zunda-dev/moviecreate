import React from "react";
import { Audio, Img, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import type { VideoManifest } from "../src/types/videoManifest";
import { CLASSROOM_FRAME_LAYOUT } from "../src/config/videoLayout";
import { Background } from "./components/Background";
import { CharacterLayer, type ClassroomZones } from "./components/CharacterLayer";
import { SubtitleLayer } from "./components/SubtitleLayer";
import { HookIntro } from "./components/HookIntro";
import { EmphasisBurst } from "./components/EmphasisBurst";
import { CalloutBadge } from "./components/CalloutBadge";
import { BgmTrack } from "./components/BgmTrack";
import { SeTrack } from "./components/SeTrack";

interface Props {
  manifest: VideoManifest;
}

const SlideBackground: React.FC<{ manifest: VideoManifest; width: number; height: number }> = ({
  manifest,
  width,
  height,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const currentMs = frame * (1000 / fps);
  const activeLine = manifest.lines.find(
    (l) => l.startMs <= currentMs && currentMs < l.startMs + l.durationMs,
  );
  const backgroundPath = activeLine?.backgroundFile ?? manifest.defaultBackground;
  return (
    <Background backgroundPath={backgroundPath} width={width} height={height} objectFit="contain" fillColumn />
  );
};

/** global.videoFrame 指定時：フレーム全面イラストの上に、上段＝スライド・下段＝字幕・左右＝立ち絵 */
export const ClassroomVideoComposition: React.FC<Props> = ({ manifest }) => {
  const { width, height, fps } = useVideoConfig();
  const vf = manifest.videoFrameFile;
  if (!vf) {
    throw new Error("ClassroomVideoComposition: videoFrameFile が未定義です。");
  }

  const hookFrames = manifest.hook
    ? Math.max(1, Math.round((manifest.hook.durationMs / 1000) * fps))
    : 0;

  const L = CLASSROOM_FRAME_LAYOUT;
  const slide = {
    left: Math.round(L.slide.x * width),
    top: Math.round(L.slide.y * height),
    width: Math.round(L.slide.w * width),
    height: Math.round(L.slide.h * height),
  };
  const sub = {
    left: Math.round(L.subtitle.x * width),
    top: Math.round(L.subtitle.y * height),
    width: Math.round(L.subtitle.w * width),
    height: Math.round(L.subtitle.h * height),
  };
  const classroomZones: ClassroomZones = {
    frameWidth: width,
    frameHeight: height,
    left: {
      left: Math.round(L.leftCharacter.x * width),
      top: Math.round(L.leftCharacter.y * height),
      width: Math.round(L.leftCharacter.w * width),
      height: Math.round(L.leftCharacter.h * height),
    },
    right: {
      left: Math.round(L.rightCharacter.x * width),
      top: Math.round(L.rightCharacter.y * height),
      width: Math.round(L.rightCharacter.w * width),
      height: Math.round(L.rightCharacter.h * height),
    },
  };

  return (
    <div style={{ width, height, position: "relative", overflow: "hidden", backgroundColor: "#000" }}>
      <Img
        src={staticFile(vf)}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition: "center center",
          zIndex: 0,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: slide.left,
          top: slide.top,
          width: slide.width,
          height: slide.height,
          overflow: "hidden",
          zIndex: 1,
          borderRadius: 4,
        }}
      >
        <SlideBackground manifest={manifest} width={slide.width} height={slide.height} />
      </div>
      <CharacterLayer manifest={manifest} frameHeight={height} classroomZones={classroomZones} />
      <SubtitleLayer manifest={manifest} classroomEmbed={sub} storyWidth={width} />

      {/* 本編に重ねる演出オーバーレイ */}
      <EmphasisBurst emphases={manifest.emphases} width={width} height={height} />
      <CalloutBadge callouts={manifest.callouts} width={width} />

      {/* 本編音声は Hook 終了後から再生開始 */}
      {hookFrames > 0 ? (
        <Sequence from={hookFrames}>
          <Audio src={staticFile(manifest.audioFile)} />
        </Sequence>
      ) : (
        <Audio src={staticFile(manifest.audioFile)} />
      )}

      {/* BGM / SE トラック（Hook 区間も含めて全体に並ぶ） */}
      <BgmTrack segments={manifest.bgmSegments} />
      <SeTrack events={manifest.seEvents} />

      {/* 冒頭 Hook 区間 */}
      {manifest.hook && (
        <Sequence from={0} durationInFrames={hookFrames}>
          <HookIntro hook={manifest.hook} width={width} height={height} />
        </Sequence>
      )}
    </div>
  );
};
