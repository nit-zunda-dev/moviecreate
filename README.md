# moviecreate

VOICEVOXエンジン（localhost:50021）とシナリオ（YAML/JSON）を使って、複数キャラクターの音声を1本のWAVに自動生成するCLIツールです。

## 必要な環境

- Node.js（推奨: 18+）
- [VOICEVOX エンジン](https://voicevox.hiroshiba.jp/) を起動し、`http://localhost:50021` で待ち受けていること
- （音声連結のみ）ffmpeg / ffprobe が利用可能であること（`@ffprobe-installer/ffprobe` で自動取得も可）

## クイックスタート

```bash
npm install
npm run build
node dist/cli.js generate-audio ./scenario/sample.yaml
```

出力: `output/` 配下にシナリオの `output.file` または `output/{title}.wav` で保存されます。

---

## キャラクターのバリエーション

### 利用可能な話者・スタイルの確認

接続中のVOICEVOXエンジンで利用できる**話者名**と**スタイルID**は、次のコマンドで一覧できます。

```bash
node dist/cli.js list-speakers
```

出力例（エンジンによって異なります）:

```
0	四国めたん	ノーマル
1	四国めたん	あまあま
2	四国めたん	ツンデレ
3	ずんだもん	ノーマル
4	ずんだもん	あまあま
5	ずんだもん	ツンデレ
...
```

左から **スタイルID**・**話者名**・**スタイル名** です。シナリオではこの **スタイルID** を `characters.*.speakerId` に指定します。

### シナリオでのキャラクター定義

シナリオ内の `characters` で、**任意のキャラ名** と **VOICEVOXのスタイルID** を対応づけます。キャラ名は英語・日本語どちらでも構いません。

```yaml
characters:
  zundamon:
    speakerId: 3    # ずんだもん・ノーマル（エンジンにより異なる）
    styleId: 0     # 将来の拡張用。現状は speakerId がスタイルを表す
  metan:
    speakerId: 2   # 四国めたん・ツンデレ の例
  zundamon_amama:
    speakerId: 4   # ずんだもん・あまあま の例
  narrator:
    speakerId: 0   # 四国めたん・ノーマル をナレーションに
```

- **speakerId**（必須）: `list-speakers` で表示される **スタイルID**。話者＋声色を指定します。
- **styleId**（任意）: 将来の拡張用。現行実装では未使用です。

### スピーカー・スタイルID一覧（VOICEVOX 0.16.0 相当）

シナリオの `characters.*.speakerId` には、以下の **スタイルID** を指定します。エンジン・バージョンで変わる場合は `list-speakers` で確認してください。

| 話者名 | スタイル名 | speakerId |
|--------|------------|-----------|
| 四国めたん | あまあま | 0 |
| 四国めたん | ノーマル | 2 |
| 四国めたん | セクシー | 4 |
| 四国めたん | ツンツン | 6 |
| 四国めたん | ささやき | 36 |
| 四国めたん | ヒソヒソ | 37 |
| ずんだもん | あまあま | 1 |
| ずんだもん | ノーマル | 3 |
| ずんだもん | セクシー | 5 |
| ずんだもん | ツンツン | 7 |
| ずんだもん | ささやき | 22 |
| ずんだもん | ヒソヒソ | 38 |
| ずんだもん | ヘロヘロ | 75 |
| ずんだもん | なみだめ | 76 |
| 春日部つむぎ | ノーマル | 8 |
| 波音リツ | ノーマル | 9 |
| 雨晴はう | ノーマル | 10 |
| 玄野武宏 | ノーマル | 11 |
| 玄野武宏 | 喜び | 39 |
| 玄野武宏 | ツンギレ | 40 |
| 玄野武宏 | 悲しみ | 41 |
| 白上虎太郎 | ふつう | 12 |
| 白上虎太郎 | わーい | 32 |
| 白上虎太郎 | びくびく | 33 |
| 白上虎太郎 | おこ | 34 |
| 白上虎太郎 | びえーん | 35 |
| 青山龍星 | ノーマル | 13 |
| 青山龍星 | 熱血 | 81 |
| 青山龍星 | 不機嫌 | 82 |
| 青山龍星 | 喜び | 83 |
| 青山龍星 | しっとり | 84 |
| 青山龍星 | かなしみ | 85 |
| 青山龍星 | 囁き | 86 |
| 冥鳴ひまり | ノーマル | 14 |
| 九州そら | あまあま | 15 |
| 九州そら | ノーマル | 16 |
| 九州そら | セクシー | 17 |
| 九州そら | ツンツン | 18 |
| 九州そら | ささやき | 19 |
| もち子さん | ノーマル | 20 |
| もち子さん | セクシー／あん子 | 66 |
| もち子さん | 泣き | 77 |
| もち子さん | 怒り | 78 |
| もち子さん | 喜び | 79 |
| もち子さん | のんびり | 80 |
| 剣崎雌雄 | ノーマル | 21 |
| WhiteCUL | ノーマル | 23 |
| WhiteCUL | たのしい | 24 |
| WhiteCUL | かなしい | 25 |
| WhiteCUL | びえーん | 26 |
| 後鬼 | 人間ver. | 27 |
| 後鬼 | ぬいぐるみver. | 28 |
| 後鬼 | 人間（怒り）ver. | 87 |
| 後鬼 | 鬼ver. | 88 |
| No.7 | ノーマル | 29 |
| No.7 | アナウンス | 30 |
| No.7 | 読み聞かせ | 31 |
| ちび式じい | ノーマル | 42 |
| 櫻歌ミコ | ノーマル | 43 |
| 櫻歌ミコ | 第二形態 | 44 |
| 櫻歌ミコ | ロリ | 45 |
| 小夜/SAYO | ノーマル | 46 |
| ナースロボ＿タイプＴ | ノーマル | 47 |
| ナースロボ＿タイプＴ | 楽々 | 48 |
| ナースロボ＿タイプＴ | 恐怖 | 49 |
| ナースロボ＿タイプＴ | 内緒話 | 50 |
| †聖騎士 紅桜† | ノーマル | 51 |
| 雀松朱司 | ノーマル | 52 |
| 麒ヶ島宗麟 | ノーマル | 53 |
| 春歌ナナ | ノーマル | 54 |
| 猫使アル | ノーマル | 55 |
| 猫使アル | おちつき | 56 |
| 猫使アル | うきうき | 57 |
| 猫使アル | つよつよ | 110 |
| 猫使アル | へろへろ | 111 |
| 猫使ビィ | ノーマル | 58 |
| 猫使ビィ | おちつき | 59 |
| 猫使ビィ | 人見知り | 60 |
| 猫使ビィ | つよつよ | 112 |
| 中国うさぎ | ノーマル | 61 |
| 中国うさぎ | おどろき | 62 |
| 中国うさぎ | こわがり | 63 |
| 中国うさぎ | へろへろ | 64 |
| 波音リツ | クイーン | 65 |
| 栗田まろん | ノーマル | 67 |
| あいえるたん | ノーマル | 68 |
| 満別花丸 | ノーマル | 69 |
| 満別花丸 | 元気 | 70 |
| 満別花丸 | ささやき | 71 |
| 満別花丸 | ぶりっ子 | 72 |
| 満別花丸 | ボーイ | 73 |
| 琴詠ニア | ノーマル | 74 |
| Voidoll | ノーマル | 89 |
| ぞん子 | ノーマル | 90 |
| ぞん子 | 低血圧 | 91 |
| ぞん子 | 覚醒 | 92 |
| ぞん子 | 実況風 | 93 |
| 中部つるぎ | ノーマル | 94 |
| 中部つるぎ | 怒り | 95 |
| 中部つるぎ | ヒソヒソ | 96 |
| 中部つるぎ | おどおど | 97 |
| 中部つるぎ | 絶望と敗北 | 98 |
| 離途 | ノーマル | 99 |
| 黒沢冴白 | ノーマル | 100 |
| 離途 | シリアス | 101 |
| ユーレイちゃん | ノーマル | 102 |
| ユーレイちゃん | 甘々 | 103 |
| ユーレイちゃん | 哀しみ | 104 |
| ユーレイちゃん | ささやき | 105 |
| ユーレイちゃん | ツクモちゃん | 106 |
| 東北ずん子 | ノーマル | 107 |
| 東北きりたん | ノーマル | 108 |
| 東北イタコ | ノーマル | 109 |

※ エンジンやVOICEVOXのバージョンでIDが変わる場合があるため、不明なときは `node dist/cli.js list-speakers` で表示される一覧を参照してください。

### セリフごとにキャラを指定する

各セリフ（`lines[]`）では、`character` または `speaker` で誰の声で読むかを指定します。

```yaml
lines:
  - type: dialogue
    character: "zundamon"   # characters で定義した名前 → speakerId に変換される
    text: "こんにちはなのだ。"
  - type: dialogue
    character: "metan"
    text: "四国めたんですよ。"
  - type: dialogue
    speaker: "zundamon"     # character が無い場合は config の nameToSpeakerId を参照
    text: "speaker でも指定できるのだ。"
```

- **character**: シナリオの `characters` に定義した名前。優先して使われます。
- **speaker**: `src/config/voicevox.ts` の `nameToSpeakerId` に登録した名前（未指定時は `global.defaultSpeaker` → デフォルト話者）。

---

## 音声パラメータ（話速・音高・抑揚・音量・無音など）

VOICEVOX の「話速」「音高」「抑揚」「音量」「間の長さ」「開始無音」「終了無音」を、シナリオから指定できます。  
`global.voice`（全体のデフォルト）→ `characters.*.voice`（キャラごと）→ `lines[].voice`（行ごと）の順でマージされ、後の指定が優先されます。

### 指定できる項目（voice）

| キー | 型 | 説明 | 目安の既定値 |
|------|-----|------|----------------|
| `speedScale` | number | 話速（1.0 が標準、大きくすると速く） | 1.0 |
| `pitchScale` | number | 音高（0.0 が標準、正で高く） | 0.0 |
| `intonationScale` | number | 抑揚（1.0 が標準） | 1.0 |
| `volumeScale` | number | 音量（1.0 が標準） | 1.0 |
| `pauseLengthScale` | number | 間の長さの倍率（1.0 が標準） | 1.0 |
| `prePhonemeLength` | number | 開始無音（秒） | 0.1 |
| `postPhonemeLength` | number | 終了無音（秒） | 0.1 |

### 指定例

**全体で少しゆっくり・抑揚強め**

```yaml
global:
  defaultSpeaker: "zundamon"
  voice:
    speedScale: 0.95
    intonationScale: 1.1
```

**キャラごとに差をつける**

```yaml
characters:
  zundamon:
    speakerId: 3
    voice:
      speedScale: 1.05
  metan:
    speakerId: 2
    voice:
      pitchScale: 0.05
      volumeScale: 0.9
```

**特定のセリフだけ開始・終了無音を長くする**

```yaml
lines:
  - character: "zundamon"
    text: "こんにちはなのだ。"
  - character: "metan"
    text: "重要な一言。"
    voice:
      prePhonemeLength: 0.3
      postPhonemeLength: 0.5
```

---

## パラメーターのバリエーション

### シナリオトップレベル

| キー          | 型     | 説明 |
|---------------|--------|------|
| `title`       | string | 必須。動画タイトル。出力ファイル名の既定値にも利用。 |
| `output`      | object | 出力先・解像度など（音声のみのため主に `file` のみ利用）。 |
| `output.file` | string | 出力WAVパス（例: `./output/my.wav`）。省略時は `output/{title}.wav`。 |
| `global`      | object | 全体のデフォルト。 |
| `global.defaultSpeaker` | string | セリフで character/speaker 未指定時に使う話者名。 |
| `global.voice` | object | 全体のデフォルト [音声パラメータ](#音声パラメータ話速音高抑揚音量無音など)（`speedScale` など）。 |
| `characters`  | object | キャラ名 → `{ speakerId, styleId?, voice? }` の対応。 |
| `scenes`      | array  | 必須。シーン配列。 |

### シーン（scenes[]）

| キー         | 型     | 説明 |
|--------------|--------|------|
| `id`         | string | 必須。シーン識別子（ログ・一時ファイル名に使用）。 |
| `background` | string | 未使用（音声専用のため）。 |
| `bgm`        | string | 未使用。 |
| `duration`   | number | 未使用。 |
| `lines`      | array  | 必須。セリフ・ナレーションの配列。 |

### セリフ（lines[]）

| キー         | 型     | 説明 |
|--------------|--------|------|
| `type`       | string | `dialogue` / `narration` / `subtitle_only`。音声生成は `dialogue` と `narration` で同じ扱い。 |
| `text`       | string | 読み上げるテキスト。空や省略時はその行は音声出力されない。 |
| `subtitle`   | string | テロップ用（音声ツールでは未使用。将来用）。 |
| `character`  | string | キャラ名。`characters` のキーと一致させるとその speakerId で合成。 |
| `speaker`    | string | 話者名。character 未指定時に config の nameToSpeakerId から speakerId を解決。 |
| `voice`      | object | この行だけ [音声パラメータ](#音声パラメータ話速音高抑揚音量無音など) を上書き。 |
| `voiceStyle` | string | 将来用。現状は未使用。 |
| `start`      | number | 将来用（無音挿入など）。現状は行の並び順で連結。 |
| `offset`     | number | 同上。 |
| `face`       | string | 未使用。 |
| `effects`    | object | 将来用（音量・フェード等）。現状は未使用。 |

### キャラクター定義（characters.*）

| キー         | 型     | 説明 |
|--------------|--------|------|
| `speakerId`  | number | 必須。VOICEVOXのスタイルID（`list-speakers` の左列）。 |
| `styleId`    | number | 任意。将来の拡張用。 |
| `voice`      | object | 任意。このキャラのデフォルト [音声パラメータ](#音声パラメータ話速音高抑揚音量無音など)。 |

### 環境変数

| 変数名             | 説明 |
|--------------------|------|
| `VOICEVOX_BASE_URL` | エンジンのURL。未設定時は `http://localhost:50021`。 |

### CLIコマンド・オプション

| コマンド | 説明 |
|----------|------|
| `generate-audio <scenario>` | シナリオから1本のWAVを生成。 |
| `generate <scenario>`       | 上記のエイリアス。 |
| `list-speakers`            | 利用可能な話者・スタイルID一覧を表示。 |

**generate-audio / generate のオプション**

| オプション        | 説明 |
|-------------------|------|
| `--out <path>`    | 出力WAVパス。シナリオの `output.file` より優先。 |
| `--per-line-dir <path>` | 各セリフの個別WAVを保存するディレクトリ（指定時のみ）。 |
| `--dry-run`       | シナリオの読み込みと内容表示のみ。音声は生成しない。 |

---

## サンプルシナリオ

- `scenario/sample.yaml` — ずんだもんと四国めたんの短い会話
- `scenario/case-001-heart-sync.yaml` — 解説台本の長めの例

```bash
node dist/cli.js generate-audio ./scenario/sample.yaml
node dist/cli.js generate-audio ./scenario/case-001-heart-sync.yaml --out ./output/case-001.wav
```

---

## プロジェクト構成

```
src/
  config/     voicevox（URL・デフォルト話者）、paths
  types/      scenario の型定義
  scenario/   loader, resolver
  voicevox/   client（API）, synthesizeLine（キャラ→speakerId 解決）
  media/      ffmpegWrapper（音声連結のみ）
  cli.ts      generate-audio, generate, list-speakers
scenario/     YAML/JSON シナリオ
output/       生成WAVの出力先（既定）
temp/         一時WAV（voices/）
```

