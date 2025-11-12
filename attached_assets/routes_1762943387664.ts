import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { FlakyTestAnalyzer } from "./flaky-analyzer";
import { insertTestCaseSchema, insertTestExecutionSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  const analyzer = new FlakyTestAnalyzer();

  // Get all test cases
  app.get("/api/test-cases", async (_req, res) => {
    try {
      const testCases = await storage.getAllTestCases();
      res.json(testCases);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch test cases" });
    }
  });

  // Create a new test case
  app.post("/api/test-cases", async (req, res) => {
    try {
      const parsed = insertTestCaseSchema.parse(req.body);
      const testCase = await storage.createTestCase(parsed);
      res.status(201).json(testCase);
    } catch (error) {
      res.status(400).json({ error: "Invalid test case data" });
    }
  });

  // Get test case by ID
  app.get("/api/test-cases/:id", async (req, res) => {
    try {
      const testCase = await storage.getTestCase(req.params.id);
      if (!testCase) {
        return res.status(404).json({ error: "Test case not found" });
      }
      res.json(testCase);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch test case" });
    }
  });

  // Create test execution and analyze for flakiness
  app.post("/api/test-executions", async (req, res) => {
    try {
      const parsed = insertTestExecutionSchema.parse(req.body);
      const execution = await storage.createTestExecution(parsed);

      const allExecutions = await storage.getTestExecutionsByTestCaseId(parsed.testCaseId);

      if (allExecutions.length >= 5) {
        const analysis = analyzer.analyze(allExecutions);

        if (analysis.isFlakey) {
          const existingFlakyTest = await storage.getFlakyTestByTestCaseId(parsed.testCaseId);

          if (existingFlakyTest) {
            await storage.updateFlakyTest(existingFlakyTest.id, {
              flakinessScore: analysis.flakinessScore,
              timingVariance: analysis.timingVariance,
              failureRate: analysis.failureRate,
              totalRuns: allExecutions.length,
              failedRuns: allExecutions.filter((e) => e.status === "failed").length,
              rootCauses: analysis.rootCauses,
              lastFailedAt: parsed.status === "failed" ? new Date() : existingFlakyTest.lastFailedAt,
            });
          } else {
            await storage.createFlakyTest({
              testCaseId: parsed.testCaseId,
              flakinessScore: analysis.flakinessScore,
              timingVariance: analysis.timingVariance,
              failureRate: analysis.failureRate,
              totalRuns: allExecutions.length,
              failedRuns: allExecutions.filter((e) => e.status === "failed").length,
              rootCauses: analysis.rootCauses,
              lastFailedAt: parsed.status === "failed" ? new Date() : null,
              isResolved: false,
            });
          }
        }
      }

      res.status(201).json(execution);
    } catch (error) {
      res.status(400).json({ error: "Invalid execution data" });
    }
  });

  // Get executions for a test case
  app.get("/api/test-cases/:id/executions", async (req, res) => {
    try {
      const executions = await storage.getTestExecutionsByTestCaseId(req.params.id);
      res.json(executions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch executions" });
    }
  });

  // Get all flaky tests
  app.get("/api/flaky-tests", async (_req, res) => {
    try {
      const flakyTests = await storage.getAllFlakyTests();
      res.json(flakyTests);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch flaky tests" });
    }
  });

  // Get flaky test details
  app.get("/api/flaky-tests/:id", async (req, res) => {
    try {
      const flakyTest = await storage.getFlakyTest(req.params.id);
      if (!flakyTest) {
        return res.status(404).json({ error: "Flaky test not found" });
      }
      res.json(flakyTest);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch flaky test" });
    }
  });

  // Mark flaky test as resolved
  app.patch("/api/flaky-tests/:id/resolve", async (req, res) => {
    try {
      const updated = await storage.updateFlakyTest(req.params.id, { isResolved: true });
      if (!updated) {
        return res.status(404).json({ error: "Flaky test not found" });
      }
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update flaky test" });
    }
  });

  // Get dashboard stats
  app.get("/api/dashboard/stats", async (_req, res) => {
    try {
      const allTestCases = await storage.getAllTestCases();
      const allFlakyTests = await storage.getAllFlakyTests();

      const last30Days = new Date();
      last30Days.setDate(last30Days.getDate() - 30);

      const totalTests = allTestCases.length;
      const flakyTestCount = allFlakyTests.length;
      const flakyPercentage = totalTests > 0 ? (flakyTestCount / totalTests) * 100 : 0;

      res.json({
        totalTests,
        flakyTestCount,
        flakyPercentage: Math.round(flakyPercentage * 10) / 10,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
