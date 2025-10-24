import axios from "axios";
import * as cheerio from "cheerio";
import type { WebsiteAnalysis } from "@shared/schema";

export async function analyzeWebsite(url: string): Promise<WebsiteAnalysis> {
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 10000,
    });

    const html = response.data;
    const $ = cheerio.load(html);

    // Extract page title
    const title = $('title').text().trim() || undefined;

    // Extract meta description
    const description = $('meta[name="description"]').attr('content')?.trim() || undefined;

    // Extract all unique links
    const links: string[] = [];
    $('a[href]').each((_, elem) => {
      const href = $(elem).attr('href');
      if (href && !links.includes(href) && !href.startsWith('#')) {
        links.push(href);
      }
    });

    // Extract all forms
    const forms: Array<{ name: string; fields: string[] }> = [];
    $('form').each((_, formElem) => {
      const formName = $(formElem).attr('name') || $(formElem).attr('id') || `Form ${forms.length + 1}`;
      const fields: string[] = [];
      
      $(formElem).find('input, textarea, select').each((_, inputElem) => {
        const type = $(inputElem).attr('type') || 'text';
        const name = $(inputElem).attr('name') || $(inputElem).attr('id') || `${type}-field`;
        if (!fields.includes(name)) {
          fields.push(name);
        }
      });

      if (fields.length > 0) {
        forms.push({ name: formName, fields });
      }
    });

    // Extract all buttons
    const buttons: string[] = [];
    $('button, input[type="button"], input[type="submit"]').each((_, elem) => {
      const text = $(elem).text().trim() || $(elem).attr('value') || $(elem).attr('aria-label') || 'Button';
      if (!buttons.includes(text)) {
        buttons.push(text);
      }
    });

    // Extract unique pages from navigation
    const pages: string[] = [];
    $('nav a[href], header a[href]').each((_, elem) => {
      const href = $(elem).attr('href');
      const text = $(elem).text().trim();
      if (href && text && !pages.includes(text)) {
        pages.push(text);
      }
    });

    return {
      url,
      title,
      description,
      pages: pages.length > 0 ? pages.slice(0, 20) : undefined,
      forms: forms.length > 0 ? forms : undefined,
      buttons: buttons.length > 0 ? buttons.slice(0, 30) : undefined,
      links: links.length > 0 ? links.slice(0, 50) : undefined,
    };
  } catch (error) {
    console.error('Error analyzing website:', error);
    throw new Error('Failed to analyze website. Please ensure the URL is accessible and try again.');
  }
}
