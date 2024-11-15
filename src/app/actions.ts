"use server";

import { makeDecision as _makeDecision, debate as _debate, commonConfig, History } from "@/lib/ai";

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