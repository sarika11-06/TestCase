import { z } from "zod";
// Test Case Generation Request Schema
export const generateTestCasesRequestSchema = z.object({
    url: z.string().url("Please enter a valid URL"),
    prompt: z.string().min(10, "Prompt must be at least 10 characters"),
});
// Test Case Types
export const testCaseTypeSchema = z.enum(["UI", "API", "E2E", "Integration", "Unit", "Performance", "Security", "Accessibility"]);
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
// Website Analysis Schema
export const websiteAnalysisSchema = z.object({
    url: z.string(),
    allInteractive: z.array(z.object({
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
    })).optional(),
    // Legacy fields for backward compatibility
    forms: z.array(z.object({ name: z.string(), fields: z.array(z.any()) })).optional(),
    buttonsWithSelectors: z.array(z.any()).optional(),
    buttons: z.array(z.string()).optional(),
    linksWithXPaths: z.array(z.any()).optional(),
    allInteractiveElements: z.array(z.any()).optional(),
});
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
// Scrape Request Schema (for scraping without generation)
export const scrapeWebsiteRequestSchema = z.object({
    url: z.string().url("Please enter a valid URL"),
});
