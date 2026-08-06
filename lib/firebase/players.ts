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
  SeatRole,
} from "@/lib/game/types";
import { isComparisonOp } from "@/lib/game/scoring";

const ROOMS = "rooms";
const CATEGORY_IDS = new Set<string>(CATEGORIES.map((c) => c.id));

export type PlayerSeat = {
  player: RoomPlayer;
  /** Judges have no hidden role. */
  role: HiddenRole | null;
};

function seatRoleFromData(value: unknown): SeatRole | null {
  return value === "red" || value === "blue" || value === "judge"
    ? value
    : null;
}

function playerFromDoc(
  id: string,
  data: Record<string, unknown>,
): RoomPlayer | null {
  const displayName =
    typeof data.displayName === "string" ? data.displayName : null;
  const emoji = typeof data.emoji === "string" ? data.emoji : null;
  const team = seatRoleFromData(data.team);
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
  // Older seats may lack points — treat missing as 1 so reveal still works.
  const pointsRaw = data.points;
  const points =
    pointsRaw === undefined || pointsRaw === null ? 1 : Number(pointsRaw);

  if (
    !role_id ||
    !role_name ||
    !description ||
    !target_category ||
    !CATEGORY_IDS.has(target_category) ||
    typeof comparison !== "string" ||
    !isComparisonOp(comparison) ||
    !Number.isFinite(threshold) ||
    !Number.isFinite(points) ||
    !Number.isInteger(points) ||
    points < 0
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
    points,
  };
}

/**
 * Write public roster fields + private role secret (skipped for judges,
 * who have no hidden role), then sync room.playerCount.
 */
export async function joinRoomAsPlayer(input: {
  roomCode: string;
  displayName: string;
  emoji: string;
  team: SeatRole;
  role: HiddenRole | null;
}): Promise<void> {
  const user = await ensureAnonymousUser();
  const db = getFirebaseDb();
  const playerRef = doc(db, ROOMS, input.roomCode, "players", user.uid);

  await setDoc(playerRef, {
    displayName: input.displayName,
    emoji: input.emoji,
    team: input.team,
    joinedAt: serverTimestamp(),
  });

  if (input.role) {
    const secretRef = doc(db, ROOMS, input.roomCode, "secrets", user.uid);
    await setDoc(secretRef, {
      role_id: input.role.role_id,
      role_name: input.role.role_name,
      description: input.role.description,
      target_category: input.role.target_category,
      comparison: input.role.comparison,
      threshold: input.role.threshold,
      points: input.role.points,
    });
  }

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
  if (!playerSnap.exists()) return null;
  const player = playerFromDoc(playerSnap.id, playerSnap.data());
  if (!player) return null;

  if (player.team === "judge") {
    return { player, role: null };
  }

  const secretSnap = await getDoc(
    doc(db, ROOMS, roomCode, "secrets", user.uid),
  );
  if (!secretSnap.exists()) return null;
  const role = roleFromDoc(secretSnap.data());
  if (!role) return null;
  return { player, role };
}

/** Read one player's hidden role — judges can read any player's role. */
export async function getRoleForPlayer(
  roomCode: string,
  playerId: string,
): Promise<HiddenRole | null> {
  await ensureAnonymousUser();
  const db = getFirebaseDb();
  const snap = await getDoc(doc(db, ROOMS, roomCode, "secrets", playerId));
  if (!snap.exists()) return null;
  return roleFromDoc(snap.data());
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
