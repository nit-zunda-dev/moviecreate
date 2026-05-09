# moviecreate

VOICEVOX エンジンとシナリオ YAML から、キャラクター立ち絵・字幕・音声入りの **MP4 動画** を自動生成する CLI ツールです。

```
シナリオ YAML → 音声合成（VOICEVOX）→ WAV 結合 → マニフェスト生成 → Remotion で MP4 出力
```

---

## 必要な環境

| ソフトウェア | 用途 |
|------------|------|
| Node.js 18 以上 | 実行環境 |
| [VOICEVOX](https://voicevox.hiroshiba.jp/) エンジン | 音声合成 API（`http://localhost:50021` で起動） |
| [Playwright](https://playwright.dev/)（Chromium） | HTML スライドのキャプチャ（`global.slidesHtml` / `slideIndex` を使う `generate-video` 時） |

> **初回のみ**: `generate-video` 実行時に Remotion が Chrome Headless Shell を自動ダウンロードします（約 110 MB）。  
> **HTML スライドを使う場合（初回のみ）**: リポジトリ直下で `npx playwright install chromium` を実行し、Chromium バイナリを取得してください。


---

## インストール・ビルド

```bash
git clone <repo>
cd moviecreate
npm install
npx playwright install chromium   # HTML スライドを背景に使う generate-video 向け（任意・初回）
npm run build
```

---

## クイックスタート

### 音声だけ生成する

```bash
# VOICEVOX エンジンを起動してから
node dist/cli.js generate-audio scenario/sample.yaml
# → output/sample-all-features.wav
```

### 動画（MP4）を生成する

```bash
node dist/cli.js generate-video scenario/test-video.yaml
# → output/テスト動画.mp4
```

### 透過動画（ProRes 4444）を生成する

```bash
node dist/cli.js generate-video scenario/test-video.yaml --transparent
# → output/テスト動画.mov  ← アルファチャンネル付き、動画編集ソフトで重ねて使える
```

---

## シナリオ YAML の書き方

シナリオは 1 つの YAML ファイルで完結します。最小構成から順に説明します。

### 最小構成

```yaml
title: "はじめての動画"

characters:
  zundamon:
    speakerId: 3                        # ずんだもん・ノーマル
    image: "./image/zundamon.png"       # 立ち絵 PNG（透過推奨）

scenes:
  - id: "scene1"
    lines:
      - type: dialogue
        character: zundamon
        text: "こんにちは！ずんだもんなのだ！"
```

実行すると以下が生成されます。

```
output/はじめての動画.wav   ← 音声のみ（generate-audio）
output/はじめての動画.mp4   ← 動画（generate-video）
```

---

### キャラクターの設定（characters）

```yaml
characters:
  metan:
    speakerId: 2          # VOICEVOX のスタイルID（list-speakers で確認）
    image: "./image/metan.png"
    position: left        # 画面上の位置: left / right / center
    subtitleColor: "#FF88BB"  # 字幕の色（CSS カラー）

  zundamon:
    speakerId: 3
    image: "./image/zundamon.png"
    position: right
    subtitleColor: "#88DD44"
    voice:                # このキャラのデフォルト音声パラメータ
      speedScale: 1.1
      intonationScale: 1.2
```

| フィールド | 必須 | 説明 |
|-----------|------|------|
| `speakerId` | ✅ | VOICEVOX のスタイルID。`list-speakers` コマンドで確認できる |
| `image` | | 立ち絵の PNG ファイルパス（透過 PNG 推奨） |
| `position` | | 画面内の位置。`left` / `right` / `center`。省略時は登録順に左→右と自動割り当て |
| `subtitleColor` | | 字幕テキストの色。省略時はデフォルトパレット（1番目: ピンク, 2番目: 緑）から自動割り当て |
| `voice` | | このキャラ共通の音声パラメータ（後述） |

#### 用意済みキャラクター画像

`image/zundamon/` と `image/metan/` に表情別の透過 PNG が収録されています。

| 表情名 | 説明 |
|--------|------|
| `通常` | デフォルト表情 |
| `喜び` | にっこり・嬉しそう |
| `笑い` | 目を閉じて笑う |
| `怒り` | ジト目・ムスッとした表情 |
| `悲しみ` | 困り眉・下向き目 |
| `驚き` | 目を見開いて驚く |
| `照れ` | 頬を赤らめた表情 |
| `困り` | 眉を寄せて困惑 |

**使用例:**

```yaml
characters:
  zundamon:
    speakerId: 3
    image: "./image/zundamon/通常.png"
    position: right
    subtitleColor: "#88DD44"
  metan:
    speakerId: 2
    image: "./image/metan/通常.png"
    position: left
    subtitleColor: "#FF88BB"
```

> **表情の再生成**: `python extract_expressions.py` を実行すると PSD から全表情を再生成できます。

#### position の並び

2 キャラの場合：`left`（左） と `right`（右）に自動配置されます。立ち絵は**常に両方表示**され、発話中のキャラがフルの明るさ、非発話のキャラは少し暗くなります。

```
┌────────────────────────────────────┐
│  [metan]               [zundamon]  │  ← 常に両者表示
│   left                   right    │
│          [字幕テキスト]            │  ← 発話キャラの色で表示
└────────────────────────────────────┘
```

---

### 全体設定（global）

```yaml
global:
  defaultSpeaker: "zundamon"  # character/speaker 未指定時のデフォルト話者
  defaultBackground: "./image/bg.png"  # 背景画像（省略時は単色 #1a1a2e）
  # videoFrame: "./docs/generate_scene_illustrations/hikei.png"  # 教室フレーム（任意・下記参照）
  # slidesHtml: "./slides/my-study-slides.html"  # 任意。下記「HTMLスライド背景」と併用
  voice:
    speedScale: 1.1           # 全キャラ共通のデフォルト話速
    intonationScale: 1.0
```

#### 教室フレーム（`global.videoFrame`）

講義向けの **1枚の背景イラスト**（黒板と左右の黒地など）を指定すると、従来の「左右20%＋中央スライド＋下帯字幕」とは別の **教室レイアウト** になります。

- **全面**: `videoFrame` の画像（`object-fit: cover`）
- **上段の黒板エリア**: Reveal キャプチャや `defaultBackground`／行ごとの `background`（中央の「スライド」相当）
- **下段の黒板エリア**: 字幕（キャラ色＋影付きで黒板の上にのせる想定）
- **左の黒地**: `position: left` のキャラ（通常はずんだもん）／**右の黒地**: `position: right` のキャラ（通常はめたん）

`slideIndex` 付きシーンの PNG 背景や、スライド無しのシーンの `defaultBackground` は、いずれも **上段矩形の内側**に収めて表示します。座標・サイズの比率は `src/config/videoLayout.ts` の **`CLASSROOM_FRAME_LAYOUT`** で調整します（1280×720 基準の 0〜1）。

`--transparent` 指定時は、教室レイアウトは使わず従来の透過用レイアウトです。

---

### HTML スライド（Reveal）を背景に使う

`global.videoFrame` **未指定**のとき、`generate-video` では **Reveal** のスライドを **中央列**に `object-fit: contain` で表示し、**左右列**に立ち絵、**下段**に字幕、という **縦方向 flex** です。下段の字幕は **`SUBTITLE_BLOCK_HEIGHT_RATIO`（既定で約3行分）**で高さ**固定**し、上段（スライド＋立ち絵）の高さを**常に同じ**にしています。長い字幕は `SUBTITLE_MAX_LINES` 行相当で打ち切り（はみ出し隠し）。行数・ブロック高さは `src/config/videoLayout.ts` で調整できます。立ち絵列は `TACHIE_SIDE_WIDTH_RATIO` 等。

- **手順**（1）`global.slidesHtml` に HTML パス、または各シーンで `scenes[].slidesHtml` で HTML を指定（**シナリオ YAML ファイルを基準にした相対パス**が使えます）。（2）背景にしたいスライドの **横方向インデックス**（0 始まり）を `scenes[].slideIndex` に指定。
- 該当シーンに **`slideIndex` があると `scene.background` の静的画像は使われず、キャプチャ画像で上書き**されます。HTML を使わないシーンは従来どおり `background` または `defaultBackground` です。
- 通常の MP4（非 `--transparent`）は上記の**上下分割**です。`--transparent` では従来どおり、背景なし＋全画面下寄せの立ち絵・字幕向けのレイアウトです。
- HTML は **`window.Reveal` が使える**こと（`Reveal.slide(horizontal, 0)` で切替）を前提にしています。社内の `*-study-slides.html`（Reveal 4 系＋ CDN）のような構成がそのまま使えます。

```yaml
global:
  slidesHtml: "./api_design_workshop_slides/video-streaming-study-slides.html"

scenes:
  - id: "slide1"
    slideIndex: 0
    lines:
      - type: dialogue
        character: zundamon
        text: "表紙の説明なのだ！"
  - id: "slide2"
    slideIndex: 1
    lines: ...
```

**1 シーン内でセリフごとに背景だけ変えたい**場合は、行に `background`（画像パス。実行ディレクトリ基準の相対パス可）を書くと、**シーンの背景より優先**されます（手動の PNG 差し替え向け）。

---

### 出力設定（output）

```yaml
output:
  file: "./output/my-video.wav"   # generate-audio の出力先（省略時は title から自動決定）
  width: 1280                     # 解像度（既定: 1280×720）
  height: 720
  fps: 30                         # フレームレート（既定: 30）
```

---

### シーン（scenes）

シナリオは複数のシーンで構成されます。シーンごとに背景やセリフを変えられます。

```yaml
scenes:
  - id: "scene1"                  # 必須。一時ファイルの名前にも使われる
    lines:
      - type: dialogue
        character: metan
        text: "最初のセリフよ。"
      - type: dialogue
        character: zundamon
        text: "次のセリフなのだ！"

  - id: "scene2"
    lines:
      - type: dialogue
        character: metan
        text: "シーン2に入ったわ。"
```

---

### セリフ（lines）

```yaml
lines:
  - type: dialogue          # dialogue / narration / subtitle_only
    character: zundamon     # characters で定義したキャラ名
    text: "読み上げるテキスト"
    subtitle: "字幕として表示するテキスト（省略時は text と同じ）"
    voice:                  # この行だけ音声パラメータを上書き
      speedScale: 0.9
      prePhonemeLength: 0.3
```

| フィールド | 説明 |
|-----------|------|
| `type` | `dialogue`：通常の発話。`narration`：ナレーション（音声は dialogue と同じ）。`subtitle_only`：音声なし（字幕だけ、text 不要） |
| `character` | `characters` に定義したキャラ名。そのキャラの speakerId と立ち絵を使う |
| `text` | 読み上げるテキスト。空欄の行は音声出力されない |
| `voice` | この行だけに適用する音声パラメータ（後述） |
| `background` | 任意。行単位の背景画像パス。指定時はその行ではシーンの `background` より優先 |

---

### 音声パラメータ（voice）

`global.voice` → `characters.*.voice` → `lines[].voice` の順で上書きされます（後ろが優先）。

```yaml
voice:
  speedScale: 1.0        # 話速（標準: 1.0）大きいほど速い
  pitchScale: 0.0        # 音高（標準: 0.0）正で高く、負で低く
  intonationScale: 1.0   # 抑揚（標準: 1.0）大きいほど抑揚が強い
  volumeScale: 1.0       # 音量（標準: 1.0）
  pauseLengthScale: 1.0  # 間の長さの倍率（標準: 1.0）
  prePhonemeLength: 0.1  # 音声前の無音（秒）
  postPhonemeLength: 0.1 # 音声後の無音（秒）
```

**会話のテンポを速くしたい場合:**

```yaml
global:
  voice:
    speedScale: 1.3
    postPhonemeLength: 0.05  # セリフ間の間を短く
```

**特定のセリフを強調したい場合:**

```yaml
- type: dialogue
  character: metan
  text: "これが重要なポイントよ！"
  voice:
    intonationScale: 1.5    # 抑揚を強める
    speedScale: 0.9         # 少しゆっくり
    prePhonemeLength: 0.4   # 前に間を置く
```

---

### 視聴維持率を上げる演出（hook / emphasis / callout）

YouTube は「最初の 5〜10 秒で視聴者が離脱しない」かどうかが再生数を大きく左右します。本ツールには次の 3 種類の演出ブロックがあり、台本側に書くだけで自動で動画に反映されます。**すべて任意・後方互換**で、未指定の既存シナリオは何も変わりません。

#### 1. `hook`（動画冒頭の強制つかみ・1動画につき1つ）

シナリオルートに 1 つだけ書ける、冒頭 5 秒に強制挿入される演出ブロック。

```yaml
hook:
  durationMs: 5000                  # 既定 5000ms（推奨 4000〜7000）
  text: "URLの数字いじるだけで他人の請求書が見えた"  # 大テロップで叩き付ける結論
  emphasis:                         # text の中で特に強調する語句（赤バッジ＋黄文字）
    - "数字いじるだけ"
    - "他人の請求書"
  character: zundamon               # 中央に大きく出す立ち絵のキャラ名
  face: "驚き"                      # 表情（character の image と同じフォルダの 表情.png）
  flash:                            # 0.1〜0.3秒の全画面フラッシュ
    color: "#ff2244"
    durationMs: 250
  zoom: { from: 1.0, to: 1.18 }     # 立ち絵をジワッとズームイン
  shake: true                       # 先頭 0.5秒だけ画面シェイク
```

**挙動**: 動画は冒頭 `hook.durationMs` ぶん HookIntro で占有され、本編音声と本編シーンはすべてその後ろにずれて再生されます。

> **注意**: `hook.bgm` `hook.se` `hook.voiceOver` は型として受け付けますが配線は Sprint 3 で実装予定。Sprint 1 時点はビジュアル演出のみ反映。

#### 2. `Line.emphasis`（行ごとの中央大ドカン）

セリフ内のキーワードを画面中央に巨大テロップで叩き付けます。複数指定すると、その行の発話時間内で順送り表示されます。

```yaml
- type: dialogue
  character: metan
  text: "サーバが『そのデータを見ていいか』を毎回確認していないパターンよ。"
  emphasis: ["毎回確認していない"]
```

#### 3. `Line.callout`（画面右上の常駐テロップ・4スタイル）

行の発話と同期して、画面右上にバッジを表示します。

```yaml
- type: dialogue
  character: zundamon
  text: "URLの数字を変えたら、他人の請求書が見えたのだ……！"
  callout:
    text: "🔥 試験頻出"
    style: "exam"        # exam / warn / tip / breaking
    durationMs: 3000     # 省略時はその行の発話時間と同じ
```

| `style` | 色 | 用途 |
|---------|----|------|
| `exam` | 赤背景＋黄文字 | 試験頻出・重要ポイント |
| `warn` | オレンジ背景 | 注意・落とし穴 |
| `tip` | 水色背景 | 豆知識・補足 |
| `breaking` | 黒背景＋赤文字 | 速報・衝撃 |

#### 4. `Scene.chapter`（YouTube 概要欄チャプター）

各シーンに付けると、Sprint 5 で実装予定の下三分の一バナー＋ Sprint 2 の YouTube 概要欄タイムスタンプ自動生成に使われます。

```yaml
scenes:
  - id: "incident"
    chapter:
      label: "事件発生：URLいじりが招く事故"
    lines: [...]
```

#### 完全なサンプル

`scenario/zundasecurity/_demo-hook.yaml` を参照してください。動作確認は次の 2 コマンド：

```bash
node dist/cli.js lint-retention scenario/zundasecurity/_demo-hook.yaml
node dist/cli.js generate-video scenario/zundasecurity/_demo-hook.yaml
```

---

### 完成形サンプル（2 キャラ会話）

```yaml
title: "ずんだもんとめたんの会話"

characters:
  metan:
    speakerId: 2
    image: "./image/metan.png"
    position: left
    subtitleColor: "#FF88BB"
    voice:
      speedScale: 1.0
      pitchScale: 0.02

  zundamon:
    speakerId: 3
    image: "./image/zundamon.png"
    position: right
    subtitleColor: "#88DD44"
    voice:
      speedScale: 1.1
      intonationScale: 1.2

global:
  defaultBackground: "./image/background.png"
  voice:
    postPhonemeLength: 0.08   # セリフ間の間を短めに

output:
  fps: 30
  width: 1280
  height: 720

scenes:
  - id: "intro"
    lines:
      - type: dialogue
        character: metan
        text: "ねえ、ずんだもん。今日は何の話をするの？"
      - type: dialogue
        character: zundamon
        text: "今日はずんだもちの作り方を解説するのだ！"
      - type: dialogue
        character: metan
        text: "それは楽しみね。"
      - type: dialogue
        character: zundamon
        text: "まず、えだまめを茹でるのだ！"
```

---

## 動画のレイアウト

```
1280 × 720 px（既定）

┌─────────────────────────────────────────────────┐ 720px
│  背景画像または単色（#1a1a2e）                      │
│                                                  │
│                                                  │
│                                                  │
│  ┌──────┐                       ┌──────┐         │ ← 立ち絵上端
│  │metan │                       │zunda │         │   高さ: 30%（216px）
│  │      │   ┌─────────────┐    │      │         │ ← 立ち絵中央（字幕位置）
│  │      │   │ 字幕テキスト │    │      │         │
│  └──────┘   └─────────────┘    └──────┘         │ ← 立ち絵下端（bottom: 88px）
└─────────────────────────────────────────────────┘   0px
```

- 発話中のキャラ: opacity 100%
- 非発話のキャラ: opacity 45%（少し暗くなる）
- 字幕の位置: 立ち絵の中央付近（立ち絵下端 + 立ち絵高さ × 50%）
- 字幕の色: キャラごとの `subtitleColor` で指定した色

---

## CLI コマンド一覧

### generate-video（動画生成）

```bash
node dist/cli.js generate-video <scenario.yaml> [options]
```

| オプション | 説明 |
|-----------|------|
| `--out <path>` | 出力ファイルパス。省略時は `output/{title}.mp4`（透過時は `.mov`） |
| `--transparent` | 透過レンダリング。ProRes 4444 形式の `.mov` を出力。動画編集ソフトで背景なしのオーバーレイとして使える |
| `--dry-run` | 音声生成・レンダリングは行わず、シナリオ読み込みのみ確認する |

### generate-audio（音声のみ）

```bash
node dist/cli.js generate-audio <scenario.yaml> [options]
```

| オプション | 説明 |
|-----------|------|
| `--out <path>` | 出力 WAV ファイルパス |
| `--dry-run` | シナリオの読み込みのみ（音声生成なし） |

### list-speakers（話者一覧）

```bash
node dist/cli.js list-speakers
```

接続中の VOICEVOX エンジンで利用できる話者とスタイルID を表示します。

### generate-thumbnails（YouTube サムネ自動量産・3スタイル）

```bash
node dist/cli.js generate-thumbnails <scenario.yaml> [options]
```

`templates/thumbnail/{shock,howto,exam}.html` を読み、シナリオの `hook` / `youtube` / `characters` から自動でコピーと立ち絵を選び、**1280×720 PNG を 3 枚一括出力**します。出力先は既定で `output/thumbnails/{title}/`。**YouTube 公式の「サムネイルテスト」（A/B）に 3 案そのまま投入**できます。

| オプション | 説明 |
|-----------|------|
| `--styles <list>` | 生成スタイルをカンマ区切りで指定（`shock,howto,exam`）。既定は全部 |
| `--out-dir <path>` | 出力ディレクトリ（既定: `output/thumbnails/{title}/`） |

3 スタイルの方向性：

| スタイル | 主な訴求 | 主な視聴者層 |
|---------|----------|--------------|
| `shock` | 赤背景＋「衝撃ワード」叩き付け | 一般・新人エンジニア（CTR最大） |
| `howto` | 青背景＋「5分で完全攻略」 | ハウツー検索流入 |
| `exam` | 黒板背景＋「試験頻出」スタンプ | 受験者（既存ファン保持） |

> **初回のみ**: Chromium が必要なので `npx playwright install chromium` を実行してください。

### generate-youtube-metadata（タイトル候補・概要欄・チャプター自動生成）

```bash
node dist/cli.js generate-youtube-metadata <scenario.yaml> [--out <path>]
```

シナリオから次の 4 種類を自動生成し、`output/{title}-youtube-metadata.txt` 1 ファイルにまとめます：

1. **タイトル候補3案**（`shock` / `howto` / `exam` の3スタイル、文字数チェック付き）
2. **概要欄**（フック→対象→わかること→チャプター→関連回→CTA→ハッシュタグ）
3. **チャプタータイムスタンプ**（`hook.durationMs` と各シーンの推定秒から自動算出）
4. **ハッシュタグ**（`youtube.hashtags` から）

> ※チャプター時刻は台本文字数からの**推定値**です。実音声に合わせて手動調整してください（`generate-video` の後にもう一度回すと、実音声から再計算する将来バージョンも検討中）。

### lint-retention（視聴維持率リスクの静的解析）

```bash
node dist/cli.js lint-retention <scenario.yaml> [--strict]
```

「YouTube の再生数を伸ばすために台本段階で潰しておきたいリスク」を機械的に検出します（hook 未定義／字幕長すぎ／総尺長すぎ／演出マーカー不足など）。Sprint 1 時点では 8 ルール。

| オプション | 説明 |
|-----------|------|
| `--strict` | warn も終了コード 1 にする（CI 向け） |

`error`（🔴）が 1 件でもあると終了コード 1。`warn`（🟡）と `info`（🟢）は exit 0（`--strict` 時のみ warn も exit 1）。

```
0    四国めたん    ノーマル
1    ずんだもん    あまあま
2    四国めたん    ツンデレ
3    ずんだもん    ノーマル
...
```

左端の番号が `speakerId` です。

---

## シナリオ作成から動画完成までの手順

```
1. VOICEVOX エンジンを起動する
   → http://localhost:50021 で待ち受け

2. 話者IDを確認する（初回のみ）
   node dist/cli.js list-speakers

3. 立ち絵の PNG を用意する
   → 透過PNG（.png）を image/ フォルダに配置
   例: image/metan.png, image/zundamon.png

4. シナリオ YAML を書く
   → scenario/ フォルダに .yaml ファイルを作成
   → characters で立ち絵・位置・字幕色を設定
   → scenes.lines でセリフを記述

5. 動画を生成する
   node dist/cli.js generate-video scenario/your-scenario.yaml

6. 出力を確認する
   → output/{title}.mp4 が生成される

（透過で出力したい場合）
   node dist/cli.js generate-video scenario/your-scenario.yaml --transparent
   → output/{title}.mov（ProRes 4444 アルファ付き）
```

---

## ファイル構成

```
moviecreate/
├── scenario/               シナリオ YAML ファイル
│   ├── sample.yaml
│   └── test-video.yaml
├── image/                  立ち絵・背景画像（PNG）
├── output/                 生成された動画・音声（.mp4 / .wav）
├── temp/                   一時ファイル（音声・マニフェスト）
│   ├── voices/             セリフごとの WAV
│   └── remotion_public/    Remotion バンドル用アセット
├── src/                    TypeScript ソース
│   ├── cli.ts              CLI エントリポイント
│   ├── config/             パス設定・VOICEVOX 設定
│   ├── media/              音声結合・マニフェスト生成
│   ├── scenario/           YAML ローダー
│   ├── types/              型定義
│   ├── video/              Remotion レンダリング
│   └── voicevox/           VOICEVOX API クライアント
└── remotion/               Remotion React コンポーネント
    ├── index.tsx
    ├── Root.tsx
    ├── VideoComposition.tsx
    └── components/
        ├── Background.tsx
        ├── CharacterLayer.tsx
        └── SubtitleLayer.tsx
```

---

## 環境変数

| 変数名 | 説明 | 既定値 |
|--------|------|--------|
| `VOICEVOX_BASE_URL` | VOICEVOX エンジンの URL | `http://localhost:50021` |

---

## よくある主要キャラのスタイルID（VOICEVOX 0.25 相当）

| 話者名 | スタイル名 | speakerId |
|--------|-----------|-----------|
| 四国めたん | ノーマル | 2 |
| 四国めたん | あまあま | 0 |
| 四国めたん | ツンデレ | 6 |
| 四国めたん | ささやき | 36 |
| ずんだもん | ノーマル | 3 |
| ずんだもん | あまあま | 1 |
| ずんだもん | ツンツン | 7 |
| ずんだもん | ヘロヘロ | 75 |
| 春日部つむぎ | ノーマル | 8 |
| 波音リツ | ノーマル | 9 |
| 雨晴はう | ノーマル | 10 |

全話者は `node dist/cli.js list-speakers` で確認できます。
