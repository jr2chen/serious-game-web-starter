import type {
  CategoryTotals,
  HiddenRole,
  Room,
  Scenario,
  StarterProposal,
  TeamId,
  ThemeId,
} from "@/lib/game/types";
import { INITIAL_CATEGORY_TOTALS } from "@/lib/game/constants";
import {
  createRoom as createFirestoreRoom,
  listRecentRooms,
  recordPlayerJoined,
} from "@/lib/firebase/rooms";

/** Browser client for game content and rooms. */

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? `Request failed: ${url}`);
  }
  return res.json() as Promise<T>;
}

export async function listRooms(): Promise<Room[]> {
  return listRecentRooms();
}

export async function createRoom(themeId: ThemeId): Promise<Room> {
  return createFirestoreRoom(themeId);
}

export async function notePlayerJoined(roomCode: string): Promise<void> {
  await recordPlayerJoined(roomCode);
}

export async function getScenario(_roomId?: string): Promise<Scenario> {
  return getJson<Scenario>("/api/content/scenario");
}

export async function getStarterProposal(
  scenarioId: string,
  team: TeamId,
): Promise<StarterProposal> {
  const params = new URLSearchParams({ scenario_id: scenarioId, team });
  return getJson<StarterProposal>(`/api/content/starter-proposal?${params}`);
}

export async function getCategoryTotals(): Promise<CategoryTotals> {
  return { ...INITIAL_CATEGORY_TOTALS };
}

export async function assignHiddenRole(_team: TeamId): Promise<HiddenRole> {
  return getJson<HiddenRole>("/api/content/role");
}
