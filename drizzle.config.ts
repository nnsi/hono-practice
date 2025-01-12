interface DbCredentials {
  url: string;
}

interface DrizzleConfig {
  schema: string;
  out: string;
  dialect: string;
  dbCredentials: DbCredentials;
}

const config: DrizzleConfig = {
  schema: "./drizzle/schema.ts",
  out: "./drizzle/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
};

export default config;
