import { z } from "zod";

// Test Case Generation Request Schema
export const generateTestCasesRequestSchema = z.object({
  url: z.string().url("Please enter a valid URL"),
  prompt: z.string().min(10, "Prompt must be at least 10 characters"),
});

export type GenerateTestCasesRequest = z.infer<typeof generateTestCasesRequestSchema>;

// Test Case Types
export const testCaseTypeSchema = z.enum(["UI", "API", "E2E", "Integration", "Unit", "Performance", "Security", "Accessibility"]);
export type TestCaseType = z.infer<typeof testCaseTypeSchema>;

// Individual Test Case Schema
export const testCaseSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  type: testCaseTypeSchema,
  priority: z.enum(["High", "Medium", "Low"]),
  steps: z.array(z.string()),
  expectedResult: z.string(),
  playwrightCode: z.string().optional(),
});

export type TestCase = z.infer<typeof testCaseSchema>;

// Root Cause Schema for Flaky Test Analysis
export const rootCauseSchema = z.object({
  type: z.enum(["timing", "dom", "resource", "concurrency"]),
  confidence: z.number().min(0).max(100),
  description: z.string(),
});

export type RootCause = z.infer<typeof rootCauseSchema>;

// Test Execution Schema (matches database schema with serial ID)
export const testExecutionSchema = z.object({
  id: z.number(),
  testCaseId: z.string(),
  status: z.enum(["passed", "failed"]),
  executionTime: z.number(),
  domStabilityScore: z.number().nullable(),
  waitConditionFailures: z.number().nullable(),
  networkCallCount: z.number().nullable(),
  errorMessage: z.string().nullable(),
  executedAt: z.date(),
});

export type TestExecution = z.infer<typeof testExecutionSchema>;

export const insertTestExecutionSchema = z.object({
  testCaseId: z.string(),
  status: z.enum(["passed", "failed"]),
  executionTime: z.number(),
  domStabilityScore: z.number().optional().nullable(),
  waitConditionFailures: z.number().optional().nullable(),
  networkCallCount: z.number().optional().nullable(),
  errorMessage: z.string().optional().nullable(),
});
export type InsertTestExecution = z.infer<typeof insertTestExecutionSchema>;

// Flaky Test Schema (matches database schema with serial ID)
export const flakyTestSchema = z.object({
  id: z.number(),
  testCaseId: z.string(),
  flakinessScore: z.number().min(0).max(100),
  timingVariance: z.number(),
  failureRate: z.number(),
  totalRuns: z.number(),
  failedRuns: z.number(),
  rootCauses: z.array(rootCauseSchema),
  lastFailedAt: z.date().nullable(),
  isResolved: z.boolean(),
  detectedAt: z.date(),
});

export type FlakyTest = z.infer<typeof flakyTestSchema>;

export const insertFlakyTestSchema = flakyTestSchema.omit({ id: true, detectedAt: true });
export type InsertFlakyTest = z.infer<typeof insertFlakyTestSchema>;

// Website Analysis Schema
export const websiteAnalysisSchema = z.object({
  url: z.string(),
  allInteractive: z.array(
    z.object({
      tag: z.string(),
      type: z.string(),
      text: z.string(),
      ariaLabel: z.string(),
      role: z.string(),
      placeholder: z.string(),
      name: z.string(),
      id: z.string(),
      selectors: z.array(z.string()),
      xpath: z.string(),
      friendlyName: z.string().optional(),
    })
  ).optional(),
  // Legacy fields for backward compatibility
  forms: z.array(z.object({ name: z.string(), fields: z.array(z.any()) })).optional(),
  buttonsWithSelectors: z.array(z.any()).optional(),
  buttons: z.array(z.string()).optional(),
  linksWithXPaths: z.array(z.any()).optional(),
  allInteractiveElements: z.array(z.any()).optional(),
});

export type WebsiteAnalysis = z.infer<typeof websiteAnalysisSchema>;

// Test Case Generation Response Schema
export const testCaseGenerationResponseSchema = z.object({
  analysis: websiteAnalysisSchema,
  testCases: z.array(testCaseSchema),
  summary: z.object({
    totalTests: z.number(),
    byType: z.record(z.number()),
    coverageAreas: z.array(z.string()),
  }),
});

export type TestCaseGenerationResponse = z.infer<typeof testCaseGenerationResponseSchema>;

// Scrape Request Schema (for scraping without generation)
export const scrapeWebsiteRequestSchema = z.object({
  url: z.string().url("Please enter a valid URL"),
});

export type ScrapeWebsiteRequest = z.infer<typeof scrapeWebsiteRequestSchema>;
