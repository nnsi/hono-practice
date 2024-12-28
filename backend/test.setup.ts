import { PGlite } from "@electric-sql/pglite";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { beforeAll, afterAll, afterEach } from "vitest";

import * as schema from "@/drizzle/schema";

let pglite: PGlite;
export let testDB: ReturnType<typeof drizzle<typeof schema>>;

beforeAll(async () => {
  pglite = new PGlite();
  testDB = drizzle(pglite, { schema });

  await migrate(testDB, { migrationsFolder: "drizzle/migrations" });
});

afterEach(async () => {
  await testDB.execute(sql`drop schema if exists public cascade`);
  await testDB.execute(sql`create schema public`);
  await testDB.execute(sql`drop schema if exists drizzle cascade`);
  await migrate(testDB!, { migrationsFolder: "drizzle/migrations" });
});

afterAll(async () => {
  if (pglite) {
    await pglite.close();
  }
});
