// Vision AI — powered by Groq (Llama 4 Scout with vision)
// Switched from Gemini to avoid daily quota exhaustion (1500 req/day hard cap)

const GROQ_KEY = import.meta.env.VITE_GROQ_KEY
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
const VISION_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct'

async function groqVision(base64Image, mimeType, prompt) {
  if (!GROQ_KEY) {
    return { error: true, message: 'Groq key not configured — add VITE_GROQ_KEY to .env' }
  }

  const resp = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROQ_KEY}`,
    },
    body: JSON.stringify({
      model: VISION_MODEL,
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64Image}` } },
        ],
      }],
    }),
  })

  if (!resp.ok) {
    if (resp.status === 429) {
      return { error: true, rateLimited: true, message: 'Rate limited — wait a moment and retry.' }
    }
    const errText = await resp.text()
    return { error: true, message: `Vision error (${resp.status}): ${errText.slice(0, 120)}` }
  }

  const data = await resp.json()
  const text = data.choices?.[0]?.message?.content || ''
  if (!text) return { error: true, message: 'No response from vision model. Try again.' }
  return text
}

// ── Meal photo scanning ───────────────────────────────────────────────────────

export async function scanMealPhoto(base64Image, mimeType = 'image/jpeg', userNotes = '') {
  const notesLine = userNotes.trim()
    ? `\nIMPORTANT — the user added these notes about this meal: "${userNotes.trim()}"\nFactor this into your estimates (e.g. exact egg count, cooking method, portion size).`
    : ''

  const prompt = `Analyze this food photo and estimate the nutritional content.${notesLine}
Be specific about every food item you can see. Estimate portion sizes from visual cues (plate size, utensils, etc.).
Return ONLY valid JSON in this exact format (no markdown, no prose):
{
  "foods": [
    {
      "name": "Chicken Breast (grilled, ~150g)",
      "calories": 248,
      "protein_g": 46,
      "carbs_g": 0,
      "fat_g": 5
    }
  ],
  "totals": {
    "calories": 248,
    "protein_g": 46,
    "carbs_g": 0,
    "fat_g": 5
  },
  "confidence": "high",
  "notes": "Portion size estimated from plate reference"
}`

  const result = await groqVision(base64Image, mimeType, prompt)
  if (typeof result === 'object') return result // error object

  try {
    const clean = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    return { error: false, ...JSON.parse(clean) }
  } catch {
    return { error: true, message: 'Could not parse food data from image. Try a clearer photo.' }
  }
}

// ── Workout form verification ─────────────────────────────────────────────────

export async function verifyWorkoutPhoto(base64Image, mimeType = 'image/jpeg', exerciseName) {
  const prompt = `You are an expert personal trainer and movement coach. Analyze this photo and determine if the person is performing "${exerciseName}".

Return ONLY valid JSON (no markdown, no prose):
{
  "verified": true,
  "exercise_detected": "what exercise you see them doing",
  "form_score": 85,
  "feedback": "2-sentence specific feedback on their form — what they are doing well and what to fix",
  "cues": ["one actionable cue", "second actionable cue"]
}

Rules:
- "verified" is true only if the person is clearly doing ${exerciseName} or a very close variation
- "form_score" is 0-100 (100 = perfect form)
- If no person or exercise is visible, set verified=false and explain in feedback
- Be specific and encouraging — this is for a fitness app`

  const result = await groqVision(base64Image, mimeType, prompt)
  if (typeof result === 'object') return result

  try {
    const clean = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    return { error: false, ...JSON.parse(clean) }
  } catch {
    return { error: true, message: 'Could not analyze photo. Try a clearer shot.' }
  }
}

// ── File → base64 ─────────────────────────────────────────────────────────────

export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result.split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
