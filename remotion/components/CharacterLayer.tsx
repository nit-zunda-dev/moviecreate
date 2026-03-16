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
          <div
            key={charName}
            style={{
              position: "absolute",
              bottom: bottomOffset,
              height: charHeight,
              opacity,
              filter: "drop-shadow(0 0 6px rgba(0,0,0,0.5)) drop-shadow(0 4px 12px rgba(0,0,0,0.4))",
              ...positionStyle(config.position),
            }}
          >
            <Img
              src={staticFile(imageFile)}
              style={{
                width: "auto",
                height: "100%",
                objectFit: "contain",
                display: "block",
              }}
            />
          </div>
        );
      })}
    </>
  );
};
