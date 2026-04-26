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
