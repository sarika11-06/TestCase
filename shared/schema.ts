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

// Website Analysis Schema
export const websiteAnalysisSchema = z.object({
  url: z.string(),
  title: z.string().optional(),
  description: z.string().optional(),
  pages: z.array(z.string()).optional(),
  forms: z.array(z.object({
    name: z.string(),
    fields: z.array(z.string()),
  })).optional(),
  buttons: z.array(z.string()).optional(),
  links: z.array(z.string()).optional(),
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
