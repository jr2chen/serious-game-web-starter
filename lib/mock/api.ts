import { MOCK_ROOMS, MOCK_SCENARIO, type Room, type Scenario } from "./data";

/** Mock data API — swap for Firebase later without changing screens. */

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
