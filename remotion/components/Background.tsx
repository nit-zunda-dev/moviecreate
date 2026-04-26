import React from "react";
import { Img, staticFile } from "remotion";

interface Props {
  backgroundPath: string | undefined;
  width: number;
  height: number;
  /**
   * `contain`＝上段用。スライド全体を枠内に収め、余白は外側divの色で塗る（下の字幕帯と被らない）
   * 既定 `cover` は全画面向け
   */
  objectFit?: "cover" | "contain";
  /** 親列に追従（高さ＝上段 flex の可変分）。`height` は無視し親を100%で埋める */
  fillColumn?: boolean;
}

export const Background: React.FC<Props> = ({ backgroundPath, width, height, objectFit = "cover", fillColumn }) => {
  if (backgroundPath) {
    if (fillColumn) {
      return (
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, overflow: "hidden" }}>
          <Img
            src={staticFile(backgroundPath)}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
              objectPosition: "center center",
              imageRendering: "auto",
            }}
          />
        </div>
      );
    }
    return (
      <Img
        src={staticFile(backgroundPath)}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width,
          height,
          objectFit,
          objectPosition: "center top",
          imageRendering: "auto",
        }}
      />
    );
  }

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width,
        height,
        backgroundColor: "#1a1a2e",
      }}
    />
  );
};
