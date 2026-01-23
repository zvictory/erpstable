
import type { Config } from "drizzle-kit";
import * as dotenv from "dotenv";
dotenv.config();

export default {
    schema: "./db/schema/index.ts",
    out: "./drizzle",
    driver: "libsql",
    dbCredentials: {
        url: process.env.DATABASE_URL || "file:db/data.db",
        ...(process.env.DATABASE_AUTH_TOKEN && { authToken: process.env.DATABASE_AUTH_TOKEN }),
    },
} as unknown as Config;
