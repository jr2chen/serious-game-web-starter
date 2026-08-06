import {
  Timestamp,
  collection,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  type Unsubscribe,
} from "firebase/firestore";
import { ensureAnonymousUser } from "@/lib/firebase/auth";
import { getFirebaseDb } from "@/lib/firebase/client";
import type { ProposalVote, TeamId } from "@/lib/game/types";

const ROOMS = "rooms";
const VOTES = "votes";

function voteFromDoc(
  id: string,
  data: Record<string, unknown>,
): ProposalVote | null {
  const choice =
    data.choice === "red" || data.choice === "blue" ? data.choice : null;
  const displayName =
    typeof data.displayName === "string" ? data.displayName : null;
  const emoji = typeof data.emoji === "string" ? data.emoji : null;
  if (!choice || !displayName || !emoji) return null;

  const updatedAt = data.updatedAt;
  let updatedAtMs = Date.now();
  if (updatedAt instanceof Timestamp) {
    updatedAtMs = updatedAt.toMillis();
  } else if (typeof updatedAt === "number") {
    updatedAtMs = updatedAt;
  }

  return { playerId: id, choice, displayName, emoji, updatedAtMs };
}

/** Cast (or change) this browser's public vote for which proposal to adopt. */
export async function castVote(input: {
  roomCode: string;
  choice: TeamId;
  displayName: string;
  emoji: string;
}): Promise<void> {
  const user = await ensureAnonymousUser();
  const db = getFirebaseDb();
  await setDoc(doc(db, ROOMS, input.roomCode, VOTES, user.uid), {
    choice: input.choice,
    displayName: input.displayName,
    emoji: input.emoji,
    updatedAt: serverTimestamp(),
  });
}

/** Live, public vote tally — everyone in the room can read every vote. */
export async function subscribeToVotes(
  roomCode: string,
  onChange: (votes: ProposalVote[]) => void,
  onError?: (error: Error) => void,
): Promise<Unsubscribe> {
  await ensureAnonymousUser();
  const db = getFirebaseDb();
  return onSnapshot(
    collection(db, ROOMS, roomCode, VOTES),
    (snap) => {
      const votes: ProposalVote[] = [];
      for (const document of snap.docs) {
        const vote = voteFromDoc(document.id, document.data());
        if (vote) votes.push(vote);
      }
      onChange(votes);
    },
    (error) => {
      onError?.(error);
    },
  );
}
