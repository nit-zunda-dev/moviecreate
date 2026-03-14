import ffmpeg from "fluent-ffmpeg";
import ffmpegStatic from "ffmpeg-static";
import ffprobe from "@ffprobe-installer/ffprobe";
import fs from "fs";
import path from "path";

if (ffmpegStatic) {
  ffmpeg.setFfmpegPath(ffmpegStatic as unknown as string);
}
if (ffprobe && ffprobe.path) {
  ffmpeg.setFfprobePath(ffprobe.path);
}

/**
 * 複数の音声ファイルを時間順に単純連結し、1本の音声ファイルとして出力する。
 * すべて同じフォーマット（VOICEVOX生成WAV）である前提。
 */
export function concatAudioFiles(inputs: string[], outputPath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    if (inputs.length === 0) {
      throw new Error("連結する音声ファイルが指定されていません。");
    }

    const absOut = path.resolve(outputPath);
    fs.mkdirSync(path.dirname(absOut), { recursive: true });

    const listFile = path.join(path.dirname(absOut), "concat_list.txt");
    fs.writeFileSync(listFile, inputs.map((p) => `file '${path.resolve(p)}'`).join("\n"), "utf8");

    ffmpeg()
      .input(listFile)
      .inputOptions(["-f concat", "-safe 0"])
      .outputOptions(["-c copy"])
      .on("end", () => resolve(absOut))
      .on("error", (err: Error) => reject(err))
      .save(absOut);
  });
}

