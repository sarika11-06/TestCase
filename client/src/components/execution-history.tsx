import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "./status-badge";
import { AlertCircle, CheckCircle } from "lucide-react";
import type { TestExecution } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";

interface ExecutionHistoryProps {
  executions: TestExecution[];
}

export function ExecutionHistory({ executions }: ExecutionHistoryProps) {
  if (!executions || executions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium">Execution History</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No execution history available.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-medium">Execution History</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {executions.map((execution) => (
            <div
              key={execution.id}
              className="flex items-start gap-4 p-3 rounded-md bg-muted/50 hover-elevate"
              data-testid={`execution-${execution.id}`}
            >
              <div className="flex-shrink-0 pt-1">
                {execution.status === "passed" ? (
                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                )}
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <StatusBadge status={execution.status} />
                  <span className="text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(execution.executedAt), { addSuffix: true })}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>Execution time: {execution.executionTime}ms</span>
                  {execution.domStabilityScore !== null && (
                    <span>DOM stability: {execution.domStabilityScore}%</span>
                  )}
                </div>
                {execution.errorMessage && (
                  <div className="mt-2 p-2 rounded bg-background text-sm">
                    <p className="font-medium text-red-600 dark:text-red-400">Error:</p>
                    <p className="font-mono text-xs mt-1">{execution.errorMessage}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
