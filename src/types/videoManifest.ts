export interface CharacterDisplayConfig {
  /** 画面上の横位置 */
  position: "left" | "right" | "center";
  /** publicDir 内の画像ファイル名（相対） */
  defaultImageFile: string | undefined;
  /** 字幕テキストの色 */
  subtitleColor: string;
}

export interface ManifestLine {
  globalIndex: number;
  sceneId: string;
  lineIndex: number;
  /** 字幕テキスト */
  text: string;
  character: string | undefined;
  /** face に対応する PNG のファイル名（publicDir 内の相対名） */
  imageFile: string | undefined;
  /** このセリフ中に表示する背景画像のパス（未指定時は defaultBackground にフォールバック） */
  backgroundFile: string | undefined;
  speakerId: number;
  wavFile: string;
  startMs: number;
  durationMs: number;
}

export interface VideoManifest {
  title: string;
  totalDurationMs: number;
  fps: number;
  width: number;
  height: number;
  /** publicDir 内の結合済み WAV ファイル名（相対） */
  audioFile: string;
  defaultBackground: string | undefined;
  /** publicDir 内の教室フレーム画像（相対）。指定時は CLASSROOM レイアウト */
  videoFrameFile?: string;
  /** キャラクター名 → 表示設定 */
  characters: Record<string, CharacterDisplayConfig>;
  lines: ManifestLine[];
  /** 透過レンダリングモード */
  transparent?: boolean;
  generatedAt: string;
}
