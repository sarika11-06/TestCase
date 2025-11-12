import { eq, desc } from "drizzle-orm";
import { db } from "./connection";
import { websites, scrapeResults, testCases, executionResults, testExecutions, flakyTests } from "./schema";
import type { NewWebsite, NewScrapeResult, NewTestCase, NewExecutionResult, NewTestExecution, NewFlakyTest, FlakyTest } from "./schema";

// Helper function to extract domain and path from URL
function parseUrl(url: string): { domain: string; path: string } {
  try {
    const urlObj = new URL(url);
    return {
      domain: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
    };
  } catch {
    return { domain: url, path: "/" };
  }
}

// Get or create website
export async function getOrCreateWebsite(url: string) {
  try {
    // Check if website exists
    const existing = await db.select().from(websites).where(eq(websites.url, url)).limit(1);
    
    if (existing.length > 0) {
      return existing[0];
    }

    // Create new website
    const { domain, path } = parseUrl(url);
    const newWebsite: NewWebsite = {
      url,
      domain,
      path,
    };

    const created = await db.insert(websites).values(newWebsite).returning();
    return created[0];
  } catch (error) {
    console.error("Error in getOrCreateWebsite:", error);
    throw error;
  }
}

// Save scrape result
export async function saveScrapeResult(data: {
  url: string;
  prompt: string;
  analysisData: any;
  interactiveElementsCount?: number;
}) {
  try {
    const website = await getOrCreateWebsite(data.url);

    const newScrapeResult: NewScrapeResult = {
      websiteId: website.id,
      url: data.url,
      prompt: data.prompt,
      analysisData: data.analysisData,
      interactiveElementsCount: data.interactiveElementsCount,
    };

    const created = await db.insert(scrapeResults).values(newScrapeResult).returning();
    return created[0];
  } catch (error) {
    console.error("Error in saveScrapeResult:", error);
    throw error;
  }
}

// Save test cases
export async function saveTestCases(data: {
  scrapeResultId: number;
  websiteId: number;
  testCases: any[];
}) {
  try {
    const testCaseRecords = data.testCases.map((tc) => ({
      scrapeResultId: data.scrapeResultId,
      websiteId: data.websiteId,
      testCaseId: tc.id,
      title: tc.title,
      description: tc.description,
      type: tc.type,
      priority: tc.priority,
      steps: tc.steps,
      expectedResult: tc.expectedResult,
      playwrightCode: tc.playwrightCode || null,
    }));

    await db.insert(testCases).values(testCaseRecords);
    return testCaseRecords.length;
  } catch (error) {
    console.error("Error in saveTestCases:", error);
    throw error;
  }
}

// Save execution result
export async function saveExecutionResult(data: {
  url: string;
  prompt: string;
  scrapeResultId?: number;
  success: boolean;
  totalActions?: number;
  successfulActions?: number;
  results?: any;
  screenshot?: string;
}) {
  try {
    const website = await getOrCreateWebsite(data.url);

    const newExecutionResult: NewExecutionResult = {
      websiteId: website.id,
      scrapeResultId: data.scrapeResultId,
      url: data.url,
      prompt: data.prompt,
      success: data.success,
      totalActions: data.totalActions,
      successfulActions: data.successfulActions,
      results: data.results,
      screenshot: data.screenshot,
    };

    const created = await db.insert(executionResults).values(newExecutionResult).returning();
    return created[0];
  } catch (error) {
    console.error("Error in saveExecutionResult:", error);
    throw error;
  }
}

// Get all scrape results for a URL
export async function getScrapeResultsByUrl(url: string) {
  try {
    const website = await db.select().from(websites).where(eq(websites.url, url)).limit(1);
    
    if (website.length === 0) {
      return [];
    }

    return await db.select().from(scrapeResults).where(eq(scrapeResults.websiteId, website[0].id));
  } catch (error) {
    console.error("Error in getScrapeResultsByUrl:", error);
    return [];
  }
}

// Get test cases for a scrape result
export async function getTestCasesByScrapeResultId(scrapeResultId: number) {
  try {
    return await db.select().from(testCases).where(eq(testCases.scrapeResultId, scrapeResultId));
  } catch (error) {
    console.error("Error in getTestCasesByScrapeResultId:", error);
    return [];
  }
}

// Get execution results for a URL
export async function getExecutionResultsByUrl(url: string) {
  try {
    const website = await db.select().from(websites).where(eq(websites.url, url)).limit(1);
    
    if (website.length === 0) {
      return [];
    }

    return await db.select().from(executionResults).where(eq(executionResults.websiteId, website[0].id));
  } catch (error) {
    console.error("Error in getExecutionResultsByUrl:", error);
    return [];
  }
}

// ===== FLAKY TEST DETECTOR QUERIES =====

// Get all test cases (for flaky test detection)
export async function getAllTestCases() {
  try {
    return await db.select().from(testCases);
  } catch (error) {
    console.error("Error in getAllTestCases:", error);
    return [];
  }
}

// Get test case by testCaseId
export async function getTestCaseByTestCaseId(testCaseId: string) {
  try {
    const results = await db.select().from(testCases).where(eq(testCases.testCaseId, testCaseId)).limit(1);
    return results.length > 0 ? results[0] : undefined;
  } catch (error) {
    console.error("Error in getTestCaseByTestCaseId:", error);
    return undefined;
  }
}

// Create test execution
export async function createTestExecution(data: NewTestExecution) {
  try {
    const created = await db.insert(testExecutions).values(data).returning();
    return created[0];
  } catch (error) {
    console.error("Error in createTestExecution:", error);
    throw error;
  }
}

// Get test executions by test case ID
export async function getTestExecutionsByTestCaseId(testCaseId: string) {
  try {
    return await db
      .select()
      .from(testExecutions)
      .where(eq(testExecutions.testCaseId, testCaseId))
      .orderBy(desc(testExecutions.executedAt));
  } catch (error) {
    console.error("Error in getTestExecutionsByTestCaseId:", error);
    return [];
  }
}

// Create flaky test
export async function createFlakyTest(data: NewFlakyTest) {
  try {
    const created = await db.insert(flakyTests).values(data).returning();
    return created[0];
  } catch (error) {
    console.error("Error in createFlakyTest:", error);
    throw error;
  }
}

// Get flaky test by test case ID
export async function getFlakyTestByTestCaseId(testCaseId: string) {
  try {
    const results = await db.select().from(flakyTests).where(eq(flakyTests.testCaseId, testCaseId)).limit(1);
    return results.length > 0 ? results[0] : undefined;
  } catch (error) {
    console.error("Error in getFlakyTestByTestCaseId:", error);
    return undefined;
  }
}

// Get all flaky tests (excluding resolved ones)
export async function getAllFlakyTests() {
  try {
    return await db
      .select()
      .from(flakyTests)
      .where(eq(flakyTests.isResolved, false))
      .orderBy(desc(flakyTests.flakinessScore));
  } catch (error) {
    console.error("Error in getAllFlakyTests:", error);
    return [];
  }
}

// Get flaky test by ID
export async function getFlakyTestById(id: number) {
  try {
    const results = await db.select().from(flakyTests).where(eq(flakyTests.id, id)).limit(1);
    return results.length > 0 ? results[0] : undefined;
  } catch (error) {
    console.error("Error in getFlakyTestById:", error);
    return undefined;
  }
}

// Update flaky test
export async function updateFlakyTest(id: number, updates: Partial<FlakyTest>) {
  try {
    const updated = await db
      .update(flakyTests)
      .set(updates)
      .where(eq(flakyTests.id, id))
      .returning();
    return updated.length > 0 ? updated[0] : undefined;
  } catch (error) {
    console.error("Error in updateFlakyTest:", error);
    return undefined;
  }
}
