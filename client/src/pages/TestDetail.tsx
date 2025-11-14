import { useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { RootCausePanel } from "@/components/root-cause-panel";
import { ExecutionHistory } from "@/components/execution-history";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CircularProgress, ProgressIndicator } from "@/components/progress-indicator";
import { RefreshCw, CheckCircle, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { TestExecution, FlakyTest as FlakyTestType } from "@shared/schema";

interface TestCaseFromDB {
  id: number;
  testCaseId: string;
  title: string;
  description: string;
  type: string;
  priority: string;
  websiteId: number;
  playwrightCode?: string;
}

export default function TestDetail() {
  const [, params] = useRoute("/test/:testCaseId");
  const testCaseId = params?.testCaseId || "";
  const { toast } = useToast();

  const { data: testCase, isLoading: testCaseLoading } = useQuery<TestCaseFromDB>({
    queryKey: ["/api/test-cases", testCaseId],
    enabled: !!testCaseId,
  });

  const { data: executions = [], isLoading: executionsLoading } = useQuery<TestExecution[]>({
    queryKey: ["/api/test-cases", testCaseId, "executions"],
    enabled: !!testCaseId,
  });

  const { data: flakyTests = [] } = useQuery<FlakyTestType[]>({
    queryKey: ["/api/flaky-tests"],
  });

  const flakyTest = flakyTests.find(ft => ft.testCaseId === testCaseId);

  const resolveTestMutation = useMutation({
    mutationFn: async () => {
      if (!flakyTest) throw new Error("No flaky test found");
      return apiRequest(`/api/flaky-tests/${flakyTest.id}/resolve`, {
        method: "PATCH",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/flaky-tests"] });
      toast({
        title: "Success",
        description: "Test marked as resolved",
      });
    },
  });

  if (testCaseLoading || executionsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Loading test details...</p>
      </div>
    );
  }

  if (!testCase) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8">
        <h1 className="text-2xl font-bold mb-4">Test Not Found</h1>
        <p className="text-muted-foreground mb-6">The requested test case could not be found.</p>
        <Link href="/flaky-tests">
          <Button data-testid="button-back">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Flaky Tests
          </Button>
        </Link>
      </div>
    );
  }

  const successRate = executions.length > 0
    ? ((executions.filter(e => e.status === "passed").length / executions.length) * 100)
    : 0;

  const timingData = executions.slice(0, 10).reverse().map((exec, index) => ({
    run: index + 1,
    time: exec.executionTime,
  }));

  const status = flakyTest ? (flakyTest.isResolved ? "resolved" : "flaky") : "passed";

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-semibold font-mono" data-testid="heading-test-name">
              {testCase.title}
            </h1>
            <StatusBadge status={status} />
          </div>
          <p className="text-sm text-muted-foreground">
            Test ID: <code className="font-mono">{testCase.testCaseId}</code>
          </p>
          <p className="text-sm text-muted-foreground">
            Type: {testCase.type} | Priority: {testCase.priority}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {flakyTest && !flakyTest.isResolved && (
            <Button
              variant="outline"
              onClick={() => resolveTestMutation.mutate()}
              disabled={resolveTestMutation.isPending}
              data-testid="button-mark-fixed"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Mark as Fixed
            </Button>
          )}
          <Link href="/flaky-tests">
            <Button variant="outline" data-testid="button-back-list">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to List
            </Button>
          </Link>
        </div>
      </div>

      {flakyTest && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-medium">Flakiness Analysis</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex justify-center">
                <CircularProgress value={Math.round(flakyTest.flakinessScore)} size={120} />
              </div>
              <div className="space-y-3">
                <ProgressIndicator
                  value={Math.round(successRate)}
                  label="Success Rate"
                  variant="success"
                />
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Runs</span>
                  <span className="font-medium">{flakyTest.totalRuns}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Failed Runs</span>
                  <span className="font-medium text-red-600 dark:text-red-400">
                    {flakyTest.failedRuns}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Timing Variance</span>
                  <span className="font-medium">{Math.round(flakyTest.timingVariance)}%</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {timingData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-medium">Execution Time Variance</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={timingData}>
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
                  Variance of {Math.round(flakyTest.timingVariance)}% indicates {flakyTest.timingVariance > 30 ? "significant" : "moderate"} timing-related issues
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {flakyTest && <RootCausePanel rootCauses={flakyTest.rootCauses} />}

      <ExecutionHistory executions={executions.slice(0, 20)} />
    </div>
  );
}
