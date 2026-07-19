import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(request: Request) {
  try {
    const room = await request.json();
    const { name, members, awards, funnyRule, partyMode, punishmentMode } = room;

    if (!name) {
      return NextResponse.json({ error: 'Room name is required' }, { status: 400 });
    }

    const geminiApiKey = process.env.GEMINI_API_KEY;

    let summaryText = '';

    if (geminiApiKey) {
      try {
        const genAI = new GoogleGenerativeAI(geminiApiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

        const prompt = `You are PredictGPT, a witty, slightly sassy AI Prediction League Analyst.
Generate a fun, sports-reporter-style "End of Room Summary" for the prediction league named "${name}".

Room Info:
- Members: ${JSON.stringify(members, null, 2)}
- Awards given: ${JSON.stringify(awards, null, 2)}
- Funny rule / punishment: "${funnyRule || 'None'}"
- Party Mode is ${partyMode ? 'ON' : 'OFF'}
- Punishment Mode is ${punishmentMode ? 'ON' : 'OFF'}

Guidelines:
- Roast the low performers gently (especially pointing out the punishment they have to face).
- Congratulate the room champion.
- Write 3-4 sentences maximum.
- Be funny, engaging, and hype up the competition.
- Keep the tone friendly but highly competitive.`;

        const result = await model.generateContent(prompt);
        summaryText = result.response.text().trim();
      } catch (err) {
        console.error('Error invoking Gemini for room summary:', err);
        summaryText = getMockSummary(room);
      }
    } else {
      summaryText = getMockSummary(room);
    }

    return NextResponse.json({ success: true, summary: summaryText });
  } catch (error: any) {
    console.error('Room Summary API error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

function getMockSummary(room: any) {
  const champion = room.members.find((m: any) => m.isChampion)?.name || 'the leader';
  const worst = [...room.members].sort((a: any, b: any) => a.accuracy - b.accuracy)[0]?.name || 'the bottom player';
  const mvp = room.awards.find((a: any) => a.type === 'most_accurate')?.recipient || champion;

  return `🏆 The prediction league wraps up with ${champion} absolutely dominating the ranks! Meanwhile, ${worst} is sitting at the bottom of the ladder and must face the ultimate penalty: "${room.funnyRule || 'paying for drinks'}". Shoutout to ${mvp} for clean analytics this week. Keep predicting, because the tables can turn with a single repo release!`;
}
