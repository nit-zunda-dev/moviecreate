import React from "react";
import { Img, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import type { VideoManifest } from "../../src/types/videoManifest";

interface Props {
  manifest: VideoManifest;
}

function positionStyle(position: "left" | "right" | "center"): React.CSSProperties {
  if (position === "left") return { left: "3%" };
  if (position === "right") return { right: "3%" };
  return { left: "50%", transform: "translateX(-50%)" };
}

export const CharacterLayer: React.FC<Props> = ({ manifest }) => {
  const frame = useCurrentFrame();
  const { fps, height } = useVideoConfig();
  const currentMs = frame * (1000 / fps);

  const activeLine = manifest.lines.find(
    (l) => l.startMs <= currentMs && currentMs < l.startMs + l.durationMs,
  );
  const activeCharacter = activeLine?.character;

  // 立ち絵の高さを画面の 40% に拡大
  const charHeight = Math.round(height * 0.40);
  // 字幕エリア（約80px）より上に立ち絵を配置
  const bottomOffset = 88;

  return (
    <>
      {Object.entries(manifest.characters).map(([charName, config]) => {
        const defaultImg = config.defaultImageFile;
        if (!defaultImg) return null;
        const isActive = activeCharacter === charName;
        // 発話中はその行の imageFile（表情）があれば使い、なければデフォルト
        const imageFile = isActive && activeLine?.imageFile ? activeLine.imageFile : defaultImg;
        const opacity = !activeCharacter || isActive ? 1 : 0.45;

        return (
          <Img
            key={charName}
            src={staticFile(imageFile)}
            style={{
              position: "absolute",
              bottom: bottomOffset,
              height: charHeight,
              objectFit: "contain",
              opacity,
              ...positionStyle(config.position),
            }}
          />
        );
      })}
    </>
  );
};
