import { describe, expect, it } from "vitest";
import { ApplicationStatus } from "@prisma/client";
import {
  ALL_STATUSES,
  PIPELINE_STATUSES,
  STATUS_META,
  statusLabel,
} from "./status";

describe("status metadata", () => {
  it("covers every Prisma ApplicationStatus enum value", () => {
    const enumValues = Object.values(ApplicationStatus).sort();
    expect([...ALL_STATUSES].sort()).toEqual(enumValues);
    for (const s of enumValues) {
      expect(STATUS_META[s]).toBeDefined();
      expect(STATUS_META[s].label).toBeTruthy();
    }
  });

  it("marks terminal states as inactive", () => {
    expect(STATUS_META.REJECTED.active).toBe(false);
    expect(STATUS_META.GHOSTED.active).toBe(false);
    expect(STATUS_META.WITHDRAWN.active).toBe(false);
    expect(STATUS_META.APPLIED.active).toBe(true);
  });

  it("pipeline columns are all real, active statuses in order", () => {
    for (const s of PIPELINE_STATUSES) {
      expect(ALL_STATUSES).toContain(s);
      expect(STATUS_META[s].active).toBe(true);
    }
    const orders = PIPELINE_STATUSES.map((s) => STATUS_META[s].order);
    expect(orders).toEqual([...orders].sort((a, b) => a - b));
  });

  it("statusLabel returns the human label", () => {
    expect(statusLabel("PHONE_SCREEN")).toBe("Phone screen");
  });
});
