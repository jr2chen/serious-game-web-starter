"use client";

import { useEffect, useState } from "react";
import {
  assignHiddenRole,
  createRoom,
  getCategoryTotals,
  getScenario,
  getStarterProposal,
  listRooms,
} from "@/lib/api/client";
import type {
  CategoryId,
  CategoryTotals,
  HiddenRole,
  Room,
  Scenario,
  StarterProposal,
  TeamId,
} from "@/lib/game/types";
import { CATEGORIES, EMOJI_OPTIONS, TEAMS } from "@/lib/game/constants";
import { roleRuleLabel } from "@/lib/game/scoring";

type Screen = "main" | "entry" | "stage";

type EntryMode = "join" | "create";

const TAG_CLASS: Record<Room["tag"], string> = {
  coastal: "tag-coastal",
  water: "tag-water",
  energy: "tag-energy",
  land: "tag-land",
};

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

export default function CommonsApp() {
  const [screen, setScreen] = useState<Screen>("main");
  const [rooms, setRooms] = useState<Room[]>([]);
  const [entryMode, setEntryMode] = useState<EntryMode | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState<string | null>(null);
  const [team, setTeam] = useState<TeamId | null>(null);
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [starter, setStarter] = useState<StarterProposal | null>(null);
  const [roomLabel, setRoomLabel] = useState("");
  const [hiddenRole, setHiddenRole] = useState<HiddenRole | null>(null);
  const [categories, setCategories] = useState<CategoryTotals | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    void listRooms().then(setRooms);
  }, []);

  function goMain() {
    setScreen("main");
    setEntryMode(null);
    setSelectedRoom(null);
    setName("");
    setEmoji(null);
    setTeam(null);
    setScenario(null);
    setStarter(null);
    setRoomLabel("");
    setHiddenRole(null);
    setCategories(null);
    setLoadError(null);
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

  async function startCreate() {
    const room = await createRoom();
    setEntryMode("create");
    setSelectedRoom(room);
    setName("");
    setEmoji(null);
    setTeam(null);
    setLoadError(null);
    setScreen("entry");
  }

  async function confirmEntry() {
    if (!team) return;

    const displayName = name.trim() || "Player";
    const mark = emoji ?? "🙂";
    const room = selectedRoom;

    try {
      setLoadError(null);
      const [nextScenario, role, totals] = await Promise.all([
        getScenario(room?.id),
        assignHiddenRole(team),
        getCategoryTotals(),
      ]);
      const proposal = await getStarterProposal(nextScenario.scenario_id, team);

      setName(displayName);
      setEmoji(mark);
      setScenario(nextScenario);
      setStarter(proposal);
      setHiddenRole(role);
      setCategories(totals);
      setRoomLabel(entryMode === "create" ? "New room" : (room?.name ?? "Room"));
      setScreen("stage");
    } catch (error) {
      setLoadError(
        error instanceof Error ? error.message : "Could not load game content",
      );
    }
  }

  const teamInfo = team ? TEAMS[team] : null;

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
            <p className="section-label">Open rooms</p>
            <div className="room-list">
              {rooms.map((room) => (
                <button
                  key={room.id}
                  type="button"
                  className="room-card"
                  onClick={() => startJoin(room)}
                >
                  <div className={`room-tag ${TAG_CLASS[room.tag]}`}>
                    {room.icon}
                  </div>
                  <div className="room-info">
                    <p className="room-name">{room.name}</p>
                    <p className="room-meta">{room.topic}</p>
                  </div>
                  <div className="room-count">
                    {room.playerCount}{" "}
                    {room.playerCount === 1 ? "player" : "players"}
                  </div>
                </button>
              ))}
            </div>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => void startCreate()}
            >
              Create room
            </button>
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
              <div className={`room-tag ${TAG_CLASS[selectedRoom.tag]}`}>
                {selectedRoom.icon}
              </div>
              <div className="room-info">
                <p className="room-name">
                  {entryMode === "create"
                    ? "Creating a new room"
                    : `Joining ${selectedRoom.name}`}
                </p>
                <p className="room-meta">
                  {entryMode === "create"
                    ? "Scenario assigned automatically for now"
                    : `${selectedRoom.topic} · ${selectedRoom.playerCount} players`}
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
          <div className="screen active">
            <div className="stage-header">
              <div className="player-chip">
                <div className="avatar">{emoji ?? "🙂"}</div>
                <span>{name || "Player"}</span>
              </div>
              <div className="room-pill">{roomLabel}</div>
            </div>
            <div className="stage-body">
              <div className={`team-badge team-badge-${teamInfo.id}`}>
                <span className="team-badge-name">{teamInfo.name}</span>
                <span className="team-badge-goal">
                  Promotes {teamInfo.goalLabel}
                </span>
              </div>

              <div className="role-card">
                <p className="role-eyebrow">Private · hidden role</p>
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
              </div>

              <p className="section-label">City categories</p>
              <div className="category-strip">
                {CATEGORIES.map((cat) => (
                  <div key={cat.id} className="category-chip" title={cat.blurb}>
                    <span className="category-name">{cat.name}</span>
                    <span className="category-value">
                      {categories[cat.id] > 0 ? "+" : ""}
                      {categories[cat.id]}
                    </span>
                  </div>
                ))}
              </div>
              <p className="category-note">
                Red score = Jobs + Housing · Blue score = Accessibility + Climate
                · Cost is shared
              </p>

              <p className="stage-eyebrow">
                Round {scenario.round_order} of 2 · from CSV
              </p>
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
                <p className="proposal-note">
                  Read-only for now. Editing and submit arrive in Epic 4.
                </p>
              </div>
            </div>
            <div className="stage-footer">
              <p className="footer-note">
                Round 2 lives in CSV already; advancing rounds comes later.
              </p>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={goMain}
              >
                Leave room
              </button>
            </div>
          </div>
        )}
    </div>
  );
}
