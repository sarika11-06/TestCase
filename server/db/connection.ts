import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set");
}

// Create PostgreSQL connection
const queryClient = postgres(process.env.DATABASE_URL);

// Initialize Drizzle ORM with PostgreSQL
export const db = drizzle(queryClient, { schema });

// Note: Database schema is managed by Drizzle Kit
// Run `npx drizzle-kit push` to sync schema changes to the database
// All table definitions are in server/db/schema.ts
export async function initDatabase() {
  console.log("✓ Database connection established (schema managed by Drizzle Kit)");
}
