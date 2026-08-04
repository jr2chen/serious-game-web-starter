import { NextResponse } from "next/server";
import { loadStarterProposal } from "@/lib/content/load";
import type { TeamId } from "@/lib/game/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const scenarioId = searchParams.get("scenario_id");
    const team = searchParams.get("team") as TeamId | null;
    if (!scenarioId || (team !== "red" && team !== "blue")) {
      return NextResponse.json(
        { error: "Query params scenario_id and team (red|blue) are required" },
        { status: 400 },
      );
    }
    const proposal = await loadStarterProposal(scenarioId, team);
    return NextResponse.json(proposal);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load starter proposal";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
