"use client";

import { useCallback, useEffect, useState } from "react";
import QRCode from "react-qr-code";
import {
  assignHiddenRole,
  createRoom,
  enterRoom,
  getCategoryTotals,
  getRoom,
  getScenario,
  getStarterProposal,
  listRooms,
  loadMySeat,
  watchRoomPlayers,
} from "@/lib/api/client";
import { isFirebaseConfigured } from "@/lib/firebase/client";
import type {
  CategoryId,
  CategoryTotals,
  HiddenRole,
  Room,
  RoomPlayer,
  Scenario,
  StarterProposal,
  TeamId,
  ThemeId,
} from "@/lib/game/types";
import { CATEGORIES, EMOJI_OPTIONS, TEAMS } from "@/lib/game/constants";
import { roleRuleLabel } from "@/lib/game/scoring";
import {
  clearActiveRoom,
  readActiveRoomCode,
  rememberActiveRoom,
} from "@/lib/game/session";
import { THEME_LIST } from "@/lib/game/themes";

type Screen = "main" | "create" | "entry" | "stage";

type EntryMode = "join" | "create";

const DELTA_KEYS: CategoryId[] = [
  "jobs",
  "housing",
  "accessibility",
  "climate",
  "cost",
];

function formatDelta(value: number): string {
  return value > 0 ? `+${value}` : String(value);
}

function formatDiscussion(seconds: number): string {
  const minutes = Math.round(seconds / 60);
  return minutes === 1 ? "1 minute" : `${minutes} minutes`;
}

function formatAge(createdAtMs: number): string {
  const minutes = Math.max(0, Math.floor((Date.now() - createdAtMs) / 60000));
  if (minutes < 1) return "Just now";
  if (minutes === 1) return "1 min ago";
  return `${minutes} min ago`;
}

/** mm:ss for the mock discussion timer. */
function formatTimer(seconds: number): string {
  const clamped = Math.max(0, Math.round(seconds));
  const mins = Math.floor(clamped / 60);
  const secs = clamped % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

const SCORE_ABBR: Record<CategoryId, string> = {
  jobs: "Jobs",
  housing: "Housing",
  accessibility: "Access",
  climate: "Climate",
  cost: "Cost",
};

/** Which team a category counts toward, for coloring the score chip. */
function scoreTeamOf(categoryId: CategoryId): TeamId | "shared" {
  if (TEAMS.red.goalCategories.includes(categoryId)) return "red";
  if (TEAMS.blue.goalCategories.includes(categoryId)) return "blue";
  return "shared";
}

/** Chip background/border classes for a score category, by team. Always
 * a single class string per property so utility precedence stays unambiguous. */
function scoreChipTint(teamOf: TeamId | "shared"): string {
  if (teamOf === "red") return "bg-team-red-soft border-team-red-line";
  if (teamOf === "blue") return "bg-team-blue-soft border-team-blue-line";
  return "";
}

function scoreValueTint(teamOf: TeamId | "shared"): string {
  if (teamOf === "red") return "text-rust";
  if (teamOf === "blue") return "text-team-blue";
  return "text-ink";
}

const CARD_ROW =
  "card flex w-full cursor-pointer items-center gap-3 px-4 py-[14px] text-left font-sans text-inherit transition-[border-color,transform] duration-150 hover:border-clay-deep active:scale-[0.99]";

const ROOM_TAG =
  "flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-lg bg-[#efe6d8] font-display text-[15px] font-semibold text-[#6f5230]";

const ROOM_NAME = "mb-[2px] text-[14.5px] font-semibold";
const ROOM_META = "text-[12.5px] text-ink-soft";
const LOAD_ERROR = "mb-4 text-[13px] leading-[1.4] text-rust";
const FIELD_LABEL = "label-mono mb-2 block";
const OPT_CARD =
  "card flex flex-col gap-1 px-4 py-[14px] text-left font-sans text-inherit cursor-pointer";

export default function CommonsApp() {
  const [screen, setScreen] = useState<Screen>("main");
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [roomsError, setRoomsError] = useState<string | null>(null);
  const [entryMode, setEntryMode] = useState<EntryMode | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [selectedThemeId, setSelectedThemeId] = useState<ThemeId>("municipal");
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState<string | null>(null);
  const [team, setTeam] = useState<TeamId | null>(null);
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [starter, setStarter] = useState<StarterProposal | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [hiddenRole, setHiddenRole] = useState<HiddenRole | null>(null);
  const [categories, setCategories] = useState<CategoryTotals | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [roster, setRoster] = useState<RoomPlayer[]>([]);
  const [rosterOpen, setRosterOpen] = useState(false);
  const [roleOpen, setRoleOpen] = useState(false);
  const [scoreInfoOpen, setScoreInfoOpen] = useState(false);
  const [rejoinCode, setRejoinCode] = useState<string | null>(null);
  const [rejoining, setRejoining] = useState(false);
  /** Current page URL for the main-screen QR (preview / prod / localhost). */
  const [pageUrl, setPageUrl] = useState("");

  const refreshRooms = useCallback(async () => {
    if (!isFirebaseConfigured()) {
      setRooms([]);
      setRoomsError(
        "Firebase is not configured. Copy .env.local.example to .env.local — see docs/FIREBASE.md.",
      );
      setRoomsLoading(false);
      return;
    }
    setRoomsLoading(true);
    setRoomsError(null);
    try {
      setRooms(await listRooms());
    } catch (error) {
      setRooms([]);
      setRoomsError(
        error instanceof Error ? error.message : "Could not load rooms",
      );
    } finally {
      setRoomsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshRooms();
  }, [refreshRooms]);

  useEffect(() => {
    setPageUrl(window.location.href);
  }, []);

  useEffect(() => {
    if (!isFirebaseConfigured()) return;

    let active = true;
    const code = readActiveRoomCode();
    if (!code) return;

    void (async () => {
      try {
        const seat = await loadMySeat(code);
        if (!active) return;
        if (seat) setRejoinCode(code);
        else clearActiveRoom();
      } catch {
        if (active) clearActiveRoom();
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (screen !== "stage" || !selectedRoom) {
      setRoster([]);
      return;
    }

    let active = true;
    let unsub: (() => void) | undefined;

    void watchRoomPlayers(
      selectedRoom.code,
      (players) => {
        if (active) setRoster(players);
      },
      (error) => {
        if (active) setLoadError(error.message);
      },
    ).then((unsubscribe) => {
      if (!active) {
        unsubscribe();
        return;
      }
      unsub = unsubscribe;
    });

    return () => {
      active = false;
      unsub?.();
    };
  }, [screen, selectedRoom]);

  /** Mock countdown only — not synced across players or persisted. */
  useEffect(() => {
    if (screen !== "stage") return;
    const interval = setInterval(() => {
      setSecondsLeft((prev) => (prev === null || prev <= 0 ? prev : prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [screen]);

  function goMain() {
    clearActiveRoom();
    setRejoinCode(null);
    setScreen("main");
    setEntryMode(null);
    setSelectedRoom(null);
    setSelectedThemeId("municipal");
    setCreating(false);
    setName("");
    setEmoji(null);
    setTeam(null);
    setScenario(null);
    setStarter(null);
    setSecondsLeft(null);
    setHiddenRole(null);
    setCategories(null);
    setLoadError(null);
    setRoster([]);
    setRosterOpen(false);
    setRoleOpen(false);
    setScoreInfoOpen(false);
    void refreshRooms();
  }

  function startJoin(room: Room) {
    setEntryMode("join");
    setSelectedRoom(room);
    setName("");
    setEmoji(null);
    setTeam(null);
    setLoadError(null);
    setScreen("entry");
  }

  function openCreate() {
    setSelectedThemeId("municipal");
    setLoadError(null);
    setScreen("create");
  }

  async function confirmCreate() {
    setCreating(true);
    setLoadError(null);
    try {
      const room = await createRoom(selectedThemeId);
      setEntryMode("create");
      setSelectedRoom(room);
      setName("");
      setEmoji(null);
      setTeam(null);
      setScreen("entry");
    } catch (error) {
      setLoadError(
        error instanceof Error ? error.message : "Could not create room",
      );
    } finally {
      setCreating(false);
    }
  }

  async function confirmEntry() {
    if (!team || !selectedRoom) return;

    const displayName = name.trim() || "Player";
    const mark = emoji ?? "🙂";

    try {
      setLoadError(null);
      const [nextScenario, role, totals] = await Promise.all([
        getScenario(selectedRoom.id),
        assignHiddenRole(team),
        getCategoryTotals(),
      ]);
      const proposal = await getStarterProposal(nextScenario.scenario_id, team);
      await enterRoom({
        roomCode: selectedRoom.code,
        displayName,
        emoji: mark,
        team,
        role,
      });

      setName(displayName);
      setEmoji(mark);
      setScenario(nextScenario);
      setStarter(proposal);
      setHiddenRole(role);
      setCategories(totals);
      setSecondsLeft(nextScenario.discussion_seconds);
      rememberActiveRoom(selectedRoom.code);
      setRejoinCode(null);
      setScreen("stage");
    } catch (error) {
      setLoadError(
        error instanceof Error ? error.message : "Could not load game content",
      );
    }
  }

  async function rejoinRoom() {
    if (!rejoinCode) return;
    setRejoining(true);
    setLoadError(null);
    try {
      const [room, seat] = await Promise.all([
        getRoom(rejoinCode),
        loadMySeat(rejoinCode),
      ]);
      if (!room || !seat) {
        clearActiveRoom();
        setRejoinCode(null);
        throw new Error("That room seat is no longer available.");
      }

      const [nextScenario, totals] = await Promise.all([
        getScenario(room.id),
        getCategoryTotals(),
      ]);
      const proposal = await getStarterProposal(
        nextScenario.scenario_id,
        seat.player.team,
      );

      setSelectedRoom(room);
      setName(seat.player.displayName);
      setEmoji(seat.player.emoji);
      setTeam(seat.player.team);
      setScenario(nextScenario);
      setStarter(proposal);
      setHiddenRole(seat.role);
      setCategories(totals);
      setSecondsLeft(nextScenario.discussion_seconds);
      rememberActiveRoom(room.code);
      setRejoinCode(null);
      setScreen("stage");
    } catch (error) {
      setLoadError(
        error instanceof Error ? error.message : "Could not rejoin room",
      );
    } finally {
      setRejoining(false);
    }
  }

  const teamInfo = team ? TEAMS[team] : null;
  const redCount = roster.filter((p) => p.team === "red").length;
  const blueCount = roster.filter((p) => p.team === "blue").length;

  return (
    <div className="relative w-[420px] overflow-visible rounded-[20px] border border-line bg-paper shadow-[0_1px_0_rgba(0,0,0,0.03)] max-[480px]:min-h-dvh max-[480px]:w-full max-[480px]:rounded-none max-[480px]:border-none">
      {screen === "main" && (
        <div className="flex flex-col">
          <div className="relative overflow-hidden bg-forest px-[28px] pt-[44px] pb-[28px] text-paper">
            <svg
              className="pointer-events-none absolute top-0 right-0 left-0 h-[220px] opacity-50"
              viewBox="0 0 420 220"
              preserveAspectRatio="none"
              aria-hidden
            >
              <path
                d="M-20,180 C80,150 140,200 220,160 C300,120 340,170 440,140"
                stroke="#FFFFFF"
                strokeWidth="1"
                fill="none"
                opacity="0.15"
              />
              <path
                d="M-20,140 C90,110 150,160 230,120 C310,80 350,130 440,100"
                stroke="#FFFFFF"
                strokeWidth="1"
                fill="none"
                opacity="0.12"
              />
              <path
                d="M-20,100 C100,70 160,120 240,80 C320,40 360,90 440,60"
                stroke="#FFFFFF"
                strokeWidth="1"
                fill="none"
                opacity="0.1"
              />
            </svg>
            <p className="mb-[10px] font-mono text-[11px] tracking-[0.14em] text-[#c9d6c1] uppercase">
              A workshop for shared decisions
            </p>
            <h1 className="mb-3 font-display text-[40px] leading-[1.02] font-semibold tracking-[-0.01em]">
              Commons
            </h1>
            <p className="max-w-[30ch] text-[14.5px] leading-[1.5] text-[#dde6d5]">
              Step into real trade-offs over land, water, and energy — and see
              where the group lands.
            </p>
          </div>
          <div className="flex-1 px-6 pt-6 pb-8">
            {rejoinCode && (
              <div className="mb-6 rounded-xl border border-line bg-[var(--tint-clay-soft)] p-4">
                <p className="mb-3 text-sm leading-[1.4] text-ink">
                  You still have a seat in room <strong>{rejoinCode}</strong>.
                </p>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={rejoining}
                  onClick={() => void rejoinRoom()}
                >
                  {rejoining ? "Rejoining…" : `Rejoin ${rejoinCode}`}
                </button>
                {loadError && screen === "main" && (
                  <p className="mt-[10px] mb-0 text-[13px] leading-[1.4] text-rust">
                    {loadError}
                  </p>
                )}
              </div>
            )}

            <div className="mb-3 flex items-baseline justify-between gap-3">
              <p className="label-mono">Open rooms · last hour</p>
              <button
                type="button"
                className="cursor-pointer border-none bg-transparent p-0 font-mono text-[11px] tracking-[0.06em] text-forest uppercase underline"
                onClick={() => void refreshRooms()}
              >
                Refresh
              </button>
            </div>

            {roomsLoading && (
              <p className="mb-6 text-[13.5px] leading-[1.5] text-ink-soft">
                Loading rooms…
              </p>
            )}
            {!roomsLoading && roomsError && (
              <p className={LOAD_ERROR}>{roomsError}</p>
            )}
            {!roomsLoading && !roomsError && rooms.length === 0 && (
              <p className="mb-6 text-[13.5px] leading-[1.5] text-ink-soft">
                No rooms in the last hour. Create one to get started.
              </p>
            )}
            {!roomsLoading && !roomsError && rooms.length > 0 && (
              <div className="mb-7 flex flex-col gap-[10px]">
                {rooms.map((room) => (
                  <button
                    key={room.id}
                    type="button"
                    className={CARD_ROW}
                    onClick={() => startJoin(room)}
                  >
                    <div className={ROOM_TAG}>{room.icon}</div>
                    <div className="min-w-0 flex-1">
                      <p className={ROOM_NAME}>
                        {room.code} · {room.themeName}
                      </p>
                      <p className={ROOM_META}>{formatAge(room.createdAtMs)}</p>
                    </div>
                    <div className="font-mono text-xs whitespace-nowrap text-ink-soft">
                      {room.playerCount}{" "}
                      {room.playerCount === 1 ? "player" : "players"}
                    </div>
                  </button>
                ))}
              </div>
            )}

            <button
              type="button"
              className="btn btn-primary"
              onClick={openCreate}
            >
              Create room
            </button>

            {pageUrl && (
              <div className="mt-7 flex items-center gap-4 rounded-[10px] border border-line bg-card p-3">
                <div className="shrink-0 rounded-lg bg-white p-2">
                  <QRCode
                    value={pageUrl}
                    size={88}
                    style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                    viewBox="0 0 88 88"
                    aria-label="QR code for this page"
                  />
                </div>
                <div className="min-w-0">
                  <p className="label-mono mb-1">Scan to open</p>
                  <p className="text-[12.5px] leading-[1.4] text-ink-soft">
                    Join from your phone — same link as this tab (preview, prod,
                    or local).
                  </p>
                  <p className="mt-1 truncate font-mono text-[10px] text-ink-soft">
                    {pageUrl}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {screen === "create" && (
        <div className="flex flex-col">
          <div className="px-6 pt-5">
            <button
              type="button"
              className="flex cursor-pointer items-center gap-[6px] border-none bg-transparent px-0 pt-[6px] pb-[18px] font-mono text-xs text-ink-soft"
              onClick={goMain}
            >
              ← Back
            </button>
          </div>
          <div className="flex flex-1 flex-col px-6 pb-6">
            <h2 className="mb-[6px] font-display text-2xl font-semibold">
              Create a room
            </h2>
            <p className="mb-7 text-[13.5px] text-ink-soft">
              Pick a theme, then share the short room code with your group.
            </p>

            <label className={FIELD_LABEL}>Theme</label>
            <div className="mb-7 flex flex-col gap-[10px]">
              {THEME_LIST.map((theme) => (
                <button
                  key={theme.id}
                  type="button"
                  className={`${OPT_CARD}${
                    selectedThemeId === theme.id
                      ? " border-forest bg-forest-line"
                      : ""
                  }`}
                  onClick={() => setSelectedThemeId(theme.id)}
                >
                  <span className="text-[14.5px] font-semibold">
                    {theme.icon} {theme.name}
                  </span>
                  <span className="text-[12.5px] text-ink-soft">
                    {theme.blurb}
                  </span>
                </button>
              ))}
            </div>

            {loadError && <p className={LOAD_ERROR}>{loadError}</p>}

            <div className="mt-auto">
              <button
                type="button"
                className="btn btn-primary"
                disabled={creating}
                onClick={() => void confirmCreate()}
              >
                {creating ? "Creating…" : "Create and continue"}
              </button>
            </div>
          </div>
        </div>
      )}

      {screen === "entry" && selectedRoom && (
        <div className="flex flex-col">
          <div className="px-6 pt-5">
            <button
              type="button"
              className="flex cursor-pointer items-center gap-[6px] border-none bg-transparent px-0 pt-[6px] pb-[18px] font-mono text-xs text-ink-soft"
              onClick={goMain}
            >
              ← Back
            </button>
            <div className="card mb-7 flex items-center gap-3 px-4 py-[14px]">
              <div className={ROOM_TAG}>{selectedRoom.icon}</div>
              <div className="min-w-0 flex-1">
                <p className={ROOM_NAME}>
                  {entryMode === "create"
                    ? `Room ${selectedRoom.code} ready`
                    : `Joining ${selectedRoom.code}`}
                </p>
                <p className={ROOM_META}>
                  {selectedRoom.themeName}
                  {entryMode === "join"
                    ? ` · ${selectedRoom.playerCount} players`
                    : " · share this code"}
                </p>
              </div>
            </div>
          </div>
          <div className="flex flex-1 flex-col px-6 pb-6">
            <h2 className="mb-[6px] font-display text-2xl font-semibold">
              Who&apos;s joining?
            </h2>
            <p className="mb-7 text-[13.5px] text-ink-soft">
              Pick a name, a mark, and a visible team. Your hidden role is
              assigned privately when you enter.
            </p>

            <label className={FIELD_LABEL} htmlFor="name-input">
              Your name
            </label>
            <input
              className="mb-6 w-full rounded-[10px] border border-line bg-card px-[14px] py-[13px] font-sans text-base text-ink focus:border-clay-deep focus:outline-none"
              id="name-input"
              type="text"
              placeholder="e.g. Priya"
              maxLength={20}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />

            <label className={FIELD_LABEL}>Visible team</label>
            <div className="mb-7 flex flex-col gap-[10px]">
              {(["red", "blue"] as const).map((id) => (
                <button
                  key={id}
                  type="button"
                  className={`${OPT_CARD}${
                    team === id
                      ? id === "red"
                        ? " border-rust bg-team-red-soft"
                        : " border-team-blue bg-team-blue-soft"
                      : ""
                  }`}
                  onClick={() => setTeam(id)}
                >
                  <span className="text-[14.5px] font-semibold">
                    {TEAMS[id].name}
                  </span>
                  <span className="text-[12.5px] text-ink-soft">
                    {TEAMS[id].goalLabel}
                  </span>
                </button>
              ))}
            </div>

            <label className={FIELD_LABEL}>Pick a mark</label>
            <div className="mb-6 grid grid-cols-6 gap-2">
              {EMOJI_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={`flex aspect-square cursor-pointer items-center justify-center rounded-[10px] border border-line bg-card text-xl${
                    emoji === option ? " border-forest bg-forest-line" : ""
                  }`}
                  onClick={() => setEmoji(option)}
                >
                  {option}
                </button>
              ))}
            </div>

            {loadError && <p className={LOAD_ERROR}>{loadError}</p>}

            <div className="mt-auto">
              <button
                type="button"
                className="btn btn-primary"
                disabled={!team}
                onClick={() => void confirmEntry()}
              >
                Confirm and enter
              </button>
            </div>
          </div>
        </div>
      )}

      {screen === "stage" &&
        scenario &&
        teamInfo &&
        hiddenRole &&
        categories &&
        starter && (
          <div className="relative flex h-[min(860px,calc(100dvh-64px))] max-h-[min(860px,calc(100dvh-64px))] flex-col max-[480px]:h-dvh max-[480px]:max-h-dvh">
            <div className="flex shrink-0 flex-col gap-[10px] border-b border-line px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="flex shrink-0 items-center gap-2 rounded-[20px] border border-line bg-card py-[5px] pr-3 pl-[5px]">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-forest-line text-[13px]">
                    {emoji ?? "🙂"}
                  </div>
                  <span className="text-[12.5px] font-medium">
                    {name || "Player"}
                  </span>
                </div>
                <button
                  type="button"
                  className={`inline-flex max-w-[220px] cursor-pointer items-center gap-[6px] rounded-[20px] border border-dashed py-[5px] pr-2 pl-[10px] font-sans text-inherit shadow-[0_0_0_2px_var(--tint-clay-ring)] transition-[border-color,box-shadow,transform] duration-150 hover:border-solid hover:shadow-[0_0_0_3px_var(--tint-clay-ring-strong)] active:scale-[0.98] ${
                    teamInfo.id === "red"
                      ? "bg-team-red-soft border-team-red-line"
                      : "bg-team-blue-soft border-team-blue-line"
                  } ${roleOpen ? "border-solid" : ""}`}
                  onClick={() => setRoleOpen((open) => !open)}
                  aria-expanded={roleOpen}
                  aria-controls="role-panel"
                >
                  <span className="min-w-0 truncate text-[11.5px] font-semibold">
                    {teamInfo.id === "red" ? "Red" : "Blue"} ·{" "}
                    {hiddenRole.role_name}
                  </span>
                  <span
                    className="shrink-0 rounded-full bg-[var(--tint-card-bright)] px-[6px] py-[2px] font-mono text-[9px] tracking-[0.06em] text-clay-deep uppercase"
                    aria-hidden
                  >
                    {roleOpen ? "Hide" : "Role"}
                  </span>
                  <span className="shrink-0 text-[10px] text-ink-soft" aria-hidden>
                    {roleOpen ? "▴" : "▾"}
                  </span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <div
                  className="no-scrollbar flex min-w-0 flex-1 items-center gap-1 overflow-x-auto"
                  role="group"
                  aria-label="City totals"
                >
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      className={`inline-flex shrink-0 cursor-pointer items-baseline gap-[3px] rounded-lg border border-line bg-card px-[7px] py-1 font-mono text-inherit transition-colors hover:border-clay-deep ${scoreChipTint(scoreTeamOf(cat.id))}`}
                      title={cat.blurb}
                      aria-expanded={scoreInfoOpen}
                      aria-controls="scoreboard-tip"
                      onClick={() => setScoreInfoOpen((open) => !open)}
                    >
                      <span className="text-[9.5px] tracking-[0.02em] text-ink-soft uppercase">
                        {SCORE_ABBR[cat.id]}
                      </span>
                      <span
                        className={`text-[11.5px] font-bold ${scoreValueTint(scoreTeamOf(cat.id))}`}
                      >
                        {categories[cat.id] > 0 ? "+" : ""}
                        {categories[cat.id]}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {scoreInfoOpen && (
                <p
                  className="mb-1 rounded-lg bg-paper-deep px-3 py-[10px] text-xs leading-[1.45] text-ink-soft"
                  id="scoreboard-tip"
                >
                  Red score = Jobs + Housing. Blue score = Accessibility +
                  Climate. Cost is shared.
                </p>
              )}

              <div className="flex flex-wrap items-center justify-between gap-2">
                <div
                  className="chip"
                  aria-label={`Discussion timer ${formatTimer(secondsLeft ?? scenario.discussion_seconds)}`}
                >
                  <span aria-hidden>⏱</span>
                  <span>
                    {formatTimer(secondsLeft ?? scenario.discussion_seconds)}
                  </span>
                </div>
                <div className="chip">
                  <span aria-hidden>#</span>
                  <span>{selectedRoom?.code}</span>
                </div>
                <button
                  type="button"
                  className="chip cursor-pointer transition-colors hover:border-clay-deep"
                  onClick={() => setRosterOpen(true)}
                  aria-label={`Open players list, ${roster.length} in room`}
                >
                  <span aria-hidden>👥</span>
                  <span>
                    {roster.length}{" "}
                    {roster.length === 1 ? "player" : "players"}
                  </span>
                </button>
              </div>
            </div>

            {roleOpen && (
              <button
                type="button"
                className="block w-full shrink-0 cursor-pointer border-0 border-b border-dashed border-clay-deep bg-card px-6 pt-[14px] pb-4 text-left font-sans text-inherit transition-colors duration-150 hover:bg-[var(--tint-clay-hover)]"
                id="role-panel"
                onClick={() => setRoleOpen(false)}
                aria-label="Hide hidden role details"
              >
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="label-mono m-0 text-clay-deep">
                    Private · hidden role
                  </p>
                  <span className="whitespace-nowrap font-mono text-[10px] tracking-[0.04em] text-ink-soft uppercase">
                    Tap to hide <span aria-hidden>▴</span>
                  </span>
                </div>
                <h3 className="mb-2 font-display text-lg font-semibold">
                  {hiddenRole.role_name}
                </h3>
                <p className="mb-[10px] text-sm leading-[1.5]">
                  {hiddenRole.description}
                </p>
                <p className="mb-2 text-[12.5px] leading-[1.45] text-ink-soft">
                  You score 1 point at end of game if{" "}
                  {roleRuleLabel(
                    hiddenRole.target_category,
                    hiddenRole.comparison,
                    hiddenRole.threshold,
                  )}
                  .
                </p>
                <p className="text-xs text-ink-soft">
                  {teamInfo.name} promotes {teamInfo.goalLabel}.
                </p>
              </button>
            )}

            <div className="min-h-0 flex-1 overflow-y-auto px-6 pt-[18px] pb-6">
              <p className="label-mono mb-[10px] text-rust">
                Round {scenario.round_order}
              </p>
              <h2 className="mb-4 font-display text-[26px] leading-[1.15] font-semibold">
                {scenario.title}
              </h2>
              <div className="mb-5 flex flex-wrap gap-2">
                <span className="rounded-md bg-forest-line px-[10px] py-[5px] font-mono text-[11px] text-forest">
                  Discuss {formatDiscussion(scenario.discussion_seconds)}
                </span>
              </div>
              <div className="card mb-5 p-5">
                <p className="mb-[14px] text-[14.5px] leading-[1.7] text-ink last:mb-0">
                  <strong>Problem.</strong> {scenario.problem}
                </p>
                <p className="mb-[14px] text-[14.5px] leading-[1.7] text-ink last:mb-0">
                  <strong>Team task.</strong> {scenario.team_task}
                </p>
              </div>

              <p className="label-mono mb-3">Your team&apos;s starter proposal</p>
              <div className="card mb-2 p-4">
                <p className="mb-[14px] text-sm leading-[1.65]">
                  {starter.proposal_text}
                </p>
                <div className="mb-3 grid grid-cols-5 gap-[6px]">
                  {DELTA_KEYS.map((key) => (
                    <div
                      key={key}
                      className="rounded-lg bg-paper-deep px-1 py-2 text-center"
                    >
                      <span className="mb-1 block font-mono text-[9px] tracking-[0.04em] text-ink-soft uppercase">
                        {CATEGORIES.find((c) => c.id === key)?.name}
                      </span>
                      <span className="block font-display text-base font-semibold">
                        {formatDelta(starter[key])}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="shrink-0 border-t border-line bg-paper px-6 pt-3 pb-4">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={goMain}
              >
                Leave room
              </button>
            </div>

            {rosterOpen && (
              <div
                className="absolute inset-0 z-20 flex items-start justify-end bg-[rgba(35,41,31,0.35)] px-[14px] pt-16 pb-4"
                onClick={() => setRosterOpen(false)}
                role="presentation"
              >
                <div
                  className="w-[min(100%,320px)] max-h-[calc(100%-80px)] overflow-auto rounded-2xl border border-line bg-paper px-4 pt-[18px] pb-5"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="roster-modal-title"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <h2
                      id="roster-modal-title"
                      className="font-display text-xl font-semibold"
                    >
                      In this room
                    </h2>
                    <button
                      type="button"
                      className="cursor-pointer border-none bg-transparent p-1 font-mono text-[11px] tracking-[0.06em] text-ink-soft uppercase underline"
                      onClick={() => setRosterOpen(false)}
                    >
                      Close
                    </button>
                  </div>
                  <p className="mb-4 text-[13px] text-ink-soft">
                    <span className="text-rust">{redCount} Red</span>
                    {" · "}
                    <span className="text-team-blue">{blueCount} Blue</span>
                  </p>
                  <div className="flex flex-col gap-2">
                    {roster.length === 0 && (
                      <p className="text-[13.5px] leading-[1.5] text-ink-soft">
                        Waiting for players…
                      </p>
                    )}
                    {roster.map((player) => (
                      <div
                        key={player.id}
                        className={`flex items-center gap-[10px] rounded-[10px] border-t border-r border-b border-l-[3px] border-t-line border-r-line border-b-line bg-card px-3 py-[10px] ${
                          player.team === "red"
                            ? "border-l-rust"
                            : "border-l-team-blue"
                        }`}
                      >
                        <span className="text-lg leading-none">
                          {player.emoji}
                        </span>
                        <span className="flex-1 text-sm font-semibold">
                          {player.displayName}
                        </span>
                        <span className="font-mono text-[11px] text-ink-soft">
                          {TEAMS[player.team].name}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
    </div>
  );
}
