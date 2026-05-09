import fs from "fs/promises";

interface ParsedWav {
  samples: Int16Array;
  sampleRate: number;
}

/**
 * PCM 16-bit WAV を読み、モノラルに正規化したサンプル列を返す。
 * float WAV / 24bit 等は未対応（空配列相当で上位がフォールバック）。
 */
function parseWavPcm16Mono(buffer: Buffer): ParsedWav | null {
  if (buffer.length < 44 || buffer.toString("ascii", 0, 4) !== "RIFF") {
    return null;
  }

  let offset = 12;
  let fmtChunk: Buffer | null = null;
  let dataChunk: Buffer | null = null;

  while (offset + 8 <= buffer.length) {
    const id = buffer.toString("ascii", offset, offset + 4);
    const size = buffer.readUInt32LE(offset + 4);
    const chunkStart = offset + 8;
    const chunkEnd = chunkStart + size;
    if (chunkEnd > buffer.length) break;

    if (id === "fmt ") {
      fmtChunk = buffer.subarray(chunkStart, chunkEnd);
    } else if (id === "data") {
      dataChunk = buffer.subarray(chunkStart, chunkEnd);
    }

    offset = chunkEnd;
    if (size % 2 === 1) offset++;
  }

  if (!fmtChunk || !dataChunk || fmtChunk.length < 16) return null;

  const audioFormat = fmtChunk.readUInt16LE(0);
  const numChannels = fmtChunk.readUInt16LE(2);
  const sampleRate = fmtChunk.readUInt32LE(4);
  const bitsPerSample = fmtChunk.readUInt16LE(14);

  if (audioFormat !== 1 || bitsPerSample !== 16) {
    return null;
  }

  const bytesPerSample = 2;
  const frameSize = numChannels * bytesPerSample;
  const numFrames = Math.floor(dataChunk.length / frameSize);
  const samples = new Int16Array(numFrames);

  if (numChannels === 1) {
    for (let i = 0; i < numFrames; i++) {
      samples[i] = dataChunk.readInt16LE(i * bytesPerSample);
    }
  } else {
    for (let i = 0; i < numFrames; i++) {
      let sum = 0;
      for (let ch = 0; ch < numChannels; ch++) {
        sum += dataChunk.readInt16LE(i * frameSize + ch * bytesPerSample);
      }
      samples[i] = Math.round(sum / numChannels);
    }
  }

  return { samples, sampleRate };
}

/**
 * WAV の振幅エンベロープ（バケットごとの RMS を 0〜1 に正規化）。
 * VOICEVOX 出力の PCM16 WAV を想定。
 */
export async function computeRmsEnvelope(wavPath: string, bucketMs: number): Promise<number[]> {
  try {
    const buf = await fs.readFile(wavPath);
    const parsed = parseWavPcm16Mono(buf);
    if (!parsed) return [];

    const { samples, sampleRate } = parsed;
    const samplesPerBucket = Math.max(1, Math.round((sampleRate * bucketMs) / 1000));
    const out: number[] = [];

    for (let i = 0; i < samples.length; i += samplesPerBucket) {
      const end = Math.min(i + samplesPerBucket, samples.length);
      let sumSq = 0;
      for (let j = i; j < end; j++) {
        const v = samples[j]! / 32768;
        sumSq += v * v;
      }
      const rms = Math.sqrt(sumSq / (end - i));
      // しきい値付きで口パクらしい動きに（無音は 0 に近い）
      const normalized = Math.min(1, Math.pow(Math.max(0, rms - 0.002) * 12, 0.55));
      out.push(normalized);
    }
    return out;
  } catch {
    return [];
  }
}
