"use client";

import { useEffect, useState } from "react";
import { createRoom, getScenario, listRooms } from "@/lib/mock/api";
import { EMOJI_OPTIONS, type Room, type Scenario } from "@/lib/mock/data";

type Screen = "main" | "entry" | "stage";

type EntryMode = "join" | "create";

const TAG_CLASS: Record<Room["tag"], string> = {
  coastal: "tag-coastal",
  water: "tag-water",
  energy: "tag-energy",
  land: "tag-land",
};

export default function CommonsApp() {
  const [screen, setScreen] = useState<Screen>("main");
  const [rooms, setRooms] = useState<Room[]>([]);
  const [entryMode, setEntryMode] = useState<EntryMode | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState<string | null>(null);
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [roomLabel, setRoomLabel] = useState("");

  useEffect(() => {
    void listRooms().then(setRooms);
  }, []);

  function goMain() {
    setScreen("main");
    setEntryMode(null);
    setSelectedRoom(null);
    setName("");
    setEmoji(null);
    setScenario(null);
    setRoomLabel("");
  }

  function startJoin(room: Room) {
    setEntryMode("join");
    setSelectedRoom(room);
    setName("");
    setEmoji(null);
    setScreen("entry");
  }

  async function startCreate() {
    const room = await createRoom();
    setEntryMode("create");
    setSelectedRoom(room);
    setName("");
    setEmoji(null);
    setScreen("entry");
  }

  async function confirmEntry() {
    const displayName = name.trim() || "Player";
    const mark = emoji ?? "🙂";
    const room = selectedRoom;
    const nextScenario = await getScenario(room?.id);

    setName(displayName);
    setEmoji(mark);
    setScenario(nextScenario);
    setRoomLabel(entryMode === "create" ? "New room" : (room?.name ?? "Room"));
    setScreen("stage");
  }

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
              This is how the room will see you. No accounts, just a name and a
              mark.
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

            <div className="entry-footer">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => void confirmEntry()}
              >
                Confirm and enter
              </button>
            </div>
          </div>
        </div>
      )}

      {screen === "stage" && scenario && (
        <div className="screen active">
          <div className="stage-header">
            <div className="player-chip">
              <div className="avatar">{emoji ?? "🙂"}</div>
              <span>{name || "Player"}</span>
            </div>
            <div className="room-pill">{roomLabel}</div>
          </div>
          <div className="stage-body">
            <p className="stage-eyebrow">{scenario.eyebrow}</p>
            <h2 className="scenario-title">{scenario.title}</h2>
            <div className="scenario-meta">
              {scenario.tags.map((tag) => (
                <span key={tag} className="meta-tag">
                  {tag}
                </span>
              ))}
            </div>
            <div className="scenario-brief">
              {scenario.paragraphs.map((paragraph) => (
                <p key={paragraph.slice(0, 24)}>{paragraph}</p>
              ))}
            </div>
          </div>
          <div className="stage-footer">
            <p className="footer-note">
              Voting and resource tools arrive in the next increment.
            </p>
            <button type="button" className="btn btn-secondary" onClick={goMain}>
              Leave room
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
