import "./setup-foundry.mjs";
import { describe, it, expect } from "vitest";
import { buildConsoleContext } from "../../scripts/apps/downtime/gm-console.mjs";

function recordWith(submissions, order, queues) {
  return {
    block: "sunrise",
    date: { label: "Day 1" },
    recipients: [{ actorName: "Suigin", status: "submitted" }],
    order,
    submissions,
    queues,
  };
}

describe("buildConsoleContext", () => {
  it("renders an inactive shell when mode is off", () => {
    const ctx = buildConsoleContext({ mode: false, suggestion: null, record: null });
    expect(ctx.active).toBe(false);
    expect(ctx.hasBlock).toBe(false);
    expect(ctx.responses).toEqual([]);
  });

  it("builds ordered response rows with scene + result labels", () => {
    const submissions = {
      s1: { id: "s1", actorName: "Suigin", action: "technique", requestScene: false, note: "", rollPolicy: "auto", rollResult: { ok: true } },
      s2: { id: "s2", actorName: "Kubo", action: "other", requestScene: true, note: "hide", rollPolicy: "defer" },
    };
    const ctx = buildConsoleContext({
      mode: true,
      suggestion: { block: "sunrise", date: { label: "Day 1" } },
      record: recordWith(submissions, ["s1", "s2"], { scenes: ["s2"], other: [] }),
    });
    expect(ctx.active).toBe(true);
    expect(ctx.hasBlock).toBe(true);
    expect(ctx.responses.map((r) => r.id)).toEqual(["s1", "s2"]);
    expect(ctx.responses[0]).toMatchObject({ actorName: "Suigin", action: "technique", scene: false, resultLabel: "resolved" });
    expect(ctx.responses[1]).toMatchObject({ actorName: "Kubo", action: "other", scene: true });
  });

  it("marks a technique submission without a successful result as runnable", () => {
    const submissions = {
      s1: { id: "s1", actorName: "Suigin", action: "technique", requestScene: true, rollPolicy: "defer" },
      s2: { id: "s2", actorName: "Kubo", action: "other", requestScene: true, rollPolicy: "defer" },
    };
    const ctx = buildConsoleContext({
      mode: true,
      suggestion: { block: "sunrise", date: { label: "Day 1" } },
      record: recordWith(submissions, ["s1", "s2"], { scenes: ["s1", "s2"], other: [] }),
    });
    const byId = Object.fromEntries(ctx.responses.map((r) => [r.id, r]));
    expect(byId.s1.canRun).toBe(true);   // technique, no result yet
    expect(byId.s2.canRun).toBe(false);  // non-technique never auto-runs
  });

  it("separates scene and other queue rows", () => {
    const submissions = {
      s1: { id: "s1", actorName: "A", action: "technique", requestScene: true, rollPolicy: "defer" },
      s2: { id: "s2", actorName: "B", action: "other", requestScene: false, rollPolicy: "none" },
    };
    const ctx = buildConsoleContext({
      mode: true,
      suggestion: { block: "sunrise", date: { label: "Day 1" } },
      record: recordWith(submissions, ["s1", "s2"], { scenes: ["s1"], other: ["s2"] }),
    });
    expect(ctx.sceneRows.map((r) => r.id)).toEqual(["s1"]);
    expect(ctx.otherRows.map((r) => r.id)).toEqual(["s2"]);
  });
});
