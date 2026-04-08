# KotaServer Wiki 仕様書

## 1. システム構成

### 1.1 アーキテクチャ

```
┌──────────────┐     Webhook      ┌──────────────────┐
│  CMS Server  │ ──────────────▶  │  ビルドシステム    │
│  (Ktor)      │                  │  (CI/CD)         │
│  :8080       │                  └────────┬─────────┘
│              │                           │ ビルド & デプロイ
│  Public API  │◀── GET ──┐                ▼
│  /api/v1/*   │          │       ┌──────────────────┐
└──────────────┘          │       │  Astro Website   │
                          │       │  (静的サイト)      │
                          └───────┤  ビルド時にAPI取得  │
                                  └──────────────────┘
```

- **ビルド方式**: Astro SSG（静的サイト生成）
- **データ取得タイミング**: ビルド時のみ。クライアントサイドからの API 呼び出しは行わない
- **メディア配信**: CMS サーバーの `/media/{filename}` から直接配信（認証不要）

### 1.2 技術スタック

| 項目 | 技術 |
|------|------|
| フレームワーク | Astro 6（既存） |
| データ取得 | ビルド時 `fetch()` |
| Markdown → HTML | `marked` |
| スタイリング | 既存 CSS を拡張 |

---

## 2. 環境変数

| 変数名 | 説明 | 必須 | デフォルト | 例 |
|--------|------|:----:|-----------|-----|
| `CMS_API_URL` | CMS の ベース URL | Yes | — | `http://localhost:8080` |
| `CMS_API_KEY` | 公開 API キー | Yes | — | `cms_a1b2c3...` |

- `.env` ファイルで管理し、`.gitignore` に追加する
- Astro は `.env` を自動的に読み込む（`import.meta.env` 経由ではなく `process.env` で参照。サーバーサイド専用のためプレフィックス不要）

---

## 3. CMS API 仕様（Website が利用する範囲）

### 3.1 認証

すべての `/api/v1/*` エンドポイントに対し、リクエストヘッダーで API キーを送信する。

```
X-API-Key: cms_a1b2c3...
```

認証失敗時のレスポンス:

```json
{
  "error": "unauthorized",
  "message": "Valid API key required"
}
```

### 3.2 共通レスポンス形式

#### ページネーション

```typescript
interface PaginatedResponse<T> {
  data: T[];
  total: number;
  offset: number;
  limit: number;
}
```

デフォルト: `offset=0`, `limit=20`

#### エラー

```typescript
interface ErrorResponse {
  error: string;
  message: string;
  details?: { field: string; message: string }[];
}
```

### 3.3 エンドポイント一覧

| メソッド | エンドポイント | レスポンス | クエリパラメータ |
|---------|--------------|-----------|----------------|
| GET | `/api/v1/pages` | `PaginatedResponse<PageResponse>` | `offset`, `limit` |
| GET | `/api/v1/pages/{slug}` | `PageResponse` | — |
| GET | `/api/v1/search` | `PaginatedResponse<PageResponse>` | `q`, `offset`, `limit` |
| GET | `/api/v1/navigation` | `NavigationItemResponse[]` | — |
| GET | `/api/v1/media` | `PaginatedResponse<MediaResponse>` | `offset`, `limit` |
| GET | `/api/v1/media/{id}` | `MediaResponse` | — |
| GET | `/media/{filename}` | ファイル本体（認証不要） | — |

### 3.4 レスポンス型

```typescript
interface PageResponse {
  id: string;          // UUID
  slug: string;
  title: string;
  body: string;        // Markdown テキスト
  status: "draft" | "published" | "archived";
  createdBy: string;   // UUID
  createdAt: string;   // ISO 8601
  updatedAt: string;   // ISO 8601
}

interface NavigationItemResponse {
  id: string;          // UUID
  pageId: string | null;
  label: string;
  sortOrder: number;
}

interface MediaResponse {
  id: string;          // UUID
  filename: string;    // ストレージ上のファイル名
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  uploadedBy: string;  // UUID
  createdAt: string;   // ISO 8601
}
```

---

## 4. API クライアント

### 4.1 ファイル構成

```
src/
  lib/
    cms-client.ts      # API クライアント
    types.ts           # 型定義
```

### 4.2 cms-client.ts 設計

```typescript
// 環境変数から設定を取得
const CMS_API_URL = process.env.CMS_API_URL;
const CMS_API_KEY = process.env.CMS_API_KEY;

// 共通の fetch ラッパー（X-API-Key ヘッダー付与）
async function fetchCms<T>(path: string): Promise<T>;

// 公開関数
async function getPages(): Promise<PaginatedResponse<PageResponse>>;
async function getPageBySlug(slug: string): Promise<PageResponse>;
async function getNavigation(): Promise<NavigationItemResponse[]>;
```

- ビルド時のみ実行されるため、エラー時はビルドを失敗させる（`throw` する）
- ページ一覧取得時は全件取得のため、`limit` に十分大きな値を指定するか、ページネーションをループする

---

## 5. ページ構成・ルーティング

### 5.1 URL 設計

| パス | ページ | データソース |
|------|--------|------------|
| `/` | トップページ | 既存のランディングページ（変更なし） |
| `/wiki/` | Wiki ページ一覧 | `GET /api/v1/pages` |
| `/wiki/{slug}` | Wiki 個別ページ | `GET /api/v1/pages/{slug}` |

### 5.2 Astro ファイル構成

```
src/
  pages/
    index.astro                # 既存トップページ
    wiki/
      index.astro              # Wiki ページ一覧
      [slug].astro             # Wiki 個別ページ（動的ルーティング）
  layouts/
    Layout.astro               # 既存ベースレイアウト
    WikiLayout.astro           # Wiki ページ用レイアウト
  components/
    Navigation.astro           # グローバルナビゲーション
    PageCard.astro             # ページ一覧のカード
```

### 5.3 動的ルーティング（`[slug].astro`）

Astro の `getStaticPaths()` を使用して、ビルド時に全公開ページのパスを生成する。

```typescript
export async function getStaticPaths() {
  const { data: pages } = await getPages();
  return pages.map((page) => ({
    params: { slug: page.slug },
    props: { page },
  }));
}
```

---

## 6. コンポーネント仕様

### 6.1 Navigation コンポーネント

- **データ**: `getNavigation()` で取得した `NavigationItemResponse[]`
- **表示**: `sortOrder` 昇順で各項目を表示
- **リンク生成**:
  - `pageId` が存在する場合 → 該当ページの slug を解決し `/wiki/{slug}` にリンク
  - `pageId` が `null` の場合 → `label` のみ表示（リンクなし）
- **配置**: `WikiLayout.astro` のヘッダー部分に組み込む
- **トップページ**: トップページへのリンクを先頭に固定で表示する

### 6.2 WikiCard コンポーネント

Wiki ページ一覧で使用するカードコンポーネント。

- **表示項目**: タイトル、更新日時
- **リンク**: `/wiki/{slug}` へ遷移

### 6.3 Wiki ページ一覧（`wiki/index.astro`）

- `getPages()` で全公開ページを取得
- `WikiCard` コンポーネントで一覧表示
- 更新日時の降順でソート

### 6.4 Wiki 個別ページ（`wiki/[slug].astro`）

- `WikiLayout.astro` を使用
- ページタイトルを `<h1>` で表示
- `body`（Markdown）を `marked` で HTML に変換して表示
- `<head>` 内に以下のメタデータを設定:
  - `<title>`: `{ページタイトル} | KotaServer Wiki`
  - `og:title`: ページタイトル
  - `og:type`: `article`
  - `og:url`: ページの完全 URL

---

## 7. Markdown レンダリング

### 7.1 ライブラリ

`marked` を使用する。

```bash
pnpm add marked
```

### 7.2 メディア URL の解決

CMS の Markdown エディタでは、画像を以下の形式で挿入する:

```markdown
![alt](/media/filename.png)
```

レンダリング時に、相対パス `/media/*` を CMS サーバーの絶対 URL に変換する。

```
/media/filename.png → {CMS_API_URL}/media/filename.png
```

`marked` の `renderer` をカスタマイズして画像の `src` を書き換える。

---

## 8. レイアウト

### 8.1 WikiLayout.astro

Wiki ページ用のレイアウト。既存の `Layout.astro` を拡張する。

```
┌─────────────────────────────────┐
│  Navigation                     │
├─────────────────────────────────┤
│                                 │
│  <slot /> (ページコンテンツ)      │
│                                 │
├─────────────────────────────────┤
│  Footer                         │
└─────────────────────────────────┘
```

- ナビゲーションは全ページ共通
- フッターにはサイト名・コピーライトを表示

---

## 9. Webhook 連携

### 9.1 CMS 側の設定

CMS の環境変数 `webhook.url` にビルドトリガーの URL を設定する。

### 9.2 Webhook イベント

CMS は以下のイベント発生時に Webhook を送信する:

| イベント | トリガー |
|---------|---------|
| `page.published` | ページが公開されたとき |
| `page.unpublished` | ページが非公開になったとき |
| `page.deleted` | ページが削除されたとき |
| `navigation.updated` | ナビゲーションが更新されたとき |

### 9.3 Website 側の対応

Webhook を受けた CI/CD システムが以下を実行する:

1. リポジトリの最新コードを取得
2. `pnpm build` を実行（ビルド時に CMS API からデータを再取得）
3. ビルド成果物をデプロイ

具体的な CI/CD の構成はデプロイ先に依存するため、本仕様では定めない。

---

## 10. エラーハンドリング

### 10.1 ビルド時のエラー

| エラー | 対応 |
|--------|------|
| CMS API に接続できない | ビルド失敗。エラーメッセージに接続先 URL を表示 |
| API キーが無効 | ビルド失敗。401 エラーを表示 |
| 環境変数が未設定 | ビルド失敗。不足している変数名を表示 |
| 個別ページが 404 | 該当ページをスキップし、警告をログ出力 |

### 10.2 ランタイムエラー

静的サイトのためランタイムエラーは発生しない。CMS サーバーがダウンしても、最後にビルドされた静的ファイルが配信される。メディアファイルのみ CMS サーバーに依存する。

---

## 11. ディレクトリ構成（最終形）

```
src/
  pages/
    index.astro                   # トップページ（既存）
    wiki/
      index.astro                 # Wiki ページ一覧
      [slug].astro                # Wiki 個別ページ
  layouts/
    Layout.astro                  # ベースレイアウト（既存）
    WikiLayout.astro              # Wiki ページ用レイアウト
  components/
    Navigation.astro              # グローバルナビゲーション
    WikiCard.astro                # Wiki ページ一覧カード
  lib/
    cms-client.ts                 # CMS API クライアント
    types.ts                      # CMS レスポンス型定義
  assets/                         # 既存アセット
.env                              # 環境変数（gitignore 対象）
```

