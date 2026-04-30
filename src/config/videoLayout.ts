/** Remotion 既定解像度と、HTML スライドのキャプチャ解像度に揃える */
export const DEFAULT_VIDEO_WIDTH = 1280;
export const DEFAULT_VIDEO_HEIGHT = 720;

/**
 * 字幕ブロックの高さ（フレーム高の割合）。約3行分を固定し、上段（スライド）高さを毎フレーム一定にする
 */
export const SUBTITLE_BLOCK_HEIGHT_RATIO = 0.19;
/** 字幕ブロック内で想定する最大行数（line-clamp） */
export const SUBTITLE_MAX_LINES = 3;

/** 立ち絵の高さの上限（上段の高さに対する比率）。上段は字幕ブロック除きで固定 */
export const FLANK_TACHIE_MAX_HEIGHT_FRAC = 0.88;
export const TACHIE_SIZE_CAP_FRAC = 0.9;
/** 左・右の立ち絵用カラム（片側）。2倍表示しやすく少し広め */
export const TACHIE_SIDE_WIDTH_RATIO = 0.20;
/** スライド映像（キャプチャ）の縦横比。行の高さをこの比率で決め、下に無駄な黒帯を出さない */
export const SLIDE_ASPECT_WIDTH = 16;
export const SLIDE_ASPECT_HEIGHT = 9;

/**
 * 旧来の全画面レイアウト用（透過モード等）の下マージン目安（px）
 */
export const CHARACTER_AND_SUBTITLE_RESERVE_BOTTOM_PX = 180;

/**
 * 教室フレーム（docs/generate_scene_illustrations/hikei.png 等）を 1280×720 に合わせたときの配置ガイド。
 * 実際のイラストに合わせて微調整すること。値はフレーム幅・高さに対する 0〜1 の比率。
 */
export const CLASSROOM_FRAME_LAYOUT = {
  /** 上段の黒板（緑）に Reveal キャプチャを収める領域（中央寄せで少し下） */
  slide: { x: 0.125, y: 0.045, w: 0.75, h: 0.55 },
  /** 下段の黒板中央に字幕を配置（上段と重ならないよう下へ） */
  subtitle: { x: 0.07, y: 0.605, w: 0.86, h: 0.265 },
  /** 左の黒帯：下段黒板の少し上に大きめ立ち絵 */
  leftCharacter: { x: 0, y: 0.11, w: 0.118, h: 0.38 },
  /** 右の黒帯：下段黒板の少し上に大きめ立ち絵 */
  rightCharacter: { x: 0.882, y: 0.11, w: 0.118, h: 0.38 },
} as const;

/** 教室モード字幕のフォントサイズ（px）の上限・下限 */
export const CLASSROOM_SUBTITLE_FONT_MAX = 30;
export const CLASSROOM_SUBTITLE_FONT_MIN = 15;
/** 教室モード字幕の折返し想定行数（下切れ回避用） */
export const CLASSROOM_SUBTITLE_MAX_LINES = 5;
