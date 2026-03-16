import React from "react";
import { Img, staticFile } from "remotion";

interface Props {
  backgroundPath: string | undefined;
  width: number;
  height: number;
}

export const Background: React.FC<Props> = ({ backgroundPath, width, height }) => {
  if (backgroundPath) {
    return (
      <Img
        src={staticFile(backgroundPath)}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width,
          height,
          objectFit: "cover",
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
