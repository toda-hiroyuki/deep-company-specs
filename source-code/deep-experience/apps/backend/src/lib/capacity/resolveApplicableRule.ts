import type { CapacityRuleSettings } from "./types";

export type ResolveApplicableRuleInput = {
  sourceRuleId: string | null;
  // rules are expected to be pre-sorted by priority descending.
  rules: CapacityRuleSettings[];
};

// Returns the CapacityRule to evaluate for participant-limit checks (check item 4).
//
// Priority:
//   1. sourceRuleId is set AND that rule exists and is active → that rule (preserves
//      the rule that generated the existing TourSchedule, even if priorities change later).
//   2. Otherwise → the highest-priority active rule.
//   3. No active rules → null (caller skips CapacityRule-derived constraints; Tour.maxParticipants still applies).
export function resolveApplicableRule(
  input: ResolveApplicableRuleInput
): CapacityRuleSettings | null {
  const active = input.rules.filter((r) => r.isActive);
  if (input.sourceRuleId) {
    const fromSource = active.find((r) => r.id === input.sourceRuleId);
    if (fromSource) return fromSource;
  }
  return active[0] ?? null;
}
