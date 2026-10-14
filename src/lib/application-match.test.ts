import { describe, expect, it } from "vitest";
import { disambiguateByRole } from "./application-match";

describe("disambiguateByRole", () => {
  it("returns the only candidate without needing role text", () => {
    const id = disambiguateByRole([{ id: "a1", role: "Backend Engineer" }], "");
    expect(id).toBe("a1");
  });

  it("returns null with no candidates", () => {
    expect(disambiguateByRole([], "anything")).toBeNull();
  });

  it("picks the candidate whose role shares the most words with the signal", () => {
    const candidates = [
      { id: "arch", role: "Associate Program Architect (Full-Stack Developer — AI-Native Engineering)" },
      { id: "mts", role: "Software Engineer MTS (Member of Technical Staff) — AI-First Engineering" },
      { id: "generalist", role: "Software Engineering MTS (Full Stack) - AI Generalist (Demo Tools & Platform Engineering)" },
    ];
    expect(
      disambiguateByRole(candidates, "Next steps for your Associate Program Architect application"),
    ).toBe("arch");
  });

  it("refuses to guess between two near-duplicate titles (ties)", () => {
    const candidates = [
      { id: "g1", role: "Software Engineer III, Security/Privacy, gTech Risk" },
      { id: "g2", role: "Software Engineer III, Security/Privacy" },
    ];
    // Shares every word with g2's title and is a strict superset for g1's too —
    // both score the same against this signal, so it must not pick one.
    expect(disambiguateByRole(candidates, "Software Engineer III, Security/Privacy")).toBeNull();
  });

  it("returns null when the signal shares no words with any candidate", () => {
    const candidates = [
      { id: "a", role: "Backend Engineer" },
      { id: "b", role: "Frontend Engineer" },
    ];
    expect(disambiguateByRole(candidates, "")).toBeNull();
    expect(disambiguateByRole(candidates, "   ")).toBeNull();
  });
});
