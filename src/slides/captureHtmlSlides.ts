import http from "http";
import fs from "fs";
import path from "path";
import type { Page } from "playwright";
import { chromium } from "playwright";
import type { Scenario } from "../types/scenario";
import { getBasePaths } from "../config/paths";
import { DEFAULT_VIDEO_HEIGHT, DEFAULT_VIDEO_WIDTH } from "../config/videoLayout";

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
          ".mjs": "text/javascript; charset=utf-8",
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

type RevealWindow = {
  Reveal: {
    isReady?: () => boolean;
    slide: (h: number, v: number) => void;
    layout: () => void;
    sync: () => void;
  };
};

/**
 * 同一 HTML 内の複数スライド index をまとめてキャプチャ（同一ファイルはサーバ1回）
 */
export async function captureRevealSlides(
  page: Page,
  htmlFilePath: string,
  horizontalIndices: number[],
  width: number,
  height: number,
  outputDir: string,
): Promise<Map<number, string>> {
  const abs = path.resolve(htmlFilePath);
  const documentRoot = path.dirname(abs);
  const fileName = path.basename(abs);
  const sortedUnique = [...new Set(horizontalIndices)].sort((a, b) => a - b);
  if (sortedUnique.length === 0) {
    return new Map();
  }

  const { baseUrl, close } = await startStaticFileServer(documentRoot);
  const result = new Map<number, string>();

  try {
    const pageUrl = `${baseUrl}/${encodeURI(fileName)}`;
    await page.setViewportSize({ width, height });
    await page.goto(pageUrl, { waitUntil: "load", timeout: 120_000 });

    await page.waitForFunction(
      () => {
        const w = window as unknown as { Reveal?: RevealWindow["Reveal"] };
        if (!w.Reveal) return false;
        if (typeof w.Reveal.isReady === "function" && !w.Reveal.isReady()) return false;
        return true;
      },
      { timeout: 60_000 },
    );

    const baseStem = path.basename(fileName, path.extname(fileName)).replace(/[^a-zA-Z0-9._-]+/g, "_");
    for (const hIndex of sortedUnique) {
      await page.evaluate(
        (idx: number) => {
          const w = window as unknown as RevealWindow;
          w.Reveal.slide(idx, 0);
          w.Reveal.layout();
          w.Reveal.sync();
        },
        hIndex,
      );
      await new Promise<void>((r) => setTimeout(r, 450));
      const outName = `slidecap_${baseStem}_${hIndex}.png`;
      const outPath = path.join(outputDir, outName);
      await page.screenshot({ path: outPath, type: "png", fullPage: false });
      result.set(hIndex, outPath);
    }
  } finally {
    await close();
  }

  return result;
}

/**
 * シナリオ内の `slideIndex` 指定シーン用に、Reveal.js の HTML から 1280x720 PNG を生成し
 * 該当 `scene.background` に絶対パスを書き込む（上書き）。
 * `slideIndex` が未設定のシーンは変更しない。
 */
export async function applyHtmlSlideBackgrounds(
  scenario: Scenario,
  scenarioFilePath: string,
): Promise<void> {
  const scenarioDir = path.dirname(path.resolve(scenarioFilePath));
  const width = scenario.output?.width ?? DEFAULT_VIDEO_WIDTH;
  const height = scenario.output?.height ?? DEFAULT_VIDEO_HEIGHT;

  type Task = { sceneIndex: number; htmlPath: string; slideIndex: number };
  const tasks: Task[] = [];

  for (let i = 0; i < scenario.scenes.length; i++) {
    const scene = scenario.scenes[i];
    if (scene.slideIndex == null) continue;
    const htmlRef = scene.slidesHtml ?? scenario.global?.slidesHtml;
    if (!htmlRef) {
      throw new Error(
        `[${scene.id}] slideIndex が指定されていますが、global.slidesHtml または scene.slidesHtml がありません。`,
      );
    }
    const htmlPath = path.isAbsolute(htmlRef) ? htmlRef : path.resolve(scenarioDir, htmlRef);
    if (!fs.existsSync(htmlPath)) {
      throw new Error(`HTML スライドが見つかりません: ${htmlPath}`);
    }
    tasks.push({ sceneIndex: i, htmlPath, slideIndex: scene.slideIndex });
  }

  if (tasks.length === 0) return;

  const { tempDir } = getBasePaths();
  const outDir = path.join(tempDir, "slide_captures");
  fs.mkdirSync(outDir, { recursive: true });

  const byFile = new Map<string, { indices: number[]; sceneByIndex: Map<number, number[]> }>();
  for (const t of tasks) {
    const key = t.htmlPath;
    if (!byFile.has(key)) {
      byFile.set(key, { indices: [], sceneByIndex: new Map() });
    }
    const g = byFile.get(key)!;
    g.indices.push(t.slideIndex);
    if (!g.sceneByIndex.has(t.slideIndex)) g.sceneByIndex.set(t.slideIndex, []);
    g.sceneByIndex.get(t.slideIndex)!.push(t.sceneIndex);
  }

  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    for (const [htmlPath, { indices, sceneByIndex }] of byFile) {
      const capMap = await captureRevealSlides(page, htmlPath, indices, width, height, outDir);
      for (const [hIdx, absPath] of capMap) {
        const scIdxs = sceneByIndex.get(hIdx);
        if (!scIdxs) continue;
        for (const si of scIdxs) {
          scenario.scenes[si].background = absPath;
        }
      }
    }
  } finally {
    await browser.close();
  }

  console.log(
    `[Slides] Reveal スライドを ${width}x${height} で ${tasks.length} シーン分キャプチャしました（temp/slide_captures）`,
  );
}
