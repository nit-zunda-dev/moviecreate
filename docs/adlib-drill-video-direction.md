# 英会話アドリブドリル連携 — 動画制作の方向性

> **目的**: リポジトリ隣接の **ENGLISH AD-LIB DRILL**（Webアプリ）の「お題 → 回答 → 続き・模範・解説」と、YouTube 単体でも伸びる本編動画を、**同じ素材・同じ企画軸**で量産するための制作方針をまとめる。  
> **関連**: [`english/企画書.md`](./english/企画書.md)（現場English・別プレイリスト）／[`audio-assets.md`](./audio-assets.md)（BGM・SE）

---

## 0. 確定方針（2026-05-17）

| 項目 | 決定 |
|------|------|
| **公開形態** | **1本の動画・2区間**（同一 `videoId`、Part1 は `endSeconds`、Part2 は `startSeconds`） |
| **アプリ** | 上記のまま連携可能（実装済み。`beginner-1` が同一 ID の例） |
| **シリーズ位置づけ** | **プレイリスト分離**。現場English（`s04-ep*`）の構成・尺・「3フレーズ」テンプレに引っ張らない |
| **進行キャラ** | **ずんだもん＝生徒役**、**四国めたん＝先生役**（解説・言い換えはめたん） |
| **シーンの相手役** | 店員・同僚など **ずんだもん／めたん以外の VOICEVOX**（例: 春日部つむぎ、雨晴はう） |
| **お題パートの画面** | **イラスト／背景画像中心**（立ち絵劇のみにしない） |

---

## 1. 全体像

### 1.1 2つの出口、1つの企画

| 出口 | 役割 | 成功指標（例） |
|------|------|----------------|
| **YouTube** | 単体で「あるある → オチ → 3フレーズ」が完結し、シェア・登録につながる | 冒頭維持率、CTR、コメント（「あなたなら？」） |
| **アプリ** | Part1 で止めてアドリブ回答 → Part2 で模範＋解説（必須視聴） | 回答完了率、Part2 視聴完了率、再訪 |

どちらも **「視聴者がその場で英語を言いたくなる」** ことを最優先にする。解説動画になりすぎない。

### 1.2 アプリ側の体験（制作が守る境界）

アプリ（`ENGLISH_AD-LIB_DRILL`）では次の順序が固定されている。

```
Part1（埋め込み・endSeconds で自動停止）
  → 英語で回答（60秒・字幕は YouTube CC）
  → AI 採点
  → 「続きを見る」
  → Part2（最後まで視聴しないと次へ進めない）
  → 模範解答テキスト表示
```

制作側が必ず渡す情報:

| 項目 | 説明 |
|------|------|
| `setup.youtubeVideoId` | Part1 用動画 ID |
| `setup.endSeconds` | Part1 の停止位置（秒） |
| `reveal.youtubeVideoId` | Part2 用（**基本は Part1 と同一 ID**） |
| `reveal.startSeconds` | Part2 の開始秒（**1本2区間では必須**） |
| **YouTube CC** | 日本語（＋可能なら英語）字幕を公開前に付与 |

データの置き場所（アプリ）: `packages/domain/src/data/stages.ts` の各 `Question.media`。

### 1.3 1本2区間とアプリの対応（問題なし）

アプリは **動画ファイルが2本である必要はない**。同一 YouTube 動画に対し:

| 区間 | アプリの指定 | 挙動 |
|------|----------------|------|
| Part1 | `setup.youtubeVideoId` + `setup.endSeconds` | 埋め込み再生 → 指定秒で **自動停止** |
| Part2 | `reveal.youtubeVideoId`（同一）+ `reveal.startSeconds` | 別画面で **続きから再生** → 終了まで必須視聴 |

```typescript
// 例（ENGLISH AD-LIB_DRILL / beginner-1）
media: {
  setup:  { youtubeVideoId: "XXXXXXXX", endSeconds: 45 },
  reveal: { youtubeVideoId: "XXXXXXXX", startSeconds: 45 },
}
```

**YouTube 側の運用**

- 公開は **完全版1本**（Part1＋Part2 を1つの MP4 からアップロード）
- チャプター（任意）: `0:00 お題` / `0:45 答え合わせ` など `startSeconds` と揃える
- Shorts 切り出しは Part1 区間のみ、など派生は同一ソースから可能

**注意**: `endSeconds` と `startSeconds` はレンダリング後に実測して登録する（数秒ズレるとネタバレ or 途切れになる）。

---

## 2. 動画の二分割設計（Part1 / Part2）

### 2.1 Part1 — お題（Setup）

**役割**: シチュエーションを見せ、英語で何か言われたところで **切る**。

| 要素 | 内容 |
|------|------|
| 尺の目安 | **30〜90秒**（アプリでは長すぎると離脱） |
| 終わり方 | 相手の英語セリフ or 「What would you say?」テロップで **クリフハンガー** |
| 画面 | **イラスト／場面背景**で状況説明。相手の英語は NPC ボイス＋英語 `subtitle` |
| 感情 | ずんだもん（生徒）の「固まった」＋場面イラスト（カフェ・会議室など） |

**停止点（`endSeconds`）の決め方**

- ナレーションで「さあ答えて」と言い終わった **直後**
- または相手の問いかけ英語が終わった **0.5〜1秒後**
- 制作時はプレビューで秒数をメモし、公開後に `stages.ts` に転記

### 2.2 Part2 — 続き・模範・解説（Reveal）

**役割**: Part1 の続きから、模範英語・短い解説・オチまで一気に見せる。

| 要素 | 内容 |
|------|------|
| 尺の目安 | **60秒〜3分**（アプリ必須視聴なので冗長にしない） |
| 冒頭 5秒 | **単体視聴者向け**: 「さっきのカフェ、こう言えば自然なのだ」など前情を1文で |
| 中盤 | 模範フレーズ（英語テロップ＋ゆっくりリピート） |
| 終盤 | 今日のポイント1〜3個＋チャンネル登録・次回予告（YouTube用） |

**アプリ**: 動画が `ENDED` になるまで「次の問題へ」は押せない。  
**YouTube**: 最後まで見なくても成立するよう、冒頭で文脈を補う。

---

## 3. YouTube 単体で伸ばすための制作ルール

### 3.1 フック（最初 5秒）

moviecreate の `hook` ブロックを必ず使う（YAML 例は `scenario/adlib-drill/`）。

- 日本語で痛みを一言（例: 「英語で聞かれて固まった」）
- `emphasis` でキーワード強調
- `flash` / `zoom` / `shake` は **1話1回まで**（うるさくしない）

### 3.2 あるある比率（現場English とは別基準）

**会話劇・あるある（イラスト場面＋ずんだもんの反応）を Part1 の 80% 以上**。

- Part2 のめたん解説は **連続 60秒以内**（ドリルは短く切る）
- 現場English のような「3フレーズ総復習」「前回リキャップ」は **採用しない**

### 3.3 コメント・シェア導線

| タイミング | テロップ・ナレーション例 |
|------------|--------------------------|
| Part1 終端（YouTube版） | 「コメントにあなたならどう言う？！」 |
| 概要欄 | 固定: 今日の英語1行＋アプリ URL（準備でき次第） |
| 固定コメント | 模範解答（英語1文）＋ `#英会話` 系ハッシュタグ |

### 3.4 タイトル・サムネ

**タイトル型**（CTR 用）

- `【英語アドリブ】○○で固まった人へ｜自然な返し方`
- `【英語アドリブドリル】○○と言われたとき、あなたなら？`

**サムネ**

- 左: ずんだもん「驚き／困り」
- 右: 英語フレーズ1行（大きく）
- 副題: 「あなたなら？」系

### 3.5 派生コンテンツ（任意）

| 派生 | 切り出し元 | 尺 |
|------|------------|-----|
| Shorts | Part1 フック＋問いかけ | ≤60秒 |
| Shorts | 模範フレーズ＋リピート1回 | ≤60秒 |
| 通常本編 | **1本2区間の完全版**（レンダリング1回） | 2〜4分 |

YouTube もアプリも **同じ1本** を正とする（別 URL にしない）。

---

## 4. moviecreate での作り方

### 4.1 現場English との分離（プレイリスト・フォルダ）

| 系列 | パス | YouTube | 尺・構成 |
|------|------|---------|----------|
| 現場English | `scenario/english/s04-ep*.yaml` | プレイリスト「現場English」等 | 6〜10分・持ち帰り3フレーズ |
| **英語アドリブドリル** | `scenario/adlib-drill/*.yaml` | **別プレイリスト**（例: 「英語アドリブドリル」） | 2〜4分・1問1フレーズ中心 |

**やらないこと（現場English に引っ張られない）**

- 前話リキャップ scene を冒頭に入れない
- 「今日の3フレーズ」総仕上げを必須にしない
- `s04` と同じ slideIndex 連番・同じ HTML スライドデッキの流用（必要ならドリル専用 HTML を別ファイルで作る）
- タイトルに「現場English」を付けない

**してよいこと（共通資産のみ）**

- BGM/SE（[`audio-assets.md`](./audio-assets.md)）
- ずんだもん／めたんの立ち絵・VOICEVOX 設定
- moviecreate の `hook` / `emphasis` / `chapter` などの演出フィールド

### 4.2 キャラ・音声・イラストの役割分担

```
┌─────────────────────────────────────────────────────────┐
│  Part1（お題）                                           │
│  ┌──────────────────────┐  ┌─────────────────────────┐ │
│  │ イラスト場面（主役）   │  │ ずんだもん・めたん（脇）  │ │
│  │ カフェ店内・店員など   │  │ 生徒のリアクション／     │ │
│  │ scene.background 等   │  │ 短いツッコミ（任意）     │ │
│  └──────────────────────┘  └─────────────────────────┘ │
│  店員の英語: NPC VOICEVOX（speakerId ≠ 2, 3）            │
│  英語表示: subtitle + YouTube CC                         │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│  Part2（答え合わせ）                                     │
│  ずんだもん: 模範英語を言う（生徒が成功する）             │
│  めたん: 1〜2文の解説・言い換え                          │
│  スライド or 立ち絵＋強調テロップ（イラスト比率は下げて可） │
└─────────────────────────────────────────────────────────┘
```

| 役割 | キャラ | 音声 | 画面 |
|------|--------|------|------|
| 生徒（視聴者代理） | ずんだもん | speakerId: 3 | Part1: 困り／Part2: 模範発話 |
| 先生 | 四国めたん | speakerId: 2 | Part2 中心。Part1 は短い導入のみ可 |
| 場面の相手（店員・同僚など） | YAML で別名定義 | **2・3 以外**（例: つむぎ 8、はう 10） | **イラスト背景**＋英語 subtitle |
| ナレーション | めたん or なし | 2 | 状況説明が必要なときのみ |

**場面イラスト（いらすとや + CapCut）**

- 場面は **[いらすとや](https://www.irasutoya.com/)** を **CapCut で手動配置**（moviecreate の背景には入れない）。
- moviecreate は **`--transparent`** で立ち絵・字幕・Hook・音声のみ出力 → CapCut の上トラックに重ねる。
- 手順: **[`adlib-drill-capcut-workflow.md`](./adlib-drill-capcut-workflow.md)**

| moviecreate | CapCut |
|-------------|--------|
| `generate-video --transparent` → `.mov` | 下トラック: いらすとや場面 |
| ずんだもん・めたん立ち絵、字幕、Hook | 上トラック: 透過 MOV |
| 店員（barista）= 音声＋字幕のみ | 店員の絵はいらすとや |

Part1 では **NPC に `image` なし**（speakerId 8 等）。YAML に `background` は書かない。

**NPC 定義例（YAML）**

```yaml
characters:
  zundamon:
    speakerId: 3
    image: "./image/zundamon/困り.png"
    position: left
  metan:
    speakerId: 2
    image: "./image/metan/通常.png"
    position: right
  barista:
    speakerId: 8   # 春日部つむぎ など（list-speakers で選定）
    # image なし → イラスト背景のみで表現
    subtitleColor: "#AADDFF"

scenes:
  - id: "cafe_setup"
    background: "./image/adlib-drill/cafe-counter.png"
    lines:
      - type: dialogue
        character: barista
        text: "What can I get for you today?"
        subtitle: "What can I get for you today?"
      - type: dialogue
        character: zundamon
        face: "驚き"
        text: "（英語で聞かれて固まるのだ……）"
```

### 4.3 新規 YAML の命名

```
scenario/adlib-drill/
  drill-01-cafe-order.yaml    # 1本レンダリング → YouTube 1本 → アプリ 2区間
  drill-02-first-meeting.yaml
```

`Question.id`（アプリ）と対応させる:

| アプリ `id` | シナリオ例 |
|-------------|------------|
| `beginner-1` | `adlib-drill/drill-01-cafe-order` |
| `beginner-2` | `adlib-drill/drill-02-first-meeting` |
| … | ステージ・問題ごとに1 YAML |

### 4.4 シナリオ構成テンプレ（1本・2区間）

```yaml
# drill-meta:
#   appQuestionId: beginner-1
#   setupEndSeconds: （レンダ後に実測）
#   revealStartSeconds: （= setupEndSeconds）
#   youtubeVideoId: （公開後）

title: "【英語アドリブドリル】カフェで注文｜あなたなら？"

hook:
  text: "英語で注文を聞かれて固まる"
  character: zundamon

# --- Part1 相当（ここまでが setupEndSeconds）---
scenes:
  - id: "part1_cafe"
    background: "./image/adlib-drill/cafe.png"
  - id: "part1_question"
    background: "./image/adlib-drill/cafe-counter.png"
    chapter: { label: "お題" }
    lines:
      - type: dialogue
        character: barista
        text: "What can I get for you today?"
        subtitle: "What can I get for you today?"
      - type: dialogue
        character: zundamon
        text: "……（固まるのだ）"

# --- Part2 相当（revealStartSeconds から）---
  - id: "part2_model"
    chapter: { label: "答え合わせ" }
    lines:
      - type: dialogue
        character: zundamon
        text: "I'd like a tall iced latte, please."
        subtitle: "I'd like a tall iced latte, please."
      - type: dialogue
        character: metan
        text: "I'd like と Can I have、カフェではどちらも自然よ。"
  - id: "part2_outro"
    lines:
      - type: dialogue
        character: metan
        text: "次回もアドリブに挑戦してね。"
```

### 4.5 エクスポートと公開チェックリスト

- [ ] MP4 を **1本** レンダリング（`output`: 1280x720 / 30fps）
- [ ] YouTube に **完全版1本** アップロード → プレイリスト「英語アドリブドリル」
- [ ] **字幕（CC）** を追加（アプリは埋め込み CC 表示）
- [ ] `videoId` と `endSeconds` / `startSeconds` をアプリ `stages.ts` に反映
- [ ] スマホ縦画面で Part1 停止点が自然か確認
- [ ] アプリで「続きを見る → 最後まで → 次へ」フローを実機確認

音素材: [`audio-assets.md`](../audio-assets.md) の BGM/SE 方針に従う。

---

## 5. 第1本の具体例（`beginner-1` カフェ注文）

アプリお題（採点用テキスト）:

- 役: お客さん
- 状況: *What can I get for you today?* にアイスラテ・トールで返す

### Part1 構成案（目標 45秒前後）

| # | 内容 | 秒数目安 |
|---|------|----------|
| 1 | Hook「英語の店員に突然話しかけられる」 | 0–5 |
| 2 | イラスト: カフェ／メニュー。ずんだもんツッコミ（短く） | 5–20 |
| 3 | **NPC（つむぎ等）** *What can I get for you today?* ＋英語 subtitle | 20–35 |
| 4 | ずんだもん固まる＋「さあ、英語で！」（めたんは出さなくても可） | 35–45 → **停止** |

模範解答の **中身は Part1 に出さない**（ネタバレ防止）。

### Part2 構成案（目標 90秒前後）

| # | 内容 |
|---|------|
| 1 | 前情1文＋ずんだもんの模範 *I'd like a tall iced latte, please.* |
| 2 | めたん: *I'd like ~* / *Can I have ~* の使い分け（各15秒） |
| 3 | もう一度ゆっくりリピート |
| 4 | 「次は初対面の挨拶」予告＋登録 |

### YouTube 向けタイトル案

- `【英語アドリブ】スタバで注文できない人へ｜I'd like a tall iced latte`
- サムネ英語: `What can I get for you?` / 日本語: `あなたなら何て言う？`

---

## 6. キャラ・演出（ドリル専用）

現場English の企画書とは **プレイリストが別** のため、トーンだけ参考にし、構成は本ドキュメントを正とする。

| キャラ | ドリルでの役割 |
|--------|----------------|
| ずんだもん | **生徒役**・視聴者代理・Part1 で固まる／Part2 で模範 |
| 四国めたん | **先生役**・Part2 の短い解説のみ（長講義しない） |
| NPC（他 VOICEVOX） | 店員・同僚など **英語をかける側**・イラスト場面の主役 |

**ドリル特有のトーン**

- 1問あたり **持ち帰りは1フレーズ＋言い換え1つ** まで
- 失敗は **笑い** で許容（嘲笑ではなく共感）
- 英語例文は `subtitle` に必ず英語原文を入れる（CC 生成のたたき台にもなる）

---

## 7. 品質基準（レビュー時）

### 7.1 アプリ連携

| チェック | OK の目安 |
|----------|-----------|
| Part1 停止後、ユーザーが何をすればよいか一目で分かる | テロップ or ずんだもんの一言 |
| Part2 単体でも文脈が分かる | 冒頭5秒で場面説明 |
| CC あり | 無音・英語のみにならない |
| `endSeconds` がズレていない | 停止後に模範解答が聞こえていない |

### 7.2 YouTube 単体

| チェック | OK の目安 |
|----------|-----------|
| 最初 5秒で離脱理由が消える | 痛み・疑問がはっきり |
| コメントしたくなる | Part1 終端に問いかけ |
| シェアしたくなる | 「あるある」が具体的（カフェ・会議など） |
| 登録理由がある | シリーズ感・次回予告 |

---

## 8. 制作フェーズ（提案）

| フェーズ | 成果物 | 期間目安 |
|----------|--------|----------|
| **P0** | 本ドキュメント合意＋`beginner-1` 1本（Part1/Part2） | 1〜2週 |
| **P1** | 初級3問ぶんのドリル動画＋アプリ `media` 全部入れ | 2〜3週 |
| **P2** | YouTube 完全版＋Shorts 各2本／話 | 並行 |
| **P3** | 中級以降・検定モード用の量産テンプレ固定 | 継続 |

---

## 9. 未決事項

| # | 論点 | 状態 |
|---|------|------|
| 1 | Part1/Part2 の公開形態 | ✅ **1本2区間** |
| 2 | 店員などの英語音声 | ✅ **VOICEVOX（ずんだもん・めたん以外）** ＋ イラスト場面 |
| 3 | 現場English との関係 | ✅ **プレイリスト分離**・`scenario/adlib-drill/` |
| 4 | アプリ URL | 概要欄・固定コメントに載せるタイミング（未） |
| 5 | NPC 話者の固定リスト | 話ごとに `list-speakers` から選定（例: 店員=8、同僚=10） |

---

## 10. 参照リンク（リポジトリ内）

| パス | 内容 |
|------|------|
| `ENGLISH_AD-LIB_DRILL/apps/web/src/presentation/screens/PlayingScreen.tsx` | Part1 UI |
| `ENGLISH_AD-LIB_DRILL/apps/web/src/presentation/screens/RevealScreen.tsx` | Part2 必須視聴 UI |
| `ENGLISH_AD-LIB_DRILL/packages/domain/src/entities/question-media.ts` | `media` 型定義 |
| `moviecreate/scenario/english/s04-ep05-rough-estimate.yaml` | 現場English（参照用・構成はコピーしない） |
| `moviecreate/docs/english/企画書.md` | 現場English 企画（別プレイリスト） |
| [`moviecreate/docs/adlib-drill-capcut-workflow.md`](./adlib-drill-capcut-workflow.md) | CapCut 合成・透過レンダ |
| [`moviecreate/docs/adlib-drill-irasutoya-workflow.md`](./adlib-drill-irasutoya-workflow.md) | いらすとや素材の参考（埋め込み手順は非採用） |

---

*最終更新: 2026-05-17 — 1本2区間・いらすとや手動合成ワークフロー文書化*
