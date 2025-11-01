import type { Page } from "playwright";
import { findElementByIntent, executeAction } from "./intelligentLocator";
import type { ParsedAction } from "./instructionParser";

export interface ExecutionResult {
  action: ParsedAction;
  success: boolean;
  selector: string;
  reasoning: string;
  confidence: number;
  duration: number;
  screenshot?: string;
}

/**
 * Execute a sequence of actions on a page
 */
export async function executeActionSequence(
  page: Page,
  actions: ParsedAction[]
): Promise<ExecutionResult[]> {
  const results: ExecutionResult[] = [];
  
  for (const action of actions) {
    const startTime = Date.now();
    let result: ExecutionResult;
    
    try {
      if (action.type === 'navigate') {
        // Navigate to URL
        await page.goto(action.intent, { waitUntil: 'networkidle', timeout: 30000 });
        result = {
          action,
          success: true,
          selector: action.intent,
          reasoning: `Navigated to ${action.intent}`,
          confidence: 1.0,
          duration: Date.now() - startTime
        };
      } else if (action.type === 'verify') {
        // Verify text exists
        const exists = await page.locator(`text="${action.intent}"`).count() > 0;
        result = {
          action,
          success: exists,
          selector: `text="${action.intent}"`,
          reasoning: exists ? `Found text: ${action.intent}` : `Text not found: ${action.intent}`,
          confidence: exists ? 1.0 : 0,
          duration: Date.now() - startTime
        };
      } else if (action.type === 'fill') {
        // Fill input field
        const execResult = await executeAction(page, 'fill', action.intent, action.value);
        result = {
          action,
          ...execResult,
          confidence: action.confidence,
          duration: Date.now() - startTime
        };
      } else if (action.type === 'click') {
        // Click element
        const execResult = await executeAction(page, 'click', action.intent);
        result = {
          action,
          ...execResult,
          confidence: action.confidence,
          duration: Date.now() - startTime
        };
      } else if (action.type === 'select') {
        // Select dropdown option
        const strategy = await findElementByIntent(page, action.intent, 'any');
        await page.locator(strategy.selector).first().selectOption(action.value || '');
        result = {
          action,
          success: true,
          selector: strategy.selector,
          reasoning: strategy.reasoning,
          confidence: strategy.confidence,
          duration: Date.now() - startTime
        };
      } else {
        result = {
          action,
          success: false,
          selector: '',
          reasoning: 'Unknown action type',
          confidence: 0,
          duration: Date.now() - startTime
        };
      }
    } catch (error) {
      result = {
        action,
        success: false,
        selector: '',
        reasoning: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        confidence: 0,
        duration: Date.now() - startTime
      };
    }
    
    results.push(result);
    
    // Stop on first failure
    if (!result.success) {
      console.warn(`[ExecutionEngine] Action failed, stopping: ${result.reasoning}`);
      break;
    }
    
    // Small delay between actions
    await page.waitForTimeout(500);
  }
  
  // Take final screenshot
  try {
    const screenshot = await page.screenshot({ type: 'png', fullPage: false });
    if (results.length > 0) {
      results[results.length - 1].screenshot = screenshot.toString('base64');
    }
  } catch (error) {
    console.warn('[ExecutionEngine] Screenshot failed:', error);
  }
  
  return results;
}
