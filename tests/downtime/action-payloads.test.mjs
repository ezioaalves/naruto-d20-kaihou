import { describe, it, expect } from "vitest";
import {
  PRIMARY_ACTIONS,
  buildActionPayload,
  decideRollPolicy,
  validateActionPayload,
} from "../../scripts/downtime/action-payloads.mjs";

describe("PRIMARY_ACTIONS", () => {
  it("lists the six v1 actions in order", () => {
    expect([...PRIMARY_ACTIONS]).toEqual([
      "technique", "npc", "crafting", "mission", "shopping", "other",
    ]);
  });
});

describe("buildActionPayload", () => {
  it("builds a technique payload from mode + itemUuid", () => {
    const p = buildActionPayload("technique", { mode: "learn-owned", itemUuid: "Item.x" });
    expect(p).toEqual({ mode: "learn-owned", itemUuid: "Item.x" });
  });
  it("builds an npc payload from npcName", () => {
    expect(buildActionPayload("npc", { npcName: "Burou" })).toEqual({ npcName: "Burou" });
  });
  it("builds a crafting payload from skill fields", () => {
    expect(buildActionPayload("crafting", { skillKey: "cra", skillLabel: "Craft" }))
      .toEqual({ skillKey: "cra", skillLabel: "Craft" });
  });
  it("builds a mission payload", () => {
    expect(buildActionPayload("mission", {})).toEqual({ wantsMission: true });
  });
  it("builds a shopping payload from store + other text", () => {
    expect(buildActionPayload("shopping", { storeName: "Forge", otherText: "" }))
      .toEqual({ storeName: "Forge", otherText: "" });
  });
  it("builds an other payload from free text", () => {
    expect(buildActionPayload("other", { text: "meditate" })).toEqual({ text: "meditate" });
  });
  it("returns an empty object for an unknown action", () => {
    expect(buildActionPayload("bogus", { x: 1 })).toEqual({});
  });
});

describe("decideRollPolicy", () => {
  it("defers whenever a scene is requested, regardless of action", () => {
    expect(decideRollPolicy("technique", true)).toBe("defer");
    expect(decideRollPolicy("other", true)).toBe("defer");
  });
  it("auto-rolls technique with no scene", () => {
    expect(decideRollPolicy("technique", false)).toBe("auto");
  });
  it("defers mission until GM closes collection", () => {
    expect(decideRollPolicy("mission", false)).toBe("defer");
  });
  it("never rolls npc/crafting/shopping/other in v1", () => {
    for (const a of ["npc", "crafting", "shopping", "other"]) {
      expect(decideRollPolicy(a, false)).toBe("none");
    }
  });
});

describe("validateActionPayload", () => {
  it("rejects technique without an itemUuid", () => {
    const r = validateActionPayload({ action: "technique", payload: { mode: "learn-owned" } });
    expect(r).toEqual({ ok: false, reason: "technique-no-item" });
  });
  it("accepts a well-formed technique submission", () => {
    const r = validateActionPayload({ action: "technique", payload: { mode: "learn-owned", itemUuid: "Item.x" } });
    expect(r.ok).toBe(true);
  });
  it("rejects other without text", () => {
    expect(validateActionPayload({ action: "other", payload: { text: "" } }))
      .toEqual({ ok: false, reason: "other-no-text" });
  });
  it("accepts npc/crafting/mission/shopping with any payload", () => {
    for (const action of ["npc", "crafting", "mission", "shopping"]) {
      expect(validateActionPayload({ action, payload: {} }).ok).toBe(true);
    }
  });
  it("rejects an unknown action", () => {
    expect(validateActionPayload({ action: "bogus", payload: {} }))
      .toEqual({ ok: false, reason: "unknown-action" });
  });
});
