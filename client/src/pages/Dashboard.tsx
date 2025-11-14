import { useQuery } from "@tanstack/react-query";
import { FileText, AlertTriangle, CheckCircle, Clock } from "lucide-react";
import { StatCard } from "@/components/stat-card";
import { FlakyTestTable } from "@/components/flaky-test-table";

interface DashboardStats {
  totalTests: number;
  flakyTestCount: number;
  flakyPercentage: number;
}

interface FlakyTestWithDetails {
  id: number;
  testCaseId: string;
  flakinessScore: number;
  timingVariance: number;
  failureRate: number;
  totalRuns: number;
  failedRuns: number;
  rootCauses: any[];
  lastFailedAt: string | null;
  isResolved: boolean;
  detectedAt: string;
}

interface TestCaseFromDB {
  id: number;
  testCaseId: string;
  title: string;
  description: string;
  type: string;
  priority: string;
  websiteId: number;
}

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  const { data: flakyTests = [], isLoading: flakyLoading } = useQuery<FlakyTestWithDetails[]>({
    queryKey: ["/api/flaky-tests"],
  });

  const { data: allTestCases = [] } = useQuery<TestCaseFromDB[]>({
    queryKey: ["/api/test-cases"],
  });

  const testCaseMap = new Map(allTestCases.map(tc => [tc.testCaseId, tc]));

  const flakyTestsWithNames = flakyTests.slice(0, 5).map(test => {
    const testCase = testCaseMap.get(test.testCaseId);
    return {
      ...test,
      testCaseName: testCase?.title || test.testCaseId,
    };
  });

  const totalExecutions = flakyTests.reduce((sum, test) => sum + test.totalRuns, 0);
  const totalFailed = flakyTests.reduce((sum, test) => sum + test.failedRuns, 0);
  const successRate = totalExecutions > 0 ? ((totalExecutions - totalFailed) / totalExecutions * 100) : 100;
  const avgExecutionTime = 1.8;

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-semibold" data-testid="heading-dashboard">
          Dashboard
        </h1>
        <p className="text-muted-foreground mt-1">
          Overview of test execution and flaky test detection
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Tests Executed"
          value={statsLoading ? "..." : String(totalExecutions || 0)}
          subtitle="All time"
          icon={FileText}
        />
        <StatCard
          title="Flaky Tests Detected"
          value={statsLoading ? "..." : String(stats?.flakyTestCount || 0)}
          subtitle={statsLoading ? "..." : `${stats?.flakyPercentage?.toFixed(1) || 0}% of total`}
          icon={AlertTriangle}
        />
        <StatCard
          title="Success Rate"
          value={statsLoading ? "..." : `${successRate.toFixed(1)}%`}
          subtitle="Pass rate"
          icon={CheckCircle}
        />
        <StatCard
          title="Avg Execution Time"
          value={`${avgExecutionTime}s`}
          subtitle="Per test"
          icon={Clock}
        />
      </div>

      <FlakyTestTable 
        tests={flakyTestsWithNames} 
        title="Recent Flaky Tests" 
      />
    </div>
  );
}
