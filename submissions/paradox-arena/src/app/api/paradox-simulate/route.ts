import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { pivotMinute, pivotDescription, originalTimeline } = await req.json();

    const openrouterApiKey = process.env.OPENROUTER_API_KEY;
    if (!openrouterApiKey) {
      return NextResponse.json(
        { success: false, error: 'Missing OPENROUTER_API_KEY environment variable.' },
        { status: 500 }
      );
    }

    const prompt = `You are an AI sports analyst. We are simulating an alternate sports reality for the match: England vs Argentina (FIFA World Cup 2026).
The game progressed normally up to the pivot point. Here is the timeline of the game before the pivot:
${JSON.stringify(originalTimeline.filter((t: any) => {
  const min = parseInt(t.minute.replace("'", ""));
  return isNaN(min) || min <= pivotMinute;
}), null, 2)}

At minute ${pivotMinute}', a PARADOX occurred:
"${pivotDescription}"

Please simulate the rest of the game from minute ${pivotMinute}' to 90'+ under these new conditions. Let the timeline evolve realistically according to this change (e.g. if a team got a red card, they will play defensive or concede goals; if a goal was disallowed or scored, the subsequent events and scores must align).

Respond ONLY with a valid JSON object matching the following structure. Do not include any markdown formatting wrappers (like \`\`\`json) or extra conversational text.

{
  "alternateTimeline": [
    { "minute": "43'", "score": "ARG 0 – 0 ENG", "event": "43' — Red card: De Paul (ARG) is sent off for a reckless tackle!" },
    ... (simulate realistic subsequent events leading up to full-time at 90'+ based on the pivot scenario)
  ],
  "finalScore": {
    "argentina": <number representing Argentina's final score>,
    "england": <number representing England's final score>
  },
  "winnerOutcome": "YES" | "NO", // "YES" if Argentina wins, "NO" if England wins or the match is a draw
  "stats": {
    "possession": { "argentina": <number 0-100>, "england": <number 0-100> }, // must sum to 100
    "shotsOnTarget": { "argentina": <number>, "england": <number> },
    "corners": { "argentina": <number>, "england": <number> },
    "fouls": { "argentina": <number>, "england": <number> },
    "yellowCards": { "argentina": <number>, "england": <number> },
    "redCards": { "argentina": <number>, "england": <number> }
  },
  "analysis": "<a concise 2-3 sentence analysis of how this pivot point altered the match path and outcome>"
}`;

    let responseData = null;
    let errorMsg = '';

    // Primary model and fallback models
    const models = [
      'google/gemma-4-26b-a4b-it:free',
      'openai/gpt-oss-20b:free',
      'poolside/laguna-xs-2.1:free'
    ];

    for (const model of models) {
      try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${openrouterApiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://mind-vs-machine-arena.vercel.app',
            'X-Title': 'Paradox Arena Simulation',
          },
          body: JSON.stringify({
            model,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.7,
          }),
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          console.warn(`Model ${model} failed with status ${response.status}:`, errData);
          errorMsg = errData?.error?.message || `HTTP ${response.status}`;
          continue; // Try next model
        }

        const data = await response.json();
        const content = data?.choices?.[0]?.message?.content || '';

        // Extract JSON block if it was returned inside markdown blocks
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            responseData = JSON.parse(jsonMatch[0]);
            break; // Successfully parsed, break out of loop
          } catch (parseErr) {
            console.warn('Failed to parse matched JSON from content:', content);
            errorMsg = 'Unparseable JSON in model output.';
          }
        } else {
          console.warn('No JSON matching braces found in content:', content);
          errorMsg = 'No JSON matching braces found in model output.';
        }
      } catch (fetchErr: any) {
        console.warn(`Fetch error for model ${model}:`, fetchErr);
        errorMsg = fetchErr?.message || String(fetchErr);
      }
    }

    if (!responseData) {
      return NextResponse.json(
        { success: false, error: `Failed to simulate game. Details: ${errorMsg}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      simulation: responseData,
    });
  } catch (globalErr: any) {
    console.error('Paradox simulation route error:', globalErr);
    return NextResponse.json(
      { success: false, error: globalErr?.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
