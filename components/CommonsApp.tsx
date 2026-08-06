"use client";

import { useCallback, useEffect, useState } from "react";
import QRCode from "react-qr-code";
import {
  advanceRoomAfterVote,
  assignHiddenRole,
  castProposalVote,
  createRoom,
  enterRoom,
  extendRoomTimer,
  getNextScenario,
  getRoom,
  getScenario,
  getStarterProposal,
  listRooms,
  loadMySeat,
  loadMyUid,
  loadRoleForPlayer,
  reviseTeamProposal,
  saveTeamProposal,
  seedRoomRound,
  seedTeamProposal,
  startRoomTimer,
  startVoting,
  watchRoom,
  watchRoomPlayers,
  watchTeamProposal,
  watchVotes,
} from "@/lib/api/client";
import { isFirebaseConfigured } from "@/lib/firebase/client";
import type {
  CategoryId,
  CategoryTotals,
  HiddenRole,
  ProposalVote,
  Room,
  RoomPhase,
  RoomPlayer,
  Scenario,
  SeatRole,
  StarterProposal,
  TeamId,
  TeamProposalDraft,
  ThemeId,
} from "@/lib/game/types";
import {
  CATEGORIES,
  EMOJI_OPTIONS,
  PROPOSAL_DELTA_LIMIT,
  TEAMS,
} from "@/lib/game/constants";
import {
  isTeamId,
  roleConditionMet,
  roleRuleLabel,
  teamCategoryScore,
} from "@/lib/game/scoring";
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

const EMPTY_DELTAS: Record<CategoryId, number> = {
  jobs: 0,
  housing: 0,
  accessibility: 0,
  climate: 0,
  cost: 0,
};

function formatDelta(value: number): string {
  return value > 0 ? `+${value}` : String(value);
}

function clampProposalDelta(value: number): number {
  return Math.max(
    -PROPOSAL_DELTA_LIMIT,
    Math.min(PROPOSAL_DELTA_LIMIT, Math.round(value)),
  );
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

/**
 * Firestore re-checks proposal listeners when room.phase leaves "vote".
 * Active watches on the other team's draft are revoked before React can
 * unsubscribe — that denial is expected, not a real failure.
 */
function isPermissionDeniedError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const code =
    "code" in error ? String((error as { code: unknown }).code) : "";
  const message =
    "message" in error
      ? String((error as { message: unknown }).message)
      : "";
  return (
    code === "permission-denied" ||
    /missing or insufficient permissions/i.test(message)
  );
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
  const [team, setTeam] = useState<SeatRole | null>(null);
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [starter, setStarter] = useState<StarterProposal | null>(null);
  const [draftText, setDraftText] = useState("");
  const [draftDeltas, setDraftDeltas] =
    useState<Record<CategoryId, number>>(EMPTY_DELTAS);
  const [draftUpdatedBy, setDraftUpdatedBy] = useState<string | null>(null);
  const [draftUpdatedAtMs, setDraftUpdatedAtMs] = useState<number | null>(null);
  const [submittingProposal, setSubmittingProposal] = useState(false);
  /** Shared countdown target from the room doc; null until the round starts. */
  const [timerEndsAtMs, setTimerEndsAtMs] = useState<number | null>(null);
  /** Ticks once a second on stage so the synced countdown re-renders. */
  const [nowTick, setNowTick] = useState(() => Date.now());
  const [hiddenRole, setHiddenRole] = useState<HiddenRole | null>(null);
  const [categories, setCategories] = useState<CategoryTotals | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [roster, setRoster] = useState<RoomPlayer[]>([]);
  const [rosterOpen, setRosterOpen] = useState(false);
  const [roleOpen, setRoleOpen] = useState(false);
  const [scoreInfoOpen, setScoreInfoOpen] = useState(false);
  const [rejoinCode, setRejoinCode] = useState<string | null>(null);
  const [rejoining, setRejoining] = useState(false);
  /** Judge-only: both teams' live drafts, read-only. */
  const [teamProposals, setTeamProposals] = useState<
    Record<TeamId, TeamProposalDraft | null>
  >({ red: null, blue: null });
  /** Judge-only: hidden role per roster player, fetched on demand. */
  const [rolesByPlayerId, setRolesByPlayerId] = useState<
    Record<string, HiddenRole | null>
  >({});
  /** Judge-only: in-progress number edits per team, before Save revision. */
  const [judgeDraftDeltas, setJudgeDraftDeltas] = useState<
    Record<TeamId, Record<CategoryId, number>>
  >({ red: EMPTY_DELTAS, blue: EMPTY_DELTAS });
  const [savingJudgeRevision, setSavingJudgeRevision] = useState<
    Record<TeamId, boolean>
  >({ red: false, blue: false });
  /** Mirrors rooms/{code}.phase — discuss → vote → (next discuss | complete). */
  const [stagePhase, setStagePhase] = useState<RoomPhase>("discuss");
  const [startingVote, setStartingVote] = useState(false);
  const [advancingRound, setAdvancingRound] = useState(false);
  /** Live scenario id from the room doc — drives reloads when a round advances. */
  const [roomScenarioId, setRoomScenarioId] = useState<string | null>(null);
  /** Live, public votes for which team's proposal the city should adopt. */
  const [votes, setVotes] = useState<ProposalVote[]>([]);
  const [expandedProposals, setExpandedProposals] = useState<
    Record<TeamId, boolean>
  >({ red: false, blue: false });
  /** This browser's uid — lets us highlight "your vote" among public votes. */
  const [myUid, setMyUid] = useState<string | null>(null);
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

  /** Live team proposal — remote Submit overwrites local text + deltas. */
  useEffect(() => {
    if (screen !== "stage" || !selectedRoom || !team || team === "judge") {
      return;
    }

    let active = true;
    let unsub: (() => void) | undefined;

    void watchTeamProposal(
      selectedRoom.code,
      team,
      (draft) => {
        if (!active || !draft) return;
        setDraftText(draft.proposal_text);
        setDraftDeltas({
          jobs: draft.jobs,
          housing: draft.housing,
          accessibility: draft.accessibility,
          climate: draft.climate,
          cost: draft.cost,
        });
        setDraftUpdatedBy(draft.updatedByName || null);
        setDraftUpdatedAtMs(draft.updatedAtMs);
      },
      (error) => {
        if (active && !isPermissionDeniedError(error)) {
          setLoadError(error.message);
        }
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
  }, [screen, selectedRoom, team]);

  /**
   * Watch both teams' drafts, read-only. Judges always get this; everyone
   * else only once the room reaches the vote phase (the reveal) — the
   * Firestore rules deny the read before then, so this stays gated to avoid
   * a spurious permission error on every red/blue device.
   *
   * When phase leaves "vote", Firestore revokes the other-team listens
   * before this effect cleans up — those permission-denied errors are ignored.
   */
  useEffect(() => {
    if (screen !== "stage" || !selectedRoom) return;
    if (team !== "judge" && stagePhase !== "vote") {
      // Drop the opposing draft from memory once reveal ends.
      if (team && isTeamId(team)) {
        setTeamProposals((prev) => ({
          red: team === "red" ? prev.red : null,
          blue: team === "blue" ? prev.blue : null,
        }));
      } else if (team !== "judge") {
        setTeamProposals({ red: null, blue: null });
      }
      return;
    }

    let active = true;
    const unsubs: Array<() => void> = [];

    for (const t of ["red", "blue"] as const) {
      void watchTeamProposal(
        selectedRoom.code,
        t,
        (draft) => {
          if (active) setTeamProposals((prev) => ({ ...prev, [t]: draft }));
        },
        (error) => {
          if (active && !isPermissionDeniedError(error)) {
            setLoadError(error.message);
          }
        },
      ).then((unsubscribe) => {
        if (!active) {
          unsubscribe();
          return;
        }
        unsubs.push(unsubscribe);
      });
    }

    return () => {
      active = false;
      unsubs.forEach((unsub) => unsub());
    };
  }, [screen, selectedRoom, team, stagePhase]);

  /**
   * Judge-only: keep the editable draft numbers in sync with the live
   * proposal — mirrors how a team's own draftDeltas track their own draft.
   */
  useEffect(() => {
    if (team !== "judge") return;
    setJudgeDraftDeltas((prev) => {
      const next = { ...prev };
      for (const t of ["red", "blue"] as const) {
        const draft = teamProposals[t];
        if (!draft) continue;
        next[t] = {
          jobs: draft.jobs,
          housing: draft.housing,
          accessibility: draft.accessibility,
          climate: draft.climate,
          cost: draft.cost,
        };
      }
      return next;
    });
  }, [team, teamProposals]);

  /**
   * Fetch hidden roles: judges can always read them; everyone else only
   * once the session is complete (Firestore rules open secrets on complete).
   */
  useEffect(() => {
    if (screen !== "stage" || !selectedRoom) return;
    if (team !== "judge" && stagePhase !== "complete") return;
    const missing = roster.filter(
      (p) => p.team !== "judge" && !(p.id in rolesByPlayerId),
    );
    if (missing.length === 0) return;

    let active = true;
    void Promise.all(
      missing.map(async (p) => {
        const role = await loadRoleForPlayer(selectedRoom.code, p.id).catch(
          () => null,
        );
        return [p.id, role] as const;
      }),
    ).then((entries) => {
      if (!active) return;
      setRolesByPlayerId((prev) => {
        const next = { ...prev };
        for (const [id, role] of entries) next[id] = role;
        return next;
      });
    });

    return () => {
      active = false;
    };
  }, [screen, selectedRoom, team, roster, rolesByPlayerId, stagePhase]);

  /** Live room doc — timer, phase, city totals, and current scenario for everyone. */
  useEffect(() => {
    if (screen !== "stage" || !selectedRoom) return;

    let active = true;
    let unsub: (() => void) | undefined;

    void watchRoom(
      selectedRoom.code,
      (room) => {
        if (!active) return;
        if (room?.timerEndsAtMs) setTimerEndsAtMs(room.timerEndsAtMs);
        const nextPhase: RoomPhase =
          room?.phase === "vote" || room?.phase === "complete"
            ? room.phase
            : "discuss";
        // Leaving the vote/reveal clears the expected permission blip from
        // Firestore revoking the other-team proposal listeners.
        if (nextPhase !== "vote") {
          setLoadError((err) =>
            err && /insufficient permissions|permission-denied/i.test(err)
              ? null
              : err,
          );
        }
        setStagePhase(nextPhase);
        if (room?.categoryTotals) setCategories(room.categoryTotals);
        if (room?.scenarioId) setRoomScenarioId(room.scenarioId);
      },
      (error) => {
        if (active && !isPermissionDeniedError(error)) {
          setLoadError(error.message);
        }
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

  /** When the room advances rounds, reload the scenario (+ starter for players). */
  useEffect(() => {
    if (screen !== "stage" || !roomScenarioId) return;
    if (scenario?.scenario_id === roomScenarioId) return;

    let active = true;
    void getScenario(roomScenarioId)
      .then(async (next) => {
        if (!active) return;
        setScenario(next);
        setExpandedProposals({ red: false, blue: false });
        if (team && isTeamId(team)) {
          const proposal = await getStarterProposal(next.scenario_id, team);
          if (active) setStarter(proposal);
        } else {
          setStarter(null);
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setLoadError(
            error instanceof Error
              ? error.message
              : "Could not load next scenario",
          );
        }
      });

    return () => {
      active = false;
    };
  }, [screen, roomScenarioId, scenario?.scenario_id, team]);

  /** Live, public vote tally — only relevant once voting has started. */
  useEffect(() => {
    if (screen !== "stage" || !selectedRoom || stagePhase !== "vote") {
      setVotes([]);
      return;
    }

    let active = true;
    let unsub: (() => void) | undefined;

    void watchVotes(
      selectedRoom.code,
      (nextVotes) => {
        if (active) setVotes(nextVotes);
      },
      (error) => {
        // Vote docs are deleted when a round advances; ignore the revoke blip.
        if (active && !isPermissionDeniedError(error)) {
          setLoadError(error.message);
        }
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
  }, [screen, selectedRoom, stagePhase]);

  /** Ticks once a second so the synced countdown below re-renders. */
  useEffect(() => {
    if (screen !== "stage") return;
    const interval = setInterval(() => setNowTick(Date.now()), 1000);
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
    setDraftText("");
    setDraftDeltas(EMPTY_DELTAS);
    setDraftUpdatedBy(null);
    setDraftUpdatedAtMs(null);
    setSubmittingProposal(false);
    setTimerEndsAtMs(null);
    setHiddenRole(null);
    setCategories(null);
    setLoadError(null);
    setRoster([]);
    setRosterOpen(false);
    setRoleOpen(false);
    setScoreInfoOpen(false);
    setTeamProposals({ red: null, blue: null });
    setRolesByPlayerId({});
    setJudgeDraftDeltas({ red: EMPTY_DELTAS, blue: EMPTY_DELTAS });
    setSavingJudgeRevision({ red: false, blue: false });
    setStagePhase("discuss");
    setStartingVote(false);
    setAdvancingRound(false);
    setRoomScenarioId(null);
    setVotes([]);
    setExpandedProposals({ red: false, blue: false });
    setMyUid(null);
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
      const existingRoom = await getRoom(selectedRoom.code);
      const bootstrap = existingRoom?.scenarioId
        ? await getScenario(existingRoom.scenarioId)
        : await getScenario();
      const round = await seedRoomRound(selectedRoom.code, bootstrap);
      const nextScenario =
        round.scenarioId === bootstrap.scenario_id
          ? bootstrap
          : await getScenario(round.scenarioId);

      let role: HiddenRole | null = null;
      let proposal: StarterProposal | null = null;
      if (team !== "judge") {
        role = await assignHiddenRole(team);
        proposal = await getStarterProposal(nextScenario.scenario_id, team);
      }

      await enterRoom({
        roomCode: selectedRoom.code,
        displayName,
        emoji: mark,
        team,
        role,
      });

      if (proposal) {
        const seeded = await seedTeamProposal({
          roomCode: selectedRoom.code,
          starter: proposal,
          displayName,
        });
        setDraftText(seeded.proposal_text);
        setDraftDeltas({
          jobs: seeded.jobs,
          housing: seeded.housing,
          accessibility: seeded.accessibility,
          climate: seeded.climate,
          cost: seeded.cost,
        });
        setDraftUpdatedBy(seeded.updatedByName || null);
        setDraftUpdatedAtMs(seeded.updatedAtMs);
      }

      const [endsAtMs, uid] = await Promise.all([
        startRoomTimer(selectedRoom.code, nextScenario.discussion_seconds),
        loadMyUid(),
      ]);

      setName(displayName);
      setEmoji(mark);
      setScenario(nextScenario);
      setRoomScenarioId(round.scenarioId);
      setStarter(proposal);
      setHiddenRole(role);
      setCategories(round.categoryTotals);
      setTimerEndsAtMs(endsAtMs);
      setMyUid(uid);
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

      const bootstrap = room.scenarioId
        ? await getScenario(room.scenarioId)
        : await getScenario();
      const round = await seedRoomRound(room.code, bootstrap);
      const nextScenario =
        round.scenarioId === bootstrap.scenario_id
          ? bootstrap
          : await getScenario(round.scenarioId);

      let proposal: StarterProposal | null = null;
      if (seat.player.team !== "judge") {
        proposal = await getStarterProposal(
          nextScenario.scenario_id,
          seat.player.team,
        );
        const seeded = await seedTeamProposal({
          roomCode: room.code,
          starter: proposal,
          displayName: seat.player.displayName,
        });
        setDraftText(seeded.proposal_text);
        setDraftDeltas({
          jobs: seeded.jobs,
          housing: seeded.housing,
          accessibility: seeded.accessibility,
          climate: seeded.climate,
          cost: seeded.cost,
        });
        setDraftUpdatedBy(seeded.updatedByName || null);
        setDraftUpdatedAtMs(seeded.updatedAtMs);
      }

      const [endsAtMs, uid] = await Promise.all([
        startRoomTimer(room.code, nextScenario.discussion_seconds),
        loadMyUid(),
      ]);

      setSelectedRoom(room);
      setName(seat.player.displayName);
      setEmoji(seat.player.emoji);
      setTeam(seat.player.team);
      setScenario(nextScenario);
      setRoomScenarioId(round.scenarioId);
      setStarter(proposal);
      setHiddenRole(seat.role);
      setCategories(round.categoryTotals);
      setTimerEndsAtMs(endsAtMs);
      setMyUid(uid);
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

  /** Judge-only control — pushes the shared countdown back by one minute. */
  async function addMinuteToTimer() {
    if (!selectedRoom) return;
    try {
      await extendRoomTimer(selectedRoom.code, 60);
    } catch (error) {
      setLoadError(
        error instanceof Error ? error.message : "Could not add time",
      );
    }
  }

  /** Judge-only control — moves the whole room to the public vote screen. */
  async function moveToVoting() {
    if (!selectedRoom) return;
    setStartingVote(true);
    setLoadError(null);
    try {
      await startVoting(selectedRoom.code);
    } catch (error) {
      setLoadError(
        error instanceof Error ? error.message : "Could not start voting",
      );
    } finally {
      setStartingVote(false);
    }
  }

  /**
   * Judge-only: apply the vote-winning proposal's deltas to the shared city
   * totals, then open the next CSV scenario (or finish if there isn't one).
   */
  async function applyWinnerAndAdvance() {
    if (!selectedRoom || !isJudge || !categories || !scenario) return;

    const redCount = votes.filter((v) => v.choice === "red").length;
    const blueCount = votes.filter((v) => v.choice === "blue").length;
    if (redCount === 0 && blueCount === 0) {
      setLoadError("No votes yet — wait for players to vote.");
      return;
    }
    if (redCount === blueCount) {
      setLoadError("Tie vote — need a clear majority before advancing.");
      return;
    }

    const winningTeam: TeamId = redCount > blueCount ? "red" : "blue";
    const draft = teamProposals[winningTeam];
    if (!draft) {
      setLoadError("Winning team has no proposal draft yet.");
      return;
    }

    setAdvancingRound(true);
    setLoadError(null);
    try {
      const next = await getNextScenario(scenario.round_order);
      let nextStarters: {
        red: StarterProposal;
        blue: StarterProposal;
      } | null = null;
      if (next) {
        const [red, blue] = await Promise.all([
          getStarterProposal(next.scenario_id, "red"),
          getStarterProposal(next.scenario_id, "blue"),
        ]);
        nextStarters = { red, blue };
      }

      await advanceRoomAfterVote({
        roomCode: selectedRoom.code,
        winningTeam,
        currentTotals: categories,
        winningDeltas: {
          jobs: draft.jobs,
          housing: draft.housing,
          accessibility: draft.accessibility,
          climate: draft.climate,
          cost: draft.cost,
        },
        nextScenario: next,
        nextStarters,
        judgeName: name.trim() || "Player",
      });
    } catch (error) {
      setLoadError(
        error instanceof Error
          ? error.message
          : "Could not advance to the next round",
      );
    } finally {
      setAdvancingRound(false);
    }
  }

  /** Casts or changes this player's public vote — Red/Blue only. */
  async function voteForProposal(choice: TeamId) {
    if (!selectedRoom || isJudge || !team || !isTeamId(team)) return;
    try {
      await castProposalVote({
        roomCode: selectedRoom.code,
        choice,
        voterTeam: team,
        displayName: name.trim() || "Player",
        emoji: emoji ?? "🙂",
      });
    } catch (error) {
      setLoadError(
        error instanceof Error ? error.message : "Could not cast vote",
      );
    }
  }

  function toggleProposalExpanded(t: TeamId) {
    setExpandedProposals((prev) => ({ ...prev, [t]: !prev[t] }));
  }

  async function submitProposalRevision() {
    if (!selectedRoom || !team || team === "judge" || !scenario) return;
    setSubmittingProposal(true);
    setLoadError(null);
    try {
      await saveTeamProposal({
        roomCode: selectedRoom.code,
        team,
        scenarioId: scenario.scenario_id,
        proposalText: draftText,
        deltas: draftDeltas,
        displayName: name.trim() || "Player",
      });
    } catch (error) {
      setLoadError(
        error instanceof Error ? error.message : "Could not submit proposal",
      );
    } finally {
      setSubmittingProposal(false);
    }
  }

  function nudgeDelta(key: CategoryId, step: number) {
    setDraftDeltas((prev) => ({
      ...prev,
      [key]: clampProposalDelta(prev[key] + step),
    }));
  }

  /** Judge-only: nudge one number in a team's proposal, before Save revision. */
  function nudgeJudgeDelta(t: TeamId, key: CategoryId, step: number) {
    setJudgeDraftDeltas((prev) => ({
      ...prev,
      [t]: { ...prev[t], [key]: clampProposalDelta(prev[t][key] + step) },
    }));
  }

  /** Judge-only: pushes revised numbers live — that team's text is untouched. */
  async function saveJudgeRevision(t: TeamId) {
    if (!selectedRoom || !isJudge) return;
    setSavingJudgeRevision((prev) => ({ ...prev, [t]: true }));
    setLoadError(null);
    try {
      await reviseTeamProposal({
        roomCode: selectedRoom.code,
        team: t,
        deltas: judgeDraftDeltas[t],
        revisedByName: `Judge · ${name.trim() || "Player"}`,
      });
    } catch (error) {
      setLoadError(
        error instanceof Error ? error.message : "Could not save revision",
      );
    } finally {
      setSavingJudgeRevision((prev) => ({ ...prev, [t]: false }));
    }
  }

  const teamInfo = team && isTeamId(team) ? TEAMS[team] : null;
  const redCount = roster.filter((p) => p.team === "red").length;
  const blueCount = roster.filter((p) => p.team === "blue").length;
  const judgeCount = roster.filter((p) => p.team === "judge").length;
  const isJudge = team === "judge";
  /** Synced countdown when running, else the scenario's default duration. */
  const secondsLeft =
    timerEndsAtMs != null
      ? Math.max(0, Math.round((timerEndsAtMs - nowTick) / 1000))
      : scenario?.discussion_seconds ?? 0;

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
              Pick a name, a mark, and a seat. Red and Blue get a private
              hidden role; Judges see both proposals and everyone&apos;s role
              instead.
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

            <label className={FIELD_LABEL}>Seat</label>
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
              <button
                type="button"
                className={`${OPT_CARD}${
                  team === "judge"
                    ? " border-clay-deep bg-[var(--tint-clay-soft)]"
                    : ""
                }`}
                onClick={() => setTeam("judge")}
              >
                <span className="text-[14.5px] font-semibold">Judge</span>
                <span className="text-[12.5px] text-ink-soft">
                  Neutral — see both proposals, every hidden role, and add
                  time to the round
                </span>
              </button>
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

      {screen === "stage" && scenario && team && categories && (
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
                {isJudge || !teamInfo || !hiddenRole ? (
                  <div className="inline-flex max-w-[220px] items-center gap-[6px] rounded-[20px] border border-dashed border-clay-deep bg-[var(--tint-clay-soft)] py-[5px] pr-3 pl-[10px]">
                    <span className="min-w-0 truncate text-[11.5px] font-semibold">
                      Judge · neutral
                    </span>
                  </div>
                ) : (
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
                    <span
                      className="shrink-0 text-[10px] text-ink-soft"
                      aria-hidden
                    >
                      {roleOpen ? "▴" : "▾"}
                    </span>
                  </button>
                )}
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
                  aria-label={`Discussion timer ${formatTimer(secondsLeft)}`}
                >
                  <span aria-hidden>⏱</span>
                  <span>{formatTimer(secondsLeft)}</span>
                  {isJudge && (
                    <button
                      type="button"
                      className="ml-[2px] shrink-0 cursor-pointer rounded-full border border-clay-deep bg-[var(--tint-clay-soft)] px-[6px] py-[1px] font-mono text-[10px] font-semibold text-clay-deep transition-colors hover:bg-[var(--tint-clay-hover)]"
                      onClick={() => void addMinuteToTimer()}
                      aria-label="Add one minute to the discussion timer"
                    >
                      +1m
                    </button>
                  )}
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

            {roleOpen && teamInfo && hiddenRole && (
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
                  You score 1 extra point at end of game if{" "}
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
              {stagePhase === "complete" ? (
              <>
                <p className="label-mono mb-[10px] text-clay-deep">Session complete</p>
                <h2 className="mb-2 font-display text-[24px] leading-[1.15] font-semibold">
                  Final scores &amp; role reveal
                </h2>
                <p className="mb-5 text-[13px] leading-[1.5] text-ink-soft">
                  Team score is that team&apos;s two city categories. Bonus is
                  +1 per hidden role on the team whose condition was met.
                  Shown as team + bonus.
                </p>

                {(["red", "blue"] as const).map((t) => {
                  const teamScore = teamCategoryScore(categories, t);
                  const members = roster.filter((p) => p.team === t);
                  const bonus = members.reduce((sum, p) => {
                    const role = rolesByPlayerId[p.id];
                    if (!role) return sum;
                    const met = roleConditionMet(
                      categories[role.target_category],
                      role.comparison,
                      role.threshold,
                    );
                    return sum + (met ? 1 : 0);
                  }, 0);
                  const rolesReady = members.every((p) => p.id in rolesByPlayerId);

                  return (
                    <div key={t} className="card mb-3 p-4">
                      <div className="mb-1 flex items-baseline justify-between gap-3">
                        <span
                          className={`text-[14px] font-semibold ${
                            t === "red" ? "text-rust" : "text-team-blue"
                          }`}
                        >
                          {TEAMS[t].name}
                        </span>
                        <span className="font-display text-[22px] font-semibold tabular-nums">
                          {rolesReady ? (
                            <>
                              {teamScore}
                              <span className="text-ink-soft"> + </span>
                              {bonus}
                            </>
                          ) : (
                            <span className="text-[14px] font-sans font-normal text-ink-soft">
                              …
                            </span>
                          )}
                        </span>
                      </div>
                      <p className="text-[11px] text-ink-soft">
                        {TEAMS[t].goalLabel}
                        {rolesReady
                          ? ` · ${members.length} role${members.length === 1 ? "" : "s"}`
                          : " · revealing roles…"}
                      </p>
                    </div>
                  );
                })}

                <p className="label-mono mt-5 mb-2 text-clay-deep">
                  Hidden roles revealed
                </p>
                <div className="flex flex-col gap-2">
                  {roster.filter((p) => p.team !== "judge").length === 0 && (
                    <p className="text-[13.5px] leading-[1.5] text-ink-soft">
                      No players to reveal.
                    </p>
                  )}
                  {roster
                    .filter((p): p is typeof p & { team: TeamId } =>
                      isTeamId(p.team),
                    )
                    .map((p) => {
                      const role = rolesByPlayerId[p.id];
                      const known = p.id in rolesByPlayerId;
                      const met =
                        role != null &&
                        roleConditionMet(
                          categories[role.target_category],
                          role.comparison,
                          role.threshold,
                        );
                      const categoryName =
                        role != null
                          ? (CATEGORIES.find((c) => c.id === role.target_category)
                              ?.name ?? role.target_category)
                          : "";

                      return (
                        <div key={p.id} className="card p-3">
                          <div className="mb-1 flex items-center justify-between gap-2">
                            <span className="text-[13.5px] font-semibold">
                              <span aria-hidden>{p.emoji}</span> {p.displayName}
                            </span>
                            <span
                              className={`font-mono text-[10px] ${
                                p.team === "red" ? "text-rust" : "text-team-blue"
                              }`}
                            >
                              {TEAMS[p.team].name}
                            </span>
                          </div>
                          {!known ? (
                            <p className="text-[12.5px] text-ink-soft">
                              Revealing…
                            </p>
                          ) : role == null ? (
                            <p className="text-[12.5px] text-ink-soft">
                              No role on file.
                            </p>
                          ) : (
                            <>
                              <p className="mb-1 text-[13px] font-semibold text-ink">
                                {role.role_name}
                              </p>
                              <p className="mb-2 text-[12px] leading-[1.45] text-ink-soft">
                                {roleRuleLabel(
                                  categoryName,
                                  role.comparison,
                                  role.threshold,
                                )}{" "}
                                · final {categoryName}{" "}
                                {categories[role.target_category] > 0 ? "+" : ""}
                                {categories[role.target_category]}
                              </p>
                              <p
                                className={`font-mono text-[11px] ${
                                  met ? "text-forest" : "text-ink-soft"
                                }`}
                              >
                                {met ? "✓ Met · bonus +1" : "✗ Not met · bonus 0"}
                              </p>
                            </>
                          )}
                        </div>
                      );
                    })}
                </div>

                {loadError && screen === "stage" && (
                  <p className={LOAD_ERROR}>{loadError}</p>
                )}
              </>
              ) : stagePhase === "vote" ? (
              <>
                <p className="label-mono mb-[10px] text-clay-deep">Voting</p>
                <h2 className="mb-2 font-display text-[24px] leading-[1.15] font-semibold">
                  Which proposal should the city adopt?
                </h2>
                <p className="mb-5 text-[13px] leading-[1.5] text-ink-soft">
                  Votes are public — tap a proposal to read it in full.{" "}
                  {isJudge
                    ? "Judges don't vote."
                    : "Tap a team name to cast or change your vote."}
                </p>

                {(["red", "blue"] as const).map((t) => {
                  const draft = teamProposals[t];
                  const expanded = expandedProposals[t];
                  const votesForTeam = votes.filter((v) => v.choice === t);
                  const iVotedHere =
                    myUid != null &&
                    votes.some(
                      (v) => v.playerId === myUid && v.choice === t,
                    );
                  const teamTint = t === "red" ? "text-rust" : "text-team-blue";
                  const teamBorderTint =
                    t === "red" ? "border-rust" : "border-team-blue";

                  return (
                    <div
                      key={t}
                      className={`card mb-4 overflow-hidden ${
                        iVotedHere ? teamBorderTint : ""
                      }`}
                    >
                      <button
                        type="button"
                        className="flex w-full cursor-pointer items-center justify-between gap-3 px-4 py-[14px] text-left font-sans text-inherit"
                        onClick={() => toggleProposalExpanded(t)}
                        aria-expanded={expanded}
                      >
                        <span className={`text-[14.5px] font-semibold ${teamTint}`}>
                          {TEAMS[t].name}
                        </span>
                        <span className="flex items-center gap-2">
                          <span className="font-mono text-[10px] text-ink-soft">
                            {votesForTeam.length}{" "}
                            {votesForTeam.length === 1 ? "vote" : "votes"}
                          </span>
                          <span
                            className="text-[10px] text-ink-soft"
                            aria-hidden
                          >
                            {expanded ? "▴" : "▾"}
                          </span>
                        </span>
                      </button>

                      <div className="px-4 pb-4">
                        <p
                          className={`mb-3 text-[13px] leading-[1.5] text-ink ${
                            expanded ? "whitespace-pre-wrap" : "truncate"
                          }`}
                        >
                          {draft?.proposal_text ||
                            "Waiting for this team's draft…"}
                        </p>

                        <p className="label-mono mb-1">
                          If adopted, revised totals
                        </p>
                        <div className="no-scrollbar mb-3 flex gap-1 overflow-x-auto pb-1">
                          {categories &&
                            CATEGORIES.map((cat) => {
                              const base = categories[cat.id];
                              const value = base + (draft ? draft[cat.id] : 0);
                              return (
                                <span key={cat.id} className="chip">
                                  <span className="text-ink-soft">
                                    {SCORE_ABBR[cat.id]}
                                  </span>
                                  <span
                                    className={
                                      value > base
                                        ? "text-forest"
                                        : value < base
                                          ? "text-rust"
                                          : ""
                                    }
                                  >
                                    {value > 0 ? "+" : ""}
                                    {value}
                                  </span>
                                </span>
                              );
                            })}
                        </div>

                        {expanded && !isJudge && (
                          <div className="no-scrollbar mb-3 flex gap-2 overflow-x-auto pb-1">
                            {DELTA_KEYS.map((key) => (
                              <span key={key} className="chip">
                                <span className="text-ink-soft">
                                  {SCORE_ABBR[key]}
                                </span>
                                <span>
                                  {formatDelta(draft ? draft[key] : 0)}
                                </span>
                              </span>
                            ))}
                          </div>
                        )}

                        {expanded && isJudge && draft && (
                          <>
                            <p className="mb-1 font-mono text-[10px] tracking-[0.04em] text-ink-soft uppercase">
                              Revise suggested changes
                            </p>
                            <div className="no-scrollbar mb-2 flex gap-2 overflow-x-auto pb-1">
                              {DELTA_KEYS.map((key) => (
                                <div
                                  key={key}
                                  className="flex shrink-0 items-center gap-1.5 rounded-lg border border-line bg-paper-deep px-2 py-1.5"
                                >
                                  <span className="font-mono text-[9px] tracking-[0.04em] text-ink-soft uppercase">
                                    {SCORE_ABBR[key]}
                                  </span>
                                  <button
                                    type="button"
                                    className="flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded border border-line bg-card text-xs font-semibold text-ink hover:border-clay-deep"
                                    aria-label={`Decrease ${TEAMS[t].name} ${key}`}
                                    onClick={() => nudgeJudgeDelta(t, key, -1)}
                                  >
                                    −
                                  </button>
                                  <span className="w-5 text-center font-display text-sm font-semibold">
                                    {formatDelta(judgeDraftDeltas[t][key])}
                                  </span>
                                  <button
                                    type="button"
                                    className="flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded border border-line bg-card text-xs font-semibold text-ink hover:border-clay-deep"
                                    aria-label={`Increase ${TEAMS[t].name} ${key}`}
                                    onClick={() => nudgeJudgeDelta(t, key, 1)}
                                  >
                                    +
                                  </button>
                                </div>
                              ))}
                            </div>
                            <button
                              type="button"
                              className="btn btn-secondary mb-3"
                              disabled={savingJudgeRevision[t]}
                              onClick={() => void saveJudgeRevision(t)}
                            >
                              {savingJudgeRevision[t]
                                ? "Saving…"
                                : "Save revision"}
                            </button>
                          </>
                        )}

                        {votesForTeam.length > 0 && (
                          <div className="mb-3 flex flex-wrap gap-1">
                            {votesForTeam.map((v) => (
                              <span
                                key={v.playerId}
                                className={`inline-flex items-center gap-1 rounded-full border px-[8px] py-[3px] text-[11px] ${
                                  v.voterTeam === "red"
                                    ? "border-team-red-line bg-team-red-soft text-rust"
                                    : "border-team-blue-line bg-team-blue-soft text-team-blue"
                                }`}
                                title={`${TEAMS[v.voterTeam].name} player`}
                              >
                                <span aria-hidden>{v.emoji}</span>
                                <span>{v.displayName}</span>
                              </span>
                            ))}
                          </div>
                        )}

                        {!isJudge && (
                          <button
                            type="button"
                            className={iVotedHere ? "btn btn-primary" : "btn btn-secondary"}
                            onClick={() => void voteForProposal(t)}
                          >
                            {iVotedHere ? "✓ Your vote" : `Vote ${TEAMS[t].name}`}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}

                {isJudge && (
                  <div className="card mb-4 border-clay-deep bg-[var(--tint-clay-soft)] p-4">
                    <p className="mb-1 text-[13.5px] font-semibold text-clay-deep">
                      Ready for the next round?
                    </p>
                    <p className="mb-3 text-[12.5px] leading-[1.45] text-ink-soft">
                      Applies the vote-winning proposal&apos;s numbers to the
                      city totals, clears votes, and opens the next scenario
                      (or finishes the session if this was the last round).
                      Needs a clear majority — ties won&apos;t advance.
                    </p>
                    <button
                      type="button"
                      className="btn btn-primary"
                      disabled={advancingRound}
                      onClick={() => void applyWinnerAndAdvance()}
                    >
                      {advancingRound
                        ? "Advancing…"
                        : "Apply winner & next round →"}
                    </button>
                  </div>
                )}

                {loadError && screen === "stage" && (
                  <p className={LOAD_ERROR}>{loadError}</p>
                )}
              </>
              ) : (
              <>
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

              {isJudge ? (
                <>
                  <div className="card mb-4 border-clay-deep bg-[var(--tint-clay-soft)] p-4">
                    <p className="mb-1 text-[13.5px] font-semibold text-clay-deep">
                      Ready to vote?
                    </p>
                    <p className="mb-3 text-[12.5px] leading-[1.45] text-ink-soft">
                      Moves everyone to a shared screen with both proposals,
                      revised scores, and a public vote.
                    </p>
                    <button
                      type="button"
                      className="btn btn-primary"
                      disabled={startingVote}
                      onClick={() => void moveToVoting()}
                    >
                      {startingVote ? "Starting…" : "Move room to voting →"}
                    </button>
                  </div>

                  <p className="label-mono mb-2 text-clay-deep">
                    Both team proposals
                  </p>
                  <p className="mb-3 text-[12.5px] leading-[1.45] text-ink-soft">
                    Their text is theirs to write — but you can revise the
                    suggested numbers below and Save to push your revision
                    live.
                  </p>
                  {(["red", "blue"] as const).map((t) => {
                    const draft = teamProposals[t];
                    return (
                      <div key={t} className="card mb-4 p-4">
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <span
                            className={`text-[13px] font-semibold ${
                              t === "red" ? "text-rust" : "text-team-blue"
                            }`}
                          >
                            {TEAMS[t].name}
                          </span>
                          {draft?.updatedByName && (
                            <span className="text-[11px] text-ink-soft">
                              Last by {draft.updatedByName}
                            </span>
                          )}
                        </div>
                        {draft ? (
                          <>
                            <p className="mb-3 whitespace-pre-wrap text-sm leading-[1.55] text-ink">
                              {draft.proposal_text || "(no text yet)"}
                            </p>
                            <p className="mb-1 font-mono text-[10px] tracking-[0.04em] text-ink-soft uppercase">
                              Suggested category changes
                            </p>
                            <div className="no-scrollbar mb-2 flex gap-2 overflow-x-auto pb-1">
                              {DELTA_KEYS.map((key) => (
                                <div
                                  key={key}
                                  className="flex shrink-0 items-center gap-1.5 rounded-lg border border-line bg-paper-deep px-2 py-1.5"
                                >
                                  <span className="font-mono text-[9px] tracking-[0.04em] text-ink-soft uppercase">
                                    {SCORE_ABBR[key]}
                                  </span>
                                  <button
                                    type="button"
                                    className="flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded border border-line bg-card text-xs font-semibold text-ink hover:border-clay-deep"
                                    aria-label={`Decrease ${TEAMS[t].name} ${key}`}
                                    onClick={() => nudgeJudgeDelta(t, key, -1)}
                                  >
                                    −
                                  </button>
                                  <span className="w-5 text-center font-display text-sm font-semibold">
                                    {formatDelta(judgeDraftDeltas[t][key])}
                                  </span>
                                  <button
                                    type="button"
                                    className="flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded border border-line bg-card text-xs font-semibold text-ink hover:border-clay-deep"
                                    aria-label={`Increase ${TEAMS[t].name} ${key}`}
                                    onClick={() => nudgeJudgeDelta(t, key, 1)}
                                  >
                                    +
                                  </button>
                                </div>
                              ))}
                            </div>
                            <button
                              type="button"
                              className="btn btn-secondary"
                              disabled={savingJudgeRevision[t]}
                              onClick={() => void saveJudgeRevision(t)}
                            >
                              {savingJudgeRevision[t]
                                ? "Saving…"
                                : "Save revision"}
                            </button>
                          </>
                        ) : (
                          <p className="text-[13px] text-ink-soft">
                            Waiting for this team to start their draft…
                          </p>
                        )}
                      </div>
                    );
                  })}

                  <p className="label-mono mt-6 mb-2 text-clay-deep">
                    Hidden roles
                  </p>
                  <div className="flex flex-col gap-2">
                    {roster.filter((p) => p.team !== "judge").length ===
                      0 && (
                      <p className="text-[13.5px] leading-[1.5] text-ink-soft">
                        No players yet.
                      </p>
                    )}
                    {roster
                      .filter((p) => p.team !== "judge")
                      .map((p) => {
                        const known = p.id in rolesByPlayerId;
                        const role = rolesByPlayerId[p.id];
                        return (
                          <div
                            key={p.id}
                            className={`card flex items-center gap-[10px] border-l-[3px] px-3 py-[10px] ${
                              p.team === "red"
                                ? "border-l-rust"
                                : "border-l-team-blue"
                            }`}
                          >
                            <span className="text-lg leading-none">
                              {p.emoji}
                            </span>
                            <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                              {p.displayName}
                            </span>
                            <span className="text-right text-[12px] text-ink-soft">
                              {!known
                                ? "Loading…"
                                : role
                                  ? role.role_name
                                  : "—"}
                            </span>
                          </div>
                        );
                      })}
                  </div>

                  {loadError && screen === "stage" && (
                    <p className={`${LOAD_ERROR} mt-4`}>{loadError}</p>
                  )}
                </>
              ) : (
                teamInfo &&
                starter && (
                  <>
                    <p className="label-mono mb-2">
                      Your team&apos;s proposal
                    </p>
                    <p className="mb-3 text-[12.5px] leading-[1.45] text-ink-soft">
                      Shared with your team only. Prefer{" "}
                      <strong>one person revising at a time</strong> — Submit
                      overwrites the text and all five numbers for everyone
                      (last write wins).
                    </p>
                    <div className="card mb-2 p-4">
                      <label className={FIELD_LABEL} htmlFor="proposal-text">
                        Proposal text
                      </label>
                      <textarea
                        id="proposal-text"
                        className="mb-4 min-h-[280px] w-full resize-y rounded-[10px] border border-line bg-paper px-3 py-[10px] font-sans text-sm leading-[1.55] text-ink focus:border-clay-deep focus:outline-none"
                        value={draftText}
                        onChange={(e) => setDraftText(e.target.value)}
                        maxLength={2000}
                        rows={10}
                      />

                      <p className={FIELD_LABEL}>Suggested category changes</p>
                      <div className="no-scrollbar mb-4 flex gap-2 overflow-x-auto pb-1">
                        {DELTA_KEYS.map((key) => (
                          <div
                            key={key}
                            className="flex shrink-0 items-center gap-1.5 rounded-lg border border-line bg-paper-deep px-2 py-1.5"
                          >
                            <span className="font-mono text-[9px] tracking-[0.04em] text-ink-soft uppercase">
                              {SCORE_ABBR[key]}
                            </span>
                            <button
                              type="button"
                              className="flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded border border-line bg-card text-xs font-semibold text-ink hover:border-clay-deep"
                              aria-label={`Decrease ${key}`}
                              onClick={() => nudgeDelta(key, -1)}
                            >
                              −
                            </button>
                            <span className="w-5 text-center font-display text-sm font-semibold">
                              {formatDelta(draftDeltas[key])}
                            </span>
                            <button
                              type="button"
                              className="flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded border border-line bg-card text-xs font-semibold text-ink hover:border-clay-deep"
                              aria-label={`Increase ${key}`}
                              onClick={() => nudgeDelta(key, 1)}
                            >
                              +
                            </button>
                          </div>
                        ))}
                      </div>

                      {draftUpdatedBy && (
                        <p className="mb-3 text-[12px] text-ink-soft">
                          Last revision by <strong>{draftUpdatedBy}</strong>
                          {draftUpdatedAtMs
                            ? ` · ${new Date(draftUpdatedAtMs).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`
                            : ""}
                        </p>
                      )}

                      {loadError && screen === "stage" && (
                        <p className={LOAD_ERROR}>{loadError}</p>
                      )}

                      <button
                        type="button"
                        className="btn btn-primary"
                        disabled={submittingProposal || !draftText.trim()}
                        onClick={() => void submitProposalRevision()}
                      >
                        {submittingProposal
                          ? "Submitting…"
                          : "Submit revision"}
                      </button>
                    </div>
                  </>
                )
              )}
              </>
              )}
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
                    {judgeCount > 0 && (
                      <>
                        {" · "}
                        <span className="text-clay-deep">
                          {judgeCount} Judge{judgeCount === 1 ? "" : "s"}
                        </span>
                      </>
                    )}
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
                            : player.team === "blue"
                              ? "border-l-team-blue"
                              : "border-l-clay-deep"
                        }`}
                      >
                        <span className="text-lg leading-none">
                          {player.emoji}
                        </span>
                        <span className="flex-1 text-sm font-semibold">
                          {player.displayName}
                        </span>
                        <span className="font-mono text-[11px] text-ink-soft">
                          {player.team === "judge"
                            ? "Judge"
                            : TEAMS[player.team].name}
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
