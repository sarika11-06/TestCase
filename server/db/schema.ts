import { mysqlTable, varchar, text, timestamp, int, json, bigint } from "drizzle-orm/mysql-core";

// Websites table - stores unique URLs that have been tested
export const websites = mysqlTable("websites", {
  id: bigint("id", { mode: "number" }).primaryKey().autoincrement(),
  url: varchar("url", { length: 500 }).notNull().unique(),
  domain: varchar("domain", { length: 255 }).notNull(),
  path: varchar("path", { length: 500 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Scrape Results - stores scraped website analysis data
export const scrapeResults = mysqlTable("scrape_results", {
  id: bigint("id", { mode: "number" }).primaryKey().autoincrement(),
  websiteId: bigint("website_id", { mode: "number" }).notNull(),
  url: varchar("url", { length: 500 }).notNull(),
  prompt: text("prompt").notNull(),
  analysisData: json("analysis_data"),
  interactiveElementsCount: int("interactive_elements_count"),
  scrapedAt: timestamp("scraped_at").notNull().defaultNow(),
});

// Test Cases - stores generated test cases
export const testCases = mysqlTable("test_cases", {
  id: bigint("id", { mode: "number" }).primaryKey().autoincrement(),
  scrapeResultId: bigint("scrape_result_id", { mode: "number" }).notNull(),
  websiteId: bigint("website_id", { mode: "number" }).notNull(),
  testCaseId: varchar("test_case_id", { length: 100 }).notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description").notNull(),
  type: varchar("type", { length: 50 }).notNull(),
  priority: varchar("priority", { length: 20 }).notNull(),
  steps: json("steps").notNull(),
  expectedResult: text("expected_result").notNull(),
  playwrightCode: text("playwright_code"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Execution Results - stores test execution results
export const executionResults = mysqlTable("execution_results", {
  id: bigint("id", { mode: "number" }).primaryKey().autoincrement(),
  websiteId: bigint("website_id", { mode: "number" }).notNull(),
  scrapeResultId: bigint("scrape_result_id", { mode: "number" }),
  url: varchar("url", { length: 500 }).notNull(),
  prompt: text("prompt").notNull(),
  success: int("success").notNull(), // 1 for success, 0 for failure
  totalActions: int("total_actions"),
  successfulActions: int("successful_actions"),
  results: json("results"),
  screenshot: text("screenshot"), // base64 encoded
  executedAt: timestamp("executed_at").notNull().defaultNow(),
});

export type Website = typeof websites.$inferSelect;
export type NewWebsite = typeof websites.$inferInsert;

export type ScrapeResult = typeof scrapeResults.$inferSelect;
export type NewScrapeResult = typeof scrapeResults.$inferInsert;

export type TestCase = typeof testCases.$inferSelect;
export type NewTestCase = typeof testCases.$inferInsert;

export type ExecutionResult = typeof executionResults.$inferSelect;
export type NewExecutionResult = typeof executionResults.$inferInsert;
