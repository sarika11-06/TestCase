import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FlakyTestTable } from "@/components/flaky-test-table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Filter } from "lucide-react";

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

export default function FlakyTests() {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("flakiness");

  const { data: flakyTests = [], isLoading } = useQuery<FlakyTestWithDetails[]>({
    queryKey: ["/api/flaky-tests"],
  });

  const { data: allTestCases = [] } = useQuery<TestCaseFromDB[]>({
    queryKey: ["/api/test-cases"],
  });

  const testCaseMap = new Map(allTestCases.map(tc => [tc.testCaseId, tc]));

  const flakyTestsWithNames = flakyTests.map(test => {
    const testCase = testCaseMap.get(test.testCaseId);
    return {
      ...test,
      testCaseName: testCase?.title || test.testCaseId,
    };
  });

  const filteredTests = flakyTestsWithNames
    .filter((test) =>
      test.testCaseName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      test.testCaseId.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === "flakiness") return b.flakinessScore - a.flakinessScore;
      if (sortBy === "recent") {
        const aDate = a.lastFailedAt ? new Date(a.lastFailedAt).getTime() : 0;
        const bDate = b.lastFailedAt ? new Date(b.lastFailedAt).getTime() : 0;
        return bDate - aDate;
      }
      if (sortBy === "failures") return b.failedRuns - a.failedRuns;
      return 0;
    });

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold" data-testid="heading-flaky-tests">
          Flaky Tests
        </h1>
        <p className="text-muted-foreground mt-1">
          All detected flaky tests with detailed analysis
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tests..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="input-search-tests"
          />
        </div>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-48" data-testid="select-sort">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="flakiness">Flakiness Score</SelectItem>
            <SelectItem value="recent">Most Recent</SelectItem>
            <SelectItem value="failures">Most Failures</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center p-8">
          <p className="text-muted-foreground">Loading flaky tests...</p>
        </div>
      ) : (
        <FlakyTestTable tests={filteredTests} title={`All Flaky Tests (${filteredTests.length})`} />
      )}
    </div>
  );
}
