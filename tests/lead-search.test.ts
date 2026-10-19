import { describe, expect, it } from "vitest";
import { cleanSearch } from "../src/lib/lead-search";
describe("cleanSearch", () => {
  it("normalizes pasted emails", () => {
    expect(cleanSearch("  mailto:John@ACME.com ").email).toBe("john@acme.com");
  });
  it("non-emails have no email", () => {
    expect(cleanSearch("Acme Inc").email).toBeNull();
  });
});
