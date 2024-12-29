import { PGlite } from "@electric-sql/pglite";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { beforeAll, afterAll, afterEach } from "vitest";

import * as schema from "@/drizzle/schema";

let pglite: PGlite;
export let testDB: ReturnType<typeof drizzle<typeof schema>>;
export const TEST_USER_ID = "00000000-0000-4000-8000-000000000000";

beforeAll(async () => {
  pglite = new PGlite();
  testDB = drizzle(pglite, { schema });

  await migrate(testDB, { migrationsFolder: "drizzle/migrations" });
  await seed();
});

afterEach(async () => {
  await testDB.execute(sql`drop schema if exists public cascade`);
  await testDB.execute(sql`create schema public`);
  await testDB.execute(sql`drop schema if exists drizzle cascade`);
  await migrate(testDB!, { migrationsFolder: "drizzle/migrations" });
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

  await testDB.insert(schema.tasks).values([
    {
      id: "00000000-0000-4000-8000-000000000001",
      userId: TEST_USER_ID,
      title: "test",
      done: false,
    },
    {
      id: "00000000-0000-4000-8000-000000000002",
      userId: TEST_USER_ID,
      title: "test",
      done: true,
    },
  ]);
}