# 📘 設計書：moviecreate「再生数を伸ばす」拡張プラン v1

> 対象シリーズ: `scenario/zundasecurity/`（情報処理安全確保支援士・全27回構想）
> 起案日: 2026-05-09
> ステータス: Draft（Sprint 1 実装中）

---

## 0. 設計思想（4原則）

1. **後方互換**: 新フィールドはすべて任意。既存16本のYAMLは1文字も変更不要で動作する
2. **疎結合**: `Scenario → VideoManifest → Remotion` の3層分離を維持。新機能は層ごとに独立追加
3. **段階リリース**: 5スプリントで分割。各スプリント単独で「使える」状態にして検証→次へ
4. **企画と実装の双方向リンク**: YAMLに書けることが演出の上限になるので、まず YAML スキーマを正解にする

---

## 1. 背景：なぜ再生数が伸びないか（診断）

### A. 企画・コンテンツ面
- ターゲットが受験者だけ（年間受験者 約2万人）で市場が小さい
- 冒頭の Hook が長く、最初の5秒で離脱を止められていない
- 1話の情報密度が高すぎ（YAML 700行超 = 20分超になりがち）
- 「失敗からの学び」が企画書ほど絵で立っていない（テロップ・SE・カットイン無し）
- シリーズ視聴の導線（カード/エンドスクリーン/プレイリスト誘導）の自動化が無い

### B. システム（moviecreate）面
- 冒頭 Hook 用の演出プリセットが無い（ズーム・赤フラッシュ・大テロップ等）
- BGM/SE トラックの仕組みが無い → 画面が静かで離脱誘発
- テロップ／カットイン強調が無い → 解説スライドだけで視覚的単調
- サムネイル自動量産・A/B 候補生成が無い
- Shorts（60秒切り出し）自動派生が無い
- YouTube メタデータ（タイトルN案・チャプター・概要欄）の自動生成が手書き

### C. 運用面
- サムネ A/B テストをしていない
- 長尺1本だけで、Shorts/切り抜き/X予告などの多チャネル運用なし
- タイトルは1案だけで CTR 検証なし
- 受験以外の層（新人エンジニア／非IT職／親世代）に響く"二段目のフック"が無い

---

## 2. 全体アーキテクチャ

### Before（現状）

```
scenario.yaml ──▶ loader ──▶ Scenario型 ──┐
                                          ├─▶ synthesizeLine ──▶ WAV結合 ──┐
                                          │                                ├─▶ Manifest ──▶ Remotion ──▶ MP4
                                          └─▶ captureHtmlSlides ───────────┘
```

### After（拡張後）

```
scenario.yaml ──▶ loader ──▶ Scenario型(+hook/bgm/se/emphasis/chapters/shorts/youtube)
                                                                ↓
                          ┌── synthesizeLine + lipSync ─▶ WAV結合 ─┐
                          ├── captureHtmlSlides ───────────────────┤
                          ├── bgmPlanner (新)              ────────├─▶ Manifest(拡張)
                          └── sePlanner (新)               ────────┘
                                                                                ↓
                                              ┌──── VideoComposition (拡張)
                            Root.tsx ─────────┼──── ShortsComposition (新: 1080×1920)
                                              └──── ThumbnailComposition (新)

── 周辺ツール（独立 CLI）──
generate-thumbnails    : シナリオ + テンプレ HTML → サムネ N 枚
generate-youtube-meta  : シナリオ → タイトル候補/概要欄/チャプター/タグ
generate-shorts        : シナリオ + shorts ブロック → 縦長 60秒 MP4
lint-retention         : シナリオを静的解析して "伸びにくさ" を警告
```

---

## 3. シナリオYAMLスキーマ拡張（後方互換・全部任意）

### 3.1 動画全体（`global` 拡張）

```yaml
global:
  # === 既存（変更なし）===
  defaultSpeaker: "zundamon"
  voice: { speedScale: 1.2, postPhonemeLength: 0.08 }
  defaultBackground: "./image/background/Movidrill.png"
  videoFrame: "./docs/generate_scene_illustrations/hikei.png"
  slidesHtml: "./s01-ep17-xxx-reveal-slides.html"

  # === 新規（任意）===
  bgm:
    default: "./bgm/calm.mp3"
    volume: 0.15
  endScreen:
    enabled: true
    nextEpisode:
      title: "第18回：CSP徹底攻略"
      thumbnail: "./scenario/zundasecurity/s01-ep18-thumbnail.png"
```

### 3.2 動画冒頭の Hook（最重要・新規ブロック）

```yaml
hook:
  durationMs: 5000
  text: "URLの数字いじっただけで他人の請求書が見えた"
  emphasis: ["数字いじるだけ", "他人の請求書"]
  character: zundamon
  face: "驚き"
  flash:
    color: "#ff2244"
    durationMs: 200
  zoom: { from: 1.0, to: 1.15 }
  shake: true
  bgm: "./bgm/tense_intro.mp3"
  se: "./se/impact.mp3"
  voiceOver:
    character: zundamon
    text: "ログインしてるのに、他人の請求書が見えたのだ……？！"
```

### 3.3 シーン単位（`scenes[]` 拡張）

```yaml
scenes:
  - id: "incident"
    slideIndex: 0
    bgm: "./bgm/tense.mp3"
    chapter:
      label: "事件発生：URLいじりが招く事故"
    lines:
      - type: dialogue
        character: zundamon
        face: "驚き"
        text: "..."
        # ↓ 行レベル新規フィールド
        emphasis: ["他人の請求書"]
        callout:
          text: "🔥 試験頻出"
          style: "exam"     # exam / warn / tip / breaking
          durationMs: 3000
        se: "./se/ding.mp3"
        zoomTo: "self"      # self / both / none
```

### 3.4 Shorts 派生（`shorts[]` 新規ブロック）

```yaml
shorts:
  - id: "short-hook-summary"
    title: "ログインしてるのに他人の請求書"
    durationMs: 55000
    pickScenes: ["incident", "summary"]
    overlayCaption: "あなたのサービス、大丈夫？"
    cta: "本編は概要欄から"
  - id: "short-faq"
    title: "認証と認可、何が違う？"
    pickLines:
      - { sceneId: "concept_authz", from: 0, to: 4 }
```

### 3.5 YouTube メタデータ（`youtube` 新規ブロック）

```yaml
youtube:
  audience: ["受験者", "新人Webエンジニア", "情シス担当", "保護者・非IT職"]
  hookKeywords: ["URL", "他人の請求書", "ログインしてるのに見えた", "IDOR"]
  relatedEpisodes:
    - { ep: 7,  title: "CSRF" }
    - { ep: 13, title: "パストラバーサル" }
    - { ep: 15, title: "XXE" }
  hashtags: ["#情報処理安全確保支援士", "#セキスペ", "#Webセキュリティ", "#ずんだもん"]
  titleHints:
    - { style: "shock" }
    - { style: "howto" }
    - { style: "exam" }
```

---

## 4. TypeScript 型追加（`src/types/scenario.ts`）

```typescript
export interface HookSettings {
  durationMs?: number;
  text: string;
  emphasis?: string[];
  character?: string;
  face?: string;
  flash?: { color: string; durationMs: number };
  zoom?: { from: number; to: number };
  shake?: boolean;
  bgm?: string;
  se?: string;
  voiceOver?: { character: string; text: string };
}

export interface CalloutBadge {
  text: string;
  style?: "exam" | "warn" | "tip" | "breaking";
  durationMs?: number;
}

export interface ChapterMark { label: string; }

export interface BgmTrack { default?: string; volume?: number; }

export interface EndScreenSettings {
  enabled?: boolean;
  nextEpisode?: { title: string; thumbnail?: string };
}

export interface ShortsSpec {
  id: string;
  title: string;
  durationMs?: number;
  pickScenes?: string[];
  pickLines?: { sceneId: string; from: number; to: number }[];
  overlayCaption?: string;
  cta?: string;
}

export interface YoutubeMeta {
  audience?: string[];
  hookKeywords?: string[];
  relatedEpisodes?: { ep: number; title: string }[];
  hashtags?: string[];
  titleHints?: { style: "shock" | "howto" | "exam" }[];
}

// === Line 拡張 ===
export interface Line {
  /* 既存 */
  emphasis?: string[];
  callout?: CalloutBadge;
  se?: string;
  zoomTo?: "self" | "both" | "none";
}

// === Scene 拡張 ===
export interface Scene {
  /* 既存 */
  chapter?: ChapterMark;
}

// === GlobalSettings 拡張 ===
export interface GlobalSettings {
  /* 既存 */
  bgm?: BgmTrack;
  endScreen?: EndScreenSettings;
}

// === Scenario 拡張 ===
export interface Scenario {
  /* 既存 */
  hook?: HookSettings;
  shorts?: ShortsSpec[];
  youtube?: YoutubeMeta;
}
```

---

## 5. VideoManifest 拡張（`src/types/videoManifest.ts`）

```typescript
export interface ManifestHook { /* HookSettings をパス解決済みで保持 */ }
export interface ManifestBgmSegment {
  startMs: number; endMs: number;
  audioFile: string; volume: number;
}
export interface ManifestSeEvent {
  atMs: number; audioFile: string; volume: number;
}
export interface ManifestCallout {
  startMs: number; endMs: number;
  text: string; style: string;
}
export interface ManifestEmphasis {
  startMs: number; endMs: number;
  texts: string[];
}
export interface ManifestChapter { startMs: number; label: string; }

export interface VideoManifest {
  /* 既存 */
  hook?: ManifestHook;
  bgmSegments?: ManifestBgmSegment[];
  seEvents?: ManifestSeEvent[];
  callouts?: ManifestCallout[];
  emphases?: ManifestEmphasis[];
  chapters?: ManifestChapter[];
  endScreen?: { enabled: boolean; nextTitle?: string; nextThumbnail?: string };
}
```

`manifestBuilder.ts` に「Hookブロック展開」「BGMセグメント展開」「SEイベント展開」「Callout/Emphasis展開」「Chapter展開」のロジックを追加。

---

## 6. Remotion 側の新コンポーネント

### 6.1 既存改修

- `remotion/Root.tsx` : 3つの Composition を登録（Video/Shorts/Thumbnail）
- `remotion/VideoComposition.tsx` : Hook/Emphasis/Callout/BGM/SE/EndScreen を合成

### 6.2 新規コンポーネント（`remotion/components/`）

| ファイル | 役割 | 難度 |
|---|---|---|
| `HookIntro.tsx` | 冒頭5秒の演出（フラッシュ・ズーム・シェイク・大テロップ・任意VO） | 中 |
| `EmphasisBurst.tsx` | 行 `emphasis` 語を画面中央に大ドカン表示 | 低 |
| `CalloutBadge.tsx` | 画面右上常駐テロップ（4スタイル） | 低 |
| `BgmTrack.tsx` | `bgmSegments[]` を Audio で並べてクロスフェード | 低 |
| `SeTrack.tsx` | `seEvents[]` を時刻指定再生 | 低 |
| `ChapterLowerThird.tsx` | チャプター切替時の下三分の一バナー | 低 |
| `EndScreen.tsx` | 最終20秒の次回予告＋登録誘導 | 中 |
| `ShortsLayout.tsx` | 1080×1920 縦長 | 中 |
| `ThumbnailLayout.tsx` | 静止画書き出し用 | 中 |

口パクは `src/media/lipSync.ts` 既存ロジック調査のうえ Sprint 5 で本格対応。

---

## 7. 新しい CLI サブコマンド

| コマンド | 入力 | 出力 | 中身 |
|---|---|---|---|
| `generate-thumbnails <yaml>` | シナリオ | `output/thumbnails/{title}/{N}.png` | HTMLテンプレ＋Playwright |
| `generate-youtube-metadata <yaml>` | シナリオ | `output/{title}-youtube-metadata.txt` | テンプレ＋ルール |
| `generate-shorts <yaml>` | シナリオ | `output/shorts/{title}/{shortId}.mp4` | ShortsComposition |
| `lint-retention <yaml>` | シナリオ | コンソール（警告/赤） | 静的解析 |
| `generate-all <yaml>` | シナリオ | 上記すべて | パイプライン一括 |

### `lint-retention` ルール（初版・8項目）

| ルール | 重大度 |
|---|---|
| `hook` 未定義 | 🔴 Error |
| `hook.durationMs > 8000` | 🟡 Warn |
| 1セリフ字幕が80文字超 | 🟡 Warn |
| シーン1個目（incident相当）の総セリフ秒数が15秒超 | 🟡 Warn |
| 総尺見積が15分超 | 🟡 Warn |
| 全行のうち `emphasis`/`callout`/`se` の指定が0件 | 🟡 Warn |
| `youtube.titleHints` 未指定 | 🟢 Info |
| `chapter` ラベルが付いたシーンが3未満 | 🟢 Info |

---

## 8. ファイル/ディレクトリ追加計画

```
moviecreate/
├── src/
│   ├── cli.ts                                  ← 拡張: 4サブコマンド追加
│   ├── types/
│   │   ├── scenario.ts                         ← 拡張
│   │   └── videoManifest.ts                    ← 拡張
│   ├── media/
│   │   ├── manifestBuilder.ts                  ← 拡張
│   │   ├── bgmPlanner.ts                       ★新
│   │   └── sePlanner.ts                        ★新
│   ├── shorts/
│   │   └── deriveShortsManifest.ts             ★新
│   ├── thumbnails/
│   │   └── renderThumbnails.ts                 ★新
│   ├── youtube/
│   │   └── generateMetadata.ts                 ★新
│   └── lint/
│       └── retentionLinter.ts                  ★新
├── remotion/
│   ├── Root.tsx                                ← 拡張
│   ├── VideoComposition.tsx                    ← 拡張
│   ├── ShortsComposition.tsx                   ★新
│   ├── ThumbnailComposition.tsx                ★新
│   └── components/
│       ├── HookIntro.tsx                       ★新
│       ├── EmphasisBurst.tsx                   ★新
│       ├── CalloutBadge.tsx                    ★新
│       ├── BgmTrack.tsx                        ★新
│       ├── SeTrack.tsx                         ★新
│       ├── ChapterLowerThird.tsx               ★新
│       ├── EndScreen.tsx                       ★新
│       ├── ShortsLayout.tsx                    ★新
│       └── ThumbnailLayout.tsx                 ★新
├── templates/
│   ├── thumbnail/{shock,howto,exam}.html       ★新
│   └── youtube/{description.template.txt,title-patterns.json}  ★新
├── bgm/                                         ★新（DOVA-SYNDROME 等から手動DL）
├── se/                                          ★新（効果音ラボ等から手動DL）
└── docs/
    └── improve-plan.md                          ← 本書
```

---

## 9. スプリント計画

### 🚀 Sprint 1 — Hook + Emphasis + Lint（**最優先**・効果最大）

| # | 作業 |
|---|---|
| 1.1 | `Scenario` 型に `hook` / `Line.emphasis` / `Line.callout` / `Line.se` / `Line.zoomTo` 追加 |
| 1.2 | `VideoManifest` 型に `hook` / `emphases` / `callouts` 追加 |
| 1.3 | `manifestBuilder` に Hook 展開 + emphases/callouts 配列構築 |
| 1.4 | 本編音声を `hook.durationMs` だけ後ろへずらす Audio オフセット対応 |
| 1.5 | `HookIntro.tsx` / `EmphasisBurst.tsx` / `CalloutBadge.tsx` 実装 |
| 1.6 | `VideoComposition.tsx` に合成 |
| 1.7 | `Root.tsx` の duration 計算に Hook 加算 |
| 1.8 | `lint-retention` サブコマンド + 8ルール |
| 1.9 | デモ YAML（`scenario/zundasecurity/_demo-hook.yaml`）で動作確認 |
| 1.10 | README に hook/emphasis/callout 書き方追記 |

### 🎬 Sprint 2 — YouTubeメタデータ自動生成（サムネ自動量産は不採用）

> **更新（2026-05-09）**: サムネ自動量産はユーザー判断により**不採用**（手動作成方針）。
> `generate-youtube-metadata`（タイトル候補・概要欄・チャプター・ハッシュタグ）のみ実装済み。
> 旧サムネ実装（`templates/thumbnail/`、`src/thumbnails/`、`generate-thumbnails` CLI）は削除済み。

### 🔊 Sprint 3 — BGM + SE トラック ✅ 完了（2026-05-09）

実装内容:

- **型**: `ManifestBgmSegment` / `ManifestSeEvent` を `videoManifest.ts` に追加
- **planner**: `src/media/bgmPlanner.ts`（区間統合＋クロスフェード＋音量自動）／ `src/media/sePlanner.ts`（時刻昇順イベント化）
- **manifestBuilder**: `global.bgm.default` / `Scene.bgm` / `hook.bgm` を統合し、`hook.se` と `Line.se` を時刻イベント化
- **renderVideo**: BGM/SE 音源も publicDir にコピー（絶対パス→相対パス）
- **Remotion**: `BgmTrack.tsx`（fadeIn/fadeOut 計算付き）／ `SeTrack.tsx` を追加。両 Composition に組み込み
- **アセット**: `bgm/` `se/` ディレクトリと `docs/audio-assets.md`（推奨フリー素材5サイト＋命名規約＋音量目安）
- **lint-retention**: R009（BGM 未指定 warn）／R010（Hook に SE 無し info）／R011（BGM 拡張子怪しい warn）を追加
- **README**: 「BGM / SE トラック」セクション追記
- **デモ**: `_demo-hook.yaml` に BGM/SE のコメント例を追記（素材を置けば即動く）

音量バランス（既定）:

| トラック | 音量 |
|---|---|
| VOICEVOX | 1.00 |
| BGM 通常 | 0.15 |
| BGM Hook | 0.35 |
| SE | 0.70 |

### 📱 Sprint 4 — Shorts 派生

### ✨ Sprint 5 — Chapter / EndScreen / 微モーション / 口パク

---

## 10. リスクと対策

| リスク | 対策 |
|---|---|
| Hook を入れると既存16本の冒頭から続いて2回掴みになる | 既存YAMLは `hook` 未指定なので影響ゼロ。新作から運用＋手選びで遡及差し替え |
| BGM/SE の音源ライセンス | DOVA-SYNDROME / 効果音ラボ等のフリー素材を `bgm/` `se/` に配置（README にライセンス表記） |
| Playwright 撮影が遅い | 並列化＋キャッシュ。Sprint 2 中に検証 |
| Shorts 縦長は構図設計が別物 | `ShortsLayout` 専用テンプレを最初から作る |
| TypeScript 型の破壊的変更 | すべて `?:`（任意）で追加 |
| 完走ペースを崩したくない | 新作から hook 義務化、既存は Sprint 2 のサムネ＋メタ差し替えだけで救済 |

---

## 11. 受け入れ基準（Definition of Done）

- **Sprint 1**: デモ YAML で冒頭5秒に Hook 演出が入り、字幕中の指定語が中央大テロップ表示される。`lint-retention` が hook 無しのYAMLに赤エラー。**既存16本の動画生成出力が完全に同じ**
- **Sprint 2**: 1コマンドで5種類のサムネPNGとYouTubeメタデータtxtが出力される
- **Sprint 3**: シーンごとに BGM が切り替わり、行ごとの SE が音声と同期
- **Sprint 4**: 1本の本編 YAML から `generate-shorts` で 1080×1920 縦長 MP4 が複数本出る
- **Sprint 5**: チャプターバナー＋エンドスクリーン＋立ち絵微モーションが合成される
