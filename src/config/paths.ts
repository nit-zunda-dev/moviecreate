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

/** 動画マニフェスト JSON の出力パスを返す */
export function getManifestPath(title: string): string {
  const { tempDir } = getBasePaths();
  return path.join(tempDir, `${title}_video_manifest.json`);
}
