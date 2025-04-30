interface DrizzleConfig {
  schema: string;
  out: string;
  dialect: string;
  dbCredentials: {
    url?: string;
  };
  migrations: {
    table: string;
    schema: string;
  };
}

const config: DrizzleConfig = {
  schema: "./infra/drizzle/schema.ts",
  out: "./infra/drizzle/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  migrations: {
    table: "__drizzle_migrations",
    schema: "public",
  },
};

export default config;
