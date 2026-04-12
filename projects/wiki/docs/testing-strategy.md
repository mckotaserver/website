# KotaServer Wiki テスト戦略

## 概要

本ドキュメントは KotaServer Wiki プロジェクトのテスト方針を定める。
SSG（静的サイト生成）というアーキテクチャ特性を踏まえ、ビルド時ロジックの信頼性確保に重点を置く。

実装はエージェントが自走するワークフローを想定しており、人間の目視確認に依存しないテスト自動化を目指す。

**参照ドキュメント**: [要件定義書](requirements.md), [仕様書](specification.md), [実装計画書](impl-plan.md), [テストハーネス検討](testing-harness-analysis.md)

---

## 1. テスト対象の分析

### 1.1 テスト可能なレイヤー

| レイヤー | 対象 | リスク | テスト優先度 |
|---------|------|--------|:----------:|
| API クライアント | `cms-client.ts` — fetch ラッパー、認証ヘッダー付与、エラーハンドリング | CMS との接続が全機能の基盤。障害時ビルドが失敗する | **高** |
| Markdown レンダリング | `marked` による変換、画像 URL 解決（`/media/` → CMS URL） | 不正な HTML 出力やリンク切れが直接ユーザー体験に影響 | **高** |
| 型定義 | `types.ts` — CMS レスポンスの型 | TypeScript コンパイラが検証するため、テスト不要 | — |
| Astro コンポーネント | Navigation, WikiCard, WikiLayout, ページテンプレート | 主にテンプレート。ロジックは少なく、目視確認が効率的 | **低** |
| ナビゲーション構築 | `pageId` → slug 解決、`sortOrder` ソート、未公開ページのフィルタ | ロジックが複雑でエッジケースがある | **中** |

### 1.2 テスト対象外

- **Astro フレームワーク自体の動作**（ルーティング、`getStaticPaths` の仕組み等）
- **CMS サーバー（kotaserver-web-admin）** — 別リポジトリで管理・テスト
- **CI/CD・Webhook 連携** — インフラ設定であり、デプロイ後に手動確認で対応

---

## 2. テストツール

### 2.1 採用ツール

| ツール | 用途 | 選定理由 |
|-------|------|---------|
| **Vitest** | ユニットテスト | Astro 公式推奨。Vite ベースで高速。ESM ネイティブ対応。`import.meta.env` との互換性あり |

### 2.2 採用ツール（補助）

| ツール | 用途 | 選定理由 |
|-------|------|---------|
| **cheerio** | ビルド成果物の HTML パース | jQuery ライクな API で DOM を検索・検証できる。ブラウザ不要。軽量 |
| **Playwright** | スクリーンショット撮影 | ビルド成果物を実際にブラウザでレンダリングし、スクリーンショットを保存する。エージェントが画像を読み込んで視覚的に確認する |

### 2.3 不採用ツール

| ツール | 不採用理由 |
|-------|-----------|
| Jest | ESM 対応が不完全。Astro プロジェクトでは Vitest が推奨 |
| Testing Library | Astro コンポーネントのレンダリングテストは公式サポートが限定的。ロジックをユーティリティに切り出してテストする方が効率的 |

### 2.4 セットアップ

```bash
pnpm add -D vitest cheerio @playwright/test
npx playwright install chromium
```

`vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'unit',
          globals: true,
          environment: 'node',
          include: ['src/lib/__tests__/**/*.test.ts'],
        },
      },
      {
        test: {
          name: 'build',
          globals: true,
          environment: 'node',
          include: ['src/__tests__/build-output/**/*.test.ts'],
          testTimeout: 120_000,
          pool: 'forks',
          poolOptions: { forks: { singleFork: true } },
        },
      },
    ],
  },
});
```

`playwright.config.ts`:
```typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './src/__tests__/screenshots',
  outputDir: './test-results',
  use: {
    baseURL: 'http://localhost:4321',
  },
  webServer: {
    command: 'pnpm astro preview',
    port: 4321,
    reuseExistingServer: true,
  },
});
```

`package.json` に追加:
```json
{
  "scripts": {
    "test": "vitest run --project unit",
    "test:build": "vitest run --project build",
    "test:screenshots": "playwright test",
    "test:all": "vitest run && playwright test"
  }
}
```

---

## 3. テスト方針

### 3.1 基本原則

1. **ロジックをテストし、テンプレートはテストしない** — Astro コンポーネント（`.astro`）のレンダリングテストは行わない。テスト可能なロジックは `.ts` ファイルに切り出す
2. **CMS API はモックする** — ユニットテストでは `fetch` を `vi.fn()` でモック。ビルド成果物テスト・スクリーンショット確認ではモック CMS サーバー（`node:http`）を起動する
3. **ビルド成果物を検証する** — `astro build` で生成された `dist/` 内の HTML を cheerio でパースし、DOM 構造・テキスト内容・属性値をアサートする
4. **スクリーンショットでエージェントが視覚確認する** — Playwright でスクリーンショットを撮影し���エージェントが画像を読み込んで CSS レイアウト・レスポンシブ表示を確認する。人間の目視確認を代替する
5. **テストはイテレーションと同時に書く** — 実装と同じイテレーションでテストを追加する

### 3.2 テスト分類

```
ユニットテスト（Vitest, test:unit）
├── API クライアントの関数単位テスト
├── Markdown レンダリングのロジックテスト
└── ナビゲーション構築ロジックのテスト

ビルド成果物テスト（Vitest, test:build）
├── モック CMS サーバーを起動
├── astro build を実行
└── dist/ 内の HTML を cheerio でパースして検証
    ├── ページ表示（タイトル、本文、構造）
    ├── Markdown レンダリング結果
    ├── ページ一覧（カード、ソート順、リンク先）
    ├── ナビゲーション（メニュー項目、リンク、並び順）
    ├── メディア URL 解決（画像 src 属性）
    └── OGP メタタグ

スクリーンショット確認（Playwright, test:screenshots）
├── ビルド成果物を astro preview で配信
├── Playwright でページを開きスクリーンショットを撮影
├── 複数ビューポート（デスクトップ・モバイル）で撮影
└── エージェントが画像を読み込み視覚的に確認
    ├── レイアウトが崩れていないか
    ├── CSS スタイリングが適用されているか
    └── レスポンシブで要素が適切に配置されて��るか

自動化対象外
└── Webhook 再ビルド（外部 CI/CD との結合）
```

---

## 4. テストケース

### 4.1 API クライアント（`cms-client.ts`）

**テストファイル**: `src/lib/__tests__/cms-client.test.ts`

| # | テストケース | 検証内容 |
|---|------------|---------|
| 1 | `fetchCms` が正しいヘッダーを付与する | `X-API-Key` ヘッダーが `CMS_API_KEY` の値で送信される |
| 2 | `fetchCms` が正しい URL を構築する | `CMS_API_URL` + パスが正しく結合される |
| 3 | `getPages` がページ一覧を返す | 正常レスポンスをパースして返す |
| 4 | `getPageBySlug` が個別ページを返す | slug を URL に含めてリクエストし、レスポンスを返す |
| 5 | `getNavigation` がナビゲーション一覧を返す | 正常レスポンスをパースして返す |
| 6 | API エラー時に例外をスローする | 401/404/500 レスポンスで適切なエラーメッセージと共にスローする |
| 7 | 環境変数未設定時にエラーになる | `CMS_API_URL` や `CMS_API_KEY` が未設定の場合、わかりやすいエラーメッセージをスローする |

**モック方針**: `globalThis.fetch` を `vi.fn()` でモックする。

```typescript
// テスト例のイメージ
describe('cms-client', () => {
  beforeEach(() => {
    vi.stubEnv('CMS_API_URL', 'http://localhost:8080');
    vi.stubEnv('CMS_API_KEY', 'test-api-key');
    vi.stubGlobal('fetch', vi.fn());
  });

  it('sends X-API-Key header', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ data: [], total: 0, offset: 0, limit: 20 }))
    );
    await getPages();
    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:8080/api/v1/pages?offset=0&limit=1000',
      expect.objectContaining({
        headers: expect.objectContaining({ 'X-API-Key': 'test-api-key' }),
      })
    );
  });
});
```

### 4.2 Markdown レンダリング

**テストファイル**: `src/lib/__tests__/markdown.test.ts`

| # | テストケース | 検証内容 |
|---|------------|---------|
| 1 | 基本的な Markdown が HTML に変換される | 見出し、段落、リスト、コードブロックが正しい HTML になる |
| 2 | `/media/` パスの画像が CMS URL に変換される | `![alt](/media/image.png)` → `<img src="http://localhost:8080/media/image.png">` |
| 3 | 外部 URL の画像はそのまま維持される | `![alt](https://example.com/img.png)` → 変換されない |
| 4 | 空文字列を渡した場合 | エラーにならず空文字列を返す |

### 4.3 ナビゲーション構築ロジック

**テストファイル**: `src/lib/__tests__/navigation.test.ts`

ナビゲーション構築にロジック（`pageId` → slug 解決、ソート等）が含まれる場合、ヘルパー関数として切り出してテストする。

| # | テストケース | 検証内容 |
|---|------------|---------|
| 1 | `sortOrder` 昇順でソートされる | ナビ項目が `sortOrder` の昇順に並ぶ |
| 2 | `pageId` が存在するナビ項目にリンクが生成される | 公開済みページの slug から `/wiki/{slug}` リンクが生成される |
| 3 | `pageId` が `null` のナビ項目はリンクなし | ラベルのみの項目が正しく処理される |
| 4 | `pageId` に対応するページが未公開の場合 | 該当項目がフィルタされるか、リンクなしになる |

### 4.4 ビルド成果物テスト

SSG ビルドで生成された `dist/` 内の HTML をパースし、従来の手動目視確認に相当する検証を自動で行う。

**共通基盤**:
- モック CMS サーバー（`node:http`）をテストプロセス内で起動し、フィクスチャ JSON を返す
- `astro build` をモック CMS 向けの環境変数で実行
- 生成された HTML ファイルを cheerio でパースしてアサーション

**テストファイル**: `src/__tests__/build-output/iteration-{N}.test.ts`

#### Iteration 1: ページ表示

| # | テストケース | 検証内容 |
|---|------------|---------|
| 1 | Wiki ページの HTML が生成される | `dist/wiki/{slug}/index.html` が存在する |
| 2 | ページタイトルが表示される | HTML 内にフィクスチャのタイトルテキストが含まれる |
| 3 | ページ本文が表示される | HTML 内にフィクスチャの本文テキストが含まれる |
| 4 | 想定外の slug が生成されない | `dist/wiki/` 内のディレクトリがフィクスチャの slug のみ |

#### Iteration 2: Markdown レンダリング & レイアウト

| # | テストケース | 検証内容 |
|---|------------|---------|
| 1 | Markdown が HTML 要素に変換されている | `<h2>`, `<ul>`, `<pre><code>` 等の要素が存在する |
| 2 | `<title>` が正しい形式 | `<title>` の内容が `{タイトル} \| KotaServer` にマッチする |
| 3 | WikiLayout のセマンティック構造 | `<header>`, `<main>`, `<footer>` 要素が存在する |

#### Iteration 3: ページ一覧

| # | テストケース | 検証内容 |
|---|------------|---------|
| 1 | 一覧ページが生成される | `dist/wiki/index.html` が存在する |
| 2 | カード要素がページ数分存在する | カード要素の数がフィクスチャのページ数と一致する |
| 3 | カードにタイトルと更新日時がある | 各カード内にフィクスチャのタイトル・日時テキストが含まれる |
| 4 | カードが更新日時の降順で並ぶ | カード要素を順に取得し、日時が降順であることを検証 |
| 5 | カードのリンク先が正しい | `<a href>` が `/wiki/{slug}` 形式である |
| 6 | 0 件の場合にビルドが成功する | 空配列フィクスチャでビルドし、`dist/wiki/index.html` が生成される |

#### Iteration 4: ナビゲーション

| # | テストケース | 検証内容 |
|---|------------|---------|
| 1 | ナビメニューが表示される | ナビ要素内にフィクスチャのラベルが含まれる |
| 2 | リンク先が正しい | `pageId` 付きナビ項目の `<a href>` が `/wiki/{slug}` を指す |
| 3 | トップページリンクが先頭 | ナビの最初のリンクが `/` である |
| 4 | 並び順が `sortOrder` 順 | ナビ項目の順序がフィクスチャの `sortOrder` 昇順と一致する |

#### Iteration 5: メディア URL & OGP

| # | テストケース | 検証内容 |
|---|------------|---------|
| 1 | `/media/` 画像の URL が解決されている | `<img src>` が `{CMS_API_URL}/media/...` 形式である |
| 2 | 外部画像 URL はそのまま | 外部 URL の `<img src>` が変換されていない |
| 3 | OGP メタタグが設定されている | `og:title`, `og:type`, `og:url` の `<meta>` 要素が存在し値が正しい |
| 4 | 一覧ページにもメタデータがある | `dist/wiki/index.html` にメタタグが存在する |

### 4.5 スクリーンショット確認

Playwright でビルド成果物をブラウザレンダリングし、スクリーンショットを撮影する。撮影した画像はエージェントが Read ツールで読み込み、視覚的に確認する。

**目的**: DOM 構造テスト（cheerio）ではカバーできない CSS レイアウト・レスポンシブ表示の確認を、人間の目視確認なしで実現する。

**仕組み**:
- Playwright はスクリーンショットを撮影して保存するだけ（pass/fail の自動判定はしない）
- エージェントが画像ファイルを読み込み、表示内容を確認して判断する
- ベースライン画像の管理やピクセル比較は不要

**テストファイル**: `src/__tests__/screenshots/capture.test.ts`

**撮影対象**:

| ページ | ビューポ���ト | 確認観点 |
|--------|------------|---------|
| `/wiki/{slug}`（個別ページ） | デスクトップ（1280x720） | レイアウト、Markdown レンダリング結果、ナビゲーション配置 |
| `/wiki/{slug}`（個別ページ） | モバイル（375x667） | レスポンシブ対応、ナビゲーションの折り返し |
| `/wiki/`（一覧ページ） | デスクトップ（1280x720） | カード一覧のグリッドレイアウト |
| `/wiki/`（一覧ページ） | モバイル（375x667） | カードの縦並び |

**実装イメージ**:

```typescript
import { test } from '@playwright/test';

const viewports = {
  desktop: { width: 1280, height: 720 },
  mobile: { width: 375, height: 667 },
};

for (const [name, size] of Object.entries(viewports)) {
  test(`wiki page - ${name}`, async ({ page }) => {
    await page.setViewportSize(size);
    await page.goto('/wiki/getting-started');
    await page.screenshot({
      path: `test-results/wiki-page-${name}.png`,
      fullPage: true,
    });
  });

  test(`wiki index - ${name}`, async ({ page }) => {
    await page.setViewportSize(size);
    await page.goto('/wiki/');
    await page.screenshot({
      path: `test-results/wiki-index-${name}.png`,
      fullPage: true,
    });
  });
}
```

**エージェントの確認フロー**:

1. `playwright test` を実行してスクリーンショットを撮影
2. `test-results/*.png` をRead ツールで読み込む
3. 以下の観点で画像を確認:
   - ページの主要な構造要素（ヘッダー、コンテンツ、フッター）が視認できるか
   - テキストが読める状態で表示されているか
   - レイアウトが明らかに崩れていないか（要素の重なり、はみ出し等）
   - モバイルビューポートで適切にリフローされているか
4. 問題があれば CSS を修正し、再撮影して確認

---

## 5. テストファイル配置

```
src/
  lib/
    __tests__/
      cms-client.test.ts        # Iteration 1 で作成
      markdown.test.ts           # Iteration 2 で作成
      navigation.test.ts         # Iteration 4 で作成
    cms-client.ts
    types.ts
  __tests__/
    fixtures/
      pages.json                 # モック CMS レスポンス（ページ一覧）
      navigation.json            # モック CMS レスポンス（ナビゲーション）
      media.json                 # モック CMS レスポンス（メディア）
    helpers/
      mock-cms-server.ts         # モック CMS HTTP サーバー
      build.ts                   # astro build 実行ヘルパー
      html.ts                    # HTML 読み込み・cheerio パースヘルパー
    build-output/
      iteration-1.test.ts        # Iteration 1 ビルド成果物検証
      iteration-2.test.ts        # Iteration 2 ビルド成果物検証
      iteration-3.test.ts        # Iteration 3 ビルド成果物検証
      iteration-4.test.ts        # Iteration 4 ビルド成果物検証
      iteration-5.test.ts        # Iteration 5 ビルド成果物検証
    screenshots/
      capture.test.ts            # Playwright スクリーンショット撮影
playwright.config.ts             # Playwright 設定
test-results/                    # スクリーンショット出力先（.gitignore に追加）
```

- ユニットテスト: 対象モジュールと同じディレクトリ内の `__tests__/` に配置
- ビルド成果物テスト: `src/__tests__/build-output/` に配置。ヘルパーとフィクスチャは `src/__tests__/` 直下に共有
- スクリーンショット: `src/__tests__/screenshots/` に Playwright テスト、`test-results/` に画像を出力

---

## 6. テストハーネス共通基盤

### 6.1 モック CMS サーバー

`node:http` で実装する軽量 HTTP サーバー。テストプロセス内で起動・停止する。

- フィクスチャ JSON をエンドポイントごとに返す
- `X-API-Key` ヘッダーの検証を行う（不正なキーには 401 を返す）
- ポートは `18080`（実環境の `8080` と競合しない）

### 6.2 ビルド実行ヘルパー

`execSync` で `astro build` を実行する。環境変数をモック CMS 向けに差し替えて渡す。

### 6.3 HTML パースヘルパー

`dist/` 内の HTML ファイルを読み込み、cheerio の `CheerioAPI` オブジェクトを返す。パスの正規化（`/wiki/slug` → `dist/wiki/slug/index.html`）を内部で行う。

---

## 7. イテレーション別テスト計画

| Iteration | ユニットテスト | ビルド成果物テスト | スクリーンショット確認 |
|:---------:|-------------|----------------|------------------|
| 1 | Vitest + cheerio セットアップ。`cms-client.test.ts` | テストハーネス基盤構築（モック CMS サーバー、ヘルパー、フィクスチャ）。`iteration-1.test.ts`（ページ表示、slug 確認） | — （CSS スタイリング未実装） |
| 2 | `markdown.test.ts`（基本変換） | `iteration-2.test.ts`（Markdown レンダリング、`<title>` 形式、WikiLayout 構造） | Playwright セットアップ。`capture.test.ts` 作成。個別ページのスクリーンショットで Markdown レンダリング・WikiLayout を視覚確認 |
| 3 | — | `iteration-3.test.ts`（カード一覧、表示項目、ソート順、リンク先、0 件ケース） | `capture.test.ts` に一覧ページを追加。カードグリッドレイアウトを視覚確認 |
| 4 | `navigation.test.ts` + `cms-client.test.ts` 追加 | `iteration-4.test.ts`（ナビメニュー、リンク先、先頭固定、並び順） | ナビゲーションの表示・配置を視覚確認。モバイルビューポートでのレスポンシブ対応を確認 |
| 5 | `markdown.test.ts` にメディア URL 解決追加 | `iteration-5.test.ts`（画像 URL 解決、OGP メタタグ） | 画像を含むページのスクリーンショットで画像表示を視覚確認 |
| 6 | — | — | —（Webhook は外部 CI/CD のため対象外） |

---

## 8. CI 統合

`package.json` の `build` スクリプトにユニットテスト実行を組み込む:

```json
{
  "scripts": {
    "build": "vitest run --project unit && astro check && astro build"
  }
}
```

ビルド成果物テスト（`test:build`）は `astro build` 自体を内部で実行するため、`build` スクリプトには含めない。スクリーンショット確認（`test:screenshots`）はエージェントが画像を目視するステップを含むため、CI パイプラインには組み込まず、エージェントの実装ワークフロー内で実行する。

CI パイプラインでの実行順:

```
vitest run --project unit  →  astro check  →  astro build  →  vitest run --project build
```

エージェント実装ワークフローでの実行順:

```
vitest run --project unit  →  astro check  →  astro build  →  vitest run --project build  →  playwright test  →  エージェントがスクリーンショットを確認
```

---

## 9. 判断の根拠

### なぜ 3 層のテスト構成か

本プロジェクトはエージェント自走ワークフローで実装するため、人間の介入なしに品質を担保する必要がある。各層の役割:

| 層 | 目的 | 判定方法 |
|---|------|---------|
| ユニットテスト | ロジックの正しさ | 機械的（pass/fail） |
| ビルド成果物テスト | HTML 構造・内容の正しさ | 機械的（pass/fail） |
| スクリーンショット確認 | 視覚的な表示品質 | エージェントが画像を確認して判断 |

### なぜスクリーンショットでエージェントが確認するか

- CSS レイアウトやレスポンシブ表示は DOM 構造テストではカバーできない
- 従来は人間が開発サーバーを開いて目視確認していたが、エージェント自走ワークフローでは人間が介入できない
- AI エージェントはマルチモーダルであり、スクリーンショット画像を読み込んで表示内容を判断できる
- VRT（ベースライン比較）と異なり、初回実装時から「正しく見えるか」を判断できる
- ベースライン管理やピクセル比較の仕組みが不要で、導入・運用がシンプル

### なぜ VRT（Visual Regression Testing）を採用しないか

- VRT は初回にベースラインを生成するが、そのベースラインが「正しいか」は別途確認が必要
- エージェントが画像を直接確認する方が、初回から判断可能で仕組みもシンプル
- 環境間のフォントレンダリング差異によるノイズも問題にならない

### なぜコンポーネントテストを行わないか

- Astro コンポーネントは `.astro` 形式であり、テストランナーでのレンダリングサポートが限定的
- コンポーネントのロジック部分はユーティリティ関数に切り出してユニットテストする方が確実かつ保守しやすい
- コンポーネントの出力結果はビルド成果物テスト + スクリーンショット確認で検証する

### 自動化対象外

| 項目 | 理由 |
|------|------|
| Webhook 再ビルド | 外部 CI/CD サービスとの結合テスト。デプロイ後に手動確認 |
