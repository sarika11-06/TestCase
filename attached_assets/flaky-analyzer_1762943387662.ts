import { type TestExecution, type RootCause } from "@shared/schema";

export interface FlakyAnalysisResult {
  isFlakey: boolean;
  flakinessScore: number;
  timingVariance: number;
  failureRate: number;
  rootCauses: RootCause[];
}

export class FlakyTestAnalyzer {
  analyze(executions: TestExecution[]): FlakyAnalysisResult {
    if (executions.length < 3) {
      return {
        isFlakey: false,
        flakinessScore: 0,
        timingVariance: 0,
        failureRate: 0,
        rootCauses: [],
      };
    }

    const failedRuns = executions.filter((e) => e.status === "failed").length;
    const totalRuns = executions.length;
    const failureRate = (failedRuns / totalRuns) * 100;

    const timingVariance = this.calculateTimingVariance(executions);
    const domStability = this.calculateDOMStability(executions);
    const rootCauses = this.identifyRootCauses(executions, timingVariance, domStability);

    const hasIntermittentFailures = failedRuns > 0 && failedRuns < totalRuns;
    const highVariance = timingVariance > 30;
    const lowDOMStability = domStability < 70;

    const isFlakey = hasIntermittentFailures && (highVariance || lowDOMStability);

    let flakinessScore = 0;
    if (isFlakey) {
      flakinessScore = Math.min(
        100,
        failureRate * 0.5 + timingVariance * 0.3 + (100 - domStability) * 0.2
      );
    }

    return {
      isFlakey,
      flakinessScore: Math.round(flakinessScore),
      timingVariance: Math.round(timingVariance),
      failureRate: Math.round(failureRate),
      rootCauses,
    };
  }

  private calculateTimingVariance(executions: TestExecution[]): number {
    const times = executions.map((e) => e.executionTime);
    const avg = times.reduce((sum, t) => sum + t, 0) / times.length;
    const variance = times.reduce((sum, t) => sum + Math.pow(t - avg, 2), 0) / times.length;
    const stdDev = Math.sqrt(variance);
    return (stdDev / avg) * 100;
  }

  private calculateDOMStability(executions: TestExecution[]): number {
    const scores = executions
      .map((e) => e.domStabilityScore)
      .filter((s): s is number => s !== null);
    
    if (scores.length === 0) return 100;
    
    return scores.reduce((sum, s) => sum + s, 0) / scores.length;
  }

  private identifyRootCauses(
    executions: TestExecution[],
    timingVariance: number,
    domStability: number
  ): RootCause[] {
    const rootCauses: RootCause[] = [];
    const failedExecutions = executions.filter((e) => e.status === "failed");

    if (timingVariance > 30) {
      const confidence = Math.min(95, timingVariance * 1.5);
      const avgTime = executions.reduce((sum, e) => sum + e.executionTime, 0) / executions.length;
      const hasWaitFailures = failedExecutions.some((e) => e.waitConditionFailures && e.waitConditionFailures > 0);
      
      rootCauses.push({
        type: "timing",
        confidence: Math.round(confidence),
        description: hasWaitFailures
          ? `High timing variance (${Math.round(timingVariance)}%) with wait condition failures. Average execution time: ${Math.round(avgTime)}ms with significant fluctuation.`
          : `High timing variance (${Math.round(timingVariance)}%) indicates inconsistent async operations or network delays.`,
      });
    }

    if (domStability < 70) {
      rootCauses.push({
        type: "dom",
        confidence: Math.round(100 - domStability),
        description: `Low DOM stability score (${Math.round(domStability)}%) suggests element locators are inconsistent or page structure changes dynamically.`,
      });
    }

    const hasNetworkIssues = failedExecutions.some(
      (e) => e.networkCallCount && e.networkCallCount > 5
    );
    if (hasNetworkIssues) {
      rootCauses.push({
        type: "resource",
        confidence: 65,
        description: "Multiple network calls detected in failed executions, indicating potential external API dependency issues.",
      });
    }

    const executionTimeSpread = executions.map((e) => e.executionTime);
    const hasHighConcurrencyRisk =
      Math.max(...executionTimeSpread) / Math.min(...executionTimeSpread) > 2;
    if (hasHighConcurrencyRisk && timingVariance > 40) {
      rootCauses.push({
        type: "concurrency",
        confidence: Math.min(85, timingVariance),
        description: "Execution time spread suggests potential race conditions or resource contention issues.",
      });
    }

    return rootCauses.sort((a, b) => b.confidence - a.confidence);
  }
}
