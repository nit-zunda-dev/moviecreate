import type { Scenario, Scene, ShortsSpec } from "../types/scenario";

/** Shorts は縦長 1080×1920 が標準（YouTube Shorts / TikTok / Reels） */
export const SHORTS_WIDTH = 1080;
export const SHORTS_HEIGHT = 1920;

/** Shorts の推奨上限（YouTube Shorts は3分まで OK だが、視聴維持率が高いのは 30〜60 秒） */
export const SHORTS_RECOMMENDED_MAX_MS = 60_000;

/** CTA（末尾の「続きは概要欄」表示）の既定時間 */
export const SHORTS_CTA_DURATION_MS = 2000;

/**
 * 本編シナリオと ShortsSpec から、派生 Scenario を作る。
 *
 * - `pickLines` 指定があれば優先（特定シーンの行範囲だけ抽出）
 * - そうでなければ `pickScenes` で指定シーンを丸ごと抽出
 * - どちらも未指定なら、本編 scenes をそのまま使う（=Hook+全編が Shorts 化）
 * - Hook はそのまま引き継ぐ（強制 5 秒の掴み）
 * - output は 1080×1920 に強制
 * - shorts: undefined にする（派生から再派生はしない）
 *
 * 既存の `buildVideoManifest` をそのまま再利用できる構造を保つ。
 */
export function deriveShortsScenario(scenario: Scenario, spec: ShortsSpec): Scenario {
  const filteredScenes = pickScenes(scenario, spec);

  return {
    ...scenario,
    scenes: filteredScenes,
    title: spec.title || `${scenario.title} (${spec.id})`,
    // Shorts は尺が伸びるためエンドカードは無効化（本編 global.endScreen を引き継がない）
    global: scenario.global ? { ...scenario.global, endScreen: undefined } : undefined,
    output: {
      ...(scenario.output ?? {}),
      width: SHORTS_WIDTH,
      height: SHORTS_HEIGHT,
    },
    // 派生から再派生させない
    shorts: undefined,
  };
}

function pickScenes(scenario: Scenario, spec: ShortsSpec): Scene[] {
  // pickLines 優先
  if (spec.pickLines && spec.pickLines.length > 0) {
    const result: Scene[] = [];
    for (const sel of spec.pickLines) {
      const scene = scenario.scenes.find((s) => s.id === sel.sceneId);
      if (!scene) {
        throw new Error(
          `[Shorts ${spec.id}] pickLines: scene "${sel.sceneId}" がシナリオに存在しません`,
        );
      }
      const from = Math.max(0, sel.from);
      const to = Math.min(scene.lines.length, sel.to);
      const sliced = scene.lines.slice(from, to);
      if (sliced.length === 0) continue;
      result.push({
        ...scene,
        // 派生 scene の id はユニーク化（同じ scene を複数回 slice する可能性に備える）
        id: `${scene.id}_slice_${from}_${to}`,
        lines: sliced,
      });
    }
    return result;
  }

  // pickScenes
  if (spec.pickScenes && spec.pickScenes.length > 0) {
    const result: Scene[] = [];
    for (const sceneId of spec.pickScenes) {
      const scene = scenario.scenes.find((s) => s.id === sceneId);
      if (!scene) {
        throw new Error(
          `[Shorts ${spec.id}] pickScenes: scene "${sceneId}" がシナリオに存在しません`,
        );
      }
      result.push(scene);
    }
    return result;
  }

  // 何も指定が無ければ全シーン
  return scenario.scenes;
}

/**
 * Shorts 派生 Scenario の推定総尺（Hook + 各 Line の text 文字数 × SECONDS_PER_CHAR + CTA 2秒）。
 * lint や警告メッセージ用の簡易見積もり。
 */
export function estimateShortsDurationMs(
  derivedScenario: Scenario,
  ctaDurationMs: number = SHORTS_CTA_DURATION_MS,
  hasCta: boolean = true,
): number {
  const SECONDS_PER_CHAR = 0.18;
  const hookMs = derivedScenario.hook?.durationMs ?? (derivedScenario.hook ? 5000 : 0);
  let bodyMs = 0;
  for (const scene of derivedScenario.scenes) {
    for (const line of scene.lines) {
      bodyMs += (line.text ?? "").length * SECONDS_PER_CHAR * 1000;
    }
  }
  return hookMs + bodyMs + (hasCta ? ctaDurationMs : 0);
}
