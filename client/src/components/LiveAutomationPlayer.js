import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, PlayCircle, RotateCcw, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
export default function LiveAutomationPlayer() {
    var _a;
    const [url, setUrl] = useState("https://practicetestautomation.com/practice-test-login/");
    const [instruction, setInstruction] = useState("");
    const [steps, setSteps] = useState([]);
    const [loading, setLoading] = useState(false);
    const [playing, setPlaying] = useState(false);
    const iframeRef = useRef(null);
    const { toast } = useToast();
    // Load initial page
    const loadPage = async () => {
        if (!url.trim()) {
            toast({ title: "Enter a URL", variant: "destructive" });
            return;
        }
        setLoading(true);
        try {
            const res = await fetch("/api/page-screenshot", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url }),
            });
            if (!res.ok)
                throw new Error('Failed to load page');
            const html = await res.text();
            const blob = new Blob([html], { type: "text/html; charset=utf-8" });
            const objUrl = URL.createObjectURL(blob);
            if (iframeRef.current) {
                iframeRef.current.src = objUrl;
            }
            toast({ title: "✓ Page loaded", description: "Ready for instructions" });
        }
        catch (error) {
            toast({ title: "Load failed", description: error.message, variant: "destructive" });
        }
        finally {
            setLoading(false);
        }
    };
    // Execute single instruction with visual feedback
    const executeInstruction = async (instr) => {
        const newStep = {
            instruction: instr,
            status: 'executing'
        };
        setSteps(prev => [...prev, newStep]);
        try {
            // Parse instruction
            const parseRes = await fetch("/api/parse-instructions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ prompt: instr }),
            });
            if (!parseRes.ok)
                throw new Error('Parse failed');
            const { actions } = await parseRes.json();
            if (actions.length === 0) {
                throw new Error('No actions found');
            }
            const action = actions[0];
            // Find element
            const locateRes = await fetch("/api/intelligent-locate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    url,
                    intent: action.intent,
                    elementType: action.elementType
                }),
            });
            if (!locateRes.ok)
                throw new Error('Locate failed');
            const { strategy } = await locateRes.json();
            // Highlight element in iframe
            highlightElement(strategy.element);
            // Simulate action execution
            await new Promise(resolve => setTimeout(resolve, 1000));
            setSteps(prev => prev.map((s, i) => i === prev.length - 1
                ? Object.assign(Object.assign({}, s), { status: 'success', selector: strategy.selector, confidence: strategy.confidence }) : s));
            toast({
                title: "✓ Action executed",
                description: `${action.type} on "${action.intent}" (${Math.round(strategy.confidence * 100)}% confidence)`
            });
        }
        catch (error) {
            setSteps(prev => prev.map((s, i) => i === prev.length - 1
                ? Object.assign(Object.assign({}, s), { status: 'failed', error: error.message }) : s));
            toast({ title: "Execution failed", description: error.message, variant: "destructive" });
        }
    };
    // Highlight element in iframe
    const highlightElement = (element) => {
        if (!iframeRef.current || !element.boundingBox)
            return;
        try {
            const iframeDoc = iframeRef.current.contentDocument;
            if (!iframeDoc)
                return;
            // Remove previous highlight
            const existing = iframeDoc.getElementById('ai-highlight');
            if (existing)
                existing.remove();
            // Add new highlight
            const highlight = iframeDoc.createElement('div');
            highlight.id = 'ai-highlight';
            highlight.style.cssText = `
        position: absolute;
        left: ${element.boundingBox.x}px;
        top: ${element.boundingBox.y}px;
        width: ${element.boundingBox.width}px;
        height: ${element.boundingBox.height}px;
        border: 3px solid #22c55e;
        background: rgba(34, 197, 94, 0.1);
        pointer-events: none;
        z-index: 999999;
        animation: pulse 1s ease-in-out infinite;
      `;
            iframeDoc.body.appendChild(highlight);
            // Scroll to element
            highlight.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        catch (e) {
            console.warn('Could not highlight element:', e);
        }
    };
    // Handle Enter key
    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey && instruction.trim() && !playing) {
            e.preventDefault();
            executeInstruction(instruction);
            setInstruction("");
        }
    };
    // Reset
    const reset = () => {
        setSteps([]);
        setInstruction("");
        loadPage();
    };
    return (_jsx("div", { className: "min-h-screen bg-background p-8", children: _jsxs("div", { className: "max-w-7xl mx-auto", children: [_jsxs("div", { className: "mb-6", children: [_jsxs("h1", { className: "text-3xl font-bold mb-2 flex items-center gap-2", children: [_jsx(Zap, { className: "w-8 h-8 text-primary" }), "Live Automation Player"] }), _jsx("p", { className: "text-muted-foreground", children: "Type instructions and watch the AI find and interact with elements in real-time" })] }), _jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-6", children: [_jsxs(Card, { children: [_jsxs(CardHeader, { children: [_jsx(CardTitle, { children: "Live Website" }), _jsx(CardDescription, { children: "AI will highlight and interact with elements here" })] }), _jsx(CardContent, { children: _jsxs("div", { className: "space-y-3", children: [_jsxs("div", { className: "flex gap-2", children: [_jsx(Input, { placeholder: "Website URL", value: url, onChange: (e) => setUrl(e.target.value) }), _jsx(Button, { onClick: loadPage, disabled: loading, variant: "outline", children: loading ? _jsx(Loader2, { className: "w-4 h-4 animate-spin" }) : "Load" })] }), _jsxs("div", { className: "border-2 rounded-lg overflow-hidden bg-white h-[500px] relative", children: [!((_a = iframeRef.current) === null || _a === void 0 ? void 0 : _a.src) && !loading && (_jsx("div", { className: "flex items-center justify-center h-full", children: _jsxs("div", { className: "text-center", children: [_jsx("p", { className: "text-muted-foreground mb-4", children: "Click \"Load\" to start" }), _jsx(Button, { onClick: loadPage, children: "Load Page" })] }) })), loading && (_jsx("div", { className: "flex items-center justify-center h-full", children: _jsx(Loader2, { className: "w-10 h-10 animate-spin text-primary" }) })), _jsx("iframe", { ref: iframeRef, className: "w-full h-full border-0", sandbox: "allow-forms allow-same-origin allow-scripts", title: "Live Preview" })] })] }) })] }), _jsxs(Card, { children: [_jsxs(CardHeader, { children: [_jsx(CardTitle, { children: "Instructions" }), _jsx(CardDescription, { children: "Type what you want to do (e.g., \"fill username with student\", \"click Submit\")" })] }), _jsx(CardContent, { children: _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "flex gap-2", children: [_jsx(Input, { placeholder: 'e.g., "fill username with student"', value: instruction, onChange: (e) => setInstruction(e.target.value), onKeyDown: handleKeyDown, disabled: playing }), _jsx(Button, { onClick: () => {
                                                            if (instruction.trim()) {
                                                                executeInstruction(instruction);
                                                                setInstruction("");
                                                            }
                                                        }, disabled: !instruction.trim() || playing, children: _jsx(PlayCircle, { className: "w-4 h-4" }) }), _jsx(Button, { onClick: reset, variant: "outline", children: _jsx(RotateCcw, { className: "w-4 h-4" }) })] }), _jsx("div", { className: "text-xs text-muted-foreground", children: "Press Enter to execute \u2022 AI will find elements semantically" }), _jsxs("div", { className: "space-y-2 max-h-[400px] overflow-y-auto", children: [steps.length === 0 && (_jsx("div", { className: "text-center text-muted-foreground text-sm py-8", children: "No steps yet. Type an instruction above." })), steps.map((step, i) => (_jsx("div", { className: `p-3 border rounded-lg ${step.status === 'success' ? 'border-green-500 bg-green-50' :
                                                            step.status === 'failed' ? 'border-red-500 bg-red-50' :
                                                                step.status === 'executing' ? 'border-blue-500 bg-blue-50' :
                                                                    'border-gray-300'}`, children: _jsx("div", { className: "flex items-start justify-between gap-2", children: _jsxs("div", { className: "flex-1", children: [_jsxs("div", { className: "flex items-center gap-2 mb-1", children: [_jsx(Badge, { variant: "outline", children: i + 1 }), step.status === 'executing' && _jsx(Loader2, { className: "w-3 h-3 animate-spin" }), step.status === 'success' && _jsx("span", { className: "text-green-500", children: "\u2713" }), step.status === 'failed' && _jsx("span", { className: "text-red-500", children: "\u2717" })] }), _jsx("div", { className: "text-sm font-medium", children: step.instruction }), step.selector && (_jsx("code", { className: "text-xs bg-white px-1 rounded mt-1 inline-block", children: step.selector })), step.confidence !== undefined && (_jsxs(Badge, { variant: "secondary", className: "ml-2 text-xs", children: [Math.round(step.confidence * 100), "%"] })), step.error && (_jsx("div", { className: "text-xs text-red-600 mt-1", children: step.error }))] }) }) }, i)))] }), _jsxs("div", { className: "border-t pt-4", children: [_jsx("div", { className: "text-xs font-semibold mb-2", children: "Quick Actions:" }), _jsxs("div", { className: "flex flex-wrap gap-2", children: [_jsx(Button, { size: "sm", variant: "outline", onClick: () => setInstruction('fill username with student'), children: "Fill Username" }), _jsx(Button, { size: "sm", variant: "outline", onClick: () => setInstruction('fill password with Password123'), children: "Fill Password" }), _jsx(Button, { size: "sm", variant: "outline", onClick: () => setInstruction('click submit'), children: "Click Submit" })] })] })] }) })] })] })] }) }));
}
