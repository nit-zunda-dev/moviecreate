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

> **初回のみ**: `generate-video` 実行時に Remotion が Chrome Headless Shell を自動ダウンロードします（約 110 MB）。

---

## インストール・ビルド

```bash
git clone <repo>
cd moviecreate
npm install
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
  voice:
    speedScale: 1.1           # 全キャラ共通のデフォルト話速
    intonationScale: 1.0
```

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
