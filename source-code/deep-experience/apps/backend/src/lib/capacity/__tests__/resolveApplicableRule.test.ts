import { describe, expect, it } from "vitest";
import { resolveApplicableRule } from "../resolveApplicableRule";
import type { CapacityRuleSettings } from "../types";

const rule = (
  id: string,
  overrides: Partial<CapacityRuleSettings> = {}
): CapacityRuleSettings => ({
  id,
  minParticipants: 1,
  maxPerBooking: null,
  minPerBooking: 1,
  priority: 0,
  isActive: true,
  ...overrides,
});

describe("resolveApplicableRule", () => {
  it("returns null when no rules exist", () => {
    expect(resolveApplicableRule({ sourceRuleId: null, rules: [] })).toBeNull();
  });

  it("returns null when all rules are inactive", () => {
    expect(
      resolveApplicableRule({
        sourceRuleId: null,
        rules: [rule("r1", { isActive: false })],
      })
    ).toBeNull();
  });

  it("returns the highest-priority active rule when sourceRuleId is not set", () => {
    // rules are expected pre-sorted by priority desc
    const result = resolveApplicableRule({
      sourceRuleId: null,
      rules: [rule("hi", { priority: 10 }), rule("lo", { priority: 1 })],
    });
    expect(result?.id).toBe("hi");
  });

  it("returns the rule matching sourceRuleId when it is active", () => {
    const result = resolveApplicableRule({
      sourceRuleId: "lo",
      rules: [rule("hi", { priority: 10 }), rule("lo", { priority: 1 })],
    });
    expect(result?.id).toBe("lo");
  });

  it("falls back to highest priority when sourceRuleId's rule is inactive", () => {
    const result = resolveApplicableRule({
      sourceRuleId: "lo",
      rules: [
        rule("hi", { priority: 10 }),
        rule("lo", { priority: 1, isActive: false }),
      ],
    });
    expect(result?.id).toBe("hi");
  });

  it("falls back to highest priority when sourceRuleId points to a non-existent rule", () => {
    const result = resolveApplicableRule({
      sourceRuleId: "missing",
      rules: [rule("hi", { priority: 10 })],
    });
    expect(result?.id).toBe("hi");
  });
});
