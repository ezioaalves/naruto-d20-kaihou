# Cross-module contract: naruto-d20 ⇄ naruto-d20-kaihou

Kaihou ships a campaign character sheet (`KaihouCharacterSheet extends
pf1.applications.actor.ActorSheetPFCharacter`). For naruto-d20's chakra-tab
injection and synckit button to keep working on it, both sides honour:

## naruto-d20 keeps stable (already true today)
- Injects the chakra tab via `ActorSheetPF.prototype._renderInner`, appending:
  - `<a data-tab="chakra" data-group="primary">` into `nav.sheet-navigation.tabs[data-group='primary']`
  - the chakra panel into `section.primary-body`
- The synckit button via `ActorSheetPF.prototype._getHeaderButtons`.

## Kaihou guarantees
- Its sheet preserves both anchor selectors (never removes nav or primary-body).
- It only ADDS sibling nodes; it never re-renders chakra fields itself.

## Optional (nice-to-have) general getters for naruto-d20
Purely general-purpose, usable by any sheet — not Kaihou-specific:
1. A documented getter for affinities + advanced/Kekkei-Genkai nature
   (Kaihou currently reads `flags["naruto-d20"].chakra.nature.{primary,secondary}`
   for basics and falls back to a Kaihou flag for the advanced nature).
2. A documented export of the discipline→skill-key map
   (Kaihou currently hard-codes `nin/fui/ckc/tai/gnj`).
