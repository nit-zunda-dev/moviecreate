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
  /**
   * 行単位の背景画像（通常はシナリオ実行ディレクトリ相対、または絶対パス）
   * 指定時はシーンの background より優先
   */
  background?: string;
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
  /**
   * Reveal.js 等の HTML スライドの横スライド index（0 始まり）。
   * 指定した場合、generate-video 時にそのスライドを PNG 化し background に使う
   * （`global.slidesHtml` または本フィールドの `slidesHtml` が必要）
   */
  slideIndex?: number;
  /** このシーンだけ別の HTML デッキを使う場合（シナリオファイルのディレクトリ基準の相対パス可） */
  slidesHtml?: string;
  bgm?: string;
  duration?: number;
  lines: Line[];
}

export interface GlobalSettings {
  defaultBackground?: string;
  /** 複数シーンで共有する Reveal スライドの HTML パス（シナリオと同じディレクトリ基準の相対パス可） */
  slidesHtml?: string;
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
