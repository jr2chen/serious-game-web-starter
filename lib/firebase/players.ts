import {
  Timestamp,
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  type Unsubscribe,
} from "firebase/firestore";
import { ensureAnonymousUser } from "@/lib/firebase/auth";
import { getFirebaseDb } from "@/lib/firebase/client";
import { syncRoomPlayerCount } from "@/lib/firebase/rooms";
import { CATEGORIES } from "@/lib/game/constants";
import type {
  CategoryId,
  ComparisonOp,
  HiddenRole,
  RoomPlayer,
  TeamId,
} from "@/lib/game/types";
import { isComparisonOp } from "@/lib/game/scoring";

const ROOMS = "rooms";
const CATEGORY_IDS = new Set<string>(CATEGORIES.map((c) => c.id));

export type PlayerSeat = {
  player: RoomPlayer;
  role: HiddenRole;
};

function playerFromDoc(
  id: string,
  data: Record<string, unknown>,
): RoomPlayer | null {
  const displayName =
    typeof data.displayName === "string" ? data.displayName : null;
  const emoji = typeof data.emoji === "string" ? data.emoji : null;
  const team = data.team === "red" || data.team === "blue" ? data.team : null;
  if (!displayName || !emoji || !team) return null;

  const joinedAt = data.joinedAt;
  let joinedAtMs = Date.now();
  if (joinedAt instanceof Timestamp) {
    joinedAtMs = joinedAt.toMillis();
  } else if (typeof joinedAt === "number") {
    joinedAtMs = joinedAt;
  }

  return { id, displayName, emoji, team, joinedAtMs };
}

function roleFromDoc(data: Record<string, unknown>): HiddenRole | null {
  const role_id = typeof data.role_id === "string" ? data.role_id : null;
  const role_name = typeof data.role_name === "string" ? data.role_name : null;
  const description =
    typeof data.description === "string" ? data.description : null;
  const target_category =
    typeof data.target_category === "string" ? data.target_category : null;
  const comparison = data.comparison;
  const threshold = Number(data.threshold);

  if (
    !role_id ||
    !role_name ||
    !description ||
    !target_category ||
    !CATEGORY_IDS.has(target_category) ||
    typeof comparison !== "string" ||
    !isComparisonOp(comparison) ||
    !Number.isFinite(threshold)
  ) {
    return null;
  }

  return {
    role_id,
    role_name,
    description,
    target_category: target_category as CategoryId,
    comparison: comparison as ComparisonOp,
    threshold,
  };
}

/**
 * Write public roster fields + private role secret, then sync room.playerCount
 * from the players collection size (no increment).
 */
export async function joinRoomAsPlayer(input: {
  roomCode: string;
  displayName: string;
  emoji: string;
  team: TeamId;
  role: HiddenRole;
}): Promise<void> {
  const user = await ensureAnonymousUser();
  const db = getFirebaseDb();
  const playerRef = doc(db, ROOMS, input.roomCode, "players", user.uid);
  const secretRef = doc(db, ROOMS, input.roomCode, "secrets", user.uid);

  await setDoc(playerRef, {
    displayName: input.displayName,
    emoji: input.emoji,
    team: input.team,
    joinedAt: serverTimestamp(),
  });

  await setDoc(secretRef, {
    role_id: input.role.role_id,
    role_name: input.role.role_name,
    description: input.role.description,
    target_category: input.role.target_category,
    comparison: input.role.comparison,
    threshold: input.role.threshold,
  });

  await syncRoomPlayerCount(input.roomCode);
}

/** Load this browser's seat in a room, if it still exists. */
export async function getMySeatInRoom(
  roomCode: string,
): Promise<PlayerSeat | null> {
  const user = await ensureAnonymousUser();
  const db = getFirebaseDb();
  const playerSnap = await getDoc(
    doc(db, ROOMS, roomCode, "players", user.uid),
  );
  const secretSnap = await getDoc(
    doc(db, ROOMS, roomCode, "secrets", user.uid),
  );
  if (!playerSnap.exists() || !secretSnap.exists()) return null;

  const player = playerFromDoc(playerSnap.id, playerSnap.data());
  const role = roleFromDoc(secretSnap.data());
  if (!player || !role) return null;
  return { player, role };
}

/** Live public roster — does not include hidden roles. */
export async function subscribeToRoomPlayers(
  roomCode: string,
  onChange: (players: RoomPlayer[]) => void,
  onError?: (error: Error) => void,
): Promise<Unsubscribe> {
  await ensureAnonymousUser();
  const db = getFirebaseDb();
  const q = query(
    collection(db, ROOMS, roomCode, "players"),
    orderBy("joinedAt", "asc"),
  );

  return onSnapshot(
    q,
    (snap) => {
      const players: RoomPlayer[] = [];
      for (const document of snap.docs) {
        const player = playerFromDoc(document.id, document.data());
        if (player) players.push(player);
      }
      onChange(players);
    },
    (error) => {
      onError?.(error);
    },
  );
}
