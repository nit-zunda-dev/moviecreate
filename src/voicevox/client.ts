import axios from "axios";
import fs from "fs";
import path from "path";
import { getVoicevoxConfig } from "../config/voicevox";
import type { VoiceParam } from "../types/scenario";

export interface AudioQueryOptions {
  text: string;
  speakerId: number;
}

export interface Mora {
  consonant_length: number | null;
  vowel_length: number;
}

export interface AccentPhrase {
  moras: Mora[];
  pause_mora: Mora | null;
}

/** VOICEVOX の audio_query が返すクエリオブジェクトに含まれる音声パラメータの型 */
export interface VoicevoxAudioQuery {
  speedScale?: number;
  pitchScale?: number;
  intonationScale?: number;
  volumeScale?: number;
  pauseLengthScale?: number;
  prePhonemeLength?: number;
  postPhonemeLength?: number;
  accent_phrases?: AccentPhrase[];
  [key: string]: unknown;
}

export async function createAudioQuery(options: AudioQueryOptions): Promise<VoicevoxAudioQuery> {
  const config = getVoicevoxConfig();

  const res = await axios.post(
    `${config.baseUrl}/audio_query`,
    null,
    {
      params: {
        text: options.text,
        speaker: options.speakerId,
      },
    },
  );

  return res.data;
}

/**
 * クエリに VoiceParam を適用する。指定されたキーのみ上書きする。
 */
export function applyVoiceParamToQuery(query: VoicevoxAudioQuery, param: VoiceParam): VoicevoxAudioQuery {
  const out = { ...query };
  if (param.speedScale !== undefined) out.speedScale = param.speedScale;
  if (param.pitchScale !== undefined) out.pitchScale = param.pitchScale;
  if (param.intonationScale !== undefined) out.intonationScale = param.intonationScale;
  if (param.volumeScale !== undefined) out.volumeScale = param.volumeScale;
  if (param.pauseLengthScale !== undefined) out.pauseLengthScale = param.pauseLengthScale;
  if (param.prePhonemeLength !== undefined) out.prePhonemeLength = param.prePhonemeLength;
  if (param.postPhonemeLength !== undefined) out.postPhonemeLength = param.postPhonemeLength;
  return out;
}

export interface SynthesisOptions extends AudioQueryOptions {
  /**
   * 生成された音声を書き出すファイルパス。
   */
  outPath: string;
  /**
   * 音声パラメータ。指定した項目のみ audio_query の結果を上書きする。
   */
  voiceParam?: VoiceParam;
}

export interface SynthesisResult {
  absPath: string;
  finalQuery: VoicevoxAudioQuery;
}

export async function synthesizeToFile(options: SynthesisOptions): Promise<SynthesisResult> {
  const config = getVoicevoxConfig();

  let query = await createAudioQuery({ text: options.text, speakerId: options.speakerId });
  if (options.voiceParam && Object.keys(options.voiceParam).length > 0) {
    query = applyVoiceParamToQuery(query, options.voiceParam);
  }

  const res = await axios.post<ArrayBuffer>(
    `${config.baseUrl}/synthesis`,
    query,
    {
      params: { speaker: options.speakerId },
      responseType: "arraybuffer",
    },
  );

  const absOut = path.resolve(options.outPath);
  fs.mkdirSync(path.dirname(absOut), { recursive: true });
  fs.writeFileSync(absOut, Buffer.from(res.data));
  return { absPath: absOut, finalQuery: query };
}

export interface VoicevoxStyleInfo {
  id: number;
  name: string;
}

export interface VoicevoxSpeakerInfo {
  name: string;
  styles: VoicevoxStyleInfo[];
}

export async function fetchSpeakers(): Promise<VoicevoxSpeakerInfo[]> {
  const config = getVoicevoxConfig();
  const res = await axios.get<VoicevoxSpeakerInfo[]>(`${config.baseUrl}/speakers`);
  return res.data;
}

