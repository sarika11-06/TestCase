import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./schema";

// Create MySQL connection pool
const poolConnection = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "3306"),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "test_generator_db",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Initialize Drizzle ORM with MySQL
export const db = drizzle(poolConnection, { schema, mode: "default" });

// Initialize database tables
export async function initDatabase() {
  try {
    const connection = await poolConnection.getConnection();
    
    // Create websites table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS websites (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        url VARCHAR(500) NOT NULL UNIQUE,
        domain VARCHAR(255) NOT NULL,
        path VARCHAR(500),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Create scrape_results table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS scrape_results (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        website_id BIGINT NOT NULL,
        url VARCHAR(500) NOT NULL,
        prompt TEXT NOT NULL,
        analysis_data JSON,
        interactive_elements_count INT,
        scraped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (website_id) REFERENCES websites(id)
      )
    `);

    // Create test_cases table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS test_cases (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        scrape_result_id BIGINT NOT NULL,
        website_id BIGINT NOT NULL,
        test_case_id VARCHAR(100) NOT NULL,
        title VARCHAR(500) NOT NULL,
        description TEXT NOT NULL,
        type VARCHAR(50) NOT NULL,
        priority VARCHAR(20) NOT NULL,
        steps JSON NOT NULL,
        expected_result TEXT NOT NULL,
        playwright_code TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (scrape_result_id) REFERENCES scrape_results(id),
        FOREIGN KEY (website_id) REFERENCES websites(id)
      )
    `);

    // Create execution_results table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS execution_results (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        website_id BIGINT NOT NULL,
        scrape_result_id BIGINT,
        url VARCHAR(500) NOT NULL,
        prompt TEXT NOT NULL,
        success TINYINT NOT NULL,
        total_actions INT,
        successful_actions INT,
        results JSON,
        screenshot TEXT,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (website_id) REFERENCES websites(id),
        FOREIGN KEY (scrape_result_id) REFERENCES scrape_results(id)
      )
    `);

    connection.release();
    console.log("✓ Database tables initialized successfully");
  } catch (error: any) {
    console.error("Database initialization error:", error.message);
    // Don't throw - allow app to start even if DB is not configured
  }
}
