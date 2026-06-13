// scripts/sheets/kaihou-character-sheet.mjs
//
// Bespoke campaign character sheet. Extends PF1e's character sheet so ALL
// mechanics (rolls, items, listeners) — and naruto-d20's chakra-tab prototype
// patch — are inherited. We only ADD: a view-model in getData and databook DOM
// in _renderInner (Task 7+). Anchor selectors (nav.sheet-navigation.tabs,
// section.primary-body) are never removed, so the chakra tab keeps injecting.

import { buildKaihouViewModel } from "./view-model.mjs";
import { headerBand, radarSvg, missionRecord } from "./databook-html.mjs";

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

    async _renderInner(...args) {
      const $html = await super._renderInner(...args); // PF1e DOM + naruto-d20 chakra injection
      try {
        this._injectDatabook($html, args[0]?.kaihou);
      } catch (e) {
        console.error(`${MODULE_ID} | databook injection failed`, e);
      }
      return $html;
    }

    _injectDatabook($html, vm) {
      if (!vm) return;
      const root = $html[0] ?? $html;

      // 1. Header band — prepend above the tab nav (anchors untouched).
      const nav = root.querySelector("nav.sheet-navigation.tabs[data-group='primary']");
      if (nav && !root.querySelector(".db-band")) {
        const meta = {
          name: this.actor.name,
          img: this.actor.img,
          village: this.actor.flags?.["naruto-d20-kaihou"]?.village ?? "",
          rank: this.actor.flags?.["naruto-d20-kaihou"]?.rank ?? "",
        };
        nav.insertAdjacentHTML("beforebegin", headerBand(vm, meta));
      }

      // 2. Compact radars on the Identity (summary) tab; full radars on Combat/Skills.
      const inject = (tabName, html, mountClass) => {
        const tab = root.querySelector(`.primary-body .tab[data-tab="${tabName}"]`);
        if (tab && !tab.querySelector(`.${mountClass}`)) {
          const mount = document.createElement("div");
          mount.className = mountClass;
          mount.innerHTML = html;
          tab.prepend(mount);
        }
      };

      const ability = radarSvg(vm.radars.abilities, { max: 20, variant: "ability" });
      const discipline = radarSvg(vm.radars.disciplines, { max: 10, variant: "discipline" });

      const originRows = [
        ["Village", this.actor.flags?.["naruto-d20-kaihou"]?.village],
        ["School", this._kaihouItemName("school")],
        ["Occupation", this._kaihouItemName("occupation")],
        ["Bloodline", this._kaihouItemName("bloodline")],
        ["Flaw", this._kaihouItemName("flaw")],
      ]
        .map(([k, v]) => `<div class="db-line"><span>${k}</span><span>${v ? String(v) : "—"}</span></div>`)
        .join("");

      inject(
        "summary",
        `<div class="db-frontmatter">
           <div class="db-identity-edit">
             <label>Alias <input type="text" name="flags.naruto-d20-kaihou.alias" value="${vm.identity.alias}"></label>
             <label>Allegiance <input type="text" name="flags.naruto-d20-kaihou.allegiance" value="${vm.identity.allegiance}"></label>
           </div>
           <div class="db-radars">
             <div class="db-panel"><h4 class="db-panel__h">Ability Scores</h4>${ability}</div>
             <div class="db-panel"><h4 class="db-panel__h">Disciplines</h4>${discipline}</div>
           </div>
           <div class="db-row2">
             ${missionRecord(vm.identity.missions)}
             <div class="db-panel"><h4 class="db-panel__h">Origin &amp; Path</h4>${originRows}</div>
           </div>
         </div>`,
        "db-mount-identity",
      );
      inject("combat", `<div class="db-panel"><h4 class="db-panel__h">Ability Scores</h4>${ability}</div>`, "db-mount-combat");
      inject("skills", `<div class="db-panel"><h4 class="db-panel__h">Disciplines</h4>${discipline}</div>`, "db-mount-skills");
    }

    _kaihouItemName(kind) {
      const item = this.actor.items?.find?.((i) => i.flags?.["naruto-d20-kaihou"]?.kind === kind);
      return item?.name ?? "";
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
