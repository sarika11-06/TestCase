import { useState } from "react";
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

//todo: remove mock functionality
const mockAllFlakyTests = [
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
  {
    id: "4",
    name: "test_user_profile_update",
    flakinessScore: 58,
    failureRate: 24,
    lastFailed: "8 hours ago",
    rootCause: "Concurrency: Race condition in profile save operation",
    totalRuns: 55,
    failedRuns: 13,
  },
  {
    id: "5",
    name: "test_notification_system",
    flakinessScore: 51,
    failureRate: 19,
    lastFailed: "12 hours ago",
    rootCause: "Timing: WebSocket connection timing variability",
    totalRuns: 70,
    failedRuns: 13,
  },
];

export default function FlakyTests() {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("flakiness");

  const filteredTests = mockAllFlakyTests
    .filter((test) =>
      test.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === "flakiness") return b.flakinessScore - a.flakinessScore;
      if (sortBy === "recent") return 0;
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

      <div className="flex items-center gap-4">
        <div className="relative flex-1">
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
        <Button variant="outline" data-testid="button-filter">
          <Filter className="h-4 w-4 mr-2" />
          Filters
        </Button>
      </div>

      <FlakyTestTable tests={filteredTests} title="All Flaky Tests" />
    </div>
  );
}
