import path from "path";
import fs from "fs";
import { computeRmsEnvelope } from "./wavRmsEnvelope";
import type { LineResultWithContext } from "./manifestBuilder";

export interface LipSyncKeyFrame {
  timeSec: number;
  mouthOpen: boolean;
}

/** 口パク RMS バケット長（ms）。短いほど細かいが manifest が肥大化しやすい */
export const LIP_SYNC_BUCKET_MS = 80;

/**
 * @deprecated 将来の互換用。実際のキーフレームは `enrichLineResultsWithLipSync` で行単位に埋め込む。
 */
export async function analyzeLipSyncKeys(audioFile: string, frameIntervalSec = 0.1): Promise<LipSyncKeyFrame[]> {
  const env = await computeRmsEnvelope(path.resolve(audioFile), Math.round(frameIntervalSec * 1000));
  return env.map((o, i) => ({
    timeSec: i * frameIntervalSec,
    mouthOpen: o > 0.15,
  }));
}

/**
 * 各セリフ WAV から RMS エンベロープを取り、`LineResultWithContext` に付与する。
 * `buildVideoManifest` が `lipKeyframes` に変換する。
 */
export async function enrichLineResultsWithLipSync(
  lineResults: LineResultWithContext[],
  bucketMs: number = LIP_SYNC_BUCKET_MS,
): Promise<LineResultWithContext[]> {
  const out: LineResultWithContext[] = [];
  for (const lr of lineResults) {
    const wav = lr.result.wavPath;
    if (!fs.existsSync(wav)) {
      out.push(lr);
      continue;
    }
    const env = await computeRmsEnvelope(wav, bucketMs);
    out.push({
      ...lr,
      lipEnvelope: env.length > 0 ? env : undefined,
      lipBucketMs: env.length > 0 ? bucketMs : undefined,
    });
  }
  return out;
}
