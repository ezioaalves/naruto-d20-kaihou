# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## v1.1.2 - 2026-06-07

### Added
- `packs/questions` compendium with 9 PF1e trait items covering 20-Questions
  Q4 / Q7 / Q8 mechanical grants:
  - **Q4 Elemental Affinity** (5 items): Fire, Water, Earth, Wind, Lightning.
    Each tags the character with `system.flags.dictionary.affinity = <element>`
    (forward-looking hook for D2.3b wizard and possible D2.X technique gating).
  - **Q7 Village Relationship** (2 items): Village Loyalist (+1 Reputation),
    Village Outsider (+1 class skill of player's choice — doc-only).
  - **Q8 Shinobi Code Stance** (2 items): Code Adherent (+2 Action Points),
    Code Sceptic (+4 skill points to Craft or Profession — doc-only).
- New Python generator (`scripts/generate-questions.py`) mirroring
  `scripts/generate-villages.py` — vault YAML → PF1e trait JSON with
  deterministic UUIDs and the mandatory `_key: "!items!<_id>"` field.
- New `minor_benefit.kind` values: `affinity` (validates against the 5 element
  set) and `doc_only` (description-only, no mechanical effect).
- 5 element icons in `assets/questions/elements/` copied from
  `naruto-d20-zen-theme`. Q7 / Q8 items use Foundry built-in icons.
- Pytest suite extended by `tests/test_generate_questions.py` (~18 tests
  covering basic shape, `_key` invariant, affinity per-element + invalid
  rejection, reputation / action_point / doc_only encodings, img
  pass-through, deterministic UUID, write-to-file, and CLI parsing).

### Known limitations
- Q4 affinity per-level Learn Bonus and Energy Resistance are **doc-only**
  references to `Mechanics/Basic_Rules/Chakra.md` (the trait only tags the
  affinity; level-scaling is GM/manual).
- Q7 Village Outsider "+1 class skill of your choice" is **doc-only** —
  player picks the skill at character creation; not auto-applied.
- Q8 Code Sceptic "+4 skill points to Craft or Profession" is **doc-only** —
  PF1e cannot grant choice-based skill ranks via static trait; player picks
  the subskill manually.
- The 20-Questions narrative-answer capture (write all 20 player answers
  into the actor's biography tab) is deferred to **D2.3b** — a separate
  sheet-wizard release with its own design + plan cycle.

## v1.1.1 - 2026-06-07

### Fixed
- Compendia shipped empty in v1.0.0 and v1.1.0 because generated JSON
  files lacked the `_key: "!items!<_id>"` field that Foundry's LevelDB
  packer requires. Both generators now emit `_key`; tests pin the
  invariant. Verified end-to-end against Foundry v13 + PF1e v11.11.

### Changed
- Dropped the `classes-basic` compendium. The public `naruto-d20`
  module ≥ 1.0.10 ships a polished `classes` pack covering the same
  6 base classes; carrying a parallel pack only produced name
  collisions in-world. Dependency bumped to `naruto-d20 >= 1.0.10`.
- Each village trait now ships an icon
  (`modules/naruto-d20-kaihou/assets/villages/<icon>.svg`), with the
  mapping authored in the vault YAML and passed through the generator.

## v1.1.0 - 2026-06-07

### Added
- `packs/villages` compendium with 8 PF1e trait items (one per village):
  Hisuigakure, Houohgakure, Kanigakure, Kiringakure, Ryuugakure,
  Sasorigakure, Shishigakure, Tsurugakure. Each grants 2 class skills
  + 1 minor benefit and corresponds to the 20 Perguntas Q1 grant.
- New Python generator (`scripts/generate-villages.py`) for village
  YAML → Foundry trait JSON, with deterministic UUIDs (md5(slug)[:16]).
- Extended skill-key mapping (`data/skill-key-mapping.json`) with 11
  new village skill slugs.
- Pytest suite extended (`tests/test_generate_villages.py`,
  `tests/test_skill_mapping.py`): ~13 new tests covering generator
  field translation, minor-benefit encoding (hp/init/saves/AP/
  reputation/point_build), and skill-mapping exhaustiveness.

### Known limitations
- Hisuigakure's +2 Point Build is **doc-only** (PF1e has no point-buy
  runtime hook). Players apply manually at character creation.
- Custom-stat grants (Action Point, Reputation) use the
  `system.flags.dictionary` convention; verify in Foundry that these
  apply on drag-to-actor. If they don't apply, fall back to doc-only.

## v1.0.0 - 2026-06-06

### Added
- Initial release of Naruto-D20-Kaihou content module.
- `packs/classes-basic` compendium with 6 base classes generated from vault YAML:
  Strong Ninja, Fast Ninja, Tough Ninja, Smart Ninja, Dedicated Ninja, Charismatic Ninja.
- Hard dependency on public `naruto-d20` module ≥ 1.0.8 (techniques + feats compendia).
- Python generator (`scripts/generate-classes.py`) for YAML → Foundry JSON, with
  deterministic UUIDs (md5(slug)[:16]) so re-runs produce byte-identical output.
- Pytest suite covering generator field translation, save-special overrides
  (Fast Ninja Ref = mid-custom, Smart Ninja Will = mid-custom per Kaihou house
  rules), and skill-key mapping exhaustiveness.
- Validation script (`scripts/validate-output.py`) for JSON schema completeness.
- Bilingual setup (en + pt-BR).
- ESLint + Prettier + Stylelint cribbed from public module.
- GH Actions release workflow cribbed from public module.

### Known limitations
- Talent trees (Chakra Control tree, Empathic tree, etc.) are NOT included in this
  release. They are deferred to a D2.X follow-up (`packs/class-talents/`). Imported
  classes show correct BAB/saves/Defense/Reputation/HD/class-skills but lack
  talent-tree class features.

[1.0.0]: https://github.com/ezioaalves/naruto-d20-kaihou/releases/tag/v1.0.0
