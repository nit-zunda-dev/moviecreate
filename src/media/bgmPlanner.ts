import path from "path";
import type { Scenario } from "../types/scenario";
import type { ManifestBgmSegment } from "../types/videoManifest";

/** セリフを邪魔しない既定 BGM 音量 */
export const DEFAULT_BGM_VOLUME = 0.15;
/** Hook 区間の BGM 音量（少し強め） */
export const DEFAULT_HOOK_BGM_VOLUME = 0.35;
/** クロスフェード時間（ms） */
export const DEFAULT_BGM_FADE_MS = 400;

interface SceneTimeRange {
  sceneId: string;
  startMs: number;
  endMs: number;
  /** Scene.bgm（解決済み絶対パス）または undefined */
  bgmFile: string | undefined;
}

/**
 * シナリオと、本編 lines の累積タイミングを受け取り、
 * 「Hook → 各シーン → 末尾」の順に BGM セグメント列を構築する。
 *
 * @param scenario       シナリオ全体
 * @param hookOffsetMs   本編開始時刻（Hook あれば hook.durationMs）
 * @param sceneRanges    本編シーンごとの開始・終了時刻（Hook オフセット込みの絶対時刻）
 * @param totalDurationMs 動画全体の長さ（lines 末尾 + Hook）
 */
export function planBgmSegments(
  scenario: Scenario,
  hookOffsetMs: number,
  sceneRanges: SceneTimeRange[],
  totalDurationMs: number,
): ManifestBgmSegment[] {
  const defaultBgm = scenario.global?.bgm?.default
    ? path.resolve(scenario.global.bgm.default)
    : undefined;
  const defaultVolume = scenario.global?.bgm?.volume ?? DEFAULT_BGM_VOLUME;
  const hookBgm = scenario.hook?.bgm ? path.resolve(scenario.hook.bgm) : undefined;

  // 1) 「区間 → ファイル」の生リストを作る
  type RawSegment = { startMs: number; endMs: number; file: string | undefined; volume: number };
  const raw: RawSegment[] = [];

  // 1-a) Hook 区間
  if (hookOffsetMs > 0) {
    raw.push({
      startMs: 0,
      endMs: hookOffsetMs,
      file: hookBgm ?? defaultBgm,
      volume: hookBgm ? DEFAULT_HOOK_BGM_VOLUME : defaultVolume,
    });
  }

  // 1-b) 各シーン区間（Scene.bgm > defaultBgm）
  for (const sr of sceneRanges) {
    raw.push({
      startMs: sr.startMs,
      endMs: sr.endMs,
      file: sr.bgmFile ?? defaultBgm,
      volume: defaultVolume,
    });
  }

  // 1-c) 末尾余白（lines が尽きてから totalDurationMs まで）— 通常はゼロ
  const lastEnd = raw.length > 0 ? raw[raw.length - 1].endMs : 0;
  if (totalDurationMs > lastEnd) {
    raw.push({
      startMs: lastEnd,
      endMs: totalDurationMs,
      file: defaultBgm,
      volume: defaultVolume,
    });
  }

  // 2) ファイル未定義の区間は除去（無音 BGM として扱う）
  const filtered = raw.filter((s) => s.file !== undefined) as Array<RawSegment & { file: string }>;
  if (filtered.length === 0) return [];

  // 3) 連続する「同じファイル」のセグメントを統合
  const merged: Array<RawSegment & { file: string }> = [];
  for (const seg of filtered) {
    const prev = merged[merged.length - 1];
    if (prev && prev.file === seg.file && Math.abs(prev.endMs - seg.startMs) < 1) {
      prev.endMs = seg.endMs;
      // 音量は前を優先（混ざらない）
    } else {
      merged.push({ ...seg });
    }
  }

  // 4) クロスフェードを付与（最初のセグメントの fadeIn と最後の fadeOut は短め）
  const segments: ManifestBgmSegment[] = merged.map((s, i) => {
    const isFirst = i === 0;
    const isLast = i === merged.length - 1;
    return {
      startMs: s.startMs,
      endMs: s.endMs,
      audioFile: s.file,
      volume: s.volume,
      fadeInMs: isFirst ? 600 : DEFAULT_BGM_FADE_MS,
      fadeOutMs: isLast ? 1200 : DEFAULT_BGM_FADE_MS,
      loop: true,
    };
  });

  return segments;
}

/** manifestBuilder から呼ばれるためのシーン時間表構築ヘルパ */
export interface SceneTimingInput {
  sceneId: string;
  /** このシーンに属する行の startMs / durationMs */
  lineTimings: { startMs: number; durationMs: number }[];
  bgmFile: string | undefined;
}

export function toSceneTimeRanges(scenes: SceneTimingInput[]): SceneTimeRange[] {
  const ranges: SceneTimeRange[] = [];
  for (const s of scenes) {
    if (s.lineTimings.length === 0) continue;
    const start = s.lineTimings[0].startMs;
    const last = s.lineTimings[s.lineTimings.length - 1];
    const end = last.startMs + last.durationMs;
    ranges.push({
      sceneId: s.sceneId,
      startMs: start,
      endMs: end,
      bgmFile: s.bgmFile,
    });
  }
  return ranges;
}
