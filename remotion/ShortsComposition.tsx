import React from "react";
import {
  AbsoluteFill,
  Audio,
  Img,
  interpolate,
  Sequence,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { VideoManifest } from "../src/types/videoManifest";
import { Background } from "./components/Background";
import { HookIntro } from "./components/HookIntro";
import { EmphasisBurst } from "./components/EmphasisBurst";
import { CalloutBadge } from "./components/CalloutBadge";
import { BgmTrack } from "./components/BgmTrack";
import { SeTrack } from "./components/SeTrack";
import { sampleLipOpenness } from "./components/CharacterLayer";

interface Props {
  manifest: VideoManifest;
}

/**
 * Shorts（縦長 1080×1920）専用 Composition。
 *
 * レイアウト構造（縦に 3 段）:
 *   ┌─────────────────────┐
 *   │ overlayCaption       │ ← 上部 12%（任意・固定大テロップ）
 *   ├─────────────────────┤
 *   │                      │
 *   │   立ち絵（中央大）    │ ← 中央 48%（active line の character）
 *   │                      │
 *   ├─────────────────────┤
 *   │   字幕（大フォント）  │ ← 下部 40%
 *   └─────────────────────┘
 *
 * 全画面オーバーレイ:
 *   - Hook 区間（先頭）：HookIntro
 *   - EmphasisBurst（行ごと）／ CalloutBadge（行ごと）
 *   - 末尾 ctaDurationMs：CTA 大テロップ
 *
 * 音声:
 *   - 本編音声（Hook 終了後）／ BGM トラック ／ SE トラック
 */
export const ShortsComposition: React.FC<Props> = ({ manifest }) => {
  const { width, height, fps } = useVideoConfig();
  const frame = useCurrentFrame();
  const currentMs = frame * (1000 / fps);

  const hookFrames = manifest.hook
    ? Math.max(1, Math.round((manifest.hook.durationMs / 1000) * fps))
    : 0;

  const ctaDurationMs = manifest.shorts?.ctaDurationMs ?? 2000;
  const ctaFrames = manifest.shorts?.ctaText
    ? Math.max(1, Math.round((ctaDurationMs / 1000) * fps))
    : 0;
  const totalFrames = Math.max(1, Math.round((manifest.totalDurationMs / 1000) * fps));
  const ctaStartFrame = Math.max(0, totalFrames - ctaFrames);

  // 縦長の 3 段レイアウト（割合）
  const captionH = manifest.shorts?.overlayCaption ? Math.round(height * 0.12) : 0;
  const subtitleH = Math.round(height * 0.4);
  const characterTop = captionH;
  const characterH = height - captionH - subtitleH;

  const activeLine = manifest.lines.find(
    (l) => l.startMs <= currentMs && currentMs < l.startMs + l.durationMs,
  );
  const backgroundPath = activeLine?.backgroundFile ?? manifest.defaultBackground;

  return (
    <div style={{ width, height, position: "relative", overflow: "hidden", backgroundColor: "#0a0a14" }}>
      {/* === 背景（active line の background or default、無ければ黒）。全画面 cover で隙間なく === */}
      {backgroundPath && (
        <AbsoluteFill style={{ zIndex: 0 }}>
          <Background backgroundPath={backgroundPath} width={width} height={height} objectFit="cover" />
        </AbsoluteFill>
      )}

      {/* === 上部: overlayCaption（固定大テロップ） === */}
      {manifest.shorts?.overlayCaption && (
        <ShortsOverlayCaption text={manifest.shorts.overlayCaption} width={width} height={captionH} />
      )}

      {/* === 中央: 立ち絵（active line の character）=== */}
      <ShortsCharacter
        manifest={manifest}
        currentMs={currentMs}
        top={characterTop}
        width={width}
        height={characterH}
      />

      {/* === 下部: 字幕（大フォント）=== */}
      <ShortsSubtitle manifest={manifest} currentMs={currentMs} width={width} height={subtitleH} />

      {/* === Emphasis / Callout（本編と同じオーバーレイを再利用）=== */}
      <EmphasisBurst emphases={manifest.emphases} width={width} height={height} />
      <CalloutBadge callouts={manifest.callouts} width={width} />

      {/* === 音声（本編と同じ構造）=== */}
      <ShortsMainAudio audioFile={manifest.audioFile} hookFrames={hookFrames} />
      <BgmTrack segments={manifest.bgmSegments} />
      <SeTrack events={manifest.seEvents} />

      {/* === 冒頭 Hook 区間 === */}
      {manifest.hook && (
        <Sequence from={0} durationInFrames={hookFrames}>
          <HookIntro hook={manifest.hook} width={width} height={height} />
        </Sequence>
      )}

      {/* === 末尾 CTA 区間 === */}
      {manifest.shorts?.ctaText && ctaFrames > 0 && (
        <Sequence from={ctaStartFrame} durationInFrames={ctaFrames}>
          <ShortsCta text={manifest.shorts.ctaText} width={width} height={height} />
        </Sequence>
      )}
    </div>
  );
};

/** Hook 区間中は無音、Hook 終了直後から本編音声を再生する。 */
const ShortsMainAudio: React.FC<{ audioFile: string; hookFrames: number }> = ({
  audioFile,
  hookFrames,
}) => {
  if (hookFrames > 0) {
    return (
      <Sequence from={hookFrames}>
        <Audio src={staticFile(audioFile)} />
      </Sequence>
    );
  }
  return <Audio src={staticFile(audioFile)} />;
};

/** 上部固定の overlayCaption（無音再生でも内容が伝わる文言） */
const ShortsOverlayCaption: React.FC<{ text: string; width: number; height: number }> = ({
  text,
  width,
  height,
}) => {
  const fontSize = Math.round(height * 0.45);
  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width,
        height,
        zIndex: 5,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(180deg, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.55) 75%, rgba(0,0,0,0) 100%)",
        padding: "0 32px",
      }}
    >
      <div
        style={{
          fontSize,
          fontWeight: 900,
          color: "#FFEB3B",
          textShadow: "0 0 18px #000, 4px 4px 0 #B71C1C",
          fontFamily: '"Noto Sans JP", "Yu Gothic UI", sans-serif',
          letterSpacing: "0.02em",
          textAlign: "center",
          lineHeight: 1.05,
        }}
      >
        {text}
      </div>
    </div>
  );
};

/** 中央に大きく立ち絵を表示。active line の character を優先、無ければ最初に登場する character */
const ShortsCharacter: React.FC<{
  manifest: VideoManifest;
  currentMs: number;
  top: number;
  width: number;
  height: number;
}> = ({ manifest, currentMs, top, width, height }) => {
  const frame = useCurrentFrame();
  const activeLine = manifest.lines.find(
    (l) => l.startMs <= currentMs && currentMs < l.startMs + l.durationMs,
  );
  const charName = activeLine?.character;
  if (!charName) return null;
  const charConfig = manifest.characters[charName];
  if (!charConfig) return null;
  const imageFile = activeLine?.imageFile ?? charConfig.defaultImageFile;
  if (!imageFile) return null;

  const lipOpen = activeLine
    ? sampleLipOpenness(activeLine.lipKeyframes, currentMs - activeLine.startMs)
    : 0;
  const wobble = Math.sin(frame * 0.11) * lipOpen * 6;
  const lipScale = 1 + lipOpen * 0.038;

  // 高さに合わせて立ち絵を中央寄せ
  const imgHeight = Math.round(height * 0.95);
  return (
    <div
      style={{
        position: "absolute",
        top,
        left: 0,
        width,
        height,
        zIndex: 2,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          transform: `translateY(${wobble}px) scale(${lipScale})`,
          transformOrigin: "bottom center",
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
        }}
      >
        <Img
          src={staticFile(imageFile)}
          style={{
            height: imgHeight,
            width: "auto",
            objectFit: "contain",
            maxWidth: "95%",
          }}
        />
      </div>
    </div>
  );
};

/** 下部の字幕（縦長用に大きめフォント） */
const ShortsSubtitle: React.FC<{
  manifest: VideoManifest;
  currentMs: number;
  width: number;
  height: number;
}> = ({ manifest, currentMs, width, height }) => {
  const activeLine = manifest.lines.find(
    (l) => l.startMs <= currentMs && currentMs < l.startMs + l.durationMs,
  );
  if (!activeLine?.text) return null;

  const subtitleColor =
    (activeLine.character && manifest.characters[activeLine.character]?.subtitleColor) || "#FFFFFF";

  // 文字数で 3 段階フォントサイズ
  const len = activeLine.text.length;
  const baseFont = len > 60 ? height * 0.07 : len > 35 ? height * 0.085 : height * 0.1;

  return (
    <div
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        width,
        height,
        zIndex: 3,
        background: "linear-gradient(0deg, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.55) 70%, rgba(0,0,0,0) 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px 40px 64px 40px",
      }}
    >
      <div
        style={{
          color: subtitleColor,
          fontSize: Math.round(baseFont),
          fontWeight: 900,
          fontFamily: '"Noto Sans JP", "Yu Gothic UI", sans-serif',
          textAlign: "center",
          lineHeight: 1.25,
          textShadow: "0 0 12px #000, 3px 3px 0 #000",
          letterSpacing: "0.01em",
          width: "100%",
        }}
      >
        {activeLine.text}
      </div>
    </div>
  );
};

/** 末尾 ctaDurationMs に画面下半分に表示する CTA */
const ShortsCta: React.FC<{ text: string; width: number; height: number }> = ({
  text,
  width,
  height,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  // フェードイン（最初 8 フレーム）
  const opacity = interpolate(frame, [0, 8], [0, 1], { extrapolateRight: "clamp" });
  // 拡大（spring 風に）
  const scale = interpolate(frame, [0, 14], [0.85, 1.0], { extrapolateRight: "clamp" });
  // 矢印の上下バウンス
  const arrowY = Math.sin((frame / durationInFrames) * Math.PI * 4) * 12;

  return (
    <AbsoluteFill
      style={{
        zIndex: 20,
        background: "rgba(0,0,0,0.78)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 24,
        padding: 48,
      }}
    >
      <div
        style={{
          opacity,
          transform: `scale(${scale})`,
          fontSize: Math.round(height * 0.06),
          fontWeight: 900,
          color: "#FFEB3B",
          fontFamily: '"Noto Sans JP", "Yu Gothic UI", sans-serif',
          textAlign: "center",
          textShadow: "0 0 20px #000, 4px 4px 0 #B71C1C",
          lineHeight: 1.2,
          maxWidth: width * 0.9,
        }}
      >
        {text}
      </div>
      <div
        style={{
          opacity,
          transform: `translateY(${arrowY}px)`,
          fontSize: Math.round(height * 0.08),
          color: "#FFFFFF",
          textShadow: "0 0 16px #000",
        }}
      >
        ▼
      </div>
    </AbsoluteFill>
  );
};
