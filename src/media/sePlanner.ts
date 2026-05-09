import path from "path";
import type { ManifestSeEvent } from "../types/videoManifest";

/** 既定の SE 音量（BGM より大きく、セリフより小さい） */
export const DEFAULT_SE_VOLUME = 0.7;

interface LineSeInput {
  /** 行の開始時刻（Hook オフセット込みの絶対 ms） */
  startMs: number;
  /** Line.se（解決済み絶対パス）または undefined */
  seFile: string | undefined;
}

/**
 * Hook 開始時の SE と、各行の開始時の SE をまとめて時刻昇順のイベント列にする。
 *
 * @param hookSeFile Hook 開始 0ms に鳴らす SE（Hook.se の絶対パス）
 * @param lineInputs 行ごとの開始時刻と SE ファイル（行順）
 */
export function planSeEvents(
  hookSeFile: string | undefined,
  lineInputs: LineSeInput[],
): ManifestSeEvent[] {
  const events: ManifestSeEvent[] = [];

  if (hookSeFile) {
    events.push({
      atMs: 0,
      audioFile: path.resolve(hookSeFile),
      volume: DEFAULT_SE_VOLUME,
    });
  }

  for (const li of lineInputs) {
    if (!li.seFile) continue;
    events.push({
      atMs: li.startMs,
      audioFile: path.resolve(li.seFile),
      volume: DEFAULT_SE_VOLUME,
    });
  }

  events.sort((a, b) => a.atMs - b.atMs);
  return events;
}
