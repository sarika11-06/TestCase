import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, PlayCircle, StopCircle, RotateCcw, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Step {
  instruction: string;
  status: 'pending' | 'executing' | 'success' | 'failed';
  selector?: string;
  confidence?: number;
  error?: string;
}

export default function LiveAutomationPlayer() {
  const [url, setUrl] = useState("https://practicetestautomation.com/practice-test-login/");
  const [instruction, setInstruction] = useState("");
  const [steps, setSteps] = useState<Step[]>([]);
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
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

      if (!res.ok) throw new Error('Failed to load page');

      const html = await res.text();
      const blob = new Blob([html], { type: "text/html; charset=utf-8" });
      const objUrl = URL.createObjectURL(blob);
      
      if (iframeRef.current) {
        iframeRef.current.src = objUrl;
      }

      toast({ title: "✓ Page loaded", description: "Ready for instructions" });
    } catch (error: any) {
      toast({ title: "Load failed", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // Execute single instruction with visual feedback
  const executeInstruction = async (instr: string) => {
    const newStep: Step = {
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

      if (!parseRes.ok) throw new Error('Parse failed');

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

      if (!locateRes.ok) throw new Error('Locate failed');

      const { strategy } = await locateRes.json();

      // Highlight element in iframe
      highlightElement(strategy.element);

      // Simulate action execution
      await new Promise(resolve => setTimeout(resolve, 1000));

      setSteps(prev => prev.map((s, i) => 
        i === prev.length - 1 
          ? { ...s, status: 'success', selector: strategy.selector, confidence: strategy.confidence }
          : s
      ));

      toast({ 
        title: "✓ Action executed", 
        description: `${action.type} on "${action.intent}" (${Math.round(strategy.confidence * 100)}% confidence)` 
      });

    } catch (error: any) {
      setSteps(prev => prev.map((s, i) => 
        i === prev.length - 1 
          ? { ...s, status: 'failed', error: error.message }
          : s
      ));

      toast({ title: "Execution failed", description: error.message, variant: "destructive" });
    }
  };

  // Highlight element in iframe
  const highlightElement = (element: any) => {
    if (!iframeRef.current || !element.boundingBox) return;

    try {
      const iframeDoc = iframeRef.current.contentDocument;
      if (!iframeDoc) return;

      // Remove previous highlight
      const existing = iframeDoc.getElementById('ai-highlight');
      if (existing) existing.remove();

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
    } catch (e) {
      console.warn('Could not highlight element:', e);
    }
  };

  // Handle Enter key
  const handleKeyDown = (e: React.KeyboardEvent) => {
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

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
            <Zap className="w-8 h-8 text-primary" />
            Live Automation Player
          </h1>
          <p className="text-muted-foreground">
            Type instructions and watch the AI find and interact with elements in real-time
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Live Preview */}
          <Card>
            <CardHeader>
              <CardTitle>Live Website</CardTitle>
              <CardDescription>
                AI will highlight and interact with elements here
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    placeholder="Website URL"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                  />
                  <Button onClick={loadPage} disabled={loading} variant="outline">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Load"}
                  </Button>
                </div>

                <div className="border-2 rounded-lg overflow-hidden bg-white h-[500px] relative">
                  {!iframeRef.current?.src && !loading && (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <p className="text-muted-foreground mb-4">Click "Load" to start</p>
                        <Button onClick={loadPage}>Load Page</Button>
                      </div>
                    </div>
                  )}
                  {loading && (
                    <div className="flex items-center justify-center h-full">
                      <Loader2 className="w-10 h-10 animate-spin text-primary" />
                    </div>
                  )}
                  <iframe
                    ref={iframeRef}
                    className="w-full h-full border-0"
                    sandbox="allow-forms allow-same-origin allow-scripts"
                    title="Live Preview"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Right: Instructions & Steps */}
          <Card>
            <CardHeader>
              <CardTitle>Instructions</CardTitle>
              <CardDescription>
                Type what you want to do (e.g., "fill username with student", "click Submit")
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder='e.g., "fill username with student"'
                    value={instruction}
                    onChange={(e) => setInstruction(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={playing}
                  />
                  <Button
                    onClick={() => {
                      if (instruction.trim()) {
                        executeInstruction(instruction);
                        setInstruction("");
                      }
                    }}
                    disabled={!instruction.trim() || playing}
                  >
                    <PlayCircle className="w-4 h-4" />
                  </Button>
                  <Button onClick={reset} variant="outline">
                    <RotateCcw className="w-4 h-4" />
                  </Button>
                </div>

                <div className="text-xs text-muted-foreground">
                  Press Enter to execute • AI will find elements semantically
                </div>

                {/* Executed Steps */}
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {steps.length === 0 && (
                    <div className="text-center text-muted-foreground text-sm py-8">
                      No steps yet. Type an instruction above.
                    </div>
                  )}
                  {steps.map((step, i) => (
                    <div
                      key={i}
                      className={`p-3 border rounded-lg ${
                        step.status === 'success' ? 'border-green-500 bg-green-50' :
                        step.status === 'failed' ? 'border-red-500 bg-red-50' :
                        step.status === 'executing' ? 'border-blue-500 bg-blue-50' :
                        'border-gray-300'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline">{i + 1}</Badge>
                            {step.status === 'executing' && <Loader2 className="w-3 h-3 animate-spin" />}
                            {step.status === 'success' && <span className="text-green-500">✓</span>}
                            {step.status === 'failed' && <span className="text-red-500">✗</span>}
                          </div>
                          <div className="text-sm font-medium">{step.instruction}</div>
                          {step.selector && (
                            <code className="text-xs bg-white px-1 rounded mt-1 inline-block">
                              {step.selector}
                            </code>
                          )}
                          {step.confidence !== undefined && (
                            <Badge variant="secondary" className="ml-2 text-xs">
                              {Math.round(step.confidence * 100)}%
                            </Badge>
                          )}
                          {step.error && (
                            <div className="text-xs text-red-600 mt-1">{step.error}</div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Quick Actions */}
                <div className="border-t pt-4">
                  <div className="text-xs font-semibold mb-2">Quick Actions:</div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setInstruction('fill username with student')}
                    >
                      Fill Username
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setInstruction('fill password with Password123')}
                    >
                      Fill Password
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setInstruction('click submit')}
                    >
                      Click Submit
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
