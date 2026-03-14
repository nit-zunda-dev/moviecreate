import fs from "fs";
import path from "path";

export interface LipSyncKeyFrame {
  timeSec: number;
  mouthOpen: boolean;
}

/**
 * 非同期で音声のラフな音量を解析し、口パク用のON/OFFキーフレームを生成する。
 * 実装簡略化のため、ここでは ffmpeg の volumedetect フィルタを利用したラッパの形にとどめる。
 * （必要になった段階で実際の解析処理を拡張できるようにしている）
 */
export async function analyzeLipSyncKeys(audioFile: string, frameIntervalSec = 0.1): Promise<LipSyncKeyFrame[]> {
  const abs = path.resolve(audioFile);
  if (!fs.existsSync(abs)) {
    throw new Error(`音声ファイルが存在しません: ${abs}`);
  }

  // TODO: 実際のRMS計算などを行って mouthOpen を決めるロジックを実装する。
  // ひとまずはダミーとして「常に閉じている」1フレームのみ返却しておき、
  // 今後の拡張でここを差し替えられるようにする。
  return [
    {
      timeSec: 0,
      mouthOpen: false,
    },
  ];
}

