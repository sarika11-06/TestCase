import { TestCase } from "./testcase-model";
import { generateForFrontend } from "./generator";

/**
 * Attach a click handler to a button so that when clicked it:
 * - obtains a TestCase via getTestCase()
 * - generates Playwright TS and XML
 * - writes results to two elements (tsOutputId and xmlOutputId)
 *
 * Usage example in browser:
 * attachGenerateButton(
 *   'generateBtn',
 *   () => yourTestCaseObject, // or getClonedExampleTestCase()
 *   'tsOutputTextarea',
 *   'xmlOutputTextarea'
 * );
 */
export function attachGenerateButton(
	buttonId: string,
	getTestCase: () => TestCase,
	tsOutputId: string,
	xmlOutputId: string
) {
	const btn = document.getElementById(buttonId);
	const tsEl = document.getElementById(tsOutputId) as HTMLTextAreaElement | HTMLElement | null;
	const xmlEl = document.getElementById(xmlOutputId) as HTMLTextAreaElement | HTMLElement | null;
	if (!btn) {
		console.warn(`attachGenerateButton: button "${buttonId}" not found`);
		return;
	}
	btn.addEventListener("click", () => {
		try {
			const tc = getTestCase();
			const { playwrightTs, xml } = generateForFrontend(tc);
			if (tsEl) {
				if ('value' in tsEl) (tsEl as HTMLTextAreaElement).value = playwrightTs;
				else tsEl.textContent = playwrightTs;
			}
			if (xmlEl) {
				if ('value' in xmlEl) (xmlEl as HTMLTextAreaElement).value = xml;
				else xmlEl.textContent = xml;
			}
		} catch (err) {
			console.error("Error generating test case:", err);
		}
	});
}
