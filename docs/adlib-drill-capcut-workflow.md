# 英語アドリブドリル — CapCut 合成ワークフロー

> **前提**: [いらすとや](https://www.irasutoya.com/) の場面イラストは **CapCut で手動配置**。  
> **moviecreate** は **音声・ずんだもん／めたん立ち絵・字幕・Hook 演出** だけを生成する。

関連: [`adlib-drill-video-direction.md`](./adlib-drill-video-direction.md) / [`README.md`](../README.md) の `--transparent`

---

## 1. 役割分担

| 担当 | 内容 |
|------|------|
| **いらすとや + CapCut** | カフェ店内・店員・メニューなど **背景・場面** |
| **moviecreate** | VOICEVOX（ずんだもん・めたん・NPC）、字幕、Hook、BGM ミックス、立ち絵 |
| **CapCut（最終）** | 下: 場面 / 上: 透過レイヤー → 1 本の MP4 → YouTube → アプリ `media` |

moviecreate の YAML に **`scenes[].background` は書かない**（黒板への埋め込みは不要）。

---

## 2. moviecreate で生成するファイル

### 2.1 CapCut 用オーバーレイ（推奨）

```bash
cd moviecreate
node dist/cli.js generate-video scenario/adlib-drill/drill-01-cafe-order.yaml --transparent
```

| 出力 | 用途 |
|------|------|
| `output/【英語アドリブドリル】カフェで注文｜あなたなら？.mov` | ProRes 4444 **透過**。CapCut の上のトラックに載せる |
| 同タイムラインに **音声・BGM 込み** | そのまま音としても使える |

透過レイヤーに含まれるもの:

- ずんだもん・めたんの立ち絵（口パク）
- 字幕（日本語＋ `subtitle` の英語）
- Hook（冒頭テロップ・フラッシュ等）
- チャプター下帯（`chapter` 指定時）
- **店員（barista）** は立ち絵なし → **音声＋字幕のみ**（CapCut 側のイラストと同期しやすい）

### 2.2 音声だけ欲しい場合

```bash
node dist/cli.js generate-audio scenario/adlib-drill/drill-01-cafe-order.yaml
```

→ `output/*.wav`。CapCut で透過動画の音と差し替えたいとき用。

---

## 3. CapCut での合成手順

1. **新規プロジェクト** 1280×720 / 30fps
2. **下のトラック**: いらすとやで作った場面クリップ（Part1 用カットを問いかけまで）
3. **上のトラック**: moviecreate の `.mov`（透過）を配置し、**先頭を揃える**
4. Hook 区間（約 5 秒）は、場面を暗くする／テロップ用カットでも可
5. **Part1 終端**（店員の英語 → ずんだもん固まり →「あなたなら？」）の **最後のフレーム** の時刻をメモ → `setupEndSeconds`
6. **Part2** 開始位置 = その秒数（`revealStartSeconds`）。CapCut 上でチャプター分割してもよい
7. 書き出し **MP4（H.264）** → YouTube 公開
8. `ENGLISH_AD-LIB_DRILL` の `packages/domain/src/data/stages.ts` に `videoId` と秒数を記入

### タイミングの目安（第1問・初回レンダ実測）

| 秒数 | YAML | 内容 |
|------|------|------|
| 0–5 | `hook` | Hook 演出 |
| 5–10 | `part1_intro` | 導入 |
| 10–15 | `part1_question` | 店員英語（音声＋字幕） |
| 15–20 | `part1_prompt` | 「あなたなら？」→ **Part1 終了 `setupEndSeconds: 20`** |
| 20–44 | `part2_*` | 答え合わせ・解説 |

※ 台詞を変えたら **必ず再レンダ**して秒数を取り直す。

---

## 4. シナリオ一覧

| アプリ `id` | YAML |
|-------------|------|
| `beginner-1` | [`scenario/adlib-drill/drill-01-cafe-order.yaml`](../scenario/adlib-drill/drill-01-cafe-order.yaml) |

追加するときは同フォルダに `drill-02-*.yaml` を増やす。

---

## 5. チェックリスト

- [ ] VOICEVOX エンジン起動（`localhost:50021`）
- [ ] `generate-video --transparent` 成功
- [ ] CapCut で透過レイヤーと場面の **口ずれ・字幕** を確認
- [ ] Part1 終端時刻を `setupEndSeconds` に記録
- [ ] YouTube 公開＋CC
- [ ] アプリで Part1 停止 → 回答 → Part2 必須視聴を確認

---

## 6. 旧ドキュメントについて

[`adlib-drill-irasutoya-workflow.md`](./adlib-drill-irasutoya-workflow.md) の「moviecreate 中央パネルへ PNG を埋め込む」手順は **採用しない**。いらすとやの検索・ライセンスの参考としてのみ残す。

---

*最終更新: 2026-05-17*
