import {
  collection,
  doc,
  getDocs,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
import { ensureAnonymousUser } from "@/lib/firebase/auth";
import { getFirebaseDb } from "@/lib/firebase/client";
import { PROPOSAL_DELTA_LIMIT } from "@/lib/game/constants";
import type {
  CategoryId,
  CategoryTotals,
  Scenario,
  StarterProposal,
  TeamId,
} from "@/lib/game/types";

const ROOMS = "rooms";
const PROPOSALS = "proposals";
const VOTES = "votes";

const CATEGORY_KEYS: CategoryId[] = [
  "jobs",
  "housing",
  "accessibility",
  "climate",
  "cost",
];

function clampDelta(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(
    -PROPOSAL_DELTA_LIMIT,
    Math.min(PROPOSAL_DELTA_LIMIT, Math.round(value)),
  );
}

function applyDeltas(
  base: CategoryTotals,
  deltas: Record<CategoryId, number>,
): CategoryTotals {
  const next = { ...base };
  for (const key of CATEGORY_KEYS) {
    next[key] = Math.round(base[key] + clampDelta(deltas[key]));
  }
  return next;
}

function starterWrite(
  starter: StarterProposal,
  updatedByUid: string,
  updatedByName: string,
) {
  return {
    team: starter.team,
    scenario_id: starter.scenario_id,
    proposal_text: starter.proposal_text,
    jobs: clampDelta(starter.jobs),
    housing: clampDelta(starter.housing),
    accessibility: clampDelta(starter.accessibility),
    climate: clampDelta(starter.climate),
    cost: clampDelta(starter.cost),
    updatedAt: serverTimestamp(),
    updatedByUid,
    updatedByName,
  };
}

/**
 * Judge control after voting: apply the winning proposal's deltas to the
 * shared city totals, then either open the next scenario (fresh starters,
 * cleared votes, restarted timer, phase → discuss) or mark the session
 * complete when CSV has no further rounds.
 */
export async function advanceAfterVote(input: {
  roomCode: string;
  winningTeam: TeamId;
  currentTotals: CategoryTotals;
  winningDeltas: Record<CategoryId, number>;
  nextScenario: Scenario | null;
  nextStarters: { red: StarterProposal; blue: StarterProposal } | null;
  judgeName: string;
}): Promise<{ categoryTotals: CategoryTotals; finished: boolean }> {
  const user = await ensureAnonymousUser();
  const db = getFirebaseDb();
  const categoryTotals = applyDeltas(
    input.currentTotals,
    input.winningDeltas,
  );
  const batch = writeBatch(db);
  const roomRef = doc(db, ROOMS, input.roomCode);

  if (input.nextScenario && input.nextStarters) {
    const timerEndsAtMs =
      Date.now() + input.nextScenario.discussion_seconds * 1000;
    batch.update(roomRef, {
      categoryTotals,
      scenarioId: input.nextScenario.scenario_id,
      roundOrder: input.nextScenario.round_order,
      phase: "discuss",
      timerEndsAtMs,
      lastWinnerTeam: input.winningTeam,
    });
    const byName = `Judge · ${input.judgeName}`;
    batch.set(
      doc(db, ROOMS, input.roomCode, PROPOSALS, "red"),
      starterWrite(input.nextStarters.red, user.uid, byName),
    );
    batch.set(
      doc(db, ROOMS, input.roomCode, PROPOSALS, "blue"),
      starterWrite(input.nextStarters.blue, user.uid, byName),
    );
  } else {
    batch.update(roomRef, {
      categoryTotals,
      phase: "complete",
      lastWinnerTeam: input.winningTeam,
    });
  }

  const votesSnap = await getDocs(
    collection(db, ROOMS, input.roomCode, VOTES),
  );
  for (const voteDoc of votesSnap.docs) {
    batch.delete(voteDoc.ref);
  }

  await batch.commit();
  return { categoryTotals, finished: !input.nextScenario };
}
