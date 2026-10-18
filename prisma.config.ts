import { config } from "dotenv";
import { defineConfig, env } from "prisma/config";

if (process.env.PRISMA_ENV_FILE) {
  config({ path: process.env.PRISMA_ENV_FILE, override: true });
} else {
  config({ path: ".env.local" });
  config({ path: ".env" });
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  engine: "classic",
  datasource: {
    url: env("DATABASE_URL"),
  },
});