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
  /**
   * この行の発話中、画面中央に大きな白抜きテロップで叩き付ける語句（複数可）
   * 字幕自体には影響せず、追加でオーバーレイとして表示される
   */
  emphasis?: string[];
  /** この行の発話中だけ画面右上に常駐表示するテロップ */
  callout?: CalloutBadge;
  /** この行の開始と同時に再生する効果音（シナリオファイル基準の相対パス、または絶対パス） */
  se?: string;
  /**
   * この行の発話中の立ち絵ズーム挙動。
   * - "self": 喋っている本人にだけズームイン（既定相当の演出）
   * - "both": 両者まとめてズームイン
   * - "none": ズームしない
   * 未指定時はズームしない（既存動作と同じ）
   */
  zoomTo?: "self" | "both" | "none";
}

export interface CalloutBadge {
  text: string;
  /** 表示スタイル（背景色・アイコンが切り替わる） */
  style?: "exam" | "warn" | "tip" | "breaking";
  /** 表示時間。未指定時はその行の発話時間と同じ */
  durationMs?: number;
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
  /** このシーンの開始時に下三分の一バナーで表示するチャプターラベル（YouTube 概要欄の自動生成にも使われる） */
  chapter?: ChapterMark;
  lines: Line[];
}

export interface ChapterMark {
  /** チャプター名（下三分の一バナー＋概要欄タイムスタンプに使用） */
  label: string;
}

export interface GlobalSettings {
  defaultBackground?: string;
  /**
   * 動画全体の教室フレーム画像（PNG/WebP 等）。指定時は「フレーム全面 → 上段黒板にスライド・下段に字幕・左右の黒に立ち絵」レイアウトになる。
   * シナリオファイルからの相対パスまたは絶対パス。
   */
  videoFrame?: string;
  /** 複数シーンで共有する Reveal スライドの HTML パス（シナリオと同じディレクトリ基準の相対パス可） */
  slidesHtml?: string;
  defaultBgm?: string;
  defaultSpeaker?: SpeakerName;
  defaultFps?: number;
  voice?: VoiceParam;
  /** Sprint 3 で配線予定の BGM 設定 */
  bgm?: BgmTrack;
  /** Sprint 5 で配線予定のエンドスクリーン設定 */
  endScreen?: EndScreenSettings;
}

export interface BgmTrack {
  /** シーンに `bgm` 指定が無い区間で再生する既定BGM */
  default?: string;
  /** 0.0〜1.0。セリフを邪魔しない既定値の目安は 0.10〜0.20 */
  volume?: number;
}

export interface EndScreenSettings {
  /** true のとき末尾にエンドカード区間を追加（既定 false・既存シナリオ互換） */
  enabled?: boolean;
  /** エンドカードの長さ（ms）。既定 20000 */
  durationMs?: number;
  nextEpisode?: {
    title: string;
    thumbnail?: string;
  };
  /** 登録誘導の見出し（省略時は既定文言） */
  subscribeText?: string;
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
  /**
   * 動画冒頭に強制挿入されるフックブロック。1動画につき1つ。
   * 視聴維持率（特に最初の5〜10秒）の改善が目的。
   */
  hook?: HookSettings;
  /** Sprint 4 で配線予定。本編から派生させる Shorts の指定リスト */
  shorts?: ShortsSpec[];
  /** Sprint 2 で配線予定。YouTube タイトル候補・概要欄・タグ自動生成のためのヒント */
  youtube?: YoutubeMeta;
}

/**
 * 動画冒頭5〜7秒に挿入するフック（つかみ）演出ブロック。
 * 全項目任意。`text` と任意の演出フィールドを組み合わせる。
 */
export interface HookSettings {
  /** Hook 全体の長さ。既定 5000ms */
  durationMs?: number;
  /** 画面に大きく出す結論文（フックコピー） */
  text: string;
  /** 結論文の中で特に強調する語句（白抜き赤縁の巨大テロップ） */
  emphasis?: string[];
  /** Hook 中央に立ち絵を出す場合のキャラ名 */
  character?: string;
  /** その立ち絵の表情（face PNG ファイル名相当） */
  face?: string;
  /** 0.1〜0.3秒の全画面フラッシュ */
  flash?: { color: string; durationMs: number };
  /** 立ち絵のズーム挙動 */
  zoom?: { from: number; to: number };
  /** 軽い画面シェイク（0.5秒） */
  shake?: boolean;
  /** Hook 区間専用の BGM */
  bgm?: string;
  /** Hook 開始時に鳴らす効果音 */
  se?: string;
  /** Hook 中に短く喋らせる任意のナレーション */
  voiceOver?: { character: string; text: string };
}

/** Sprint 4 で配線予定。本編から派生させる Shorts の仕様 */
export interface ShortsSpec {
  id: string;
  title: string;
  /** 60秒以内推奨 */
  durationMs?: number;
  /** 拾うシーンID（順序保持） */
  pickScenes?: string[];
  /** シーンの一部の行範囲だけ拾う場合 */
  pickLines?: { sceneId: string; from: number; to: number }[];
  /** 画面上部に固定する大テロップ */
  overlayCaption?: string;
  /** 終端2秒に固定するCTA文字列 */
  cta?: string;
}

/** Sprint 2 で配線予定。YouTube メタデータ自動生成用ヒント */
export interface YoutubeMeta {
  audience?: string[];
  hookKeywords?: string[];
  relatedEpisodes?: { ep: number; title: string }[];
  hashtags?: string[];
  /** タイトル候補生成スタイル */
  titleHints?: { style: "shock" | "howto" | "exam" }[];
  /**
   * 画像生成プロンプトの作風（generate-youtube-metadata の【4】セクションに反映）。
   * - "atmospheric": 既定。雰囲気重視の背景アート（ふんわり）
   * - "diagram"    : フラットインフォグラフィック／アイソメトリック図解風（教材っぽく）
   * - "metaphor"   : メタファー型イラスト（城・門・行列など、楽しい比喩）
   * - "fun"        : 楽しいデフォルメ風（明るくポップな教室・カフェ・サーバルーム）
   */
  imageStyle?: "atmospheric" | "diagram" | "metaphor" | "fun";
}
