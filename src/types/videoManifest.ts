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

/**
 * 動画冒頭に固定挿入される Hook（つかみ）演出ブロック。
 * すべて Manifest に直接埋め込まれており、Remotion 側はこれを読むだけで描画できる。
 */
export interface ManifestHook {
  /** Hook 全体の長さ（ms） */
  durationMs: number;
  /** 画面に大きく出すフックコピー */
  text: string;
  /** その中で叩き付けで強調する語句 */
  emphasis: string[];
  /** Hook 中央に出す立ち絵キャラ名（characters の key） */
  character?: string;
  /** その立ち絵に使う face 画像のフルパス（解決済み） */
  imageFile?: string;
  /** フラッシュ演出。0〜durationMs の頭で発火 */
  flash?: { color: string; durationMs: number };
  /** 立ち絵ズーム。Hook 区間で from→to に補間 */
  zoom?: { from: number; to: number };
  /** 軽い画面シェイク */
  shake?: boolean;
  /** Hook 区間専用 BGM（解決済み絶対パス。public 配下にコピーされている前提） */
  bgmFile?: string;
  /** Hook 開始 0ms に鳴らす SE */
  seFile?: string;
  /** Hook 中ナレーション（任意・短文） */
  voiceOver?: {
    character: string;
    /** 解決済み WAV ファイルの絶対パス */
    wavFile: string;
    /** Hook 内開始ms（既定 200） */
    startMs: number;
    durationMs: number;
  };
}

/** 行ごとの emphasis を時間情報付きに展開したもの */
export interface ManifestEmphasis {
  startMs: number;
  endMs: number;
  texts: string[];
}

/** 行ごとの callout を時間情報付きに展開したもの */
export interface ManifestCallout {
  startMs: number;
  endMs: number;
  text: string;
  style: "exam" | "warn" | "tip" | "breaking";
}

/**
 * BGM の1セグメント。同じファイルでも区間ごとに音量・フェードを変えるため複数本に分かれることがある。
 * セグメント間は前後 fadeMs だけクロスフェードで重ねる前提で、
 * Remotion 側はこの並びをそのまま `<Audio startFrom>` で並べる。
 */
export interface ManifestBgmSegment {
  startMs: number;
  endMs: number;
  /** publicDir 内の相対ファイル名（renderVideo.ts でコピー後に書き換え） */
  audioFile: string;
  /** 0.0〜1.0。既定 0.15 程度（セリフを邪魔しない） */
  volume: number;
  /** クロスフェード時間（ms）。Sprint 3 初版は固定 400ms */
  fadeInMs: number;
  fadeOutMs: number;
  /** ループ再生するか（短い BGM 用）。既定 true */
  loop: boolean;
}

/** 行ごと・Hook ごとに発火する SE イベント */
export interface ManifestSeEvent {
  /** 発火時刻（ms）。Hook オフセットを含む絶対時刻 */
  atMs: number;
  /** publicDir 内の相対ファイル名 */
  audioFile: string;
  /** 0.0〜1.0。既定 0.7 */
  volume: number;
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

  /**
   * 動画冒頭に挿入される Hook ブロック（任意）。
   * 指定時は本編 lines[].startMs はすべて hook.durationMs だけ後ろにオフセット済み。
   */
  hook?: ManifestHook;
  /** 行ごとに展開された強調表示イベント（中央巨大テロップ） */
  emphases?: ManifestEmphasis[];
  /** 行ごとに展開された常駐テロップイベント（右上バッジ） */
  callouts?: ManifestCallout[];
  /**
   * 全体に並ぶ BGM セグメント。Hook → 各シーン → 末尾 の順で時刻昇順。
   * 連続するセグメントが同じファイルなら 1 本に統合済み。
   */
  bgmSegments?: ManifestBgmSegment[];
  /** SE イベント（時刻昇順） */
  seEvents?: ManifestSeEvent[];
}
