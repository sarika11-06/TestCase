import { useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { RootCausePanel } from "@/components/root-cause-panel";
import { ExecutionHistory } from "@/components/execution-history";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProgressIndicator, CircularProgress } from "@/components/progress-indicator";
import { RefreshCw, Archive, CheckCircle } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

//todo: remove mock functionality
const mockTestData = {
  id: "1",
  name: "test_user_authentication_flow",
  url: "https://example.com/login",
  status: "flaky" as const,
  flakinessScore: 87,
  lastRun: "1 hour ago",
  totalRuns: 50,
  failedRuns: 21,
  successRate: 58,
};

const mockRootCauses = [
  {
    type: "timing" as const,
    confidence: 85,
    description: "Wait conditions failing due to variable API response times. The authentication endpoint has inconsistent response times (200ms-2000ms) causing timeout failures.",
    location: "Line 45: waitForElement('#login-button', { timeout: 1000 })",
  },
  {
    type: "dom" as const,
    confidence: 62,
    description: "Element selector inconsistent across page loads. The login button ID changes between '#login-btn' and '#login-button' in different scenarios.",
    location: "Line 78: querySelector('#login-button')",
  },
];

const mockExecutions = [
  { id: "1", status: "passed" as const, executionTime: 1250, timestamp: "2 mins ago" },
  { id: "2", status: "failed" as const, executionTime: 2340, timestamp: "1 hour ago", errorMessage: "Timeout: Element not found within 1000ms", stackTrace: "TimeoutError: Element not found\n  at waitForElement (test.js:45)\n  at testLogin (test.js:12)" },
  { id: "3", status: "passed" as const, executionTime: 1180, timestamp: "3 hours ago" },
  { id: "4", status: "failed" as const, executionTime: 1890, timestamp: "5 hours ago", errorMessage: "Element selector returned null" },
  { id: "5", status: "passed" as const, executionTime: 1320, timestamp: "7 hours ago" },
  { id: "6", status: "failed" as const, executionTime: 2100, timestamp: "9 hours ago", errorMessage: "Timeout: Element not found within 1000ms" },
];

const mockTimingData = [
  { run: 1, time: 1250 },
  { run: 2, time: 2340 },
  { run: 3, time: 1180 },
  { run: 4, time: 1890 },
  { run: 5, time: 1320 },
  { run: 6, time: 2100 },
  { run: 7, time: 1450 },
  { run: 8, time: 1680 },
  { run: 9, time: 1200 },
  { run: 10, time: 1950 },
];

export default function TestDetail() {
  const [, params] = useRoute("/test/:id");

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold font-mono" data-testid="heading-test-name">
              {mockTestData.name}
            </h1>
            <StatusBadge status={mockTestData.status} />
          </div>
          <p className="text-sm text-muted-foreground">
            URL: <code className="font-mono">{mockTestData.url}</code>
          </p>
          <p className="text-sm text-muted-foreground">
            Last run: {mockTestData.lastRun}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" data-testid="button-rerun">
            <RefreshCw className="h-4 w-4 mr-2" />
            Re-run Test
          </Button>
          <Button variant="outline" data-testid="button-mark-fixed">
            <CheckCircle className="h-4 w-4 mr-2" />
            Mark as Fixed
          </Button>
          <Button variant="outline" data-testid="button-archive">
            <Archive className="h-4 w-4 mr-2" />
            Archive
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-medium">Flakiness Analysis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex justify-center">
              <CircularProgress value={mockTestData.flakinessScore} size={120} />
            </div>
            <div className="space-y-3">
              <ProgressIndicator
                value={mockTestData.successRate}
                label="Success Rate"
                variant="success"
              />
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Runs</span>
                <span className="font-medium">{mockTestData.totalRuns}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Failed Runs</span>
                <span className="font-medium text-red-600 dark:text-red-400">
                  {mockTestData.failedRuns}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-medium">Execution Time Variance</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={mockTimingData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis
                  dataKey="run"
                  className="text-xs"
                  tick={{ fill: "hsl(var(--muted-foreground))" }}
                />
                <YAxis
                  className="text-xs"
                  tick={{ fill: "hsl(var(--muted-foreground))" }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "6px",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="time"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ fill: "hsl(var(--primary))" }}
                />
              </LineChart>
            </ResponsiveContainer>
            <p className="text-xs text-muted-foreground mt-4">
              High variance (±47%) in execution time indicates timing-related flakiness
            </p>
          </CardContent>
        </Card>
      </div>

      <RootCausePanel rootCauses={mockRootCauses} />

      <ExecutionHistory executions={mockExecutions} />
    </div>
  );
}
