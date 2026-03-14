import fs from "fs";
import path from "path";
import { Scenario } from "../types/scenario";
import { getBasePaths } from "../config/paths";

export interface ResolvedScenario extends Scenario {
  resolvedRoot: string;
}

export function resolveScenarioPaths(scenario: Scenario, scenarioFilePath: string): ResolvedScenario {
  const rootDir = path.dirname(path.resolve(scenarioFilePath));
  const base = getBasePaths();

  // 存在チェック用のヘルパ
  const ensureFile = (label: string, absPath: string | undefined) => {
    if (!absPath) return;
    if (!fs.existsSync(absPath)) {
      throw new Error(`${label} が見つかりません: ${absPath}`);
    }
  };

  // グローバル背景・BGM
  if (scenario.global?.defaultBackground) {
    const abs = path.resolve(rootDir, base.imageDir, scenario.global.defaultBackground);
    ensureFile("defaultBackground", abs);
  }
  if (scenario.global?.defaultBgm) {
    const abs = path.resolve(rootDir, base.musicDir, scenario.global.defaultBgm);
    ensureFile("defaultBgm", abs);
  }

  // 各シーンの背景・BGM
  for (const scene of scenario.scenes) {
    if (scene.background) {
      const abs = path.resolve(rootDir, base.imageDir, scene.background);
      ensureFile(`scene[${scene.id}].background`, abs);
    }
    if (scene.bgm) {
      const abs = path.resolve(rootDir, base.musicDir, scene.bgm);
      ensureFile(`scene[${scene.id}].bgm`, abs);
    }
  }

  return {
    ...scenario,
    resolvedRoot: rootDir,
  };
}

