# 自動テストハーネス検討

## 結論

手動テスト項目の **大半は自動化可能**。SSG の「ビルド成果物が静的 HTML ファイル」という特性を活かし、ビルド後の HTML を解析するアプローチで実現できる。

自動化不可能なのは **CSS の視覚的なレイアウト確認** のみ。ただし、これはエージェント自走ワークフローにおいてはスコープ外として許容できる。

---

## 1. 基本アプローチ

```
フィクスチャ JSON  ──▶  モック CMS サーバー  ──▶  astro build  ──▶  dist/ の HTML を解析
                        (localhost:18080)          (SSG ビルド)        (cheerio でパース)
```

1. **モック CMS サーバー** — フィクスチャデータを返す軽量 HTTP サーバーをテストプロセス内で起動
2. **Astro ビルド実行** — モック CMS を向いた環境変数で `astro build` を実行し、`dist/` に静的 HTML を生成
3. **HTML 解析** — 生成された HTML ファイルを読み込み、cheerio（または node-html-parser）で DOM をパースしてアサーション

ブラウザは不要。Node.js だけで完結する。

---

## 2. 手動テスト項目の自動化可否

### Iteration 1: CMS API 接続 & 最初のページ表示

| 手動テスト項目 | 自動化 | 方法 |
|--------------|:------:|------|
| `/wiki/{slug}` にタイトルと本文が表示される | **可** | `dist/wiki/{slug}/index.html` を読み込み、タイトル・本文テキストの存在をアサート |
| 存在しない slug にアクセスした場合の動作 | **可** | `dist/` 内に想定外の slug ディレクトリが生成されていないことをアサート |

### Iteration 2: Markdown レンダリング & ページレイアウト

| 手動テスト項目 | 自動化 | 方法 |
|--------------|:------:|------|
| Markdown が正しくレンダリングされる | **可** | HTML 内に `<h2>`, `<ul>`, `<pre><code>` 等の要素が存在することをアサート |
| `<title>` が正しい形式になっている | **可** | `<title>` タグの内容を取得し、`{タイトル} \| KotaServer` 形式をアサート |
| WikiLayout のヘッダー・フッター・コンテンツエリアが存在する | **可** | 各セクションのセマンティック要素（`<header>`, `<footer>`, `<main>` 等）の存在をアサート |

### Iteration 3: ページ一覧

| 手動テスト項目 | 自動化 | 方法 |
|--------------|:------:|------|
| カード一覧が表示される | **可** | `dist/wiki/index.html` 内のカード要素数をアサート |
| タイトルと更新日時が表示されている | **可** | 各カード内のテキスト内容をアサート |
| 更新日時の降順で並んでいる | **可** | カード要素を順に取得し、日時の降順をアサート |
| カードのリンク先が正しい | **可** | `<a href>` 属性が `/wiki/{slug}` 形式であることをアサート |
| 0 件の場合にエラーにならない | **可** | フィクスチャを空配列にしてビルドし、`dist/wiki/index.html` が生成されることをアサート |

### Iteration 4: ナビゲーション連携

| 手動テスト項目 | 自動化 | 方法 |
|--------------|:------:|------|
| ナビゲーションメニューが表示される | **可** | HTML 内のナビ要素にメニュー項目が存在することをアサート |
| リンクをクリックして正しいページに遷移する | **可** | ナビのリンク `href` が正しい `/wiki/{slug}` を指していることをアサート |
| トップページリンクが先頭に表示される | **可** | ナビの最初のリンクが `/` であることをアサート |
| 並び順が反映される | **可** | ナビ項目の順序がフィクスチャの `sortOrder` 順と一致することをアサート |

### Iteration 5: メディア URL 解決 & OGP

| 手動テスト項目 | 自動化 | 方法 |
|--------------|:------:|------|
| 画像が正しく表示される | **可** | `<img src>` が `{CMS_API_URL}/media/...` 形式であることをアサート（実際の画像表示はブラウザ依存だが、URL の正しさは検証可能） |
| OGP メタタグが設定されている | **可** | `<meta property="og:title">` 等の存在と値をアサート |
| 一覧ページにもメタデータがある | **可** | `dist/wiki/index.html` のメタタグをアサート |

### Iteration 6: Webhook 再ビルド

| 手動テスト項目 | 自動化 | 方法 |
|--------------|:------:|------|
| Webhook が発火してサイトが再ビルドされる | **不可** | デプロイ先 CI/CD との結合であり、テストハーネスのスコープ外 |

### 自動化できないもの

| 項目 | 理由 |
|------|------|
| CSS の視覚的レイアウト | DOM 構造は検証できるが、「見た目が正しいか」はブラウザレンダリングが必要 |
| レスポンシブ表示 | ビューポートサイズごとの表示はブラウザが必要 |
| Webhook 再ビルド | 外部 CI/CD サービスとの結合テスト |

---

## 3. 実装設計

### 3.1 追加パッケージ

```bash
pnpm add -D cheerio
```

- **cheerio** — サーバーサイドの高速 HTML パーサー。jQuery ライクな API で DOM を操作・検索できる。ブラウザ不要
- Vitest は Iteration 1 で導入済み

### 3.2 ファイル構成

```
src/
  lib/
    __tests__/
      cms-client.test.ts       # ユニットテスト（既存）
      markdown.test.ts          # ユニットテスト（既存）
      navigation.test.ts        # ユニットテスト（既存）
  __tests__/
    fixtures/
      pages.json                # モック CMS レスポンス（ページ一覧）
      navigation.json           # モック CMS レスポンス（ナビゲーション）
      media.json                # モック CMS レスポンス（メディア）
    helpers/
      mock-cms-server.ts        # モック CMS HTTP サーバー
      build.ts                  # astro build 実行ヘルパー
      html.ts                   # HTML 読み込み・パースヘルパー
    build-output/
      iteration-1.test.ts       # Iteration 1 のビルド成果物検証
      iteration-2.test.ts       # Iteration 2 のビルド成果物検証
      iteration-3.test.ts       # Iteration 3 のビルド成果物検証
      iteration-4.test.ts       # Iteration 4 のビルド成果物検証
      iteration-5.test.ts       # Iteration 5 のビルド成果物検証
```

### 3.3 モック CMS サーバー

テストプロセス内で `node:http` を使い、フィクスチャ JSON を返す軽量サーバーを起動する。

```typescript
// mock-cms-server.ts のイメージ
import { createServer, type Server } from 'node:http';
import pages from '../fixtures/pages.json';
import navigation from '../fixtures/navigation.json';

export function startMockCms(port = 18080): Promise<Server> {
  const server = createServer((req, res) => {
    // API キー検証
    if (req.headers['x-api-key'] !== 'test-api-key') {
      res.writeHead(401);
      res.end(JSON.stringify({ error: 'unauthorized' }));
      return;
    }

    const url = new URL(req.url!, `http://localhost:${port}`);

    if (url.pathname === '/api/v1/pages') {
      res.end(JSON.stringify({ data: pages, total: pages.length, offset: 0, limit: 1000 }));
    } else if (url.pathname.startsWith('/api/v1/pages/')) {
      const slug = url.pathname.split('/').pop();
      const page = pages.find(p => p.slug === slug);
      page ? res.end(JSON.stringify(page)) : res.writeHead(404).end();
    } else if (url.pathname === '/api/v1/navigation') {
      res.end(JSON.stringify(navigation));
    } else {
      res.writeHead(404).end();
    }
  });

  return new Promise(resolve => server.listen(port, () => resolve(server)));
}
```

### 3.4 ビルド実行ヘルパー

```typescript
// build.ts のイメージ
import { execSync } from 'node:child_process';

export function runAstroBuild(env: Record<string, string>): void {
  execSync('pnpm astro build', {
    cwd: process.cwd(),
    env: { ...process.env, ...env },
    stdio: 'pipe',
  });
}
```

### 3.5 HTML パースヘルパー

```typescript
// html.ts のイメージ
import { readFileSync } from 'node:fs';
import { load, type CheerioAPI } from 'cheerio';
import { join } from 'node:path';

const DIST_DIR = join(process.cwd(), 'dist');

export function loadPage(path: string): CheerioAPI {
  // '/wiki/test-slug' → 'dist/wiki/test-slug/index.html'
  const filePath = join(DIST_DIR, path, 'index.html');
  const html = readFileSync(filePath, 'utf-8');
  return load(html);
}
```

### 3.6 ビルド成果物テストの例

```typescript
// iteration-2.test.ts のイメージ
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { Server } from 'node:http';
import { startMockCms } from '../helpers/mock-cms-server';
import { runAstroBuild } from '../helpers/build';
import { loadPage } from '../helpers/html';

describe('Iteration 2: Markdown レンダリング & ページレイアウト', () => {
  let server: Server;

  beforeAll(async () => {
    server = await startMockCms(18080);
    runAstroBuild({
      CMS_API_URL: 'http://localhost:18080',
      CMS_API_KEY: 'test-api-key',
    });
  }, 60_000);

  afterAll(() => server.close());

  it('Markdown が HTML にレンダリングされている', () => {
    const $ = loadPage('/wiki/getting-started');
    expect($('article h2').length).toBeGreaterThan(0);
    expect($('article p').length).toBeGreaterThan(0);
  });

  it('<title> が正しい形式になっている', () => {
    const $ = loadPage('/wiki/getting-started');
    expect($('title').text()).toMatch(/^.+ \| KotaServer/);
  });

  it('WikiLayout のセマンティック要素が存在する', () => {
    const $ = loadPage('/wiki/getting-started');
    expect($('header').length).toBe(1);
    expect($('main').length).toBe(1);
    expect($('footer').length).toBe(1);
  });
});
```

### 3.7 テスト実行戦略

ビルド成果物テストは実行コストが高い（`astro build` に数秒かかる）ため、ユニットテストとは分離する。

```json
{
  "scripts": {
    "test": "vitest run",
    "test:build": "vitest run --project build",
    "test:all": "vitest run && vitest run --project build"
  }
}
```

`vitest.config.ts` で Vitest の project 機能を使い分ける:

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'unit',
          include: ['src/lib/__tests__/**/*.test.ts'],
        },
      },
      {
        test: {
          name: 'build',
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

---

## 4. イテレーション別テスト実装計画（改訂）

| Iteration | ユニットテスト | ビルド成果物テスト |
|:---------:|-------------|----------------|
| 1 | `cms-client.test.ts` | テストハーネス基盤構築（モック CMS サーバー、ヘルパー、フィクスチャ）。`iteration-1.test.ts`（ページ表示、slug 存在確認） |
| 2 | `markdown.test.ts` | `iteration-2.test.ts`（Markdown レンダリング、`<title>` 形式、WikiLayout 構造） |
| 3 | — | `iteration-3.test.ts`（カード一覧、表示項目、ソート順、リンク先、0 件ケース） |
| 4 | `navigation.test.ts` | `iteration-4.test.ts`（ナビメニュー表示、リンク先、先頭固定、並び順） |
| 5 | `markdown.test.ts` 追加 | `iteration-5.test.ts`（画像 URL 解決、OGP メタタグ） |
| 6 | — | — （Webhook は外部 CI/CD のため対象外） |

---

## 5. 制約と許容事項

| 項目 | 対応 |
|------|------|
| CSS の視覚的レイアウト | DOM 構造の存在確認で代替する。「正しく見えるか」ではなく「正しい構造か」を検証する。エージェント自走ワークフローでは許容範囲 |
| ビルド成果物テストの実行時間 | 1 回のビルドに数秒〜十数秒かかる。イテレーション内で 1 回のビルドを共有し、複数テストケースで検証する |
| Webhook 再ビルド | テストハーネスのスコープ外。デプロイ後に手動確認 |
| 画像の実際の表示 | URL の正しさは検証できるが、画像が実際にレンダリングされるかはブラウザ依存。URL 検証で十分とする |
