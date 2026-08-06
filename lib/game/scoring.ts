import type { ComparisonOp, SeatRole, TeamId } from "@/lib/game/types";

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
