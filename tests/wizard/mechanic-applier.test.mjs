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

describe("applyQ13Mentor (pack Mentor's Lesson)", () => {
  const technique = { name: "Water Bullet", type: "naruto-d20.technique", system: {} };

  it("grants the technique as learned + the pack feat carrying the class skill", () => {
    const plan = applyQ13Mentor(technique, packFeat("Mentor's Lesson"), "gen");
    expect(plan.creates).toHaveLength(2);
    const [tech, feat] = plan.creates;
    expect(tech.system.learning.learned).toBe(true);
    expect(tech.flags["naruto-d20-kaihou"].wizard.q13Mentor).toBe(true);
    expect(feat.name).toBe("Mentor's Lesson");
    expect(feat.system.classSkills).toEqual({ gen: true });
    expect(feat.flags["naruto-d20-kaihou"].wizard.q13MentorSkill).toBe(true);
    expect(plan.updates["flags.naruto-d20-kaihou.wizard.q13ClassSkill"]).toBe("gen");
  });

  it("grants only the learned technique when no pack feat is available", () => {
    const plan = applyQ13Mentor(technique, null, "gen");
    expect(plan.creates).toHaveLength(1);
    expect(plan.creates[0].system.learning.learned).toBe(true);
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

describe("applyQ18Heritage (pack feat)", () => {
  it("creates the marked namesake feat + roll snapshot; NO direct counter updates", () => {
    const feat = packFeat("Namesake: Glorious Sacrifice", { reputation: 2, actionPoints: 2 });
    const plan = applyQ18Heritage(feat, 2, { deltaRep: 2, deltaAP: 2 });
    expect(plan.creates).toHaveLength(1);
    expect(plan.creates[0].flags["naruto-d20-kaihou"].wizard.q18HeritageFeat).toBe(true);
    expect(plan.updates).toEqual({
      "flags.naruto-d20-kaihou.wizard.q18Heritage": { roll: 2, deltaRep: 2, deltaAP: 2 },
    });
  });
});

describe("revertQ18Heritage (engine-era)", () => {
  it("deletes the namesake feat and clears the snapshot; NO counter math", () => {
    const actor = {
      items: [{ _id: "h1", flags: { "naruto-d20-kaihou": { wizard: { q18HeritageFeat: true } } } }],
      flags: { "naruto-d20-kaihou": { wizard: { q18Heritage: { roll: 2, deltaRep: 2, deltaAP: 2 } } } },
    };
    const plan = revertQ18Heritage(actor);
    expect(plan.deletes).toEqual(["h1"]);
    expect(plan.updates).toEqual({ "flags.naruto-d20-kaihou.wizard.q18Heritage": null });
  });
});
