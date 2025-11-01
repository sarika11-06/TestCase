import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, PlayCircle, CheckCircle, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
export default function IntelligentAutomation() {
    const [url, setUrl] = useState("");
    const [prompt, setPrompt] = useState("");
    const [actions, setActions] = useState([]);
    const [results, setResults] = useState(null);
    const [parsing, setParsing] = useState(false);
    const [executing, setExecuting] = useState(false);
    const [stepResults, setStepResults] = useState([]);
    const { toast } = useToast();
    const parse = async () => {
        setParsing(true);
        const res = await fetch("/api/parse-instructions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt }),
        });
        const data = await res.json();
        setActions(data.actions);
        setParsing(false);
    };
    const execute = async () => {
        setExecuting(true);
        const res = await fetch("/api/intelligent-execute", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url, actions }),
        });
        const data = await res.json();
        setResults(data);
        setExecuting(false);
    };
    // Execute a single step
    const executeStep = async (stepIdx) => {
        if (!actions[stepIdx] || !url)
            return;
        setExecuting(true);
        try {
            const res = await fetch("/api/intelligent-execute", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url, actions: [actions[stepIdx]] }),
            });
            const data = await res.json();
            setStepResults(prev => {
                const next = [...prev];
                next[stepIdx] = data.results[0];
                return next;
            });
        }
        finally {
            setExecuting(false);
        }
    };
    return (_jsxs("div", { className: "max-w-2xl mx-auto p-6 space-y-6", children: [_jsxs(Card, { children: [_jsx(CardHeader, { children: _jsx(CardTitle, { children: "Intelligent Automation" }) }), _jsxs(CardContent, { className: "space-y-4", children: [_jsx(Input, { placeholder: "Website URL", value: url, onChange: e => setUrl(e.target.value) }), _jsx(Textarea, { placeholder: 'e.g. "Fill username with alice, fill password with secret, click login"', value: prompt, onChange: e => setPrompt(e.target.value), rows: 3 }), _jsxs("div", { className: "flex gap-2", children: [_jsx(Button, { onClick: parse, disabled: parsing, children: parsing ? _jsx(Loader2, { className: "w-4 h-4 animate-spin" }) : "Parse" }), _jsx(Button, { onClick: execute, disabled: executing || !actions.length, children: executing ? _jsx(Loader2, { className: "w-4 h-4 animate-spin" }) : _jsxs(_Fragment, { children: [_jsx(PlayCircle, { className: "w-4 h-4" }), " Execute"] }) })] })] })] }), actions.length > 0 && (_jsxs(Card, { children: [_jsx(CardHeader, { children: _jsx(CardTitle, { children: "Parsed Actions" }) }), _jsx(CardContent, { children: _jsx("ol", { className: "space-y-2", children: actions.map((a, i) => (_jsxs("li", { className: "text-sm", children: [a.type, " ", _jsx("b", { children: a.intent }), " ", a.value && `with "${a.value}"`] }, i))) }) })] })), actions.length > 0 && (_jsxs(Card, { children: [_jsx(CardHeader, { children: _jsx(CardTitle, { children: "Test Steps" }) }), _jsx(CardContent, { children: _jsx("ol", { className: "space-y-2", children: actions.map((a, i) => (_jsxs("li", { className: "flex items-center gap-2 text-sm", children: [_jsxs("span", { children: [a.type, " ", _jsx("b", { children: a.intent }), " ", a.value && `with "${a.value}"`] }), _jsxs(Button, { size: "sm", variant: "outline", disabled: executing, onClick: () => executeStep(i), children: [_jsx(PlayCircle, { className: "w-4 h-4" }), " Execute"] }), stepResults[i] && (_jsxs("span", { className: stepResults[i].success ? "text-green-600" : "text-red-600", children: [stepResults[i].success ? "✓" : "✗", " ", stepResults[i].reasoning] }))] }, i))) }) })] })), results && (_jsxs(Card, { children: [_jsx(CardHeader, { children: _jsx(CardTitle, { children: "Execution Results" }) }), _jsx(CardContent, { children: _jsx("ol", { className: "space-y-2", children: results.results.map((r, i) => (_jsxs("li", { className: `flex items-center gap-2 text-sm ${r.success ? "text-green-700" : "text-red-700"}`, children: [r.success ? _jsx(CheckCircle, { className: "w-4 h-4" }) : _jsx(XCircle, { className: "w-4 h-4" }), _jsxs("span", { children: [r.action.type, " ", _jsx("b", { children: r.action.intent }), " ", r.action.value && `with "${r.action.value}"`, " - ", r.reasoning] })] }, i))) }) })] }))] }));
}
