import { TEAMS } from "@/lib/game/constants";
import type {
  CategoryTotals,
  ComparisonOp,
  HiddenRole,
  ScoringConfig,
  SeatRole,
  TeamId,
} from "@/lib/game/types";

export const COMPARISON_OPS: ComparisonOp[] = [">", ">=", "<", "<=", "="];

export function isComparisonOp(value: string): value is ComparisonOp {
  return (COMPARISON_OPS as string[]).includes(value);
}

/** Narrows a seat role to a scoring team (excludes the neutral judge seat). */
export function isTeamId(seat: SeatRole): seat is TeamId {
  return seat === "red" || seat === "blue";
}

export function formatThreshold(value: number): string {
  return value > 0 ? `+${value}` : String(value);
}

/** Plain-language rule for the role card. */
export function roleRuleLabel(
  category: string,
  comparison: ComparisonOp,
  threshold: number,
): string {
  const t = formatThreshold(threshold);
  switch (comparison) {
    case ">":
      return `${category} ends above ${t}`;
    case ">=":
      return `${category} ends at ${t} or above`;
    case "<":
      return `${category} ends below ${t}`;
    case "<=":
      return `${category} ends at ${t} or below`;
    case "=":
      return `${category} ends exactly at ${t}`;
  }
}

/** Used at end of game — returns whether the role scores 1 point. */
export function roleConditionMet(
  finalTotal: number,
  comparison: ComparisonOp,
  threshold: number,
): boolean {
  switch (comparison) {
    case ">":
      return finalTotal > threshold;
    case ">=":
      return finalTotal >= threshold;
    case "<":
      return finalTotal < threshold;
    case "<=":
      return finalTotal <= threshold;
    case "=":
      return finalTotal === threshold;
  }
}

/**
 * Team points from that team's two goal categories (Red = Jobs+Housing,
 * Blue = Accessibility+Climate). Each category that ends above 0 scores
 * +1, so the team total is 0, 1, or 2 — never the raw category sum.
 */
export function teamCategoryScore(
  totals: CategoryTotals,
  teamId: TeamId,
): number {
  return TEAMS[teamId].goalCategories.reduce(
    (score, categoryId) => score + (totals[categoryId] > 0 ? 1 : 0),
    0,
  );
}

/** Chance a team gets its preferred role in corruption (`role_bonus=category`) mode. */
export const CORRUPTION_ROLE_SKEW = 0.6;

/**
 * Pick a hidden role. In corruption mode, skew joins toward team interests:
 * Blue → housing 60%, Red → cost 60%; otherwise uniform.
 */
export function pickHiddenRole(
  roles: HiddenRole[],
  team: TeamId | null | undefined,
  scoring: ScoringConfig,
): HiddenRole {
  if (!roles.length) {
    throw new Error("No roles available");
  }
  if (scoring.role_bonus !== "category" || team == null) {
    return roles[Math.floor(Math.random() * roles.length)]!;
  }

  const preferredCategory = team === "blue" ? "housing" : "cost";
  const preferred = roles.filter((r) => r.target_category === preferredCategory);
  const others = roles.filter((r) => r.target_category !== preferredCategory);

  if (preferred.length && Math.random() < CORRUPTION_ROLE_SKEW) {
    return preferred[Math.floor(Math.random() * preferred.length)]!;
  }
  const pool = others.length ? others : roles;
  return pool[Math.floor(Math.random() * pool.length)]!;
}

/**
 * Corruption role points from a city category.
 * Higher-is-better categories use the raw total.
 * Cost reduction uses (threshold − cost): below threshold is positive, above is negative.
 */
export function categoryRoleBonus(
  role: HiddenRole,
  categoryTotals: CategoryTotals,
): number {
  const value = categoryTotals[role.target_category];
  if (role.target_category === "cost") {
    return role.threshold - value;
  }
  return value;
}

export type PlayerScoreBreakdown = {
  /** Base from scoring.csv player_base (capped team points or policy win). */
  base: number;
  /** Role bonus — fixed CSV points when met, or category-mode corruption points. */
  roleBonus: number;
  roleMet: boolean;
  total: number;
};

/**
 * Personal scoreboard math — style flips via scoring.csv.
 * Team scoreboard always uses teamCategoryScore alone (no role points).
 */
export function playerScoreBreakdown(input: {
  scoring: ScoringConfig;
  teamId: TeamId;
  categoryTotals: CategoryTotals;
  lastWinnerTeam: TeamId | null | undefined;
  role: HiddenRole | null;
}): PlayerScoreBreakdown {
  const roleMet =
    input.role != null &&
    roleConditionMet(
      input.categoryTotals[input.role.target_category],
      input.role.comparison,
      input.role.threshold,
    );

  let roleBonus = 0;
  if (input.role != null) {
    if (input.scoring.role_bonus === "category") {
      roleBonus = categoryRoleBonus(input.role, input.categoryTotals);
    } else if (roleMet) {
      roleBonus = input.role.points;
    }
  }

  let base = 0;
  if (input.scoring.player_base === "categories") {
    base = teamCategoryScore(input.categoryTotals, input.teamId);
  } else if (
    input.lastWinnerTeam != null &&
    input.teamId === input.lastWinnerTeam
  ) {
    base = input.scoring.policy_win_points;
  }

  return {
    base,
    roleBonus,
    roleMet,
    total: base + roleBonus,
  };
}
