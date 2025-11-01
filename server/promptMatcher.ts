import type { WebsiteAnalysis } from "@shared/schema";

export interface MatchedElement {
  element: any;
  matchScore: number;
  matchReason: string;
}

/**
 * Match user prompt keywords to scraped elements
 */
export function matchPromptToElements(
  prompt: string,
  analysis: WebsiteAnalysis
): {
  fields: MatchedElement[];
  buttons: MatchedElement[];
  allMatches: MatchedElement[];
} {
  const promptLower = prompt.toLowerCase();
  const keywords = extractKeywords(promptLower);
  
  console.log(`[PromptMatcher] Keywords:`, keywords);
  
  const allMatches: MatchedElement[] = [];
  
  for (const el of analysis.allInteractive || []) {
    const score = calculateMatchScore(el, keywords, promptLower);
    if (score > 0) {
      allMatches.push({
        element: el,
        matchScore: score,
        matchReason: `${el.tag}[${el.name || el.placeholder || el.text}]`,
      });
    }
  }
  
  allMatches.sort((a, b) => b.matchScore - a.matchScore);
  
  const fields = allMatches.filter(m => ['input', 'textarea', 'select'].includes(m.element.tag));
  const buttons = allMatches.filter(m => ['button', 'a'].includes(m.element.tag) || m.element.type === 'submit');
  
  console.log(`[PromptMatcher] ${fields.length} fields, ${buttons.length} buttons`);
  
  return { fields, buttons, allMatches };
}

function extractKeywords(prompt: string): string[] {
  const keywords: string[] = [];
  const fillPattern = /(?:fill|enter|type)\s+(?:the\s+)?([a-z]+)/gi;
  const clickPattern = /(?:click|press|tap)\s+(?:the\s+)?([a-z]+)/gi;
  
  let match;
  while ((match = fillPattern.exec(prompt)) !== null) keywords.push(match[1].toLowerCase());
  while ((match = clickPattern.exec(prompt)) !== null) keywords.push(match[1].toLowerCase());
  
  ['username', 'password', 'email', 'login', 'submit', 'search'].forEach(field => {
    if (prompt.includes(field)) keywords.push(field);
  });
  
  return [...new Set(keywords)];
}

function calculateMatchScore(element: any, keywords: string[], prompt: string): number {
  let score = 0;
  const text = (element.text || '').toLowerCase();
  const placeholder = (element.placeholder || '').toLowerCase();
  const name = (element.name || '').toLowerCase();
  const id = (element.id || '').toLowerCase();
  
  for (const keyword of keywords) {
    if (placeholder === keyword) score += 90;
    if (name === keyword) score += 85;
    if (placeholder.includes(keyword)) score += 45;
    if (name.includes(keyword)) score += 40;
    if (text.includes(keyword)) score += 30;
    if (id.includes(keyword)) score += 25;
  }
  
  return score;
}
