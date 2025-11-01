import express, { type Express } from "express";
import { createServer, type Server } from "http";
import { analyzeWebsite } from "./scraper";
import { intelligentAction, selectBestSelectorsFromElements } from "./intelligentLocator";
import { parseInstructions } from "./instructionParser";
import { generateTestCases } from "./testCaseGenerator";
import { saveXPathData, type StoredXPathData } from "./xpathStorage";
import { inferSelectorForIntent } from "./selectorModel";

export async function registerRoutes(app: Express): Promise<Server> {
  app.post("/api/parse-instructions", (req, res) => {
    const { prompt } = req.body;
    const actions = parseInstructions(prompt || "");
    res.json({ actions, totalActions: actions.length });
  });

  app.post("/api/scrape-website", async (req, res) => {
    const { url } = req.body;
    const analysis = await analyzeWebsite(url);
    res.json(analysis);
  });

  app.post("/api/intelligent-execute", async (req, res) => {
    const { url, prompt, actions } = req.body;
    const { chromium } = await import("playwright");
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });

    let parsed = actions;
    if (!parsed && prompt) parsed = parseInstructions(prompt);

    const results = [];
    for (const action of parsed) {
      let result;
      if (action.type === "fill") {
        result = await intelligentAction(page, "fill", action.intent, action.value);
      } else if (action.type === "click") {
        result = await intelligentAction(page, "click", action.intent);
      }
      if (result) {
        results.push({ ...result, action });
        if (!result.success) break;
      }
      await page.waitForTimeout(500);
    }

    let screenshot = "";
    try {
      const buf = await page.screenshot({ type: "png", fullPage: false });
      screenshot = buf.toString("base64");
    } catch {}
    await browser.close();

    res.json({
      results,
      summary: {
        total: results.length,
        successful: results.filter(r => r.success).length,
        totalDuration: 0
      },
      screenshot,
      success: results.every(r => r.success)
    });
  });

  app.post("/api/page-screenshot", async (req, res) => {
    try {
      const { url } = req.body || {};
      if (!url) return res.status(400).json({ error: "URL required" });

      console.log(`[Preview] Rendering HTML for ${url}...`);
      
      const { chromium } = await import("playwright");
      const browser = await chromium.launch({ headless: true });
      const page = await browser.newPage();
      
      // Navigate and wait for page to be ready
      await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
      await page.waitForTimeout(1500);
      
      // Get the full HTML
      let html = await page.content();
      
      await browser.close();
      console.log(`[Preview] Playwright rendered ${html?.length || 0} bytes`);

      if (!html || html.length < 50) {
        return res.status(500).json({ error: "Received empty or invalid HTML" });
      }

      // Remove security headers that block iframe embedding
      html = html.replace(/<meta[^>]*http-equiv=["']?Content-Security-Policy["']?[^>]*>/gi, '');
      html = html.replace(/<meta[^>]*http-equiv=["']?X-Frame-Options["']?[^>]*>/gi, '');
      html = html.replace(/<meta[^>]*name=["']?referrer["']?[^>]*>/gi, '');

      // Inject base tag to fix relative URLs
      if (html.includes("<head")) {
        html = html.replace(
          /<head([^>]*)>/i,
          `<head$1>\n  <base href="${url}">\n  <meta charset="utf-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1">`
        );
      } else {
        html = `<head>\n  <base href="${url}">\n  <meta charset="utf-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1">\n</head>\n${html}`;
      }

      // Return as HTML
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.status(200).send(html);
      console.log(`[Preview] ✓ Sent ${html.length} bytes of HTML`);
    } catch (error: any) {
      console.error('[Preview] Fatal error:', error.message, error.stack);
      if (!res.headersSent) {
        res.status(500).json({ error: error.message });
      }
    }
  });

  // CORRECTED FLOW: Scrape → Analyze → Match → Generate
  app.post("/api/generate-test-cases", async (req, res) => {
    try {
      const { url, prompt } = req.body;
      
      console.log(`[API] Step 1: Scraping ${url}...`);
      const analysis = await analyzeWebsite(url);
      
      console.log(`[API] Step 2: Found ${analysis.allInteractive?.length || 0} interactive elements`);
      
      console.log(`[API] Step 3: Matching prompt to elements...`);
      const testCases = await generateTestCases(analysis, prompt);
      
      console.log(`[API] Step 4: Generated ${testCases.testCases.length} test cases`);
      
      res.json(testCases);
    } catch (error: any) {
      console.error('[API] Error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // New: analyze site and produce best selectors (uses Gemini/OpenAI/fallback)
  app.post("/api/analyze-and-selectors", async (req, res) => {
    try {
      const { url, prompt } = req.body;
      if (!url) return res.status(400).json({ error: "url required" });

      const analysis = await analyzeWebsite(url);
      const actions = parseInstructions(prompt || "");
      const matches: any[] = [];

      for (const action of actions) {
        if (action.type === "fill" || action.type === "click") {
          const { element, selector, confidence, source } = await selectBestSelectorsFromElements(action.intent, analysis.allInteractive || []);
          matches.push({
            action,
            selector,
            confidence,
            source,
            element,
          });
        } else {
          matches.push({ action, selector: null, confidence: 0, source: "none", element: null });
        }
      }

      // Save scraped data (already saved in scraper but ensure latest)
      const stored: StoredXPathData = {
        url,
        scrapedAt: new Date().toISOString(),
        forms: [],
        buttons: (analysis.allInteractive || []).filter(e => ['button','input'].includes(e.tag)).map(e => ({ 
          text: e.text, 
          selectors: e.selectors, 
          ariaLabel: e.ariaLabel, 
          role: e.role,
          xpath: (e as any).xpath,
          xpathCandidates: (e as any).xpathCandidates // <-- ensure this is here
        })),
        links: (analysis.allInteractive || []).filter(e => e.tag === 'a').map(e => ({ 
          text: e.text, 
          href: '', 
          selectors: e.selectors, 
          ariaLabel: e.ariaLabel,
          xpath: (e as any).xpath,
          xpathCandidates: (e as any).xpathCandidates // <-- ensure this is here
        })),
        allInteractive: (analysis.allInteractive || []).map(e => ({ 
          text: e.text, 
          tag: e.tag, 
          type: e.type, 
          selectors: e.selectors, 
          matchScore: 0,
          xpath: (e as any).xpath,
          xpathCandidates: (e as any).xpathCandidates // <-- ensure this is here
        })),
      };
      const path = saveXPathData(url, stored);

      res.json({ analysis, matches, storagePath: path });
    } catch (error: any) {
      console.error('[Analyze] Error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // New: infer selector for an intent on a URL
  app.post("/api/infer-selector", async (req, res) => {
    try {
      const { url, intent } = req.body;
      if (!url || !intent) return res.status(400).json({ error: "url and intent required" });

      // Scrape / analyze site first
      const analysis = await analyzeWebsite(url);

      // Run selector model
      const result = await inferSelectorForIntent(intent, analysis);

      // return analysis + selector result
      res.json({ analysis, selectorResult: result });
    } catch (error: any) {
      console.error('[InferSelector] Error:', error);
      res.status(500).json({ error: error?.message || String(error) });
    }
  });

  // DEBUG: run a scrape and return counts + samples for quick inspection
  app.post("/api/debug-scrape", async (req, res) => {
    try {
      const { url } = req.body || {};
      if (!url) return res.status(400).json({ error: "url required" });

      console.log(`[DebugScrape] Scraping: ${url}`);
      const analysis = await analyzeWebsite(url);

      const all = analysis.allInteractive || [];
      const counts: Record<string, number> = {};
      for (const el of all) counts[el.tag] = (counts[el.tag] || 0) + 1;

      const samples = all.slice(0, 40).map((e: any) => ({
        tag: e.tag,
        id: e.id || null,
        name: e.name || null,
        friendlyName: e.friendlyName || null,
        text: (e.text && typeof e.text === 'string') ? (e.text.length > 200 ? e.text.slice(0,200) + '…' : e.text) : e.text,
        selectors: e.selectors || [],
        xpath: e.xpath || null,
        xpathCandidates: e.xpathCandidates || [],
      }));

      res.json({ url: analysis.url, title: (analysis as any).title || null, total: all.length, counts, samples });
    } catch (err: any) {
      console.error('[DebugScrape] Error:', err);
      res.status(500).json({ error: err?.message || String(err) });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
