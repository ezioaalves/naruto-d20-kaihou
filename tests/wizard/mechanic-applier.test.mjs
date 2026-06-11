import { describe, it, expect } from "vitest";
import {
  emptyPlan,
  applyQ4Affinity,
  revertQ4Affinity,
  applyQ7Loyalist,
  revertQ7Loyalist,
  applyQ8Adherent,
  revertQ8Adherent,
  applyQ1Village,
  revertQ1Village,
  applyQ7Outsider,
  revertQ7Outsider,
  applyQ8Sceptic,
  revertQ8Sceptic,
  applyDragDropFeat,
  revertDragDropFeat,
  applyQ10Coupled,
  revertQ10Coupled,
  applyQ13Mentor,
  revertQ13Mentor,
  applyQ17ParentalInfluence,
  applyQ18Heritage,
  revertQ18Heritage,
} from "../../scripts/apps/wizard/mechanic-applier.mjs";

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

function packFeat(name, dictionary = {}) {
  return {
    name,
    type: "feat",
    system: { subType: "trait", description: { value: "<p>x</p>" }, flags: { dictionary } },
    flags: { "naruto-d20-kaihou": { questionFeat: `slug-${name}` } },
  };
}

describe("applyQ7Loyalist (pack feat)", () => {
  it("creates the marked pack feat and performs NO direct counter updates", () => {
    const plan = applyQ7Loyalist(packFeat("Village Loyalist", { reputation: 1 }));
    expect(plan.creates).toHaveLength(1);
    expect(plan.creates[0].name).toBe("Village Loyalist");
    expect(plan.creates[0].flags["naruto-d20-kaihou"].wizard.q7Loyalist).toBe(true);
    expect(plan.creates[0].flags["naruto-d20-kaihou"].questionFeat).toBeTruthy();
    expect(plan.updates).toEqual({});
  });
});

describe("applyQ7Outsider (pack feat)", () => {
  it("creates the marked pack feat with the chosen class skill and snapshot flag", () => {
    const plan = applyQ7Outsider(packFeat("Village Outsider"), "sur");
    expect(plan.creates[0].system.classSkills).toEqual({ sur: true });
    expect(plan.creates[0].flags["naruto-d20-kaihou"].wizard.q7Outsider).toBe(true);
    expect(plan.updates).toEqual({
      "flags.naruto-d20-kaihou.wizard.q7OutsiderClassSkill": "sur",
    });
  });

  it("does not mutate the passed-in feat data", () => {
    const data = packFeat("Village Outsider");
    applyQ7Outsider(data, "sur");
    expect(data.system.classSkills).toBeUndefined();
  });
});

describe("applyQ8Adherent / applyQ8Sceptic (pack feats)", () => {
  it("adherent: creates marked feat, no direct AP update", () => {
    const plan = applyQ8Adherent(packFeat("Code Adherent", { actionPoints: 2 }));
    expect(plan.creates[0].flags["naruto-d20-kaihou"].wizard.q8Adherent).toBe(true);
    expect(plan.updates).toEqual({});
  });

  it("sceptic: creates marked feat, no counter math (engine owns bonusSkillRank)", () => {
    const plan = applyQ8Sceptic(packFeat("Code Sceptic", { bonusSkillRank: 1 }));
    expect(plan.creates[0].flags["naruto-d20-kaihou"].wizard.q8Sceptic).toBe(true);
    expect(plan.updates).toEqual({});
  });
});

describe("revertQ7 / revertQ8 (engine-era)", () => {
  function actorWithMarker(markerKey) {
    return {
      items: [{ _id: "m1", flags: { "naruto-d20-kaihou": { wizard: { [markerKey]: true } } } }],
      flags: {},
    };
  }

  it("revertQ7Loyalist deletes the marker item and performs NO counter updates", () => {
    const plan = revertQ7Loyalist(actorWithMarker("q7Loyalist"));
    expect(plan.deletes).toEqual(["m1"]);
    expect(plan.updates).toEqual({});
  });

  it("revertQ7Outsider deletes the marker and clears the class-skill snapshot", () => {
    const plan = revertQ7Outsider(actorWithMarker("q7Outsider"));
    expect(plan.deletes).toEqual(["m1"]);
    expect(plan.updates).toEqual({
      "flags.naruto-d20-kaihou.wizard.q7OutsiderClassSkill": null,
    });
  });

  it("revertQ8Adherent / revertQ8Sceptic delete markers without counter math", () => {
    expect(revertQ8Adherent(actorWithMarker("q8Adherent")).updates).toEqual({});
    expect(revertQ8Sceptic(actorWithMarker("q8Sceptic")).updates).toEqual({});
    expect(revertQ8Sceptic(actorWithMarker("q8Sceptic")).deletes).toEqual(["m1"]);
  });
});

describe("Q1 Village (item add only)", () => {
  it("apply adds village item with q1Village marker", () => {
    const actor = mockActor();
    const villageItemData = { name: "Kanigakure", type: "feat" };
    const p = applyQ1Village(actor, villageItemData);
    expect(p.creates).toHaveLength(1);
    expect(p.creates[0].flags["naruto-d20-kaihou"].wizard.q1Village).toBe(true);
    expect(Object.keys(p.updates)).toHaveLength(0);
  });

  it("revert deletes the village item", () => {
    const actor = mockActor({
      items: [{ _id: "vil1", flags: { "naruto-d20-kaihou": { wizard: { q1Village: true } } } }],
    });
    const p = revertQ1Village(actor);
    expect(p.deletes).toContain("vil1");
  });
});

// Q2 Occupation is exercised via applyDragDropFeat/revertDragDropFeat with
// the "q2OccupationItem" marker. All grants (class skills, feat, wealth, rep)
// are applied by scripts/occupation-application.mjs on the createItem hook.


describe("applyDragDropFeat / revertDragDropFeat (used for Q3, Q9, Q16)", () => {
  it("apply adds item with the given marker flag", () => {
    const p = applyDragDropFeat({ name: "Animal Bond", type: "feat" }, "q3School");
    expect(p.creates).toHaveLength(1);
    expect(p.creates[0].name).toBe("Animal Bond");
    expect(p.creates[0].flags["naruto-d20-kaihou"].wizard.q3School).toBe(true);
  });

  it("revert deletes item matched by marker flag", () => {
    const actor = mockActor({
      items: [{ _id: "feat1", flags: { "naruto-d20-kaihou": { wizard: { q9Level1Feat: true } } } }],
    });
    const p = revertDragDropFeat(actor, "q9Level1Feat");
    expect(p.deletes).toContain("feat1");
  });

  it("revert with no matching item returns empty plan", () => {
    const p = revertDragDropFeat(mockActor(), "q3School");
    expect(p).toEqual({ updates: {}, creates: [], deletes: [] });
  });
});

describe("Q10 coupled (flaw + bonus feat)", () => {
  it("apply adds both items with respective markers", () => {
    const flaw = { name: "Anxious", type: "feat" };
    const bonus = { name: "Iron Will", type: "feat" };
    const p = applyQ10Coupled(flaw, bonus);
    expect(p.creates).toHaveLength(2);
    const flawCreated = p.creates.find((c) => c.name === "Anxious");
    const bonusCreated = p.creates.find((c) => c.name === "Iron Will");
    expect(flawCreated.flags["naruto-d20-kaihou"].wizard.q10Flaw).toBe(true);
    expect(bonusCreated.flags["naruto-d20-kaihou"].wizard.q10BonusFeat).toBe(true);
  });

  it("revert deletes both items if present", () => {
    const actor = mockActor({
      items: [
        { _id: "fl1", flags: { "naruto-d20-kaihou": { wizard: { q10Flaw: true } } } },
        { _id: "bf1", flags: { "naruto-d20-kaihou": { wizard: { q10BonusFeat: true } } } },
      ],
    });
    const p = revertQ10Coupled(actor);
    expect(p.deletes).toContain("fl1");
    expect(p.deletes).toContain("bf1");
  });
});

describe("Q13 Mentor (technique drag-drop + separate classSkill marker)", () => {
  it("apply adds the technique item (auto-learned) and a separate feat marker carrying the classSkill", () => {
    const tech = { name: "Body Substitution", type: "naruto-d20.technique" };
    const p = applyQ13Mentor(mockActor(), tech, "khi");
    expect(p.creates).toHaveLength(2);
    expect(p.creates[0].flags["naruto-d20-kaihou"].wizard.q13Mentor).toBe(true);
    expect(p.creates[0].system.learning.learned).toBe(true);
    expect(p.creates[1].type).toBe("feat");
    expect(p.creates[1].system.classSkills.khi).toBe(true);
    expect(p.creates[1].flags["naruto-d20-kaihou"].wizard.q13MentorSkill).toBe(true);
    expect(p.updates["flags.naruto-d20-kaihou.wizard.q13ClassSkill"]).toBe("khi");
  });

  it("revert deletes both the technique and skill markers and clears snapshot", () => {
    const actor = mockActor({
      items: [
        { _id: "m1", flags: { "naruto-d20-kaihou": { wizard: { q13Mentor: true } } } },
        { _id: "ms1", flags: { "naruto-d20-kaihou": { wizard: { q13MentorSkill: true } } } },
      ],
      flags: { "naruto-d20-kaihou": { wizard: { q13ClassSkill: "khi" } } },
    });
    const p = revertQ13Mentor(actor);
    expect(p.deletes).toContain("m1");
    expect(p.deletes).toContain("ms1");
    expect(p.updates["flags.naruto-d20-kaihou.wizard.q13ClassSkill"]).toBeNull();
  });
});

describe("applyQ17ParentalInfluence", () => {
  it("creates a marker item with q17ParentalInfluence flag", () => {
    const featData = {name: "Parental Influence", type: "feat", system: {bonusSkillRank: 1}};
    const p = applyQ17ParentalInfluence(featData);
    expect(p.creates).toHaveLength(1);
    expect(p.creates[0].flags["naruto-d20-kaihou"].wizard.q17ParentalInfluence).toBe(true);
    expect(p.creates[0].name).toBe("Parental Influence");
  });

  it("accepts null featData gracefully — creates stub with marker", () => {
    const p = applyQ17ParentalInfluence(null);
    expect(p.creates).toHaveLength(1);
    expect(p.creates[0].flags["naruto-d20-kaihou"].wizard.q17ParentalInfluence).toBe(true);
  });
});

describe("Q18 Heritage Modifier", () => {
  it("apply for roll 1 ('+1 Reputation') bumps reputation by 1 + snapshots", () => {
    const actor = mockActor({ flags: { "naruto-d20": { reputation: 2, actionPoints: 4 } } });
    const p = applyQ18Heritage(actor, 1, { deltaRep: 1, deltaAP: 0 });
    expect(p.updates["flags.naruto-d20.reputation"]).toBe(3);
    expect(p.updates["flags.naruto-d20.actionPoints"]).toBe(4); // unchanged
    expect(p.updates["flags.naruto-d20-kaihou.wizard.q18Heritage"]).toEqual({
      roll: 1, deltaRep: 1, deltaAP: 0,
    });
  });

  it("apply for roll 2 ('+2 AP, +2 Rep') bumps both", () => {
    const actor = mockActor({ flags: { "naruto-d20": { reputation: 0, actionPoints: 0 } } });
    const p = applyQ18Heritage(actor, 2, { deltaRep: 2, deltaAP: 2 });
    expect(p.updates["flags.naruto-d20.reputation"]).toBe(2);
    expect(p.updates["flags.naruto-d20.actionPoints"]).toBe(2);
  });

  it("apply for roll 8 ('-2 AP') decrements actionPoints", () => {
    const actor = mockActor({ flags: { "naruto-d20": { reputation: 5, actionPoints: 5 } } });
    const p = applyQ18Heritage(actor, 8, { deltaRep: 0, deltaAP: -2 });
    expect(p.updates["flags.naruto-d20.actionPoints"]).toBe(3);
    expect(p.updates["flags.naruto-d20.reputation"]).toBe(5); // unchanged
  });

  it("revert uses snapshot to inverse the delta", () => {
    const actor = mockActor({
      flags: {
        "naruto-d20": { reputation: 3, actionPoints: 7 },
        "naruto-d20-kaihou": { wizard: { q18Heritage: { roll: 2, deltaRep: 2, deltaAP: 2 } } },
      },
    });
    const p = revertQ18Heritage(actor);
    expect(p.updates["flags.naruto-d20.reputation"]).toBe(1);
    expect(p.updates["flags.naruto-d20.actionPoints"]).toBe(5);
    expect(p.updates["flags.naruto-d20-kaihou.wizard.q18Heritage"]).toBeNull();
  });

  it("revert with no snapshot returns empty plan", () => {
    expect(revertQ18Heritage(mockActor())).toEqual({ updates: {}, creates: [], deletes: [] });
  });

  it("revert is the exact inverse of apply (round-trip)", () => {
    let actor = mockActor({ flags: { "naruto-d20": { reputation: 5, actionPoints: 5 } } });
    const applyP = applyQ18Heritage(actor, 7, { deltaRep: -1, deltaAP: 1 });
    // Simulate apply: update actor flags from apply plan
    actor = mockActor({
      flags: {
        "naruto-d20": {
          reputation: applyP.updates["flags.naruto-d20.reputation"],
          actionPoints: applyP.updates["flags.naruto-d20.actionPoints"],
        },
        "naruto-d20-kaihou": { wizard: { q18Heritage: applyP.updates["flags.naruto-d20-kaihou.wizard.q18Heritage"] } },
      },
    });
    const revertP = revertQ18Heritage(actor);
    expect(revertP.updates["flags.naruto-d20.reputation"]).toBe(5);
    expect(revertP.updates["flags.naruto-d20.actionPoints"]).toBe(5);
  });
});
