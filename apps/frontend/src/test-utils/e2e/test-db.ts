import { PGlite } from "@electric-sql/pglite";
import * as schema from "@infra/drizzle/schema";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";

export async function createTestDb() {
  // Create in-memory PGlite instance
  const pglite = new PGlite();

  // Create drizzle instance
  const db = drizzle(pglite, { schema });

  // Run migrations
  const migrationsFolder = "./infra/drizzle/migrations";
  await migrate(db, { migrationsFolder });

  return { db, pglite };
}

export async function cleanupTestDb(pglite: PGlite) {
  await pglite.close();
}

export async function resetTestDb(
  db: ReturnType<typeof drizzle<typeof schema>>,
) {
  // Clean up all tables in reverse order of dependencies
  await db.execute(sql`DELETE FROM activity_log`);
  await db.execute(sql`DELETE FROM activity_goal`);
  await db.execute(sql`DELETE FROM activity_kind`);
  await db.execute(sql`DELETE FROM activity`);
  await db.execute(sql`DELETE FROM task`);
  await db.execute(sql`DELETE FROM api_key`);
  await db.execute(sql`DELETE FROM refresh_token`);
  await db.execute(sql`DELETE FROM user_subscription`);
  await db.execute(sql`DELETE FROM user_provider`);
  await db.execute(sql`DELETE FROM "user"`);
}
