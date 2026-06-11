# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

## What this module is

`naruto-d20-kaihou` is a private Foundry VTT content module for the Kaihou campaign (Naruto D20 on PF1e, Foundry v13). It extends the public `naruto-d20` module (hard dependency) with Kaihou-specific identity content: base classes, village traits, schools, occupations, and the 20 Questions character-creation wizard.

**Rules mechanics belong to the public `naruto-d20` module.** Never add techniques, feats, flaws, or combat rules here.

## Developer guide

Full developer guide: `docs/dev-guide.md`

Covers: module anatomy, wizard data flow, marker pattern, recipes, hook lifecycle, PF1e API gotchas, build/test/release.

## Hard rules

1. **No `naruto-d20` rules content here.** Techniques, technique-buffs, combat feats, and advanced classes live in the public module.
2. **Vault YAML is source of truth for classes.** Edit vault YAMLs and run `npm run generate-classes` — do not hand-edit `packs/_source/classes-basic/`.
3. **Deterministic UUIDs.** Derive item IDs from `md5(<slug>)[:16]`. Never hand-author UUIDs.
4. **Skill-key mapping** lives at `data/skill-key-mapping.json`. Unmapped slugs must fail loud.
5. **No silent deletes.** Anything that removes actor/item data needs an explicit opt-in flag and a warning path.
6. **Backlog lives in the vault** at `Campaign Management/operational/`.

## Commands

No JS build step. Files are loaded directly by Foundry VTT as ESM. Reload Foundry (F5) to pick up changes.

```bash
npm test              # Vitest unit tests + pytest generators + CSS freshness gate
npm run build:scss    # Compile SCSS theme
npm run watch:scss    # Watch SCSS
npm run packs:compile # Compile compendium JSON → LevelDB
npm run packs:extract # Extract compendium LevelDB → JSON
npm run generate-classes  # Regenerate class JSONs from vault YAMLs
```

## Key directories

| Path | Purpose |
|------|---------|
| `scripts/kaihou.mjs` | Single entry point |
| `scripts/apps/wizard/` | 20 Questions wizard (ApplicationV2) |
| `scripts/grants/` | Compendium grant engine, school/occupation auto-apply |
| `scripts/theme/main.mjs` | Zen scroll theme (body.naruto-zen gating) |
| `packs/_source/` | Compendium item JSON (source of truth) |
| `generators/` | Python generators (vault YAML → pack JSON) |
| `tests/wizard/` | Vitest unit tests |
| `docs/dev-guide.md` | Developer guide |

## Vault location

`/home/ezioaalves/Documents/Kaihou (Naruto D20)/`

Specs: `docs/superpowers/specs/`
Operational tickets: `Campaign Management/operational/`
