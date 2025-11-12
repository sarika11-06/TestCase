import { TestCase } from "./testcase-model";

/** Escape XML special chars in attribute values */
function escapeXmlAttr(s?: string): string {
	if (s === undefined || s === null) return "";
	return String(s)
		.replace(/&/g, "&amp;")
		.replace(/"/g, "&quot;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;");
}

export function generateXML(tc: TestCase): string {
	const header = '<?xml version="1.0" encoding="UTF-8"?>';
	const attrs = `id="${escapeXmlAttr(tc.id)}" name="${escapeXmlAttr(tc.name)}"${tc.desc ? ` desc="${escapeXmlAttr(tc.desc)}"` : ""}`;
	
	const stepsXml = tc.steps.map((s) => {
		const parts = [
			`id="${escapeXmlAttr(s.id)}"`,
			`Page="${escapeXmlAttr(s.Page)}"`,
			`Action="${escapeXmlAttr(s.Action)}"`,
			s.Element ? `Element="${escapeXmlAttr(s.Element)}"` : undefined,
			s.Data ? `Data="${escapeXmlAttr(s.Data)}"` : undefined,
			s.Expected ? `Expected="${escapeXmlAttr(s.Expected)}"` : undefined,
		].filter(Boolean).join("\n        ");
		
		return `    <Step \n        ${parts}\n    />`;
	}).join("\n\n");
	
	return `${header}\n<TestCases ${attrs}>\n\n${stepsXml}\n\n</TestCases>\n`;
}

function escapeJsString(s?: string): string {
	if (s === undefined || s === null) return "";
	return String(s)
		.replace(/\\/g, "\\\\")
		.replace(/"/g, '\\"')
		.replace(/\n/g, "\\n");
}

export function generatePlaywrightTS(tc: TestCase): string {
	const uniqueElements = Array.from(
		new Set(tc.steps.map(s => s.Element).filter(Boolean))
	);
	
	const selectorsBlock = uniqueElements
		.map(e => `    ${e}: '<your-selector-here>'`)
		.join(",\n");
	
	const stepsCode = tc.steps.map((s) => {
		const action = (s.Action || "").toLowerCase();
		switch (action) {
			case "entertext":
				return `    await page.fill(selectors.${s.Element}, "${escapeJsString(s.Data)}"); // ${escapeJsString(s.Expected)}`;
			case "click":
				return `    await page.click(selectors.${s.Element}); // ${escapeJsString(s.Expected)}`;
			case "verifytext":
			case "verify":
				return `    await expect(page.locator(selectors.${s.Element})).toHaveText("${escapeJsString(s.Expected)}");`;
			default:
				return `    // Unhandled action: ${s.Action} on ${s.Element}`;
		}
	}).join("\n");

	return `import { test, expect } from '@playwright/test';

// Test case: ${tc.id} - ${tc.name}
// ${tc.desc || ""}

const selectors = {
${selectorsBlock}
};

test('${tc.id} - ${tc.name}', async ({ page }) => {
    // ...navigate to starting page...
    // await page.goto('http://yourapp');

${stepsCode}

});
`;
}

/**
 * Frontend-friendly generator: returns both TypeScript and XML strings
 * for immediate display or download in the browser.
 */
export function generateForFrontend(tc: TestCase): { playwrightTs: string; xml: string } {
	return {
		playwrightTs: generatePlaywrightTS(tc),
		xml: generateXML(tc)
	};
}