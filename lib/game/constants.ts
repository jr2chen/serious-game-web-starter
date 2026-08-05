import type { Category, CategoryTotals, Team, TeamId } from "@/lib/game/types";

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

/** Suggested category changes in a team's proposal revision may go up to ±4. */
export const PROPOSAL_DELTA_LIMIT = 4;

export const INITIAL_CATEGORY_TOTALS: CategoryTotals = {
  jobs: 0,
  housing: 0,
  accessibility: 0,
  climate: 0,
  cost: 0,
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
