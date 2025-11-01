import type { Page } from "playwright";
import OpenAI from "openai";
import { geminiEmbeddings } from "./geminiClient";

const OPENAI_KEY = process.env.OPENAI_API_KEY;
const openai = OPENAI_KEY ? new OpenAI({ apiKey: OPENAI_KEY }) : null;

export interface ElementContext {
  tag: string;
  type: string;
  text: string;
  ariaLabel: string;
  role: string;
  placeholder: string;
  name: string;
  id: string;
  selectors: string[];
  xpath?: string;
}

export async function getAllElements(page: Page): Promise<ElementContext[]> {
  return await page.$$eval(
    'input, button, a, textarea, select, [role], [aria-label], [placeholder]',
    (elements) =>
      Array.from(elements).map((el) => ({
        tag: el.tagName.toLowerCase(),
        type: (el as any).type || "",
        text: (el.textContent || (el as any).value || "").trim(),
        ariaLabel: el.getAttribute("aria-label") || "",
        role: el.getAttribute("role") || "",
        placeholder: (el as any).placeholder || "",
        name: el.getAttribute("name") || "",
        id: (el as any).id || "",
        selectors: [
          (el as any).id ? `#${(el as any).id}` : null,
          el.getAttribute("name") ? `[name='${el.getAttribute("name")}']` : null,
          el.getAttribute("aria-label") ? `[aria-label='${el.getAttribute("aria-label")}']` : null,
          (el as any).placeholder ? `[placeholder='${(el as any).placeholder}']` : null,
          el.tagName.toLowerCase(),
        ].filter(Boolean),
      }))
  );
}

export async function aiFindElement(intent: string, elements: ElementContext[]): Promise<{ element: ElementContext; score: number }> {
  // Use OpenAI embeddings for semantic similarity
  if (!openai) {
    throw new Error('OpenAI client not initialized');
  }
  const intentEmbedding = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: intent,
  });
  const elementTexts = elements.map(
    (el) =>
      `${el.text} ${el.ariaLabel} ${el.role} ${el.placeholder} ${el.name} ${el.id}`
  );
  const elementEmbeddings = await Promise.all(
    elementTexts.map((text) =>
      openai.embeddings.create({ model: "text-embedding-3-small", input: text })
    )
  );
  function cosineSimilarity(a: number[], b: number[]): number {
    const dot = a.reduce((sum, v, i) => sum + v * b[i], 0);
    const magA = Math.sqrt(a.reduce((sum, v) => sum + v * v, 0));
    const magB = Math.sqrt(b.reduce((sum, v) => sum + v * v, 0));
    return dot / (magA * magB);
  }
  const scores = elementEmbeddings.map((emb, i) => ({
    element: elements[i],
    score: cosineSimilarity(
      intentEmbedding.data[0].embedding,
      emb.data[0].embedding
    ),
  }));
  scores.sort((a, b) => b.score - a.score);
  return scores[0];
}

export async function intelligentAction(
  page: Page,
  action: "fill" | "click",
  intent: string,
  value?: string
): Promise<{ success: boolean; selector: string; reasoning: string }> {
  // Fallback to simple matching if no API key
  if (!openai) {
    console.warn('[IntelligentLocator] No OpenAI key - using simple matching');
    return simpleElementMatching(page, action, intent, value);
  }
  
  const elements = await getAllElements(page);
  const { element, score } = await aiFindElement(intent, elements);
  if (!element) return { success: false, selector: "", reasoning: "No element found" };
  try {
    const selector = element.selectors[0];
    const locator = page.locator(selector).first();
    if (action === "fill" && value) await locator.fill(value);
    else if (action === "click") await locator.click();
    return { success: true, selector, reasoning: `Matched "${intent}" with score ${score.toFixed(2)}` };
  } catch (e: any) {
    return { success: false, selector: element.selectors[0], reasoning: e.message };
  }
}

// Simple fallback without AI
async function simpleElementMatching(
  page: Page,
  action: "fill" | "click",
  intent: string,
  value?: string
): Promise<{ success: boolean; selector: string; reasoning: string }> {
  const intentLower = intent.toLowerCase();
  
  try {
    if (action === "fill") {
      const selector = `input[name*="${intentLower}"], input[placeholder*="${intentLower}"], input[id*="${intentLower}"]`;
      const locator = page.locator(selector).first();
      if (await locator.count() > 0) {
        await locator.fill(value || '');
        return { success: true, selector, reasoning: `Matched by name/placeholder` };
      }
    } else if (action === "click") {
      const selector = `button:has-text("${intent}"), a:has-text("${intent}")`;
      const locator = page.locator(selector).first();
      if (await locator.count() > 0) {
        await locator.click();
        return { success: true, selector, reasoning: `Matched by text` };
      }
    }
  } catch (e: any) {
    return { success: false, selector: '', reasoning: e.message };
  }
  
  return { success: false, selector: '', reasoning: 'No element found' };
}

// New: score and choose best selector from scraped elements
export async function selectBestSelectorsFromElements(
  intent: string,
  elements: ElementContext[]
): Promise<{ element: ElementContext | null; selector: string; confidence: number; source: "gemini" | "openai" | "heuristic" | "none" }> {
  if (!elements || elements.length === 0) return { element: null, selector: '', confidence: 0, source: "none" };

  // prepare text corpus to embed
  const elementTexts = elements.map(e => `${e.text || ''} ${e.ariaLabel || ''} ${e.placeholder || ''} ${e.name || ''} ${e.id || ''}`.trim());

  // Try Gemini first (if configured)
  if (process.env.GEMINI_API_URL && process.env.GEMINI_API_KEY) {
    try {
      const intentEmb = await geminiEmbeddings(intent);
      const elementEmbeddings = await Promise.all(elementTexts.map(t => geminiEmbeddings(t)));
      const scores = elementEmbeddings.map((emb, i) => cosine(intentEmb, emb));
      const idx = scores.indexOf(Math.max(...scores));
      const chosen = elements[idx];
      const selector = chooseBestSelectorForElement(chosen);
      return { element: chosen, selector, confidence: scores[idx], source: "gemini" };
    } catch (e) {
      console.warn('[Selector] Gemini failed, falling back:', (e as Error).message);
    }
  }

  // Try OpenAI embeddings
  if (openai) {
    try {
      const intentEmb = await openai.embeddings.create({ model: "text-embedding-3-small", input: intent });
      const intentVec = intentEmb.data[0].embedding;
      const elementEmbeddings = await Promise.all(elementTexts.map(t => openai.embeddings.create({ model: "text-embedding-3-small", input: t })));
      const scores = elementEmbeddings.map((emb, i) => cosine(intentVec, emb.data[0].embedding));
      const idx = scores.indexOf(Math.max(...scores));
      const chosen = elements[idx];
      const selector = chooseBestSelectorForElement(chosen);
      return { element: chosen, selector, confidence: scores[idx], source: "openai" };
    } catch (e) {
      console.warn('[Selector] OpenAI embeddings failed, falling back:', (e as Error).message);
    }
  }

  // Heuristic fallback: string matching over fields
  const intentLower = intent.toLowerCase();
  let best: { el?: ElementContext; score?: number } = {};
  for (const el of elements) {
    let s = 0;
    const txt = (el.text || '').toLowerCase();
    const ph = (el.placeholder || '').toLowerCase();
    const name = (el.name || '').toLowerCase();
    const id = (el.id || '').toLowerCase();
    if (txt === intentLower) s += 100;
    if (ph === intentLower) s += 90;
    if (name === intentLower) s += 80;
    if (txt.includes(intentLower)) s += 40;
    if (ph.includes(intentLower)) s += 30;
    if (!best.score || s > best.score) best = { el, score: s };
  }
  if (best.el) {
    const selector = chooseBestSelectorForElement(best.el);
    return { element: best.el, selector, confidence: best.score || 0, source: "heuristic" };
  }

  return { element: null, selector: '', confidence: 0, source: "none" };
}

function cosine(a: number[], b: number[]) {
  const dot = a.reduce((s, v, i) => s + v * (b[i] || 0), 0);
  const magA = Math.sqrt(a.reduce((s, v) => s + v * v, 0));
  const magB = Math.sqrt(b.reduce((s, v) => s + v * v, 0));
  if (magA === 0 || magB === 0) return 0;
  return dot / (magA * magB);
}

function chooseBestSelectorForElement(el: ElementContext): string {
  // Prefer id, name, aria-label, placeholder, xpath, then first CSS selector
  if (el.id) return `#${el.id}`;
  if (el.name) return `[name="${el.name}"]`;
  if (el.ariaLabel) return `[aria-label="${el.ariaLabel}"]`;
  if (el.placeholder) return `[placeholder="${el.placeholder}"]`;
  if ((el as any).xpath) return `xpath=${(el as any).xpath}`;
  if (el.selectors && el.selectors.length) return el.selectors[0];
  return el.tag || 'body';
}
