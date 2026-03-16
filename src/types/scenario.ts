export type SpeakerName = "zundamon" | "shikoku_metan" | string;

export type LineType = "dialogue" | "narration" | "subtitle_only";

export interface Line {
  type: LineType;
  text?: string;
  subtitle?: string;
  speaker?: SpeakerName;
  character?: string;
  voiceStyle?: string;
  start?: number;
  offset?: number;
  face?: string;
  effects?: {
    volume?: number;
    fadeInSec?: number;
    fadeOutSec?: number;
  };
  voice?: VoiceParam;
}

export interface VoiceParam {
  speedScale?: number;
  pitchScale?: number;
  intonationScale?: number;
  volumeScale?: number;
  pauseLengthScale?: number;
  prePhonemeLength?: number;
  postPhonemeLength?: number;
}

export interface Scene {
  id: string;
  background?: string;
  bgm?: string;
  duration?: number;
  lines: Line[];
}

export interface GlobalSettings {
  defaultBackground?: string;
  defaultBgm?: string;
  defaultSpeaker?: SpeakerName;
  defaultFps?: number;
  voice?: VoiceParam;
}

export interface OutputSettings {
  file?: string;
  width?: number;
  height?: number;
  fps?: number;
}

export interface CharacterSettings {
  speakerId: number;
  styleId?: number;
  voice?: VoiceParam;
  /** 立ち絵の PNG ファイルパス */
  image?: string;
  /** 画面上の配置位置 */
  position?: "left" | "right" | "center";
  /** 字幕テキストの色（CSS カラー文字列） */
  subtitleColor?: string;
}

export interface Scenario {
  title: string;
  output?: OutputSettings;
  global?: GlobalSettings;
  characters?: Record<string, CharacterSettings>;
  scenes: Scene[];
}
