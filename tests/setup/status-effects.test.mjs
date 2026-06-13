import { describe, it, expect } from "vitest";
import { remapStatusEffectIcons } from "../../scripts/setup/status-effects.mjs";

const BASE = "modules/naruto-d20-kaihou/assets/theme/icons/conditions/";

describe("remapStatusEffectIcons", () => {
  it("replaces icon for a known condition", () => {
    const effects = [{ id: "prone", icon: "icons/conditions/prone.png", label: "Prone" }];
    const result = remapStatusEffectIcons(effects);
    expect(result[0].icon).toBe(`${BASE}prone.webp`);
    expect(result[0].id).toBe("prone");
    expect(result[0].label).toBe("Prone");
  });

  it("leaves a deferred condition unchanged", () => {
    const effects = [{ id: "shaken", icon: "icons/conditions/shaken.png", label: "Shaken" }];
    const result = remapStatusEffectIcons(effects);
    expect(result[0].icon).toBe("icons/conditions/shaken.png");
  });

  it("does not mutate the input objects", () => {
    const original = { id: "prone", icon: "old.png" };
    remapStatusEffectIcons([original]);
    expect(original.icon).toBe("old.png");
  });

  it("maps all 12 active conditions", () => {
    const ids = [
      "dying", "unconscious", "exhausted", "stunned", "nauseated",
      "confused", "paralyzed", "entangled", "prone",
      "bleeding", "burning", "silenced",
    ];
    const effects = ids.map((id) => ({ id, icon: "old.png" }));
    const result = remapStatusEffectIcons(effects);
    for (const r of result) {
      expect(r.icon).toContain("naruto-d20-kaihou");
      expect(r.icon).toContain(".webp");
    }
  });

  it("returns a new array, not the original", () => {
    const effects = [{ id: "prone", icon: "old.png" }];
    const result = remapStatusEffectIcons(effects);
    expect(result).not.toBe(effects);
  });
});
