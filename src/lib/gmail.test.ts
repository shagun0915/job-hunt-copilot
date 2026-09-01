import { describe, expect, it } from "vitest";
import {
  decodeB64Url,
  extractBody,
  parseAddress,
  parseMessage,
  stripHtml,
} from "./gmail";

const b64url = (s: string) =>
  Buffer.from(s, "utf8").toString("base64").replace(/\+/g, "-").replace(/\//g, "_");

describe("parseAddress", () => {
  it("splits a name + angle-bracket address", () => {
    expect(parseAddress('"Jordan Lee" <jordan@Linear.app>')).toEqual({
      name: "Jordan Lee",
      email: "jordan@linear.app",
    });
  });
  it("handles a bare address", () => {
    expect(parseAddress("recruiter@stripe.com")).toEqual({
      name: "",
      email: "recruiter@stripe.com",
    });
  });
  it("handles null", () => {
    expect(parseAddress(null)).toEqual({ name: "", email: "" });
  });
});

describe("decodeB64Url", () => {
  it("decodes URL-safe base64", () => {
    expect(decodeB64Url(b64url("Hi + there / ok"))).toBe("Hi + there / ok");
  });
});

describe("stripHtml", () => {
  it("turns block tags into newlines and unescapes entities", () => {
    const out = stripHtml("<p>One</p><p>Two &amp; three</p>");
    expect(out).toBe("One\nTwo & three");
  });
});

describe("extractBody", () => {
  it("prefers text/plain in a multipart/alternative payload", () => {
    const part = {
      mimeType: "multipart/alternative",
      parts: [
        { mimeType: "text/plain", body: { data: b64url("plain wins") } },
        { mimeType: "text/html", body: { data: b64url("<p>html loses</p>") } },
      ],
    };
    expect(extractBody(part)).toBe("plain wins");
  });

  it("falls back to stripped HTML when there is no text/plain", () => {
    const part = {
      mimeType: "multipart/alternative",
      parts: [
        { mimeType: "text/html", body: { data: b64url("<p>hello</p><p>world</p>") } },
      ],
    };
    expect(extractBody(part)).toBe("hello\nworld");
  });
});

describe("parseMessage", () => {
  it("extracts headers, addresses and body from a raw Gmail message", () => {
    const msg = {
      id: "m1",
      threadId: "t1",
      snippet: "snip",
      internalDate: "1700000000000",
      payload: {
        mimeType: "text/plain",
        headers: [
          { name: "From", value: "Recruiter <r@acme.com>" },
          { name: "To", value: "me@example.com, other@x.com" },
          { name: "Subject", value: "Next steps" },
          { name: "Date", value: "Wed, 15 Nov 2023 10:00:00 +0000" },
        ],
        body: { data: b64url("Let's schedule a call.") },
      },
    };
    const out = parseMessage(msg);
    expect(out.from).toEqual({ name: "Recruiter", email: "r@acme.com" });
    expect(out.to).toEqual(["me@example.com", "other@x.com"]);
    expect(out.subject).toBe("Next steps");
    expect(out.bodyText).toBe("Let's schedule a call.");
    expect(out.date?.getUTCFullYear()).toBe(2023);
  });

  it("falls back to internalDate when there is no Date header", () => {
    const out = parseMessage({
      id: "m2",
      threadId: "t2",
      internalDate: "1700000000000",
      payload: { headers: [] },
    });
    expect(out.date?.getTime()).toBe(1700000000000);
  });
});
