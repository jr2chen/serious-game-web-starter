import type {
  Category,
  CategoryTotals,
  Room,
  Team,
  TeamId,
} from "@/lib/game/types";

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

/** Placeholder open-room list until Firebase rooms (Epic 3). */
export const DEMO_ROOMS: Room[] = [
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
