import React from "react";
import { Img, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import type { VideoManifest } from "../../src/types/videoManifest";

interface Props {
  manifest: VideoManifest;
}

/**
 * 本編末尾のエンドスクリーン（次回タイトル・サムネ・登録誘導）。
 * `manifest.endScreen` が無い、または現在時刻が区間外なら何も出さない。
 */
export const EndScreenOverlay: React.FC<Props> = ({ manifest }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const currentMs = frame * (1000 / fps);
  const es = manifest.endScreen;
  if (!es) return null;

  const { startMs, durationMs, nextTitle, nextThumbnailFile, subscribeText } = es;
  if (currentMs < startMs || currentMs >= startMs + durationMs) return null;

  const rel = currentMs - startMs;
  const intro = Math.min(600, durationMs * 0.15);
  const bgOpacity = Math.min(1, rel / intro);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 24,
        pointerEvents: "none",
        background: `rgba(6,8,18,${0.92 * bgOpacity})`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: height * 0.03,
        padding: height * 0.05,
      }}
    >
      <div
        style={{
          fontSize: Math.round(height * 0.032),
          fontWeight: 800,
          color: "#94a3b8",
          letterSpacing: "0.2em",
          fontFamily: '"Noto Sans JP", sans-serif',
        }}
      >
        NEXT
      </div>

      {nextThumbnailFile && (
        <div
          style={{
            width: Math.min(width * 0.52, 560),
            aspectRatio: "16 / 9",
            borderRadius: 12,
            overflow: "hidden",
            boxShadow: "0 12px 40px rgba(0,0,0,0.65)",
            border: "3px solid rgba(255,235,59,0.35)",
          }}
        >
          <Img
            src={staticFile(nextThumbnailFile)}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </div>
      )}

      {nextTitle && (
        <div
          style={{
            fontSize: Math.round(height * 0.038),
            fontWeight: 900,
            color: "#FFFFFF",
            textAlign: "center",
            maxWidth: width * 0.88,
            lineHeight: 1.35,
            fontFamily: '"Noto Sans JP", sans-serif',
            textShadow: "0 4px 18px rgba(0,0,0,0.9)",
          }}
        >
          {nextTitle}
        </div>
      )}

      <div
        style={{
          marginTop: height * 0.02,
          padding: "14px 36px",
          borderRadius: 999,
          background: "linear-gradient(90deg, #e11d48 0%, #f97316 100%)",
          fontSize: Math.round(height * 0.03),
          fontWeight: 900,
          color: "#FFFFFF",
          fontFamily: '"Noto Sans JP", sans-serif',
          boxShadow: "0 8px 28px rgba(225,29,72,0.45)",
        }}
      >
        {subscribeText}
      </div>
    </div>
  );
};
