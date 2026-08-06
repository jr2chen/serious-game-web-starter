import type {
  CategoryId,
  CategoryTotals,
  HiddenRole,
  Room,
  RoomPlayer,
  Scenario,
  SeatRole,
  StarterProposal,
  TeamId,
  TeamProposalDraft,
  ThemeId,
} from "@/lib/game/types";
import { INITIAL_CATEGORY_TOTALS } from "@/lib/game/constants";
import {
  addRoomTime,
  createRoom as createFirestoreRoom,
  ensureRoomTimer,
  getRoom as getFirestoreRoom,
  listRecentRooms,
  subscribeToRoom,
} from "@/lib/firebase/rooms";
import {
  getMySeatInRoom,
  getRoleForPlayer,
  joinRoomAsPlayer,
  subscribeToRoomPlayers,
  type PlayerSeat,
} from "@/lib/firebase/players";
import {
  ensureTeamProposal,
  submitTeamProposal,
  subscribeToTeamProposal,
} from "@/lib/firebase/proposals";
import type { Unsubscribe } from "firebase/firestore";

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

export async function getRoom(roomCode: string): Promise<Room | null> {
  return getFirestoreRoom(roomCode);
}

export async function createRoom(themeId: ThemeId): Promise<Room> {
  return createFirestoreRoom(themeId);
}

export async function enterRoom(input: {
  roomCode: string;
  displayName: string;
  emoji: string;
  team: SeatRole;
  role: HiddenRole | null;
}): Promise<void> {
  await joinRoomAsPlayer(input);
}

export async function loadMySeat(
  roomCode: string,
): Promise<PlayerSeat | null> {
  return getMySeatInRoom(roomCode);
}

export async function loadRoleForPlayer(
  roomCode: string,
  playerId: string,
): Promise<HiddenRole | null> {
  return getRoleForPlayer(roomCode, playerId);
}

export async function watchRoomPlayers(
  roomCode: string,
  onChange: (players: RoomPlayer[]) => void,
  onError?: (error: Error) => void,
): Promise<Unsubscribe> {
  return subscribeToRoomPlayers(roomCode, onChange, onError);
}

/** Live room doc — used to keep the shared discussion timer in sync. */
export async function watchRoom(
  roomCode: string,
  onChange: (room: Room | null) => void,
  onError?: (error: Error) => void,
): Promise<Unsubscribe> {
  return subscribeToRoom(roomCode, onChange, onError);
}

/** Starts the shared countdown if it isn't running yet; returns its end time. */
export async function startRoomTimer(
  roomCode: string,
  durationSeconds: number,
): Promise<number> {
  return ensureRoomTimer(roomCode, durationSeconds);
}

/** Judge-only control — pushes the shared countdown back by N seconds. */
export async function extendRoomTimer(
  roomCode: string,
  extraSeconds: number,
): Promise<void> {
  return addRoomTime(roomCode, extraSeconds);
}

export async function seedTeamProposal(input: {
  roomCode: string;
  starter: StarterProposal;
  displayName: string;
}): Promise<TeamProposalDraft> {
  return ensureTeamProposal(input);
}

export async function saveTeamProposal(input: {
  roomCode: string;
  team: TeamId;
  scenarioId: string;
  proposalText: string;
  deltas: Record<CategoryId, number>;
  displayName: string;
}): Promise<void> {
  return submitTeamProposal(input);
}

export async function watchTeamProposal(
  roomCode: string,
  team: TeamId,
  onChange: (draft: TeamProposalDraft | null) => void,
  onError?: (error: Error) => void,
): Promise<Unsubscribe> {
  return subscribeToTeamProposal(roomCode, team, onChange, onError);
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
