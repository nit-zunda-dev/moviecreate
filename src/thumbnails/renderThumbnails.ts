import fs from "fs";
import path from "path";
import http from "http";
import { chromium } from "playwright";
import type { Scenario, CharacterSettings } from "../types/scenario";
import { getBasePaths, sanitizeFilenameForWindows } from "../config/paths";
import { DEFAULT_VIDEO_HEIGHT, DEFAULT_VIDEO_WIDTH } from "../config/videoLayout";

export type ThumbnailStyle = "shock" | "howto" | "exam";
export const ALL_STYLES: ThumbnailStyle[] = ["shock", "howto", "exam"];

interface CopySegment {
  text: string;
  emphasized: boolean;
}

interface ResolvedCopy {
  /** プレースホルダ → 値（HTML エンコード済み）の連想配列 */
  placeholders: Record<string, string>;
  /** 立ち絵 PNG の絶対パス（テンプレディレクトリへコピーされる） */
  characterImageAbsPath: string | undefined;
}

const TEMPLATE_DIR = path.resolve(__dirname, "../../templates/thumbnail");

function htmlEscape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * `text` を `emphasis` 群で分割する。長い語が先にマッチするよう降順ソート。
 * EmphasisBurst / HookIntro と同じロジック（依存を増やさないため重複実装）。
 */
function splitByEmphasis(text: string, emphasis: string[]): CopySegment[] {
  const sorted = emphasis.filter((s) => s.length > 0).sort((a, b) => b.length - a.length);
  if (sorted.length === 0) return [{ text, emphasized: false }];
  let segments: CopySegment[] = [{ text, emphasized: false }];
  for (const word of sorted) {
    const next: CopySegment[] = [];
    for (const seg of segments) {
      if (seg.emphasized) {
        next.push(seg);
        continue;
      }
      let cursor = 0;
      let idx = seg.text.indexOf(word);
      while (idx !== -1) {
        if (idx > cursor) next.push({ text: seg.text.slice(cursor, idx), emphasized: false });
        next.push({ text: word, emphasized: true });
        cursor = idx + word.length;
        idx = seg.text.indexOf(word, cursor);
      }
      if (cursor < seg.text.length) next.push({ text: seg.text.slice(cursor), emphasized: false });
    }
    segments = next;
  }
  return segments;
}

/** メインコピーの HTML（複数行になっても1段組みの inline-block）に変換する */
function segmentsToHtml(segments: CopySegment[]): string {
  return segments
    .map((s) =>
      s.emphasized
        ? `<span class="emphasis">${htmlEscape(s.text)}</span>`
        : `<span class="l1">${htmlEscape(s.text)}</span>`,
    )
    .join("");
}

/** title から「第N回」を抽出 */
function extractEpisodeNumber(title: string): number | undefined {
  const m = title.match(/第\s*(\d{1,3})\s*回/);
  return m ? parseInt(m[1], 10) : undefined;
}

/** title / hashtags / hookKeywords から ALL CAPS の略語っぽいトピックを抽出 */
function extractTopic(scenario: Scenario): string | undefined {
  const tags = (scenario.youtube?.hashtags ?? [])
    .map((h) => h.replace(/^#/, ""))
    .filter((s) => /^[A-Z][A-Z0-9]{1,9}$/.test(s));
  if (tags.length > 0) return tags[0];

  const fromTitle = scenario.title.match(/[A-Z][A-Z0-9]{1,9}/);
  if (fromTitle) return fromTitle[0];

  const keywordHit = (scenario.youtube?.hookKeywords ?? []).find((k) => /^[A-Z][A-Z0-9]{1,9}$/.test(k));
  return keywordHit;
}

/** title から「【…】」を抽出してシリーズプレフィックスを取る */
function extractSeriesPrefix(title: string): string | undefined {
  const m = title.match(/【([^】]+)】/);
  return m ? m[1].trim() : undefined;
}

/**
 * Hook の文字数からメインコピーの font-size を概算する。
 * 1280×720 のサムネで「最大2行・各行18〜20文字」を狙う。
 */
function suggestMainFontSize(text: string): number {
  const len = text.length;
  if (len <= 12) return 110;
  if (len <= 18) return 92;
  if (len <= 24) return 78;
  if (len <= 30) return 68;
  return 60;
}

/** 立ち絵のフルパスを解決（face があればそちらを優先） */
function resolveCharacterImage(
  scenario: Scenario,
  charName: string | undefined,
  face: string | undefined,
): string | undefined {
  if (!charName) return undefined;
  const c = scenario.characters?.[charName];
  if (!c?.image) return undefined;
  const baseAbs = path.resolve(c.image);
  if (face) {
    const dir = path.dirname(baseAbs);
    const candidate = path.join(dir, `${face}.png`);
    if (fs.existsSync(candidate)) return candidate;
  }
  return baseAbs;
}

/** characters の中から position が pos のキャラ名を返す（無ければ最初のキャラ） */
function pickCharacterByPosition(
  characters: Record<string, CharacterSettings> | undefined,
  pos: "left" | "right",
): string | undefined {
  if (!characters) return undefined;
  for (const [name, c] of Object.entries(characters)) {
    if (c.position === pos) return name;
  }
  const keys = Object.keys(characters);
  return keys[0];
}

// =============================================================================
// 各スタイルのコピー選定
// =============================================================================

function buildShockCopy(scenario: Scenario): ResolvedCopy {
  const hook = scenario.hook;
  const mainText = hook?.text ?? scenario.title;
  const emphasis = hook?.emphasis ?? [];
  const segments = splitByEmphasis(mainText, emphasis);

  const audience = scenario.youtube?.audience?.[0];
  const seriesPrefix = extractSeriesPrefix(scenario.title);
  const subText = audience ? `${audience} 必見` : seriesPrefix ?? "見てから後悔するな";

  const captionText = scenario.youtube?.hookKeywords?.[0] ?? "速報";
  const badgeText = "BREAKING";

  const charName = hook?.character ?? pickCharacterByPosition(scenario.characters, "left");
  const face = hook?.face ?? "驚き";
  const characterImage = resolveCharacterImage(scenario, charName, face);

  return {
    placeholders: {
      BADGE_TEXT: htmlEscape(badgeText),
      CAPTION_TEXT: htmlEscape(captionText),
      MAIN_HTML: segmentsToHtml(segments),
      MAIN_FONTSIZE: String(suggestMainFontSize(mainText)),
      SUB_TEXT: htmlEscape(subText),
      CHARACTER_IMAGE: "character.png",
    },
    characterImageAbsPath: characterImage,
  };
}

function buildHowtoCopy(scenario: Scenario): ResolvedCopy {
  const topic = extractTopic(scenario);
  const hookText = scenario.hook?.text;
  const seriesPrefix = extractSeriesPrefix(scenario.title);

  // メイン: 「{topic}を5分で解説」 もしくは hook.text のうち先頭分
  let mainText: string;
  let emphasis: string[] = [];
  if (topic) {
    mainText = `${topic}を5分でマスター`;
    emphasis = [topic];
  } else if (hookText) {
    mainText = hookText;
    emphasis = scenario.hook?.emphasis ?? [];
  } else {
    mainText = scenario.title;
  }
  const segments = splitByEmphasis(mainText, emphasis);

  const subText = hookText && topic ? hookText : seriesPrefix ?? "完全解説";
  const banner = "5分で完全攻略";
  const cta = "保存して見返そう";

  const charName = scenario.hook?.character ?? pickCharacterByPosition(scenario.characters, "right");
  const face = scenario.hook?.face ?? "通常";
  const characterImage = resolveCharacterImage(scenario, charName, face);

  return {
    placeholders: {
      BANNER_TEXT: htmlEscape(banner),
      MAIN_HTML: segmentsToHtml(segments),
      MAIN_FONTSIZE: String(suggestMainFontSize(mainText)),
      SUB_TEXT: htmlEscape(subText),
      CTA_TEXT: htmlEscape(cta),
      CHARACTER_IMAGE: "character.png",
    },
    characterImageAbsPath: characterImage,
  };
}

function buildExamCopy(scenario: Scenario): ResolvedCopy {
  const ep = extractEpisodeNumber(scenario.title);
  const seriesPrefix = extractSeriesPrefix(scenario.title);
  // 「登録セキスペ 第16回｜Season2」のような prefix から、
  //  ｜以降と「第N回」「SeasonN」を除去してシリーズ名本体だけ取り出す。
  const seriesNamePart = (seriesPrefix ?? "登録セキスペ")
    .split(/[｜|]/)[0]
    .replace(/第\s*\d+\s*回/g, "")
    .replace(/Season\s*\d+/gi, "")
    .replace(/\s+/g, "")
    .trim() || "登録セキスペ";
  const episodeText = ep ? `${seriesNamePart} 第${ep}回` : seriesNamePart;

  const hookText = scenario.hook?.text ?? "";
  const emphasis = scenario.hook?.emphasis ?? [];
  // メインは hook.text の主要部。「：」より後がある場合は後段を使う。
  const mainText = hookText || scenario.title.replace(/【[^】]+】/g, "").trim();
  const segments = splitByEmphasis(mainText, emphasis);

  const sub = emphasis[0] ? `要点：${emphasis[0]}` : "午後試験で出る";

  const charName = scenario.hook?.character ?? pickCharacterByPosition(scenario.characters, "left");
  const face = scenario.hook?.face ?? "通常";
  const characterImage = resolveCharacterImage(scenario, charName, face);

  return {
    placeholders: {
      EPISODE_TEXT: htmlEscape(episodeText),
      MAIN_HTML: segmentsToHtml(segments),
      MAIN_FONTSIZE: String(suggestMainFontSize(mainText)),
      SUB_TEXT: htmlEscape(sub),
      CHARACTER_IMAGE: "character.png",
    },
    characterImageAbsPath: characterImage,
  };
}

const COPY_BUILDERS: Record<ThumbnailStyle, (s: Scenario) => ResolvedCopy> = {
  shock: buildShockCopy,
  howto: buildHowtoCopy,
  exam: buildExamCopy,
};

// =============================================================================
// レンダリング本体
// =============================================================================

export interface RenderThumbnailsOptions {
  /** 生成するスタイル。未指定なら全スタイル */
  styles?: ThumbnailStyle[];
  /** 出力ディレクトリ。未指定なら output/thumbnails/{title}/ */
  outDir?: string;
  /** 解像度（既定 1280×720） */
  width?: number;
  height?: number;
}

export interface RenderedThumbnail {
  style: ThumbnailStyle;
  pngPath: string;
}

/**
 * `templates/thumbnail/{style}.html` を読み、プレースホルダを置換し、
 * `temp/thumbnails_html/{style}/` に展開、Playwright で 1280×720 を撮影する。
 */
export async function renderThumbnails(
  scenario: Scenario,
  scenarioFilePath: string,
  options: RenderThumbnailsOptions = {},
): Promise<RenderedThumbnail[]> {
  const styles = options.styles ?? ALL_STYLES;
  const width = options.width ?? DEFAULT_VIDEO_WIDTH;
  const height = options.height ?? DEFAULT_VIDEO_HEIGHT;
  const { tempDir, outputDir } = getBasePaths();

  const safeTitle = sanitizeFilenameForWindows(scenario.title || "thumbnail");
  const finalOutDir = options.outDir ?? path.join(outputDir, "thumbnails", safeTitle);
  fs.mkdirSync(finalOutDir, { recursive: true });

  // シナリオの相対パス（characters[].image など）はシナリオファイル基準で解決すべきだが、
  // 既存パイプラインは process.cwd() を使っているため、ここでも合わせる。
  // 念のため scenarioFilePath は将来の拡張用に受け取っておく。
  void scenarioFilePath;

  const browser = await chromium.launch({ headless: true });
  const results: RenderedThumbnail[] = [];

  try {
    const page = await browser.newPage();
    await page.setViewportSize({ width, height });

    for (const style of styles) {
      const tmpStyleDir = path.join(tempDir, "thumbnails_html", style);
      fs.mkdirSync(tmpStyleDir, { recursive: true });

      // 1) テンプレ読み込み
      const templatePath = path.join(TEMPLATE_DIR, `${style}.html`);
      if (!fs.existsSync(templatePath)) {
        throw new Error(`サムネテンプレが見つかりません: ${templatePath}`);
      }
      const templateHtml = fs.readFileSync(templatePath, "utf8");

      // 2) コピー選定
      const copy = COPY_BUILDERS[style](scenario);

      // 3) 立ち絵を tmpStyleDir/character.png にコピー（テンプレと同階層に置く）
      if (copy.characterImageAbsPath && fs.existsSync(copy.characterImageAbsPath)) {
        fs.copyFileSync(copy.characterImageAbsPath, path.join(tmpStyleDir, "character.png"));
      } else {
        // 立ち絵が無い場合は HTML 側で alt が出るだけ
        copy.placeholders.CHARACTER_IMAGE = "";
      }

      // 4) プレースホルダ置換して HTML を書き出し
      let html = templateHtml;
      for (const [key, value] of Object.entries(copy.placeholders)) {
        html = html.split(`{{${key}}}`).join(value);
      }
      // 未置換のプレースホルダは空文字に
      html = html.replace(/\{\{[A-Z_]+\}\}/g, "");
      const indexPath = path.join(tmpStyleDir, "index.html");
      fs.writeFileSync(indexPath, html, "utf8");

      // 5) Playwright で撮影（同階層を doc root にした静的HTTP）
      const { baseUrl, close } = await startStaticFileServer(tmpStyleDir);
      try {
        await page.goto(`${baseUrl}/index.html`, { waitUntil: "load", timeout: 60_000 });
        // フォントロード完了待ち（短めのウェイトで十分）
        await page.evaluate(async () => {
          if (document.fonts && document.fonts.ready) await document.fonts.ready;
        });
        await new Promise<void>((r) => setTimeout(r, 200));

        const outPng = path.join(finalOutDir, `${style}.png`);
        await page.screenshot({ path: outPng, type: "png", fullPage: false, clip: { x: 0, y: 0, width, height } });
        results.push({ style, pngPath: outPng });
      } finally {
        await close();
      }
    }
  } finally {
    await browser.close();
  }

  return results;
}

// captureHtmlSlides.ts の startStaticFileServer と同等。依存を切るためここに複製。
function startStaticFileServer(
  documentRoot: string,
): Promise<{ baseUrl: string; close: () => Promise<void> }> {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      try {
        const pathname = new URL(req.url || "/", "http://127.0.0.1").pathname;
        const decoded = decodeURIComponent(pathname);
        const safe = path.normalize(decoded).replace(/^(\.\.(\/|\\|$))+/, "");
        const resolvedRoot = path.resolve(documentRoot);
        const filePath = path.resolve(path.join(documentRoot, safe));
        const rel = path.relative(resolvedRoot, filePath);
        if (rel.startsWith("..") || path.isAbsolute(rel)) {
          res.writeHead(403);
          res.end("Forbidden");
          return;
        }
        if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
          res.writeHead(404);
          res.end("Not found");
          return;
        }
        const ext = path.extname(filePath).toLowerCase();
        const mime: Record<string, string> = {
          ".html": "text/html; charset=utf-8",
          ".css": "text/css; charset=utf-8",
          ".js": "text/javascript; charset=utf-8",
          ".png": "image/png",
          ".jpg": "image/jpeg",
          ".jpeg": "image/jpeg",
          ".svg": "image/svg+xml",
          ".woff2": "font/woff2",
          ".woff": "font/woff",
        };
        res.setHeader("Content-Type", mime[ext] || "application/octet-stream");
        fs.createReadStream(filePath).pipe(res);
      } catch {
        res.writeHead(500);
        res.end();
      }
    });

    server.listen(0, "127.0.0.1", () => {
      const addr = server.address();
      const port = typeof addr === "object" && addr ? addr.port : 0;
      resolve({
        baseUrl: `http://127.0.0.1:${port}`,
        close: () =>
          new Promise<void>((r, rej) => {
            server.close((err) => (err ? rej(err) : r()));
          }),
      });
    });
    server.on("error", reject);
  });
}
