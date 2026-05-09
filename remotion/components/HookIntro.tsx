import React from "react";
import { AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import type { ManifestHook } from "../../src/types/videoManifest";

interface Props {
  hook: ManifestHook;
  width: number;
  height: number;
}

/**
 * 動画冒頭5秒に強制挿入される「つかみ」演出。
 * 視聴維持率（最初の5〜10秒）の改善が目的。
 *
 * レイアウト：
 *   - 全面：濃い暗背景＋ノイズ用の薄いグラデ
 *   - 中央〜下：大きな立ち絵（任意）
 *   - 中央：巨大なフックコピー（emphasis 語は赤背景白抜き）
 *   - 0〜200ms：フラッシュ
 *   - 0〜500ms：軽い画面シェイク
 *   - 全期間：立ち絵をズームイン（任意）
 */
export const HookIntro: React.FC<Props> = ({ hook, width, height }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const hookFrames = Math.max(1, Math.round((hook.durationMs / 1000) * fps));

  // フラッシュ：先頭 flash.durationMs だけ全面色塗り（透明度 0.85→0）
  const flashFrames = hook.flash ? Math.max(1, Math.round((hook.flash.durationMs / 1000) * fps)) : 0;
  const flashOpacity = hook.flash
    ? interpolate(frame, [0, flashFrames], [0.85, 0], { extrapolateRight: "clamp" })
    : 0;

  // ズーム：from→to に Hook 全期間で線形補間
  const zoomScale = hook.zoom
    ? interpolate(frame, [0, hookFrames], [hook.zoom.from, hook.zoom.to], { extrapolateRight: "clamp" })
    : 1;

  // シェイク：先頭 0.5 秒に小さなランダム揺れ
  const shakeFrames = Math.round(0.5 * fps);
  const shakeAmp = hook.shake && frame < shakeFrames
    ? interpolate(frame, [0, shakeFrames], [10, 0], { extrapolateRight: "clamp" })
    : 0;
  const shakeX = shakeAmp * Math.sin(frame * 1.7);
  const shakeY = shakeAmp * Math.cos(frame * 2.3);

  // 大テロップ：spring で scale 0.6 → 1.0、5フレーム遅らせて登場
  const textDelay = Math.round(0.08 * fps);
  const textProgress = spring({
    frame: frame - textDelay,
    fps,
    config: { damping: 12, stiffness: 180 },
  });
  const textScale = interpolate(textProgress, [0, 1], [0.6, 1.0]);
  const textOpacity = interpolate(frame, [textDelay, textDelay + 4], [0, 1], {
    extrapolateRight: "clamp",
  });

  // フック末尾 0.4秒でフェードアウト
  const fadeOutStart = hookFrames - Math.round(0.4 * fps);
  const containerOpacity = interpolate(frame, [fadeOutStart, hookFrames - 1], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        opacity: containerOpacity,
        transform: `translate(${shakeX}px, ${shakeY}px)`,
        backgroundColor: "#0a0a14",
        zIndex: 10,
        overflow: "hidden",
      }}
    >
      {/* 背景の薄い赤系グラデーション（緊張感） */}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(40,10,15,0.95) 0%, rgba(8,8,16,1) 70%)",
        }}
      />

      {/* 立ち絵（任意） */}
      {hook.imageFile && (
        <div
          style={{
            position: "absolute",
            left: "50%",
            bottom: 0,
            transform: `translateX(-50%) scale(${zoomScale})`,
            transformOrigin: "center bottom",
            height: Math.round(height * 0.95),
            filter:
              "drop-shadow(0 0 16px rgba(0,0,0,0.7)) drop-shadow(0 8px 24px rgba(0,0,0,0.6))",
          }}
        >
          <Img
            src={staticFile(hook.imageFile)}
            style={{ width: "auto", height: "100%", objectFit: "contain" }}
          />
        </div>
      )}

      {/* フックコピー（中央上寄り） */}
      <div
        style={{
          position: "absolute",
          top: "12%",
          left: 0,
          right: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "flex-start",
          padding: "0 32px",
          opacity: textOpacity,
          transform: `scale(${textScale})`,
          transformOrigin: "center top",
        }}
      >
        <HookCopy text={hook.text} emphasis={hook.emphasis} width={width} />
      </div>

      {/* フラッシュ（最前面） */}
      {hook.flash && flashOpacity > 0 && (
        <AbsoluteFill
          style={{
            backgroundColor: hook.flash.color,
            opacity: flashOpacity,
            mixBlendMode: "screen",
          }}
        />
      )}

      {/*
        durationInFrames は親 Sequence で hookFrames に絞られている前提。
        万一 Hook 範囲外で描画されても影響しないよう transparent fallback。
      */}
      {durationInFrames < 0 && null}
    </AbsoluteFill>
  );
};

/**
 * フックコピー本文。emphasis に含まれる部分文字列を赤バッジ＋白抜きで強調する。
 * 単純な substring マッチで十分（高速・予測可能）。
 */
const HookCopy: React.FC<{ text: string; emphasis: string[]; width: number }> = ({
  text,
  emphasis,
  width,
}) => {
  // emphasis を長い順に並べておく（長い語が先にマッチしてほしい）
  const sortedEmphasis = [...emphasis].filter((s) => s.length > 0).sort((a, b) => b.length - a.length);

  const segments = splitByEmphasis(text, sortedEmphasis);

  // フォントサイズは画面幅から推定（1280px で 64px が目安、文字数で縮小）
  const baseFontSize = Math.round(width * 0.05);
  const lengthScale = text.length > 28 ? 28 / text.length : 1;
  const fontSize = Math.max(28, Math.round(baseFontSize * lengthScale));

  return (
    <div
      style={{
        fontFamily: "Noto Sans JP, Yu Gothic, Meiryo, sans-serif",
        fontWeight: 900,
        color: "#ffffff",
        fontSize,
        lineHeight: 1.3,
        textAlign: "center",
        textShadow:
          "0 4px 8px rgba(0,0,0,0.95), 0 0 20px rgba(0,0,0,0.7), 2px 2px 0 rgba(0,0,0,0.9)",
        maxWidth: width * 0.92,
        wordBreak: "keep-all",
        WebkitFontSmoothing: "antialiased",
      }}
    >
      {segments.map((seg, idx) =>
        seg.emphasized ? (
          <span
            key={idx}
            style={{
              display: "inline-block",
              backgroundColor: "#ff2244",
              color: "#fff200",
              padding: "0 12px",
              margin: "0 2px",
              borderRadius: 6,
              boxShadow: "0 0 0 4px rgba(255, 240, 0, 0.55), 0 6px 14px rgba(0,0,0,0.6)",
              transform: "skewX(-4deg)",
            }}
          >
            {seg.text}
          </span>
        ) : (
          <span key={idx}>{seg.text}</span>
        ),
      )}
    </div>
  );
};

interface Segment { text: string; emphasized: boolean; }

function splitByEmphasis(text: string, sortedEmphasis: string[]): Segment[] {
  if (sortedEmphasis.length === 0) return [{ text, emphasized: false }];
  const segments: Segment[] = [{ text, emphasized: false }];
  for (const word of sortedEmphasis) {
    const next: Segment[] = [];
    for (const seg of segments) {
      if (seg.emphasized) {
        next.push(seg);
        continue;
      }
      let cursor = 0;
      let idx = seg.text.indexOf(word);
      while (idx !== -1) {
        if (idx > cursor) next.push({ text: seg.text.slice(cursor, idx), emphasized: false });
        next.push({ text: word, emphasized: true });
        cursor = idx + word.length;
        idx = seg.text.indexOf(word, cursor);
      }
      if (cursor < seg.text.length) next.push({ text: seg.text.slice(cursor), emphasized: false });
    }
    segments.length = 0;
    segments.push(...next);
  }
  return segments;
}
