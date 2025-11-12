import { pgTable, serial, varchar, text, timestamp, integer, jsonb, boolean, doublePrecision } from "drizzle-orm/pg-core";

// Websites table - stores unique URLs that have been tested
export const websites = pgTable("websites", {
  id: serial("id").primaryKey(),
  url: varchar("url", { length: 500 }).notNull().unique(),
  domain: varchar("domain", { length: 255 }).notNull(),
  path: varchar("path", { length: 500 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Scrape Results - stores scraped website analysis data
export const scrapeResults = pgTable("scrape_results", {
  id: serial("id").primaryKey(),
  websiteId: integer("website_id").notNull().references(() => websites.id),
  url: varchar("url", { length: 500 }).notNull(),
  prompt: text("prompt").notNull(),
  analysisData: jsonb("analysis_data"),
  interactiveElementsCount: integer("interactive_elements_count"),
  scrapedAt: timestamp("scraped_at").notNull().defaultNow(),
});

// Test Cases - stores generated test cases
export const testCases = pgTable("test_cases", {
  id: serial("id").primaryKey(),
  scrapeResultId: integer("scrape_result_id").notNull().references(() => scrapeResults.id),
  websiteId: integer("website_id").notNull().references(() => websites.id),
  testCaseId: varchar("test_case_id", { length: 100 }).notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description").notNull(),
  type: varchar("type", { length: 50 }).notNull(),
  priority: varchar("priority", { length: 20 }).notNull(),
  steps: jsonb("steps").notNull(),
  expectedResult: text("expected_result").notNull(),
  playwrightCode: text("playwright_code"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Execution Results - stores test execution results
export const executionResults = pgTable("execution_results", {
  id: serial("id").primaryKey(),
  websiteId: integer("website_id").notNull().references(() => websites.id),
  scrapeResultId: integer("scrape_result_id").references(() => scrapeResults.id),
  url: varchar("url", { length: 500 }).notNull(),
  prompt: text("prompt").notNull(),
  success: boolean("success").notNull(),
  totalActions: integer("total_actions"),
  successfulActions: integer("successful_actions"),
  results: jsonb("results"),
  screenshot: text("screenshot"),
  executedAt: timestamp("executed_at").notNull().defaultNow(),
});

// Test Executions - stores individual test runs for flaky test detection
export const testExecutions = pgTable("test_executions", {
  id: serial("id").primaryKey(),
  testCaseId: varchar("test_case_id", { length: 100 }).notNull(),
  status: varchar("status", { length: 20 }).notNull(),
  executionTime: integer("execution_time").notNull(),
  domStabilityScore: doublePrecision("dom_stability_score"),
  waitConditionFailures: integer("wait_condition_failures"),
  networkCallCount: integer("network_call_count"),
  errorMessage: text("error_message"),
  executedAt: timestamp("executed_at").notNull().defaultNow(),
});

// Flaky Tests - stores detected flaky tests with analysis
export const flakyTests = pgTable("flaky_tests", {
  id: serial("id").primaryKey(),
  testCaseId: varchar("test_case_id", { length: 100 }).notNull().unique(),
  flakinessScore: doublePrecision("flakiness_score").notNull(),
  timingVariance: doublePrecision("timing_variance").notNull(),
  failureRate: doublePrecision("failure_rate").notNull(),
  totalRuns: integer("total_runs").notNull(),
  failedRuns: integer("failed_runs").notNull(),
  rootCauses: jsonb("root_causes").notNull(),
  lastFailedAt: timestamp("last_failed_at"),
  isResolved: boolean("is_resolved").notNull().default(false),
  detectedAt: timestamp("detected_at").notNull().defaultNow(),
});

export type Website = typeof websites.$inferSelect;
export type NewWebsite = typeof websites.$inferInsert;

export type ScrapeResult = typeof scrapeResults.$inferSelect;
export type NewScrapeResult = typeof scrapeResults.$inferInsert;

export type TestCase = typeof testCases.$inferSelect;
export type NewTestCase = typeof testCases.$inferInsert;

export type ExecutionResult = typeof executionResults.$inferSelect;
export type NewExecutionResult = typeof executionResults.$inferInsert;

export type TestExecution = typeof testExecutions.$inferSelect;
export type NewTestExecution = typeof testExecutions.$inferInsert;

export type FlakyTest = typeof flakyTests.$inferSelect;
export type NewFlakyTest = typeof flakyTests.$inferInsert;
