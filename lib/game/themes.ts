import type { GameTheme, ThemeId } from "@/lib/game/types";

/** Workshop themes — only Municipal for now; add rows later. */
export const THEMES: Record<ThemeId, GameTheme> = {
  municipal: {
    id: "municipal",
    name: "Municipal Commons",
    blurb: "Jobs, housing, access, climate, and cost trade-offs across two rounds.",
    icon: "🏛",
  },
};

export const THEME_LIST: GameTheme[] = Object.values(THEMES);
