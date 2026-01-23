# KotaServer Wiki 計画ドキュメント

KotaServerウェブサイトにWiki機能を追加するための計画ドキュメント集です。

## ドキュメント一覧

| ファイル                                       | 内容                      |
| ---------------------------------------------- | ------------------------- |
| [01-requirements.md](./01-requirements.md)     | 要件定義 - 何を作るか     |
| [02-architecture.md](./02-architecture.md)     | 技術設計 - どう作るか     |
| [03-implementation.md](./03-implementation.md) | 実装計画 - どの順で作るか |

## 概要

### 技術スタック

- **公開Wiki**: Astro（SSG）
- **管理画面**: HonoX（Islands Architecture）
- **ORM**: Drizzle ORM
- **データベース**: Cloudflare D1
- **セッション管理**: Cloudflare KV
- **画像ストレージ**: Cloudflare R2
- **ホスティング**: Cloudflare Pages / Workers

### プロジェクト構成

```
packages/
├── website/    # 公開サイト（Astro）
├── admin/      # 管理画面（HonoX）
└── database/   # 共有パッケージ（Drizzle）
```

### MVP

以下の機能を実装すれば運用開始可能：

1. 基盤構築
2. 認証システム
3. 記事管理
4. カテゴリ管理
5. 公開Wiki

## ステータス

- [x] 要件定義
- [x] 技術設計
- [x] 実装計画
- [ ] 実装開始
