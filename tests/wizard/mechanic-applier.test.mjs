import { describe, it, expect } from "vitest";
import {
  emptyPlan,
  applyQ4Affinity,
  revertQ4Affinity,
  applyQ7Loyalist,
  revertQ7Loyalist,
  applyQ8Adherent,
  revertQ8Adherent,
} from "../../scripts/wizard/mechanic-applier.mjs";

function mockActor(overrides = {}) {
  return {
    items: [],
    flags: {},
    system: { details: { biography: { value: "" } }, skills: {}, classSkills: {} },
    ...overrides,
  };
}

describe("emptyPlan", () => {
  it("returns a plan with empty updates, creates, deletes", () => {
    const p = emptyPlan();
    expect(p).toEqual({ updates: {}, creates: [], deletes: [] });
  });
});

describe("Q4 Affinity (flag-only)", () => {
  it("apply sets flags.naruto-d20.chakra.nature.primary", () => {
    const p = applyQ4Affinity(mockActor(), "Fire");
    expect(p.updates["flags.naruto-d20.chakra.nature.primary"]).toBe("Fire");
    expect(p.creates).toEqual([]);
    expect(p.deletes).toEqual([]);
  });

  it("revert sets flag to empty string", () => {
    const p = revertQ4Affinity(mockActor());
    expect(p.updates["flags.naruto-d20.chakra.nature.primary"]).toBe("");
  });
});

describe("Q7 Loyalist (item add + reputation +1)", () => {
  it("apply creates the marker item with q7Loyalist flag and bumps reputation", () => {
    const actor = mockActor({ flags: { "naruto-d20": { reputation: 3 } } });
    const p = applyQ7Loyalist(actor, "marker-item-data");
    expect(p.updates["flags.naruto-d20.reputation"]).toBe(4);
    expect(p.creates).toHaveLength(1);
    expect(p.creates[0].flags["naruto-d20-kaihou"].wizard.q7Loyalist).toBe(true);
  });

  it("apply with current reputation undefined treats as 0 (+1 → 1)", () => {
    const actor = mockActor();
    const p = applyQ7Loyalist(actor, "marker-data");
    expect(p.updates["flags.naruto-d20.reputation"]).toBe(1);
  });

  it("revert removes the marker item and decrements reputation by 1", () => {
    const actor = mockActor({
      flags: { "naruto-d20": { reputation: 5 } },
      items: [
        { _id: "old-marker", flags: { "naruto-d20-kaihou": { wizard: { q7Loyalist: true } } } },
      ],
    });
    const p = revertQ7Loyalist(actor);
    expect(p.deletes).toContain("old-marker");
    expect(p.updates["flags.naruto-d20.reputation"]).toBe(4);
  });

  it("revert on actor with no Loyalist item returns empty deletes but still decrements", () => {
    const actor = mockActor({ flags: { "naruto-d20": { reputation: 2 } } });
    const p = revertQ7Loyalist(actor);
    expect(p.deletes).toEqual([]);
    expect(p.updates["flags.naruto-d20.reputation"]).toBe(1);
  });
});

describe("Q8 Adherent (item add + actionPoints +2)", () => {
  it("apply creates the marker item and bumps actionPoints by 2", () => {
    const actor = mockActor({ flags: { "naruto-d20": { actionPoints: 5 } } });
    const p = applyQ8Adherent(actor, "marker-data");
    expect(p.updates["flags.naruto-d20.actionPoints"]).toBe(7);
    expect(p.creates).toHaveLength(1);
    expect(p.creates[0].flags["naruto-d20-kaihou"].wizard.q8Adherent).toBe(true);
  });

  it("revert removes marker and subtracts 2 from actionPoints", () => {
    const actor = mockActor({
      flags: { "naruto-d20": { actionPoints: 8 } },
      items: [
        { _id: "adh-marker", flags: { "naruto-d20-kaihou": { wizard: { q8Adherent: true } } } },
      ],
    });
    const p = revertQ8Adherent(actor);
    expect(p.deletes).toContain("adh-marker");
    expect(p.updates["flags.naruto-d20.actionPoints"]).toBe(6);
  });
});
