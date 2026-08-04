export type TeamId = "red" | "blue";

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
};

export type ThemeId = "municipal";

export type GameTheme = {
  id: ThemeId;
  name: string;
  blurb: string;
  icon: string;
};
