import fs from "fs";
import path from "path";
import { Scenario, Line } from "../types/scenario";
import { VideoManifest, ManifestLine } from "../types/videoManifest";
import { LineTimingResult } from "../voicevox/synthesizeLine";

export interface LineResultWithContext {
  result: LineTimingResult;
  line: Line;
  sceneId: string;
  lineIndex: number;
}

/**
 * タイミング情報を集約して VideoManifest を構築する。
 */
export function buildVideoManifest(
  scenario: Scenario,
  lineResults: LineResultWithContext[],
  audioFile: string,
  characterLayerMaps: Record<string, Record<string, string>>,
): VideoManifest {
  const fps = scenario.output?.fps ?? scenario.global?.defaultFps ?? 30;
  const width = scenario.output?.width ?? 1280;
  const height = scenario.output?.height ?? 720;

  let currentMs = 0;
  const lines: ManifestLine[] = [];

  for (let i = 0; i < lineResults.length; i++) {
    const { result, line, sceneId, lineIndex } = lineResults[i];

    const character = line.character;
    let imageFile: string | undefined;

    if (character) {
      const layerMap = characterLayerMaps[character];
      if (layerMap) {
        const charSettings = scenario.characters?.[character];
        const faceName = line.face ?? charSettings?.defaultFace;
        if (faceName && layerMap[faceName]) {
          imageFile = layerMap[faceName];
        } else {
          // フォールバック：最初のレイヤー
          const firstKey = Object.keys(layerMap)[0];
          if (firstKey) imageFile = layerMap[firstKey];
        }
      }
    }

    lines.push({
      globalIndex: i,
      sceneId,
      lineIndex,
      text: line.text ?? line.subtitle ?? "",
      character,
      imageFile,
      speakerId: result.speakerId,
      wavFile: result.wavPath,
      startMs: currentMs,
      durationMs: result.durationMs,
    });

    currentMs += result.durationMs;
  }

  const defaultBackground = scenario.global?.defaultBackground
    ? path.resolve(scenario.global.defaultBackground)
    : undefined;

  return {
    title: scenario.title,
    totalDurationMs: currentMs,
    fps,
    width,
    height,
    audioFile: path.resolve(audioFile),
    defaultBackground,
    lines,
    generatedAt: new Date().toISOString(),
  };
}

/** VideoManifest を JSON ファイルとして書き出す */
export function writeManifest(manifest: VideoManifest, manifestPath: string): void {
  const absPath = path.resolve(manifestPath);
  fs.mkdirSync(path.dirname(absPath), { recursive: true });
  fs.writeFileSync(absPath, JSON.stringify(manifest, null, 2), "utf-8");
  console.log("[Manifest] 書き出し:", absPath);
}
