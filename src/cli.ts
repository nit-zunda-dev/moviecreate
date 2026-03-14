#!/usr/bin/env node
import { Command } from "commander";
import path from "path";
import { loadScenario } from "./scenario/loader";
import { getBasePaths } from "./config/paths";
import { synthesizeLine } from "./voicevox/synthesizeLine";
import { concatAudioFiles } from "./media/ffmpegWrapper";
import { Scenario } from "./types/scenario";
import { fetchSpeakers } from "./voicevox/client";

const program = new Command();

async function generateAudioCommand(
  scenarioPath: string,
  options: { out?: string; dryRun?: boolean; perLineDir?: string },
) {
  const scenario = loadScenario(scenarioPath);
  const { tempDir, outputDir } = getBasePaths();

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

