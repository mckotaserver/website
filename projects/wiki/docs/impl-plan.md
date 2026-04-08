# 実装計画書

## 概要

- **プロダクト名**: KotaServer Wiki
- **目的**: CMS（kotaserver-web-admin）で管理するコンテンツを Wiki ページとして Astro の静的サイト上で配信する
- **参照ドキュメント**: [要件定義書](requirements.md), [仕様書](specification.md)

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

---

### Iteration 3: ページ一覧

**ゴール**: 公開済みページを一覧で確認でき、個別ページに遷移できる

**確認できる成果物**: `/wiki/` にアクセスすると、Wiki ページのカード一覧が表示され、クリックで個別ページに遷移する

**タスク**:

- [ ] `src/components/WikiCard.astro` を作成 — ページタイトルと更新日時を表示するカードコンポーネント
- [ ] `src/pages/wiki/index.astro` を作成 — `getPages()` で全公開ページを取得し、更新日時の降順で `WikiCard` を一覧表示
- [ ] Wiki ページ一覧用の CSS スタイルを追加

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

---

### Iteration 5: メディア URL 解決 & OGP

**ゴール**: Markdown 内の画像が正しく表示され、SNS シェア時にページ情報が表示される

**確認できる成果物**: CMS で画像を含むページを作成し、`/wiki/{slug}` で画像が表示される。ページ URL を SNS に貼ると OGP 情報が表示される

**タスク**:

- [ ] `marked` の renderer をカスタマイズ — 画像の `src` が `/media/` で始まる場合、`{CMS_API_URL}/media/...` に書き換える
- [ ] `src/pages/wiki/[slug].astro` に OGP メタタグを追加（`og:title`, `og:type`, `og:url`）
- [ ] Wiki ページ一覧ページにもメタデータを追加

**補足**: メディア URL の変換は `marked` の renderer オプションで `image` メソッドをオーバーライドして実装する。

---

### Iteration 6: Webhook 再ビルド設定

**ゴール**: CMS でコンテンツを更新したら、サイトが自動的に再ビルドされる

**確認できる成果物**: CMS でページを公開 → サイトが自動で再ビルド・デプロイされ、新しいページが表示される

**タスク**:

- [ ] デプロイ先の CI/CD でビルドトリガー（Webhook エンドポイント）を設定する
- [ ] CMS の環境変数 `webhook.url` にビルドトリガー URL を設定する
- [ ] CMS でページを公開し、Webhook が発火してサイトが再ビルドされることを確認する

**補足**: 具体的な設定手順はデプロイ先（Cloudflare Pages、Vercel、GitHub Actions 等）に依存する。Website 側のコード変更は不要。

---

## リスク・懸念事項

| リスク | 影響 | 対策 |
|--------|------|------|
| CMS サーバーのダウン時にビルドが失敗する | 新しいコンテンツがデプロイされない | 静的サイトのため既存ページは配信継続。CMS の稼働監視を検討 |
| ページ数が増えた場合のビルド時間増加 | デプロイが遅くなる | 当面は問題なし。将来的に Astro の ISR 検討 |
| CMS の画像が `/media/` 以外のパスで参照される可能性 | 画像が表示されない | CMS エディタ側で `/media/` 形式に統一する運用ルール |
| ナビゲーションの `pageId` に対応するページが未公開の場合 | リンク切れになる | ナビゲーション構築時に公開済みページのみフィルタする |
