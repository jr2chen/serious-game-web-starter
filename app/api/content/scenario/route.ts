import { NextResponse } from "next/server";
import {
  loadFirstScenario,
  loadNextScenario,
  loadScenarioById,
} from "@/lib/content/load";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const scenarioId = searchParams.get("scenario_id");
    const afterRound = searchParams.get("after_round");

    if (afterRound != null) {
      const order = Number(afterRound);
      if (!Number.isFinite(order)) {
        return NextResponse.json(
          { error: "after_round must be a number" },
          { status: 400 },
        );
      }
      const next = await loadNextScenario(order);
      return NextResponse.json(next);
    }

    if (scenarioId) {
      const scenario = await loadScenarioById(scenarioId);
      return NextResponse.json(scenario);
    }

    const scenario = await loadFirstScenario();
    return NextResponse.json(scenario);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load scenario";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
