"use client";

import { useCallback, useEffect, useState } from "react";
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
    <div className="device">
      {screen === "main" && (
        <div className="screen active">
          <div className="main-hero">
            <svg
              className="topo"
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
            <p className="eyebrow">A workshop for shared decisions</p>
            <h1 className="title">Commons</h1>
            <p className="tagline">
              Step into real trade-offs over land, water, and energy — and see
              where the group lands.
            </p>
          </div>
          <div className="main-body">
            {rejoinCode && (
              <div className="rejoin-banner">
                <p className="rejoin-copy">
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
                  <p className="load-error">{loadError}</p>
                )}
              </div>
            )}

            <div className="section-row">
              <p className="section-label">Open rooms · last hour</p>
              <button
                type="button"
                className="text-refresh"
                onClick={() => void refreshRooms()}
              >
                Refresh
              </button>
            </div>

            {roomsLoading && <p className="room-empty">Loading rooms…</p>}
            {!roomsLoading && roomsError && (
              <p className="load-error">{roomsError}</p>
            )}
            {!roomsLoading && !roomsError && rooms.length === 0 && (
              <p className="room-empty">
                No rooms in the last hour. Create one to get started.
              </p>
            )}
            {!roomsLoading && !roomsError && rooms.length > 0 && (
              <div className="room-list">
                {rooms.map((room) => (
                  <button
                    key={room.id}
                    type="button"
                    className="room-card"
                    onClick={() => startJoin(room)}
                  >
                    <div className="room-tag tag-land">{room.icon}</div>
                    <div className="room-info">
                      <p className="room-name">
                        {room.code} · {room.themeName}
                      </p>
                      <p className="room-meta">{formatAge(room.createdAtMs)}</p>
                    </div>
                    <div className="room-count">
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
          </div>
        </div>
      )}

      {screen === "create" && (
        <div className="screen active">
          <div className="entry-header">
            <button type="button" className="back-link" onClick={goMain}>
              ← Back
            </button>
          </div>
          <div className="entry-body">
            <h2 className="entry-title">Create a room</h2>
            <p className="entry-sub">
              Pick a theme, then share the short room code with your group.
            </p>

            <label className="field-label">Theme</label>
            <div className="team-picker">
              {THEME_LIST.map((theme) => (
                <button
                  key={theme.id}
                  type="button"
                  className={`team-opt${selectedThemeId === theme.id ? " selected theme-selected" : ""}`}
                  onClick={() => setSelectedThemeId(theme.id)}
                >
                  <span className="team-opt-name">
                    {theme.icon} {theme.name}
                  </span>
                  <span className="team-opt-goal">{theme.blurb}</span>
                </button>
              ))}
            </div>

            {loadError && <p className="load-error">{loadError}</p>}

            <div className="entry-footer">
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
        <div className="screen active">
          <div className="entry-header">
            <button type="button" className="back-link" onClick={goMain}>
              ← Back
            </button>
            <div className="context-card">
              <div className="room-tag tag-land">{selectedRoom.icon}</div>
              <div className="room-info">
                <p className="room-name">
                  {entryMode === "create"
                    ? `Room ${selectedRoom.code} ready`
                    : `Joining ${selectedRoom.code}`}
                </p>
                <p className="room-meta">
                  {selectedRoom.themeName}
                  {entryMode === "join"
                    ? ` · ${selectedRoom.playerCount} players`
                    : " · share this code"}
                </p>
              </div>
            </div>
          </div>
          <div className="entry-body">
            <h2 className="entry-title">Who&apos;s joining?</h2>
            <p className="entry-sub">
              Pick a name, a mark, and a visible team. Your hidden role is
              assigned privately when you enter.
            </p>

            <label className="field-label" htmlFor="name-input">
              Your name
            </label>
            <input
              className="name-input"
              id="name-input"
              type="text"
              placeholder="e.g. Priya"
              maxLength={20}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />

            <label className="field-label">Visible team</label>
            <div className="team-picker">
              {(["red", "blue"] as const).map((id) => (
                <button
                  key={id}
                  type="button"
                  className={`team-opt team-opt-${id}${team === id ? " selected" : ""}`}
                  onClick={() => setTeam(id)}
                >
                  <span className="team-opt-name">{TEAMS[id].name}</span>
                  <span className="team-opt-goal">{TEAMS[id].goalLabel}</span>
                </button>
              ))}
            </div>

            <label className="field-label">Pick a mark</label>
            <div className="emoji-grid">
              {EMOJI_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={`emoji-opt${emoji === option ? " selected" : ""}`}
                  onClick={() => setEmoji(option)}
                >
                  {option}
                </button>
              ))}
            </div>

            {loadError && <p className="load-error">{loadError}</p>}

            <div className="entry-footer">
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
          <div className="screen active stage-screen">
            <div className="stage-header">
              <div className="stage-header-row">
                <div className="player-chip">
                  <div className="avatar">{emoji ?? "🙂"}</div>
                  <span>{name || "Player"}</span>
                </div>
                <button
                  type="button"
                  className={`identity-badge identity-${teamInfo.id}${roleOpen ? " open" : ""}`}
                  onClick={() => setRoleOpen((open) => !open)}
                  aria-expanded={roleOpen}
                  aria-controls="role-panel"
                >
                  <span className="identity-badge-text">
                    {teamInfo.id === "red" ? "Red" : "Blue"} ·{" "}
                    {hiddenRole.role_name}
                  </span>
                  <span className="identity-hint" aria-hidden>
                    {roleOpen ? "Hide" : "Role"}
                  </span>
                  <span className="identity-chevron" aria-hidden>
                    {roleOpen ? "▴" : "▾"}
                  </span>
                </button>
              </div>

              <div className="stage-header-row stage-stats-row">
                <div
                  className="mini-scoreboard"
                  role="group"
                  aria-label="City totals"
                >
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      className={`mini-score-chip score-${scoreTeamOf(cat.id)}`}
                      title={cat.blurb}
                      aria-expanded={scoreInfoOpen}
                      aria-controls="scoreboard-tip"
                      onClick={() => setScoreInfoOpen((open) => !open)}
                    >
                      <span className="mini-score-label">
                        {SCORE_ABBR[cat.id]}
                      </span>
                      <span className="mini-score-value">
                        {categories[cat.id] > 0 ? "+" : ""}
                        {categories[cat.id]}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {scoreInfoOpen && (
                <p className="scoreboard-tip" id="scoreboard-tip">
                  Red score = Jobs + Housing. Blue score = Accessibility +
                  Climate. Cost is shared.
                </p>
              )}

              <div className="stage-header-row stage-meta-row">
                <div
                  className="timer-chip"
                  aria-label={`Discussion timer ${formatTimer(secondsLeft ?? scenario.discussion_seconds)}`}
                >
                  <span aria-hidden>⏱</span>
                  <span>
                    {formatTimer(secondsLeft ?? scenario.discussion_seconds)}
                  </span>
                </div>
                <div className="room-code-chip">
                  <span aria-hidden>#</span>
                  <span>{selectedRoom?.code}</span>
                </div>
                <button
                  type="button"
                  className="players-chip"
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
                className="role-panel"
                id="role-panel"
                onClick={() => setRoleOpen(false)}
                aria-label="Hide hidden role details"
              >
                <div className="role-panel-top">
                  <p className="role-eyebrow">Private · hidden role</p>
                  <span className="role-hide-hint">
                    Tap to hide <span aria-hidden>▴</span>
                  </span>
                </div>
                <h3 className="role-name">{hiddenRole.role_name}</h3>
                <p className="role-desc">{hiddenRole.description}</p>
                <p className="role-rule">
                  You score 1 point at end of game if{" "}
                  {roleRuleLabel(
                    hiddenRole.target_category,
                    hiddenRole.comparison,
                    hiddenRole.threshold,
                  )}
                  .
                </p>
                <p className="role-team-note">
                  {teamInfo.name} promotes {teamInfo.goalLabel}.
                </p>
              </button>
            )}

            <div className="stage-body">
              <p className="stage-eyebrow">Round {scenario.round_order}</p>
              <h2 className="scenario-title">{scenario.title}</h2>
              <div className="scenario-meta">
                <span className="meta-tag">
                  Discuss {formatDiscussion(scenario.discussion_seconds)}
                </span>
              </div>
              <div className="scenario-brief">
                <p>
                  <strong>Problem.</strong> {scenario.problem}
                </p>
                <p>
                  <strong>Team task.</strong> {scenario.team_task}
                </p>
              </div>

              <p className="section-label">Your team&apos;s starter proposal</p>
              <div className="proposal-card">
                <p className="proposal-text">{starter.proposal_text}</p>
                <div className="proposal-deltas">
                  {DELTA_KEYS.map((key) => (
                    <div key={key} className="proposal-delta">
                      <span className="category-name">
                        {CATEGORIES.find((c) => c.id === key)?.name}
                      </span>
                      <span className="category-value">
                        {formatDelta(starter[key])}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="stage-footer">
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
                className="roster-modal-backdrop"
                onClick={() => setRosterOpen(false)}
                role="presentation"
              >
                <div
                  className="roster-modal"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="roster-modal-title"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="roster-modal-header">
                    <h2 id="roster-modal-title" className="roster-modal-title">
                      In this room
                    </h2>
                    <button
                      type="button"
                      className="roster-modal-close"
                      onClick={() => setRosterOpen(false)}
                    >
                      Close
                    </button>
                  </div>
                  <p className="roster-modal-summary">
                    <span className="roster-bubble-red">{redCount} Red</span>
                    {" · "}
                    <span className="roster-bubble-blue">{blueCount} Blue</span>
                  </p>
                  <div className="roster-list">
                    {roster.length === 0 && (
                      <p className="room-empty">Waiting for players…</p>
                    )}
                    {roster.map((player) => (
                      <div
                        key={player.id}
                        className={`roster-row roster-${player.team}`}
                      >
                        <span className="roster-emoji">{player.emoji}</span>
                        <span className="roster-name">{player.displayName}</span>
                        <span className="roster-team">
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
