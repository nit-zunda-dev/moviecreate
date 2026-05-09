import React from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import type { VideoManifest } from "../../src/types/videoManifest";

interface Props {
  manifest: VideoManifest;
}

/**
 * シーン開始時のチャプターラベルを下三分の一にスライドイン表示する。
 */
export const ChapterLowerThird: React.FC<Props> = ({ manifest }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const currentMs = frame * (1000 / fps);
  const chapters = manifest.chapters;
  if (!chapters?.length) return null;

  const active = chapters.find((c) => currentMs >= c.startMs && currentMs < c.endMs);
  if (!active) return null;

  const rel = currentMs - active.startMs;
  const fadeMs = 380;
  const tailFade = Math.min(fadeMs, active.endMs - active.startMs - rel);
  let opacity = 1;
  if (rel < fadeMs) opacity = rel / fadeMs;
  else if (tailFade < fadeMs && tailFade > 0) opacity = tailFade / fadeMs;

  const slide = interpolate(rel, [0, 320], [28, 0], { extrapolateRight: "clamp" });

  return (
    <div
      style={{
        position: "absolute",
        left: Math.round(width * 0.04),
        bottom: Math.round(height * 0.14),
        maxWidth: Math.round(width * 0.72),
        zIndex: 18,
        pointerEvents: "none",
        opacity,
        transform: `translateY(${slide}px)`,
      }}
    >
      <div
        style={{
          background: "linear-gradient(90deg, rgba(180,20,40,0.95) 0%, rgba(40,10,20,0.88) 100%)",
          borderLeft: "5px solid #FFEB3B",
          padding: "14px 22px",
          borderRadius: "4px 12px 12px 4px",
          boxShadow: "0 6px 24px rgba(0,0,0,0.55)",
        }}
      >
        <div
          style={{
            fontSize: Math.round(height * 0.028),
            fontWeight: 800,
            color: "#FFEB3B",
            letterSpacing: "0.04em",
            fontFamily: '"Noto Sans JP", "Yu Gothic UI", sans-serif',
            textShadow: "0 2px 8px rgba(0,0,0,0.9)",
          }}
        >
          CHAPTER
        </div>
        <div
          style={{
            marginTop: 6,
            fontSize: Math.round(height * 0.034),
            fontWeight: 900,
            color: "#FFFFFF",
            lineHeight: 1.25,
            fontFamily: '"Noto Sans JP", "Yu Gothic UI", sans-serif',
            textShadow: "0 2px 10px rgba(0,0,0,0.95)",
          }}
        >
          {active.label}
        </div>
      </div>
    </div>
  );
};
