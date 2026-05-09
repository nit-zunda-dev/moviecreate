import fs from "fs";
import path from "path";
import type { Scenario, Scene, ShortsSpec } from "../types/scenario";
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
// 画像生成プロンプト（サムネ・各シーン背景・エンドスクリーン・Shorts サムネ）
// =============================================================================

/** 全プロンプト共通のベース指示（ロゴ・文字・人物の混入を防ぐ） */
const BASE_STYLE_EN =
  "anime style background art, soft cinematic lighting, painterly textures, " +
  "no people, no text, no logos, no watermark, clean composition";

const NEGATIVE_PROMPT =
  "text, letters, words, watermark, logo, signature, person, people, face, " +
  "character, hands, ui elements, frame border, low quality, blurry, distorted, jpeg artifacts";

interface AssetPrompt {
  /** 表示見出し（例: "サムネイル", "シーン: incident（事件発生）"） */
  label: string;
  /** 推奨ファイル名（例: "image/background/scene_incident.png"） */
  suggestedPath: string;
  /** 16:9 / 9:16 などのアスペクト */
  aspect: "16:9" | "9:16";
  /** 推奨解像度 */
  resolution: string;
  /** 英語プロンプト本文（DALL·E / SDXL / Imagen 共通で使える前提） */
  promptEn: string;
  /** Midjourney 用の短縮版（v6 想定、--ar / --v 付き） */
  promptMj: string;
  /** 任意: 補足メモ */
  note?: string;
}

function joinKeywords(parts: (string | undefined | null)[]): string {
  return parts
    .map((p) => (p ?? "").trim())
    .filter((p) => p.length > 0)
    .join(", ");
}

/** シーン1つ分のプロンプトを組み立てる */
function buildScenePrompt(scene: Scene, scenarioTitle: string): AssetPrompt {
  const chapter = scene.chapter?.label ?? scene.id;
  const firstLine = scene.lines.find((l) => (l.text ?? "").length > 0)?.text ?? "";
  const emphasisAll = scene.lines.flatMap((l) => l.emphasis ?? []).slice(0, 3);
  // セリフの冒頭 60 字までを「シーンの空気感」のヒントとして付ける
  const lineHint = firstLine.replace(/\s+/g, " ").slice(0, 60);

  const sceneEn = joinKeywords([
    `scene mood: ${chapter}`,
    emphasisAll.length ? `keywords: ${emphasisAll.join(", ")}` : null,
    lineHint ? `narrative cue: ${lineHint}` : null,
    "center area kept simple to host overlay graphics",
    "bottom area slightly darker for subtitle overlay",
    "left and right lower thirds kept simple to host character standing illustrations",
  ]);

  const promptEn =
    `Background art for an explainer video scene. ` +
    `Series context: "${scenarioTitle}". ` +
    `${sceneEn}. ${BASE_STYLE_EN}. 16:9 aspect ratio, 1920x1080.`;

  const promptMj =
    `${chapter}, ${emphasisAll.join(", ") || "explainer scene"}, ` +
    `anime cinematic background, painterly, soft lighting, ` +
    `no people, no text, dark bottom for subtitle ` +
    `--ar 16:9 --style raw --v 6`;

  return {
    label: `シーン背景: ${scene.id}（${chapter}）`,
    suggestedPath: `image/background/scene_${scene.id}.png`,
    aspect: "16:9",
    resolution: "1920x1080 以上",
    promptEn,
    promptMj,
    note: "1280x720 動画に cover 配置されるため、上下左右ともクロップに耐える構図にしてください。",
  };
}

/** Hook（冒頭5秒）用の背景プロンプト */
function buildHookBackgroundPrompt(scenario: Scenario): AssetPrompt | undefined {
  const hook = scenario.hook;
  if (!hook) return undefined;
  const emphasis = (hook.emphasis ?? []).slice(0, 3).join(", ");
  const promptEn =
    `Breaking-news style hook visual for the first 5 seconds of an explainer video. ` +
    `Series context: "${scenario.title}". Hook copy: "${hook.text}". ` +
    `${emphasis ? `Emphasis keywords: ${emphasis}. ` : ""}` +
    `Dramatic dark red and crimson glow, abstract digital warning patterns, ` +
    `subtle glitch at edges, vignette focusing the center, slightly desaturated. ` +
    `${BASE_STYLE_EN}. Bottom area slightly darker for subtitle. 16:9 aspect ratio, 1920x1080.`;

  const promptMj =
    `breaking news alert background, dark crimson glow, abstract digital warning patterns, ` +
    `${emphasis || "key alert"}, subtle glitch edges, anime cinematic, painterly, ` +
    `no text, no people, dark bottom for subtitle --ar 16:9 --style raw --v 6`;

  return {
    label: "Hook 用背景（冒頭5秒）",
    suggestedPath: "image/background/hook_alert.png",
    aspect: "16:9",
    resolution: "1920x1080 以上",
    promptEn,
    promptMj,
    note:
      "global.defaultBackground に設定すると、Hook 区間（本編行が始まる前）の背景になります。",
  };
}

/** エンドスクリーン用の背景プロンプト */
function buildEndScreenPrompt(scenario: Scenario): AssetPrompt | undefined {
  const es = scenario.global?.endScreen;
  if (!es?.enabled) return undefined;
  const promptEn =
    `Calm end-card background for the closing 6-20 seconds of an explainer video. ` +
    `Series context: "${scenario.title}". ` +
    `Dark navy gradient with soft bokeh particles, subtle radial vignette focusing the center, ` +
    `faint horizontal light streaks suggesting forward motion to the next episode, ` +
    `minimal and elegant, deep navy and indigo tones with a hint of warm orange highlights, ` +
    `no detailed objects. ${BASE_STYLE_EN}. ` +
    `Fully clean center composition to host a 16:9 thumbnail and a CTA button. 16:9 aspect ratio, 1920x1080.`;

  const promptMj =
    `calm dark navy gradient end card, soft bokeh particles, radial vignette center, ` +
    `faint horizontal light streaks, deep navy indigo with warm orange highlights, ` +
    `minimal elegant, anime cinematic, painterly, no people, no text, fully clean center ` +
    `--ar 16:9 --v 6`;

  return {
    label: "エンドスクリーン背景（次回予告・登録誘導）",
    suggestedPath: "image/background/endscreen_dark.png",
    aspect: "16:9",
    resolution: "1920x1080 以上",
    promptEn,
    promptMj,
    note:
      `global.endScreen.nextEpisode.thumbnail にも別の 16:9 画像（次回予告サムネ本体）を用意すると、` +
      `この背景の上に重ねて表示されます。`,
  };
}

/** YouTube サムネ（クリック率最大化用） */
function buildThumbnailPrompt(scenario: Scenario): AssetPrompt {
  const hookText = scenario.hook?.text ?? "";
  const emphasis = (scenario.hook?.emphasis ?? []).slice(0, 3).join(", ");
  const audience = (scenario.youtube?.audience ?? []).slice(0, 2).join(", ");
  const topic = extractTopic(scenario);

  const promptEn =
    `YouTube thumbnail BACKGROUND ART (no text in the image — text will be overlaid manually later). ` +
    `Video title context: "${scenario.title}". ` +
    `${hookText ? `Hook copy reference (do NOT render as text): "${hookText}". ` : ""}` +
    `${emphasis ? `Emotional keywords: ${emphasis}. ` : ""}` +
    `${topic ? `Topic: ${topic}. ` : ""}` +
    `${audience ? `Target audience hint: ${audience}. ` : ""}` +
    `High-impact dramatic background that signals "you must click this". ` +
    `Strong color contrast (red / yellow accents on dark base), bold central focal point, ` +
    `negative space at the right side reserved for overlay text and at the lower-left for a character cutout. ` +
    `${BASE_STYLE_EN}. 16:9 aspect ratio, 1280x720 (or 1920x1080).`;

  const promptMj =
    `youtube thumbnail background, high impact dramatic, ` +
    `${topic || "explainer topic"}, ${emphasis || "key shock"}, ` +
    `red and yellow accents on dark base, bold central focal point, ` +
    `negative space on right for overlay text, anime cinematic, painterly, ` +
    `no text, no people --ar 16:9 --style raw --v 6`;

  return {
    label: "YouTube サムネイル（背景アート）",
    suggestedPath: "image/thumbnail/main_thumbnail.png",
    aspect: "16:9",
    resolution: "1280x720（最低）/ 1920x1080 推奨",
    promptEn,
    promptMj,
    note:
      "サムネ内の文字は AI 生成では崩れがちなので、まず背景アートだけ生成し、" +
      "Photoshop / Affinity / Canva などで以下の文言を後乗せしてください:\n" +
      `        メイン文言: ${hookText || "（hook.text を入れてください）"}\n` +
      `        強調語   : ${emphasis || "（hook.emphasis を入れてください）"}`,
  };
}

/** Shorts 1本ぶんのサムネ（9:16） */
function buildShortsThumbnailPrompt(spec: ShortsSpec, scenario: Scenario): AssetPrompt {
  const caption = spec.overlayCaption ?? "";
  const promptEn =
    `Vertical short video thumbnail BACKGROUND ART for YouTube Shorts. ` +
    `Series context: "${scenario.title}". Short id: "${spec.id}". ` +
    `${caption ? `Top overlay caption (will be added later, do NOT render as text in the image): "${caption}". ` : ""}` +
    `Dramatic vertical background that grabs attention in 0.5 seconds while scrolling. ` +
    `Strong color contrast, central focal point, top 15% and bottom 40% reserved as relatively simple ` +
    `dark areas to host caption and subtitle overlays, middle reserved for a large character standing illustration. ` +
    `${BASE_STYLE_EN}. 9:16 aspect ratio, 1080x1920.`;

  const promptMj =
    `vertical shorts background, ${caption || spec.title}, dramatic high contrast, ` +
    `central focal point, dark top and bottom for captions, anime cinematic, painterly, ` +
    `no text, no people --ar 9:16 --style raw --v 6`;

  return {
    label: `Shorts サムネ: ${spec.id}（${spec.title}）`,
    suggestedPath: `image/thumbnail/shorts_${spec.id}.png`,
    aspect: "9:16",
    resolution: "1080x1920",
    promptEn,
    promptMj,
  };
}

/** すべての画像生成プロンプトを集める */
function buildAllAssetPrompts(scenario: Scenario): AssetPrompt[] {
  const prompts: AssetPrompt[] = [];
  prompts.push(buildThumbnailPrompt(scenario));
  const hookBg = buildHookBackgroundPrompt(scenario);
  if (hookBg) prompts.push(hookBg);
  for (const scene of scenario.scenes) {
    prompts.push(buildScenePrompt(scene, scenario.title));
  }
  const es = buildEndScreenPrompt(scenario);
  if (es) prompts.push(es);
  for (const spec of scenario.shorts ?? []) {
    prompts.push(buildShortsThumbnailPrompt(spec, scenario));
  }
  return prompts;
}

/** プロンプト群をテキストブロックにフォーマット */
function formatAssetPromptsBlock(prompts: AssetPrompt[]): string {
  const out: string[] = [];
  out.push(`画像は ${prompts.length} 点を想定しています。`);
  out.push(
    "各ブロックの「英語プロンプト」を DALL·E 3 / SDXL / Imagen / NovelAI 等にそのまま貼り付け、",
  );
  out.push(
    "「Midjourney 簡略版」を Midjourney v6+ に貼ると、同じ意図で生成できます。",
  );
  out.push("");
  out.push(`▼共通ネガティブプロンプト（必要に応じてコピペ）`);
  out.push(NEGATIVE_PROMPT);
  out.push("");

  for (let i = 0; i < prompts.length; i++) {
    const p = prompts[i];
    out.push("-".repeat(76));
    out.push(`[${i + 1}/${prompts.length}] ${p.label}`);
    out.push(`  推奨ファイル: ${p.suggestedPath}`);
    out.push(`  アスペクト比: ${p.aspect}（${p.resolution}）`);
    if (p.note) {
      out.push(`  メモ: ${p.note}`);
    }
    out.push("");
    out.push("  ▼英語プロンプト（DALL·E / SDXL / Imagen 用）");
    out.push(p.promptEn);
    out.push("");
    out.push("  ▼Midjourney 簡略版");
    out.push(p.promptMj);
    out.push("");
  }
  return out.join("\n");
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
  assetPromptCount: number;
}

export function generateYoutubeMetadata(
  scenario: Scenario,
  options: GenerateMetadataOptions = {},
): GeneratedMetadata {
  const titleCandidates = buildTitleCandidates(scenario);
  const description = buildDescription(scenario);
  const assetPrompts = buildAllAssetPrompts(scenario);

  const { outputDir } = getBasePaths();
  const safeTitle = sanitizeFilenameForWindows(scenario.title || "youtube-metadata");
  const outFile = options.outFile ?? path.join(outputDir, `${safeTitle}-youtube-metadata.txt`);

  const sections: string[] = [];
  sections.push("=".repeat(76));
  sections.push(`【動画】 ${scenario.title}`);
  sections.push(`【生成】 ${new Date().toISOString()}`);
  sections.push("=".repeat(76));
  sections.push("");

  sections.push("=".repeat(76));
  sections.push("【1】YouTube タイトル候補（ベストを 1 つ選んで使用）");
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
  sections.push("【2】概要欄（YouTube 動画説明欄にそのまま貼り付け）");
  sections.push("=".repeat(76));
  sections.push("");
  sections.push(description);
  sections.push("");

  sections.push("=".repeat(76));
  sections.push("【3】ハッシュタグ");
  sections.push("=".repeat(76));
  sections.push((scenario.youtube?.hashtags ?? []).join(" "));
  sections.push("");

  sections.push("=".repeat(76));
  sections.push("【4】画像生成プロンプト（サムネ・各シーン背景・エンドカード・Shorts）");
  sections.push("=".repeat(76));
  sections.push("");
  sections.push(formatAssetPromptsBlock(assetPrompts));

  sections.push("=".repeat(76));
  sections.push("【5】撮影後チェックリスト");
  sections.push("=".repeat(76));
  sections.push("□ 動画タイトルを 60 文字以内に収めたか");
  sections.push("□ 概要欄のチャプター時刻が実音声と±1秒以内で揃っているか");
  sections.push("□ サムネに 4 単語以上の長い文を入れていないか（モバイル可読性）");
  sections.push("□ サムネ右下にキャラ立ち絵カットアウトを置けるよう余白を残したか");
  sections.push("□ エンドカードの次回サムネ画像（16:9）を用意したか");
  sections.push("□ Shorts CTA（末尾2秒）の文言が概要欄誘導と一致しているか");

  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, sections.join("\n"), "utf-8");

  return {
    outFile,
    titleCandidates,
    description,
    assetPromptCount: assetPrompts.length,
  };
}
