// Oracle AI — powered by Groq (llama-3.3-70b-versatile)

const GROQ_KEY = import.meta.env.VITE_GROQ_KEY

const ORACLE_SYSTEM = `You are the Oracle of SKANDA — the divine AI war council of the God of War.
You are an elite fitness intelligence system with the authority and precision of a military commander.
Your personality:
- Sharp, direct, data-driven. No filler. Every sentence must earn its place.
- You speak with mythological gravitas but ground every insight in real science.
- You cite principles: Progressive Overload, RPE, periodization, protein synthesis, caloric periodization.
- You motivate through truth, not flattery. A warrior deserves honest counsel.
- Format key numbers in bold. Use short paragraphs. No bullet-point walls.

When generating workout plans return ONLY valid JSON, no prose.
When giving Oracle insights, be punchy — 2-4 sentences max.`

async function groqChat(messages, options = {}) {
  if (!GROQ_KEY) {
    return '[Oracle offline — add VITE_GROQ_KEY to .env to activate]'
  }
  const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROQ_KEY}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      max_tokens: options.maxTokens || 1024,
      messages: [
        { role: 'system', content: ORACLE_SYSTEM },
        ...messages,
      ],
    }),
  })
  if (!resp.ok) {
    const err = await resp.text()
    throw new Error(`Oracle error: ${resp.status} — ${err.slice(0, 120)}`)
  }
  const data = await resp.json()
  const text = data.choices?.[0]?.message?.content
  if (!text) throw new Error('Oracle returned an empty response. Try again.')
  return text
}

// ── Oracle daily insight ──────────────────────────────────────────────────────

export async function getOracleInsight({ tier, goal, streak, lastSession, protein }) {
  const prompt = `User stats: Tier=${tier}, Goal=${goal}, Streak=${streak} days, Protein today=${protein}g.
Last session: ${lastSession || 'none yet'}.
Give a sharp 2-sentence Oracle insight — what does this warrior need to hear today?`
  return groqChat([{ role: 'user', content: prompt }], { maxTokens: 200 })
}

// ── Rest day recovery Oracle ──────────────────────────────────────────────────

export async function getRestDayInsight({ tier, goal, streak, protein, lastSessionName }) {
  const prompt = `User is on a SCHEDULED REST DAY. Tier=${tier}, Goal=${goal}, Streak=${streak} days, Protein today=${protein}g, Last session: ${lastSessionName || 'none'}.
Give 2 sharp recovery directives — specific actions this warrior should do TODAY to maximise adaptation. Be direct, concise, warrior-themed. Focus only on recovery: sleep, nutrition, mobility, or mindset. No workout suggestions.`
  return groqChat([{ role: 'user', content: prompt }], { maxTokens: 200 })
}

// ── Generate workout plan ─────────────────────────────────────────────────────

export async function generateWorkoutPlan({ tier, goal, weight, daysPerWeek, testData }) {
  const tierNames = { arambha: 'ARAMBHA (Beginner)', veer: 'VEER (Intermediate)', skanda: 'SKANDA (Elite)' }
  const prompt = `Generate a ${daysPerWeek}-day weekly workout plan for:
Tier: ${tierNames[tier] || tier}
Goal: ${goal}
Body weight: ${weight} lbs
Fitness test baseline: pushups=${testData.pushups}, pullups=${testData.pullups}, bench=${testData.bench_lbs}lbs, squat=${testData.squat_lbs}lbs, mile=${testData.mile_secs}s

Return ONLY this JSON structure (no markdown, no prose):
{
  "week_number": 1,
  "structure": "PPL / Upper-Lower / Full Body",
  "coaching_note": "2-sentence rationale for this structure choice",
  "days": [
    {
      "day_name": "Push Day",
      "focus": "Chest, Shoulders, Triceps",
      "exercises": [
        {
          "name": "Barbell Bench Press",
          "sets": 4,
          "reps": "5-8",
          "weight_suggestion": "70% 1RM (~${Math.round(testData.bench_lbs * 0.7)}lbs)",
          "rest_secs": 180,
          "cue": "Drive feet into floor, arch naturally, bar to lower chest"
        }
      ]
    }
  ],
  "nutrition_targets": {
    "calories": 2800,
    "protein_g": 185,
    "carbs_g": 320,
    "fat_g": 80
  }
}`
  const raw = await groqChat([{ role: 'user', content: prompt }], { maxTokens: 2048 })
  try {
    const clean = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    return JSON.parse(clean)
  } catch {
    throw new Error('Oracle returned invalid plan format. Try again.')
  }
}

// ── Adapt weekly plan ─────────────────────────────────────────────────────────

export async function adaptWeeklyPlan({ currentPlan, sessions, totalVolume, prsHit }) {
  // Summarise per-exercise performance from this week's sessions
  const exerciseSummary = sessions.slice(0, 7).flatMap(s =>
    (s.exercises_json || []).map(ex => {
      const maxWeight = ex.logs?.length
        ? Math.max(...ex.logs.map(l => l.weight || 0))
        : 0
      return maxWeight > 0 ? `${ex.name}: ${ex.sets_logged || ex.logs?.length || 0} sets @ ${maxWeight} lbs max` : null
    })
  ).filter(Boolean).slice(0, 15).join('\n')

  const prompt = `Analyze last week's training data and generate next week's adapted plan.

Current Week ${currentPlan.week_number} plan structure: ${currentPlan.structure}
Sessions completed: ${sessions.length} / ${currentPlan.days?.length || 4}
Total volume lifted: ${totalVolume.toLocaleString()} lbs
PRs hit: ${prsHit}

Exercise performance this week:
${exerciseSummary || 'No detailed exercise data available.'}

Current plan days: ${JSON.stringify(currentPlan.days?.map(d => ({ name: d.day_name, focus: d.focus, exercises: d.exercises?.map(e => ({ name: e.name, sets: e.sets, reps: e.reps })) })))}

Generate Week ${(currentPlan.week_number || 1) + 1} adapted plan. Apply progressive overload where the data supports it.
Provide explicit reasoning for every change — this is SKANDA's competitive advantage over opaque AI.
Return the SAME JSON structure as the input plan, with:
- Updated week_number
- "changes_from_last_week": ["change with science reasoning, e.g. 'Increased bench sets: 3→4 — you hit all reps at target weight, signalling readiness for more volume'"]
- Updated coaching_note explaining the adaptation strategy
- Adjusted sets/reps where data supports it`

  const raw = await groqChat([{ role: 'user', content: prompt }], { maxTokens: 2048 })
  try {
    const clean = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    return JSON.parse(clean)
  } catch {
    throw new Error('Oracle plan adaptation failed. Try again.')
  }
}

// ── Post-session analysis ─────────────────────────────────────────────────────

export async function getSessionAnalysis({ dayName, totalVolume, durationMins, prsHit, exercises }) {
  const prompt = `Post-session analysis for ${dayName}:
Volume: ${totalVolume.toLocaleString()} lbs | Duration: ${durationMins} min | PRs: ${prsHit}
Exercises logged: ${exercises.map(e => `${e.name} (${e.sets_logged} sets)`).join(', ')}

Give a 3-sentence Oracle post-battle debrief: what was accomplished, what to watch for next session, recovery directive.`
  return groqChat([{ role: 'user', content: prompt }], { maxTokens: 300 })
}

// ── Meal plan generation ──────────────────────────────────────────────────────

export async function generateMealPlan({ calories, protein, carbs, fat, goal }) {
  const prompt = `Generate a 1-day meal plan hitting these exact targets:
Calories: ${calories}kcal | Protein: ${protein}g | Carbs: ${carbs}g | Fat: ${fat}g
Goal: ${goal}

Return JSON only:
{
  "meals": [
    {
      "name": "Breakfast",
      "time": "7:00 AM",
      "foods": [{ "item": "Greek Yogurt (200g)", "calories": 120, "protein": 17, "carbs": 6, "fat": 2 }],
      "total": { "calories": 450, "protein": 40, "carbs": 30, "fat": 12 }
    }
  ]
}`
  const raw = await groqChat([{ role: 'user', content: prompt }], { maxTokens: 1024 })
  try {
    const clean = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    return JSON.parse(clean)
  } catch {
    return null
  }
}
