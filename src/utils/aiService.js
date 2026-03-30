/**
 * Utility for interacting with AI APIs (Gemini, Groq, & OpenRouter)
 * Implements an ultimate triple-fallback mechanism.
 */

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;
const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;

/**
 * Universal system prompt enforcing strict Markdown formatting for all AI tools.
 */
const SYSTEM_PROMPT = `You are a professional educational content generator for teachers. You MUST follow these formatting rules STRICTLY:

FORMATTING RULES:
1. Use proper Markdown heading hierarchy: # for main title, ## for major sections, ### for sub-sections.
2. NEVER skip heading levels (e.g., don't go from # to ###).
3. Use **bold** for key terms and emphasis.
4. Use bullet points (- or *) for short lists, numbered lists (1. 2. 3.) for sequential steps.
5. Use Markdown tables with proper | column | headers | for any tabular data. Always include the header separator row (|---|---|).
6. Use > blockquotes for tips, notes, and answer keys.
7. Use --- horizontal rules to separate major sections.
8. Use emojis sparingly for section headers to make content engaging (e.g., 🎯, 📖, ✍️).
9. Keep paragraphs short and well-spaced.
10. NEVER output raw HTML. Only use standard Markdown syntax.
11. Ensure tables are complete — every row must have the same number of columns as the header.
12. Output ONLY the requested content. No meta-commentary like "Here is your lesson plan" or "I hope this helps".`;

/**
 * Generates content using Google Gemini 1.5 Flash
 */
async function generateWithGemini(prompt) {
  if (!GEMINI_API_KEY) throw new Error("Gemini API key is missing");

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.7 }
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`Gemini API Error: ${response.status} ${errorData.error?.message || ''}`);
  }

  const data = await response.json();
  if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
    return data.candidates[0].content.parts[0].text;
  }
  throw new Error("Invalid response format from Gemini");
}

/**
 * Generates content using Groq (Llama 3.1)
 */
async function generateWithGroq(prompt) {
  if (!GROQ_API_KEY) throw new Error("Groq API key is missing");

  const url = 'https://api.groq.com/openai/v1/chat/completions';
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: "llama-3.1-8b-instant",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 2048
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`Groq API Error: ${response.status} ${errorData.error?.message || ''}`);
  }

  const data = await response.json();
  if (data.choices && data.choices[0]?.message?.content) {
    return data.choices[0].message.content;
  }
  throw new Error("Invalid response format from Groq");
}

/**
 * Generates content using OpenRouter (Free Tier Models)
 */
async function generateWithOpenRouter(prompt) {
  if (!OPENROUTER_API_KEY) throw new Error("OpenRouter API key is missing");

  const url = 'https://openrouter.ai/api/v1/chat/completions';
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: "google/gemini-1.5-flash:free",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 2048
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`OpenRouter API Error: ${response.status} ${errorData.error?.message || ''}`);
  }

  const data = await response.json();
  if (data.choices && data.choices[0]?.message?.content) {
    return data.choices[0].message.content;
  }
  throw new Error("Invalid response format from OpenRouter");
}

/**
 * Main generation function with Triple Fallback logic.
 * Tries Gemini -> Falls back to Groq -> Falls back to OpenRouter.
 * 
 * @param {string} prompt - The prompt to send to the AI
 * @returns {Promise<string>} - The generated markdown text
 */
export async function generateAIContent(prompt) {
  try {
    console.log("Attempting generation with Gemini...");
    const result = await generateWithGemini(prompt);
    return result;
  } catch (geminiError) {
    console.warn("Gemini generation failed, falling back to Groq:", geminiError.message);
    
    try {
      console.log("Attempting generation with Groq...");
      const result = await generateWithGroq(prompt);
      return result;
    } catch (groqError) {
      console.warn("Groq generation failed, falling back to OpenRouter:", groqError.message);
      
      try {
        console.log("Attempting generation with OpenRouter...");
        const result = await generateWithOpenRouter(prompt);
        return result;
      } catch (orError) {
        console.error("OpenRouter generation also failed:", orError.message);
        throw new Error("All AI providers unfortunately failed. Please contact support or try again later.");
      }
    }
  }
}
