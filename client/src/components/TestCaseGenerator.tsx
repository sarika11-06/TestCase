import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Loader2, Globe, ChevronDown, ChevronUp, PlayCircle, CheckCircle, XCircle } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { GenerateTestCasesRequest, TestCaseGenerationResponse, WebsiteAnalysis } from "../../../shared/schema";
import { generateTestCasesRequestSchema } from "../../../shared/schema";

export default function TestCaseGenerator() {
	const [scrapedAnalysis, setScrapedAnalysis] = useState<WebsiteAnalysis | null>(null);
	const [generatedData, setGeneratedData] = useState<TestCaseGenerationResponse | null>(null);
	const [expandedTestCase, setExpandedTestCase] = useState<string | null>(null);
	const [executing, setExecuting] = useState(false);
	const [executionResults, setExecutionResults] = useState<any>(null);
	const [analysisSummary, setAnalysisSummary] = useState<any | null>(null);
	const { toast } = useToast();
	const form = useForm<GenerateTestCasesRequest>({
		resolver: zodResolver(generateTestCasesRequestSchema),
		defaultValues: { url: "", prompt: "" },
	});

	// NEW: preview screenshot state
	const [previewHtml, setPreviewHtml] = useState<string | null>(null);
	const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null); // NEW
	const [previewLoading, setPreviewLoading] = useState<boolean>(false);
	const [previewError, setPreviewError] = useState<string | null>(null);
	const iframeRef = useRef<HTMLIFrameElement>(null);

	// Scrape with prompt
	const scrapeMutation = useMutation({
		mutationFn: async ({ url, prompt }: { url: string; prompt: string }) => {
			const response = await apiRequest("POST", "/api/scrape-website", { url, prompt });
			return await response.json() as WebsiteAnalysis;
		},
		onSuccess: (data: WebsiteAnalysis) => {
			setScrapedAnalysis(data);
			// generate a human readable summary and log it
			const summary = generateAnalysisSummary(data);
			setAnalysisSummary(summary);
			console.groupCollapsed('Site Analysis Summary');
			console.log('URL:', data.url);
			if ((data as any).title) console.log('Title:', (data as any).title);
			console.log('Interactive elements:', data.allInteractive?.length || 0);
			console.log('Top fields/buttons:', summary.topFields, summary.topButtons);
			console.log('Suggested flows:', summary.suggestedFlows);
			console.log('Full analysis object:', data);
			console.groupEnd();

			toast({
				title: "✓ XPaths scraped!",
				description: `Found ${data.forms?.reduce((sum: number, f: any) => sum + (Array.isArray(f?.fields) ? f.fields.length : 0), 0) || 0} fields, ${data.buttonsWithSelectors?.length || 0} buttons`,
			});
		},
		onError: (error: Error) => {
			toast({ title: "Scraping failed", description: error.message, variant: "destructive" });
		},
	});

	// Generate test cases
	const generateMutation = useMutation({
		mutationFn: async (data: GenerateTestCasesRequest) => {
			const response = await apiRequest("POST", "/api/generate-test-cases", data);
			return await response.json() as TestCaseGenerationResponse;
		},
		onSuccess: (data: TestCaseGenerationResponse) => {
			setGeneratedData(data);
			toast({ title: "Test cases generated!", description: `Generated ${data.summary.totalTests} tests` });
		},
		onError: (error: Error) => {
			toast({ title: "Generation failed", description: error.message, variant: "destructive" });
		},
	});

	// fetch screenshot without using iframe - Puppeteer on server
	const fetchPreview = async (url: string) => {
		try {
			setPreviewLoading(true);
			setPreviewHtml(null);
			setPreviewError(null);
			if (previewBlobUrl) {
				URL.revokeObjectURL(previewBlobUrl);
				setPreviewBlobUrl(null);
			}

			console.log('[Preview] Fetching HTML for:', url);
			const res = await fetch("/api/page-screenshot", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ url }),
			});

			console.log('[Preview] Response:', res.status, res.statusText);
			
			if (!res.ok) {
				const errorText = await res.text();
				console.error('[Preview] Server error:', errorText);
				throw new Error(`Server returned ${res.status}: ${res.statusText}`);
			}

			const contentType = res.headers.get('content-type');
			console.log('[Preview] Content-Type:', contentType);

			if (!contentType?.includes('text/html')) {
				const text = await res.text();
				console.error('[Preview] Expected HTML, got:', text.substring(0, 200));
				throw new Error('Server did not return HTML');
			}

			const html = await res.text();
			console.log('[Preview] HTML received:', html.length, 'bytes');
			
			if (!html || html.length < 50) {
				throw new Error('Received empty or invalid HTML');
			}

			setPreviewHtml(html);

			// Create a blob URL for iframe src
			const blob = new Blob([html], { type: "text/html; charset=utf-8" });
			const objUrl = URL.createObjectURL(blob);
			setPreviewBlobUrl(objUrl);
			console.log('[Preview] ✓ Blob URL created:', objUrl);
		} catch (e: any) {
			console.error('[Preview] Error:', e);
			setPreviewError(e?.message || "Failed to load preview");
			toast({
				title: "Preview failed",
				description: e?.message || "Could not load live preview. Check console for details.",
				variant: "destructive"
			});
		} finally {
			setPreviewLoading(false);
		}
	};

	// Auto-load preview after scraping succeeds
	useEffect(() => {
		if (scrapedAnalysis?.url) {
			fetchPreview(scrapedAnalysis.url);
		}
		return () => {
			if (previewBlobUrl) URL.revokeObjectURL(previewBlobUrl);
			setPreviewHtml(null);
			setPreviewBlobUrl(null);
		};
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [scrapedAnalysis?.url]);

	const handleScrapeAndGenerate = () => {
		const url = form.getValues("url");
		const prompt = form.getValues("prompt");
		if (!url || !prompt) {
			toast({ title: "Enter URL and prompt", variant: "destructive" });
			return;
		}
		// First scrape
		scrapeMutation.mutate({ url, prompt });
	};

	const handleGenerate = () => {
		const url = form.getValues("url");
		const prompt = form.getValues("prompt");
		if (!url || !prompt) {
			toast({ title: "Enter URL and prompt", variant: "destructive" });
			return;
		}
		generateMutation.mutate({ url, prompt });
	};

	// Execute test cases
	const executeTestCases = async () => {
		if (!generatedData || !form.getValues("url")) {
			toast({ title: "No test cases to execute", variant: "destructive" });
			return;
		}

		setExecuting(true);
		setExecutionResults(null);

		try {
			// Extract steps from test cases
			const allSteps = generatedData.testCases.flatMap((tc: typeof generatedData.testCases[number]) => tc.steps);
			
			const res = await fetch("/api/execute-test-flow", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					url: form.getValues("url"),
					steps: allSteps
				}),
			});

			if (!res.ok) throw new Error("Execution failed");

			const data = await res.json();
			setExecutionResults(data);

			toast({
				title: data.success ? "✓ Test execution completed" : "⚠ Some tests failed",
				description: `${data.summary.successful}/${data.summary.total} steps succeeded`,
			});
		} catch (error: any) {
			toast({
				title: "Execution error",
				description: error.message,
				variant: "destructive",
			});
		} finally {
			setExecuting(false);
		}
	};

	// Execute test cases DIRECTLY on the live preview iframe
	const executeTestCasesOnPreview = async () => {
		if (!generatedData || !iframeRef.current) {
			toast({ title: "No test cases to execute or preview not loaded", variant: "destructive" });
			return;
		}

		setExecuting(true);
		setExecutionResults(null);

		try {
			const iframe = iframeRef.current;
			const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
			
			if (!iframeDoc) {
				throw new Error("Cannot access iframe content");
			}

			const allSteps = generatedData.testCases.flatMap((tc: typeof generatedData.testCases[number]) => tc.steps);
			const results = [];

			for (let i = 0; i < allSteps.length; i++) {
				const step = allSteps[i];
				const startTime = Date.now();

				try {
					const fillMatch = step.match(/(?:fill|enter|type)\s+["']?([^"']+?)["']?\s+(?:with\s+)?["']?([^"']+)["']?/i);
					const clickMatch = step.match(/click\s+["']?([^"']+)["']?/i);

					let success = false;
					let selector = '';
					let reasoning = '';

					if (fillMatch) {
						const fieldName = fillMatch[1].trim().toLowerCase();
						const value = fillMatch[2]?.trim() || 'test_value';

						// Try to match by placeholder, name, id, aria-label, label text
						const inputs = Array.from(iframeDoc.querySelectorAll('input, textarea'));
						const targetInput = inputs.find(el => {
							const htmlEl = el as HTMLInputElement;
							const text = [
								htmlEl.placeholder,
								htmlEl.name,
								htmlEl.id,
								htmlEl.getAttribute('aria-label'),
							].filter(Boolean).map(s => s!.toLowerCase()).join(' ');
							return text.includes(fieldName);
						}) as HTMLInputElement;

						if (targetInput) {
							highlightElement(targetInput, iframeDoc);
							targetInput.value = value;
							targetInput.dispatchEvent(new Event('input', { bubbles: true }));
							targetInput.dispatchEvent(new Event('change', { bubbles: true }));
							success = true;
							selector = targetInput.name ? `input[name="${targetInput.name}"]` : targetInput.id ? `#${targetInput.id}` : targetInput.tagName.toLowerCase();
							reasoning = `Filled "${fieldName}" with "${value}"`;
						} else {
							reasoning = `Field "${fieldName}" not found`;
						}
					} else if (clickMatch) {
						const buttonName = clickMatch[1].trim().toLowerCase();

						// Try to match by text, value, aria-label, title
						const buttons = Array.from(iframeDoc.querySelectorAll('button, a, input[type="submit"], [role="button"]'));
						const targetButton = buttons.find(el => {
							const text = [
								el.textContent,
								el.getAttribute('value'),
								el.getAttribute('aria-label'),
								el.getAttribute('title'),
							].filter(Boolean).map(s => s!.toLowerCase()).join(' ');
							return text.includes(buttonName);
						}) as HTMLElement;

						if (targetButton) {
							highlightElement(targetButton, iframeDoc);
							targetButton.click();
							success = true;
							selector = targetButton.id ? `#${targetButton.id}` : targetButton.tagName.toLowerCase();
							reasoning = `Clicked "${buttonName}"`;
						} else {
							reasoning = `Button "${buttonName}" not found`;
						}
					}

					results.push({
						step: i + 1,
						instruction: step,
						success,
						reasoning,
						selector,
						duration: Date.now() - startTime
					});

					if (!success) break;

					// Wait between actions
					await new Promise(resolve => setTimeout(resolve, 500));

				} catch (error: any) {
					results.push({
						step: i + 1,
						instruction: step,
						success: false,
						reasoning: `Error: ${error.message}`,
						selector: '',
						duration: Date.now() - startTime
					});
					break;
				}
			}

			// Take screenshot of iframe
			let screenshot = '';
			try {
				screenshot = 'Screenshot not available for cross-origin content';
			} catch (e) {
				screenshot = 'Screenshot failed';
			}

			const successCount = results.filter(r => r.success).length;

			setExecutionResults({
				success: results.every(r => r.success),
				results,
				summary: {
					total: results.length,
					successful: successCount,
					failed: results.length - successCount,
					totalDuration: results.reduce((sum, r) => sum + r.duration, 0)
				},
				screenshot
			});

			toast({
				title: successCount === results.length ? "✓ All steps passed" : "⚠ Some steps failed",
				description: `${successCount}/${results.length} steps succeeded`,
			});

		} catch (error: any) {
			toast({
				title: "Execution error",
				description: error.message,
				variant: "destructive",
			});
		} finally {
			setExecuting(false);
		}
	};

	// Highlight element in iframe
	const highlightElement = (element: Element, doc: Document) => {
		// Remove previous highlight
		const existing = doc.getElementById('ai-test-highlight');
		if (existing) existing.remove();

		// Add highlight
		const rect = element.getBoundingClientRect();
		const highlight = doc.createElement('div');
		highlight.id = 'ai-test-highlight';
		highlight.style.cssText = `
			position: fixed;
			left: ${rect.left}px;
			top: ${rect.top}px;
			width: ${rect.width}px;
			height: ${rect.height}px;
			border: 3px solid #22c55e;
			background: rgba(34, 197, 94, 0.2);
			pointer-events: none;
			z-index: 999999;
			transition: all 0.3s;
		`;
		doc.body.appendChild(highlight);

		// Scroll to element
		element.scrollIntoView({ behavior: 'smooth', block: 'center' });
	};

	// helper: produce a small human-friendly summary and suggested flows
	function generateAnalysisSummary(analysis: WebsiteAnalysis) {
		const fields = (analysis.allInteractive || []).filter((e: any) => ['input','textarea','select'].includes(e.tag));
		const buttons = (analysis.allInteractive || []).filter((e: any) => ['button','a'].includes(e.tag) || (e.type && e.type.toLowerCase() === 'submit'));
		// detect username/password fields heuristically, check friendlyName first
		const username = fields.find((f: any) => {
			const label = (f as any).friendlyName || f.name || f.id || f.placeholder || f.text || '';
			return label.toLowerCase().includes('user') || label.toLowerCase().includes('email') || (f.name || '').toLowerCase().includes('user');
		});
		const password = fields.find((f: any) => {
			const label = (f as any).friendlyName || f.name || f.id || f.placeholder || f.text || '';
			return label.toLowerCase().includes('pass') || (f.name || '').toLowerCase().includes('pass');
		});
		const submitBtn = buttons.find((b: any) => {
			const label = (b as any).friendlyName || b.text || b.id || b.name || '';
			return label.toLowerCase().includes('submit') || label.toLowerCase().includes('login') || (b.selectors || []).some((s:any) => s.includes('submit') || s.includes('login'));
		});
		const topFields = fields.slice(0,6).map((f: any) => ({ name: (f as any).friendlyName || f.name || f.placeholder || f.id || f.text, selectors: f.selectors, xpath: (f as any).xpath || (f as any).xpathCandidates?.[0] }));
		const topButtons = buttons.slice(0,6).map((b: any) => ({ text: (b as any).friendlyName || b.text || b.name || b.id, selectors: b.selectors, xpath: (b as any).xpath || (b as any).xpathCandidates?.[0] }));
		const suggestedFlows: string[] = [];
		if (username && password && submitBtn) {
			suggestedFlows.push(`Login flow: Fill "${username.name||username.placeholder||username.id}" -> Fill "${password.name||password.placeholder||password.id}" -> Click "${submitBtn.text||submitBtn.id||'submit'}"`);
		}
		if (fields.length) suggestedFlows.push(`Form tests: ${fields.length} input fields detected - validate required, invalid/valid inputs`);
		if (buttons.length) suggestedFlows.push(`Navigation tests: ${buttons.length} clickable elements detected`);
		return {
			title: (analysis as any).title || null,
			interactiveCount: (analysis.allInteractive || []).length,
			topFields,
			topButtons,
			usernameField: username ? (username.name||username.id||username.placeholder) : null,
			passwordField: password ? (password.name||password.id||password.placeholder) : null,
			submitButton: submitBtn ? (submitBtn.text||submitBtn.id||submitBtn.selectors?.[0]) : null,
			suggestedFlows
		};
	}

	return (
		<div className="min-h-screen bg-background p-4">
			<div className="max-w-[98vw] mx-auto">
				<div className="mb-4 text-center">
					<h1 className="text-3xl font-bold mb-2">AI Test Case Generator</h1>
					<p className="text-muted-foreground">Enter URL and instructions to scrape XPaths and generate test cases</p>
				</div>

				{/* Two-column layout: 40% LEFT (all controls + results), 60% RIGHT (preview only) */}
				<div className="grid grid-cols-1 lg:grid-cols-[40%_60%] gap-4">
					{/* LEFT COLUMN: 40% - All Inputs, Test Cases, and Results */}
					<div className="space-y-4 overflow-y-auto max-h-[calc(100vh-8rem)]">
						{/* Input Card */}
						<Card>
							<CardHeader className="pb-3">
								<CardTitle className="text-lg">Website & Instructions</CardTitle>
								<CardDescription className="text-xs">Enter the URL and describe what you want to test</CardDescription>
							</CardHeader>
							<CardContent className="space-y-3">
								<div>
									<label className="text-xs font-medium">Website URL</label>
									<Input
										placeholder="https://example.com/login"
										value={form.watch("url")}
										onChange={(e) => form.setValue("url", e.target.value)}
										className="text-sm"
									/>
								</div>
								<div>
									<label className="text-xs font-medium">Testing Instructions</label>
									<Textarea
										placeholder="e.g., Fill username and password, then click Login button"
										value={form.watch("prompt")}
										onChange={(e) => form.setValue("prompt", e.target.value)}
										rows={4}
										className="text-sm"
									/>
									<p className="text-[10px] text-muted-foreground mt-1">
										Mention fields (username, password) and buttons (login, submit) you want to test
									</p>
								</div>
								<div className="flex gap-2">
									<Button onClick={handleScrapeAndGenerate} disabled={scrapeMutation.isPending} className="flex-1 text-xs h-9">
										{scrapeMutation.isPending ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" />Scraping...</> : "1. Scrape"}
									</Button>
									<Button onClick={handleGenerate} disabled={!scrapedAnalysis || generateMutation.isPending} variant="secondary" className="flex-1 text-xs h-9">
										{generateMutation.isPending ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" />Generating...</> : "2. Generate"}
									</Button>
								</div>
							</CardContent>
						</Card>

						{/* Scraped XPaths Card */}
						<Card>
							<CardHeader className="pb-3">
								<CardTitle className="text-lg">Scraped Elements</CardTitle>
								<CardDescription className="text-xs">
									{scrapedAnalysis ? 
										`${(scrapedAnalysis.allInteractive || []).filter((e: any) => ['input','textarea','select'].includes(e.tag)).length} fields, ${(scrapedAnalysis.allInteractive || []).filter((e: any) => ['button','a'].includes(e.tag) || (e.type && e.type.toLowerCase() === 'submit')).length} buttons` 
										: 'Waiting for scrape...'}
								</CardDescription>
							</CardHeader>
							<CardContent>
								{!scrapedAnalysis && <div className="text-xs text-muted-foreground text-center py-4">Enter URL and prompt, then click "Scrape"</div>}
								{scrapedAnalysis && (
									<div className="space-y-2 max-h-[200px] overflow-y-auto">
										{/* If explicit forms exist show them, otherwise show derived interactive elements */}
										{(scrapedAnalysis.forms && scrapedAnalysis.forms.length > 0) ? (
											scrapedAnalysis.forms.map((form: { name: string; fields: Array<{ name: string; type: string; selectors?: string[]; xpath?: string }> }, fi: number) => (
												<div key={fi}>
													<div className="font-semibold text-xs mb-1">📝 {form.name}</div>
													{form.fields.map((field, i) => (
														<div key={i} className="ml-3 mb-1.5 text-[11px]">
															<div className="font-medium">{field.name} ({field.type})</div>
															<code className="text-[9px] bg-muted px-1 rounded block mt-0.5 truncate">{field.selectors?.[0] || field.xpath || '—'}</code>
														</div>
													))}
												</div>
											))
										) : (
											// Fallback listing from allInteractive
											<div className="space-y-1">
												{(scrapedAnalysis.allInteractive || []).slice(0, 40).map((el: any, i: number) => (
													<div key={i} className="flex items-center justify-between text-[11px]">
														<div className="flex-1 min-w-0">
															<div className="font-medium truncate">{el.tag}{el.friendlyName ? ` — ${String(el.friendlyName).trim().slice(0,60)}` : el.text ? ` — ${String(el.text).trim().slice(0,60)}` : ''}</div>
															<div className="text-[9px] text-muted-foreground mt-0.5">
																{el.friendlyName ? `label=${el.friendlyName} ` : ''}{el.name ? `name=${el.name} ` : ''}{el.id ? `id=${el.id} ` : ''}{el.ariaLabel ? `aria=${el.ariaLabel}` : ''}
															</div>
														</div>
														<div className="ml-3 text-right">
															<code className="text-[9px] bg-muted px-1 rounded truncate block max-w-[140px]">
-																{(el.selectors && el.selectors[0]) || (el as any).xpath || '—'}
+																{(el as any).xpath || (el as any).xpathCandidates?.[0] || (el.selectors && el.selectors[0]) || '—'}
															</code>
														</div>
													</div>
												))}
												{(scrapedAnalysis.allInteractive || []).length > 40 && (
													<div className="text-[10px] text-muted-foreground">Showing first 40 of {(scrapedAnalysis.allInteractive || []).length} interactive elements</div>
												)}
											</div>
										)}
									</div>
								)}
							</CardContent>
						</Card>

						{/* Site Understanding Card (NEW) */}
						{analysisSummary && (
							<Card>
								<CardHeader className="pb-3">
									<CardTitle className="text-lg">Site Understanding</CardTitle>
									<CardDescription className="text-xs">What the analyzer found and suggested flows</CardDescription>
								</CardHeader>
								<CardContent>
									<div className="space-y-2 text-sm">
										<div><strong>Title:</strong> {analysisSummary.title || '—'}</div>
										<div><strong>Interactive elements:</strong> {analysisSummary.interactiveCount}</div>
										<div>
											<strong>Top fields:</strong>
											<ul className="list-disc list-inside text-xs mt-1">
												{analysisSummary.topFields.map((f: any, i:number) => (
													<li key={i}>{f.name} — <code className="text-[10px] bg-muted px-1 rounded">{f.selectors?.[0]}</code></li>
												))}
											</ul>
										</div>
										<div>
											<strong>Top buttons:</strong>
											<ul className="list-disc list-inside text-xs mt-1">
												{analysisSummary.topButtons.map((b: any, i:number) => (
													<li key={i}>{b.text || 'button'} — <code className="text-[10px] bg-muted px-1 rounded">{b.selectors?.[0]}</code></li>
												))}
											</ul>
										</div>
										{analysisSummary.suggestedFlows.length > 0 && (
											<div>
												<strong>Suggested flows:</strong>
												<ol className="list-decimal list-inside text-xs mt-1">
													{analysisSummary.suggestedFlows.map((s:string, idx:number) => <li key={idx}>{s}</li>)}
												</ol>
											</div>
										)}
										<div className="mt-2 flex gap-2">
											<Button size="sm" variant="outline" onClick={() => console.log('Full analysis:', scrapedAnalysis)}>Print full analysis to console</Button>
											<Button size="sm" onClick={() => {
												navigator.clipboard.writeText(JSON.stringify({analysis: scrapedAnalysis, summary: analysisSummary}, null, 2));
												toast({ title: 'Copied summary to clipboard' });
											}}>Copy summary</Button>
										</div>
									</div>
								</CardContent>
							</Card>
						)}

						{/* Generated Test Cases (Now in Left Column) */}
						{generatedData && (
							<Card>
								<CardHeader className="pb-3">
									<CardTitle className="text-lg">Generated Test Cases ({generatedData.summary.totalTests})</CardTitle>
								</CardHeader>
								<CardContent>
									<div className="space-y-2">
										{generatedData.testCases.map((tc: typeof generatedData.testCases[number]) => (
											<Card key={tc.id}>
												<CardHeader className="pb-2 pt-3">
													<div className="flex items-start justify-between">
														<div className="flex-1">
															<div className="font-medium text-xs">{tc.title}</div>
															<div className="flex gap-1.5 mt-1">
																<Badge variant="outline" className="text-[9px] h-4 px-1.5">{tc.type}</Badge>
																<Badge variant="outline" className="text-[9px] h-4 px-1.5">{tc.priority}</Badge>
															</div>
														</div>
														<Button size="icon" variant="ghost" onClick={() => setExpandedTestCase(expandedTestCase === tc.id ? null : tc.id)} className="h-6 w-6">
															{expandedTestCase === tc.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
														</Button>
													</div>
												</CardHeader>
												{expandedTestCase === tc.id && (
													<CardContent className="pt-0 pb-3">
														<div className="space-y-1.5 text-[10px] mb-2">
															<div><strong>Steps:</strong></div>
															<ol className="list-decimal list-inside space-y-0.5">
																{tc.steps.map((s: string, i: number) => <li key={i}>{s}</li>)}
															</ol>
														</div>
														<div className="text-[9px] font-semibold mb-1">Playwright Code:</div>
														<pre className="bg-[#1f2937] text-[#e5e7eb] p-2 rounded text-[9px] overflow-auto max-h-32">
															<code>{tc.playwrightCode}</code>
														</pre>
													</CardContent>
												)}
											</Card>
										))}
									</div>
								</CardContent>
							</Card>
						)}

						{/* Execute Button (Now in Left Column) */}
						{generatedData && (
							<Card>
								<CardHeader className="pb-3">
									<CardTitle className="text-lg">Execute Tests</CardTitle>
									<CardDescription className="text-xs">Run the generated test cases on the live preview</CardDescription>
								</CardHeader>
								<CardContent>
									<Button
										onClick={executeTestCasesOnPreview}
										disabled={executing || !previewBlobUrl}
										size="lg"
										className="w-full gap-2 h-10"
									>
										{executing ? (
											<>
												<Loader2 className="w-4 h-4 animate-spin" />
												Executing...
											</>
										) : (
											<>
												<PlayCircle className="w-4 h-4" />
												▶️ Execute on Live Preview
											</>
										)}
									</Button>
								</CardContent>
							</Card>
						)}

						{/* Execution Results (Now in Left Column) */}
						{executionResults && (
							<Card>
								<CardHeader className="pb-3">
									<CardTitle className="text-lg">Execution Results</CardTitle>
									<CardDescription className="text-xs">Test execution completed</CardDescription>
								</CardHeader>
								<CardContent>
									<div className="space-y-2">
										<div className="flex items-center justify-between p-2 bg-muted rounded-lg">
											<div>
												<div className="text-xs font-medium">Execution Summary</div>
												<div className="text-[9px] text-muted-foreground">
													{executionResults.summary.successful} / {executionResults.summary.total} steps passed
												</div>
											</div>
											<Badge variant={executionResults.success ? "default" : "destructive"} className="text-sm px-2 py-0.5">
												{executionResults.success ? "✓ Passed" : "✗ Failed"}
											</Badge>
										</div>

										{executionResults.results.map((r: any, i: number) => (
											<div
												key={i}
												className={`p-2 border rounded-lg ${
													r.success ? "border-green-500 bg-green-50" : "border-red-500 bg-red-50"
												}`}
											>
												<div className="flex items-start gap-2">
													{r.success ? (
														<CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0 mt-0.5" />
													) : (
														<XCircle className="w-3 h-3 text-red-500 flex-shrink-0 mt-0.5" />
													)}
													<div className="flex-1">
														<div className="font-medium text-[10px] mb-0.5">Step {r.step}</div>
														<div className="text-[9px] text-muted-foreground mb-0.5">{r.instruction}</div>
														<div className="text-[9px]">
															<span className="font-semibold">Result:</span> {r.reasoning}
														</div>
														{r.selector && (
															<code className="text-[8px] bg-white px-1 py-0.5 rounded mt-0.5 inline-block">
																{r.selector}
															</code>
														)}
													</div>
												</div>
											</div>
										))}
									</div>
								</CardContent>
							</Card>
						)}
					</div>

					{/* RIGHT COLUMN: 60% - Live Preview ONLY */}
					<div className="lg:sticky lg:top-4 lg:h-[calc(100vh-6rem)]">
						<Card className="h-full flex flex-col">
							<CardHeader className="pb-3">
								<CardTitle className="flex items-center justify-between text-lg">
									<span>Live Preview</span>
									<div className="flex gap-2">
										<Button
											size="sm"
											variant="outline"
											onClick={() => {
												const url = form.getValues("url");
												if (url) fetchPreview(url);
												else toast({ title: "Enter URL", variant: "destructive" });
											}}
											disabled={previewLoading}
											className="h-8 text-xs"
										>
											{previewLoading ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Loading...</> : "Refresh"}
										</Button>
									</div>
								</CardTitle>
								<CardDescription className="text-xs">
									Live browser rendering - test execution happens here
								</CardDescription>
							</CardHeader>
							<CardContent className="flex-1 flex flex-col min-h-0 pb-3">
								<div className="flex-1 border-2 rounded-lg overflow-hidden bg-white flex items-center justify-center">
									{previewLoading && (
										<div className="flex flex-col items-center gap-2 p-6">
											<Loader2 className="w-8 h-8 animate-spin text-primary" />
											<div className="text-sm font-medium">Loading live preview...</div>
											<div className="text-xs text-muted-foreground">This may take 10-30 seconds</div>
										</div>
									)}
									{!previewLoading && previewBlobUrl && (
										<iframe
											ref={iframeRef}
											title="Live Page Preview"
											src={previewBlobUrl}
											className="w-full h-full border-0"
											sandbox="allow-forms allow-same-origin allow-scripts allow-popups allow-popups-to-escape-sandbox allow-downloads"
											onLoad={() => {
												console.log('[Preview] ✓ Iframe loaded successfully');
												setPreviewError(null);
												
												// Try to access iframe content for execution
												try {
													const iframeDoc = iframeRef.current?.contentDocument;
													if (iframeDoc) {
														console.log('[Preview] ✓ Can access iframe DOM');
													}
												} catch (e) {
													console.warn('[Preview] Cannot access iframe DOM (cross-origin):', e);
												}
											}}
											onError={(e) => {
												console.error('[Preview] ✗ Iframe error:', e);
												setPreviewError('Iframe failed to load');
											}}
										/>
									)}
									{!previewLoading && !previewBlobUrl && previewError && (
										<div className="text-center p-6">
											<div className="text-red-500 mb-3 text-sm">⚠️ Preview Error</div>
											<div className="text-xs text-muted-foreground mb-3">{previewError}</div>
											<Button 
												size="sm" 
												variant="outline"
												onClick={() => {
													const url = form.getValues("url");
													if (url) fetchPreview(url);
												}}
												className="text-xs h-8"
											>
												Retry Preview
											</Button>
										</div>
									)}
									{!previewLoading && !previewBlobUrl && !previewError && (
										<div className="text-center p-6">
											<Globe className="w-12 h-12 mx-auto mb-2 text-muted-foreground opacity-40" />
											<div className="text-sm text-muted-foreground mb-1">Live preview will appear here</div>
											<div className="text-xs text-muted-foreground mb-3">Click "Scrape" to load the site</div>
										</div>
									)}
								</div>
								<div className="mt-2 text-[10px] text-muted-foreground flex items-center justify-between">
									<div className="flex items-center gap-1.5">
										<span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500"></span>
										Playwright engine
									</div>
									{scrapedAnalysis?.url && (
										<span className="font-mono text-[9px] truncate max-w-[300px]">{scrapedAnalysis.url}</span>
									)}
								</div>
							</CardContent>
						</Card>
					</div>
				</div>
			</div>
		</div>
	);
}