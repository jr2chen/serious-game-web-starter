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

export type PlayerScoreBreakdown = {
  /** Base from scoring.csv player_base (categories total or policy win). */
  base: number;
  /** Role points from roles.csv when the condition is met; else 0. */
  roleBonus: number;
  roleMet: boolean;
  total: number;
};

/**
 * Personal scoreboard math — style flips via scoring.csv `player_base`.
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
  const roleBonus =
    roleMet && input.role != null ? input.role.points : 0;

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
