import OpenAI from "openai";

const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey) {
  console.warn('⚠️ OPENAI_API_KEY not set - AI features will be disabled');
}

const openai = new OpenAI({ 
  apiKey: apiKey || 'sk-dummy-key-for-development' 
});

export { openai };
