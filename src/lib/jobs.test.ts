import { describe, expect, it } from "vitest";
import { htmlToText, looksRemote } from "./jobs";

describe("htmlToText", () => {
  it("returns null for empty input", () => {
    expect(htmlToText(null)).toBeNull();
    expect(htmlToText(undefined)).toBeNull();
    expect(htmlToText("")).toBeNull();
  });

  it("strips plain HTML tags and collapses whitespace", () => {
    expect(htmlToText("<p>Hello   <b>world</b></p>\n<p>Next</p>")).toBe(
      "Hello world Next",
    );
  });

  it("decodes Greenhouse-style double-encoded HTML", () => {
    // &lt;p&gt;Build &amp;amp; ship&lt;/p&gt;  -> "Build & ship"
    const raw = "&lt;p&gt;Build &amp;amp; ship&lt;/p&gt;";
    expect(htmlToText(raw)).toBe("Build & ship");
  });

  it("drops script/style content", () => {
    expect(
      htmlToText("<style>.a{color:red}</style><p>Real</p><script>x()</script>"),
    ).toBe("Real");
  });

  it("caps length at 6000 chars", () => {
    expect(htmlToText("<p>" + "a".repeat(9000) + "</p>")!.length).toBe(6000);
  });
});

describe("looksRemote", () => {
  it("detects remote-ish locations", () => {
    expect(looksRemote("Remote - US")).toBe(true);
    expect(looksRemote("Anywhere")).toBe(true);
    expect(looksRemote("Distributed team")).toBe(true);
  });

  it("returns null (not false) when not obviously remote", () => {
    expect(looksRemote("New York, NY")).toBeNull();
    expect(looksRemote(null)).toBeNull();
  });
});
