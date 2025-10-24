import type { Express } from "express";
import { createServer, type Server } from "http";
import { generateTestCasesRequestSchema } from "@shared/schema";
import { analyzeWebsite } from "./scraper";
import { generateTestCases } from "./testCaseGenerator";

export async function registerRoutes(app: Express): Promise<Server> {
  app.post("/api/generate-test-cases", async (req, res) => {
    try {
      const validationResult = generateTestCasesRequestSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        return res.status(400).json({ 
          error: "Invalid request data",
          details: validationResult.error.errors 
        });
      }

      const { url, prompt } = validationResult.data;

      // Step 1: Analyze the website
      console.log(`Analyzing website: ${url}`);
      const analysis = await analyzeWebsite(url);

      // Step 2: Generate test cases using AI
      console.log(`Generating test cases with prompt: ${prompt}`);
      const result = await generateTestCases(analysis, prompt);

      res.json(result);
    } catch (error) {
      console.error("Error in generate-test-cases:", error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to generate test cases" 
      });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
