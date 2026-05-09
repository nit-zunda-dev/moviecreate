import fs from "fs";
import path from "path";
import type { Scenario } from "../types/scenario";
import { getBasePaths, sanitizeFilenameForWindows } from "../config/paths";

/** 1日本語文字 ≒ 0.18 秒（300字/分）の概算で読み上げ秒数を見積もる */
const SECONDS_PER_CHAR = 0.18;

interface SceneTiming {
  id: string;
  chapterLabel?: string;
  /** チャプター開始位置（秒・累積） */
  startSec: number;
}

/** Hook を含む累積時間でシーンごとの開始秒を計算 */
function buildSceneTimings(scenario: Scenario): SceneTiming[] {
  const timings: SceneTiming[] = [];
  let cur = (scenario.hook?.durationMs ?? 0) / 1000;

  for (const scene of scenario.scenes) {
    timings.push({
      id: scene.id,
      chapterLabel: scene.chapter?.label,
      startSec: cur,
    });
    for (const line of scene.lines) {
      const text = line.text ?? "";
      cur += text.length * SECONDS_PER_CHAR;
    }
  }
  return timings;
}

function formatTimestamp(sec: number): string {
  const total = Math.max(0, Math.floor(sec));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${m}:${String(s).padStart(2, "0")}`;
}

function extractEpisodeNumber(title: string): number | undefined {
  const m = title.match(/第\s*(\d{1,3})\s*回/);
  return m ? parseInt(m[1], 10) : undefined;
}

function extractSeriesPrefix(title: string): string | undefined {
  const m = title.match(/【([^】]+)】/);
  return m ? m[1].trim() : undefined;
}

function extractTopic(scenario: Scenario): string | undefined {
  const tags = (scenario.youtube?.hashtags ?? [])
    .map((h) => h.replace(/^#/, ""))
    .filter((s) => /^[A-Z][A-Z0-9]{1,9}$/.test(s));
  if (tags.length > 0) return tags[0];
  const fromTitle = scenario.title.match(/[A-Z][A-Z0-9]{1,9}/);
  if (fromTitle) return fromTitle[0];
  return undefined;
}

// =============================================================================
// タイトル候補生成
// =============================================================================

export interface TitleCandidate {
  style: "shock" | "howto" | "exam";
  title: string;
  /** 60文字超えはスマホで切れるので警告対象 */
  warning?: string;
}

function buildTitleCandidates(scenario: Scenario): TitleCandidate[] {
  const ep = extractEpisodeNumber(scenario.title);
  const seriesPrefix = extractSeriesPrefix(scenario.title);
  // 「登録セキスペ 第16回｜Season2」のような prefix から、
  //  ｜以降と「第N回」「SeasonN」を除去してシリーズ名本体だけ取り出す。
  const seriesShort = (seriesPrefix ?? "登録セキスペ")
    .split(/[｜|]/)[0]
    .replace(/第\s*\d+\s*回/g, "")
    .replace(/Season\s*\d+/gi, "")
    .replace(/\s+/g, "")
    .trim() || "登録セキスペ";
  const topic = extractTopic(scenario);
  const hookText = scenario.hook?.text ?? "";
  const firstEmphasis = scenario.hook?.emphasis?.[0];

  const styleOrder = scenario.youtube?.titleHints?.map((t) => t.style) ?? [
    "shock",
    "howto",
    "exam",
  ];
  const result: TitleCandidate[] = [];

  for (const style of styleOrder) {
    let title: string;
    if (style === "shock") {
      // 衝撃型：本文をそのまま前置、後ろに資格名
      const body = hookText || firstEmphasis || scenario.title.replace(/【[^】]+】/g, "").trim();
      const tail = ep ? `【${seriesShort} 第${ep}回】` : `【${seriesShort}】`;
      title = `${body}${tail}`;
    } else if (style === "howto") {
      // ハウツー型：「{topic} とは？{ヒント}｜資格名」
      const tag = ep ? `${seriesShort}第${ep}回` : seriesShort;
      if (topic) {
        title = `${topic} とは？${firstEmphasis ?? "5分でマスター"}｜${tag}`;
      } else {
        title = `${firstEmphasis ?? hookText} を5分で解説｜${tag}`;
      }
    } else {
      // 受験者狙い：従来の名寄せ型
      const tag = ep ? `【${seriesShort} 第${ep}回】` : `【${seriesShort}】`;
      const cleanedTitle = scenario.title.replace(/【[^】]+】/g, "").trim();
      title = `${tag}${cleanedTitle}`;
    }
    const warning = title.length > 60 ? `タイトルが${title.length}文字あります。スマホでは切れる可能性大（60文字以下推奨）` : undefined;
    result.push({ style, title, warning });
  }
  return result;
}

// =============================================================================
// 概要欄生成
// =============================================================================

function buildDescription(scenario: Scenario): string {
  const lines: string[] = [];
  const hookText = scenario.hook?.text ?? "";
  const audience = scenario.youtube?.audience ?? [];
  const hashtags = scenario.youtube?.hashtags ?? [];
  const related = scenario.youtube?.relatedEpisodes ?? [];

  // 1) 1行目：フック（つかみ）
  if (hookText) {
    lines.push(hookText);
    lines.push("");
  }

  // 2) 対象視聴者
  if (audience.length > 0) {
    lines.push(`▼こんな人におすすめ`);
    for (const a of audience) {
      lines.push(`・${a}`);
    }
    lines.push("");
  }

  // 3) この動画でわかること（chapter ラベルから自動）
  const chapterScenes = scenario.scenes.filter((s) => s.chapter?.label);
  if (chapterScenes.length > 0) {
    lines.push(`▼この動画でわかること`);
    for (const s of chapterScenes) {
      lines.push(`・${s.chapter!.label}`);
    }
    lines.push("");
  }

  // 4) チャプター（タイムスタンプ）
  const timings = buildSceneTimings(scenario).filter((t) => t.chapterLabel);
  if (timings.length > 0) {
    lines.push(`▼チャプター`);
    if (scenario.hook) {
      lines.push(`0:00 オープニング`);
    }
    for (const t of timings) {
      lines.push(`${formatTimestamp(t.startSec)} ${t.chapterLabel}`);
    }
    lines.push("");
    lines.push("※タイムスタンプは台本からの推定値です。実音声に合わせて微調整してください。");
    lines.push("");
  }

  // 5) 関連回
  if (related.length > 0) {
    lines.push(`▼関連回`);
    for (const r of related) {
      lines.push(`・第${r.ep}回：${r.title}`);
    }
    lines.push("");
  }

  // 6) CTA
  lines.push(`▼チャンネル登録`);
  lines.push(`このシリーズを最後まで見て、合格を一緒に掴みましょう。`);
  lines.push(`高評価・チャンネル登録・コメントが励みになります！`);
  lines.push("");

  // 7) ハッシュタグ
  if (hashtags.length > 0) {
    lines.push(hashtags.join(" "));
  }

  return lines.join("\n");
}

// =============================================================================
// メイン出力
// =============================================================================

export interface GenerateMetadataOptions {
  outFile?: string;
}

export interface GeneratedMetadata {
  outFile: string;
  titleCandidates: TitleCandidate[];
  description: string;
}

export function generateYoutubeMetadata(
  scenario: Scenario,
  options: GenerateMetadataOptions = {},
): GeneratedMetadata {
  const titleCandidates = buildTitleCandidates(scenario);
  const description = buildDescription(scenario);

  const { outputDir } = getBasePaths();
  const safeTitle = sanitizeFilenameForWindows(scenario.title || "youtube-metadata");
  const outFile = options.outFile ?? path.join(outputDir, `${safeTitle}-youtube-metadata.txt`);

  const sections: string[] = [];
  sections.push("=".repeat(76));
  sections.push("【推奨】YouTube タイトル候補");
  sections.push("=".repeat(76));
  for (let i = 0; i < titleCandidates.length; i++) {
    const c = titleCandidates[i];
    sections.push(`\n[${i + 1}/${titleCandidates.length}] style=${c.style} (${c.title.length}文字)`);
    sections.push(c.title);
    if (c.warning) {
      sections.push(`⚠️  ${c.warning}`);
    }
  }
  sections.push("");
  sections.push("=".repeat(76));
  sections.push("【概要欄】（そのまま貼り付け可）");
  sections.push("=".repeat(76));
  sections.push("");
  sections.push(description);
  sections.push("");
  sections.push("=".repeat(76));
  sections.push("【ハッシュタグ】");
  sections.push("=".repeat(76));
  sections.push((scenario.youtube?.hashtags ?? []).join(" "));
  sections.push("");
  sections.push("=".repeat(76));
  sections.push("【サムネメモ】");
  sections.push("=".repeat(76));
  sections.push(
    "node dist/cli.js generate-thumbnails で 3 スタイル（shock/howto/exam）を一括生成できます。",
  );
  sections.push(
    "YouTube 公式の「サムネイルテスト」（A/B）に 3 案そのまま投入してください。",
  );

  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, sections.join("\n"), "utf-8");

  return { outFile, titleCandidates, description };
}
