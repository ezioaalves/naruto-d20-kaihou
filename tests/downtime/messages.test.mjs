import { describe, it, expect } from "vitest";
import { MESSAGES, validateSubmission } from "../../scripts/downtime/messages.mjs";

describe("MESSAGES", () => {
  it("namespaces every type under downtime.", () => {
    for (const v of Object.values(MESSAGES)) expect(v.startsWith("downtime.")).toBe(true);
    expect(MESSAGES.MODE_CHANGE).toBe("downtime.mode.change");
  });
});

describe("validateSubmission", () => {
  const owns = () => true;
  const open = { status: "open" };
  const msg = { userId: "u1", submission: { userId: "u1", actorUuid: "Actor.a" } };

  it("accepts a valid open submission", () => {
    expect(validateSubmission(open, msg, owns)).toEqual({ ok: true });
  });
  it("rejects when no block", () => {
    expect(validateSubmission(null, msg, owns)).toEqual({ ok: false, reason: "no-block" });
  });
  it("rejects when block not open", () => {
    expect(validateSubmission({ status: "closed" }, msg, owns)).toEqual({ ok: false, reason: "closed" });
  });
  it("rejects user mismatch", () => {
    const bad = { userId: "u1", submission: { userId: "u2", actorUuid: "Actor.a" } };
    expect(validateSubmission(open, bad, owns)).toEqual({ ok: false, reason: "user-mismatch" });
  });
  it("rejects non-owner", () => {
    expect(validateSubmission(open, msg, () => false)).toEqual({ ok: false, reason: "not-owner" });
  });
});
