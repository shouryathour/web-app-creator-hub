import { describe, expect, it } from "vitest";
import { outreachCheckChange } from "../src/lib/outreach-check";

describe("outreach tick corrections", () => {
  it("clears an accidentally selected tick and its date", () => {
    expect(outreachCheckChange(false, "2026-10-21T22:41:00.000Z")).toEqual([false, null]);
  });
  it("stamps the date when selecting a tick", () => {
    expect(outreachCheckChange(true, "2026-10-21T22:41:00.000Z")).toEqual([true, "2026-10-21T22:41:00.000Z"]);
  });
  it("does not count an indeterminate selection as completed outreach", () => {
    expect(outreachCheckChange("indeterminate", "2026-10-21T22:41:00.000Z")).toEqual([false, null]);
  });
});