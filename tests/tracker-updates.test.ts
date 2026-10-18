import { describe, expect, test } from "bun:test";
import { trackerQueryMatches } from "../src/lib/tracker-updates";

describe("tracker live refresh", () => {
  test("lead changes refresh lists, quick entry, dashboard and CRM", () => {
    for (const key of ["leads-table", "leads-board", "rapid-today", "lead_detail", "dashboard-counts", "crm_pipeline_records", "crm_records"]) {
      expect(trackerQueryMatches(["leads"], [key, "example"])).toBe(true);
    }
    expect(trackerQueryMatches(["leads"], ["unrelated-settings"])).toBe(false);
  });
  test("contact changes refresh the open lead", () => {
    expect(trackerQueryMatches(["lead_contacts"], ["lead_detail", "lead-id"])).toBe(true);
  });
  test("follow-up changes refresh the due list and lead", () => {
    expect(trackerQueryMatches(["lead_followups"], ["all-followups"])).toBe(true);
    expect(trackerQueryMatches(["lead_followups"], ["lead_detail", "lead-id"])).toBe(true);
  });
  test("activity changes refresh ledger totals", () => {
    expect(trackerQueryMatches(["lead_events"], ["ledger-events"])).toBe(true);
    expect(trackerQueryMatches(["lead_events"], ["ledger-events-prev"])).toBe(true);
  });
  test("CRM changes refresh pipeline, revenue and record details", () => {
    for (const key of ["crm_pipeline_records", "crm_records_revenue", "crm_record"]) {
      expect(trackerQueryMatches(["crm_records"], [key])).toBe(true);
    }
  });
});