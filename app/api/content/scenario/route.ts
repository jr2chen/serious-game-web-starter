import { NextResponse } from "next/server";
import { loadFirstScenario } from "@/lib/content/load";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const scenario = await loadFirstScenario();
    return NextResponse.json(scenario);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load scenario";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
