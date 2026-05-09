import fs from "fs";
import path from "path";
import { Scenario, Line, HookSettings } from "../types/scenario";
import {
  VideoManifest,
  ManifestLine,
  CharacterDisplayConfig,
  ManifestHook,
  ManifestEmphasis,
  ManifestCallout,
} from "../types/videoManifest";
import { LineTimingResult } from "../voicevox/synthesizeLine";
import { DEFAULT_VIDEO_HEIGHT, DEFAULT_VIDEO_WIDTH } from "../config/videoLayout";

export interface LineResultWithContext {
  result: LineTimingResult;
  line: Line;
  sceneId: string;
  lineIndex: number;
  sceneBackground?: string;
}

const DEFAULT_HOOK_DURATION_MS = 5000;
const DEFAULT_CALLOUT_STYLE = "tip" as const;

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

  // Hook ブロックの展開（任意）
  // Sprint 1 ではビジュアル演出（flash/zoom/shake/text/emphasis/character）と durationMs だけ Manifest 化する。
  // hook.bgm / hook.se / hook.voiceOver は受け入れるが配線は Sprint 3。
  const hookManifest = buildHookManifest(scenario.hook, characters);
  const hookOffsetMs = hookManifest?.durationMs ?? 0;

  let currentMs = hookOffsetMs;
  const lines: ManifestLine[] = [];
  const emphases: ManifestEmphasis[] = [];
  const callouts: ManifestCallout[] = [];

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

    const lineStartMs = currentMs;
    const lineDurationMs = result.durationMs;
    const lineEndMs = lineStartMs + lineDurationMs;

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
      startMs: lineStartMs,
      durationMs: lineDurationMs,
    });

    if (line.emphasis && line.emphasis.length > 0) {
      emphases.push({
        startMs: lineStartMs,
        endMs: lineEndMs,
        texts: line.emphasis.slice(),
      });
    }

    if (line.callout) {
      const cdur = line.callout.durationMs ?? lineDurationMs;
      callouts.push({
        startMs: lineStartMs,
        endMs: lineStartMs + cdur,
        text: line.callout.text,
        style: line.callout.style ?? DEFAULT_CALLOUT_STYLE,
      });
    }

    currentMs = lineEndMs;
  }

  const defaultBackground = scenario.global?.defaultBackground
    ? path.resolve(scenario.global.defaultBackground)
    : undefined;

  const videoFrameFile = scenario.global?.videoFrame ? path.resolve(scenario.global.videoFrame) : undefined;

  return {
    title: scenario.title,
    totalDurationMs: currentMs,
    fps,
    width,
    height,
    audioFile: path.resolve(audioFile),
    defaultBackground,
    videoFrameFile,
    characters,
    lines,
    generatedAt: new Date().toISOString(),
    hook: hookManifest,
    emphases: emphases.length > 0 ? emphases : undefined,
    callouts: callouts.length > 0 ? callouts : undefined,
  };
}

/**
 * `Scenario.hook` を `ManifestHook` に展開する。
 * 立ち絵パスはキャラの defaultImageFile と face から解決する。
 * Sprint 1 では bgm/se/voiceOver は配線せず、ビジュアル系のみ。
 */
function buildHookManifest(
  hook: HookSettings | undefined,
  characters: Record<string, CharacterDisplayConfig>,
): ManifestHook | undefined {
  if (!hook) return undefined;

  const durationMs = hook.durationMs ?? DEFAULT_HOOK_DURATION_MS;
  let imageFile: string | undefined;
  if (hook.character && characters[hook.character]?.defaultImageFile) {
    const baseImage = characters[hook.character].defaultImageFile!;
    if (hook.face) {
      const charDir = path.dirname(baseImage);
      imageFile = path.join(charDir, hook.face + ".png");
    } else {
      imageFile = baseImage;
    }
  }

  return {
    durationMs,
    text: hook.text,
    emphasis: hook.emphasis ?? [],
    character: hook.character,
    imageFile,
    flash: hook.flash,
    zoom: hook.zoom,
    shake: hook.shake,
    // Sprint 3 で配線:
    bgmFile: undefined,
    seFile: undefined,
    voiceOver: undefined,
  };
}

export function writeManifest(manifest: VideoManifest, manifestPath: string): void {
  const absPath = path.resolve(manifestPath);
  fs.mkdirSync(path.dirname(absPath), { recursive: true });
  fs.writeFileSync(absPath, JSON.stringify(manifest, null, 2), "utf-8");
  console.log("[Manifest] 書き出し:", absPath);
}
