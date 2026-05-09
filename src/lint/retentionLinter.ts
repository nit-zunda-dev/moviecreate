import { Scenario, Line } from "../types/scenario";
import {
  deriveShortsScenario,
  estimateShortsDurationMs,
  SHORTS_RECOMMENDED_MAX_MS,
} from "../shorts/deriveShortsScenario";

export type Severity = "error" | "warn" | "info";

export interface LintFinding {
  ruleId: string;
  severity: Severity;
  message: string;
  /** どのシーン/行で検知したかのヒント（任意） */
  location?: string;
}

export interface LintReport {
  findings: LintFinding[];
  /** Error 以上の件数 */
  errorCount: number;
  /** Warn の件数 */
  warnCount: number;
  /** Info の件数 */
  infoCount: number;
}

/**
 * 1日本語文字 ≒ 0.18 秒（300字/分）の概算で読み上げ秒数を見積もる。
 * 実測値ではないが、台本段階で「長すぎ」をブロックするには十分。
 */
const SECONDS_PER_CHAR = 0.18;

function estimateLineSeconds(line: Line): number {
  const text = line.text ?? "";
  return text.length * SECONDS_PER_CHAR;
}

function estimateScenarioSeconds(scenario: Scenario): number {
  let s = 0;
  if (scenario.hook?.durationMs) s += scenario.hook.durationMs / 1000;
  for (const scene of scenario.scenes) {
    for (const line of scene.lines) {
      s += estimateLineSeconds(line);
    }
  }
  return s;
}

/**
 * シナリオを静的解析して、視聴維持率を下げるリスクを警告する。
 * Sprint 1 初版は 8 ルール。今後ルールは追加予定。
 */
export function lintRetention(scenario: Scenario): LintReport {
  const findings: LintFinding[] = [];

  // R001: hook 未定義（最重要）
  if (!scenario.hook) {
    findings.push({
      ruleId: "R001-no-hook",
      severity: "error",
      message:
        "hook ブロックが未定義です。動画冒頭5秒のフックは視聴維持率に直結します。シナリオルートに hook: { text: '...' } を追加してください。",
    });
  }

  // R002: hook が長すぎ
  if (scenario.hook?.durationMs && scenario.hook.durationMs > 8000) {
    findings.push({
      ruleId: "R002-hook-too-long",
      severity: "warn",
      message: `hook.durationMs が ${scenario.hook.durationMs}ms と長すぎます。8000ms 以下を推奨します（理想は 5000ms 前後）。`,
    });
  }

  // R003: 1セリフ字幕が長すぎる
  for (const scene of scenario.scenes) {
    for (let i = 0; i < scene.lines.length; i++) {
      const line = scene.lines[i];
      const sub = line.subtitle ?? line.text ?? "";
      if (sub.length > 80) {
        findings.push({
          ruleId: "R003-subtitle-too-long",
          severity: "warn",
          message: `字幕が ${sub.length} 文字あります。1セリフ80文字以下に分割するのを推奨します。`,
          location: `scene "${scene.id}" line ${i}`,
        });
      }
    }
  }

  // R004: 1個目のシーン（incident相当）が長すぎ
  const firstScene = scenario.scenes[0];
  if (firstScene) {
    const firstSec = firstScene.lines.reduce((acc, l) => acc + estimateLineSeconds(l), 0);
    if (firstSec > 15) {
      findings.push({
        ruleId: "R004-first-scene-too-long",
        severity: "warn",
        message: `1個目のシーン "${firstScene.id}" の総セリフ時間が約 ${firstSec.toFixed(1)} 秒と長すぎます。15秒以内を推奨（離脱が起きやすい）。`,
        location: `scene "${firstScene.id}"`,
      });
    }
  }

  // R005: 総尺が長すぎ
  const totalSec = estimateScenarioSeconds(scenario);
  const totalMin = totalSec / 60;
  if (totalMin > 15) {
    findings.push({
      ruleId: "R005-total-too-long",
      severity: "warn",
      message: `総尺見積もりが約 ${totalMin.toFixed(1)} 分です。15分以下、理想は 7〜10 分。前後編に分割を検討してください。`,
    });
  }

  // R006: 演出マーカーが全く無い（emphasis/callout/se）
  let totalEmphasis = 0;
  let totalCallout = 0;
  let totalSe = 0;
  for (const scene of scenario.scenes) {
    for (const line of scene.lines) {
      if (line.emphasis && line.emphasis.length > 0) totalEmphasis++;
      if (line.callout) totalCallout++;
      if (line.se) totalSe++;
    }
  }
  if (totalEmphasis === 0 && totalCallout === 0 && totalSe === 0) {
    findings.push({
      ruleId: "R006-no-callouts",
      severity: "warn",
      message:
        "emphasis / callout / se が全行で未指定です。視覚的に単調な動画になりがち。最低でも各シーンに 1 つ emphasis を入れることを推奨します。",
    });
  }

  // R007: youtube.titleHints 未指定
  if (!scenario.youtube?.titleHints || scenario.youtube.titleHints.length === 0) {
    findings.push({
      ruleId: "R007-no-title-hints",
      severity: "info",
      message:
        "youtube.titleHints が未指定です。タイトル自動生成（Sprint 2 で配線予定）に必要なので、['shock', 'howto', 'exam'] から選んで指定しておくと後で楽です。",
    });
  }

  // R008: チャプターラベルが少ない
  const chapteredScenes = scenario.scenes.filter((s) => s.chapter?.label).length;
  if (chapteredScenes < 3) {
    findings.push({
      ruleId: "R008-few-chapters",
      severity: "info",
      message: `chapter ラベルが付いたシーンが ${chapteredScenes} 個しかありません。3 個以上推奨（YouTube 概要欄のタイムスタンプに必要）。`,
    });
  }

  // R009: BGM が未指定（無音は離脱要因）
  const hasGlobalBgm = !!scenario.global?.bgm?.default;
  const sceneBgmCount = scenario.scenes.filter((s) => !!s.bgm).length;
  const hasHookBgm = !!scenario.hook?.bgm;
  if (!hasGlobalBgm && sceneBgmCount === 0 && !hasHookBgm) {
    findings.push({
      ruleId: "R009-no-bgm",
      severity: "warn",
      message:
        "BGM が全く指定されていません（global.bgm.default も scene.bgm も hook.bgm も無し）。完全無音は離脱要因になりがちです。最低でも global.bgm.default に 1 本指定することを推奨。素材の選定は docs/audio-assets.md を参照。",
    });
  }

  // R010: Hook に SE が無い（開幕の「ドンッ」が無いと弱い）
  if (scenario.hook && !scenario.hook.se) {
    findings.push({
      ruleId: "R010-hook-no-se",
      severity: "info",
      message:
        "hook に se が指定されていません。Hook 開幕の「ドンッ」「シャキーン」が無いと演出が弱くなりがちです。hook.se: \"./se/hook_impact.mp3\" のように 1 本入れると効果的です。",
    });
  }

  // R011: BGM ファイルが拡張子的に怪しい
  const bgmCandidates = [
    scenario.global?.bgm?.default,
    scenario.hook?.bgm,
    ...scenario.scenes.map((s) => s.bgm),
  ].filter((p): p is string => typeof p === "string");
  for (const bgm of bgmCandidates) {
    if (!/\.(mp3|wav|ogg|m4a|aac|flac)$/i.test(bgm)) {
      findings.push({
        ruleId: "R011-bgm-bad-ext",
        severity: "warn",
        message: `BGM ファイル "${bgm}" の拡張子が音声形式ではない可能性があります（mp3/wav/ogg/m4a/aac/flac を推奨）。`,
      });
    }
  }

  // R012: Shorts の推定尺が 60 秒を超える
  if (scenario.shorts && scenario.shorts.length > 0) {
    for (const spec of scenario.shorts) {
      try {
        const derived = deriveShortsScenario(scenario, spec);
        const estMs = estimateShortsDurationMs(derived, 2000, !!spec.cta);
        if (estMs > SHORTS_RECOMMENDED_MAX_MS) {
          findings.push({
            ruleId: "R012-shorts-too-long",
            severity: "warn",
            message: `Shorts "${spec.id}" の推定尺が約 ${(estMs / 1000).toFixed(1)} 秒です。${
              SHORTS_RECOMMENDED_MAX_MS / 1000
            } 秒以内（理想 30〜45 秒）を推奨します。pickLines で行範囲を絞ってください。`,
            location: `shorts "${spec.id}"`,
          });
        }
      } catch (err) {
        findings.push({
          ruleId: "R012-shorts-derive-error",
          severity: "error",
          message: `Shorts "${spec.id}" の派生に失敗しました: ${
            err instanceof Error ? err.message : String(err)
          }`,
          location: `shorts "${spec.id}"`,
        });
      }
    }
  }

  // R013: Shorts に CTA が無い（本編チャンネル誘導が無いと回遊しづらい）
  if (scenario.shorts && scenario.shorts.length > 0) {
    for (const spec of scenario.shorts) {
      if (!spec.cta) {
        findings.push({
          ruleId: "R013-shorts-no-cta",
          severity: "info",
          message: `Shorts "${spec.id}" に cta が指定されていません。「本編はこちら」「概要欄から本編へ」等を指定すると本編チャンネル誘導が増えます。`,
          location: `shorts "${spec.id}"`,
        });
      }
    }
  }

  let errorCount = 0;
  let warnCount = 0;
  let infoCount = 0;
  for (const f of findings) {
    if (f.severity === "error") errorCount++;
    else if (f.severity === "warn") warnCount++;
    else infoCount++;
  }

  return { findings, errorCount, warnCount, infoCount };
}

/** コンソールに人が読める形式で出力する */
export function printLintReport(report: LintReport, scenarioPath: string): void {
  const symbol = (s: Severity) => (s === "error" ? "🔴" : s === "warn" ? "🟡" : "🟢");

  console.log("");
  console.log(`==== lint-retention: ${scenarioPath} ====`);
  if (report.findings.length === 0) {
    console.log("✅ 問題は検出されませんでした。");
  } else {
    for (const f of report.findings) {
      const loc = f.location ? `  [${f.location}]` : "";
      console.log(`${symbol(f.severity)} [${f.ruleId}]${loc}\n   ${f.message}`);
    }
  }
  console.log("");
  console.log(
    `合計: 🔴 ${report.errorCount} error / 🟡 ${report.warnCount} warn / 🟢 ${report.infoCount} info`,
  );
  console.log("");
}
