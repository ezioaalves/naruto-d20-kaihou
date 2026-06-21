import { describe, it, expect } from "vitest";
import "./setup-foundry.mjs";
import { buildPromptContext } from "../../scripts/apps/downtime/player-prompt.mjs";

const record = { block: "sunrise", date: { label: "Day 1" } };
const actor = { name: "Suigin", uuid: "Actor.s" };

describe("buildPromptContext", () => {
  it("exposes the six actions and the actor/block header", () => {
    const ctx = buildPromptContext({ record, actor, selectedAction: "other", api: null });
    expect(ctx.actorName).toBe("Suigin");
    expect(ctx.block).toBe("sunrise");
    expect(ctx.dateLabel).toBe("Day 1");
    expect(ctx.actions).toEqual(["technique", "npc", "crafting", "mission", "shopping", "other"]);
    expect(ctx.selectedAction).toBe("other");
    expect(ctx.isTechnique).toBe(false);
  });

  it("defaults selectedAction to technique", () => {
    const ctx = buildPromptContext({ record, actor, api: null });
    expect(ctx.selectedAction).toBe("technique");
    expect(ctx.isTechnique).toBe(true);
  });

  it("populates learn/master options from the api when on technique", () => {
    const api = {
      listLearnable: () => [{ uuid: "Item.a", name: "A", system: { rank: 1, discipline: "Ninjutsu" } }],
      listMasterable: () => [{ uuid: "Item.b", name: "B", system: { rank: 2, discipline: "Taijutsu" } }],
    };
    const ctx = buildPromptContext({ record, actor, selectedAction: "technique", api });
    expect(ctx.learnOptions).toEqual([
      { mode: "learn-owned", itemUuid: "Item.a", name: "A", rank: 1, discipline: "Ninjutsu" },
    ]);
    expect(ctx.masterOptions).toHaveLength(1);
    expect(ctx.masterOptions[0]).toMatchObject({ mode: "master-owned", itemUuid: "Item.b" });
  });

  it("yields empty technique lists when api is unavailable", () => {
    const ctx = buildPromptContext({ record, actor, selectedAction: "technique", api: null });
    expect(ctx.learnOptions).toEqual([]);
    expect(ctx.masterOptions).toEqual([]);
  });
});
