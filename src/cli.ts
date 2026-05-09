#!/usr/bin/env node
import { Command } from "commander";
import path from "path";
import { loadScenario } from "./scenario/loader";
import { getBasePaths, getManifestPath, sanitizeFilenameForWindows } from "./config/paths";
import { synthesizeLine, synthesizeLineWithTiming } from "./voicevox/synthesizeLine";
import { concatAudioFiles } from "./media/ffmpegWrapper";
import { fetchSpeakers } from "./voicevox/client";
import { buildVideoManifest, writeManifest, LineResultWithContext } from "./media/manifestBuilder";
import { renderVideo } from "./video/renderVideo";
import { applyHtmlSlideBackgrounds } from "./slides/captureHtmlSlides";
import { lintRetention, printLintReport } from "./lint/retentionLinter";
import { generateYoutubeMetadata } from "./youtube/generateMetadata";

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

  const safeTitle = sanitizeFilenameForWindows(scenario.title || "output");
  const outFile =
    options.out ||
    (scenario.output?.file ? path.resolve(scenario.output.file) : path.join(outputDir, `${safeTitle}.wav`));

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

  // [0] Reveal スライド → 背景 PNG（slideIndex 指定シーンがある場合）
  const absScenarioPath = path.resolve(scenarioPath);
  await applyHtmlSlideBackgrounds(scenario, absScenarioPath);

  // [1] 音声合成 + タイミング取得
  const lineResults: LineResultWithContext[] = [];

  for (const scene of scenario.scenes) {
    for (let i = 0; i < scene.lines.length; i++) {
      const line = scene.lines[i];
      const result = await synthesizeLineWithTiming(scenario, scene.id, i, line);
      if (result) {
        lineResults.push({ result, line, sceneId: scene.id, lineIndex: i, sceneBackground: scene.background });
      }
    }
  }

  // [2] WAV 結合（タイトルに : 等が含まれると Windows でファイル作成に失敗するためサニタイズ）
  const safeTitle = sanitizeFilenameForWindows(scenario.title);
  const wavOut = path.join(outputDir, `${safeTitle}.wav`);
  const finalAudio = await concatAudioFiles(lineResults.map((r) => r.result.wavPath), wavOut);

  // [3] マニフェスト生成
  const manifest = buildVideoManifest(scenario, lineResults, finalAudio);
  writeManifest(manifest, getManifestPath(safeTitle));

  // [4] Remotion レンダリング
  const ext = options.transparent ? ".mov" : ".mp4";
  const videoOut = options.out || path.join(outputDir, `${safeTitle}${ext}`);
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

// YouTube タイトル候補・概要欄・チャプターを自動生成
program
  .command("generate-youtube-metadata")
  .description(
    "シナリオから YouTube のタイトル候補（3案）・概要欄・チャプタータイムスタンプ・ハッシュタグを生成し、テキストファイルとして出力する",
  )
  .argument("<scenario>", "シナリオYAML/JSONファイルパス")
  .option("--out <path>", "出力ファイルパス（既定: output/{title}-youtube-metadata.txt）")
  .action((scenarioPath: string, opts: { out?: string }) => {
    try {
      const scenario = loadScenario(scenarioPath);
      const result = generateYoutubeMetadata(scenario, { outFile: opts.out });
      console.log("");
      console.log("==== YouTube メタデータを生成しました ====");
      console.log(`  出力: ${result.outFile}`);
      console.log(`  タイトル候補: ${result.titleCandidates.length} 件`);
      for (const c of result.titleCandidates) {
        const warn = c.warning ? "  ⚠️" : "";
        console.log(`    [${c.style}] (${c.title.length}文字)${warn} ${c.title}`);
      }
    } catch (err) {
      console.error("YouTube メタデータ生成中にエラーが発生しました:", err);
      process.exit(1);
    }
  });

// 視聴維持率リスクの静的解析（音声生成・動画生成前のチェックに使う）
program
  .command("lint-retention")
  .description(
    "シナリオを静的解析して、視聴維持率（YouTube再生数）を下げるリスクを警告する（hook 未定義、字幕長すぎ、総尺長すぎ等）",
  )
  .argument("<scenario>", "シナリオYAML/JSONファイルパス")
  .option("--strict", "warn も終了コード 1 にする（CI 向け）", false)
  .action((scenarioPath: string, opts: { strict?: boolean }) => {
    try {
      const scenario = loadScenario(scenarioPath);
      const report = lintRetention(scenario);
      printLintReport(report, scenarioPath);
      if (report.errorCount > 0) {
        process.exit(1);
      }
      if (opts.strict && report.warnCount > 0) {
        process.exit(1);
      }
    } catch (err) {
      console.error("lint-retention の実行中にエラーが発生しました:", err);
      process.exit(1);
    }
  });

program.parse(process.argv);
