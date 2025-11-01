import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function findElementWithAI(intent: string, elements: ElementContext[]): Promise<ElementContext> {
  // 1. Get embeddings for intent
  const intentEmbedding = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: intent,
  });

  // 2. Get embeddings for each element's text
  const elementTexts = elements.map(el => 
    `${el.text} ${el.ariaLabel || ''} ${el.placeholder || ''} ${el.name || ''}`
  );

  const elementEmbeddings = await Promise.all(
    elementTexts.map(text => 
      openai.embeddings.create({ model: "text-embedding-3-small", input: text })
    )
  );

  // 3. Calculate cosine similarity
  function cosineSimilarity(a: number[], b: number[]): number {
    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const magA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    return dotProduct / (magA * magB);
  }

  // 4. Find best match
  const scores = elementEmbeddings.map((emb, i) => ({
    element: elements[i],
    score: cosineSimilarity(
      intentEmbedding.data[0].embedding,
      emb.data[0].embedding
    )
  }));

  return scores.sort((a, b) => b.score - a.score)[0].element;
}
