import React from "react";
import { Audio, Sequence, staticFile, useVideoConfig } from "remotion";
import type { ManifestBgmSegment } from "../../src/types/videoManifest";

interface Props {
  segments?: ManifestBgmSegment[];
}

/**
 * 動画全体の BGM トラック。
 * `bgmSegments` の配列を Sequence + Audio に展開する。
 *
 * - 各セグメントは指定区間に Audio を配置（loop=true なら繰り返し）
 * - 連続するセグメントの境界は fadeIn/fadeOut でクロスフェード
 *   （Remotion の Audio は `volume` に関数を渡せるので、相対時刻で計算）
 */
export const BgmTrack: React.FC<Props> = ({ segments }) => {
  const { fps } = useVideoConfig();
  if (!segments || segments.length === 0) return null;

  return (
    <>
      {segments.map((seg, i) => {
        const startFrame = Math.max(0, Math.round((seg.startMs / 1000) * fps));
        const segDurationMs = Math.max(0, seg.endMs - seg.startMs);
        const segDurationFrames = Math.max(1, Math.round((segDurationMs / 1000) * fps));
        const fadeInFrames = Math.max(0, Math.round((seg.fadeInMs / 1000) * fps));
        const fadeOutFrames = Math.max(0, Math.round((seg.fadeOutMs / 1000) * fps));

        return (
          <Sequence
            key={`bgm-${i}-${seg.audioFile}-${seg.startMs}`}
            from={startFrame}
            durationInFrames={segDurationFrames}
          >
            <Audio
              src={staticFile(seg.audioFile)}
              loop={seg.loop}
              volume={(f) => {
                // f はこの Sequence 内の相対フレーム
                if (f < fadeInFrames) {
                  return seg.volume * (f / Math.max(1, fadeInFrames));
                }
                const tailStart = segDurationFrames - fadeOutFrames;
                if (f >= tailStart && fadeOutFrames > 0) {
                  const remain = segDurationFrames - f;
                  return seg.volume * Math.max(0, remain / Math.max(1, fadeOutFrames));
                }
                return seg.volume;
              }}
            />
          </Sequence>
        );
      })}
    </>
  );
};
