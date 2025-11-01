const GEMINI_API_URL = process.env.GEMINI_API_URL; // e.g. https://your-gemini-proxy.example.com/embeddings
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

async function getFetch(): Promise<typeof fetch> {
	// Use global fetch if available (Node 18+)
	if (typeof globalThis.fetch === "function") return globalThis.fetch.bind(globalThis);

	// Try dynamic import of node-fetch as a fallback
	try {
		const mod = await import("node-fetch");
		// node-fetch exports a default function in ESM
		return (mod as any).default ?? (mod as any);
	} catch (e) {
		throw new Error(
			"`fetch` is not available in this Node runtime and 'node-fetch' is not installed. " +
			"Install it with `npm i node-fetch` or run on Node 18+ which includes `fetch` natively."
		);
	}
}

export async function geminiEmbeddings(input: string): Promise<number[]> {
  if (!GEMINI_API_URL || !GEMINI_API_KEY) {
    throw new Error("Gemini configuration missing (GEMINI_API_URL / GEMINI_API_KEY)");
  }

  const fetchFn = await getFetch();

  const res = await fetchFn(GEMINI_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${GEMINI_API_KEY}`,
    },
    body: JSON.stringify({ input }),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Gemini embeddings request failed: ${res.status} ${txt}`);
  }

  const body = await res.json() as { embedding?: number[]; data?: Array<{ embedding?: number[] }> };
  // Expecting body.embedding: number[] or body.data[0].embedding depending on your proxy
  if (Array.isArray(body.embedding)) return body.embedding;
  if (body?.data?.[0]?.embedding) return body.data[0].embedding;
  throw new Error("Unexpected Gemini response shape");
}
