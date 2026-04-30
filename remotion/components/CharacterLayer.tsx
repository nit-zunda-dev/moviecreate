import React from "react";
import { Img, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { FLANK_TACHIE_MAX_HEIGHT_FRAC, TACHIE_SIZE_CAP_FRAC } from "../../src/config/videoLayout";
import type { VideoManifest } from "../../src/types/videoManifest";

export interface FlankLayout {
  mainHeight?: number;
  sideWidth: number;
  centerWidth: number;
  centerLeft: number;
  /** 上段 flex がフレーム幅いっぱいに伸びる（高さ 100% で固定 px しない） */
  topRowFillsFrame?: boolean;
  /** 立ち絵のスケール上限に使う（通常は composition の高さ） */
  frameHeightForTachie?: number;
}

/** global.videoFrame（教室フレーム）レイアウト時の左右スピーカー領域（px） */
export interface ClassroomZones {
  frameWidth: number;
  frameHeight: number;
  left: { left: number; top: number; width: number; height: number };
  right: { left: number; top: number; width: number; height: number };
}

interface Props {
  manifest: VideoManifest;
  flankLayout?: FlankLayout;
  /** 指定時は flankLayout より優先（左右の黒帯に立ち絵） */
  classroomZones?: ClassroomZones;
  frameHeight?: number;
}

export const CharacterLayer: React.FC<Props> = ({ manifest, flankLayout, classroomZones, frameHeight: frameHeightProp }) => {
  const frame = useCurrentFrame();
  const { fps, height, width } = useVideoConfig();
  const currentMs = frame * (1000 / fps);

  const activeLine = manifest.lines.find(
    (l) => l.startMs <= currentMs && currentMs < l.startMs + l.durationMs,
  );
  const activeCharacter = activeLine?.character;

  const fullH = frameHeightProp ?? height;
  const fill = flankLayout?.topRowFillsFrame;
  const rowHGuess =
    flankLayout?.frameHeightForTachie != null
      ? flankLayout.frameHeightForTachie * 0.76
      : (flankLayout?.mainHeight ?? fullH * 0.72);

  const charSprite = (
    charName: string,
    config: (typeof manifest.characters)[string],
    area: { width: number; height: number },
    classroom?: boolean,
  ) => {
    const defaultImg = config.defaultImageFile;
    if (!defaultImg) return null;
    const isActive = activeCharacter === charName;
    const imageFile = isActive && activeLine?.imageFile ? activeLine.imageFile : defaultImg;
    // 教室モードは黒帯内に収め、下方向へのはみ出し（translateY）で黒板と被らないようにする
    const charH = classroom
      ? Math.min(
          Math.round(area.height * 1.15),
          Math.round(area.width * 6.0),
          Math.round(fullH * 0.62),
        )
      : Math.min(
          Math.round(area.height * FLANK_TACHIE_MAX_HEIGHT_FRAC),
          Math.round(fullH * TACHIE_SIZE_CAP_FRAC),
        );
    return (
      <div
        key={charName}
        style={{
          position: "absolute",
          left: "50%",
          bottom: 0,
          transform: classroom ? "translateX(-50%)" : "translateX(-50%) translateY(12px)",
          height: charH,
          maxWidth: classroom ? Math.round(area.width * 2.4) : area.width,
          filter: "drop-shadow(0 0 6px rgba(0,0,0,0.5)) drop-shadow(0 4px 12px rgba(0,0,0,0.4))",
        }}
      >
        <Img
          src={staticFile(imageFile)}
          style={{
            width: "auto",
            height: "100%",
            maxWidth: classroom ? `${Math.round(area.width * 2.4)}px` : "100%",
            objectFit: "contain",
            display: "block",
            margin: "0 auto",
          }}
        />
      </div>
    );
  };

  if (classroomZones) {
    const { left: zLeft, right: zRight, frameWidth: czW, frameHeight: czH } = classroomZones;
    const byPos = { left: [] as React.ReactNode[], right: [] as React.ReactNode[] };
    for (const [name, config] of Object.entries(manifest.characters)) {
      const pos = config.position ?? "left";
      const zone = pos === "right" ? zRight : zLeft;
      const el = charSprite(
        name,
        config,
        {
          width: zone.width,
          height: zone.height,
        },
        true,
      );
      if (el) byPos[pos === "right" ? "right" : "left"].push(el);
    }
    return (
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: czW,
          height: czH,
          zIndex: 3,
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: zLeft.left,
            top: zLeft.top,
            width: zLeft.width,
            height: zLeft.height,
            overflow: "visible",
            pointerEvents: "none",
          }}
        >
          {byPos.left}
        </div>
        <div
          style={{
            position: "absolute",
            left: zRight.left,
            top: zRight.top,
            width: zRight.width,
            height: zRight.height,
            overflow: "visible",
            pointerEvents: "none",
          }}
        >
          {byPos.right}
        </div>
      </div>
    );
  }

  if (flankLayout) {
    const { mainHeight, sideWidth, centerWidth, centerLeft } = flankLayout;
    const hStyle = fill ? ("100%" as const) : mainHeight ?? rowHGuess;
    const byPos = { left: [] as React.ReactNode[], right: [] as React.ReactNode[], center: [] as React.ReactNode[] };
    for (const [name, config] of Object.entries(manifest.characters)) {
      const pos = config.position ?? "left";
      const hNum = typeof hStyle === "number" ? hStyle : rowHGuess;
      const el = charSprite(name, config, { width: pos === "center" ? centerWidth : sideWidth, height: hNum });
      if (el) byPos[pos === "right" ? "right" : pos === "center" ? "center" : "left"].push(el);
    }
    return (
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width,
          height: hStyle,
          zIndex: 1,
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: sideWidth,
            height: hStyle,
            pointerEvents: "none",
            overflow: "visible",
          }}
        >
          {byPos.left}
        </div>
        <div
          style={{
            position: "absolute",
            left: centerLeft + centerWidth,
            top: 0,
            width: sideWidth,
            height: hStyle,
            pointerEvents: "none",
            overflow: "visible",
          }}
        >
          {byPos.right}
        </div>
        {byPos.center.length > 0 && (
          <div
            style={{
              position: "absolute",
              left: centerLeft,
              top: 0,
              width: centerWidth,
              height: hStyle,
              pointerEvents: "none",
            }}
          >
            {byPos.center}
          </div>
        )}
      </div>
    );
  }

  const charHeight = Math.round(height * 0.4);
  const bottomOffset = 88;
  return (
    <>
      {Object.entries(manifest.characters).map(([charName, config]) => {
        const defaultImg = config.defaultImageFile;
        if (!defaultImg) return null;
        const isActive = activeCharacter === charName;
        const imageFile = isActive && activeLine?.imageFile ? activeLine.imageFile : defaultImg;
        const pos = config.position ?? "left";
        const horiz =
          pos === "left" ? { left: "3%" } : pos === "right" ? { right: "3%" } : { left: "50%", transform: "translateX(-50%)" as const };
        return (
          <div
            key={charName}
            style={{
              position: "absolute",
              bottom: bottomOffset,
              height: charHeight,
              filter: "drop-shadow(0 0 6px rgba(0,0,0,0.5)) drop-shadow(0 4px 12px rgba(0,0,0,0.4))",
              ...horiz,
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
