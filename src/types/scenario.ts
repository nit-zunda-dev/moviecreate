export type SpeakerName = "zundamon" | "shikoku_metan" | string;

export type LineType = "dialogue" | "narration" | "subtitle_only";

export interface Line {
  type: LineType;
  /**
   * 読み上げるテキスト。subtitle_only の場合は省略可。
   */
  text?: string;
  /**
   * テロップ表示用の文字列。未指定時は text をそのまま使う。
   */
  subtitle?: string;
  /**
   * 話者名。speakerName → VOICEVOX speakerId へマッピングされる。
   */
  speaker?: SpeakerName;
  /**
   * シナリオ内で定義されたキャラクター名。
   * 指定されている場合は characters[character].speakerId が優先される。
   */
  character?: string;
  /**
   * VOICEVOX のスタイルIDなどを識別する任意の文字列。
   */
  voiceStyle?: string;
  /**
   * シーン先頭からの開始秒数。
   */
  start?: number;
  /**
   * start の代わりに使用可能なオフセット秒。
   */
  offset?: number;
  /**
   * 立ち絵差分や表情名。
   */
  face?: string;
  /**
   * 追加のエフェクト指定（音量・フェードなど）。
   */
  effects?: {
    volume?: number;
    fadeInSec?: number;
    fadeOutSec?: number;
  };
  /**
   * VOICEVOX の音声パラメータ（この行のみ上書き）。未指定は global / character を継承。
   */
  voice?: VoiceParam;
}

/**
 * VOICEVOX の音声パラメータ。シナリオの global / characters.* / lines[].voice で指定可能。
 */
export interface VoiceParam {
  /** 話速（1.0 が標準） */
  speedScale?: number;
  /** 音高（0.0 が標準、正で高く） */
  pitchScale?: number;
  /** 抑揚（1.0 が標準） */
  intonationScale?: number;
  /** 音量（1.0 が標準） */
  volumeScale?: number;
  /** 間の長さの倍率（1.0 が標準） */
  pauseLengthScale?: number;
  /** 開始無音（秒） */
  prePhonemeLength?: number;
  /** 終了無音（秒） */
  postPhonemeLength?: number;
}

export interface Scene {
  id: string;
  /**
   * 背景画像ファイル（image/ からの相対パスを想定）。
   */
  background?: string;
  /**
   * シーン専用のBGM（music/ からの相対パスを想定）。
   */
  bgm?: string;
  /**
   * シーン全体の最低長さ（秒）。
   */
  duration?: number;
  /**
   * セリフ・ナレーション・テロップなどの配列。
   */
  lines: Line[];
}

export interface GlobalSettings {
  defaultBackground?: string;
  defaultBgm?: string;
  defaultSpeaker?: SpeakerName;
  defaultFps?: number;
  /** 全体のデフォルト音声パラメータ */
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
  /** このキャラのデフォルト音声パラメータ */
  voice?: VoiceParam;
}

export interface Scenario {
  title: string;
  output?: OutputSettings;
  global?: GlobalSettings;
  /**
   * キャラクター名ごとの話者・スタイル設定。
   */
  characters?: Record<string, CharacterSettings>;
  scenes: Scene[];
}
