# AGENTS.md

## Project structure

```
naruto-d20-kaihou/
├── module.json                       Foundry module manifest
├── package.json                      npm scripts + devDependencies (lint/format/pack)
├── CLAUDE.md                         agent guidance (read first)
├── AGENTS.md                         this file
├── README.md                         user-facing install + dev docs (bilingual)
├── CHANGELOG.md                      semver history
├── RELEASE.md                        release procedure (Task 18)
├── LICENSE                           cribbed from public naruto-d20
├── packs/
│   ├── _source/classes-basic/        generated JSON, COMMITTED
│   └── classes-basic/                compiled LevelDB, gitignored
├── scripts/
│   ├── generate-classes.py           YAML → JSON generator
│   ├── validate-output.py            JSON schema check
│   └── README.md                     script usage (Task 18)
├── data/
│   └── skill-key-mapping.json        vault slug → PF1e key
├── lang/                             en + pt-BR string tables
├── tests/                            pytest suite
├── eslint.config.mjs                 lint config (cribbed)
├── .prettierrc.json                  format config (cribbed)
└── .github/workflows/release.yml     release CI (cribbed)
```

## Build, test, dev commands

```bash
npm install                           install dev deps
npm run generate-classes              regenerate JSON from vault YAML
npm run validate-output               JSON schema check
npm test                              pytest
npm run lint                          ESLint + Prettier + Stylelint
npm run lint:fix                      auto-fix lint issues
npm run pack                          build packs/classes-basic/ LevelDB
npm run unpack                        decompile LevelDB back to JSON
```

The generator reads vault YAML from `$KAIHOU_VAULT_PATH` (defaults to `../Kaihou (Naruto D20)` relative to the script's working directory).

## Coding style

- Python: PEP 8, type hints, docstrings on top-level functions.
- JavaScript: ESLint config cribbed from public `naruto-d20`. Run `npm run lint:fix` before committing.
- JSON: 2-space indent, sorted keys where the spec doesn't prescribe order.
- Markdown: GitHub Flavored Markdown. Wrap at ~100 chars.

## Naming conventions

- Generated JSON: `<Class Name>_<UUID>.json` where UUID is `md5(slug)[:16]`.
  Example: `Strong Ninja_a1b2c3d4e5f60718.json`.
- Skill keys: PF1e PROD short keys (`acr`, `clm`, `kar`, `nin`, `gnj`, `tai`, `fui`, `ckc`, `lor`).
- Pack folder name in Foundry UI: `Naruto D20 — Kaihou`.

## Testing guidelines

- All generator behavior is TDD'd. New translation rules require a failing test first.
- Project-memory invariants (Fast Ninja Ref = mid-custom, Smart Ninja Will = mid-custom)
  have dedicated tests; do not weaken them without a project memory update.
- The skill-key exhaustiveness test runs against every union-of-class-skills slug
  across all 6 vault YAMLs. New vault skills must get a mapping entry.

## Commit style

```
<type>(<scope>): <subject>

<body>

Co-Authored-By: <agent or human>
```

Types used: `feat`, `fix`, `chore`, `docs`, `test`, `refactor`.
Scope is optional; common: `generator`, `mapping`, `release`, `infra`.

## API verification (Foundry, PF1e)

When in doubt about a PF1e class-item field shape, consult:
- The PF1e source at `https://gitlab.com/Furyspark/foundryvtt-pathfinder1` (system 11.11 branch)
- The public `naruto-d20` module's CLAUDE.md (Context7 library IDs cited there)
- An existing PF1e class JSON exported from a running Foundry world (last resort)

The 4 `.foundry.json` drafts in the vault (`Mechanics/Character_Options/Classes/Basic/*.foundry.json`) are **stale references**, not authoritative — they predate the generator and may have bugs (e.g., one observed mismatched BAB).
