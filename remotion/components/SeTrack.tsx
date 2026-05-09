import React from "react";
import { Audio, Sequence, staticFile, useVideoConfig } from "remotion";
import type { ManifestSeEvent } from "../../src/types/videoManifest";

interface Props {
  events?: ManifestSeEvent[];
}

/**
 * 動画全体の SE トラック。
 * 各イベントを `<Sequence from=指定フレーム>` で配置するだけ。
 * Audio の長さは素材自身の長さで決まる（Remotion が自動制御）。
 */
export const SeTrack: React.FC<Props> = ({ events }) => {
  const { fps } = useVideoConfig();
  if (!events || events.length === 0) return null;

  return (
    <>
      {events.map((ev, i) => {
        const fromFrame = Math.max(0, Math.round((ev.atMs / 1000) * fps));
        return (
          <Sequence key={`se-${i}-${ev.audioFile}-${ev.atMs}`} from={fromFrame}>
            <Audio src={staticFile(ev.audioFile)} volume={ev.volume} />
          </Sequence>
        );
      })}
    </>
  );
};
