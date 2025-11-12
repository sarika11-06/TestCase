import {
  type TestCase,
  type InsertTestCase,
  type TestExecution,
  type InsertTestExecution,
  type FlakyTest,
  type InsertFlakyTest,
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Test Cases
  getTestCase(id: string): Promise<TestCase | undefined>;
  getAllTestCases(): Promise<TestCase[]>;
  createTestCase(testCase: InsertTestCase): Promise<TestCase>;

  // Test Executions
  getTestExecution(id: string): Promise<TestExecution | undefined>;
  getTestExecutionsByTestCaseId(testCaseId: string): Promise<TestExecution[]>;
  createTestExecution(execution: InsertTestExecution): Promise<TestExecution>;

  // Flaky Tests
  getFlakyTest(id: string): Promise<FlakyTest | undefined>;
  getFlakyTestByTestCaseId(testCaseId: string): Promise<FlakyTest | undefined>;
  getAllFlakyTests(): Promise<FlakyTest[]>;
  createFlakyTest(flakyTest: InsertFlakyTest): Promise<FlakyTest>;
  updateFlakyTest(id: string, updates: Partial<FlakyTest>): Promise<FlakyTest | undefined>;
}

export class MemStorage implements IStorage {
  private testCases: Map<string, TestCase>;
  private testExecutions: Map<string, TestExecution>;
  private flakyTests: Map<string, FlakyTest>;

  constructor() {
    this.testCases = new Map();
    this.testExecutions = new Map();
    this.flakyTests = new Map();
  }

  // Test Cases
  async getTestCase(id: string): Promise<TestCase | undefined> {
    return this.testCases.get(id);
  }

  async getAllTestCases(): Promise<TestCase[]> {
    return Array.from(this.testCases.values());
  }

  async createTestCase(insertTestCase: InsertTestCase): Promise<TestCase> {
    const id = randomUUID();
    const testCase: TestCase = {
      ...insertTestCase,
      id,
      createdAt: new Date(),
    };
    this.testCases.set(id, testCase);
    return testCase;
  }

  // Test Executions
  async getTestExecution(id: string): Promise<TestExecution | undefined> {
    return this.testExecutions.get(id);
  }

  async getTestExecutionsByTestCaseId(testCaseId: string): Promise<TestExecution[]> {
    return Array.from(this.testExecutions.values())
      .filter((execution) => execution.testCaseId === testCaseId)
      .sort((a, b) => b.executedAt.getTime() - a.executedAt.getTime());
  }

  async createTestExecution(insertExecution: InsertTestExecution): Promise<TestExecution> {
    const id = randomUUID();
    const execution: TestExecution = {
      ...insertExecution,
      id,
      executedAt: new Date(),
    };
    this.testExecutions.set(id, execution);
    return execution;
  }

  // Flaky Tests
  async getFlakyTest(id: string): Promise<FlakyTest | undefined> {
    return this.flakyTests.get(id);
  }

  async getFlakyTestByTestCaseId(testCaseId: string): Promise<FlakyTest | undefined> {
    return Array.from(this.flakyTests.values()).find(
      (flakyTest) => flakyTest.testCaseId === testCaseId
    );
  }

  async getAllFlakyTests(): Promise<FlakyTest[]> {
    return Array.from(this.flakyTests.values())
      .filter((test) => !test.isResolved)
      .sort((a, b) => b.flakinessScore - a.flakinessScore);
  }

  async createFlakyTest(insertFlakyTest: InsertFlakyTest): Promise<FlakyTest> {
    const id = randomUUID();
    const flakyTest: FlakyTest = {
      ...insertFlakyTest,
      id,
      detectedAt: new Date(),
    };
    this.flakyTests.set(id, flakyTest);
    return flakyTest;
  }

  async updateFlakyTest(id: string, updates: Partial<FlakyTest>): Promise<FlakyTest | undefined> {
    const existing = this.flakyTests.get(id);
    if (!existing) return undefined;

    const updated = { ...existing, ...updates };
    this.flakyTests.set(id, updated);
    return updated;
  }
}

export const storage = new MemStorage();
