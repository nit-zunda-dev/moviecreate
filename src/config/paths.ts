import path from "path";

export interface BasePaths {
  imageDir: string;
  musicDir: string;
  soundDir: string;
  tempDir: string;
  outputDir: string;
}

export function getBasePaths(): BasePaths {
  const root = process.cwd();
  return {
    imageDir: path.join(root, "image"),
    musicDir: path.join(root, "music"),
    soundDir: path.join(root, "sound"),
    tempDir: path.join(root, "temp"),
    outputDir: path.join(root, "output"),
  };
}

