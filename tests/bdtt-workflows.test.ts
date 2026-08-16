import { describe, expect, it } from "vitest";
import { canTransitionAbnormality } from "@/lib/abnormalityWorkflow";
import {
  canTransitionDataIssue,
  getDataIssueStatusForAction
} from "@/lib/dataIssueWorkflow";

describe("data issue lifecycle", () => {
  it("supports review then resolve/reject and blocks reopening terminal states", () => {
    expect(getDataIssueStatusForAction("review")).toBe("reviewing");
    expect(canTransitionDataIssue("open", "reviewing")).toBe(true);
    expect(canTransitionDataIssue("reviewing", "resolved")).toBe(true);
    expect(canTransitionDataIssue("resolved", "reviewing")).toBe(false);
    expect(canTransitionDataIssue("rejected", "resolved")).toBe(false);
  });
});

describe("abnormality lifecycle", () => {
  it("follows new → in progress → resolved → closed and allows reopen before close", () => {
    expect(canTransitionAbnormality("new", "in_progress")).toBe(true);
    expect(canTransitionAbnormality("in_progress", "resolved")).toBe(true);
    expect(canTransitionAbnormality("resolved", "in_progress")).toBe(true);
    expect(canTransitionAbnormality("resolved", "closed")).toBe(true);
    expect(canTransitionAbnormality("closed", "in_progress")).toBe(false);
  });
});
