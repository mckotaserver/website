# 実装計画書

## 概要

- **プロダクト名**: KotaServer Wiki
- **目的**: CMS（kotaserver-web-admin）で管理するコンテンツを Wiki ページとして Astro の静的サイト上で配信する
- **参照ドキュメント**: [要件定義書](requirements.md), [仕様書](specification.md), [テスト戦略書](testing-strategy.md)

## 前提条件・技術スタック

- Astro 6（SSG モード）
- CMS サーバー（kotaserver-web-admin）がローカルで起動済み（`localhost:8080`）
- CMS に API キーが発行済み
- CMS に公開済みのページが少なくとも1件存在
- Markdown レンダリング: `marked`
- パッケージマネージャ: pnpm

## 機能一覧

| # | 機能 | 概要 | 対応イテレーション |
|---|------|------|--------------------|
| 1 | API クライアント | CMS 公開 API への接続・データ取得 | Iteration 1 |
| 2 | 個別ページ表示 | slug ベースで CMS ページを表示 | Iteration 2 |
| 3 | Markdown レンダリング | ページ本文を HTML に変換 | Iteration 2 |
| 4 | ページ一覧 | 公開済みページの一覧表示 | Iteration 3 |
| 5 | ナビゲーション | CMS のナビ設定をヘッダーメニューに反映 | Iteration 4 |
| 6 | レイアウト統合 | ナビ・フッター付きの共通レイアウト | Iteration 4 |
| 7 | メディア URL 解決 | Markdown 内の画像を CMS URL に変換 | Iteration 5 |
| 8 | OGP メタデータ | ページタイトル等を meta タグに反映 | Iteration 5 |
| 9 | Webhook 再ビルド | CMS 更新時の自動再ビルド設定 | Iteration 6 |

## イテレーション計画

### Iteration 1: CMS API 接続 & 最初のページ表示

**ゴール**: CMS から取得したデータがブラウザに表示される状態を作る

**確認できる成果物**: `/wiki/test-slug` にアクセスすると、CMS のページタイトルと本文（生テキスト）が表示される

**タスク**:

- [ ] `.env` を作成し `CMS_API_URL` と `CMS_API_KEY` を設定する
- [ ] `.gitignore` に `.env` を追加する
- [ ] `src/lib/types.ts` を作成 — CMS レスポンスの型定義（`PageResponse`, `PaginatedResponse`, `NavigationItemResponse`, `MediaResponse`）
- [ ] `src/lib/cms-client.ts` を作成 — 共通 fetch ラッパー（`X-API-Key` ヘッダー付与）と `getPages()`, `getPageBySlug()` を実装
- [ ] `src/pages/wiki/[slug].astro` を作成 — `getStaticPaths()` で全公開ページのパスを生成し、タイトルと本文をそのまま表示（Markdown レンダリングなし）

**補足**: この段階では Markdown を HTML 変換せず、生テキストで表示する。動作確認ができれば十分。環境変数が未設定の場合はビルド時にわかりやすいエラーメッセージを出す。

**テスト（ユニット）**:

- [ ] Vitest + cheerio + Playwright をセットアップする（`pnpm add -D vitest cheerio @playwright/test && npx playwright install chromium`、`vitest.config.ts`・`playwright.config.ts` 作成、`package.json` にスクリプト追加）
- [ ] `src/lib/__tests__/cms-client.test.ts` を作成し、以下のテストケースを実装:
  - `fetchCms` が `X-API-Key` ヘッダーを正しく付与すること
  - `fetchCms` が `CMS_API_URL` + パスで正しい URL を構築すること
  - `getPages` が正常レスポンスをパースして返すこと
  - `getPageBySlug` が slug を URL に含めてリクエストし、レスポンスを返すこと
  - API エラー時（401/404/500）に適切なメッセージと共に例外をスローすること
  - `CMS_API_URL` / `CMS_API_KEY` が未設定の場合にわかりやすいエラーをスローすること
- [ ] `vitest run --project unit` が全件パスすること

**テスト（ビルド成果物）**:

- [ ] テストハーネス基盤を構築する:
  - `src/__tests__/fixtures/` にフィクスチャ JSON（pages, navigation, media）を作成
  - `src/__tests__/helpers/mock-cms-server.ts` — モック CMS HTTP サーバー（`node:http`、ポート 18080）
  - `src/__tests__/helpers/build.ts` — `astro build` 実行ヘルパー
  - `src/__tests__/helpers/html.ts` — HTML 読み込み・cheerio パースヘルパー
- [ ] `src/__tests__/build-output/iteration-1.test.ts` を作成し、以下を検証:
  - `dist/wiki/{slug}/index.html` が生成されること
  - HTML 内にフィクスチャのページタイトルが含まれること
  - HTML 内にフィクスチャの本文テキストが含まれること
  - `dist/wiki/` 内のディレクトリがフィクスチャの slug のみであること
- [ ] `vitest run --project build` が全件パスすること

※ Iteration 1 ではスクリーンショット確認なし（CSS スタイリング未実装のため）

---

### Iteration 2: Markdown レンダリング & ページレイアウト

**ゴール**: CMS ページが読みやすい形式で表示される

**確認できる成果物**: `/wiki/{slug}` で Markdown がきれいに HTML レンダリングされ、ページタイトルが `<title>` に反映される

**タスク**:

- [ ] `marked` をインストール（`pnpm add marked`）
- [ ] `src/lib/cms-client.ts` に `renderMarkdown()` を追加 — `marked` で Markdown → HTML 変換
- [ ] `src/layouts/WikiLayout.astro` を作成 — Wiki ページ用レイアウト（ヘッダー・フッター・コンテンツエリア）
- [ ] `src/pages/wiki/[slug].astro` を更新 — `WikiLayout` を使用し、Markdown を HTML に変換して表示
- [ ] `<title>` タグにページタイトルを反映（`{title} | KotaServer` 形式）
- [ ] Markdown コンテンツ用の基本的な CSS スタイルを追加（見出し、段落、リスト、コードブロック等）

**テスト（ユニット）**:

- [ ] `src/lib/__tests__/markdown.test.ts` を作成し、以下のテストケースを実装:
  - 見出し・段落・リスト・コードブロックが正しい HTML に変換されること
  - 空文字列を渡した場合にエラーにならず空文字列を返すこと
- [ ] `vitest run --project unit` が全件パスすること

**テスト（ビルド成果物）**:

- [ ] `src/__tests__/build-output/iteration-2.test.ts` を作成し、以下を検証:
  - ビルド済み HTML 内に `<h2>`, `<ul>`, `<pre><code>` 等の Markdown 由来の HTML 要素が存在すること
  - `<title>` の内容が `{ページタイトル} | KotaServer` 形式にマッチすること
  - WikiLayout のセマンティック要素（`<header>`, `<main>`, `<footer>`）が存在すること
- [ ] `vitest run --project build` が全件パスすること

**テスト（スクリーンショット確認）**:

- [ ] `src/__tests__/screenshots/capture.test.ts` を作成し、以下のスクリーンショットを撮影:
  - `/wiki/{slug}` 個別ページ — デスクトップ（1280x720）
  - `/wiki/{slug}` 個別ページ — モバイル（375x667）
- [ ] `playwright test` を実行してスクリーンショットを `test-results/` に保存
- [ ] エージェントがスクリーンショットを読み込み、以下を視覚確認:
  - Markdown（見出し・段落・リスト・コードブロック）が読みやすくレンダリングされていること
  - WikiLayout のヘッダー・コンテンツ・フッターが適切に配置されていること
  - モバイルビューポートでレイアウトが崩れていないこと

---

### Iteration 3: ページ一覧

**ゴール**: 公開済みページを一覧で確認でき、個別ページに遷移できる

**確認できる成果物**: `/wiki/` にアクセスすると、Wiki ページのカード一覧が表示され、クリックで個別ページに遷移する

**タスク**:

- [ ] `src/components/WikiCard.astro` を作成 — ページタイトルと更新日時を表示するカードコンポーネント
- [ ] `src/pages/wiki/index.astro` を作成 — `getPages()` で全公開ページを取得し、更新日時の降順で `WikiCard` を一覧表示
- [ ] Wiki ページ一覧用の CSS スタイルを追加

**テスト（ユニット）**:

- [ ] 新規テスト追加なし（ページ一覧は Astro テンプレートのみでテスト対象のロジックがない）
- [ ] `vitest run --project unit` が既存テスト全件パスすること（リグレッションなし）

**テスト（ビルド成果物）**:

- [ ] `src/__tests__/build-output/iteration-3.test.ts` を作成し、以下を検証:
  - `dist/wiki/index.html` が生成されること
  - カード要素の数がフィクスチャのページ数と一致すること
  - 各カード内にフィクスチャのタイトル・更新日時テキストが含まれること
  - カードが更新日時の降順で並んでいること（カード要素を順に取得して日時を比較）
  - 各カードの `<a href>` が `/wiki/{slug}` 形式であること
  - 空配列フィクスチャでビルドし、`dist/wiki/index.html` が生成されエラーにならないこと
- [ ] `vitest run --project build` が全件パスすること

**テスト（スクリーンショット確認）**:

- [ ] `capture.test.ts` に一覧ページのスクリーンショットを追加:
  - `/wiki/` 一覧ページ — デスクトップ（1280x720）
  - `/wiki/` 一覧ページ — モバイル（375x667）
- [ ] エージェントがスクリーンショットを読み込み、以下を視覚確認:
  - カード一覧がグリッド状に配置されていること
  - 各カードにタイトルと日時が視認できること
  - モバイルビューポートでカードが縦並びになっていること

---

### Iteration 4: ナビゲーション連携

**ゴール**: CMS のナビゲーション設定がサイトヘッダーに反映される

**確認できる成果物**: 全 Wiki ページのヘッダーに、CMS で設定したナビゲーションメニューが表示され、各リンクが正しく機能する

**タスク**:

- [ ] `src/lib/cms-client.ts` に `getNavigation()` を追加
- [ ] `src/components/Navigation.astro` を作成 — ナビゲーション項目を `sortOrder` 昇順で表示。`pageId` があれば `/wiki/{slug}` にリンク、なければラベルのみ表示。トップページへのリンクを先頭に固定
- [ ] ナビゲーション項目の `pageId` から slug を解決するロジックを実装（ページ一覧を取得して突合）
- [ ] `PageLayout.astro` にナビゲーションコンポーネントを組み込む
- [ ] ナビゲーションの CSS スタイルを追加（レスポンシブ対応含む）

**テスト（ユニット）**:

- [ ] `cms-client.test.ts` に `getNavigation` のテストケースを追加:
  - `getNavigation` が正常レスポンスをパースして返すこと
- [ ] `src/lib/__tests__/navigation.test.ts` を作成し、以下のテストケースを実装:
  - ナビ項目が `sortOrder` 昇順でソートされること
  - `pageId` が存在するナビ項目に `/wiki/{slug}` リンクが生成されること
  - `pageId` が `null` のナビ項目はラベルのみ（リンクなし）で処理されること
  - `pageId` に対応するページが未公開（ページ一覧に存在しない）の場合、該当項目がフィルタまたはリンクなしになること
- [ ] `vitest run --project unit` が全件パスすること

**テスト（ビルド成果物）**:

- [ ] `src/__tests__/build-output/iteration-4.test.ts` を作成し、以下を検証:
  - ナビ要素内にフィクスチャのラベルテキストが含まれること
  - `pageId` 付きナビ項目の `<a href>` が `/wiki/{slug}` を指していること
  - ナビの最初のリンクが `/`（トップページ）であること
  - ナビ項目の順序がフィクスチャの `sortOrder` 昇順と一致すること
- [ ] `vitest run --project build` が全件パスすること

**テスト（スクリーンショット確認）**:

- [ ] スクリーンショットを再撮影し、エージェントが以下を視覚確認:
  - ナビゲーションメニューがヘッダーに表示されていること
  - ナビ項目のテキストが視認でき、リンクらしい見た目であること
  - モバイルビューポートでナビゲーションが適切に折り返し/収納されていること

---

### Iteration 5: メディア URL 解決 & OGP

**ゴール**: Markdown 内の画像が正しく表示され、SNS シェア時にページ情報が表示される

**確認できる成果物**: CMS で画像を含むページを作成し、`/wiki/{slug}` で画像が表示される。ページ URL を SNS に貼ると OGP 情報が表示される

**タスク**:

- [ ] `marked` の renderer をカスタマイズ — 画像の `src` が `/media/` で始まる場合、`{CMS_API_URL}/media/...` に書き換える
- [ ] `src/pages/wiki/[slug].astro` に OGP メタタグを追加（`og:title`, `og:type`, `og:url`）
- [ ] Wiki ページ一覧ページにもメタデータを追加

**補足**: メディア URL の変換は `marked` の renderer オプションで `image` メソッドをオーバーライドして実装する。

**テスト（ユニット）**:

- [ ] `markdown.test.ts` にメディア URL 解決のテストケースを追加:
  - `![alt](/media/image.png)` が `<img src="{CMS_API_URL}/media/image.png">` に変換されること
  - 外部 URL の画像（`https://example.com/img.png`）はそのまま維持されること
- [ ] `vitest run --project unit` が全件パスすること

**テスト（ビルド成果物）**:

- [ ] `src/__tests__/build-output/iteration-5.test.ts` を作成し、以下を検証:
  - ビルド済み HTML 内の `<img src>` が `{CMS_API_URL}/media/...` 形式に解決されていること
  - 外部 URL の `<img src>` が���換されていないこと
  - 個別ページ HTML に `og:title`, `og:type`, `og:url` の `<meta>` 要素が存在し、値が正しいこと
  - `dist/wiki/index.html` にもメタタグが設定されていること
- [ ] `vitest run --project build` が全件パスすること

**テスト（スクリーンショット確認）**:

- [ ] フィクスチャに画像を含む Markdown ページを追加してスクリーンショットを再撮影
- [ ] エージェントがスクリーンショットを読み込み、以下を視覚確認:
  - 画像がページ内に表示されていること（壊れた画像アイコンでないこと）
  - 画像がコンテンツ幅に適切に収まっていること

---

### Iteration 6: Webhook 再ビルド設定

**ゴール**: CMS でコンテンツを更新したら、サイトが自動的に再ビルドされる

**確認できる成果物**: CMS でページを公開 → サイトが自動で再ビルド・デプロイされ、新しいページが表示される

**タスク**:

- [ ] デプロイ先の CI/CD でビルドトリガー（Webhook エンドポイント）を設定する
- [ ] CMS の環境変数 `webhook.url` にビルドトリガー URL を設定する
- [ ] CMS でページを公開し、Webhook が発火してサイトが再ビルドされることを確認する

**補足**: 具体的な設定手順はデプロイ先（Cloudflare Pages、Vercel、GitHub Actions 等）に依存する。Website 側のコード変更は不要。

**テスト（ユニット）**:

- [ ] 新規テスト追加なし（Website 側のコード変更がない）
- [ ] `vitest run --project unit` が全件パスすること（リグレッションなし）

**テスト（ビルド成果物）**:

- [ ] 新規テスト追加なし（Website 側のコード変更がない）
- [ ] `vitest run --project build` が全件パスすること（リグレッションなし）

**自動化対象外（手動確認）**:

- [ ] CMS でページを公開し、Webhook が発火してサイトが自動で再ビルド・デプロイされること
- [ ] 再ビルド後、新しいページが `/wiki/{slug}` で表示されること

※ Webhook 連携は外部 CI/CD サービスとの結合であり、テストハーネスのスコープ外

---

## リスク・懸念事項

| リスク | 影響 | 対策 |
|--------|------|------|
| CMS サーバーのダウン時にビルドが失敗する | 新しいコンテンツがデプロイされない | 静的サイトのため既存ページは配信継続。CMS の稼働監視を検討 |
| ページ数が増えた場合のビルド時間増加 | デプロイが遅くなる | 当面は問題なし。将来的に Astro の ISR 検討 |
| CMS の画像が `/media/` 以外のパスで参照される可能性 | 画像が表示されない | CMS エディタ側で `/media/` 形式に統一する運用ルール |
| ナビゲーションの `pageId` に対応するページが未公開の場合 | リンク切れになる | ナビゲーション構築時に公開済みページのみフィルタする |
