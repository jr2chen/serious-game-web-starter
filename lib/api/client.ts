import type {
  CategoryId,
  CategoryTotals,
  HiddenRole,
  ProposalVote,
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
import { getMyUid } from "@/lib/firebase/auth";
import {
  addRoomTime,
  createRoom as createFirestoreRoom,
  ensureRoomRound,
  ensureRoomTimer,
  getRoom as getFirestoreRoom,
  listRecentRooms,
  startVotingPhase,
  subscribeToRoom,
} from "@/lib/firebase/rooms";
import { advanceAfterVote } from "@/lib/firebase/rounds";
import {
  getMySeatInRoom,
  getRoleForPlayer,
  joinRoomAsPlayer,
  subscribeToRoomPlayers,
  type PlayerSeat,
} from "@/lib/firebase/players";
import {
  ensureTeamProposal,
  reviseTeamProposalDeltas,
  submitTeamProposal,
  subscribeToTeamProposal,
} from "@/lib/firebase/proposals";
import { castVote, subscribeToVotes } from "@/lib/firebase/votes";
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

/** This browser's anonymous uid — used to tell "my vote" apart from others. */
export async function loadMyUid(): Promise<string> {
  return getMyUid();
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

/** Judge-only control — moves everyone to the public proposal vote. */
export async function startVoting(roomCode: string): Promise<void> {
  return startVotingPhase(roomCode);
}

/** Seeds scenario + zeroed city totals on the room the first time anyone stages. */
export async function seedRoomRound(
  roomCode: string,
  scenario: Scenario,
): Promise<{
  scenarioId: string;
  roundOrder: number;
  categoryTotals: CategoryTotals;
}> {
  return ensureRoomRound(roomCode, scenario);
}

/**
 * Judge-only: apply the vote winner's deltas to city totals, then open the
 * next scenario (or finish the session if CSV has no further rounds).
 */
export async function advanceRoomAfterVote(input: {
  roomCode: string;
  winningTeam: TeamId;
  currentTotals: CategoryTotals;
  winningDeltas: Record<CategoryId, number>;
  nextScenario: Scenario | null;
  nextStarters: { red: StarterProposal; blue: StarterProposal } | null;
  judgeName: string;
}): Promise<{ categoryTotals: CategoryTotals; finished: boolean }> {
  return advanceAfterVote(input);
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

/** Judge-only control — revises a team's suggested numbers, not their text. */
export async function reviseTeamProposal(input: {
  roomCode: string;
  team: TeamId;
  deltas: Record<CategoryId, number>;
  revisedByName: string;
}): Promise<void> {
  return reviseTeamProposalDeltas(input);
}

/** Casts (or changes) this browser's public vote — Red/Blue players only. */
export async function castProposalVote(input: {
  roomCode: string;
  choice: TeamId;
  voterTeam: TeamId;
  displayName: string;
  emoji: string;
}): Promise<void> {
  return castVote(input);
}

/** Live, public vote tally for the room. */
export async function watchVotes(
  roomCode: string,
  onChange: (votes: ProposalVote[]) => void,
  onError?: (error: Error) => void,
): Promise<Unsubscribe> {
  return subscribeToVotes(roomCode, onChange, onError);
}

export async function getScenario(scenarioId?: string): Promise<Scenario> {
  if (!scenarioId) {
    return getJson<Scenario>("/api/content/scenario");
  }
  const params = new URLSearchParams({ scenario_id: scenarioId });
  return getJson<Scenario>(`/api/content/scenario?${params}`);
}

/** Next CSV scenario after this round_order, or null when the session ends. */
export async function getNextScenario(
  afterRoundOrder: number,
): Promise<Scenario | null> {
  const params = new URLSearchParams({
    after_round: String(afterRoundOrder),
  });
  return getJson<Scenario | null>(`/api/content/scenario?${params}`);
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
