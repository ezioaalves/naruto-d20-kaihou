# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this module is

`naruto-d20-kaihou` is the **private campaign bridge module** for the Kaihou campaign
(Naruto D20 on PF1e, Foundry v13). It owns campaign-identity content and vault↔Foundry
tooling: village origins, 20 Questions grants, schools, occupations, the 20 Questions
wizard (ApplicationV2), and the zen theme.

**Rules mechanics belong to the public `naruto-d20` module** (hard dependency):
techniques, feats, flaws, advanced classes, bloodlines, talents, equipment. Never add
rules content here.

Authoritative architecture: `docs/superpowers/specs/2026-06-11-kaihou-refactor-design.md`
in the Kaihou vault (`../../../../../Kaihou (Naruto D20)/`). A full developer guide at
`docs/dev-guide.md` is planned (Plan 2); until it lands, the spec is the reference.

## Hard rules

1. **Vault is source of truth.** Pack content is generated from vault sources by
   `generators/*.py`. Never hand-edit `packs/_source/**` — change the vault source and
   re-run the matching `npm run generate-*` script.
2. **Deterministic UUIDs.** Generators derive `_id` from `md5(slug)[:16]`. Never
   hand-author UUIDs.
3. **Skill-key mapping** lives at `data/skill-key-mapping.json`. Unmapped slugs must
   fail loud — never silently skip.
4. **No silent deletes.** Anything that removes actor/item data needs an explicit
   opt-in flag and a warning path.
5. **Backlog lives in the vault** operational ticket system
   (`Campaign Management/operational/`), `area: foundry` — not in this repo.

## Layout

- `scripts/kaihou.mjs` — the only esmodule entry; delegates to concern modules
- `scripts/apps/wizard/` — ApplicationV2 20 Questions wizard
- `scripts/grants/` — compendium-grant engine + school/occupation auto-apply
- `scripts/theme/` — zen theme (self-registering on import)
- `generators/` — Python vault→pack-source generators + validate-output.py
- `packs/_source/<pack>/` — committed pack JSON; `packs/<pack>/` compiled LevelDB (gitignored)
- `scss/` → compiled to `styles/` by `npm run build:css` (committed; freshness-gated in tests)

## Commands

- `npm test` — pytest + vitest + CSS-freshness gate (must stay green)
- `npm run lint` / `lint:fix`
- `npm run generate-<villages|questions|schools|occupations>` — vault → pack source
- `npm run pack:all` / `unpack:<pack>` — LevelDB compile/decompile
- `npm run build` — pack:all + build:css
- `npm run validate:manifest` — manifest paths + version-drift gate
