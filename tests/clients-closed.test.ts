import { test, expect } from "bun:test";
import { clientsByMonth } from "../src/lib/clients-closed";

test("counts each won client in the month it closed", () => {
  const m = clientsByMonth(
    [{ closed_at: "2026-10-03T12:00:00Z" }, { closed_at: "2026-10-20T12:00:00Z" }, { closed_at: "2026-03-01T12:00:00Z" }],
    2026,
  );
  expect(m[9].length).toBe(2);
  expect(m[2].length).toBe(1);
});

test("skips other years and deals without a close date", () => {
  const m = clientsByMonth([{ closed_at: "2025-10-03T12:00:00Z" }, { closed_at: null }], 2026);
  expect(m.flat().length).toBe(0);
});
