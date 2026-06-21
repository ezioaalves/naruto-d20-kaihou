import { describe, it, expect } from "vitest";
import {
  createBlockRecord,
  openPrompt,
  upsertSubmission,
  closeCollection,
  resolveBlock,
  deriveQueues,
  pruneResolvedBefore,
} from "../../scripts/downtime/ledger.mjs";

function baseRecord() {
  return createBlockRecord({
    id: "greg:1-1-1:sunrise",
    calendarId: "greg",
    date: { year: 1, month: 1, day: 1, label: "Day 1" },
    block: "sunrise",
    gmUserId: "gm",
    recipients: [
      { userId: "u1", actorUuid: "Actor.a", actorName: "A", status: "pending" },
      { userId: "u2", actorUuid: "Actor.b", actorName: "B", status: "pending" },
    ],
  });
}

function submission(over = {}) {
  return {
    id: over.id ?? "s1",
    userId: over.userId ?? "u1",
    actorUuid: over.actorUuid ?? "Actor.a",
    actorName: over.actorName ?? "A",
    submittedAt: 1,
    action: over.action ?? "technique",
    requestScene: over.requestScene ?? false,
    payload: over.payload ?? {},
    rollPolicy: over.rollPolicy ?? "auto",
  };
}

describe("lifecycle", () => {
  it("starts draft and opens", () => {
    const r = baseRecord();
    expect(r.status).toBe("draft");
    expect(openPrompt(r).status).toBe("open");
  });

  it("keeps submission order stable across re-submits", () => {
    let r = openPrompt(baseRecord());
    r = upsertSubmission(r, submission({ id: "s1" }));
    r = upsertSubmission(r, submission({ id: "s2", userId: "u2", actorUuid: "Actor.b" }));
    r = upsertSubmission(r, submission({ id: "s1", payload: { changed: true } }));
    expect(r.order).toEqual(["s1", "s2"]);
    expect(r.submissions.s1.payload).toEqual({ changed: true });
  });

  it("forces defer when a scene is requested", () => {
    let r = openPrompt(baseRecord());
    r = upsertSubmission(r, submission({ requestScene: true, rollPolicy: "auto" }));
    expect(r.submissions.s1.rollPolicy).toBe("defer");
  });

  it("closing marks non-submitters missed", () => {
    let r = openPrompt(baseRecord());
    r = upsertSubmission(r, submission({ id: "s1", userId: "u1", actorUuid: "Actor.a" }));
    r = closeCollection(r);
    expect(r.status).toBe("closed");
    const byActor = Object.fromEntries(r.recipients.map((x) => [x.actorUuid, x.status]));
    expect(byActor).toEqual({ "Actor.a": "submitted", "Actor.b": "missed" });
  });

  it("resolves", () => {
    expect(resolveBlock(closeCollection(openPrompt(baseRecord()))).status).toBe("resolved");
  });
});

describe("deriveQueues", () => {
  it("splits scene and other queues by order", () => {
    let r = openPrompt(baseRecord());
    r = upsertSubmission(r, submission({ id: "s1", action: "technique", requestScene: true }));
    r = upsertSubmission(r, submission({ id: "s2", action: "other" }));
    r = upsertSubmission(r, submission({ id: "s3", action: "technique" }));
    expect(deriveQueues(r)).toEqual({ scenes: ["s1"], other: ["s2"] });
    expect(r.queues).toEqual({ scenes: ["s1"], other: ["s2"] });
  });

  it("requestScene wins over action:other — appears only in scenes", () => {
    let r = openPrompt(baseRecord());
    r = upsertSubmission(r, submission({ id: "s1", action: "other", requestScene: true }));
    expect(deriveQueues(r)).toEqual({ scenes: ["s1"], other: [] });
  });
});

describe("pruneResolvedBefore", () => {
  it("removes only resolved records before the cutoff", () => {
    const resolved = resolveBlock(closeCollection(openPrompt(baseRecord())));
    const open = openPrompt({ ...baseRecord(), id: "greg:2-1-1:sunrise", date: { year: 2, month: 1, day: 1 } });
    const ledger = { [resolved.id]: resolved, [open.id]: open };
    const pruned = pruneResolvedBefore(ledger, (date) => date.year < 2);
    expect(Object.keys(pruned)).toEqual([open.id]);
  });
});
