export interface ManifestLine {
  globalIndex: number;
  sceneId: string;
  lineIndex: number;
  /** 字幕テキスト */
  text: string;
  character: string | undefined;
  /** face に対応する PNG の絶対パス（PSD から抽出済み） */
  imageFile: string | undefined;
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
  /** 結合済み WAV の絶対パス */
  audioFile: string;
  defaultBackground: string | undefined;
  lines: ManifestLine[];
  generatedAt: string;
}
