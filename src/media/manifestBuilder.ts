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
  ManifestChapterBanner,
  ManifestEndScreen,
  ManifestLipKeyframe,
} from "../types/videoManifest";
import { LineTimingResult } from "../voicevox/synthesizeLine";
import { DEFAULT_VIDEO_HEIGHT, DEFAULT_VIDEO_WIDTH } from "../config/videoLayout";
import { planBgmSegments, toSceneTimeRanges, type SceneTimingInput } from "./bgmPlanner";
import { planSeEvents } from "./sePlanner";

export interface LineResultWithContext {
  result: LineTimingResult;
  line: Line;
  sceneId: string;
  lineIndex: number;
  sceneBackground?: string;
  /** セリフ WAV の RMS エンベロープ（`lipSync.enrichLineResultsWithLipSync` が付与） */
  lipEnvelope?: number[];
  lipBucketMs?: number;
}

const DEFAULT_HOOK_DURATION_MS = 5000;
const DEFAULT_CALLOUT_STYLE = "tip" as const;
/** lipKeyframes のバケット長（`lipEnvelope` と一致させる） */
const LIP_BUCKET_MS = 80;
/** エンドスクリーン既定長（ms） */
const DEFAULT_END_SCREEN_MS = 20_000;
/** チャプターバナー表示時間（ms） */
const CHAPTER_BANNER_MS = 4500;

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
  const chapters: ManifestChapterBanner[] = [];
  const seenSceneForChapter = new Set<string>();
  // BGM/SE planner 用の集計
  const sceneInputsMap = new Map<string, SceneTimingInput>();
  const seLineInputs: { startMs: number; seFile: string | undefined }[] = [];

  for (let i = 0; i < lineResults.length; i++) {
    const { result, line, sceneId, lineIndex, sceneBackground, lipEnvelope, lipBucketMs } = lineResults[i];
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

    // チャプター: 各シーンの「最初のセリフ行」で一度だけバナー
    if (!seenSceneForChapter.has(sceneId)) {
      seenSceneForChapter.add(sceneId);
      const sceneObj = scenario.scenes.find((s) => s.id === sceneId);
      const label = sceneObj?.chapter?.label;
      if (label) {
        chapters.push({
          startMs: lineStartMs,
          endMs: lineStartMs + CHAPTER_BANNER_MS,
          label,
        });
      }
    }

    let lipKeyframes: ManifestLipKeyframe[] | undefined;
    if (lipEnvelope && lipEnvelope.length > 0) {
      const bucket = lipBucketMs ?? LIP_BUCKET_MS;
      lipKeyframes = lipEnvelope.map((openness, idx) => ({
        offsetMs: idx * bucket,
        openness: Math.min(1, Math.max(0, openness)),
      }));
    }

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
      lipKeyframes,
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

    // BGM/SE planner 用にシーン時間と SE 行を集計
    if (!sceneInputsMap.has(sceneId)) {
      const sceneObj = scenario.scenes.find((s) => s.id === sceneId);
      sceneInputsMap.set(sceneId, {
        sceneId,
        lineTimings: [],
        bgmFile: sceneObj?.bgm ? path.resolve(sceneObj.bgm) : undefined,
      });
    }
    sceneInputsMap.get(sceneId)!.lineTimings.push({ startMs: lineStartMs, durationMs: lineDurationMs });

    seLineInputs.push({
      startMs: lineStartMs,
      seFile: line.se ? path.resolve(line.se) : undefined,
    });

    currentMs = lineEndMs;
  }

  const defaultBackground = scenario.global?.defaultBackground
    ? path.resolve(scenario.global.defaultBackground)
    : undefined;

  const videoFrameFile = scenario.global?.videoFrame ? path.resolve(scenario.global.videoFrame) : undefined;

  // BGM セグメントの構築（global.bgm.default / scene.bgm / hook.bgm から）
  // シーン順を Scenario 上の順序で揃えて planner に渡す
  const orderedSceneInputs: SceneTimingInput[] = [];
  for (const scene of scenario.scenes) {
    const si = sceneInputsMap.get(scene.id);
    if (si) orderedSceneInputs.push(si);
  }
  const sceneRanges = toSceneTimeRanges(orderedSceneInputs);
  const bodyEndMs = currentMs;

  const endCfg = scenario.global?.endScreen;
  const endEnabled = endCfg?.enabled === true;
  const endDurationMs = endEnabled ? endCfg?.durationMs ?? DEFAULT_END_SCREEN_MS : 0;
  const totalDurationMs = bodyEndMs + endDurationMs;

  const bgmSegments = planBgmSegments(scenario, hookOffsetMs, sceneRanges, totalDurationMs);

  // SE イベント（hook.se + 各行の line.se）
  const hookSeFile = scenario.hook?.se;
  const seEvents = planSeEvents(hookSeFile, seLineInputs);

  // エンドスクリーン
  let endScreen: ManifestEndScreen | undefined;
  if (endEnabled && endDurationMs > 0) {
    const sub = endCfg?.subscribeText ?? "チャンネル登録で次回も見逃さない！";
    endScreen = {
      startMs: bodyEndMs,
      durationMs: endDurationMs,
      nextTitle: endCfg?.nextEpisode?.title,
      nextThumbnailFile: endCfg?.nextEpisode?.thumbnail
        ? path.resolve(endCfg.nextEpisode.thumbnail)
        : undefined,
      subscribeText: sub,
    };
  }

  // Hook の bgm/se を ManifestHook 側にも反映（Sprint 1 で undefined にしていた箇所を上書き）
  const hookManifestWithAudio: ManifestHook | undefined = hookManifest
    ? {
        ...hookManifest,
        bgmFile: scenario.hook?.bgm ? path.resolve(scenario.hook.bgm) : undefined,
        seFile: scenario.hook?.se ? path.resolve(scenario.hook.se) : undefined,
      }
    : undefined;

  return {
    title: scenario.title,
    totalDurationMs,
    fps,
    width,
    height,
    audioFile: path.resolve(audioFile),
    defaultBackground,
    videoFrameFile,
    characters,
    lines,
    generatedAt: new Date().toISOString(),
    hook: hookManifestWithAudio,
    emphases: emphases.length > 0 ? emphases : undefined,
    callouts: callouts.length > 0 ? callouts : undefined,
    bgmSegments: bgmSegments.length > 0 ? bgmSegments : undefined,
    seEvents: seEvents.length > 0 ? seEvents : undefined,
    chapters: chapters.length > 0 ? chapters : undefined,
    endScreen,
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
