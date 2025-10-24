import { openai } from "./openai";
import type { WebsiteAnalysis, TestCase, TestCaseGenerationResponse } from "@shared/schema";
import { randomUUID } from "crypto";

export async function generateTestCases(
  analysis: WebsiteAnalysis,
  userPrompt: string
): Promise<TestCaseGenerationResponse> {
  const prompt = `You are an expert QA engineer. Based on the following website analysis and user requirements, generate comprehensive test cases.

Website Analysis:
- URL: ${analysis.url}
- Title: ${analysis.title || 'N/A'}
- Description: ${analysis.description || 'N/A'}
- Pages: ${analysis.pages?.join(', ') || 'N/A'}
- Forms: ${analysis.forms?.map(f => `${f.name} (${f.fields.join(', ')})`).join('; ') || 'N/A'}
- Buttons: ${analysis.buttons?.join(', ') || 'N/A'}

User Requirements:
${userPrompt}

Generate test cases that cover:
1. UI/UX testing for interactive elements
2. Form validation testing
3. Navigation and routing testing
4. End-to-end user flows
5. Any specific requirements mentioned by the user

For each test case, provide:
- A clear, descriptive title
- Type (UI, API, E2E, Integration, Unit, Performance, Security, or Accessibility)
- Priority (High, Medium, Low)
- Detailed description
- Step-by-step test steps
- Expected result
- Playwright code snippet for automation (when applicable)

Return the response in JSON format with this structure:
{
  "testCases": [
    {
      "title": "Test case title",
      "description": "Detailed description",
      "type": "UI",
      "priority": "High",
      "steps": ["Step 1", "Step 2", "Step 3"],
      "expectedResult": "Expected outcome",
      "playwrightCode": "// Playwright test code here"
    }
  ]
}

Generate at least 5-10 comprehensive test cases covering different aspects of the website.`;

  try {
    // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        {
          role: "system",
          content: "You are an expert QA engineer specialized in creating comprehensive test cases. Always respond with valid JSON."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 8192,
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No response from OpenAI");
    }

    const parsed = JSON.parse(content);
    
    // Add IDs to test cases and ensure proper structure
    const testCases: TestCase[] = (parsed.testCases || []).map((tc: any) => ({
      id: randomUUID(),
      title: tc.title || "Untitled Test",
      description: tc.description || "",
      type: tc.type || "UI",
      priority: tc.priority || "Medium",
      steps: Array.isArray(tc.steps) ? tc.steps : [],
      expectedResult: tc.expectedResult || "",
      playwrightCode: tc.playwrightCode,
    }));

    // Generate summary
    const byType: Record<string, number> = {};
    testCases.forEach(tc => {
      byType[tc.type] = (byType[tc.type] || 0) + 1;
    });

    const coverageAreas = new Set<string>();
    testCases.forEach(tc => {
      if (tc.type) coverageAreas.add(tc.type);
      if (tc.description.toLowerCase().includes('form')) coverageAreas.add('Forms');
      if (tc.description.toLowerCase().includes('navigation')) coverageAreas.add('Navigation');
      if (tc.description.toLowerCase().includes('button')) coverageAreas.add('Interactive Elements');
      if (tc.description.toLowerCase().includes('login')) coverageAreas.add('Authentication');
      if (tc.description.toLowerCase().includes('validation')) coverageAreas.add('Validation');
    });

    return {
      analysis,
      testCases,
      summary: {
        totalTests: testCases.length,
        byType,
        coverageAreas: Array.from(coverageAreas),
      },
    };
  } catch (error) {
    console.error('Error generating test cases:', error);
    throw new Error('Failed to generate test cases using AI. Please try again.');
  }
}
