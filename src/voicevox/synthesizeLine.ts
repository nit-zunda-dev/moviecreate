import path from "path";
import { Line, Scenario, VoiceParam } from "../types/scenario";
import { getBasePaths } from "../config/paths";
import { synthesizeToFile } from "./client";
import { getVoicevoxConfig, resolveSpeakerIdFromName } from "../config/voicevox";
import { calcDurationFromQuery } from "../media/timingExtractor";

export function resolveSpeakerIdForLine(scenario: Scenario, line: Line): number {
  const config = getVoicevoxConfig();

  // 1. character が指定されている場合は Scenario.characters を優先
  if (line.character && scenario.characters && scenario.characters[line.character]) {
    return scenario.characters[line.character].speakerId;
  }

  // 2. Line.speaker 名からの解決
  const fromLineName = resolveSpeakerIdFromName(line.speaker);
  if (fromLineName !== undefined) {
    return fromLineName;
  }

  // 3. global.defaultSpeaker 名からの解決
  const fromGlobalName = resolveSpeakerIdFromName(scenario.global?.defaultSpeaker);
  if (fromGlobalName !== undefined) {
    return fromGlobalName;
  }

  // 4. それでも見つからなければデフォルトspeakerId
  return config.defaultSpeakerId;
}

/** global → character → line の順で VoiceParam をマージする。後の方が優先。 */
export function mergeVoiceParam(scenario: Scenario, line: Line): VoiceParam | undefined {
  const globalVoice = scenario.global?.voice;
  let characterVoice: VoiceParam | undefined;
  if (line.character && scenario.characters?.[line.character]?.voice) {
    characterVoice = scenario.characters[line.character].voice;
  }
  const lineVoice = line.voice;

  const merged: VoiceParam = {
    ...(globalVoice || {}),
    ...(characterVoice || {}),
    ...(lineVoice || {}),
  };
  if (Object.keys(merged).length === 0) return undefined;
  return merged;
}

export async function synthesizeLine(
  scenario: Scenario,
  sceneId: string,
  index: number,
  line: Line,
): Promise<string | null> {
  if (!line.text) {
    return null;
  }
  const { tempDir } = getBasePaths();
  const filename = `scene_${sceneId}_line_${index}.wav`;
  const outPath = path.join(tempDir, "voices", filename);

  const speakerId = resolveSpeakerIdForLine(scenario, line);
  const voiceParam = mergeVoiceParam(scenario, line);

  const { absPath } = await synthesizeToFile({
    text: line.text,
    speakerId,
    outPath,
    voiceParam,
  });

  return absPath;
}

export interface LineTimingResult {
  wavPath: string;
  durationMs: number;
  speakerId: number;
}

/**
 * 音声合成を行い、WAVパス・所要時間（ms）・speakerIdを返す。
 * subtitle_only / text なしの行は null を返す。
 */
export async function synthesizeLineWithTiming(
  scenario: Scenario,
  sceneId: string,
  index: number,
  line: Line,
): Promise<LineTimingResult | null> {
  if (!line.text) {
    return null;
  }
  const { tempDir } = getBasePaths();
  const filename = `scene_${sceneId}_line_${index}.wav`;
  const outPath = path.join(tempDir, "voices", filename);

  const speakerId = resolveSpeakerIdForLine(scenario, line);
  const voiceParam = mergeVoiceParam(scenario, line);

  const { absPath, finalQuery } = await synthesizeToFile({
    text: line.text,
    speakerId,
    outPath,
    voiceParam,
  });

  const durationSec = calcDurationFromQuery(finalQuery);
  return {
    wavPath: absPath,
    durationMs: Math.round(durationSec * 1000),
    speakerId,
  };
}
