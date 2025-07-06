import "dotenv/config";

import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

// データベース接続
const client = postgres(process.env.DATABASE_URL!);
const db = drizzle(client);

async function cleanDatabase() {
  console.log("🗑️  データベースの全データを削除中...");

  try {
    // トランザクション内で全テーブルのデータを削除
    await db.transaction(async (tx) => {
      // 外部キー制約を一時的に無効化
      await tx.execute(sql`SET session_replication_role = 'replica'`);

      // 各テーブルのデータを削除（依存関係の逆順）
      console.log("  - sync_queue テーブルをクリア");
      await tx.execute(sql`TRUNCATE TABLE sync_queue CASCADE`);

      console.log("  - sync_metadata テーブルをクリア");
      await tx.execute(sql`TRUNCATE TABLE sync_metadata CASCADE`);

      console.log("  - activity_goal テーブルをクリア");
      await tx.execute(sql`TRUNCATE TABLE activity_goal CASCADE`);

      console.log("  - activity_log テーブルをクリア");
      await tx.execute(sql`TRUNCATE TABLE activity_log CASCADE`);

      console.log("  - activity_kind テーブルをクリア");
      await tx.execute(sql`TRUNCATE TABLE activity_kind CASCADE`);

      console.log("  - activity テーブルをクリア");
      await tx.execute(sql`TRUNCATE TABLE activity CASCADE`);

      console.log("  - task テーブルをクリア");
      await tx.execute(sql`TRUNCATE TABLE task CASCADE`);

      console.log("  - refresh_token テーブルをクリア");
      await tx.execute(sql`TRUNCATE TABLE refresh_token CASCADE`);

      console.log("  - user_provider テーブルをクリア");
      await tx.execute(sql`TRUNCATE TABLE user_provider CASCADE`);

      console.log("  - user テーブルをクリア");
      await tx.execute(sql`TRUNCATE TABLE "user" CASCADE`);

      // 外部キー制約を再度有効化
      await tx.execute(sql`SET session_replication_role = 'origin'`);
    });

    console.log("✅ 全てのデータが削除されました");
  } catch (error) {
    console.error("❌ エラーが発生しました:", error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// スクリプトを実行
cleanDatabase();
