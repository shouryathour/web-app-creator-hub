import { describe, expect, it } from "vitest";
import { firstAllowedPath } from "@/lib/landing";

const canOf = (keys: string[]) => (k: string) => keys.includes(k);

describe("firstAllowedPath", () => {
  it("skips an unticked Dashboard and lands on Leads", () => {
    expect(firstAllowedPath(canOf(["module.lead_tracker", "lead.leads"]))).toBe("/lt/leads");
  });
  it("returns null when nothing is allowed", () => {
    expect(firstAllowedPath(canOf([]))).toBeNull();
  });
  it("tries the preferred CRM module first", () => {
    const can = canOf(["module.lead_tracker", "lead.dashboard", "module.crm", "crm.pipeline"]);
    expect(firstAllowedPath(can, "crm")).toBe("/crm/pipeline");
  });
});
