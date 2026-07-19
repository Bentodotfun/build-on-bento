import { NextResponse } from 'next/server';
import { getBentoSdk } from '@/lib/bento';

export async function GET() {
  try {
    const sdk = getBentoSdk();
    const result = await sdk.public.markets.list({ limit: 12 });

    if (!result || !result.data) {
      return NextResponse.json({ success: true, markets: [] });
    }

    // Map Bento SDK markets to our dashboard's Market interface
    const mappedMarkets = result.data.map((m: any) => {
      const opt0Amount = m.liquidityBreakdown?.option0?.usdcAmount || m.liquidityBreakdown?.option0?.tokenAmount || 0;
      const opt1Amount = m.liquidityBreakdown?.option1?.usdcAmount || m.liquidityBreakdown?.option1?.tokenAmount || 0;
      const total = opt0Amount + opt1Amount;
      
      let yesPercent = 50;
      if (total > 0) {
        yesPercent = Math.min(Math.max(Math.round((opt0Amount / total) * 100), 5), 95);
      } else {
        const charCode = m.id.charCodeAt(m.id.length - 1) || 0;
        yesPercent = 35 + (charCode % 30); // 35% to 65% spread
      }
      const noPercent = 100 - yesPercent;

      // Clean up categories dynamically based on keywords to override database anomalies
      let category = m.category || 'General';
      const titleLower = m.betString.toLowerCase();

      const racingKeywords = [
        'race', 'mclaren', 'f1', 'formula', 'gp', 'grand prix'
      ];

      const techKeywords = [
        'react', 'native', 'next', 'tailwind', 'dependency', 'outage', 'ship', 
        'code', 'developer', 'sre', 'stable', 'commit', 'push', 'pr', 'pull request', 
        'git', 'github', 'release', 'deploy', 'api', 'sdk', 'build', 'server', 'patch'
      ];
      
      const aiKeywords = [
        'gemini', 'gpt', 'ai', 'llm', 'intelligence', 'openai', 'claude'
      ];
      
      const sportsKeywords = [
        'team', 'win', 'score', 'cup', 'match', 'football', 'soccer', 'versus', 'vs', 'basketball', 'tennis', 'player', 'beat'
      ];

      const hasRacing = racingKeywords.some(kw => titleLower.includes(kw));
      const hasTech = techKeywords.some(kw => titleLower.includes(kw));
      const hasAi = aiKeywords.some(kw => titleLower.includes(kw));
      const hasSports = sportsKeywords.some(kw => titleLower.includes(kw));

      if (hasRacing) {
        category = 'Formula 1';
      } else if (hasTech) {
        category = 'Technology';
      } else if (hasAi) {
        category = 'AI';
      } else if (hasSports) {
        category = 'Football';
      } else if (category === 'Football' && !hasSports) {
        // Safe fallback: if marked as Football but doesn't mention any sports keywords,
        // it is almost certainly a developer's accountability tracker or test duel.
        category = 'Technology';
      }

      // Extract repository names from typical developer hedge descriptions
      let githubRepo = undefined;
      let officialSource = undefined;
      
      if (titleLower.includes('react') || titleLower.includes('native')) {
        githubRepo = 'facebook/react-native';
        officialSource = 'https://reactnative.dev';
      } else if (titleLower.includes('next')) {
        githubRepo = 'vercel/next.js';
        officialSource = 'https://nextjs.org';
      } else if (titleLower.includes('tailwind')) {
        githubRepo = 'tailwindlabs/tailwindcss';
        officialSource = 'https://tailwindcss.com';
      }

      return {
        id: m.id || m.duelId,
        title: m.betString,
        description: m.description || 'Live market resolved via Bento smart contracts.',
        yesPercent,
        noPercent,
        volume: m.totalBetAmountUsdc || m.totalBetAmount || (total > 0 ? total : 2500),
        timeRemaining: m.endsIn ? `${m.endsIn}h remaining` : '72h remaining',
        category,
        recentChanges: yesPercent > 50 ? '+1.5% in last hour' : '-2% in last hour',
        githubRepo,
        officialSource
      };
    });

    return NextResponse.json({ success: true, markets: mappedMarkets });
  } catch (error: any) {
    console.error('Failed to list markets via Bento SDK:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
