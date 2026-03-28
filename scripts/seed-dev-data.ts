try {
  await import("dotenv/config");
} catch {
  // dotenv not available (e.g. worktree) — rely on env vars passed directly
}

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "../infra/drizzle/schema";
import { seedDevData } from "./seedDevData";

const client = postgres(process.env.DATABASE_URL!);
const db = drizzle(client, { schema });

async function main() {
  try {
    await seedDevData(db);
  } catch (error) {
    console.error("seed error:", error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
