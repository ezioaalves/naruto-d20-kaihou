# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
