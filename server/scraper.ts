import type { WebsiteAnalysis } from "@shared/schema";
import { saveXPathData, type StoredXPathData } from "./xpathStorage";

export async function analyzeWebsite(url: string): Promise<WebsiteAnalysis> {
  const { chromium } = await import("playwright");
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  page.on('console', (msg) => {
    try {
      const args = msg.args?.map(a => {
        try { return a.toString(); } catch { return '<unserializable>'; }
      }) || [];
      console.log(`[Browser console][${msg.type()}]`, msg.text(), ...args);
    } catch {
      console.log('[Browser console] (unserializable message)');
    }
  });

  page.on('pageerror', (err) => {
    console.error('[Browser pageerror]', err?.message || err);
  });

  let allInteractive: any[] = [];
  let title = "";

  try {
    await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(800);
    title = await page.title();

    // Use string-based evaluate to completely bypass TypeScript transpiler
    const selector = 'input, button, a, textarea, select, [role], [aria-label], [placeholder]';
    
    allInteractive = await page.evaluate(`
      (function() {
        var elements = document.querySelectorAll('${selector.replace(/'/g, "\\'")}');
        var results = [];
        
        for (var i = 0; i < elements.length; i++) {
          var el = elements[i];
          
          // Helper: build absolute XPath
          function getXPath(node) {
            if (node.id) return '//' + node.tagName.toLowerCase() + '[@id="' + node.id + '"]';
            
            var segments = [];
            var current = node;
            
            while (current && current.nodeType === 1) {
              var tagName = current.tagName.toLowerCase();
              var index = 1;
              var sibling = current.previousElementSibling;
              
              while (sibling) {
                if (sibling.tagName === current.tagName) index++;
                sibling = sibling.previousElementSibling;
              }
              
              var part = index > 1 ? tagName + '[' + index + ']' : tagName;
              segments.unshift(part);
              current = current.parentElement;
            }
            
            return '/' + segments.join('/');
          }
          
          var tag = el.tagName.toLowerCase();
          var type = el.type || '';
          var id = el.id || '';
          var name = el.getAttribute('name') || '';
          var textContent = (el.textContent || el.value || '').trim();
          var ariaLabel = el.getAttribute('aria-label') || '';
          var role = el.getAttribute('role') || '';
          var placeholder = el.getAttribute('placeholder') || '';
          
          // Build friendly name
          var friendlyName = '';
          if (id) {
            var lab = document.querySelector('label[for="' + id + '"]');
            if (lab && lab.textContent) friendlyName = lab.textContent.trim();
          }
          if (!friendlyName && el.getAttribute('aria-labelledby')) {
            var labelledBy = el.getAttribute('aria-labelledby');
            var ids = labelledBy.split(/\\s+/);
            for (var j = 0; j < ids.length; j++) {
              var lbl = document.getElementById(ids[j]);
              if (lbl && lbl.textContent) {
                friendlyName += (friendlyName ? ' ' : '') + lbl.textContent.trim();
              }
            }
          }
          if (!friendlyName) {
            var p = el.parentElement;
            while (p) {
              if (p.tagName && p.tagName.toLowerCase() === 'label' && p.textContent) {
                friendlyName = p.textContent.trim();
                break;
              }
              p = p.parentElement;
            }
          }
          if (!friendlyName && el.previousElementSibling && el.previousElementSibling.textContent) {
            friendlyName = el.previousElementSibling.textContent.trim();
          }
          if (!friendlyName) friendlyName = placeholder || ariaLabel;
          
          var xpath = getXPath(el);
          
          // Build XPath candidates
          var candidates = [];
          if (id) candidates.push('//' + tag + '[@id="' + id + '"]');
          if (name) candidates.push('//' + tag + '[@name="' + name + '"]');
          if (ariaLabel) candidates.push('//' + tag + '[@aria-label="' + ariaLabel + '"]');
          if (placeholder) candidates.push('//' + tag + '[@placeholder="' + placeholder + '"]');
          if (textContent) {
            var short = textContent.length > 200 ? textContent.slice(0, 200) : textContent;
            candidates.push('//' + tag + '[normalize-space()="' + short + '"]');
            candidates.push('//' + tag + '[contains(normalize-space(.), "' + short + '")]');
          }
          if (xpath) candidates.push(xpath);
          
          // Dedupe
          var uniq = [];
          var seen = {};
          for (var k = 0; k < candidates.length; k++) {
            if (!seen[candidates[k]]) {
              seen[candidates[k]] = true;
              uniq.push(candidates[k]);
            }
          }
          
          var selectors = [];
          if (id) selectors.push('#' + id);
          if (name) selectors.push('[name="' + name + '"]');
          if (ariaLabel) selectors.push('[aria-label="' + ariaLabel + '"]');
          if (placeholder) selectors.push('[placeholder="' + placeholder + '"]');
          if (tag) selectors.push(tag);
          
          results.push({
            tag: tag,
            type: type,
            id: id,
            name: name,
            text: textContent,
            ariaLabel: ariaLabel,
            role: role,
            placeholder: placeholder,
            friendlyName: friendlyName.trim(),
            selectors: selectors,
            xpath: xpath,
            xpathCandidates: uniq
          });
        }
        
        return results;
      })()
    `);

    console.log(`[Scraper] Successfully extracted ${allInteractive.length} elements`);

    // Persist
    const stored: StoredXPathData = {
      url,
      scrapedAt: new Date().toISOString(),
      forms: [],
      buttons: allInteractive.filter(e => ['button', 'input'].includes(e.tag)).map(e => ({
        text: e.text,
        selectors: e.selectors,
        ariaLabel: e.ariaLabel,
        role: e.role,
        xpath: e.xpath,
        xpathCandidates: e.xpathCandidates
      })),
      links: allInteractive.filter(e => e.tag === 'a').map(e => ({
        text: e.text,
        href: '',
        selectors: e.selectors,
        ariaLabel: e.ariaLabel,
        xpath: e.xpath,
        xpathCandidates: e.xpathCandidates
      })),
      allInteractive: allInteractive.map(e => ({
        text: e.text,
        tag: e.tag,
        type: e.type,
        selectors: e.selectors,
        matchScore: 0,
        xpath: e.xpath,
        xpathCandidates: e.xpathCandidates
      }))
    };

    saveXPathData(url, stored);
    console.log('[Scraper] Saved XPath data:', allInteractive.length, 'elements');

    return { url, title, allInteractive } as WebsiteAnalysis;
  } catch (e: any) {
    console.error('[Scraper] Error:', e?.stack || e?.message || e);
    throw new Error('[Scraper] extraction error: ' + (e?.message || e));
  } finally {
    try {
      await browser.close();
    } catch (closeErr) {
      // ignore
    }
  }
}
