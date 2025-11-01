import { randomUUID } from "crypto";
import type { WebsiteAnalysis, TestCase, TestCaseGenerationResponse } from "@shared/schema";
import { matchPromptToElements, type MatchedElement } from "./promptMatcher";

function xpathLiteral(s: string) {
	// produce a safe XPath literal (use double quotes if single quotes exist)
	if (s.includes("'") && s.includes('"')) {
		// fallback: build concat('a', "'", "b", '"', 'c')
		const parts: string[] = [];
		for (const chunk of s.split("'")) {
			parts.push(`'${chunk}'`);
			parts.push(`"'"`);
		}
		// remove last inserted extra
		parts.pop();
		return `concat(${parts.join(",")})`;
	}
	if (s.includes("'")) return `"${s}"`;
	return `'${s}'`;
}

// New helper: synthesize a reasonable XPath when el.xpath is missing
function synthesizeXPath(el: any): string {
	// prefer id/name/aria/placeholder then tag-based fallbacks
	if (!el) return "//*";
	const tag = el.tag || '*';
	if (el.id) return `//${tag}[@id=${xpathLiteral(el.id)}]`;
	if (el.name) return `//${tag}[@name=${xpathLiteral(el.name)}]`;
	if (el.ariaLabel) return `//${tag}[@aria-label=${xpathLiteral(el.ariaLabel)}]`;
	if (el.placeholder) return `//${tag}[@placeholder=${xpathLiteral(el.placeholder)}]`;
	// if selectors contain [name=...] or #id try to convert
	if (Array.isArray(el.selectors) && el.selectors.length > 0) {
		for (const s of el.selectors) {
			if (typeof s === 'string') {
				const mId = s.match(/^#(.+)$/);
				if (mId) return `//${tag}[@id=${xpathLiteral(mId[1])}]`;
				const mName = s.match(/^\[name=['"]?(.+?)['"]?\]$/);
				if (mName) return `//${tag}[@name=${xpathLiteral(mName[1])}]`;
				const mAria = s.match(/^\[aria-label=['"]?(.+?)['"]?\]$/);
				if (mAria) return `//${tag}[@aria-label=${xpathLiteral(mAria[1])}]`;
			}
		}
	}
	// text fallback (exact/contains)
	if (el.text && String(el.text).trim()) {
		const txt = String(el.text).trim().slice(0, 200);
		return `//${tag}[contains(normalize-space(.), ${xpathLiteral(txt)})]`;
	}
	// last resort: positional fallback
	return `//${tag}[1]`;
}

function buildSelectorCandidates(fieldName: string) {
  const safe = (t: string) => t.replace(/["']/g, "");
  const n = safe(fieldName.toLowerCase().trim());
  // CSS/text-based candidates first (preferred), then XPath fallbacks
  const cssCandidates = [
    `[name="${n}"]`,
    `[id*="${n}"]`,
    `[data-testid*="${n}"]`,
    `label:has-text("${fieldName}") >> input`,
    `text=${fieldName}`,
    `input[name="${n}"]`,
    `input[id*="${n}"]`,
  ];

  const xpathCandidates = [
    `xpath=//input[@name=${xpathLiteral(n)}]`,
    `xpath=//input[contains(@id, ${xpathLiteral(n)})]`,
    `xpath=//input[contains(translate(@placeholder,'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'), ${xpathLiteral(n)})]`,
    `xpath=//label[contains(normalize-space(.), ${xpathLiteral(fieldName)})]/following::input[1]`,
    `xpath=//textarea[@name=${xpathLiteral(n)}]`,
    `xpath=//select[@name=${xpathLiteral(n)}]`,
  ];

  return [...cssCandidates, ...xpathCandidates];
}

function generatePlaywrightForSteps(analysis: WebsiteAnalysis, tc: TestCase, wrap = true) {
  // Use provided playwrightCode if available and wrap behavior requested
  if (tc.playwrightCode && wrap) return tc.playwrightCode;
  const lines: string[] = [];

  // If wrapping, include imports and test wrapper; otherwise only include inner actions
  if (wrap) {
    lines.push(`import { test, expect } from '@playwright/test';`);
    lines.push(``);
    lines.push(`test(${JSON.stringify(tc.title)}, async ({ page }) => {`);
    lines.push(`  // Navigate to the site`);
    lines.push(`  await page.goto(${JSON.stringify(analysis.url)});`);
    lines.push(``);
  } else {
    // inner body: just navigation line first (without duplicate import)
    lines.push(`  // Test: ${tc.title}`);
    lines.push(`  // Navigate to the site`);
    lines.push(`  await page.goto(${JSON.stringify(analysis.url)});`);
    lines.push(``);
  }

  // Try to interpret steps into Playwright actions heuristically
  tc.steps.slice(0, 50).forEach((step, idx) => {
    const s = step.toLowerCase();
    if (s.includes("navigate") || s.includes("open") || s.includes("go to")) {
      // already handled by goto
    } else if (s.includes("click") || s.includes("press") || s.includes("select")) {
      const match = step.match(/click\s+(?:on\s+)?["']?([^"']+)["']?/i) || step.match(/click\s+(.*)/i);
      const target = match ? match[1].trim() : undefined;

      if (target) {
        // build candidates for button/link by text and XPath
        const btnCandidates = [
          `text=${target}`,
          `xpath=//button[normalize-space()=${xpathLiteral(target)}]`,
          `xpath=//a[normalize-space()=${xpathLiteral(target)}]`,
          `xpath=//input[(translate(@value,'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz')=${xpathLiteral(target.toLowerCase())}) and (@type="submit" or @type="button")]`,
          `xpath=//*[contains(normalize-space(.), ${xpathLiteral(target)}) and (self::button or self::a or @role="button")]`,
        ];
        lines.push(`  // Click "${target}" - try selectors in order`);
        lines.push(`  {`);
        lines.push(`    const candidates = ${JSON.stringify(btnCandidates)};`);
        lines.push(`    let clicked = false;`);
        lines.push(`    for (const sel of candidates) {`);
        lines.push(`      try {`);
        lines.push(`        const el = page.locator(sel).first();`);
        lines.push(`        if (await el.count() > 0) { await el.click(); clicked = true; break; }`);
        lines.push(`      } catch (e) { /* try next */ }`);
        lines.push(`    }`);
        lines.push(`    if (!clicked) { /* fallback: click first actionable element */`);
        lines.push(`      const cta = page.locator('a, button').first();`);
        lines.push(`      if (await cta.count() > 0) await cta.click();`);
        lines.push(`    }`);
        lines.push(`  }`);
      } else {
        lines.push(`  // Click: ${JSON.stringify(step)}`);
        lines.push(`  const cta = page.locator('a, button').first();`);
        lines.push(`  if (await cta.count() > 0) await cta.click();`);
      }
    } else if (s.includes("enter") || s.includes("type") || s.includes("fill")) {
      const m = step.match(/(?:enter|type|fill)\s+["']?([^"']+)["']?\s+(?:into|in|to)?\s*["']?([^"']+)["']?/i) ||
                step.match(/(?:enter|type|fill)\s+(.*)\s+into\s+(.*)/i);
      if (m) {
        const value = m[1].trim();
        const target = m[2].trim();
        const candidates = buildSelectorCandidates(target);
        lines.push(`  // Fill ${JSON.stringify(target)} with ${JSON.stringify(value)} - try selectors in order`);
        lines.push(`  {`);
        lines.push(`    const candidates = ${JSON.stringify(candidates)};`);
        lines.push(`    let filled = false;`);
        lines.push(`    for (const sel of candidates) {`);
        lines.push(`      try {`);
        lines.push(`        const el = page.locator(sel).first();`);
        lines.push(`        if (await el.count() > 0) { await el.fill(${JSON.stringify(value)}); filled = true; break; }`);
        lines.push(`      } catch (e) { /* try next */ }`);
        lines.push(`    }`);
        lines.push(`    if (!filled) {`);
        lines.push(`      // as a last resort try to type into the first input`);
        lines.push(`      const fallback = page.locator('input, textarea, [contenteditable]').first();`);
        lines.push(`      if (await fallback.count() > 0) await fallback.fill(${JSON.stringify(value)});`);
        lines.push(`    }`);
        lines.push(`  }`);
      } else {
        lines.push(`  // Step [${idx}]: ${JSON.stringify(step)}`);
      }
    } else if (s.includes("submit")) {
      lines.push(`  // Submit first form`);
      lines.push(`  await page.locator('form').first().evaluate(f => (f as HTMLFormElement).submit());`);
    } else if (s.includes("expect") || s.includes("verify") || s.includes("check") || s.includes("should")) {
      const match = step.match(/(?:verify|expect|check|should)\s+(?:that\s+)?(?:the\s+)?(.*)/i);
      const target = match ? match[1].trim() : step;
      lines.push(`  // Assertion: ${JSON.stringify(target)}`);
      lines.push(`  await expect(page.locator('body')).toContainText(${JSON.stringify(target)});`);
    } else {
      lines.push(`  // Unparsed instruction: ${JSON.stringify(step)}`);
    }
  });

  // Visual snapshot if requested
  const descLower = (tc.description || "").toLowerCase();
  if (descLower.includes("visual") || descLower.includes("screenshot") || descLower.includes("layout") || descLower.includes("render")) {
    lines.push(``);
    lines.push(`  // Visual check: take screenshot for visual validation`);
    lines.push(`  const screenshot = await page.screenshot({ fullPage: true });`);
    lines.push(`  // TODO: Compare screenshot to baseline`);
  }

  if (wrap) {
    lines.push(`});`);
    return lines.join("\n");
  } else {
    // inner body returned as string (no closing wrapper)
    return lines.join("\n");
  }
}

function generateFallbackTestCases(analysis: WebsiteAnalysis, userPrompt: string): TestCaseGenerationResponse {
  const baseUrl = analysis.url;
  const testCases: TestCase[] = [];

  // Simple site load test
  testCases.push({
    id: randomUUID(),
    title: "Load site and check basic render",
    description: `Verify ${baseUrl} loads and main content is visible`,
    type: "UI",
    priority: "High",
    steps: ["Navigate to the homepage", "Wait for main content to be visible"],
    expectedResult: "Homepage loads without errors and main content is visible",
    playwrightCode: `import { test, expect } from '@playwright/test';

test('homepage loads', async ({ page }) => {
  await page.goto('${baseUrl}');
  await expect(page).toHaveURL(/${baseUrl.replace(/[:\/.]/g, '\\$&')}/);
  await expect(page.locator('body')).toBeVisible();
});`,
  });

  // Navigation test
  testCases.push({
    id: randomUUID(),
    title: "Primary navigation sanity",
    description: "Click a handful of primary links and confirm pages load",
    type: "E2E",
    priority: "Medium",
    steps: ["Open homepage", "Click first 3 site links", "Verify target pages load (status and title)"],
    expectedResult: "Primary links navigate to reachable pages",
    playwrightCode: `import { test, expect } from '@playwright/test';

test('navigation links', async ({ page }) => {
  await page.goto('${baseUrl}');
  const links = await page.$$eval('a[href^="http"], a[href^="/"]', els => els.slice(0,5).map(a => (a as HTMLAnchorElement).href));
  for (const href of links) {
    if (!href) continue;
    await page.goto(href);
    await expect(page).not.toHaveURL(/about:blank/);
  }
});`,
  });

  // Derive form tests if forms are present
  if (analysis.forms && analysis.forms.length > 0) {
    analysis.forms.forEach((form) => {
      // normalize field names
      const fieldNames = (form.fields || []).map((f: any) => (typeof f === "string" ? f : f.name));
      testCases.push({
        id: randomUUID(),
        title: `Form validation: ${form.name}`,
        description: `Validate required fields and basic submit for form "${form.name}"`,
        type: "UI",
        priority: "High",
        steps: [
          `Navigate to ${baseUrl}`,
          `Locate form "${form.name}" and try to submit empty`,
          `Verify validation messages for fields: ${fieldNames.join(", ")}`,
        ],
        expectedResult: `Form "${form.name}" shows validation errors and prevents empty submission`,
        playwrightCode: `import { test, expect } from '@playwright/test';

test('form validation - ${form.name}', async ({ page }) => {
  await page.goto('${baseUrl}');
  const form = page.locator('form').first();
  await form.locator('button[type="submit"]').click().catch(() => {});
  ${fieldNames.map((f: string) => `await expect(page.locator('[name="${f}"], [id*="${f}"], [data-testid*="${f}"], label:has-text("${f}")')).toBeTruthy();`).join("\n  ")}
});`,
      });
    });
  }

  // Add a sample user flow based on prompt
  testCases.push({
    id: randomUUID(),
    title: "Representative user flow from prompt",
    description: `Representative flow derived from prompt: "${userPrompt}"`,
    type: "E2E",
    priority: "Medium",
    steps: ["Open homepage", "Perform typical user actions described in the prompt (CTA, login attempt, navigation)"],
    expectedResult: "Representative flow completes without fatal errors",
    playwrightCode: `import { test, expect } from '@playwright/test';

test('representative user flow', async ({ page }) => {
  await page.goto('${baseUrl}');
  const cta = page.locator('a, button').filter({ hasText: /get started|sign up|login|submit/i }).first();
  if (await cta.count() > 0) await cta.click();
  // assertions should be customized per app
  await expect(page).toHaveURL(/${baseUrl.replace(/[:\/.]/g, '\\$&')}/);
});`,
  });

  // Summary
  const byType: Record<string, number> = {};
  testCases.forEach(tc => (byType[tc.type] = (byType[tc.type] || 0) + 1));

  return {
    analysis,
    testCases,
    summary: {
      totalTests: testCases.length,
      byType,
      coverageAreas: Object.keys(byType),
    },
  };
}

/**
 * Build Playwright code using stored XPaths
 */
function generatePlaywrightCodeWithXPaths(
  analysis: WebsiteAnalysis | StoredXPathData,
  steps: string[],
  testTitle: string
): string {
  const lines: string[] = [];
  
  lines.push(`import { test, expect } from '@playwright/test';`);
  lines.push(``);
  lines.push(`test('${testTitle}', async ({ page }) => {`);
  lines.push(`  // Navigate to the site`);
  lines.push(`  await page.goto('${analysis.url}');`);
  lines.push(`  await page.waitForLoadState('networkidle');`);
  lines.push(``);

  for (const step of steps) {
    const stepLower = step.toLowerCase();

    // Fill branch: normalize field selectors
    const fillMatch = step.match(/(?:fill|enter|type)\s+["']?([^"']+)["']?\s+(?:with\s+)?["']?([^"']+)["']?/i);
    if (fillMatch) {
      const fieldName = fillMatch[1]?.trim() || "";
      const value = fillMatch[2]?.trim() || (fieldName.toLowerCase().includes("pass") ? "TestPassword123!" : "test@example.com");
      const fieldSel = getFieldSelectors(analysis, fieldName);

      lines.push(`  // Fill field: ${fieldName}`);
      lines.push(`  { let filled = false;`);
      if (fieldSel.css.length) {
        lines.push(`    for (const sel of ${JSON.stringify(fieldSel.css)}) { try { const el = page.locator(sel).first(); if (await el.count() > 0) { await el.fill(${JSON.stringify(value)}); filled = true; break; } } catch {} }`);
      }
      if (!fieldSel.css.length && !fieldSel.xpaths.length) {
        // heuristic candidates
        const candidates = buildSelectorCandidates(fieldName);
        lines.push(`    if (!filled) for (const sel of ${JSON.stringify(candidates)}) { try { const el = page.locator(sel).first(); if (await el.count() > 0) { await el.fill(${JSON.stringify(value)}); filled = true; break; } } catch {} }`);
      } else if (fieldSel.xpaths.length) {
        lines.push(`    if (!filled) for (const xp of ${JSON.stringify(fieldSel.xpaths)}) { try { const el = page.locator(\`xpath=\${xp}\`).first(); if (await el.count() > 0) { await el.fill(${JSON.stringify(value)}); filled = true; break; } } catch {} }`);
      }
      lines.push(`    if (!filled) throw new Error('Failed to fill field: ${fieldName}'); }`);
      lines.push(``);
      continue;
    }

    // Click branch: normalize button selectors
    const clickMatch = step.match(/click\s+["']?([^"']+)["']?/i);
    if (clickMatch) {
      const buttonText = clickMatch[1]?.trim() || "Login";
      const btnSel = getButtonSelectors(analysis, buttonText);

      lines.push(`  // Click button: ${buttonText}`);
      lines.push(`  { let clicked = false;`);
      if (btnSel.css.length) {
        lines.push(`    for (const sel of ${JSON.stringify(btnSel.css)}) { try { const el = page.locator(sel).first(); if (await el.count() > 0) { await el.click(); clicked = true; break; } } catch {} }`);
      }
      if (btnSel.xpaths.length) {
        lines.push(`    if (!clicked) for (const xp of ${JSON.stringify(btnSel.xpaths)}) { try { const el = page.locator(\`xpath=\${xp}\`).first(); if (await el.count() > 0) { await el.click(); clicked = true; break; } } catch {} }`);
      }
      if (!btnSel.css.length && !btnSel.xpaths.length) {
        lines.push(`    if (!clicked) for (const sel of ${JSON.stringify(buildTextBasedButtonCandidates(buttonText))}) { try { const el = page.locator(sel).first(); if (await el.count() > 0) { await el.click(); clicked = true; break; } } catch {} }`);
      }
      lines.push(`    if (!clicked) throw new Error('Failed to click button: ${buttonText}'); }`);
      lines.push(`  await page.waitForLoadState('networkidle');`);
      lines.push(``);
      continue;
    }

    // Parse verification steps
    if (stepLower.includes('verify') || stepLower.includes('check') || stepLower.includes('expect')) {
      const textMatch = step.match(/(?:verify|check|expect)\s+(?:that\s+)?["']?([^"']+)["']?/i);
      const text = textMatch ? textMatch[1]?.trim() : 'dashboard';
      lines.push(`  // Verify: ${text}`);
      lines.push(`  await expect(page.locator('body')).toContainText('${text}', { timeout: 5000 });`);
      lines.push(``);
      continue;
    }

    // Generic step comment
    lines.push(`  // ${step}`);
    lines.push(`  await page.waitForTimeout(500);`);
    lines.push(``);
  }

  lines.push(`  // Take screenshot of final state`);
  lines.push(`  await page.screenshot({ path: 'test-result.png', fullPage: true });`);
  lines.push(`});`);

  return lines.join('\n');
}

function interpretUserPromptToSteps(userPrompt: string, analysis: WebsiteAnalysis | StoredXPathData) {
  const steps: string[] = ["Navigate to the homepage"];
  
  let usernameField: string | undefined;
  let passwordField: string | undefined;
  let loginButton: string | undefined;

  // Find username/password fields from scraped forms
  if ('forms' in analysis && Array.isArray(analysis.forms)) {
    for (const form of analysis.forms) {
      for (const field of form.fields) {
        const fname = (field.name || "").toLowerCase();
        if (!usernameField && (fname.includes("user") || fname.includes("email") || fname.includes("login"))) {
          usernameField = field.name;
        }
        if (!passwordField && fname.includes("pass")) {
          passwordField = field.name;
        }
      }
    }
  }

  // Find login button from scraped buttons
  const buttons = ((analysis as any).buttonsWithSelectors || (analysis as any).buttons || []);
  for (const btn of buttons) {
    const text = typeof btn === 'string' ? btn : (btn.text || "");
    if (/login|sign.?in/i.test(text)) {
      loginButton = text;
      break;
    }
  }

  if (usernameField) steps.push(`Fill "${usernameField}" with "testuser@example.com"`);
  if (passwordField) steps.push(`Fill "${passwordField}" with "TestPassword123!"`);
  if (loginButton) steps.push(`Click "${loginButton}"`);
  steps.push("Verify successful navigation or dashboard visible");

  return { steps, meta: { usernameField, passwordField, loginButton } };
}

export async function generateTestCases(
  analysis: WebsiteAnalysis,
  userPrompt: string
): Promise<TestCaseGenerationResponse> {
  console.log(`[TestGen] Prompt: "${userPrompt}"`);
  console.log(`[TestGen] Elements: ${analysis.allInteractive?.length || 0}`);
  
  if (!analysis.allInteractive || analysis.allInteractive.length === 0) {
    console.error('[TestGen] No elements found!');
    throw new Error('No interactive elements found on page');
  }
  
  const matches = matchPromptToElements(userPrompt, analysis);
  
  const steps: string[] = [];
  
  for (const match of matches.fields) {
    const el = match.element;
    const fieldName = el.placeholder || el.name || el.text || 'field';
    // ensure xpath exists (use synthesized if necessary)
    const xpath = el.xpath || synthesizeXPath(el);
    if (!el.xpath) console.warn(`[TestGen] Synthesized xpath for field "${fieldName}": ${xpath}`);
    steps.push(`Fill "${fieldName}" with test data`);
    console.log(`[TestGen] Field: ${fieldName} → ${xpath}`);
    // attach synthesized xpath back onto element so later code generation can use it
    (el as any).xpath = xpath;
  }
  
  for (const match of matches.buttons) {
    const el = match.element;
    const buttonText = el.text || el.name || 'button';
    const xpath = el.xpath || synthesizeXPath(el);
    if (!el.xpath) console.warn(`[TestGen] Synthesized xpath for button "${buttonText}": ${xpath}`);
    steps.push(`Click "${buttonText}"`);
    console.log(`[TestGen] Button: ${buttonText} → ${xpath}`);
    (el as any).xpath = xpath;
  }
  
  steps.push("Verify successful action");
  
  const playwrightCode = generatePlaywrightCodeFromMatches(analysis.url, matches, steps);
  
  const testCase: TestCase = {
    id: randomUUID(),
    title: `Test - ${userPrompt.substring(0, 50)}`,
    description: `Generated from: "${userPrompt}"`,
    type: "E2E",
    priority: "High",
    steps,
    expectedResult: "All steps succeed",
    playwrightCode,
  };
  
  return {
    analysis,
    testCases: [testCase],
    summary: {
      totalTests: 1,
      byType: { E2E: 1 },
      coverageAreas: ["User Flow"],
    },
  };
}

function generatePlaywrightCodeFromMatches(
  url: string,
  matches: { fields: MatchedElement[]; buttons: MatchedElement[] },
  steps: string[]
): string {
  const lines: string[] = [];
  
  lines.push(`import { test, expect } from '@playwright/test';`);
  lines.push(``);
  lines.push(`test('Generated Test', async ({ page }) => {`);
  lines.push(`  await page.goto('${url}');`);
  lines.push(`  await page.waitForLoadState('networkidle');`);
  lines.push(``);
  
  for (const match of matches.fields) {
    const el = match.element;
    const fieldName = el.placeholder || el.name || el.text;
    // prefer actual xpath, synthesize if missing (should already be set above)
    const xpath = el.xpath || synthesizeXPath(el);
    const value = fieldName.toLowerCase().includes('pass') ? 'TestPassword123!' : 'testuser@example.com';
    
    lines.push(`  // Fill: ${fieldName}`);
    lines.push(`  await page.locator('xpath=${xpath}').fill('${value}');`);
    lines.push(``);
  }
  
  for (const match of matches.buttons) {
    const el = match.element;
    const buttonText = el.text || el.name;
    const xpath = el.xpath || synthesizeXPath(el);
    
    lines.push(`  // Click: ${buttonText}`);
    lines.push(`  await page.locator('xpath=${xpath}').click();`);
    lines.push(`  await page.waitForLoadState('networkidle');`);
    lines.push(``);
  }
  
  lines.push(`  await expect(page).toHaveURL(/./);`);
  lines.push(`});`);
  
  return lines.join('\n');
}

function getFieldSelectors(
  analysis: WebsiteAnalysis | StoredXPathData,
  fieldName: string
): { css: string[]; xpaths: string[] } {
  const css: string[] = [];
  const xpaths: string[] = [];
  const nl = (fieldName || "").toLowerCase();

  if ('forms' in analysis && Array.isArray(analysis.forms)) {
    for (const form of analysis.forms) {
      for (const f of form.fields) {
        const fname = (f.name || "").toLowerCase();
        const match =
          fname.includes(nl) ||
          nl.includes(fname) ||
          (nl.includes("user") && (fname.includes("user") || fname.includes("email"))) ||
          (nl.includes("pass") && fname.includes("pass"));
        if (match) {
          // Add all available selectors
          if (Array.isArray(f.css)) css.push(...f.css);
          if (Array.isArray(f.xpaths)) xpaths.push(...f.xpaths);
          if (Array.isArray(f.selectors)) css.push(...f.selectors);
          // Add single selector fields if arrays are empty
          if (f.xpath && !xpaths.includes(f.xpath)) xpaths.push(f.xpath);
          if (f.cssSelector && !css.includes(f.cssSelector)) css.push(f.cssSelector);
        }
      }
    }
  }
  // Debug log
  if (css.length === 0 && xpaths.length === 0) {
    console.warn(`[getFieldSelectors] No selectors found for field "${fieldName}".`);
  }
  return { css: Array.from(new Set(css)), xpaths: Array.from(new Set(xpaths)) };
}

function getButtonSelectors(
  analysis: WebsiteAnalysis | StoredXPathData,
  buttonText: string
): { css: string[]; xpaths: string[] } {
  const css: string[] = [];
  const xpaths: string[] = [];
  const tl = (buttonText || "").toLowerCase();

  const scan = (arr: any[] | undefined) => {
    if (!Array.isArray(arr)) return;
    for (const item of arr) {
      if (item && typeof item === "object" && "text" in item) {
        const t = String((item as any).text || "").toLowerCase();
        if (t.includes(tl) || tl.includes(t)) {
          if (Array.isArray((item as any).css)) css.push(...(item as any).css);
          if (Array.isArray((item as any).xpaths)) xpaths.push(...(item as any).xpaths);
          if (Array.isArray((item as any).selectors)) css.push(...(item as any).selectors);
          if ((item as any).xpath && !xpaths.includes((item as any).xpath)) xpaths.push((item as any).xpath);
          if ((item as any).cssSelector && !css.includes((item as any).cssSelector)) css.push((item as any).cssSelector);
        }
      }
    }
  };

  scan((analysis as any).buttonsWithSelectors);
  scan((analysis as any).buttons);

  // Debug log
  if (css.length === 0 && xpaths.length === 0) {
    console.warn(`[getButtonSelectors] No selectors found for button "${buttonText}".`);
  }
  return { css: Array.from(new Set(css)), xpaths: Array.from(new Set(xpaths)) };
}

function buildTextBasedButtonCandidates(text: string): string[] {
  return [
    `text=${text}`,
    `xpath=//button[normalize-space()=${xpathLiteral(text)}]`,
    `xpath=//a[normalize-space()=${xpathLiteral(text)}]`,
    `xpath=//input[(translate(@value,'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz')=${xpathLiteral(text.toLowerCase())}) and (@type="submit" or @type="button")]`,
    `xpath=//*[contains(normalize-space(.), ${xpathLiteral(text)}) and (self::button or self::a or @role="button")]`,
  ];
}

export function makePlaywrightTestFile(
  analysis: WebsiteAnalysis,
  testCases: TestCase[]
): string {
  const lines: string[] = [];
  lines.push(`import { test, expect } from '@playwright/test';`);
  lines.push(``);
  lines.push(`// Generated test file for ${analysis.url}`);
  lines.push(`// Generated at: ${new Date().toISOString()}`);
  lines.push(``);

  for (const tc of testCases) {
    if (tc.playwrightCode) {
      // Remove import if already present in individual test
      const code = tc.playwrightCode.replace(/^import.*?;\s*/gm, '');
      lines.push(code);
      lines.push(``);
    }
  }

  return lines.join('\n');
}
