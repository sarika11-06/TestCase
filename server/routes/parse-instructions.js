import { Router } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';

const router = Router();

// Initialize Gemini with API key check
const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
    console.error('❌ GEMINI_API_KEY is not set in .env file!');
} else {
    console.log('✓ GEMINI_API_KEY found:', apiKey.substring(0, 10) + '...');
}

const genAI = new GoogleGenerativeAI(apiKey);

router.post('/parse-instructions', async (req, res) => {
    console.log('\n=== Parse Instructions Request ===');
    
    try {
        const { prompt, url, scrapedData } = req.body;

        if (!prompt) {
            return res.status(400).json({ error: 'Prompt is required' });
        }

        console.log('📝 Prompt:', prompt);
        console.log('🌐 URL:', url);

        if (!apiKey) {
            return res.status(500).json({ error: 'Gemini API key not configured' });
        }

        // Build context from scraped data with BETTER formatting
        let elementsContext = '';
        let buttons = [];
        let fields = [];
        
        if (scrapedData && scrapedData.allInteractive) {
            buttons = scrapedData.allInteractive
                .filter(e => ['button', 'a'].includes(e.tag) || (e.type && e.type.toLowerCase() === 'submit'))
                .slice(0, 50);
            
            fields = scrapedData.allInteractive
                .filter(e => ['input', 'textarea', 'select'].includes(e.tag))
                .slice(0, 50);

            if (buttons.length > 0) {
                elementsContext += `\nButtons/Links found on page (${buttons.length} total):\n`;
                buttons.forEach((b, i) => {
                    const label = b.friendlyName || b.text || b.name || b.id || `Link${i+1}`;
                    elementsContext += `${i+1}. "${label}"\n`;
                });
            }

            if (fields.length > 0) {
                elementsContext += `\nInput Fields found on page (${fields.length} total):\n`;
                fields.forEach((f, i) => {
                    const label = f.friendlyName || f.name || f.placeholder || f.id || `Field${i+1}`;
                    elementsContext += `${i+1}. "${label}" (${f.type || 'text'})\n`;
                });
            }
        }

        console.log('📊 Context:', buttons.length, 'buttons,', fields.length, 'fields');

        // CRITICAL: If prompt mentions "all" and we have elements, force Gemini to expand
        const isExpandablePrompt = /\b(all|every|each|check|test)\s+(link|button|field|form)/i.test(prompt);
        console.log('🔍 Is expandable prompt?', isExpandablePrompt);

        const systemPrompt = `You are a test automation parser. Your job is to convert user prompts into JSON arrays of specific, actionable test steps.

Website: ${url || 'Not provided'}
${elementsContext}

User Prompt: "${prompt}"

CRITICAL INSTRUCTION:
${isExpandablePrompt && buttons.length > 0 ? 
`⚠️ THE USER WANTS TO TEST ALL/EACH ELEMENT. You MUST create ONE separate action for EACH element listed above. DO NOT create a single generic action. Expand it into ${buttons.length} individual "click" actions using the exact names from the list above.` 
: 
'Create specific actions based on the user prompt.'}

Output Format: Return a JSON array ONLY. Each object must have:
- "type": "click" | "fill" | "verify"
- "element": exact name from the list above (e.g., "Home", "About Us", "Login")
- "value": data value (only for "fill" type)

EXAMPLES:

Prompt: "check all links on the site"
Available: "Home", "About", "Contact", "Blog"
Output:
[
  {"type":"click","element":"Home"},
  {"type":"click","element":"About"},
  {"type":"click","element":"Contact"},
  {"type":"click","element":"Blog"}
]

Prompt: "test all forms"
Available: "username", "password", "email"
Output:
[
  {"type":"fill","element":"username","value":"testuser"},
  {"type":"fill","element":"password","value":"Test123!"},
  {"type":"fill","element":"email","value":"test@example.com"}
]

Prompt: "click login"
Output:
[{"type":"click","element":"login"}]

NOW PARSE: "${prompt}"

${isExpandablePrompt && buttons.length > 0 ? 
`⚠️ REMINDER: You have ${buttons.length} buttons/links available. Create ${buttons.length} separate actions, one for each element.` 
: ''}

Return ONLY valid JSON array. No markdown. No explanations.`;

        console.log('🤖 Calling Gemini API...');
        console.log('📄 Prompt length:', systemPrompt.length, 'chars');
        
        const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
        const result = await model.generateContent(systemPrompt);
        
        const responseText = result.response.text();
        console.log('📤 Raw response (first 500 chars):', responseText.substring(0, 500));

        let actions;
        try {
            const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/) || 
                             responseText.match(/```\s*([\s\S]*?)\s*```/) ||
                             responseText.match(/(\[[\s\S]*\])/);
            
            const jsonText = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : responseText;
            actions = JSON.parse(jsonText.trim());

            if (!Array.isArray(actions)) {
                throw new Error('Response is not an array');
            }

            console.log('✅ Parsed', actions.length, 'actions');
            
            // Log each action for debugging
            actions.forEach((a, i) => {
                console.log(`  ${i+1}. ${a.type} "${a.element}"${a.value ? ` with "${a.value}"` : ''}`);
            });

        } catch (parseError) {
            console.error('❌ Parse error:', parseError.message);
            console.error('Raw response:', responseText);
            return res.status(500).json({ 
                error: 'Failed to parse AI response', 
                raw: responseText,
                details: parseError.message
            });
        }

        res.json({ actions });

    } catch (error) {
        console.error('❌ Error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// Test endpoint to verify Gemini connection
router.get('/test-gemini', async (req, res) => {
    console.log('\n=== Testing Gemini Connection ===');
    
    try {
        if (!apiKey) {
            return res.status(500).json({
                status: 'error',
                message: 'GEMINI_API_KEY not found in environment',
                hint: 'Add GEMINI_API_KEY=your_key_here to .env file'
            });
        }

        console.log('✓ API Key found:', apiKey.substring(0, 10) + '...');
        
        const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
        const result = await model.generateContent('Say "Hello, Gemini is working!" in JSON format: {"status":"working","message":"your message"}');
        
        const responseText = result.response.text();
        console.log('✓ Gemini test response:', responseText);
        
        res.json({
            status: 'success',
            message: 'Gemini API is working correctly!',
            apiKeyPreview: apiKey.substring(0, 10) + '...',
            testResponse: responseText
        });
        
        console.log('=== Test Complete ===\n');
    } catch (error) {
        console.error('❌ Gemini test failed:', error.message);
        
        res.status(500).json({
            status: 'error',
            message: error.message,
            apiKeyPreview: apiKey ? apiKey.substring(0, 10) + '...' : 'NOT SET',
            hint: error.message.includes('API key') ? 
                'Invalid API key. Get a new one from https://makersuite.google.com/app/apikey' :
                'Check your internet connection and API quota'
        });
    }
});

export default router;
