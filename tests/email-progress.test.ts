import { describe, expect, it } from "vitest";
import { emailStageTarget } from "../src/lib/email-progress";

const stages = ["New", "Researching", "Email Drafted", "Contacted", "Replied", "Call Booked", "Client", "Not Interested"].map(
  (name, i) => ({ id: name, name, order_index: i + 1 }),
);

describe("emailStageTarget", () => {
  it("moves to Replied when the email is replied", () => {
    expect(emailStageTarget(stages, "Contacted", { sent: true, viewed: true, replied: true })).toBe("Replied");
  });
  it("moves an early lead to Contacted when only sent", () => {
    expect(emailStageTarget(stages, "New", { sent: true, viewed: false, replied: false })).toBe("Contacted");
  });
  it("never moves a Call Booked lead backwards", () => {
    expect(emailStageTarget(stages, "Call Booked", { sent: true, viewed: true, replied: true })).toBeNull();
  });
  it("leaves Not Interested alone", () => {
    expect(emailStageTarget(stages, "Not Interested", { sent: true, viewed: false, replied: false })).toBeNull();
  });
});
