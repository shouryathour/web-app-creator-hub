import { describe, expect, test } from "bun:test";
import { CRM_LEAD_EMBED, excludeArchivedLeads } from "../src/lib/lead-scope";

function fakeQuery() {
  const calls: Array<[string, unknown]> = [];
  const q: { eq: (column: string, value: unknown) => typeof q } = {
    eq(column: string, value: unknown) {
      calls.push([column, value]);
      return q;
    },
  };
  return { q, calls };
}

describe("CRM archived-lead scope", () => {
  test("hides deals whose lead is archived", () => {
    const { q, calls } = fakeQuery();
    excludeArchivedLeads(q);
    expect(calls).toEqual([["leads.archived", false]]);
  });

  test("keeps chaining so stage filters, ordering and paging still apply", () => {
    const { q, calls } = fakeQuery();
    excludeArchivedLeads(q).eq("stage_id", "stage-1").eq("priority", "high");
    expect(calls).toEqual([
      ["leads.archived", false],
      ["stage_id", "stage-1"],
      ["priority", "high"],
    ]);
  });

  test("requires the inner-join lead embed, because a plain embed makes the filter a no-op", () => {
    expect(CRM_LEAD_EMBED).toBe("leads!inner");
  });
});
