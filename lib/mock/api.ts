import {
  INITIAL_CATEGORY_TOTALS,
  MOCK_ROLES,
  MOCK_ROOMS,
  MOCK_SCENARIO,
  type CategoryTotals,
  type HiddenRole,
  type Room,
  type Scenario,
  type TeamId,
} from "./data";

/** Mock data API — swap for Firebase / CSV later without changing screens. */

export async function listRooms(): Promise<Room[]> {
  return MOCK_ROOMS;
}

export async function getScenario(_roomId?: string): Promise<Scenario> {
  return MOCK_SCENARIO;
}

export async function createRoom(): Promise<Room> {
  return {
    id: `new-${Date.now()}`,
    name: "New room",
    tag: "land",
    icon: "＋",
    topic: "Assigned automatically",
    playerCount: 1,
  };
}

export async function getCategoryTotals(): Promise<CategoryTotals> {
  return { ...INITIAL_CATEGORY_TOTALS };
}

/** Mock assignment — real rooms will deal roles without revealing others'. */
export async function assignHiddenRole(_team: TeamId): Promise<HiddenRole> {
  const index = Math.floor(Math.random() * MOCK_ROLES.length);
  return MOCK_ROLES[index]!;
}
