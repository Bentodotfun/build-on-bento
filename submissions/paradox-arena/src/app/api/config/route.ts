import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    defaultHumanJwt: process.env.HUMAN_JWT || '',
    defaultAiJwt: process.env.AI_JWT || '',
    humanAddress: process.env.HUMAN_ADDRESS || '',
    aiAddress: process.env.AI_ADDRESS || ''
  });
}
