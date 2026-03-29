import { PGlite } from "@electric-sql/pglite";
import * as schema from "@infra/drizzle/schema";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { afterAll, afterEach, beforeAll } from "vitest";

let pglite: PGlite;

export let testDB: ReturnType<typeof drizzle<typeof schema>>;

export const TEST_USER_ID = "00000000-0000-4000-8000-000000000000";
const migrationsFolder = "./infra/drizzle/migrations";

// bcrypt.hash("test-refresh-token-plain", 10) の事前計算結果
const SEED_HASHED_TOKEN =
  "$2a$10$Q7VSQL2ziRk0jHKxFmOOQePwGJvGbMPOmBjaSMqOjh1OLmqGFGWbW";

beforeAll(async () => {
  pglite = new PGlite();
  testDB = drizzle(pglite, { schema });

  await migrate(testDB, { migrationsFolder });
  await seed();
});

afterEach(async () => {
  await testDB.execute(sql`TRUNCATE TABLE
    activity_log,
    activity_kind,
    activity_goal_freeze_period,
    activity_goal,
    activity,
    task,
    api_key,
    user_subscription,
    contact,
    refresh_token,
    user_provider,
    "user"
    CASCADE`);
  await seed();
});

afterAll(async () => {
  if (pglite) {
    await pglite.close();
  }
});

async function seed() {
  await testDB.insert(schema.users).values({
    id: TEST_USER_ID,
    loginId: "test-user",
    password: "$2b$10$Zf23GOPCa8rrZ19B8sqJkect21sUt/xw9ZRDFkLyCfXvc0YdwKQF6",
    name: "test",
  });

  await testDB.insert(schema.refreshTokens).values({
    id: "00000000-0000-4000-8000-000000000001",
    userId: TEST_USER_ID,
    selector: "00000000-0000-4000-8000-selector0001",
    token: SEED_HASHED_TOKEN,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    revokedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  });

  await testDB.insert(schema.tasks).values([
    {
      id: "00000000-0000-4000-8000-000000000001",
      userId: TEST_USER_ID,
      title: "test",
      doneDate: null,
    },
    {
      id: "00000000-0000-4000-8000-000000000002",
      userId: TEST_USER_ID,
      title: "test",
      memo: "test",
      doneDate: "2021-01-01",
    },
  ]);

  await testDB.insert(schema.activities).values([
    {
      id: "00000000-0000-4000-8000-000000000001",
      userId: TEST_USER_ID,
      name: "test",
      label: "test",
      emoji: "🏃",
      orderIndex: "gae",
      quantityUnit: "回",
      iconType: "emoji",
    },
    {
      id: "00000000-0000-4000-8000-000000000002",
      userId: TEST_USER_ID,
      name: "test2",
      label: "test2",
      emoji: "📚",
      orderIndex: "zzz",
      quantityUnit: "回",
      iconType: "emoji",
    },
    {
      id: "00000000-0000-4000-8000-000000000003",
      userId: TEST_USER_ID,
      name: "test3",
      label: "test3",
      emoji: "🎮",
      orderIndex: "qqq",
      quantityUnit: "回",
      iconType: "emoji",
    },
  ]);

  await testDB.insert(schema.activityKinds).values([
    {
      id: "00000000-0000-4000-8000-000000000001",
      activityId: "00000000-0000-4000-8000-000000000001",
      name: "test-sub",
      orderIndex: "a",
    },
    {
      id: "00000000-0000-4000-8000-000000000002",
      activityId: "00000000-0000-4000-8000-000000000001",
      name: "test-sub-2",
      orderIndex: "z",
    },
  ]);

  await testDB.insert(schema.activityLogs).values([
    {
      id: "00000000-0000-4000-8000-000000000001",
      userId: TEST_USER_ID,
      activityId: "00000000-0000-4000-8000-000000000001",
      activityKindId: "00000000-0000-4000-8000-000000000001",
      date: "2021-01-01",
      quantity: 1,
    },
  ]);
}
