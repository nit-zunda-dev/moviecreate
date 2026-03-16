import fs from "fs";
import path from "path";
import sharp from "sharp";
import type { initializeCanvas as InitializeCanvas, readPsd as ReadPsd } from "ag-psd";

// ag-psd は CJS 互換のため require でロード
// canvas は ag-psd の描画に必要
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { readPsd, initializeCanvas } = require("ag-psd") as {
  readPsd: typeof ReadPsd;
  initializeCanvas: typeof InitializeCanvas;
};
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { createCanvas } = require("canvas");
initializeCanvas(createCanvas);

/**
 * PSD ファイルをパースして合成済み PNG を出力する。
 * このPSDはパーツ分け構造のため、全レイヤーを合成した1枚を生成する。
 * 既に出力済みのファイルはスキップする。
 *
 * @param psdPath       PSD ファイルパス
 * @param characterName キャラクター名（出力ディレクトリ名）
 * @param outputDir     PNG を保存するディレクトリ
 * @param faceNames     生成するフェイス名のリスト（省略時は ["通常"] のみ）
 * @returns フェイス名 → PNG 絶対パスの辞書
 */
export async function extractPsdLayers(
  psdPath: string,
  characterName: string,
  outputDir: string,
  faceNames: string[] = ["通常"],
): Promise<Record<string, string>> {
  const absPsdPath = path.resolve(psdPath);
  if (!fs.existsSync(absPsdPath)) {
    throw new Error(`PSD ファイルが見つかりません: ${absPsdPath}`);
  }

  fs.mkdirSync(outputDir, { recursive: true });

  // 合成済み PNG のパス（代表として最初の face 名を使う）
  const compositeName = faceNames[0] ?? "通常";
  const compositeFile = path.join(outputDir, `${compositeName}.png`);
  const compositeAbs = path.resolve(compositeFile);

  const result: Record<string, string> = {};

  if (fs.existsSync(compositeAbs)) {
    console.log(`[PSD] スキップ（既存）: ${characterName} → ${compositeAbs}`);
    // 全フェイス名を同じ合成画像にマッピング
    for (const name of faceNames) {
      result[name] = compositeAbs;
    }
    return result;
  }

  console.log(`[PSD] 読み込み中: ${absPsdPath}`);
  const nodeBuffer = fs.readFileSync(absPsdPath);
  const arrayBuffer = nodeBuffer.buffer.slice(
    nodeBuffer.byteOffset,
    nodeBuffer.byteOffset + nodeBuffer.byteLength,
  ) as ArrayBuffer;

  // 合成済みの画像（全レイヤーフラット）を取得
  const psd = readPsd(arrayBuffer, {
    skipCompositeImageData: false,
    skipLayerImageData: true,
  });

  console.log(`[PSD] ${characterName}: ${psd.width}x${psd.height}`);

  const canvas = psd.canvas;
  if (!canvas) {
    throw new Error(`PSD の合成画像を取得できませんでした: ${absPsdPath}`);
  }

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas の 2d コンテキストを取得できませんでした");
  const imgData = ctx.getImageData(0, 0, psd.width, psd.height);

  await sharp(Buffer.from(imgData.data.buffer), {
    raw: { width: psd.width, height: psd.height, channels: 4 },
  })
    .png()
    .toFile(compositeAbs);

  console.log(`[PSD] 出力: ${compositeAbs}`);

  // 全フェイス名を同じ合成画像にマッピング
  for (const name of faceNames) {
    result[name] = compositeAbs;
  }

  return result;
}
