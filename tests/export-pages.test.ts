import { expect, test } from "bun:test";
import { collectExportPages } from "../src/lib/export-pages";
test("export keeps all 1190 records, including those beyond the first 1000", async () => {
  const all = Array.from({ length: 1190 }, (_, id) => ({ id }));
  expect(await collectExportPages(async (a, b) => ({ data: all.slice(a, b + 1), error: null }))).toEqual(all);
});
test("a later page failure never returns a silently incomplete export", async () => {
  await expect(collectExportPages(async (a) => a === 0 ? { data: [1, 2], error: null } : { data: null, error: { message: "Read failed" } }, 2)).rejects.toThrow("Read failed");
});