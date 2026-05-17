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

type SlideRuntimeMode = "reveal" | "generic-slides";

const CAPTURE_STYLE_ID = "mc-slide-capture-style";

/** Playwright キャプチャ用: ツールバー非表示・動画向けの読みやすい字サイズ・はみ出し時は図を優先縮小 */
const CAPTURE_PREPARE_SCRIPT = `
(function () {
  var STYLE_ID = ${JSON.stringify(CAPTURE_STYLE_ID)};
  if (!document.getElementById(STYLE_ID)) {
    var style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = [
      "body.mc-slide-capture { overflow: hidden !important; }",
      "body.mc-slide-capture html { font-size: 26px !important; }",
      "body.mc-slide-capture .toolbar { display: none !important; }",
      "body.mc-slide-capture .deck { height: 100vh !important; max-height: 100vh !important; }",
      "body.mc-slide-capture .slide {",
      "  display: none !important;",
      "  padding: 0.65rem 2rem 0.5rem !important; max-width: 100% !important; width: 100% !important;",
      "  min-height: 0 !important; max-height: 100vh !important;",
      "  overflow: hidden !important; box-sizing: border-box !important;",
      "}",
      "body.mc-slide-capture .slide.active { display: block !important; }",
      "body.mc-slide-capture .slide.active:not(:has(.diagram)) {",
      "  display: flex !important; flex-direction: column !important; justify-content: center !important;",
      "}",
      "body.mc-slide-capture .diagram { zoom: 1 !important; margin: 0.45rem 0 !important; padding: 0.65rem !important; }",
      "body.mc-slide-capture h1 { font-size: 2rem !important; margin: 0 0 0.4rem !important; line-height: 1.25 !important; }",
      "body.mc-slide-capture h2 { font-size: 1.28rem !important; margin: 0 0 0.6rem !important; line-height: 1.4 !important; }",
      "body.mc-slide-capture .tag { margin-bottom: 0.5rem !important; font-size: 0.85rem !important; }",
      "body.mc-slide-capture .slide.active:not(:has(.diagram)) {",
      "  min-height: 100vh !important; padding-top: 0.75rem !important; padding-bottom: 0.75rem !important;",
      "}",
      "body.mc-slide-capture .bullets { font-size: 1.12rem !important; line-height: 1.55 !important; margin-top: 0.5rem !important; }",
      "body.mc-slide-capture .bullets li { margin: 0.35rem 0 !important; }",
      "body.mc-slide-capture .slide-lead { font-size: 1.05rem !important; line-height: 1.55 !important; }",
      "body.mc-slide-capture .note { font-size: 0.98rem !important; line-height: 1.5 !important; margin-top: 0.5rem !important; }",
      "body.mc-slide-capture .beginner-hint { font-size: 0.95rem !important; padding: 0.55rem 0.75rem !important; }",
      "body.mc-slide-capture .encap-layer { padding: 0.45rem 0.75rem !important; font-size: 0.92rem !important; }",
      "body.mc-slide-capture .flow-step { min-height: 0 !important; padding: 0.45rem !important; font-size: 0.88rem !important; }",
      "body.mc-slide-capture .cmp-table { font-size: 0.88rem !important; }",
      "body.mc-slide-capture .cmp-table th, body.mc-slide-capture .cmp-table td { padding: 0.4rem 0.5rem !important; }",
      "body.mc-slide-capture .rich-box { padding: 0.65rem !important; }",
      "body.mc-slide-capture .box-title { font-size: 1.05rem !important; }",
      "body.mc-slide-capture .box-desc { font-size: 0.95rem !important; }",
      "body.mc-slide-capture .phrase-en-lg { font-size: 1.2rem !important; line-height: 1.35 !important; margin: 0.35rem 0 !important; }",
      "body.mc-slide-capture .jp-mean { font-size: 1rem !important; line-height: 1.5 !important; margin: 0.35rem 0 !important; }",
      "body.mc-slide-capture .word-note { font-size: 0.92rem !important; padding: 0.45rem 0.65rem !important; margin-top: 0.35rem !important; }",
      "body.mc-slide-capture .goal-box { font-size: 0.98rem !important; padding: 0.55rem 0.75rem !important; margin: 0.45rem 0 !important; }",
      "body.mc-slide-capture .sum-stack-lg { gap: 0.45rem !important; margin: 0.45rem 0 !important; }",
      "body.mc-slide-capture .sum-item-lg { padding: 0.5rem 0.65rem !important; gap: 0.55rem !important; }",
      "body.mc-slide-capture .summary-pillar { font-size: 0.95rem !important; }",
      "body.mc-slide-capture .reveal .slides { font-size: 1em !important; }",
      "body.mc-slide-capture .reveal .slides h3 { font-size: 1.35em !important; }",
      "body.mc-slide-capture .reveal .progress, body.mc-slide-capture .reveal .controls,",
      "body.mc-slide-capture .reveal .slide-number { display: none !important; }",
    ].join("\\n");
    document.head.appendChild(style);
  }
  document.body.classList.add("mc-slide-capture");

  var slide =
    document.querySelector(".slide.active") ||
    document.querySelector(".reveal .slides section.present");
  if (!slide) return;

  document.querySelectorAll(".slide").forEach(function (s) {
    s.style.zoom = "1";
    s.style.transform = "none";
    s.style.width = "";
    s.style.marginLeft = "";
    s.querySelectorAll(".diagram").forEach(function (d) { d.style.zoom = "1"; });
  });

  var maxH = window.innerHeight * 0.96;
  var maxW = window.innerWidth * 0.98;

  function overflow() {
    return slide.scrollHeight > maxH || slide.scrollWidth > maxW;
  }

  if (overflow()) {
    slide.querySelectorAll(".diagram").forEach(function (d) {
      var dh = d.scrollHeight;
      var budget = maxH * 0.52;
      if (dh > budget) {
        d.style.zoom = String(Math.max(0.72, budget / dh));
      }
    });
  }

  if (overflow()) {
    var h = slide.scrollHeight;
    var w = slide.scrollWidth;
    var scale = Math.min(maxH / h, maxW / w);
    slide.style.zoom = String(Math.max(0.9, Math.min(1, scale)));
  }
})();
`;

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

    const runtimeMode = await page.waitForFunction(
      () => {
        const w = window as unknown as { Reveal?: RevealWindow["Reveal"] };
        if (w.Reveal) {
          if (typeof w.Reveal.isReady === "function" && !w.Reveal.isReady()) return null;
          return "reveal";
        }
        if (document.querySelectorAll(".slide").length > 0) {
          return "generic-slides";
        }
        return null;
      },
      { timeout: 60_000 },
    );
    const mode = (await runtimeMode.jsonValue()) as SlideRuntimeMode;

    const baseStem = path.basename(fileName, path.extname(fileName)).replace(/[^a-zA-Z0-9._-]+/g, "_");
    for (const hIndex of sortedUnique) {
      if (mode === "reveal") {
        await page.evaluate(
          (idx: number) => {
            const w = window as unknown as RevealWindow;
            w.Reveal.slide(idx, 0);
            w.Reveal.layout();
            w.Reveal.sync();
          },
          hIndex,
        );
      } else {
        await page.evaluate(
          (idx: number) => {
            const slides = Array.from(document.querySelectorAll<HTMLElement>(".slide"));
            if (slides.length === 0) return;
            const clamped = Math.max(0, Math.min(idx, slides.length - 1));
            slides.forEach((s, i) => s.classList.toggle("active", i === clamped));

            const prog = document.getElementById("prog");
            if (prog) prog.textContent = `${clamped + 1} / ${slides.length}`;

            const sceneRef = document.getElementById("scene-ref");
            if (sceneRef) {
              const scene = slides[clamped].getAttribute("data-yaml-scene");
              sceneRef.textContent = scene ? `台本 id: ${scene}` : "";
            }

            const prev = document.getElementById("prev") as HTMLButtonElement | null;
            const next = document.getElementById("next") as HTMLButtonElement | null;
            if (prev) prev.disabled = clamped === 0;
            if (next) next.disabled = clamped === slides.length - 1;

            window.dispatchEvent(new Event("resize"));
          },
          hIndex,
        );
      }
      await page.evaluate(CAPTURE_PREPARE_SCRIPT);
      await new Promise<void>((r) => setTimeout(r, 120));
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
    `[Slides] HTML スライドを ${width}x${height} で ${tasks.length} シーン分キャプチャしました（temp/slide_captures）`,
  );
}
