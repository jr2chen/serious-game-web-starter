const ROOM_KEY = "commons.activeRoomCode";

export function rememberActiveRoom(roomCode: string): void {
  try {
    sessionStorage.setItem(ROOM_KEY, roomCode);
  } catch {
    // sessionStorage may be unavailable
  }
}

export function readActiveRoomCode(): string | null {
  try {
    return sessionStorage.getItem(ROOM_KEY);
  } catch {
    return null;
  }
}

export function clearActiveRoom(): void {
  try {
    sessionStorage.removeItem(ROOM_KEY);
  } catch {
    // ignore
  }
}
