/**
 * Utility for interacting with AI APIs (Gemini, Groq, & OpenRouter)
 * Implements an ultimate triple-fallback mechanism, multiple keys, and retry queue.
 */

const GEMINI_API_KEYS = (import.meta.env.VITE_GEMINI_API_KEYS || import.meta.env.VITE_GEMINI_API_KEY || "").split(',').map(k => k.trim()).filter(Boolean);
let currentGeminiKeyIndex = 0;

function getGeminiKey() {
  if (GEMINI_API_KEYS.length === 0) return null;
  const key = GEMINI_API_KEYS[currentGeminiKeyIndex];
  currentGeminiKeyIndex = (currentGeminiKeyIndex + 1) % GEMINI_API_KEYS.length;
  return key;
}

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;
const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;
const SARVAM_API_KEY = import.meta.env.VITE_SARVAM_API_KEY || "sk_oha21jef_sB9s7qV1x6W5BE78Cqbi3YtS";

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
 * Generates content using Google Gemini 1.5 Flash with Key Rotation
 */
async function generateWithGemini(prompt) {
  if (GEMINI_API_KEYS.length === 0) throw new Error("Gemini API key is missing");

  const modelsToTry = ['gemini-1.5-flash', 'gemini-2.0-flash-exp'];
  let lastError = null;

  for (let i = 0; i < GEMINI_API_KEYS.length; i++) {
    const currentKey = getGeminiKey();
    
    for (const model of modelsToTry) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${currentKey}`;
        
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.7 },
            safetySettings: [
              { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
              { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
              { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
              { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
            ]
          })
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(`Gemini API Error (${model}): ${response.status} ${errorData.error?.message || ''}`);
        }

        const data = await response.json();
        if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
          return data.candidates[0].content.parts[0].text;
        }
        throw new Error(`Invalid response format from Gemini (${model})`);
      } catch (err) {
        console.warn(`Gemini model ${model} with key ${currentKey?.substring(0,5)}... failed:`, err.message);
        lastError = err;
        
        // If it's a quota issue, break inner loop to switch keys
        if (err.message.includes('Quota') || err.message.includes('exhausted') || err.message.includes('API key not valid')) {
          break; // Switch to the next key
        }
      }
    }
  }

  throw lastError || new Error("All Gemini models and keys failed");
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
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 8000
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
      max_tokens: 8000
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
 * Generates content using Sarvam (Sarvam-105b)
 */
async function generateWithSarvam(prompt) {
  if (!SARVAM_API_KEY) throw new Error("Sarvam API key is missing");

  const url = 'https://api.sarvam.ai/v1/chat/completions';
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'api-subscription-key': SARVAM_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: "sarvam-105b",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt }
      ],
      temperature: 0.7
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`Sarvam API Error: ${response.status} ${errorData.error?.message || ''}`);
  }

  const data = await response.json();
  if (data.choices && data.choices[0]?.message?.content) {
    return data.choices[0].message.content;
  }
  throw new Error("Invalid response format from Sarvam");
}

// --- Queue System for High Load Handling ---
const requestQueue = [];
let isProcessingQueue = false;

async function processQueue() {
  if (isProcessingQueue || requestQueue.length === 0) return;
  isProcessingQueue = true;
  
  while (requestQueue.length > 0) {
    const request = requestQueue[0];
    try {
      const result = await request.execute();
      request.resolve(result);
      requestQueue.shift(); // Remove successful request
    } catch (err) {
      const isRateLimit = err.message.includes('429') || err.message.includes('Quota') || err.message.includes('load') || err.message.includes('exhausted');
      
      if (isRateLimit && request.retries < 3) {
        console.warn(`API Rate limited/Overloaded. Retrying in 5 seconds... (Retry ${request.retries + 1}/3)`);
        request.retries++;
        await new Promise(r => setTimeout(r, 5000));
        // Keep in queue, do not shift, try again
      } else {
        request.reject(err);
        requestQueue.shift();
      }
    }
  }
  isProcessingQueue = false;
}

/**
 * Main generation function wrapped in a queue.
 */
export function generateAIContent(prompt) {
  return new Promise((resolve, reject) => {
    requestQueue.push({
      execute: () => generateAIContentInternal(prompt),
      resolve,
      reject,
      retries: 0
    });
    processQueue();
  });
}

/**
 * Internal execution with Triple Fallback logic.
 */
async function generateAIContentInternal(prompt) {
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
        console.warn("OpenRouter generation failed, falling back to Sarvam:", orError.message);
        
        try {
          console.log("Attempting generation with Sarvam...");
          const result = await generateWithSarvam(prompt);
          return result;
        } catch (sarvamError) {
          console.error("Sarvam generation also failed:", sarvamError.message);
          throw new Error("All AI providers unfortunately failed. " + geminiError.message);
        }
      }
    }
  }
}

/**
 * Note: generateWithGeminiVision has been deprecated in favor of local extraction using fileExtractor.js.
 * This is kept to prevent breaking imports temporarily, but routes to standard text generation if used.
 */
export async function generateWithGeminiVision(prompt, base64Data, mimeType) {
  console.warn("generateWithGeminiVision is deprecated. Please use local extraction and generateAIContent.");
  // Instead of failing, we just try to fulfill it via the text API to gracefully degrade
  return generateAIContent(prompt);
}

