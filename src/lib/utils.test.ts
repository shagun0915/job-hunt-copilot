import { describe, expect, it, vi, afterEach } from "vitest";
import { daysBetween, fmtSalary, relativeDays } from "./utils";

describe("fmtSalary", () => {
  it("formats a range in k", () => {
    expect(fmtSalary(120000, 160000)).toBe("$120k–$160k");
  });
  it("formats an open-ended min", () => {
    expect(fmtSalary(150000, null)).toBe("$150k+");
  });
  it("formats a max-only", () => {
    expect(fmtSalary(null, 90000)).toBe("up to $90k");
  });
  it("falls back to the note, then a dash", () => {
    expect(fmtSalary(null, null, "competitive")).toBe("competitive");
    expect(fmtSalary(null, null)).toBe("—");
  });
});

describe("daysBetween", () => {
  it("counts whole days between two dates", () => {
    expect(
      daysBetween(new Date("2026-01-10T00:00:00Z"), new Date("2026-01-01T00:00:00Z")),
    ).toBe(9);
  });
});

describe("relativeDays", () => {
  afterEach(() => vi.useRealTimers());

  it("labels past and future dates relative to now", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-15T12:00:00Z"));
    expect(relativeDays(new Date("2026-06-15T09:00:00Z"))).toBe("today");
    expect(relativeDays(new Date("2026-06-14T09:00:00Z"))).toBe("yesterday");
    expect(relativeDays(new Date("2026-06-16T18:00:00Z"))).toBe("tomorrow");
    expect(relativeDays(new Date("2026-06-10T12:00:00Z"))).toBe("5d ago");
    expect(relativeDays(new Date("2026-06-22T12:00:00Z"))).toBe("in 7d");
    expect(relativeDays(null)).toBe("");
  });
});
