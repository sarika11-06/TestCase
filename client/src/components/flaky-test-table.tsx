import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";
import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";

interface FlakyTestData {
  id: number;
  testCaseId: string;
  testCaseName: string;
  flakinessScore: number;
  failureRate: number;
  lastFailedAt: Date | null;
  rootCauses: any[];
  totalRuns: number;
  failedRuns: number;
}

interface FlakyTestTableProps {
  tests: FlakyTestData[];
  title: string;
}

export function FlakyTestTable({ tests, title }: FlakyTestTableProps) {
  const getFlakinessColor = (score: number) => {
    if (score >= 75) return "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300";
    if (score >= 50) return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300";
    return "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300";
  };

  if (!tests || tests.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No flaky tests detected.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {tests.map((test) => (
            <Link key={test.id} href={`/test/${test.testCaseId}`}>
              <div
                className="flex items-center gap-4 p-4 rounded-md bg-muted/50 hover-elevate cursor-pointer"
                data-testid={`test-row-${test.testCaseId}`}
              >
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-mono text-sm font-medium">{test.testCaseName}</h4>
                    <Badge className={getFlakinessColor(test.flakinessScore)}>
                      {test.flakinessScore}% flaky
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>Failure rate: {Math.round(test.failureRate)}%</span>
                    <span>Runs: {test.totalRuns} ({test.failedRuns} failed)</span>
                    {test.lastFailedAt && (
                      <span>Last failed: {formatDistanceToNow(new Date(test.lastFailedAt), { addSuffix: true })}</span>
                    )}
                  </div>
                  {test.rootCauses && test.rootCauses.length > 0 && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Primary cause: {test.rootCauses[0].description.substring(0, 100)}...
                    </p>
                  )}
                </div>
                <Button variant="ghost" size="icon" data-testid={`button-view-${test.testCaseId}`}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
