export interface ParsedAction {
  type: 'fill' | 'click' | 'select' | 'navigate' | 'verify';
  intent: string;
  value?: string;
  elementType?: 'input' | 'button' | 'link' | 'select';
  confidence: number;
}

/**
 * Parse natural language instructions into structured actions
 * 
 * @example
 * "Enter username and password, then click login"
 * →
 * [
 *   { type: 'fill', intent: 'username', elementType: 'input' },
 *   { type: 'fill', intent: 'password', elementType: 'input' },
 *   { type: 'click', intent: 'login', elementType: 'button' }
 * ]
 */
export function parseInstructions(prompt: string): ParsedAction[] {
  const actions: ParsedAction[] = [];
  const normalizedPrompt = prompt.toLowerCase().trim();
  
  // Split by common delimiters
  const segments = normalizedPrompt.split(/(?:,\s*then|,\s*and|,|then|and)\s+/i);
  
  for (const segment of segments) {
    const trimmed = segment.trim();
    if (!trimmed) continue;
    
    // Pattern 1: Fill/Enter/Type actions
    // "enter [value] in [field]" or "fill [field] with [value]"
    const fillMatch = 
      trimmed.match(/(?:enter|type|fill|input)\s+(?:in\s+)?(?:the\s+)?["']?([^"']+?)["']?\s+(?:in|into|to)\s+(?:the\s+)?["']?([^"']+)["']?/i) ||
      trimmed.match(/(?:enter|type|fill|input)\s+(?:the\s+)?["']?([^"']+)["']?\s+(?:field|input|box)/i);
    
    if (fillMatch) {
      const fieldIntent = fillMatch[2] || fillMatch[1];
      const value = fillMatch[2] ? fillMatch[1] : '';
      
      actions.push({
        type: 'fill',
        intent: fieldIntent.trim(),
        value: value || `test_${fieldIntent}`,
        elementType: 'input',
        confidence: 0.9
      });
      continue;
    }
    
    // Pattern 2: Click actions
    // "click [element]" or "press [button]"
    const clickMatch = trimmed.match(/(?:click|press|tap|hit)\s+(?:on\s+)?(?:the\s+)?["']?([^"']+)["']?/i);
    
    if (clickMatch) {
      actions.push({
        type: 'click',
        intent: clickMatch[1].trim(),
        elementType: 'button',
        confidence: 0.9
      });
      continue;
    }
    
    // Pattern 3: Select actions
    // "select [option] from [dropdown]"
    const selectMatch = trimmed.match(/(?:select|choose)\s+["']?([^"']+?)["']?\s+(?:from|in)\s+["']?([^"']+)["']?/i);
    
    if (selectMatch) {
      actions.push({
        type: 'select',
        intent: selectMatch[2].trim(),
        value: selectMatch[1].trim(),
        elementType: 'select',
        confidence: 0.8
      });
      continue;
    }
    
    // Pattern 4: Navigation
    const navMatch = trimmed.match(/(?:go\s+to|navigate\s+to|open|visit)\s+["']?([^"']+)["']?/i);
    
    if (navMatch) {
      actions.push({
        type: 'navigate',
        intent: navMatch[1].trim(),
        confidence: 0.95
      });
      continue;
    }
    
    // Pattern 5: Verification
    const verifyMatch = trimmed.match(/(?:verify|check|expect|assert)\s+["']?([^"']+)["']?/i);
    
    if (verifyMatch) {
      actions.push({
        type: 'verify',
        intent: verifyMatch[1].trim(),
        confidence: 0.7
      });
      continue;
    }
    
    // Fallback: Try to extract field names
    const fieldKeywords = ['username', 'password', 'email', 'name', 'phone', 'address'];
    for (const keyword of fieldKeywords) {
      if (trimmed.includes(keyword)) {
        actions.push({
          type: 'fill',
          intent: keyword,
          value: `test_${keyword}`,
          elementType: 'input',
          confidence: 0.6
        });
        break;
      }
    }
  }
  
  return actions;
}

/**
 * Extract test values from instructions
 */
export function extractTestValues(prompt: string): Record<string, string> {
  const values: Record<string, string> = {};
  
  // Extract quoted values: "fill username with 'john@example.com'"
  const quotedMatches = prompt.matchAll(/["']([^"']+)["']\s+with\s+["']([^"']+)["']/gi);
  for (const match of quotedMatches) {
    values[match[1].toLowerCase()] = match[2];
  }
  
  return values;
}
