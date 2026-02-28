import { useLiveQuery } from "../db/useLiveQuery";
import { goalRepository } from "../repositories/goalRepository";

export function useGoals() {
  const goals = useLiveQuery("goals", () => goalRepository.getAllGoals());
  return { goals: goals ?? [] };
}
