import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set");
}

// Create PostgreSQL connection
const queryClient = postgres(process.env.DATABASE_URL);

// Initialize Drizzle ORM with PostgreSQL
export const db = drizzle(queryClient, { schema });

// Initialize database tables
export async function initDatabase() {
  try {
    // Create websites table
    await queryClient`
      CREATE TABLE IF NOT EXISTS websites (
        id SERIAL PRIMARY KEY,
        url VARCHAR(500) NOT NULL UNIQUE,
        domain VARCHAR(255) NOT NULL,
        path VARCHAR(500),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Create scrape_results table
    await queryClient`
      CREATE TABLE IF NOT EXISTS scrape_results (
        id SERIAL PRIMARY KEY,
        website_id INTEGER NOT NULL REFERENCES websites(id),
        url VARCHAR(500) NOT NULL,
        prompt TEXT NOT NULL,
        analysis_data JSONB,
        interactive_elements_count INTEGER,
        scraped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Create test_cases table
    await queryClient`
      CREATE TABLE IF NOT EXISTS test_cases (
        id SERIAL PRIMARY KEY,
        scrape_result_id INTEGER NOT NULL REFERENCES scrape_results(id),
        website_id INTEGER NOT NULL REFERENCES websites(id),
        test_case_id VARCHAR(100) NOT NULL,
        title VARCHAR(500) NOT NULL,
        description TEXT NOT NULL,
        type VARCHAR(50) NOT NULL,
        priority VARCHAR(20) NOT NULL,
        steps JSONB NOT NULL,
        expected_result TEXT NOT NULL,
        playwright_code TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Create execution_results table
    await queryClient`
      CREATE TABLE IF NOT EXISTS execution_results (
        id SERIAL PRIMARY KEY,
        website_id INTEGER NOT NULL REFERENCES websites(id),
        scrape_result_id INTEGER REFERENCES scrape_results(id),
        url VARCHAR(500) NOT NULL,
        prompt TEXT NOT NULL,
        success BOOLEAN NOT NULL,
        total_actions INTEGER,
        successful_actions INTEGER,
        results JSONB,
        screenshot TEXT,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    console.log("✓ Database tables initialized successfully");
  } catch (error: any) {
    console.error("Database initialization error:", error.message);
    // Don't throw - allow app to start even if tables already exist
  }
}
