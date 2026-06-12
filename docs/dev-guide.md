# naruto-d20-kaihou Developer Guide

## Module Anatomy

```
naruto-d20-kaihou/
├── module.json           — Foundry manifest; declares dep on naruto-d20 ≥ 1.0.8
├── scripts/
│   ├── kaihou.mjs        — Single entry point registered in module.json
│   ├── apps/wizard/      — 20 Questions wizard (ApplicationV2)
│   │   ├── twenty-questions-wizard.mjs   — App class; renders via HandlebarsApplicationMixin
│   │   ├── wizard-state.mjs              — State schema, defaultState(), loadFromActor(), diffStates()
│   │   ├── question-definitions.mjs      — All Q1–Q20 definitions (pickType, stateField, options)
│   │   ├── mechanic-applier.mjs          — Pure functions → { updates, creates, deletes } plans
│   │   ├── finish-orchestrator.mjs       — Batches plans, calls actor.update / createEmbeddedDocuments
│   │   ├── biography-renderer.mjs        — render / parse / splice 20Q HTML in actor biography
│   │   ├── browse.mjs                    — Compendium browser integration for drag-drop picks
│   │   └── heritage-table.mjs            — Q18 heritage roll table + modifier extraction
│   ├── grants/
│   │   ├── item-grants.mjs               — findCompendiumItemByName, buildEmbeddedGrantData
│   │   ├── school-apply.mjs              — Auto-apply school class skills on item create
│   │   └── occupation-apply.mjs          — Auto-apply occupation grants on item create
│   └── theme/
│       └── main.mjs      — Zen scroll theme; gates everything under body.naruto-zen
├── templates/apps/tqw-v2/   — Handlebars partials for the wizard UI
├── packs/_source/            — Compendium JSON (source of truth; LevelDB built from these)
│   ├── questions/            — 20Q grant feats (Code Adherent, Parental Influence, etc.)
│   ├── classes-basic/        — 6 base class JSONs (generated from vault YAML)
│   ├── villages/             — Village trait items
│   ├── schools/              — School feat items
│   └── occupations/          — Occupation feat items
├── generators/               — Python generators (classes from vault YAML)
├── tests/wizard/             — Vitest unit tests
└── docs/                     — This guide and design specs
```

## Data Flow: Wizard Finish

```
Player clicks "Finish"
  │
  ▼
finishWizard(actor, state)          [finish-orchestrator.mjs]
  │
  ├─ validate(state)                [wizard-state.mjs] — required fields
  ├─ loadFromActor(actor)           [wizard-state.mjs] — original state snapshot
  ├─ diffStates(original, new)      [wizard-state.mjs] — which fields changed
  │
  ├─ for each changed field:
  │    planForField() →             [finish-orchestrator.mjs]
  │      applyQ*() / applyDragDropFeat()  [mechanic-applier.mjs]
  │      returns { updates, creates, deletes }
  │
  ├─ mergePlans()                   — merge all per-field plans into one
  ├─ actor.update(updates)
  ├─ actor.createEmbeddedDocuments("Item", creates)
  ├─ actor.deleteEmbeddedDocuments("Item", deletes)
  │
  ├─ buildQ17Grant(actor)           — unconditional Parental Influence grant
  ├─ actor.createEmbeddedDocuments("Item", [parentalInfluence])  (if not already present)
  │
  └─ renderBiography(state, opts)   [biography-renderer.mjs]
       spliceBiography(bio, html)
       actor.update({ biography: newBio })
```

## Wizard Marker Pattern

Every item created by the wizard carries a flag that identifies its source. This enables idempotent re-runs.

```js
// Flag path: flags["naruto-d20-kaihou"].wizard.<markerKey> = true
// Example — Q9 level-1 feat:
item.flags["naruto-d20-kaihou"].wizard.q9Level1Feat === true
```

`findItemIdByMarker(actor, markerKey)` — returns the `_id` of the first item with that marker. Used by revert functions to find and delete the item. Defined in `mechanic-applier.mjs` (private to that module).

`withWizardMarker(itemData, markerKey)` — clones itemData and stamps the flag. Used by all `apply*` functions before pushing to `plan.creates`.

## Recipe: Add a New Question Pick

Scenario: Q21 "What weapon do you carry?" grants a starting weapon from a drag-drop.

1. **Add state field** in `wizard-state.mjs` `defaultState()`:
   ```js
   q21_weapon_uuid: null,
   ```
   Add it to the `topFields` array in `diffStates()`.

2. **Add question definition** in `question-definitions.mjs`:
   ```js
   {
     id: "q21",
     pickType: "drag-drop",
     stateField: "q21_weapon_uuid",
     required: false,
     questionText: "What weapon do you carry?",
     sidebarLabel: "Weapon",
     narrativePrompt: "...",
     markerFlag: "q21Weapon",
     dropAccepts: {typeIn: ["weapon"]},
     browse: {kind: "compendium", pack: "pf1.items", label: "Browse Weapons"},
   }
   ```

3. **Add applier/reverter** in `mechanic-applier.mjs`:
   ```js
   // Re-uses the generic drag-drop functions; no custom applier needed:
   // applyDragDropFeat(itemData, "q21Weapon")
   // revertDragDropFeat(actor, "q21Weapon")
   ```

4. **Add orchestrator handler** in `finish-orchestrator.mjs` `planForField()`:
   ```js
   if (field === "q21_weapon_uuid" && wasSet && isObject) {
     const data = await fetchItemData(actor, newValue);
     return data ? applyDragDropFeat(data, "q21Weapon") : null;
   }
   ```

5. **Add test** in `tests/wizard/mechanic-applier.test.mjs`.

## Recipe: Add a Pack Item

1. Determine the deterministic UUID: `python3 -c "import hashlib; print(hashlib.md5(b'my-item-slug').hexdigest()[:16])"`
2. Create `packs/_source/<pack-name>/My_Item_<uuid>.json`:
   ```json
   {
     "_id": "<uuid>",
     "_key": "!items!<uuid>",
     "name": "My Item",
     "type": "feat",
     "img": "icons/svg/book.svg",
     "system": { "subType": "trait", "description": {"value": "..."} },
     "flags": {}
   }
   ```
3. Compile the pack: `npm run packs:compile` (runs `fvtt package workon` + `fvtt package pack`).

## Recipe: Change a Wizard Question's Browse Target

Change the `browse` key in the question definition in `question-definitions.mjs`:
- `{kind: "compendium", pack: "pf1.feats", filter: {subType: "feat"}, label: "Browse Feats"}` — standard PF1e compendium browser
- `{kind: "pack", id: "naruto-d20-kaihou.schools", label: "Browse Schools"}` — specific pack popup

Both kinds resolve in `browse.mjs`.

## Question-Feat Effects (`scripts/grants/question-effects.mjs`)

Question feats generated by `generators/generate-questions.py` carry their
mechanical payload as PF1e dictionary flags
(`system.flags.dictionary.{reputation, actionPoints, bonusSkillRank}`) plus a
`flags.naruto-d20-kaihou.questionFeat` marker. The engine applies the payload
to the hero-stat counters on `createItem` and reverts it on `deleteItem`, so
effects work whether the feat arrives via the wizard or a manual compendium
drag. PF1e `system.scriptCalls` cannot fire on acquisition (use/equip only) —
that is why the trigger is a hook. To add a new payload kind: extend
`translate_minor_benefit` in the generator, `effectDeltasFromItem` +
`buildEffectUpdates` in the engine, and the vitest/pytest pairs that cover
them.

## Hook Lifecycle

| Hook | Module use |
|------|-----------|
| `init` | Register Handlebars helpers; preload wizard partials |
| `ready` | Expose `game["naruto-d20-kaihou"].TwentyQuestionsWizard`; register school/occupation auto-apply + question-effects hooks |
| `renderActorSheet` | Inject the two-column 20Q biography section (character + NPC sheets) |
| `createItem` | `school-apply.mjs` — auto-apply class skills from school feats |
| `createItem` | `occupation-apply.mjs` — auto-apply occupation grants |
| `createItem` | `question-effects.mjs` — apply question-feat dictionary payloads |
| `deleteItem` | `occupation-apply.mjs` — auto-revert occupation grants |
| `deleteItem` | `question-effects.mjs` — revert question-feat dictionary payloads |

## PF1e API Gotchas

- **Class skills live on items, not on `actor.system.classSkills`**. PF1e aggregates from class/feat/race items. To grant a class skill, create a feat item with `system.classSkills: { skillKey: true }`.
- **`system.skills.X.rank` is a user-editable field** tracked by PF1e's sheet. Don't write to it from wizard code unless you intend a permanent rank assignment. Prefer `bonusSkillRank` (via a feat item) for bonus-rank grants.
- **`fromUuid()` requires the compendium to be open** (loaded in `game.packs`). The `naruto-d20-kaihou.questions` pack is always loaded on `ready` because it's declared in `module.json` `packs`.
- **ApplicationV2 `render(true)`** opens the app; calling it again re-renders if already open. The wizard uses `_renderLock` to prevent re-entrant calls from double-clicks.
- **Handlebars partials must be pre-registered**. The wizard calls `loadTemplates(WIZARD_PARTIALS)` in the `init` hook because `HandlebarsApplicationMixin` resolves partials by path at render time.

## Build, Test, Release

**No JS build step** — Foundry loads ESM directly. Reload Foundry (F5) to pick up changes.

**SCSS** — the theme layer uses Dart Sass with `@use`/`map.get`. Compile:
```bash
npm run build:scss   # one-shot
npm run watch:scss   # watch mode
```

**Tests** — Vitest, Node environment:
```bash
npm test             # all tests
npm test -- --watch  # watch mode
npm test tests/wizard/state.test.mjs  # single file
```

**Compile packs** (after editing `packs/_source/**/*.json`):
```bash
npm run packs:compile
```

**Release** — bump `module.json` + `package.json` + `CHANGELOG.md`, commit, tag `vX.Y.Z`, push tag. GitHub Actions builds the release zip and publishes it.

## Vault Integration

The Kaihou vault (`/home/ezioaalves/Documents/Kaihou (Naruto D20)/`) is the source of truth for gameplay rules. The module encodes only the mechanical hooks Foundry needs.

- **Classes** — generated from vault YAMLs: `generators/generate-classes.py`
- **Specs** — design specs live at `vault/docs/superpowers/specs/`
- **Operational tickets** — `vault/Campaign Management/operational/tickets/`
