export type TeamId = "red" | "blue";

export type CategoryId =
  | "jobs"
  | "housing"
  | "accessibility"
  | "climate"
  | "cost";

export type ScoreCondition = "positive" | "non_positive";

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
  score_condition: ScoreCondition;
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
  id: string;
  name: string;
  tag: "coastal" | "water" | "energy" | "land";
  icon: string;
  topic: string;
  playerCount: number;
};
