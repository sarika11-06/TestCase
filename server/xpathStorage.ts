import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Directory to store scraped XPaths
const STORAGE_DIR = path.join(__dirname, '..', 'scraped-xpaths');

// Ensure storage directory exists
if (!fs.existsSync(STORAGE_DIR)) {
  fs.mkdirSync(STORAGE_DIR, { recursive: true });
}

export interface StoredXPathData {
  url: string;
  scrapedAt: string;
  forms: Array<{
    name: string;
    fields: Array<{
      name: string;
      type?: string;
      selectors: string[]; // Semantic selectors
      placeholder?: string;
      ariaLabel?: string;
      role?: string;
      matchScore?: number;
      xpath?: string; // <-- added
      xpathCandidates?: string[]; // <-- added
    }>;
  }>;
  buttons: Array<{
    text: string;
    selectors: string[]; // Semantic selectors
    ariaLabel?: string;
    role?: string;
    matchScore?: number;
    xpath?: string; // <-- added
    xpathCandidates?: string[]; // <-- added
  }>;
  links: Array<{
    text: string;
    href: string;
    selectors?: string[];
    ariaLabel?: string;
    xpath?: string; // <-- added
    xpathCandidates?: string[]; // <-- added
  }>;
  allInteractive?: Array<{
    text: string;
    tag: string;
    type: string;
    selectors: string[];
    matchScore?: number;
    xpath?: string; // <-- added
    xpathCandidates?: string[]; // <-- added
  }>;
}

/**
 * Generate a filename from URL (sanitized)
 */
function getFilenameFromUrl(url: string): string {
  const sanitized = url
    .replace(/^https?:\/\//, '')
    .replace(/[^a-z0-9]/gi, '_')
    .toLowerCase();
  return `${sanitized}.json`;
}

/**
 * Save scraped XPath data to file
 */
export function saveXPathData(url: string, data: StoredXPathData): string {
  const filename = getFilenameFromUrl(url);
  const filepath = path.join(STORAGE_DIR, filename);
  
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf-8');
  console.log(`✓ Saved XPath data to: ${filepath}`);
  
  return filepath;
}

/**
 * Load XPath data from file
 */
export function loadXPathData(url: string): StoredXPathData | null {
  const filename = getFilenameFromUrl(url);
  const filepath = path.join(STORAGE_DIR, filename);
  
  if (!fs.existsSync(filepath)) {
    return null;
  }
  
  try {
    const content = fs.readFileSync(filepath, 'utf-8');
    return JSON.parse(content) as StoredXPathData;
  } catch (error) {
    console.error(`Error loading XPath data from ${filepath}:`, error);
    return null;
  }
}

/**
 * List all stored XPath files
 */
export function listStoredUrls(): string[] {
  try {
    const files = fs.readdirSync(STORAGE_DIR);
    return files
      .filter(f => f.endsWith('.json'))
      .map(f => {
        const filepath = path.join(STORAGE_DIR, f);
        try {
          const content = fs.readFileSync(filepath, 'utf-8');
          const data = JSON.parse(content) as StoredXPathData;
          return data.url;
        } catch {
          return null;
        }
      })
      .filter((url): url is string => url !== null);
  } catch (error) {
    console.error('Error listing stored URLs:', error);
    return [];
  }
}

/**
 * Delete stored XPath data for a URL
 */
export function deleteXPathData(url: string): boolean {
  const filename = getFilenameFromUrl(url);
  const filepath = path.join(STORAGE_DIR, filename);
  
  if (!fs.existsSync(filepath)) {
    return false;
  }
  
  try {
    fs.unlinkSync(filepath);
    console.log(`✓ Deleted XPath data: ${filepath}`);
    return true;
  } catch (error) {
    console.error(`Error deleting XPath data from ${filepath}:`, error);
    return false;
  }
}
