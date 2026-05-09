import path from "path";
import fs from "fs";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import {
  VideoManifest,
  CharacterDisplayConfig,
  ManifestHook,
  ManifestBgmSegment,
  ManifestSeEvent,
} from "../types/videoManifest";
import { getBasePaths } from "../config/paths";

/**
 * Remotion の publicDir にアセットをコピーし、
 * manifest 内のパスを publicDir 相対名に書き換えて返す。
 * Remotion（Chromium）は file:// アクセスをブロックするため必須。
 */
function preparePublicAssets(manifest: VideoManifest, publicDir: string): VideoManifest {
  fs.mkdirSync(publicDir, { recursive: true });

  let assetIndex = 0;
  const copied = new Map<string, string>();

  function copyAsset(absPath: string): string {
    if (copied.has(absPath)) return copied.get(absPath)!;
    const ext = path.extname(absPath);
    const name = `asset_${assetIndex++}${ext}`;
    fs.copyFileSync(absPath, path.join(publicDir, name));
    copied.set(absPath, name);
    return name;
  }

  const audioFile = copyAsset(manifest.audioFile);

  const lines = manifest.lines.map((line) => {
    return {
      ...line,
      imageFile: line.imageFile ? copyAsset(line.imageFile) : undefined,
      backgroundFile: line.backgroundFile ? copyAsset(line.backgroundFile) : undefined,
    };
  });

  const characters: Record<string, CharacterDisplayConfig> = {};
  for (const [charName, config] of Object.entries(manifest.characters)) {
    characters[charName] = {
      ...config,
      defaultImageFile: config.defaultImageFile ? copyAsset(config.defaultImageFile) : undefined,
    };
  }

  let defaultBackground = manifest.defaultBackground;
  if (defaultBackground) {
    defaultBackground = copyAsset(defaultBackground);
  }

  let videoFrameFile = manifest.videoFrameFile;
  if (videoFrameFile) {
    videoFrameFile = copyAsset(videoFrameFile);
  }

  // Hook ブロックの絶対パス資産も publicDir にコピーして相対名に書き換える。
  let hook: ManifestHook | undefined = manifest.hook;
  if (hook) {
    hook = {
      ...hook,
      imageFile: hook.imageFile ? copyAsset(hook.imageFile) : undefined,
      bgmFile: hook.bgmFile ? copyAsset(hook.bgmFile) : undefined,
      seFile: hook.seFile ? copyAsset(hook.seFile) : undefined,
      voiceOver: hook.voiceOver
        ? { ...hook.voiceOver, wavFile: copyAsset(hook.voiceOver.wavFile) }
        : undefined,
    };
  }

  // BGM セグメント / SE イベント の音源も publicDir にコピー
  let bgmSegments: ManifestBgmSegment[] | undefined = manifest.bgmSegments;
  if (bgmSegments) {
    bgmSegments = bgmSegments.map((seg) => ({
      ...seg,
      audioFile: copyAsset(seg.audioFile),
    }));
  }
  let seEvents: ManifestSeEvent[] | undefined = manifest.seEvents;
  if (seEvents) {
    seEvents = seEvents.map((ev) => ({
      ...ev,
      audioFile: copyAsset(ev.audioFile),
    }));
  }

  let endScreenOut: VideoManifest["endScreen"] = manifest.endScreen;
  if (endScreenOut?.nextThumbnailFile) {
    endScreenOut = {
      ...endScreenOut,
      nextThumbnailFile: copyAsset(endScreenOut.nextThumbnailFile),
    };
  }

  return {
    ...manifest,
    audioFile,
    lines,
    characters,
    defaultBackground,
    videoFrameFile,
    hook,
    bgmSegments,
    seEvents,
    endScreen: endScreenOut,
  };
}

export interface RenderVideoOptions {
  /** 透過レンダリング（ProRes 4444 / .mov 出力） */
  transparent?: boolean;
  /**
   * 使用する Remotion Composition ID。
   * 既定: "VideoComposition"（本編・横長）
   * Shorts 派生時は "ShortsComposition"（縦長 1080×1920）
   */
  compositionId?: string;
}

/**
 * Remotion を使って VideoManifest から動画を生成する。
 * 通常: H.264 MP4 / 透過モード: ProRes 4444 MOV
 */
export async function renderVideo(
  manifest: VideoManifest,
  outPath: string,
  options: RenderVideoOptions = {},
): Promise<void> {
  const remotionEntry = path.resolve(__dirname, "../../remotion/index.tsx");
  const { tempDir } = getBasePaths();
  const publicDir = path.join(tempDir, "remotion_public");

  const servedManifest: VideoManifest = {
    ...preparePublicAssets(manifest, publicDir),
    transparent: options.transparent ?? false,
  };

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

  const compositionId = options.compositionId ?? "VideoComposition";
  const composition = await selectComposition({
    serveUrl: bundled,
    id: compositionId,
    inputProps: { manifest: servedManifest },
  });

  const codec = options.transparent ? "prores" : "h264";
  console.log(`[Remotion] レンダリング開始... (composition: ${compositionId}, codec: ${codec})`);

  await renderMedia({
    composition,
    serveUrl: bundled,
    codec,
    outputLocation: path.resolve(outPath),
    inputProps: { manifest: servedManifest },
    onProgress: ({ progress }) => {
      process.stdout.write(`\r[Remotion] レンダリング進捗: ${Math.round(progress * 100)}%`);
    },
  });
  process.stdout.write("\n");
  console.log("[Remotion] レンダリング完了:", path.resolve(outPath));
}
