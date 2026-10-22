import { expect, test } from "bun:test";
import { dateOrderIssues } from "../src/lib/outreach-dates";

test("loom watched before sent is flagged", () => {
  const r = dateOrderIssues({ loom_sent: true, loom_sent_at: "2026-12-23T12:00:00Z", loom_watched: true, loom_watched_at: "2026-08-28T12:00:00Z" });
  expect(Object.keys(r)).toEqual(["loom_watched"]);
});
test("same day is fine", () => {
  expect(dateOrderIssues({ email_sent: true, email_sent_at: "2026-08-28T09:00:00Z", email_replied: true, email_replied_at: "2026-08-28T08:00:00Z" })).toEqual({});
});
test("missing dates or unticked are ignored", () => {
  expect(dateOrderIssues({ loom_sent: true, loom_sent_at: null, loom_watched: true, loom_watched_at: "2026-01-01" })).toEqual({});
  expect(dateOrderIssues({ loom_sent: false, loom_sent_at: "2026-12-01", loom_watched: true, loom_watched_at: "2026-01-01" })).toEqual({});
});
