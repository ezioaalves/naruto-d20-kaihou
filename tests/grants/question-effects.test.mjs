import { describe, it, expect } from "vitest";
import {
  effectDeltasFromItem,
  buildEffectUpdates,
} from "../../scripts/grants/question-effects.mjs";

function questionFeat(dictionary) {
  return {
    flags: { "naruto-d20-kaihou": { questionFeat: "q07-relationship-loyalist" } },
    system: { flags: { dictionary } },
  };
}

describe("effectDeltasFromItem", () => {
  it("returns null for items without the questionFeat marker", () => {
    const item = { flags: {}, system: { flags: { dictionary: { reputation: 5 } } } };
    expect(effectDeltasFromItem(item)).toBeNull();
  });

  it("returns null for a marked feat with no payload (doc_only)", () => {
    expect(effectDeltasFromItem(questionFeat({}))).toBeNull();
  });

  it("extracts reputation, actionPoints, and bonusSkillRank payloads", () => {
    const deltas = effectDeltasFromItem(
      questionFeat({ reputation: 2, actionPoints: -2, bonusSkillRank: 1 })
    );
    expect(deltas).toEqual({ reputation: 2, actionPoints: -2, bonusSkillRanks: 1 });
  });
});

describe("buildEffectUpdates", () => {
  const actor = {
    flags: {
      "naruto-d20": { reputation: 3, actionPoints: 5 },
      "naruto-d20-kaihou": { bonusSkillRanks: 1 },
    },
  };

  it("applies positive deltas onto current counters", () => {
    const updates = buildEffectUpdates(actor, { reputation: 1, actionPoints: 2, bonusSkillRanks: 1 }, +1);
    expect(updates).toEqual({
      "flags.naruto-d20.reputation": 4,
      "flags.naruto-d20.actionPoints": 7,
      "flags.naruto-d20-kaihou.bonusSkillRanks": 2,
    });
  });

  it("reverts with sign -1", () => {
    const updates = buildEffectUpdates(actor, { reputation: 1, actionPoints: 2, bonusSkillRanks: 1 }, -1);
    expect(updates).toEqual({
      "flags.naruto-d20.reputation": 2,
      "flags.naruto-d20.actionPoints": 3,
      "flags.naruto-d20-kaihou.bonusSkillRanks": 0,
    });
  });

  it("handles negative payloads (heritage penalties) and missing counters", () => {
    const fresh = { flags: {} };
    const updates = buildEffectUpdates(fresh, { reputation: -2, actionPoints: 0, bonusSkillRanks: 0 }, +1);
    expect(updates).toEqual({ "flags.naruto-d20.reputation": -2 });
  });

  it("omits zero-delta keys entirely", () => {
    const updates = buildEffectUpdates(actor, { reputation: 0, actionPoints: 2, bonusSkillRanks: 0 }, +1);
    expect(updates).toEqual({ "flags.naruto-d20.actionPoints": 7 });
  });
});
