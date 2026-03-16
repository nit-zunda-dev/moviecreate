import React from "react";
import { Composition } from "remotion";
import { VideoComposition } from "./VideoComposition";
import type { VideoManifest } from "../src/types/videoManifest";

const DEFAULT_FPS = 30;
const DEFAULT_WIDTH = 1280;
const DEFAULT_HEIGHT = 720;
const DEFAULT_DURATION_FRAMES = 30;

export const Root: React.FC = () => {
  return (
    <Composition
      id="VideoComposition"
      component={VideoComposition}
      fps={DEFAULT_FPS}
      width={DEFAULT_WIDTH}
      height={DEFAULT_HEIGHT}
      durationInFrames={DEFAULT_DURATION_FRAMES}
      defaultProps={{ manifest: undefined as unknown as VideoManifest }}
      calculateMetadata={async ({ props }) => {
        const manifest = props.manifest as VideoManifest;
        if (!manifest) {
          return { durationInFrames: DEFAULT_DURATION_FRAMES };
        }
        const fps = manifest.fps ?? DEFAULT_FPS;
        const durationInFrames = Math.max(
          1,
          Math.ceil((manifest.totalDurationMs / 1000) * fps),
        );
        return { durationInFrames, fps, width: manifest.width ?? DEFAULT_WIDTH, height: manifest.height ?? DEFAULT_HEIGHT };
      }}
    />
  );
};
