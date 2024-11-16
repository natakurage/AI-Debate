"use server";

import {
  makeDecision as _makeDecision,
  debate as _debate,
  debateProgressive as _debateProgressive,
  judge as _judge,
  commonConfig, History, 
  aggregateJudgments as _aggregateJudgments,
  Judgment} from "@/lib/ai";

export async function debate(agenda: string, num_iterations: number) {
  return await _debate(agenda, num_iterations, commonConfig);
}

export async function makeDecision(
  agenda: string, num_judges: number, history: History
) {
  const config = {...commonConfig};
  config.maxWords = 300;
  return await _makeDecision(agenda, num_judges, history, config);
}

export async function debateProgressive(agenda: string, history: History) {
  return await _debateProgressive(agenda, history, commonConfig);
}

export async function judge(agenda: string, i: number, history: History) {
  const config = {...commonConfig};
  config.maxWords = 300;
  return await _judge(agenda, i, history, config);
}

export async function aggregateJudgments(judgments: Judgment[]) {
  return _aggregateJudgments(judgments);
}