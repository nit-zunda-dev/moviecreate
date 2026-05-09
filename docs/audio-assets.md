# BGM / SE フリー素材の推奨リストとライセンス表記ガイド

> Sprint 3 で導入した `global.bgm` / `Scene.bgm` / `Hook.bgm` / `Hook.se` / `Line.se` 用の素材選定ガイドです。
> **このリポジトリには音源ファイルそのものは同梱しません**（ライセンス・配布リスク回避のため）。
> 利用する際は各サイトの規約に従って自分でダウンロードし、`./bgm/` と `./se/` に配置してください。

---

## 配置先

```
moviecreate/
├── bgm/    ← 長尺の BGM（ループ再生される）
└── se/     ← 短い効果音（その瞬間に1回鳴る）
```

YAML 上は `./bgm/calm.mp3` のようにリポジトリルートからの相対パスで指定します。

```yaml
global:
  bgm:
    default: "./bgm/calm.mp3"
    volume: 0.15

hook:
  bgm: "./bgm/tense_intro.mp3"
  se:  "./se/impact.mp3"

scenes:
  - id: "incident"
    bgm: "./bgm/tense.mp3"
    lines:
      - type: dialogue
        character: zundamon
        text: "緊急インシデント発生！"
        se: "./se/alarm.mp3"
```

---

## 推奨フリー素材サイト（日本語 OK ・商用 OK ・YouTube 収益化 OK）

### BGM

| サイト | 特徴 | クレジット表記 |
|--------|------|----------------|
| [DOVA-SYNDROME](https://dova-s.jp/) | 日本最大級。ジャンル豊富、検索しやすい | 多くは不要だが楽曲ごとに要確認 |
| [甘茶の音楽工房](https://amachamusic.chagasi.com/) | やさしい曲調が多い、教育系と相性◎ | 不要 |
| [魔王魂](https://maou.audio/) | サイバー / ホラー / ファンタジーに強い | クレジット推奨（必須ではない） |
| [PeriTune](https://peritune.com/) | クリエイター向け、ループ前提の素材も多い | クレジット必須の楽曲あり、要確認 |
| [Pixabay Music](https://pixabay.com/ja/music/) | 完全無料・登録不要・クレジット不要 | 不要 |

### SE（効果音）

| サイト | 特徴 | クレジット表記 |
|--------|------|----------------|
| [効果音ラボ](https://soundeffect-lab.info/) | 国内 SE の定番。生活音〜ゲーム系まで網羅 | 不要 |
| [On-Jin 〜音人〜](https://on-jin.com/) | アニメ的・コミカル系に強い | 不要 |
| [効果音工房](http://www.geocities.jp/spring_kuromame3/main.html) | クラシックなアニメ SE | 不要 |
| [Pixabay Sound Effects](https://pixabay.com/ja/sound-effects/) | 完全無料、英語タグで検索しやすい | 不要 |

---

## このシリーズで使う想定の SE カテゴリ

| カテゴリ | 用途 | キーワード例 |
|---------|------|--------------|
| **Hook 開始** | 動画の最初の「ドンッ」 | `impact` `whoosh` `glitch` |
| **強調 / Emphasis** | キーワードの叩きつけ | `kira-n` `bell-ding` `chime` |
| **試験頻出 Callout** | バッジ出現音 | `pop` `notification` |
| **失敗 / Warn** | 注意喚起 | `error` `buzz` `siren` |
| **正解 / Tip** | OKサイン | `correct` `success` `bell` |
| **シーン切替** | チャプター頭 | `transition` `swoosh` |

---

## 推奨命名規約

複数本扱うときは目的が分かる名前にしておくと、YAML で書き分けやすいです。

```
bgm/
  intro_tense.mp3        ← Hook 用
  main_calm.mp3          ← 通常解説用（global.bgm.default 候補）
  main_serious.mp3       ← インシデント解説用
  outro_warm.mp3         ← まとめ用
se/
  hook_impact.mp3
  emphasis_chime.mp3
  callout_pop.mp3
  warn_buzz.mp3
  correct_bell.mp3
  transition_swoosh.mp3
```

---

## 音量の目安（既定値）

| トラック | 既定音量 | 設定箇所 |
|----------|----------|----------|
| 本編音声（VOICEVOX） | 1.00 | （変更不可・基準） |
| BGM（通常） | 0.15 | `global.bgm.volume` |
| BGM（Hook 区間） | 0.35 | `bgmPlanner.DEFAULT_HOOK_BGM_VOLUME` |
| SE | 0.70 | `sePlanner.DEFAULT_SE_VOLUME` |

> **重要**: 音量を上げすぎると VOICEVOX のセリフが聞き取りにくくなります。
> セリフ＞SE＞BGM の音量バランスを必ず守ってください。

---

## 動画概要欄でのクレジット記載例

サイト規約でクレジット必須の素材を使った場合は、`generate-youtube-metadata` で生成した概要欄に追記してください。

```
=== クレジット ===
BGM: ○○ - DOVA-SYNDROME (https://dova-s.jp/bgm/play○○○○.html)
BGM: △△ - PeriTune (https://peritune.com/△△/)
SE:  効果音ラボ (https://soundeffect-lab.info/)
```

---

## トラブルシューティング

| 症状 | 原因と対策 |
|------|----------|
| BGM が鳴らない | `global.bgm.default` が未指定。または該当ファイルが存在しない |
| BGM がブツ切れに聞こえる | `loop: false` になっている可能性。Sprint 3 既定は `true` |
| SE が動画後半に来ると鳴らない | 動画の総尺より後ろの時刻を指している。`atMs` を確認 |
| 「staticFile() does not support absolute paths」エラー | `renderVideo.ts` の `preparePublicAssets` でコピー漏れ。新しい音源タイプを追加した場合は対応が必要 |
