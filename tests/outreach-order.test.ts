import { describe, expect, it } from "vitest";
import { canCheckOutreach, outreachDisabled } from "../src/lib/outreach-order";

describe("outreach sending order", () => {
  it("requires Email sent before Email viewed", () => {
    expect(canCheckOutreach({}, "email_viewed")).toBe(false);
    expect(canCheckOutreach({ email_sent: true }, "email_viewed")).toBe(true);
  });
  it("requires Email sent before Email replied, not a view", () => {
    expect(canCheckOutreach({ email_viewed: true }, "email_replied")).toBe(false);
    expect(canCheckOutreach({ email_sent: true, email_viewed: false }, "email_replied")).toBe(true);
  });
  it("requires a LinkedIn request before a message", () => {
    expect(canCheckOutreach({ email_sent: true }, "linkedin_sent")).toBe(false);
    expect(canCheckOutreach({ linkedin_connection_sent: true }, "linkedin_sent")).toBe(true);
  });
  it("requires both LinkedIn request and message before reply", () => {
    expect(canCheckOutreach({ linkedin_connection_sent: true }, "linkedin_replied")).toBe(false);
    expect(canCheckOutreach({ linkedin_sent: true }, "linkedin_replied")).toBe(false);
    expect(canCheckOutreach({ linkedin_connection_sent: true, linkedin_sent: true }, "linkedin_replied")).toBe(true);
  });
  it("requires Instagram sent before reply", () => {
    expect(canCheckOutreach({ email_sent: true }, "instagram_replied")).toBe(false);
    expect(canCheckOutreach({ instagram_sent: true }, "instagram_replied")).toBe(true);
  });
  it("keeps inconsistent existing ticks clearable without granting edit access", () => {
    expect(outreachDisabled({ linkedin_sent: true }, "linkedin_sent", true)).toBe(false);
    expect(outreachDisabled({ linkedin_sent: true }, "linkedin_sent", false)).toBe(true);
  });
});