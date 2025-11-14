import { FileText, AlertTriangle, CheckCircle, Clock } from "lucide-react";
import { StatCard } from "@/components/stat-card";
import { TestExecutionChart } from "@/components/test-execution-chart";
import { FlakyTestTable } from "@/components/flaky-test-table";

//todo: remove mock functionality
const mockChartData = [
  { date: "Mon", passed: 145, failed: 8, flaky: 5 },
  { date: "Tue", passed: 152, failed: 6, flaky: 7 },
  { date: "Wed", passed: 148, failed: 12, flaky: 4 },
  { date: "Thu", passed: 161, failed: 5, flaky: 6 },
  { date: "Fri", passed: 155, failed: 9, flaky: 8 },
  { date: "Sat", passed: 143, failed: 4, flaky: 3 },
  { date: "Sun", passed: 139, failed: 7, flaky: 5 },
];

const mockFlakyTests = [
  {
    id: "1",
    name: "test_user_authentication_flow",
    flakinessScore: 87,
    failureRate: 42,
    lastFailed: "1 hour ago",
    rootCause: "Async timing: API response delays causing timeout failures",
    totalRuns: 50,
    failedRuns: 21,
  },
  {
    id: "2",
    name: "test_payment_checkout_process",
    flakinessScore: 73,
    failureRate: 31,
    lastFailed: "3 hours ago",
    rootCause: "DOM instability: Payment modal element not consistently found",
    totalRuns: 45,
    failedRuns: 14,
  },
  {
    id: "3",
    name: "test_product_search_filter",
    flakinessScore: 65,
    failureRate: 28,
    lastFailed: "5 hours ago",
    rootCause: "Resource dependency: Third-party search API intermittent failures",
    totalRuns: 60,
    failedRuns: 17,
  },
];

export default function Dashboard() {
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

      <div className="grid grid-cols-4 gap-6">
        <StatCard
          title="Total Tests Executed"
          value="1,234"
          subtitle="Last 30 days"
          icon={FileText}
          trend={{ value: 12, isPositive: true }}
        />
        <StatCard
          title="Flaky Tests Detected"
          value="23"
          subtitle="1.9% of total"
          icon={AlertTriangle}
          trend={{ value: 5, isPositive: false }}
        />
        <StatCard
          title="Success Rate"
          value="94.2%"
          subtitle="Pass rate"
          icon={CheckCircle}
          trend={{ value: 2, isPositive: true }}
        />
        <StatCard
          title="Avg Execution Time"
          value="1.8s"
          subtitle="Per test"
          icon={Clock}
        />
      </div>

      <TestExecutionChart data={mockChartData} />

      <FlakyTestTable tests={mockFlakyTests} title="Recent Flaky Tests" />
    </div>
  );
}
