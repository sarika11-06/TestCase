import { eq } from "drizzle-orm";
import { db } from "./connection";
import { websites, scrapeResults, testCases, executionResults } from "./schema";
import type { NewWebsite, NewScrapeResult, NewTestCase, NewExecutionResult } from "./schema";

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
