import { NextResponse } from "next/server";
import { loadRoles, loadScoringConfig } from "@/lib/content/load";
import { pickHiddenRole } from "@/lib/game/scoring";
import type { TeamId } from "@/lib/game/types";

export const dynamic = "force-dynamic";

function parseTeam(value: string | null): TeamId | null {
  return value === "red" || value === "blue" ? value : null;
}

export async function GET(request: Request) {
  try {
    const team = parseTeam(new URL(request.url).searchParams.get("team"));

    const [roles, scoring] = await Promise.all([
      loadRoles(),
      loadScoringConfig(),
    ]);
    if (!roles.length) {
      return NextResponse.json(
        { error: "roles.csv has no rows" },
        { status: 500 },
      );
    }
    return NextResponse.json(pickHiddenRole(roles, team, scoring));
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load role";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
