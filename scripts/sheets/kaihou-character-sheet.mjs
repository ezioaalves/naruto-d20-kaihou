// scripts/sheets/kaihou-character-sheet.mjs
//
// Bespoke campaign character sheet. Extends PF1e's character sheet so ALL
// mechanics (rolls, items, listeners) — and naruto-d20's chakra-tab prototype
// patch — are inherited. We only ADD: a view-model in getData and databook DOM
// in _renderInner (Task 7+). Anchor selectors (nav.sheet-navigation.tabs,
// section.primary-body) are never removed, so the chakra tab keeps injecting.

import { buildKaihouViewModel } from "./view-model.mjs";

export const MODULE_ID = "naruto-d20-kaihou";

export function getKaihouCharacterSheetClass() {
  const Base = pf1?.applications?.actor?.ActorSheetPFCharacter;
  if (!Base) {
    console.error(`${MODULE_ID} | pf1 ActorSheetPFCharacter not found — sheet not registered`);
    return null;
  }

  return class KaihouCharacterSheet extends Base {
    static get defaultOptions() {
      return foundry.utils.mergeObject(super.defaultOptions, {
        classes: [...super.defaultOptions.classes, "kaihou-databook"],
      });
    }

    async getData(options) {
      const data = await super.getData(options);
      try {
        data.kaihou = buildKaihouViewModel(this.actor);
      } catch (e) {
        console.error(`${MODULE_ID} | view-model build failed`, e);
        data.kaihou = null;
      }
      return data;
    }
  };
}

export function registerKaihouCharacterSheet() {
  const cls = getKaihouCharacterSheetClass();
  if (!cls) return;
  const DSC = foundry.applications?.apps?.DocumentSheetConfig ?? globalThis.DocumentSheetConfig;
  const makeDefault = game.settings.get(MODULE_ID, "kaihouSheetDefault");
  DSC.registerSheet(Actor, MODULE_ID, cls, {
    types: ["character"],
    label: game.i18n.localize("Kaihou.Sheet.Label"),
    makeDefault,
  });
  console.log(`${MODULE_ID} | character sheet registered (default=${makeDefault})`);
}
