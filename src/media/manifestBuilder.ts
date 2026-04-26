import fs from "fs";
import path from "path";
import { Scenario, Line } from "../types/scenario";
import { VideoManifest, ManifestLine, CharacterDisplayConfig } from "../types/videoManifest";
import { LineTimingResult } from "../voicevox/synthesizeLine";
import { DEFAULT_VIDEO_HEIGHT, DEFAULT_VIDEO_WIDTH } from "../config/videoLayout";

export interface LineResultWithContext {
  result: LineTimingResult;
  line: Line;
  sceneId: string;
  lineIndex: number;
  sceneBackground?: string;
}

const DEFAULT_SUBTITLE_COLORS = [
  "#FF88BB", // 0: ピンク
  "#88DD44", // 1: 緑
  "#66CCFF", // 2: 水色
  "#FFB347", // 3: オレンジ
  "#CCAAFF", // 4: 薄紫
  "#FFFFFF", // 5+: 白
];

const DEFAULT_POSITIONS: ("left" | "right" | "center")[] = [
  "left",
  "right",
  "center",
  "center",
];

export function buildVideoManifest(
  scenario: Scenario,
  lineResults: LineResultWithContext[],
  audioFile: string,
): VideoManifest {
  const fps = scenario.output?.fps ?? scenario.global?.defaultFps ?? 30;
  const width = scenario.output?.width ?? DEFAULT_VIDEO_WIDTH;
  const height = scenario.output?.height ?? DEFAULT_VIDEO_HEIGHT;

  // キャラクター表示設定を構築
  const characterEntries = Object.entries(scenario.characters ?? {});
  const characters: Record<string, CharacterDisplayConfig> = {};

  for (let i = 0; i < characterEntries.length; i++) {
    const [charName, charSettings] = characterEntries[i];
    const defaultImageFile = charSettings.image ? path.resolve(charSettings.image) : undefined;

    characters[charName] = {
      position: charSettings.position ?? DEFAULT_POSITIONS[i] ?? "center",
      defaultImageFile,
      subtitleColor: charSettings.subtitleColor ?? DEFAULT_SUBTITLE_COLORS[i] ?? "#FFFFFF",
    };
  }

  let currentMs = 0;
  const lines: ManifestLine[] = [];

  for (let i = 0; i < lineResults.length; i++) {
    const { result, line, sceneId, lineIndex, sceneBackground } = lineResults[i];
    const character = line.character;
    const defaultImageFile = character ? characters[character]?.defaultImageFile : undefined;
    // 行ごとの表情（face）があれば、キャラの画像と同じフォルダの face.png を使う
    let imageFile: string | undefined = defaultImageFile;
    if (line.face && defaultImageFile) {
      const charDir = path.dirname(defaultImageFile);
      imageFile = path.join(charDir, line.face + ".png");
    }

    const fromLine = line.background ? path.resolve(line.background) : undefined;
    const fromScene = sceneBackground ? path.resolve(sceneBackground) : undefined;
    const backgroundFile = fromLine ?? fromScene;

    lines.push({
      globalIndex: i,
      sceneId,
      lineIndex,
      // 音声用の text と、画面表示用の subtitle を分けている場合は subtitle を優先して字幕に使う
      text: line.subtitle ?? line.text ?? "",
      character,
      imageFile,
      backgroundFile,
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
    characters,
    lines,
    generatedAt: new Date().toISOString(),
  };
}

export function writeManifest(manifest: VideoManifest, manifestPath: string): void {
  const absPath = path.resolve(manifestPath);
  fs.mkdirSync(path.dirname(absPath), { recursive: true });
  fs.writeFileSync(absPath, JSON.stringify(manifest, null, 2), "utf-8");
  console.log("[Manifest] 書き出し:", absPath);
}
