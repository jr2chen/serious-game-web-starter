export type TeamId = "red" | "blue";

/** A player's seat in a room: a visible team, or a neutral judge. */
export type SeatRole = TeamId | "judge";

export type CategoryId =
  | "jobs"
  | "housing"
  | "accessibility"
  | "climate"
  | "cost";

/** How the final category total is compared to the threshold. */
export type ComparisonOp = ">" | ">=" | "<" | "<=" | "=";

export type Team = {
  id: TeamId;
  name: string;
  goalCategories: CategoryId[];
  goalLabel: string;
};

export type Category = {
  id: CategoryId;
  name: string;
  blurb: string;
};

export type HiddenRole = {
  role_id: string;
  role_name: string;
  description: string;
  target_category: CategoryId;
  comparison: ComparisonOp;
  threshold: number;
  /** Points awarded when the role condition is met at end of game. */
  points: number;
};

/**
 * How a player's "base" score is computed on the final scoreboard.
 * - categories: capped team points (0–2 from goal categories above 0)
 * - policy: points if that player's team was the last adopted proposal
 */
export type PlayerBaseScoring = "categories" | "policy";

/**
 * How role bonus is computed on the player scoreboard.
 * - fixed: roles.csv `points` when the role condition is met (else 0)
 * - category: final city total for the role's target category (can be + or −)
 *   — the "corruption" style: reward how that area ended, not a flat bonus
 */
export type RoleBonusScoring = "fixed" | "category";

export type ScoringConfig = {
  player_base: PlayerBaseScoring;
  /** Points for a policy win when player_base is "policy" (from scoring.csv). */
  policy_win_points: number;
  role_bonus: RoleBonusScoring;
};

export type CategoryTotals = Record<CategoryId, number>;

export type Scenario = {
  scenario_id: string;
  title: string;
  problem: string;
  team_task: string;
  discussion_seconds: number;
  round_order: number;
};

export type StarterProposal = {
  scenario_id: string;
  team: TeamId;
  proposal_text: string;
  jobs: number;
  housing: number;
  accessibility: number;
  climate: number;
  cost: number;
};

/** Live shared draft for one team in a room (last submit wins). */
export type TeamProposalDraft = {
  team: TeamId;
  scenario_id: string;
  proposal_text: string;
  jobs: number;
  housing: number;
  accessibility: number;
  climate: number;
  cost: number;
  updatedAtMs: number;
  updatedByUid: string;
  updatedByName: string;
};

export type RoomPhase = "discuss" | "vote" | "complete";

export type Room = {
  /** Short join code; also used as the Firestore document id. */
  id: string;
  code: string;
  name: string;
  themeId: ThemeId;
  themeName: string;
  icon: string;
  createdAtMs: number;
  createdBy: string;
  playerCount: number;
  /** Shared discussion countdown target (epoch ms); unset until stage starts. */
  timerEndsAtMs?: number;
  /**
   * "discuss" (default) → "vote" when a judge reveals proposals →
   * "complete" after the last round's winner is applied.
   */
  phase?: RoomPhase;
  /** Current scenario id — advances when a judge starts the next round. */
  scenarioId?: string;
  /** Current round_order from CSV — advances with scenarioId. */
  roundOrder?: number;
  /** Running city category totals — updated when a vote winner is applied. */
  categoryTotals?: CategoryTotals;
  /** Last proposal the judge adopted — used by policy-style player scoring. */
  lastWinnerTeam?: TeamId;
};

export type RoomPlayer = {
  id: string;
  displayName: string;
  emoji: string;
  team: SeatRole;
  joinedAtMs: number;
};

/** One player's public vote for which team's proposal the city should adopt. */
export type ProposalVote = {
  playerId: string;
  choice: TeamId;
  /** The voter's own seated team — colors their chip on the vote screen. */
  voterTeam: TeamId;
  displayName: string;
  emoji: string;
  updatedAtMs: number;
};

export type ThemeId = "municipal";

export type GameTheme = {
  id: ThemeId;
  name: string;
  blurb: string;
  icon: string;
};
