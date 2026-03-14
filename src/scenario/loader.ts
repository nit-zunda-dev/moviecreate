import fs from "fs";
import path from "path";
import YAML from "yaml";
import { Scenario } from "../types/scenario";

export function loadScenario(filePath: string): Scenario {
  const absPath = path.resolve(filePath);
  const raw = fs.readFileSync(absPath, "utf8");

  const data = filePath.endsWith(".yaml") || filePath.endsWith(".yml") ? YAML.parse(raw) : JSON.parse(raw);

  // ここでは最低限の形だけをチェックし、詳細な検証は別レイヤに任せる。
  if (!data || typeof data !== "object") {
    throw new Error("シナリオファイルの形式が不正です。");
  }
  if (!data.title || !Array.isArray(data.scenes)) {
    throw new Error("シナリオには title と scenes が必須です。");
  }

  return data as Scenario;
}
