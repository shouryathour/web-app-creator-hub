import { expect, test } from "bun:test";
import { computeTiles } from "../src/lib/outreach-metrics";
import { pct } from "../src/lib/percentage";

const leads = [
  { channel_id: "email", email_sent: true, email_viewed: true, email_replied: true, reply_sentiment: "positive", loom_sent: true, loom_watched: true, loom_watch_percent: 80, meeting_booked: true, client_closed: true },
  { channel_id: "email", email_sent: true, email_replied: true, reply_sentiment: "negative", loom_sent: true },
  { channel_id: "email" }, { channel_id: "email" },
];
const tiles = computeTiles(leads, "email", [{ id: "email", kind: "email" }]);
for (const [key, value] of Object.entries({ sent: "50%", view: "50%", reply: "100%", positive: "50%", negative: "50%", loom_sent: "100%", loom_view: "50%", loom_watch: "80%", meetings: "50%", close: "100%" })) {
  test(`${key} has the correct numerator and denominator`, () => expect(tiles.find(t => t.key === key)?.value).toBe(value));
}
test("no activity yields zero without invalid numbers", () => {
  expect(computeTiles([], "all", []).every(t => t.value === "0%" && !t.hasData)).toBe(true);
  expect(pct(NaN, 2).hasData).toBe(false);
  expect(pct(1, 3).text).toBe("33%");
});
test("view rate never passes 100% when views happen without a send in the period", () => {
  const t = computeTiles([{ email_sent: true, email_viewed: true }, { email_viewed: true }], "all", []);
  expect(t.find((x) => x.key === "view")!.detail).toBe("1/1");
});
