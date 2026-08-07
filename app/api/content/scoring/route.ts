import { NextResponse } from "next/server";
import { loadScoringConfig } from "@/lib/content/load";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const scoring = await loadScoringConfig();
    return NextResponse.json(scoring);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load scoring config";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
