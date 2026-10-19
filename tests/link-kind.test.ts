import { describe, expect, it } from "vitest";
import { linkMismatch } from "../src/lib/link-kind";

describe("linkMismatch", () => {
  it("warns for a LinkedIn company page in the YouTube box", () => {
    expect(linkMismatch("youtube", "https://www.linkedin.com/company/acme")).toBe(
      "This is a LinkedIn company page, not a YouTube link.",
    );
  });
  it("accepts a YouTube link in the YouTube box", () => {
    expect(linkMismatch("youtube", "https://www.youtube.com/@acme")).toBeNull();
  });
  it("warns for a personal profile in the Company LinkedIn box", () => {
    expect(linkMismatch("linkedin-company", "https://www.linkedin.com/in/jane")).toBe(
      "This is a personal LinkedIn profile, not a LinkedIn company page.",
    );
  });
  it("warns for an Instagram link in the Website box", () => {
    expect(linkMismatch("website", "https://www.instagram.com/acme")).toBe(
      "This is an Instagram link, not a website.",
    );
  });
});
