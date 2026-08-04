import { readFile } from "fs/promises";
import path from "path";
import { parseCsv, requireFields } from "@/lib/content/parseCsv";
import type {
  CategoryId,
  HiddenRole,
  Scenario,
  ScoreCondition,
  StarterProposal,
  TeamId,
} from "@/lib/game/types";

const CONTENT_DIR = path.join(process.cwd(), "content");

const CATEGORY_IDS: CategoryId[] = [
  "jobs",
  "housing",
  "accessibility",
  "climate",
  "cost",
];

async function readCsv(fileName: string): Promise<Record<string, string>[]> {
  const filePath = path.join(CONTENT_DIR, fileName);
  const text = await readFile(filePath, "utf8");
  return parseCsv(text);
}

export async function loadScenarios(): Promise<Scenario[]> {
  const rows = await readCsv("scenarios.csv");
  const scenarios = rows.map((row, index) => {
    requireFields(
      row,
      [
        "scenario_id",
        "title",
        "problem",
        "team_task",
        "discussion_seconds",
        "round_order",
      ],
      `scenarios.csv row ${index + 2}`,
    );
    const discussion_seconds = Number(row.discussion_seconds);
    const round_order = Number(row.round_order);
    if (!Number.isFinite(discussion_seconds) || !Number.isFinite(round_order)) {
      throw new Error(
        `scenarios.csv row ${index + 2} has invalid discussion_seconds or round_order`,
      );
    }
    return {
      scenario_id: row.scenario_id!,
      title: row.title!,
      problem: row.problem!,
      team_task: row.team_task!,
      discussion_seconds,
      round_order,
    };
  });

  return scenarios.sort((a, b) => a.round_order - b.round_order);
}

export async function loadRoles(): Promise<HiddenRole[]> {
  const rows = await readCsv("roles.csv");
  return rows.map((row, index) => {
    requireFields(
      row,
      [
        "role_id",
        "role_name",
        "description",
        "target_category",
        "score_condition",
      ],
      `roles.csv row ${index + 2}`,
    );
    const target = row.target_category as CategoryId;
    const condition = row.score_condition as ScoreCondition;
    if (!CATEGORY_IDS.includes(target)) {
      throw new Error(
        `roles.csv row ${index + 2}: unknown target_category "${row.target_category}"`,
      );
    }
    if (condition !== "positive" && condition !== "non_positive") {
      throw new Error(
        `roles.csv row ${index + 2}: unknown score_condition "${row.score_condition}"`,
      );
    }
    return {
      role_id: row.role_id!,
      role_name: row.role_name!,
      description: row.description!,
      target_category: target,
      score_condition: condition,
    };
  });
}

export async function loadStarterProposals(): Promise<StarterProposal[]> {
  const rows = await readCsv("starter_proposals.csv");
  return rows.map((row, index) => {
    requireFields(
      row,
      [
        "scenario_id",
        "team",
        "proposal_text",
        "jobs",
        "housing",
        "accessibility",
        "climate",
        "cost",
      ],
      `starter_proposals.csv row ${index + 2}`,
    );
    const team = row.team as TeamId;
    if (team !== "red" && team !== "blue") {
      throw new Error(
        `starter_proposals.csv row ${index + 2}: team must be red or blue`,
      );
    }
    const deltas = {
      jobs: Number(row.jobs),
      housing: Number(row.housing),
      accessibility: Number(row.accessibility),
      climate: Number(row.climate),
      cost: Number(row.cost),
    };
    for (const [key, value] of Object.entries(deltas)) {
      if (!Number.isFinite(value) || value < -2 || value > 2) {
        throw new Error(
          `starter_proposals.csv row ${index + 2}: ${key} must be between -2 and +2`,
        );
      }
    }
    return {
      scenario_id: row.scenario_id!,
      team,
      proposal_text: row.proposal_text!,
      ...deltas,
    };
  });
}

export async function loadFirstScenario(): Promise<Scenario> {
  const scenarios = await loadScenarios();
  if (!scenarios[0]) {
    throw new Error("scenarios.csv has no rows");
  }
  return scenarios[0];
}

export async function loadStarterProposal(
  scenarioId: string,
  team: TeamId,
): Promise<StarterProposal> {
  const proposals = await loadStarterProposals();
  const match = proposals.find(
    (p) => p.scenario_id === scenarioId && p.team === team,
  );
  if (!match) {
    throw new Error(
      `No starter proposal for scenario "${scenarioId}" and team "${team}"`,
    );
  }
  return match;
}
