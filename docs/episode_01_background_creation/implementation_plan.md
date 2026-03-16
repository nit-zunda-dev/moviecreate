# 実装計画：導入シーン背景作成

## 1. 背景画像の生成
`generate_image` ツールを使用して、以下のプロンプトで背景画像を生成します。

**プロンプト内容:**
> A high-quality anime background of a cozy, slightly cluttered used bookstore. Sunlight filters through a dusty window, illuminating wooden shelves packed with old books. In the foreground, on a rustic wooden table, sits a thick, ancient-looking leather-bound book that is softly glowing with a mysterious golden light. The style is detailed and atmospheric, similar to modern anime films. 16:9 aspect ratio.

## 2. 画像の保存
- 生成された画像を `image/background/bg_used_bookstore_glowing_book.png` として保存します。

## 3. スクリプトの更新
- `scenario/series1-episode01.yaml` の `id: "intro-book"` セクションの `background` パスを、新しく作成した画像のパスに更新します。

## 4. 確認
- 更新後の YAML ファイルを確認し、パスが正しく設定されていることを確認します。
