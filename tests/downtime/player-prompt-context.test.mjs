import "./setup-foundry.mjs";
import { describe, it, expect } from "vitest";
import { buildPromptContext, PRIMARY_ACTIONS } from "../../scripts/apps/downtime/player-prompt.mjs";

describe("buildPromptContext", () => {
  it("exposes actor, block, and the fixed action list", () => {
    const ctx = buildPromptContext({
      record: { block: "midday", date: { label: "Day 7" } },
      actor: { name: "Suigin" },
    });
    expect(ctx.actorName).toBe("Suigin");
    expect(ctx.block).toBe("midday");
    expect(ctx.dateLabel).toBe("Day 7");
    expect(ctx.actions).toEqual(PRIMARY_ACTIONS);
  });
});

describe("PRIMARY_ACTIONS", () => {
  it("is the six primary actions", () => {
    expect(PRIMARY_ACTIONS).toEqual(["technique", "npc", "crafting", "mission", "shopping", "other"]);
  });
});
