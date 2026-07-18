import { NextResponse } from "next/server";
import { listBentoDeckCards } from "@/lib/bento";

export const revalidate = 15;

export async function GET() {
  try {
    const cards = await listBentoDeckCards(20);
    return NextResponse.json({ cards });
  } catch (err: any) {
    return NextResponse.json({ cards: [], error: err?.message ?? "failed" }, { status: 200 });
  }
}
