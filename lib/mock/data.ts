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
