import type { WebsiteAnalysis } from "@shared/schema";
import type { ElementContext } from "./intelligentLocator";
import { selectBestSelectorsFromElements } from "./intelligentLocator";

/**
 * Escape string for XPath literal
 */
function xpathLiteral(s: string) {
  if (s.includes("'") && s.includes('"')) {
    const parts: string[] = [];
    for (const chunk of s.split("'")) {
      parts.push(`'${chunk}'`);
      parts.push(`"'"`);
    }
    parts.pop();
    return `concat(${parts.join(",")})`;
  }
  if (s.includes("'")) return `"${s}"`;
  return `'${s}'`;
}

/**
 * Build multiple XPath candidates for an element
 */
function buildXPathCandidates(el: Partial<ElementContext> & { xpath?: string }) {
  const candidates: string[] = [];

  if (el.id) candidates.push(`//${el.tag || '*'}[@id=${xpathLiteral(el.id)}]`);
  if (el.name) candidates.push(`//${el.tag || '*'}[@name=${xpathLiteral(el.name)}]`);
  if (el.ariaLabel) candidates.push(`//${el.tag || '*'}[@aria-label=${xpathLiteral(el.ariaLabel)}]`);
  if (el.placeholder) candidates.push(`//${el.tag || '*'}[@placeholder=${xpathLiteral(el.placeholder)}]`);

  // Text-based candidates (exact and contains)
  const text = (el.text || '').trim();
  if (text) {
    const short = text.length > 200 ? text.slice(0, 200) : text;
    candidates.push(`//${el.tag || '*'}[normalize-space()=${xpathLiteral(short)}]`);
    candidates.push(`//${el.tag || '*'}[contains(normalize-space(.), ${xpathLiteral(short)})]`);
    // also a generic text fallback (any tag)
    candidates.push(`//*[normalize-space()=${xpathLiteral(short)}]`);
    candidates.push(`//*[contains(normalize-space(.), ${xpathLiteral(short)})]`);
  }

  // label -> input pattern
  if (el.name || el.placeholder || el.ariaLabel) {
    const labelText : any = el.name || el.placeholder || el.ariaLabel;
    candidates.push(`//label[contains(normalize-space(.), ${xpathLiteral(labelText)})]/following::input[1]`);
    candidates.push(`//label[contains(normalize-space(.), ${xpathLiteral(labelText)})]/following::*[1]`);
  }

  // include stored positional xpath if present
  if (el.xpath) candidates.push(el.xpath);

  // positional fallback generic: first occurrence of tag with index 1
  if (el.tag) candidates.push(`//${el.tag}[1]`);

  // dedupe preserving order
  return Array.from(new Set(candidates));
}

/**
 * Infer a selector (primarily XPath) for an intent given a site analysis.
 * Uses selectBestSelectorsFromElements (Gemini/OpenAI/heuristic) internally.
 */
export async function inferSelectorForIntent(
  intent: string,
  analysis: WebsiteAnalysis
): Promise<{
  success: boolean;
  chosen?: string;
  candidates: string[];
  element?: ElementContext | null;
  confidence: number;
  source: "gemini" | "openai" | "heuristic" | "none";
  reasoning?: string;
}> {
  const elements = (analysis as any).allInteractive || [];
  if (!elements || elements.length === 0) {
    return { success: false, candidates: [], element: null, confidence: 0, source: "none", reasoning: "No interactive elements scraped" };
  }

  const { element, selector, confidence, source } = await selectBestSelectorsFromElements(intent, elements as ElementContext[]);

  if (!element) {
    return { success: false, candidates: [], element: null, confidence: 0, source: "none", reasoning: "No matching element" };
  }

  // If scraper provided xpathCandidates, prefer them
  const providedCandidates: string[] = Array.isArray((element as any).xpathCandidates) ? (element as any).xpathCandidates : [];

  // Build fallback candidates from element properties (existing logic)
  const fallbackCandidates = buildXPathCandidates({ ...element, xpath: (element as any).xpath });

  // Combine candidates with scraper-provided ones first
  const xpathCandidates = [...providedCandidates, ...fallbackCandidates].filter(Boolean);

  // Determine chosen xpath:
  let chosen: string | undefined;
  if ((element as any).xpath) chosen = (element as any).xpath; // prefer stored xpath
  else if (selector && typeof selector === "string" && selector.startsWith("xpath=")) chosen = selector.replace(/^xpath=/, '');
  else if (xpathCandidates.length > 0) chosen = xpathCandidates[0];

  // Normalize chosen
  if (typeof chosen === 'string' && chosen.startsWith('xpath=')) chosen = chosen.replace(/^xpath=/, '');

  const reasoning = `Matched by ${source} (confidence ${ (confidence || 0).toFixed(2) }) — element tag=${element.tag} id=${element.id || '-'} name=${element.name || '-'} aria=${element.ariaLabel || '-'}`;

  return {
    success: true,
    chosen,
    candidates: xpathCandidates,
    element,
    confidence: confidence || 0,
    source,
    reasoning,
  };
}
