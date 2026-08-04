import {
  Timestamp,
  collection,
  doc,
  getCountFromServer,
  getDoc,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  getDocs,
} from "firebase/firestore";
import { ensureAnonymousUser } from "@/lib/firebase/auth";
import { getFirebaseDb } from "@/lib/firebase/client";
import { THEMES } from "@/lib/game/themes";
import type { Room, ThemeId } from "@/lib/game/types";

const ROOMS = "rooms";
const ONE_HOUR_MS = 60 * 60 * 1000;
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomCode(length = 4): string {
  let code = "";
  for (let i = 0; i < length; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]!;
  }
  return code;
}

function roomFromDoc(
  id: string,
  data: Record<string, unknown>,
): Room | null {
  const themeId = data.themeId as ThemeId | undefined;
  const theme = themeId ? THEMES[themeId] : undefined;
  if (!theme) return null;

  const createdAt = data.createdAt;
  let createdAtMs = Date.now();
  if (createdAt instanceof Timestamp) {
    createdAtMs = createdAt.toMillis();
  } else if (typeof createdAt === "number") {
    createdAtMs = createdAt;
  }

  const code = typeof data.code === "string" ? data.code : id;
  const playerCount =
    typeof data.playerCount === "number" ? data.playerCount : 0;
  const createdBy =
    typeof data.createdBy === "string" ? data.createdBy : "unknown";

  return {
    id,
    code,
    name: theme.name,
    themeId: theme.id,
    themeName: theme.name,
    icon: theme.icon,
    createdAtMs,
    createdBy,
    playerCount,
  };
}

/** Rooms created in the last hour, newest first. */
export async function listRecentRooms(): Promise<Room[]> {
  await ensureAnonymousUser();
  const db = getFirebaseDb();
  const cutoff = Timestamp.fromMillis(Date.now() - ONE_HOUR_MS);
  const q = query(
    collection(db, ROOMS),
    where("createdAt", ">=", cutoff),
    orderBy("createdAt", "desc"),
  );
  const snap = await getDocs(q);
  const rooms: Room[] = [];
  for (const document of snap.docs) {
    const room = roomFromDoc(document.id, document.data());
    if (room) rooms.push(room);
  }
  return rooms;
}

export async function createRoom(themeId: ThemeId): Promise<Room> {
  const user = await ensureAnonymousUser();
  const theme = THEMES[themeId];
  if (!theme) {
    throw new Error(`Unknown theme: ${themeId}`);
  }

  const db = getFirebaseDb();

  for (let attempt = 0; attempt < 8; attempt++) {
    const code = randomCode();
    const ref = doc(db, ROOMS, code);
    const existing = await getDoc(ref);
    if (existing.exists()) continue;

    await setDoc(ref, {
      code,
      themeId: theme.id,
      themeName: theme.name,
      createdAt: serverTimestamp(),
      createdBy: user.uid,
      playerCount: 0,
    });

    return {
      id: code,
      code,
      name: theme.name,
      themeId: theme.id,
      themeName: theme.name,
      icon: theme.icon,
      createdAtMs: Date.now(),
      createdBy: user.uid,
      playerCount: 0,
    };
  }

  throw new Error("Could not allocate a free room code. Try again.");
}

/** Set room.playerCount from the actual players subcollection size. */
export async function syncRoomPlayerCount(roomCode: string): Promise<number> {
  await ensureAnonymousUser();
  const db = getFirebaseDb();
  const countSnap = await getCountFromServer(
    collection(db, ROOMS, roomCode, "players"),
  );
  const playerCount = countSnap.data().count;
  await updateDoc(doc(db, ROOMS, roomCode), { playerCount });
  return playerCount;
}
