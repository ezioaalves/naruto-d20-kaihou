// tests/sheets/kaihou-character-sheet.test.mjs
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getKaihouCharacterSheetClass,
  getKaihouNpcSheetClass,
  registerKaihouCharacterSheet,
} from "../../scripts/sheets/kaihou-character-sheet.mjs";

class CharacterBase {}
class NpcBase {}

beforeEach(() => {
  globalThis.pf1 = {
    applications: {
      actor: {
        ActorSheetPFCharacter: CharacterBase,
        ActorSheetPFNPC: NpcBase,
      },
    },
  };
  globalThis.Actor = class Actor {};
  globalThis.foundry = {
    applications: { apps: { DocumentSheetConfig: { registerSheet: vi.fn() } } },
    utils: {
      mergeObject: (a, b) => ({ ...a, ...b }),
      flattenObject: (obj, prefix = "") => Object.entries(obj ?? {}).reduce((out, [key, value]) => {
        const path = prefix ? `${prefix}.${key}` : key;
        if (value && typeof value === "object" && !Array.isArray(value)) {
          Object.assign(out, globalThis.foundry.utils.flattenObject(value, path));
        } else {
          out[path] = value;
        }
        return out;
      }, {}),
    },
  };
  globalThis.game = {
    i18n: { localize: (key) => key },
    settings: { get: vi.fn(() => true) },
  };
});

describe("Kaihou actor sheet classes", () => {
  it("uses the PF1 character base for character actors", () => {
    const Sheet = getKaihouCharacterSheetClass();
    expect(Sheet.prototype).toBeInstanceOf(CharacterBase);
  });

  it("uses the PF1 NPC base for npc actors", () => {
    const Sheet = getKaihouNpcSheetClass();
    expect(Sheet.prototype).toBeInstanceOf(NpcBase);
  });



  it("skips actor sheet rerenders for learning-only embedded item updates", () => {
    const Sheet = getKaihouCharacterSheetClass();
    const sheet = new Sheet();

    expect(sheet._shouldSkipKaihouRender(false, {
      renderContext: "updateItem",
      renderData: { system: { learning: { attemptsUsed: 2, progress: 1 } } },
    })).toBe(true);

    expect(sheet._shouldSkipKaihouRender(false, {
      renderContext: "updateItem",
      renderData: { system: { learning: { attemptsUsed: 2 }, name: "Changed" } },
    })).toBe(false);
  });

  it("suppresses immediate document-update renders after action-style sheet clicks", () => {
    const Sheet = getKaihouCharacterSheetClass();
    const sheet = new Sheet();
    sheet._suppressKaihouUpdateRenderUntil = Date.now() + 750;

    expect(sheet._shouldSkipKaihouRender(false, { renderContext: "updateActor", renderData: {} })).toBe(true);
    expect(sheet._shouldSkipKaihouRender(false, { renderContext: "deleteItem", renderData: {} })).toBe(false);
  });

  it("registers the Kaihou sheet for characters and NPCs with the default setting", () => {
    registerKaihouCharacterSheet();

    const calls = globalThis.foundry.applications.apps.DocumentSheetConfig.registerSheet.mock.calls;
    expect(calls).toHaveLength(2);
    expect(calls[0][3]).toMatchObject({ types: ["character"], makeDefault: true });
    expect(calls[1][3]).toMatchObject({ types: ["npc"], makeDefault: true });
  });
});
