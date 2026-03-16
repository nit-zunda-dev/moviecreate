#!/usr/bin/env node
import { Command } from "commander";
import path from "path";
import { loadScenario } from "./scenario/loader";
import { getBasePaths, getManifestPath } from "./config/paths";
import { synthesizeLine, synthesizeLineWithTiming } from "./voicevox/synthesizeLine";
import { concatAudioFiles } from "./media/ffmpegWrapper";
import { fetchSpeakers } from "./voicevox/client";
import { buildVideoManifest, writeManifest, LineResultWithContext } from "./media/manifestBuilder";
import { renderVideo } from "./video/renderVideo";

const program = new Command();

async function generateAudioCommand(
  scenarioPath: string,
  options: { out?: string; dryRun?: boolean; perLineDir?: string },
) {
  const scenario = loadScenario(scenarioPath);
  const { outputDir } = getBasePaths();

  if (options.dryRun) {
    console.log("シナリオ読み込み成功:", JSON.stringify(scenario, null, 2));
    return;
  }

  const lineAudioFiles: string[] = [];

  for (const scene of scenario.scenes) {
    const sceneId = scene.id;
    for (let i = 0; i < scene.lines.length; i++) {
      const line = scene.lines[i];
      const voicePath = await synthesizeLine(scenario, sceneId, i, line);
      if (voicePath) {
        lineAudioFiles.push(voicePath);
      }
    }
  }

  const outFile =
    options.out ||
    (scenario.output?.file ? path.resolve(scenario.output.file) : path.join(outputDir, `${scenario.title || "output"}.wav`));

  const finalAudio = await concatAudioFiles(lineAudioFiles, outFile);
  console.log("音声を出力しました:", finalAudio);
}

async function generateVideoCommand(
  scenarioPath: string,
  options: { out?: string; dryRun?: boolean; transparent?: boolean },
) {
  const scenario = loadScenario(scenarioPath);
  const { outputDir } = getBasePaths();

  if (options.dryRun) {
    console.log("--dry-run: シナリオを読み込みました:", JSON.stringify(scenario, null, 2));
    return;
  }

  // [1] 音声合成 + タイミング取得
  const lineResults: LineResultWithContext[] = [];

  for (const scene of scenario.scenes) {
    for (let i = 0; i < scene.lines.length; i++) {
      const line = scene.lines[i];
      const result = await synthesizeLineWithTiming(scenario, scene.id, i, line);
      if (result) {
        lineResults.push({ result, line, sceneId: scene.id, lineIndex: i });
      }
    }
  }

  // [2] WAV 結合
  const wavOut = path.join(outputDir, `${scenario.title}.wav`);
  const finalAudio = await concatAudioFiles(lineResults.map((r) => r.result.wavPath), wavOut);

  // [3] マニフェスト生成
  const manifest = buildVideoManifest(scenario, lineResults, finalAudio);
  writeManifest(manifest, getManifestPath(scenario.title));

  // [4] Remotion レンダリング
  const ext = options.transparent ? ".mov" : ".mp4";
  const videoOut = options.out || path.join(outputDir, `${scenario.title}${ext}`);
  await renderVideo(manifest, videoOut, { transparent: options.transparent });
  console.log("動画を出力しました:", videoOut);
}

program
  .name("voicevox-audio")
  .description("VOICEVOXベースの音声自動生成CLI")
  .version("0.1.0");

program
  .command("generate-audio")
  .argument("<scenario>", "シナリオYAML/JSONファイルパス")
  .option("--out <path>", "出力音声ファイルパス（既定: output/{title}.wav）")
  .option("--per-line-dir <path>", "各セリフの個別WAVをコピーして保存するディレクトリ")
  .option("--dry-run", "シナリオ読み込みのみ行う", false)
  .action((scenarioPath, opts) => {
    generateAudioCommand(scenarioPath, opts).catch((err) => {
      console.error("音声生成中にエラーが発生しました:", err);
      process.exit(1);
    });
  });

program
  .command("generate-video")
  .description("シナリオから動画を生成する（VOICEVOX + Remotion）")
  .argument("<scenario>", "シナリオYAML/JSONファイルパス")
  .option("--out <path>", "出力動画ファイルパス（既定: output/{title}.mp4 / .mov）")
  .option("--transparent", "透過レンダリング（ProRes 4444 .mov 出力）", false)
  .option("--dry-run", "シナリオ読み込みのみ行う", false)
  .action((scenarioPath, opts) => {
    generateVideoCommand(scenarioPath, opts).catch((err) => {
      console.error("動画生成中にエラーが発生しました:", err);
      process.exit(1);
    });
  });

program
  .command("list-speakers")
  .description("VOICEVOXエンジンから利用可能な話者一覧を取得して表示する")
  .action(async () => {
    try {
      const speakers = await fetchSpeakers();
      speakers.forEach((sp) => {
        sp.styles.forEach((style) => {
          console.log(`${style.id}\t${sp.name}\t${style.name}`);
        });
      });
    } catch (err) {
      console.error("話者一覧の取得に失敗しました:", err);
      process.exit(1);
    }
  });

// 後方互換のために generate を generate-audio のエイリアスとして残す
program
  .command("generate")
  .argument("<scenario>", "シナリオYAML/JSONファイルパス")
  .option("--out <path>", "出力音声ファイルパス（既定: output/{title}.wav）")
  .option("--per-line-dir <path>", "各セリフの個別WAVをコピーして保存するディレクトリ")
  .option("--dry-run", "シナリオ読み込みのみ行う", false)
  .action((scenarioPath, opts) => {
    generateAudioCommand(scenarioPath, opts).catch((err) => {
      console.error("音声生成中にエラーが発生しました:", err);
      process.exit(1);
    });
  });

program.parse(process.argv);
