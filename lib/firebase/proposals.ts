import {
  Timestamp,
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  type Unsubscribe,
} from "firebase/firestore";
import { ensureAnonymousUser } from "@/lib/firebase/auth";
import { getFirebaseDb } from "@/lib/firebase/client";
import type {
  CategoryId,
  StarterProposal,
  TeamId,
  TeamProposalDraft,
} from "@/lib/game/types";

const ROOMS = "rooms";
const PROPOSALS = "proposals";

const DELTA_KEYS: CategoryId[] = [
  "jobs",
  "housing",
  "accessibility",
  "climate",
  "cost",
];

function clampDelta(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(-2, Math.min(2, Math.round(value)));
}

function draftFromDoc(
  team: TeamId,
  data: Record<string, unknown>,
): TeamProposalDraft | null {
  const scenario_id =
    typeof data.scenario_id === "string" ? data.scenario_id : null;
  const proposal_text =
    typeof data.proposal_text === "string" ? data.proposal_text : null;
  const updatedByUid =
    typeof data.updatedByUid === "string" ? data.updatedByUid : "";
  const updatedByName =
    typeof data.updatedByName === "string" ? data.updatedByName : "";

  if (!scenario_id || proposal_text === null) return null;

  const deltas: Record<CategoryId, number> = {
    jobs: 0,
    housing: 0,
    accessibility: 0,
    climate: 0,
    cost: 0,
  };
  for (const key of DELTA_KEYS) {
    const raw = Number(data[key]);
    if (!Number.isFinite(raw)) return null;
    deltas[key] = clampDelta(raw);
  }

  const updatedAt = data.updatedAt;
  let updatedAtMs = Date.now();
  if (updatedAt instanceof Timestamp) {
    updatedAtMs = updatedAt.toMillis();
  } else if (typeof updatedAt === "number") {
    updatedAtMs = updatedAt;
  }

  return {
    team,
    scenario_id,
    proposal_text,
    ...deltas,
    updatedAtMs,
    updatedByUid,
    updatedByName,
  };
}

function proposalRef(roomCode: string, team: TeamId) {
  const db = getFirebaseDb();
  return doc(db, ROOMS, roomCode, PROPOSALS, team);
}

/**
 * Create the team draft from the CSV starter if missing.
 * Concurrent first writes: last create wins; both start from the same starter.
 */
export async function ensureTeamProposal(input: {
  roomCode: string;
  starter: StarterProposal;
  displayName: string;
}): Promise<TeamProposalDraft> {
  const user = await ensureAnonymousUser();
  const ref = proposalRef(input.roomCode, input.starter.team);
  const existing = await getDoc(ref);
  if (existing.exists()) {
    const draft = draftFromDoc(
      input.starter.team,
      existing.data() as Record<string, unknown>,
    );
    if (draft) return draft;
  }

  await setDoc(ref, {
    team: input.starter.team,
    scenario_id: input.starter.scenario_id,
    proposal_text: input.starter.proposal_text,
    jobs: clampDelta(input.starter.jobs),
    housing: clampDelta(input.starter.housing),
    accessibility: clampDelta(input.starter.accessibility),
    climate: clampDelta(input.starter.climate),
    cost: clampDelta(input.starter.cost),
    updatedAt: serverTimestamp(),
    updatedByUid: user.uid,
    updatedByName: input.displayName,
  });

  const seeded = await getDoc(ref);
  const draft = draftFromDoc(
    input.starter.team,
    (seeded.data() ?? {}) as Record<string, unknown>,
  );
  if (!draft) {
    throw new Error("Could not seed team proposal");
  }
  return draft;
}

/** Full overwrite — last Submit wins for text and all five deltas. */
export async function submitTeamProposal(input: {
  roomCode: string;
  team: TeamId;
  scenarioId: string;
  proposalText: string;
  deltas: Record<CategoryId, number>;
  displayName: string;
}): Promise<void> {
  const user = await ensureAnonymousUser();
  const text = input.proposalText.trim();
  if (!text) {
    throw new Error("Proposal text cannot be empty");
  }

  await setDoc(proposalRef(input.roomCode, input.team), {
    team: input.team,
    scenario_id: input.scenarioId,
    proposal_text: text,
    jobs: clampDelta(input.deltas.jobs),
    housing: clampDelta(input.deltas.housing),
    accessibility: clampDelta(input.deltas.accessibility),
    climate: clampDelta(input.deltas.climate),
    cost: clampDelta(input.deltas.cost),
    updatedAt: serverTimestamp(),
    updatedByUid: user.uid,
    updatedByName: input.displayName,
  });
}

export async function subscribeToTeamProposal(
  roomCode: string,
  team: TeamId,
  onChange: (draft: TeamProposalDraft | null) => void,
  onError?: (error: Error) => void,
): Promise<Unsubscribe> {
  await ensureAnonymousUser();
  return onSnapshot(
    proposalRef(roomCode, team),
    (snap) => {
      if (!snap.exists()) {
        onChange(null);
        return;
      }
      onChange(draftFromDoc(team, snap.data() as Record<string, unknown>));
    },
    (error) => {
      onError?.(error);
    },
  );
}
