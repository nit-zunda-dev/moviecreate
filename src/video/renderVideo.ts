import path from "path";
import fs from "fs";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import { VideoManifest } from "../types/videoManifest";
import { getBasePaths } from "../config/paths";

/**
 * Remotion 用 publicDir にアセットをコピーして静的ファイルとして提供するためのパスに変換する。
 * Remotion (Chromium) は file:// アクセスをブロックするため、
 * すべての画像・音声を publicDir に配置して staticFile() 経由で参照する。
 */
function preparePublicAssets(manifest: VideoManifest, publicDir: string): VideoManifest {
  fs.mkdirSync(publicDir, { recursive: true });

  // キャッシュ: 元の絶対パス → publicDir 内のファイル名
  const copied = new Map<string, string>();

  function copyAsset(absPath: string, prefix: string): string {
    if (copied.has(absPath)) return copied.get(absPath)!;
    const ext = path.extname(absPath);
    const base = path.basename(absPath, ext).replace(/\s+/g, "_");
    const name = `${prefix}_${base}${ext}`;
    const dest = path.join(publicDir, name);
    if (!fs.existsSync(dest)) {
      fs.copyFileSync(absPath, dest);
    }
    copied.set(absPath, name);
    return name;
  }

  const audioName = copyAsset(manifest.audioFile, "audio");

  const lines = manifest.lines.map((line, i) => {
    if (!line.imageFile) return line;
    const imgName = copyAsset(line.imageFile, `img${i}`);
    return { ...line, imageFile: imgName };
  });

  let defaultBackground = manifest.defaultBackground;
  if (defaultBackground) {
    defaultBackground = copyAsset(defaultBackground, "bg");
  }

  return { ...manifest, audioFile: audioName, lines, defaultBackground };
}

/**
 * Remotion を使って VideoManifest から MP4 を生成する。
 */
export async function renderVideo(manifest: VideoManifest, outPath: string): Promise<void> {
  const remotionEntry = path.resolve(__dirname, "../../remotion/index.tsx");
  const { tempDir } = getBasePaths();
  const publicDir = path.join(tempDir, "remotion_public");

  // アセットを publicDir にコピーしてパスを相対名に変換
  const servedManifest = preparePublicAssets(manifest, publicDir);

  console.log("[Remotion] バンドル中... (初回は 30〜60 秒かかる場合があります)");
  const bundled = await bundle({
    entryPoint: remotionEntry,
    publicDir,
    onProgress: (progress) => {
      process.stdout.write(`\r[Remotion] バンドル進捗: ${progress}%`);
    },
  });
  process.stdout.write("\n");
  console.log("[Remotion] バンドル完了");

  const fps = servedManifest.fps;
  const durationInFrames = Math.ceil((servedManifest.totalDurationMs / 1000) * fps);

  const composition = await selectComposition({
    serveUrl: bundled,
    id: "VideoComposition",
    inputProps: { manifest: servedManifest },
  });

  console.log("[Remotion] レンダリング開始...");
  await renderMedia({
    composition,
    serveUrl: bundled,
    codec: "h264",
    outputLocation: path.resolve(outPath),
    inputProps: { manifest: servedManifest },
    onProgress: ({ progress }) => {
      process.stdout.write(`\r[Remotion] レンダリング進捗: ${Math.round(progress * 100)}%`);
    },
  });
  process.stdout.write("\n");
  console.log("[Remotion] レンダリング完了:", path.resolve(outPath));
}
