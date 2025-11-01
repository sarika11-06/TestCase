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
  const [actions, setActions] = useState<any[]>([]);
  const [results, setResults] = useState<any>(null);
  const [parsing, setParsing] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [stepResults, setStepResults] = useState<any[]>([]);
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
  const executeStep = async (stepIdx: number) => {
    if (!actions[stepIdx] || !url) return;
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
    } finally {
      setExecuting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Intelligent Automation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input placeholder="Website URL" value={url} onChange={e => setUrl(e.target.value)} />
          <Textarea placeholder='e.g. "Fill username with alice, fill password with secret, click login"' value={prompt} onChange={e => setPrompt(e.target.value)} rows={3} />
          <div className="flex gap-2">
            <Button onClick={parse} disabled={parsing}>{parsing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Parse"}</Button>
            <Button onClick={execute} disabled={executing || !actions.length}>{executing ? <Loader2 className="w-4 h-4 animate-spin" /> : <><PlayCircle className="w-4 h-4" /> Execute</>}</Button>
          </div>
        </CardContent>
      </Card>
      {actions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Parsed Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-2">
              {actions.map((a, i) => (
                <li key={i} className="text-sm">{a.type} <b>{a.intent}</b> {a.value && `with "${a.value}"`}</li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}
      {actions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Test Steps</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-2">
              {actions.map((a, i) => (
                <li key={i} className="flex items-center gap-2 text-sm">
                  <span>
                    {a.type} <b>{a.intent}</b> {a.value && `with "${a.value}"`}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={executing}
                    onClick={() => executeStep(i)}
                  >
                    <PlayCircle className="w-4 h-4" /> Execute
                  </Button>
                  {stepResults[i] && (
                    <span className={stepResults[i].success ? "text-green-600" : "text-red-600"}>
                      {stepResults[i].success ? "✓" : "✗"} {stepResults[i].reasoning}
                    </span>
                  )}
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}
      {results && (
        <Card>
          <CardHeader>
            <CardTitle>Execution Results</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-2">
              {results.results.map((r: any, i: number) => (
                <li key={i} className={`flex items-center gap-2 text-sm ${r.success ? "text-green-700" : "text-red-700"}`}>
                  {r.success ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                  <span>{r.action.type} <b>{r.action.intent}</b> {r.action.value && `with "${r.action.value}"`} - {r.reasoning}</span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
