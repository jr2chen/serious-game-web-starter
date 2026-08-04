export type Room = {
  id: string;
  name: string;
  tag: "coastal" | "water" | "energy" | "land";
  icon: string;
  topic: string;
  playerCount: number;
};

export type Scenario = {
  title: string;
  eyebrow: string;
  tags: string[];
  paragraphs: string[];
};

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

export const TEAMS: Record<TeamId, Team> = {
  red: {
    id: "red",
    name: "Red Team",
    goalCategories: ["jobs", "housing"],
    goalLabel: "Jobs and Housing",
  },
  blue: {
    id: "blue",
    name: "Blue Team",
    goalCategories: ["accessibility", "climate"],
    goalLabel: "Accessibility and Climate",
  },
};

export const CATEGORIES: Category[] = [
  {
    id: "jobs",
    name: "Jobs",
    blurb: "Employment, apprenticeships, economic activity",
  },
  {
    id: "housing",
    name: "Housing",
    blurb: "Supply, affordability, displacement",
  },
  {
    id: "accessibility",
    name: "Accessibility",
    blurb: "Access for disabled, older, and underserved residents",
  },
  {
    id: "climate",
    name: "Climate",
    blurb: "Emissions, green space, climate resilience",
  },
  {
    id: "cost",
    name: "Cost",
    blurb: "Cost to the city (+ costs more, − saves money)",
  },
];

export const INITIAL_CATEGORY_TOTALS: CategoryTotals = {
  jobs: 0,
  housing: 0,
  accessibility: 0,
  climate: 0,
  cost: 0,
};

/** Locked V1 hidden roles — later loaded from roles.csv */
export const MOCK_ROLES: HiddenRole[] = [
  {
    role_id: "labour",
    role_name: "Labour Representative",
    description: "You want the city to create more jobs.",
    target_category: "jobs",
    score_condition: "positive",
  },
  {
    role_id: "housing",
    role_name: "Housing Advocate",
    description: "You want the city to improve housing supply and affordability.",
    target_category: "housing",
    score_condition: "positive",
  },
  {
    role_id: "accessibility",
    role_name: "Accessibility Advocate",
    description: "You want the city to become more accessible.",
    target_category: "accessibility",
    score_condition: "positive",
  },
  {
    role_id: "environment",
    role_name: "Environmental Advocate",
    description: "You want the city to improve its climate outcomes.",
    target_category: "climate",
    score_condition: "positive",
  },
  {
    role_id: "fiscal",
    role_name: "Fiscal Watchdog",
    description: "You want the city to avoid increasing costs.",
    target_category: "cost",
    score_condition: "non_positive",
  },
];

export const MOCK_ROOMS: Room[] = [
  {
    id: "coastal-rezoning",
    name: "Coastal Rezoning",
    tag: "coastal",
    icon: "🌊",
    topic: "Land use",
    playerCount: 3,
  },
  {
    id: "water-rights",
    name: "Water Rights Dispute",
    tag: "water",
    icon: "💧",
    topic: "Water",
    playerCount: 2,
  },
  {
    id: "community-solar",
    name: "Community Solar Co-op",
    tag: "energy",
    icon: "☀️",
    topic: "Energy",
    playerCount: 5,
  },
  {
    id: "farmland-buyout",
    name: "Farmland Buyout",
    tag: "land",
    icon: "🌾",
    topic: "Land use",
    playerCount: 1,
  },
];

/** One scenario for this increment — create-room can pick later. */
export const MOCK_SCENARIO: Scenario = {
  title: "The reservoir runs low",
  eyebrow: "Scenario 1 of 1 · mock data",
  tags: ["Water rights", "Drought season", "4 stakeholders"],
  paragraphs: [
    "Your town's reservoir has dropped to 30% capacity after two dry winters. The farming co-op upstream holds senior water rights dating back decades. The growing suburb downstream is under its first-ever watering restrictions.",
    "A regional agency has offered emergency funding — but only if the town agrees on a single allocation plan by the end of this session. Everyone at this table represents a different stake in what happens next.",
  ],
};

export const EMOJI_OPTIONS = [
  "🙂",
  "🦊",
  "🌱",
  "🐢",
  "🪨",
  "🌊",
  "🔥",
  "🦉",
  "🐝",
  "🍃",
  "⛰️",
  "🧭",
] as const;
