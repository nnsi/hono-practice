interface DrizzleConfig {
  schema: string;
  out: string;
  dialect: string;
  dbCredentials: {
    url?: string;
  };
}

const config: DrizzleConfig = {
  schema: "./drizzle/schema.ts",
  out: "./drizzle/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
};

export default config;
