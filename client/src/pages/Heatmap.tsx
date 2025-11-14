import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink } from "lucide-react";

interface Website {
  id: number;
  url: string;
  domain: string;
  path: string | null;
  createdAt: string;
}

interface TestCaseFromDB {
  id: number;
  testCaseId: string;
  title: string;
  websiteId: number;
  type: string;
  createdAt: string;
}

interface WebsiteHeatmapData {
  website: Website;
  testCount: number;
  typeDistribution: Record<string, number>;
  latestTestDate: string;
}

export default function Heatmap() {
  const { data: websites = [], isLoading: websitesLoading } = useQuery<Website[]>({
    queryKey: ["/api/websites"],
  });

  const { data: allTestCases = [], isLoading: testsLoading } = useQuery<TestCaseFromDB[]>({
    queryKey: ["/api/test-cases"],
  });

  const heatmapData: WebsiteHeatmapData[] = websites.map(website => {
    const websiteTests = allTestCases.filter(tc => tc.websiteId === website.id);
    const typeDistribution: Record<string, number> = {};
    
    websiteTests.forEach(test => {
      typeDistribution[test.type] = (typeDistribution[test.type] || 0) + 1;
    });

    const latestTest = websiteTests.reduce((latest, test) => {
      return !latest || new Date(test.createdAt) > new Date(latest.createdAt) ? test : latest;
    }, null as TestCaseFromDB | null);

    return {
      website,
      testCount: websiteTests.length,
      typeDistribution,
      latestTestDate: latestTest?.createdAt || website.createdAt,
    };
  }).sort((a, b) => b.testCount - a.testCount);

  const maxTests = Math.max(...heatmapData.map(d => d.testCount), 1);

  const getHeatColor = (count: number) => {
    const intensity = count / maxTests;
    if (intensity > 0.7) return "bg-red-500 dark:bg-red-600";
    if (intensity > 0.4) return "bg-orange-500 dark:bg-orange-600";
    if (intensity > 0.1) return "bg-yellow-500 dark:bg-yellow-600";
    return "bg-green-500 dark:bg-green-600";
  };

  if (websitesLoading || testsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Loading heatmap data...</p>
      </div>
    );
  }

  if (heatmapData.length === 0) {
    return (
      <div className="p-8 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold" data-testid="heading-heatmap">
            Test Case Heatmap
          </h1>
          <p className="text-muted-foreground mt-1">
            Visual representation of test case distribution across websites
          </p>
        </div>
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">No test case data available yet. Generate some test cases to see the heatmap.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold" data-testid="heading-heatmap">
          Test Case Heatmap
        </h1>
        <p className="text-muted-foreground mt-1">
          Visual representation of test case distribution across websites
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {heatmapData.map((data) => (
          <Card
            key={data.website.id}
            className="hover-elevate"
            data-testid={`heatmap-website-${data.website.id}`}
          >
            <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0 pb-4">
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <CardTitle className="text-base font-medium">
                    {data.website.domain}
                  </CardTitle>
                  <a
                    href={data.website.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
                <p className="text-sm text-muted-foreground font-mono">
                  {data.website.url}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className={`h-8 w-8 rounded-md ${getHeatColor(data.testCount)} flex items-center justify-center`}>
                  <span className="text-xs font-bold text-white">{data.testCount}</span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Total Test Cases</span>
                  <span className="font-medium">{data.testCount}</span>
                </div>
                <div className="space-y-2">
                  <span className="text-sm text-muted-foreground">Type Distribution</span>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(data.typeDistribution).map(([type, count]) => (
                      <Badge key={type} variant="secondary" className="text-xs">
                        {type}: {count}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="pt-2 border-t">
                  <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full ${getHeatColor(data.testCount)} transition-all duration-300`}
                      style={{ width: `${(data.testCount / maxTests) * 100}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {((data.testCount / maxTests) * 100).toFixed(1)}% of max test coverage
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium">Legend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded bg-green-500" />
              <span className="text-sm">Low (1-{Math.round(maxTests * 0.1)} tests)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded bg-yellow-500" />
              <span className="text-sm">Medium ({Math.round(maxTests * 0.1)}-{Math.round(maxTests * 0.4)} tests)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded bg-orange-500" />
              <span className="text-sm">High ({Math.round(maxTests * 0.4)}-{Math.round(maxTests * 0.7)} tests)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded bg-red-500" />
              <span className="text-sm">Very High ({Math.round(maxTests * 0.7)}+ tests)</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
