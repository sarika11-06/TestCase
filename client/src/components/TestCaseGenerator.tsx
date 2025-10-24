import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Loader2, Globe, Sparkles, Download, Copy, ChevronDown, ChevronUp, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { GenerateTestCasesRequest, TestCaseGenerationResponse, TestCase } from "@shared/schema";
import { generateTestCasesRequestSchema } from "@shared/schema";

export default function TestCaseGenerator() {
  const [generatedData, setGeneratedData] = useState<TestCaseGenerationResponse | null>(null);
  const [expandedTestCase, setExpandedTestCase] = useState<string | null>(null);
  const { toast } = useToast();

  const form = useForm<GenerateTestCasesRequest>({
    resolver: zodResolver(generateTestCasesRequestSchema),
    defaultValues: {
      url: "",
      prompt: "",
    },
  });

  const generateMutation = useMutation({
    mutationFn: async (data: GenerateTestCasesRequest) => {
      const response = await apiRequest<TestCaseGenerationResponse>(
        "POST",
        "/api/generate-test-cases",
        data
      );
      return response;
    },
    onSuccess: (data) => {
      setGeneratedData(data);
      toast({
        title: "Test cases generated successfully!",
        description: `Generated ${data.summary.totalTests} test cases`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Generation failed",
        description: error.message || "Failed to generate test cases. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: GenerateTestCasesRequest) => {
    generateMutation.mutate(data);
  };

  const handleCopyTestCase = (testCase: TestCase) => {
    const content = `# ${testCase.title}

**Type:** ${testCase.type}
**Priority:** ${testCase.priority}

## Description
${testCase.description}

## Steps
${testCase.steps.map((step, idx) => `${idx + 1}. ${step}`).join('\n')}

## Expected Result
${testCase.expectedResult}

${testCase.playwrightCode ? `## Playwright Code\n\`\`\`javascript\n${testCase.playwrightCode}\n\`\`\`` : ''}`;

    navigator.clipboard.writeText(content);
    toast({
      title: "Copied to clipboard",
      description: "Test case copied successfully",
    });
  };

  const handleDownloadAll = () => {
    if (!generatedData) return;

    const content = `# Test Cases for ${generatedData.analysis.url}

Generated on: ${new Date().toLocaleString()}

## Summary
- Total Tests: ${generatedData.summary.totalTests}
- Coverage Areas: ${generatedData.summary.coverageAreas.join(', ')}

${Object.entries(generatedData.summary.byType).map(([type, count]) => `- ${type}: ${count}`).join('\n')}

---

${generatedData.testCases.map((tc) => `
# ${tc.title}

**Type:** ${tc.type}
**Priority:** ${tc.priority}

## Description
${tc.description}

## Steps
${tc.steps.map((step, idx) => `${idx + 1}. ${step}`).join('\n')}

## Expected Result
${tc.expectedResult}

${tc.playwrightCode ? `## Playwright Code\n\`\`\`javascript\n${tc.playwrightCode}\n\`\`\`` : ''}

---
`).join('\n')}`;

    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `test-cases-${new Date().getTime()}.md`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Downloaded successfully",
      description: "All test cases downloaded as Markdown file",
    });
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      UI: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
      API: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",
      E2E: "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20",
      Integration: "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20",
      Unit: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-500/20",
      Performance: "bg-pink-500/10 text-pink-700 dark:text-pink-400 border-pink-500/20",
      Security: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20",
      Accessibility: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/20",
    };
    return colors[type] || "bg-muted text-muted-foreground";
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      High: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20",
      Medium: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20",
      Low: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",
    };
    return colors[priority] || "bg-muted text-muted-foreground";
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Sparkles className="w-8 h-8 text-primary" />
            <h1 className="text-2xl font-semibold text-foreground">AI Test Case Generator</h1>
          </div>
          <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
            Automatically generate comprehensive test cases for any website using advanced AI analysis
          </p>
        </div>

        {/* Input Form */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-lg font-medium">Generate Test Cases</CardTitle>
            <CardDescription className="text-sm">
              Enter a website URL and describe what you want to test
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Website URL</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            placeholder="https://example.com"
                            className="pl-10"
                            data-testid="input-url"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormDescription className="text-xs">
                        The URL of the website you want to test
                      </FormDescription>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="prompt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Testing Instructions</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe what you want to test... (e.g., 'Test all form validations, user login flow, and navigation menu interactions')"
                          className="resize-none min-h-[120px]"
                          data-testid="input-prompt"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription className="text-xs">
                        Be specific about what aspects of the site you want to test
                      </FormDescription>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />

                <div className="flex gap-4">
                  <Button
                    type="submit"
                    disabled={generateMutation.isPending}
                    className="flex-1"
                    data-testid="button-generate"
                  >
                    {generateMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Generate Test Cases
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Results Section */}
        {generatedData && (
          <div className="space-y-6">
            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="text-sm text-muted-foreground mb-1">Total Test Cases</div>
                  <div className="text-2xl font-semibold text-foreground">{generatedData.summary.totalTests}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="text-sm text-muted-foreground mb-1">Test Types</div>
                  <div className="text-2xl font-semibold text-foreground">{Object.keys(generatedData.summary.byType).length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="text-sm text-muted-foreground mb-1">Coverage Areas</div>
                  <div className="text-2xl font-semibold text-foreground">{generatedData.summary.coverageAreas.length}</div>
                </CardContent>
              </Card>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 justify-end">
              <Button
                variant="outline"
                onClick={handleDownloadAll}
                data-testid="button-download"
              >
                <Download className="w-4 h-4 mr-2" />
                Download All
              </Button>
            </div>

            {/* Test Cases List */}
            <div className="space-y-4">
              <h2 className="text-lg font-medium text-foreground">Generated Test Cases</h2>
              {generatedData.testCases.map((testCase) => (
                <Card key={testCase.id} className="overflow-hidden">
                  <CardHeader
                    className="cursor-pointer hover-elevate"
                    onClick={() => setExpandedTestCase(expandedTestCase === testCase.id ? null : testCase.id)}
                    data-testid={`card-testcase-${testCase.id}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <Badge className={`text-xs border ${getTypeColor(testCase.type)}`}>
                            {testCase.type}
                          </Badge>
                          <Badge className={`text-xs border ${getPriorityColor(testCase.priority)}`}>
                            {testCase.priority} Priority
                          </Badge>
                        </div>
                        <CardTitle className="text-base font-medium text-foreground break-words">
                          {testCase.title}
                        </CardTitle>
                        <CardDescription className="text-sm mt-1">
                          {testCase.description}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopyTestCase(testCase);
                          }}
                          data-testid={`button-copy-${testCase.id}`}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                        {expandedTestCase === testCase.id ? (
                          <ChevronUp className="w-5 h-5 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </CardHeader>

                  {expandedTestCase === testCase.id && (
                    <CardContent className="border-t pt-6 space-y-6">
                      {/* Test Steps */}
                      <div>
                        <h3 className="text-sm font-medium text-foreground mb-3">Test Steps</h3>
                        <ol className="space-y-2">
                          {testCase.steps.map((step, idx) => (
                            <li key={idx} className="flex gap-3 text-sm">
                              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium">
                                {idx + 1}
                              </span>
                              <span className="text-foreground pt-0.5">{step}</span>
                            </li>
                          ))}
                        </ol>
                      </div>

                      {/* Expected Result */}
                      <div>
                        <h3 className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                          Expected Result
                        </h3>
                        <p className="text-sm text-foreground bg-muted/50 p-4 rounded-md">
                          {testCase.expectedResult}
                        </p>
                      </div>

                      {/* Playwright Code */}
                      {testCase.playwrightCode && (
                        <div>
                          <h3 className="text-sm font-medium text-foreground mb-2">Playwright Code</h3>
                          <div className="relative">
                            <pre className="bg-[#2d2d2d] text-[#ccc] p-4 rounded-md overflow-x-auto text-xs font-mono">
                              <code className="language-javascript">{testCase.playwrightCode}</code>
                            </pre>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!generatedData && !generateMutation.isPending && (
          <Card className="border-dashed">
            <CardContent className="py-16 text-center">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                  <Sparkles className="w-8 h-8 text-muted-foreground" />
                </div>
              </div>
              <h3 className="text-lg font-medium text-foreground mb-2">No test cases generated yet</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Enter a website URL and testing instructions above to generate comprehensive test cases powered by AI
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
