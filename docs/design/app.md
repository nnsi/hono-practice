# Actiko DesignDoc

## 0. 開発のモチベーションについて

- 筋トレの回数や音ゲーの練習記録、勉強や開発の時間を一元管理したかったが既存のアプリケーションでしっくりくるものがなかった
  - 既存のアプリケーションではそれらをTODOとして管理するものが多く、回数を記録して週単位や月単位で可視化出来るものがなかった
  - 記録するのに余計なUIや項目があり、それらを省いて記録と可視化をシンプルに出来るようにしたかった


## 1. 概要とビジョン

### 1.1 プロダクトビジョン
Actiko は「どのアプリよりも最速で活動量を記録する」ことを目指し、極限までシンプルに研ぎ澄ませたUXを実現する個人向け活動記録アプリケーションです。

### 1.2 コアバリュー
- **速度**: 最速の記録体験
- **シンプルさ**: 極限まで研ぎ澄ませたUX
- **信頼性**: オフライン対応とデータの永続性
- **拡張性**: Clean Architectureによる保守性の高い設計

### 1.3 技術スタック
- **Backend**: Hono + Cloudflare Workers
- **Frontend**: React 19 + Tanstack Router
- **Database**: PostgreSQL (Neon)
- **Mobile**: React Native + Expo
- **Authentication**: JWT + OAuth

## 2. アーキテクチャ概要

### 2.1 システム構成
```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Web Client    │     │  Mobile Client  │     │  Other Clients  │
│  (React + PWA)  │     │  (React Native) │     │    (Future)     │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                         │
         └───────────────────────┴─────────────────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │      API Gateway        │
                    │  (Cloudflare Workers)   │
                    └────────────┬────────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         │                       │                       │
    ┌────▼────┐            ┌────▼────┐            ┌────▼────┐
    │  Auth   │            │  Core   │            │  Sync   │
    │ Service │            │ Service │            │ Service │
    └────┬────┘            └────┬────┘            └────┬────┘
         │                       │                       │
         └───────────────────────┴───────────────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │      PostgreSQL         │
                    │        (Neon)           │
                    └─────────────────────────┘
```

### 2.2 バックエンドアーキテクチャ (Clean Architecture)

```
┌─────────────────────────────────────────────────────────────┐
│                      Presentation Layer                      │
│  (HTTP Handlers, Route Definitions, Request/Response DTOs)  │
└───────────────────────────────┬─────────────────────────────┘
                                │
┌───────────────────────────────▼─────────────────────────────┐
│                      Application Layer                       │
│           (Use Cases, Business Logic, Workflows)            │
└───────────────────────────────┬─────────────────────────────┘
                                │
┌───────────────────────────────▼─────────────────────────────┐
│                        Domain Layer                          │
│       (Entities, Value Objects, Domain Services)            │
└───────────────────────────────┬─────────────────────────────┘
                                │
┌───────────────────────────────▼─────────────────────────────┐
│                    Infrastructure Layer                      │
│      (Repositories, External Services, Frameworks)          │
└─────────────────────────────────────────────────────────────┘
```

### 2.3 フロントエンドアーキテクチャ

```
┌─────────────────────────────────────────────────────────────┐
│                          Routes                             │
│              (File-based Tanstack Router)                   │
└───────────────────────────────┬─────────────────────────────┘
                                │
┌───────────────────────────────▼─────────────────────────────┐
│                       Components                             │
│         (UI Components, Feature Components)                  │
└───────────────────────────────┬─────────────────────────────┘
                                │
┌───────────────────────────────▼─────────────────────────────┐
│                      Custom Hooks                            │
│       (Data Fetching, State Management, Effects)            │
└───────────────────────────────┬─────────────────────────────┘
                                │
┌───────────────────────────────▼─────────────────────────────┐
│                      API Client                              │
│          (Type-safe Hono RPC Client)                        │
└─────────────────────────────────────────────────────────────┘
```

## 3. システム設計

### 3.1 認証システム

#### 3.1.1 JWT認証フロー
```
1. ユーザーログイン
   → Email/Password または OAuth
   
2. トークン発行
   → Access Token (15分)
   → Refresh Token (30日)
   
3. トークン保存
   → localStorage に保存
   
4. API リクエスト
   → Authorization: Bearer {accessToken}
   
5. トークン更新
   → 401エラー時に自動リフレッシュ
   → リフレッシュトークンで新しいアクセストークンを取得
```

#### 3.1.2 OAuth統合
- Google OAuth (OIDC) 実装済み
- プロバイダー拡張可能な設計
- 既存アカウントとのリンク機能

### 3.2 アクティビティ管理システム

#### 3.2.1 アクティビティ構造
```typescript
Activity {
  id: UUID
  userId: UUID
  name: string
  emoji?: string
  label?: string
  quantityUnit?: string
  orderIndex: string  // Lexical ordering
  showCombinedStats: boolean
  deletedAt?: Date
}

ActivityKind {
  id: UUID
  activityId: UUID
  name: string
  orderIndex: string
  deletedAt?: Date
}
```

#### 3.2.2 活動記録
```typescript
ActivityLog {
  id: UUID
  userId: UUID
  activityId: UUID
  activityKindId?: UUID
  targetDate: Date
  targetTime?: Date
  quantity: number
  memo?: string
  createdAt: Date
  updatedAt: Date
}
```

### 3.3 タスク管理システム
```typescript
Task {
  id: UUID
  userId: UUID
  content: string
  memo?: string
  dueDate?: Date
  doneDate?: Date
}
```

### 3.4 目標・負債システム

#### 3.4.1 月間目標
```typescript
ActivityGoal {
  activityId: UUID
  targetYearMonth: string  // YYYY-MM
  targetValue: number
}
```

#### 3.4.2 日次負債
```typescript
ActivityDebt {
  activityId: UUID
  targetDate: Date
  targetValue: number
}
```

**注**: この機能は Goal システムの一部として実装されており、`/users/goals` エンドポイント経由でアクセスします。

## 4. データモデル

### 4.1 データベーススキーマ

#### 4.1.1 コアエンティティ
- **users**: ユーザー基本情報
- **user_providers**: OAuth プロバイダー連携
- **refresh_tokens**: リフレッシュトークン管理

#### 4.1.2 アクティビティ関連
- **activities**: アクティビティマスタ
- **activity_kinds**: アクティビティのサブカテゴリ
- **activity_logs**: 活動記録
- **activity_debts**: 日次目標/負債
- **activity_goals**: 月間目標

#### 4.1.3 その他
- **tasks**: タスク管理
- **sync_metadata**: 同期メタデータ
- **sync_queue**: 同期キュー

### 4.2 インデックス戦略
- 外部キーには全てインデックス
- 頻繁にクエリされるカラムにインデックス
- 複合インデックスによるクエリ最適化

### 4.3 スキーマ詳細
各テーブルの詳細なカラム定義は `infra/drizzle/schema.ts` を参照してください。Drizzle ORM を使用した型安全なスキーマ定義がされています。

## 5. API設計

### 5.1 エンドポイント構成
```
/auth/
├── register              # ユーザー登録
├── login                 # ログイン
├── refresh               # トークンリフレッシュ
├── logout                # ログアウト
└── oauth/
    ├── google            # Google OAuth認証
    └── link/google       # Google アカウント連携

/users/*                  # 認証必須
├── activities/
│   ├── GET    /          # アクティビティ一覧取得
│   ├── POST   /          # アクティビティ作成
│   ├── GET    /:id       # アクティビティ取得
│   ├── PUT    /:id       # アクティビティ更新
│   ├── DELETE /:id       # アクティビティ削除
│   └── PUT    /reorder   # 並び替え
├── activity-logs/
│   ├── GET    /          # ログ一覧取得（期間指定）
│   ├── POST   /          # ログ作成
│   ├── PUT    /:id       # ログ更新
│   ├── DELETE /:id       # ログ削除
│   └── GET    /stats     # 統計情報取得
├── tasks/
│   ├── GET    /          # タスク一覧取得
│   ├── POST   /          # タスク作成
│   ├── PUT    /:id       # タスク更新
│   ├── PUT    /:id/done  # タスク完了/未完了
│   └── DELETE /:id       # タスク削除
├── goals/
│   ├── GET    /          # 目標一覧取得（?type=monthly|debtでタイプ指定）
│   ├── POST   /monthly    # 月間目標作成
│   ├── PUT    /monthly/:id # 月間目標更新
│   ├── DELETE /monthly/:id # 月間目標削除
│   ├── POST   /debt       # 負債目標作成
│   ├── PUT    /debt/:id   # 負債目標更新
│   ├── DELETE /debt/:id   # 負債目標削除
│   └── GET    /:type/:id  # 特定目標取得
└── sync/
    └── POST   /          # 同期データ送信

/user                     # 認証必須
├── GET    /              # ユーザー情報取得
└── DELETE /              # アカウント削除
```

### 5.2 レスポンス形式
```typescript
// 成功レスポンス
// 直接オブジェクトを返却
T

// エラーレスポンス
{
  message: string
  stack?: string  // NODE_ENV !== 'production' のときのみ
}
```

### 5.3 API仕様詳細
詳細なリクエスト/レスポンスは `packages/types/` に TypeScript 型定義として管理されています。将来的には OpenAPI 自動生成を検討しています。

## 6. フロントエンド設計

### 6.1 ルーティング構造
```
/                   # 日次記録画面（メイン）
/stats              # 統計画面
/goal               # 目標設定画面
/settings           # 設定画面
/login              # ログイン画面
/register           # 登録画面
```

### 6.2 状態管理
- **サーバー状態**: Tanstack Query
- **認証状態**: React Context (AuthProvider)
- **グローバル日付**: React Context (DateProvider)
- **ローカル状態**: useState/useReducer

### 6.3 パフォーマンス最適化
- 楽観的更新による即座のフィードバック
- 100msタイマー更新による滑らかな表示
- API呼び出しのデバウンス
- 効率的なリストレンダリング

## 7. 非機能要件

### 7.1 パフォーマンス
- **レスポンスタイム**: 95パーセンタイルで 100ms 以下
- **同時接続数**: 1,000 ユーザー同時接続
- **APIスループット**: 10,000 req/s（Cloudflare Workers の自動スケーリングによる）

### 7.2 可用性
- **SLA**: 99.9% 以上（ステージング: 99.5%）
- **RPO (Recovery Point Objective)**: 5分
- **RTO (Recovery Time Objective)**: 30分
- **バックアップ**: Neon の自動バックアップ + 日次スナップショット

### 7.3 スケーラビリティ
- **水平スケーリング**: Cloudflare Workers によるエッジコンピューティング
- **データベーススケーリング**: Neon のオートスケーリング
- **ストレージ**: 1ユーザーあたり最大 100MB

### 7.4 セキュリティ
- **認証**: JWT (15分) + リフレッシュトークン (30日)
- **暗号化**: TLS 1.3 (Cloudflare)、パスワードは bcrypt (12 rounds)
- **レート制限**: 未実装（Future Workで実装予定）
- **CORS**: ホワイトリスト方式

## 8. セキュリティ設計

### 8.1 認証・認可
- JWT Bearer トークン認証
- リフレッシュトークンのセレクタパターン
- 自動トークンローテーション
- OAuth統合によるパスワードレスオプション

### 8.2 データ保護
- リポジトリレベルでのユーザー分離
- Drizzle ORMによるSQLインジェクション防止
- Zodスキーマによる入力検証
- 本番環境でのCORS設定

## 9. パフォーマンス設計

### 9.1 バックエンド最適化
- 効率的なSQLクエリとJOIN
- 一般的なクエリパターンのインデックス使用
- 関連操作のトランザクションバッチング
- 複雑な集計のためのクエリサービス

### 9.2 フロントエンド最適化
- 楽観的UIアップデート
- APIコールのバッチング
- 効率的な再レンダリング防止
- タブ間でのタイマー状態の永続化

### 9.3 エッジコンピューティング
- Cloudflare Workers によるエッジ実行
- グローバルな低レイテンシ
- 自動スケーリング

## 10. オフライン対応設計

### 10.1 ハイブリッドオフラインアプローチ
現在の[ADR](../adr/)に基づく設計：
- Webアプリは初回接続が必要
- アクティビティ記録はオフラインで動作
- 再接続時の自動同期
- 重複防止メカニズム

### 10.2 同期アーキテクチャ
- キューベースの同期とリトライロジック
- エンティティタイプごとのバッチ処理
- 同期状態のメタデータ追跡
- タイムスタンプによる競合解決

### 10.3 実装状況
- インフラストラクチャは整備済み
- 同期テーブルとドメインロジックは存在
- フロントエンドのオフライン機能は部分的に実装

## 11. デプロイ・運用

### 11.1 環境構成
| 環境 | 目的 | URL |
| --- | --- | --- |
| ローカル | 開発 | http://localhost:5173 (Frontend), http://localhost:3456 (Backend) |
| ステージング | 統合テスト・検証 | https://actiko-stg.* |
| 本番 | ユーザーアクセス | https://actiko.app |

### 11.2 環境変数管理
- **ローカル**: `.env` ファイル（git ignore）
- **ステージング/本番**: Cloudflare Workers/Pages の環境変数
- **シークレット**: GitHub Secrets から Wrangler 経由で設定

### 11.3 CI/CDパイプライン

#### GitHub Actions ワークフロー
```yaml
# .github/workflows/deploy.yml
Pull Request:
  - ESLint/Biome リント
  - Vitest ユニットテスト
  - TypeScript 型チェック
  - ビルド検証

master ブランチマージ:
  - ステージングデプロイ (npm run deploy:stg)
  - E2E テスト実行
  
release ブランチマージ:
  - 本番デプロイ (npm run deploy:prod)
  - リリースタグ作成
```

### 11.4 デプロイ手順
1. **ステージング**: `npm run deploy:stg`
2. **本番**: `npm run deploy:prod`
3. **マイグレーション**: 事前に `npm run db-migrate` を実行

## 12. 将来の実装計画

### 12.1 完全なオフライン対応
現在の同期インフラストラクチャを活用：
- Service Workerの実装
- IndexedDBによるローカルストレージ
- バックグラウンド同期
- 競合解決UI

### 12.2 モバイルアプリの完成
React Native アプリの開発継続：
- 共有ビジネスロジックの活用
- ネイティブ機能の統合
- プッシュ通知
- ウィジェット対応

### 12.3 高度な統計機能
- より詳細な分析ダッシュボード
- データエクスポート機能
- カスタムレポート
- 予測分析

### 12.4 チーム機能
データモデルの拡張により実現可能：
- チーム/組織の概念追加
- 権限管理システム
- 共有アクティビティ
- チーム統計

### 12.5 統合機能
- サードパーティAPI連携
- Webhook サポート
- カレンダー統合
- ヘルスケアデバイス連携

## 13. オブザーバビリティ

### 13.1 ログ管理
- **ログフォーマット**: JSON 形式（構造化ログ）
- **ログレベル**: error, warn, info, debug
- **保存先**: Cloudflare Logpush を将来検討

### 13.2 エラートラッキング
- **現状**: console.error 出力のみ
- **将来**: Sentry 導入を検討（エラー率、スタックトレース）

### 13.3 メトリクス
- **API レスポンスタイム**: Cloudflare Analytics で基本監視
- **アプリケーション固有メトリクス**: 未実装
- **将来**: OpenTelemetry エクスポーターを検討

### 13.4 トレーシング
- **現状**: 未実装
- **将来**: OpenTelemetry を使用した分散トレーシング

## 14. テスト戦略

### 14.1 テスト階層
| 種類 | ツール | カバレッジ目標 | 実行タイミング |
| --- | --- | --- | --- |
| ユニットテスト | Vitest | 80% | pre-commit, CI |
| 統合テスト | Vitest + モック | 60% | CI |
| E2Eテスト | Playwright | クリティカルパス | ステージングデプロイ後 |

### 14.2 テストコード配置
- `feature/{name}/test/`: 機能ごとのテスト
- `*.test.ts`, `*.spec.ts`: テストファイル命名
- インソーステスティング対応

### 14.3 テストデータ
- テストID: UUID v4 形式（`00000000-0000-4000-8000-000000000000`）
- モック: ts-mockito を使用
- DBテスト: トランザクションロールバック

## 15. マイグレーション戦略

### 15.1 スキーママイグレーション
- **ツール**: Drizzle Kit
- **マイグレーション生成**: `npm run db-generate`
- **マイグレーション適用**: `npm run db-migrate`
- **ロールバック**: 手動（データベースバックアップから復元）

### 15.2 リリースフロー
1. ステージング環境でマイグレーションテスト
2. バックアップ作成
3. 本番マイグレーション実行
4. 動作確認
5. 問題発生時はバックアップから復元

### 15.3 ゼロダウンタイムマイグレーション
- 現状: データベース直接適用のためダウンタイムあり
- 将来: Blue-Green デプロイでゼロダウンタイムを実現

## 16. リスクと対応策

### 16.1 技術的リスク
| リスク | 影響 | 確率 | 対応策 |
| --- | --- | --- | --- |
| Cloudflare 障害 | サービス停止 | 低 | ステータスページ、影響範囲の周知 |
| Neon DB 障害 | データアクセス不可 | 低 | 自動フェイルオーバー、キャッシュ活用 |
| データ損失 | ユーザーデータ消失 | 極低 | 日次バックアップ、Point-in-time recovery |
| セキュリティ侵害 | 情報漏洩 | 中 | JWT 短期有効期限、定期的なセキュリティ監査 |

### 16.2 ビジネスリスク
| リスク | 影響 | 確率 | 対応策 |
| --- | --- | --- | --- |
| スケーリング問題 | パフォーマンス劣化 | 中 | Cloudflare 自動スケーリング、早期監視 |
| 機能追加の複雑化 | UX劣化 | 高 | シンプルさの徹底、ユーザーテスト |
| 競合他社出現 | ユーザー流出 | 中 | 高速性の維持、独自機能の開発 |

## 17. 技術的負債と改善点

### 17.1 現在の技術的負債
1. **同期システムの未完成**: インフラは整備されているが、フロントエンドとの統合が不完全
2. **モバイルアプリの未完成**: 基本構造は存在するが、機能実装が不足
3. **テストカバレッジ**: 一部の機能でテストが不足
4. **モバイルアプリのUI**: ActivityDebt 機能のモバイルUIが未実装
5. **レート制限**: API 保護のためのレート制限が未実装

### 17.2 改善提案
1. **パフォーマンスモニタリング**: APMツールの導入
2. **エラートラッキング**: Sentryなどの導入
3. **CI/CDパイプライン**: より高度な自動化
4. **ドキュメント**: API ドキュメントの自動生成

### 17.3 スケーラビリティ考慮事項

## 18. 用語集

| 用語 | 説明 |
| --- | --- |
| Activity | ユーザーが記録する活動の種類（例：ランニング、読書） |
| ActivityKind | Activity のサブカテゴリ（例：ランニングの「ジョギング」「スプリント」） |
| ActivityLog | 実際の活動記録（日時、数量を含む） |
| Goal | 月間目標（例：今月100km走る） |
| Debt | 日次目標/負債（Goalシステムの一部として実装） |
| JWT | JSON Web Token、認証用トークン |
| Refresh Token | アクセストークンを更新するための長期有効トークン |
| showCombinedStats | 統計表示時にActivityKindを統合して表示するかどうか |
| orderIndex | Lexical ordering を使用した並び順管理 |
| Selector Pattern | リフレッシュトークンのセキュリティパターン |
1. **データベース**: 読み取りレプリカの検討
2. **キャッシング**: Redis/Durable Objects の活用
3. **CDN**: 静的アセットの最適化
4. **レート制限**: API保護の実装
5. **リアルタイムモニタリング**: メトリクス収集と可視化

## 19. 開発ガイドライン

### 19.1 コーディング規約
- TypeScript: `type` を使用（`interface` は不使用）
- ファクトリ関数パターン: `newXXX` で依存注入
- エラーハンドリング: throw による例外、Route層でキャッチ
- テスト: Vitest with ts-mockito

### 19.2 アーキテクチャ原則
- Clean Architecture の厳守
- 依存性逆転の原則
- 単一責任の原則
- DRY原則

### 19.3 パフォーマンス原則
- 「最速」を常に意識
- 不要な処理の排除
- 楽観的更新の活用
- 効率的なデータ構造

## 20. まとめ

Actiko は、明確なビジョンと優れたアーキテクチャを持つ活動記録アプリケーションです。Clean Architecture による保守性の高い設計、最新の技術スタック、パフォーマンスファーストのアプローチにより、「どのアプリよりも最速で活動量を記録する」という目標を実現しています。

今後の開発では、既存の強固な基盤を活かしながら、オフライン対応の完成、モバイルアプリの充実、高度な分析機能の追加などを通じて、ユーザー価値をさらに高めていくことが期待されます。