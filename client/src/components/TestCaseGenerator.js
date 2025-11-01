import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Loader2, Globe, ChevronDown, ChevronUp, PlayCircle, CheckCircle, XCircle } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { generateTestCasesRequestSchema } from "../../../shared/schema";
export default function TestCaseGenerator() {
    const [scrapedAnalysis, setScrapedAnalysis] = useState(null);
    const [generatedData, setGeneratedData] = useState(null);
    const [expandedTestCase, setExpandedTestCase] = useState(null);
    const [executing, setExecuting] = useState(false);
    const [executionResults, setExecutionResults] = useState(null);
    const [analysisSummary, setAnalysisSummary] = useState(null);
    const { toast } = useToast();
    const form = useForm({
        resolver: zodResolver(generateTestCasesRequestSchema),
        defaultValues: { url: "", prompt: "" },
    });
    // NEW: preview screenshot state
    const [previewHtml, setPreviewHtml] = useState(null);
    const [previewBlobUrl, setPreviewBlobUrl] = useState(null); // NEW
    const [previewLoading, setPreviewLoading] = useState(false);
    const [previewError, setPreviewError] = useState(null);
    const iframeRef = useRef(null);
    // Scrape with prompt
    const scrapeMutation = useMutation({
        mutationFn: async ({ url, prompt }) => {
            const response = await apiRequest("POST", "/api/scrape-website", { url, prompt });
            return await response.json();
        },
        onSuccess: (data) => {
            var _a, _b, _c;
            setScrapedAnalysis(data);
            // generate a human readable summary and log it
            const summary = generateAnalysisSummary(data);
            setAnalysisSummary(summary);
            console.groupCollapsed('Site Analysis Summary');
            console.log('URL:', data.url);
            if (data.title)
                console.log('Title:', data.title);
            console.log('Interactive elements:', ((_a = data.allInteractive) === null || _a === void 0 ? void 0 : _a.length) || 0);
            console.log('Top fields/buttons:', summary.topFields, summary.topButtons);
            console.log('Suggested flows:', summary.suggestedFlows);
            console.log('Full analysis object:', data);
            console.groupEnd();
            toast({
                title: "✓ XPaths scraped!",
                description: `Found ${((_b = data.forms) === null || _b === void 0 ? void 0 : _b.reduce((sum, f) => sum + (Array.isArray(f === null || f === void 0 ? void 0 : f.fields) ? f.fields.length : 0), 0)) || 0} fields, ${((_c = data.buttonsWithSelectors) === null || _c === void 0 ? void 0 : _c.length) || 0} buttons`,
            });
        },
        onError: (error) => {
            toast({ title: "Scraping failed", description: error.message, variant: "destructive" });
        },
    });
    // Generate test cases
    const generateMutation = useMutation({
        mutationFn: async (data) => {
            const response = await apiRequest("POST", "/api/generate-test-cases", data);
            return await response.json();
        },
        onSuccess: (data) => {
            setGeneratedData(data);
            toast({ title: "Test cases generated!", description: `Generated ${data.summary.totalTests} tests` });
        },
        onError: (error) => {
            toast({ title: "Generation failed", description: error.message, variant: "destructive" });
        },
    });
    // fetch screenshot without using iframe - Puppeteer on server
    const fetchPreview = async (url) => {
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
            if (!(contentType === null || contentType === void 0 ? void 0 : contentType.includes('text/html'))) {
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
        }
        catch (e) {
            console.error('[Preview] Error:', e);
            setPreviewError((e === null || e === void 0 ? void 0 : e.message) || "Failed to load preview");
            toast({
                title: "Preview failed",
                description: (e === null || e === void 0 ? void 0 : e.message) || "Could not load live preview. Check console for details.",
                variant: "destructive"
            });
        }
        finally {
            setPreviewLoading(false);
        }
    };
    // Auto-load preview after scraping succeeds
    useEffect(() => {
        if (scrapedAnalysis === null || scrapedAnalysis === void 0 ? void 0 : scrapedAnalysis.url) {
            fetchPreview(scrapedAnalysis.url);
        }
        return () => {
            if (previewBlobUrl)
                URL.revokeObjectURL(previewBlobUrl);
            setPreviewHtml(null);
            setPreviewBlobUrl(null);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [scrapedAnalysis === null || scrapedAnalysis === void 0 ? void 0 : scrapedAnalysis.url]);
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
            const allSteps = generatedData.testCases.flatMap((tc) => tc.steps);
            const res = await fetch("/api/execute-test-flow", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    url: form.getValues("url"),
                    steps: allSteps
                }),
            });
            if (!res.ok)
                throw new Error("Execution failed");
            const data = await res.json();
            setExecutionResults(data);
            toast({
                title: data.success ? "✓ Test execution completed" : "⚠ Some tests failed",
                description: `${data.summary.successful}/${data.summary.total} steps succeeded`,
            });
        }
        catch (error) {
            toast({
                title: "Execution error",
                description: error.message,
                variant: "destructive",
            });
        }
        finally {
            setExecuting(false);
        }
    };
    // Execute test cases DIRECTLY on the live preview iframe
    const executeTestCasesOnPreview = async () => {
        var _a, _b;
        if (!generatedData || !iframeRef.current) {
            toast({ title: "No test cases to execute or preview not loaded", variant: "destructive" });
            return;
        }
        setExecuting(true);
        setExecutionResults(null);
        try {
            const iframe = iframeRef.current;
            const iframeDoc = iframe.contentDocument || ((_a = iframe.contentWindow) === null || _a === void 0 ? void 0 : _a.document);
            if (!iframeDoc) {
                throw new Error("Cannot access iframe content");
            }
            const allSteps = generatedData.testCases.flatMap((tc) => tc.steps);
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
                        const value = ((_b = fillMatch[2]) === null || _b === void 0 ? void 0 : _b.trim()) || 'test_value';
                        // Try to match by placeholder, name, id, aria-label, label text
                        const inputs = Array.from(iframeDoc.querySelectorAll('input, textarea'));
                        const targetInput = inputs.find(el => {
                            const htmlEl = el;
                            const text = [
                                htmlEl.placeholder,
                                htmlEl.name,
                                htmlEl.id,
                                htmlEl.getAttribute('aria-label'),
                            ].filter(Boolean).map(s => s.toLowerCase()).join(' ');
                            return text.includes(fieldName);
                        });
                        if (targetInput) {
                            highlightElement(targetInput, iframeDoc);
                            targetInput.value = value;
                            targetInput.dispatchEvent(new Event('input', { bubbles: true }));
                            targetInput.dispatchEvent(new Event('change', { bubbles: true }));
                            success = true;
                            selector = targetInput.name ? `input[name="${targetInput.name}"]` : targetInput.id ? `#${targetInput.id}` : targetInput.tagName.toLowerCase();
                            reasoning = `Filled "${fieldName}" with "${value}"`;
                        }
                        else {
                            reasoning = `Field "${fieldName}" not found`;
                        }
                    }
                    else if (clickMatch) {
                        const buttonName = clickMatch[1].trim().toLowerCase();
                        // Try to match by text, value, aria-label, title
                        const buttons = Array.from(iframeDoc.querySelectorAll('button, a, input[type="submit"], [role="button"]'));
                        const targetButton = buttons.find(el => {
                            const text = [
                                el.textContent,
                                el.getAttribute('value'),
                                el.getAttribute('aria-label'),
                                el.getAttribute('title'),
                            ].filter(Boolean).map(s => s.toLowerCase()).join(' ');
                            return text.includes(buttonName);
                        });
                        if (targetButton) {
                            highlightElement(targetButton, iframeDoc);
                            targetButton.click();
                            success = true;
                            selector = targetButton.id ? `#${targetButton.id}` : targetButton.tagName.toLowerCase();
                            reasoning = `Clicked "${buttonName}"`;
                        }
                        else {
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
                    if (!success)
                        break;
                    // Wait between actions
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
                catch (error) {
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
            }
            catch (e) {
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
        }
        catch (error) {
            toast({
                title: "Execution error",
                description: error.message,
                variant: "destructive",
            });
        }
        finally {
            setExecuting(false);
        }
    };
    // Highlight element in iframe
    const highlightElement = (element, doc) => {
        // Remove previous highlight
        const existing = doc.getElementById('ai-test-highlight');
        if (existing)
            existing.remove();
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
    function generateAnalysisSummary(analysis) {
        var _a;
        const fields = (analysis.allInteractive || []).filter((e) => ['input', 'textarea', 'select'].includes(e.tag));
        const buttons = (analysis.allInteractive || []).filter((e) => ['button', 'a'].includes(e.tag) || (e.type && e.type.toLowerCase() === 'submit'));
        // detect username/password fields heuristically, check friendlyName first
        const username = fields.find((f) => {
            const label = f.friendlyName || f.name || f.id || f.placeholder || f.text || '';
            return label.toLowerCase().includes('user') || label.toLowerCase().includes('email') || (f.name || '').toLowerCase().includes('user');
        });
        const password = fields.find((f) => {
            const label = f.friendlyName || f.name || f.id || f.placeholder || f.text || '';
            return label.toLowerCase().includes('pass') || (f.name || '').toLowerCase().includes('pass');
        });
        const submitBtn = buttons.find((b) => {
            const label = b.friendlyName || b.text || b.id || b.name || '';
            return label.toLowerCase().includes('submit') || label.toLowerCase().includes('login') || (b.selectors || []).some((s) => s.includes('submit') || s.includes('login'));
        });
        const topFields = fields.slice(0, 6).map((f) => ({ name: f.friendlyName || f.name || f.placeholder || f.id || f.text, selectors: f.selectors, xpath: f.xpath }));
        const topButtons = buttons.slice(0, 6).map((b) => ({ text: b.friendlyName || b.text || b.name || b.id, selectors: b.selectors, xpath: b.xpath }));
        const suggestedFlows = [];
        if (username && password && submitBtn) {
            suggestedFlows.push(`Login flow: Fill "${username.name || username.placeholder || username.id}" -> Fill "${password.name || password.placeholder || password.id}" -> Click "${submitBtn.text || submitBtn.id || 'submit'}"`);
        }
        if (fields.length)
            suggestedFlows.push(`Form tests: ${fields.length} input fields detected - validate required, invalid/valid inputs`);
        if (buttons.length)
            suggestedFlows.push(`Navigation tests: ${buttons.length} clickable elements detected`);
        return {
            title: analysis.title || null,
            interactiveCount: (analysis.allInteractive || []).length,
            topFields,
            topButtons,
            usernameField: username ? (username.name || username.id || username.placeholder) : null,
            passwordField: password ? (password.name || password.id || password.placeholder) : null,
            submitButton: submitBtn ? (submitBtn.text || submitBtn.id || ((_a = submitBtn.selectors) === null || _a === void 0 ? void 0 : _a[0])) : null,
            suggestedFlows
        };
    }
    return (_jsx("div", { className: "min-h-screen bg-background p-4", children: _jsxs("div", { className: "max-w-[98vw] mx-auto", children: [_jsxs("div", { className: "mb-4 text-center", children: [_jsx("h1", { className: "text-3xl font-bold mb-2", children: "AI Test Case Generator" }), _jsx("p", { className: "text-muted-foreground", children: "Enter URL and instructions to scrape XPaths and generate test cases" })] }), _jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-[40%_60%] gap-4", children: [_jsxs("div", { className: "space-y-4 overflow-y-auto max-h-[calc(100vh-8rem)]", children: [_jsxs(Card, { children: [_jsxs(CardHeader, { className: "pb-3", children: [_jsx(CardTitle, { className: "text-lg", children: "Website & Instructions" }), _jsx(CardDescription, { className: "text-xs", children: "Enter the URL and describe what you want to test" })] }), _jsxs(CardContent, { className: "space-y-3", children: [_jsxs("div", { children: [_jsx("label", { className: "text-xs font-medium", children: "Website URL" }), _jsx(Input, { placeholder: "https://example.com/login", value: form.watch("url"), onChange: (e) => form.setValue("url", e.target.value), className: "text-sm" })] }), _jsxs("div", { children: [_jsx("label", { className: "text-xs font-medium", children: "Testing Instructions" }), _jsx(Textarea, { placeholder: "e.g., Fill username and password, then click Login button", value: form.watch("prompt"), onChange: (e) => form.setValue("prompt", e.target.value), rows: 4, className: "text-sm" }), _jsx("p", { className: "text-[10px] text-muted-foreground mt-1", children: "Mention fields (username, password) and buttons (login, submit) you want to test" })] }), _jsxs("div", { className: "flex gap-2", children: [_jsx(Button, { onClick: handleScrapeAndGenerate, disabled: scrapeMutation.isPending, className: "flex-1 text-xs h-9", children: scrapeMutation.isPending ? _jsxs(_Fragment, { children: [_jsx(Loader2, { className: "w-3 h-3 mr-1 animate-spin" }), "Scraping..."] }) : "1. Scrape" }), _jsx(Button, { onClick: handleGenerate, disabled: !scrapedAnalysis || generateMutation.isPending, variant: "secondary", className: "flex-1 text-xs h-9", children: generateMutation.isPending ? _jsxs(_Fragment, { children: [_jsx(Loader2, { className: "w-3 h-3 mr-1 animate-spin" }), "Generating..."] }) : "2. Generate" })] })] })] }), _jsxs(Card, { children: [_jsxs(CardHeader, { className: "pb-3", children: [_jsx(CardTitle, { className: "text-lg", children: "Scraped Elements" }), _jsx(CardDescription, { className: "text-xs", children: scrapedAnalysis ?
                                                        `${(scrapedAnalysis.allInteractive || []).filter((e) => ['input', 'textarea', 'select'].includes(e.tag)).length} fields, ${(scrapedAnalysis.allInteractive || []).filter((e) => ['button', 'a'].includes(e.tag) || (e.type && e.type.toLowerCase() === 'submit')).length} buttons`
                                                        : 'Waiting for scrape...' })] }), _jsxs(CardContent, { children: [!scrapedAnalysis && _jsx("div", { className: "text-xs text-muted-foreground text-center py-4", children: "Enter URL and prompt, then click \"Scrape\"" }), scrapedAnalysis && (_jsx("div", { className: "space-y-2 max-h-[200px] overflow-y-auto", children: (scrapedAnalysis.forms && scrapedAnalysis.forms.length > 0) ? (scrapedAnalysis.forms.map((form, fi) => (_jsxs("div", { children: [_jsxs("div", { className: "font-semibold text-xs mb-1", children: ["\uD83D\uDCDD ", form.name] }), form.fields.map((field, i) => {
                                                                var _a;
                                                                return (_jsxs("div", { className: "ml-3 mb-1.5 text-[11px]", children: [_jsxs("div", { className: "font-medium", children: [field.name, " (", field.type, ")"] }), _jsx("code", { className: "text-[9px] bg-muted px-1 rounded block mt-0.5 truncate", children: ((_a = field.selectors) === null || _a === void 0 ? void 0 : _a[0]) || field.xpath || '—' })] }, i));
                                                            })] }, fi)))) : (
                                                    // Fallback listing from allInteractive
                                                    _jsxs("div", { className: "space-y-1", children: [(scrapedAnalysis.allInteractive || []).slice(0, 40).map((el, i) => (_jsxs("div", { className: "flex items-center justify-between text-[11px]", children: [_jsxs("div", { className: "flex-1 min-w-0", children: [_jsxs("div", { className: "font-medium truncate", children: [el.tag, el.friendlyName ? ` — ${String(el.friendlyName).trim().slice(0, 60)}` : el.text ? ` — ${String(el.text).trim().slice(0, 60)}` : ''] }), _jsxs("div", { className: "text-[9px] text-muted-foreground mt-0.5", children: [el.friendlyName ? `label=${el.friendlyName} ` : '', el.name ? `name=${el.name} ` : '', el.id ? `id=${el.id} ` : '', el.ariaLabel ? `aria=${el.ariaLabel}` : ''] })] }), _jsx("div", { className: "ml-3 text-right", children: _jsx("code", { className: "text-[9px] bg-muted px-1 rounded truncate block max-w-[140px]", children: (el.selectors && el.selectors[0]) || el.xpath || '—' }) })] }, i))), (scrapedAnalysis.allInteractive || []).length > 40 && (_jsxs("div", { className: "text-[10px] text-muted-foreground", children: ["Showing first 40 of ", (scrapedAnalysis.allInteractive || []).length, " interactive elements"] }))] })) }))] })] }), analysisSummary && (_jsxs(Card, { children: [_jsxs(CardHeader, { className: "pb-3", children: [_jsx(CardTitle, { className: "text-lg", children: "Site Understanding" }), _jsx(CardDescription, { className: "text-xs", children: "What the analyzer found and suggested flows" })] }), _jsx(CardContent, { children: _jsxs("div", { className: "space-y-2 text-sm", children: [_jsxs("div", { children: [_jsx("strong", { children: "Title:" }), " ", analysisSummary.title || '—'] }), _jsxs("div", { children: [_jsx("strong", { children: "Interactive elements:" }), " ", analysisSummary.interactiveCount] }), _jsxs("div", { children: [_jsx("strong", { children: "Top fields:" }), _jsx("ul", { className: "list-disc list-inside text-xs mt-1", children: analysisSummary.topFields.map((f, i) => {
                                                                    var _a;
                                                                    return (_jsxs("li", { children: [f.name, " \u2014 ", _jsx("code", { className: "text-[10px] bg-muted px-1 rounded", children: (_a = f.selectors) === null || _a === void 0 ? void 0 : _a[0] })] }, i));
                                                                }) })] }), _jsxs("div", { children: [_jsx("strong", { children: "Top buttons:" }), _jsx("ul", { className: "list-disc list-inside text-xs mt-1", children: analysisSummary.topButtons.map((b, i) => {
                                                                    var _a;
                                                                    return (_jsxs("li", { children: [b.text || 'button', " \u2014 ", _jsx("code", { className: "text-[10px] bg-muted px-1 rounded", children: (_a = b.selectors) === null || _a === void 0 ? void 0 : _a[0] })] }, i));
                                                                }) })] }), analysisSummary.suggestedFlows.length > 0 && (_jsxs("div", { children: [_jsx("strong", { children: "Suggested flows:" }), _jsx("ol", { className: "list-decimal list-inside text-xs mt-1", children: analysisSummary.suggestedFlows.map((s, idx) => _jsx("li", { children: s }, idx)) })] })), _jsxs("div", { className: "mt-2 flex gap-2", children: [_jsx(Button, { size: "sm", variant: "outline", onClick: () => console.log('Full analysis:', scrapedAnalysis), children: "Print full analysis to console" }), _jsx(Button, { size: "sm", onClick: () => {
                                                                    navigator.clipboard.writeText(JSON.stringify({ analysis: scrapedAnalysis, summary: analysisSummary }, null, 2));
                                                                    toast({ title: 'Copied summary to clipboard' });
                                                                }, children: "Copy summary" })] })] }) })] })), generatedData && (_jsxs(Card, { children: [_jsx(CardHeader, { className: "pb-3", children: _jsxs(CardTitle, { className: "text-lg", children: ["Generated Test Cases (", generatedData.summary.totalTests, ")"] }) }), _jsx(CardContent, { children: _jsx("div", { className: "space-y-2", children: generatedData.testCases.map((tc) => (_jsxs(Card, { children: [_jsx(CardHeader, { className: "pb-2 pt-3", children: _jsxs("div", { className: "flex items-start justify-between", children: [_jsxs("div", { className: "flex-1", children: [_jsx("div", { className: "font-medium text-xs", children: tc.title }), _jsxs("div", { className: "flex gap-1.5 mt-1", children: [_jsx(Badge, { variant: "outline", className: "text-[9px] h-4 px-1.5", children: tc.type }), _jsx(Badge, { variant: "outline", className: "text-[9px] h-4 px-1.5", children: tc.priority })] })] }), _jsx(Button, { size: "icon", variant: "ghost", onClick: () => setExpandedTestCase(expandedTestCase === tc.id ? null : tc.id), className: "h-6 w-6", children: expandedTestCase === tc.id ? _jsx(ChevronUp, { className: "w-3 h-3" }) : _jsx(ChevronDown, { className: "w-3 h-3" }) })] }) }), expandedTestCase === tc.id && (_jsxs(CardContent, { className: "pt-0 pb-3", children: [_jsxs("div", { className: "space-y-1.5 text-[10px] mb-2", children: [_jsx("div", { children: _jsx("strong", { children: "Steps:" }) }), _jsx("ol", { className: "list-decimal list-inside space-y-0.5", children: tc.steps.map((s, i) => _jsx("li", { children: s }, i)) })] }), _jsx("div", { className: "text-[9px] font-semibold mb-1", children: "Playwright Code:" }), _jsx("pre", { className: "bg-[#1f2937] text-[#e5e7eb] p-2 rounded text-[9px] overflow-auto max-h-32", children: _jsx("code", { children: tc.playwrightCode }) })] }))] }, tc.id))) }) })] })), generatedData && (_jsxs(Card, { children: [_jsxs(CardHeader, { className: "pb-3", children: [_jsx(CardTitle, { className: "text-lg", children: "Execute Tests" }), _jsx(CardDescription, { className: "text-xs", children: "Run the generated test cases on the live preview" })] }), _jsx(CardContent, { children: _jsx(Button, { onClick: executeTestCasesOnPreview, disabled: executing || !previewBlobUrl, size: "lg", className: "w-full gap-2 h-10", children: executing ? (_jsxs(_Fragment, { children: [_jsx(Loader2, { className: "w-4 h-4 animate-spin" }), "Executing..."] })) : (_jsxs(_Fragment, { children: [_jsx(PlayCircle, { className: "w-4 h-4" }), "\u25B6\uFE0F Execute on Live Preview"] })) }) })] })), executionResults && (_jsxs(Card, { children: [_jsxs(CardHeader, { className: "pb-3", children: [_jsx(CardTitle, { className: "text-lg", children: "Execution Results" }), _jsx(CardDescription, { className: "text-xs", children: "Test execution completed" })] }), _jsx(CardContent, { children: _jsxs("div", { className: "space-y-2", children: [_jsxs("div", { className: "flex items-center justify-between p-2 bg-muted rounded-lg", children: [_jsxs("div", { children: [_jsx("div", { className: "text-xs font-medium", children: "Execution Summary" }), _jsxs("div", { className: "text-[9px] text-muted-foreground", children: [executionResults.summary.successful, " / ", executionResults.summary.total, " steps passed"] })] }), _jsx(Badge, { variant: executionResults.success ? "default" : "destructive", className: "text-sm px-2 py-0.5", children: executionResults.success ? "✓ Passed" : "✗ Failed" })] }), executionResults.results.map((r, i) => (_jsx("div", { className: `p-2 border rounded-lg ${r.success ? "border-green-500 bg-green-50" : "border-red-500 bg-red-50"}`, children: _jsxs("div", { className: "flex items-start gap-2", children: [r.success ? (_jsx(CheckCircle, { className: "w-3 h-3 text-green-500 flex-shrink-0 mt-0.5" })) : (_jsx(XCircle, { className: "w-3 h-3 text-red-500 flex-shrink-0 mt-0.5" })), _jsxs("div", { className: "flex-1", children: [_jsxs("div", { className: "font-medium text-[10px] mb-0.5", children: ["Step ", r.step] }), _jsx("div", { className: "text-[9px] text-muted-foreground mb-0.5", children: r.instruction }), _jsxs("div", { className: "text-[9px]", children: [_jsx("span", { className: "font-semibold", children: "Result:" }), " ", r.reasoning] }), r.selector && (_jsx("code", { className: "text-[8px] bg-white px-1 py-0.5 rounded mt-0.5 inline-block", children: r.selector }))] })] }) }, i)))] }) })] }))] }), _jsx("div", { className: "lg:sticky lg:top-4 lg:h-[calc(100vh-6rem)]", children: _jsxs(Card, { className: "h-full flex flex-col", children: [_jsxs(CardHeader, { className: "pb-3", children: [_jsxs(CardTitle, { className: "flex items-center justify-between text-lg", children: [_jsx("span", { children: "Live Preview" }), _jsx("div", { className: "flex gap-2", children: _jsx(Button, { size: "sm", variant: "outline", onClick: () => {
                                                                const url = form.getValues("url");
                                                                if (url)
                                                                    fetchPreview(url);
                                                                else
                                                                    toast({ title: "Enter URL", variant: "destructive" });
                                                            }, disabled: previewLoading, className: "h-8 text-xs", children: previewLoading ? _jsxs(_Fragment, { children: [_jsx(Loader2, { className: "w-3 h-3 mr-1 animate-spin" }), " Loading..."] }) : "Refresh" }) })] }), _jsx(CardDescription, { className: "text-xs", children: "Live browser rendering - test execution happens here" })] }), _jsxs(CardContent, { className: "flex-1 flex flex-col min-h-0 pb-3", children: [_jsxs("div", { className: "flex-1 border-2 rounded-lg overflow-hidden bg-white flex items-center justify-center", children: [previewLoading && (_jsxs("div", { className: "flex flex-col items-center gap-2 p-6", children: [_jsx(Loader2, { className: "w-8 h-8 animate-spin text-primary" }), _jsx("div", { className: "text-sm font-medium", children: "Loading live preview..." }), _jsx("div", { className: "text-xs text-muted-foreground", children: "This may take 10-30 seconds" })] })), !previewLoading && previewBlobUrl && (_jsx("iframe", { ref: iframeRef, title: "Live Page Preview", src: previewBlobUrl, className: "w-full h-full border-0", sandbox: "allow-forms allow-same-origin allow-scripts allow-popups allow-popups-to-escape-sandbox allow-downloads", onLoad: () => {
                                                            var _a;
                                                            console.log('[Preview] ✓ Iframe loaded successfully');
                                                            setPreviewError(null);
                                                            // Try to access iframe content for execution
                                                            try {
                                                                const iframeDoc = (_a = iframeRef.current) === null || _a === void 0 ? void 0 : _a.contentDocument;
                                                                if (iframeDoc) {
                                                                    console.log('[Preview] ✓ Can access iframe DOM');
                                                                }
                                                            }
                                                            catch (e) {
                                                                console.warn('[Preview] Cannot access iframe DOM (cross-origin):', e);
                                                            }
                                                        }, onError: (e) => {
                                                            console.error('[Preview] ✗ Iframe error:', e);
                                                            setPreviewError('Iframe failed to load');
                                                        } })), !previewLoading && !previewBlobUrl && previewError && (_jsxs("div", { className: "text-center p-6", children: [_jsx("div", { className: "text-red-500 mb-3 text-sm", children: "\u26A0\uFE0F Preview Error" }), _jsx("div", { className: "text-xs text-muted-foreground mb-3", children: previewError }), _jsx(Button, { size: "sm", variant: "outline", onClick: () => {
                                                                    const url = form.getValues("url");
                                                                    if (url)
                                                                        fetchPreview(url);
                                                                }, className: "text-xs h-8", children: "Retry Preview" })] })), !previewLoading && !previewBlobUrl && !previewError && (_jsxs("div", { className: "text-center p-6", children: [_jsx(Globe, { className: "w-12 h-12 mx-auto mb-2 text-muted-foreground opacity-40" }), _jsx("div", { className: "text-sm text-muted-foreground mb-1", children: "Live preview will appear here" }), _jsx("div", { className: "text-xs text-muted-foreground mb-3", children: "Click \"Scrape\" to load the site" })] }))] }), _jsxs("div", { className: "mt-2 text-[10px] text-muted-foreground flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center gap-1.5", children: [_jsx("span", { className: "inline-block w-1.5 h-1.5 rounded-full bg-green-500" }), "Playwright engine"] }), (scrapedAnalysis === null || scrapedAnalysis === void 0 ? void 0 : scrapedAnalysis.url) && (_jsx("span", { className: "font-mono text-[9px] truncate max-w-[300px]", children: scrapedAnalysis.url }))] })] })] }) })] })] }) }));
}
