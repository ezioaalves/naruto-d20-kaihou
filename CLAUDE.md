# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this module is

`naruto-d20-kaihou` is a **private** Foundry VTT content module for the Kaihou campaign (Naruto D20 in PF1e). It is a dedicated extension of the public [`ezioaalves/naruto-d20`](https://github.com/ezioaalves/naruto-d20) module — it adds **only Kaihou-specific identity content**:

- Base classes (this v1.0.0 release)
- Future: village races, 20 Perguntas mechanical grants, flaws, advanced classes, bloodlines, schools, occupations (D2.2–D2.7 roadmap from the Kaihou vault audit)

## Hard rules

1. **Do NOT add public `naruto-d20` rules content** here. Techniques, technique-buffs, and feats live in the public module. This module's `module.json` declares a hard dependency on `naruto-d20 >= 1.0.8` for that reason.
2. **Vault YAML is source of truth** for classes. The 6 base-class JSONs at `packs/_source/classes-basic/` are **generated** from vault YAMLs at `<vault>/Mechanics/Character_Options/Classes/Basic/{Strong,Fast,Tough,Smart,Dedicated,Charismatic} Ninja.yaml`. To change a class, edit the vault YAML and re-run `npm run generate-classes`.
3. **Deterministic UUIDs.** The generator derives item IDs from `md5(<class-slug>)[:16]` so re-runs produce byte-identical JSON. Never hand-author UUIDs.
4. **Save translation.** Vault YAML uses `low`/`mid`/`high` strings. Foundry PF1e save fields use `{value: "low"/"med"/"high", custom?: "<formula>"}`. The "mid" value translates to `{value: "low", custom: "floor((2 * @level + 6) / 5)"}` — Kaihou's mid-custom formula. Project memory of the Kaihou vault confirms Fast Ninja Ref = mid-custom and Smart Ninja Will = mid-custom; the rule applies to all "mid" saves uniformly.
5. **Skill-key mapping** lives at `data/skill-key-mapping.json`. Source: `<vault>/Mechanics/House_Rules/Skill - Conversion.md` + inspection of PF1e PROD compendium keys. If a vault class_skill slug has no mapping, the generator fails loud with the missing slug name.

## Talent trees (deferred to D2.X)

Vault YAMLs include a `talents` array per class (Chakra Control tree, Empathic tree, etc.). These are **not** included in v1.0.0. A future follow-up (`packs/class-talents/`) will encode them; the generator script will be extended at that point. Until then, imported classes show correct BAB/saves/Defense/Reputation/HD/class-skills but lack class talent features.

## Module-side automation

| Script | Purpose |
|---|---|
| `scripts/generate-classes.py` | Read vault YAML, emit packs/_source/classes-basic/*.json |
| `scripts/validate-output.py` | JSON schema check; optional informational diff vs vault .foundry.json drafts |
| `tests/test_generate_classes.py` | Pytest TDD coverage for the generator |
| `tests/test_skill_mapping.py` | Pytest exhaustiveness check for data/skill-key-mapping.json |

## Release flow

See `RELEASE.md`. Summary: bump `module.json` + `package.json` + `CHANGELOG.md`, tag `vX.Y.Z`, push tag, GH Actions workflow builds and publishes the release zip.

## Where Kaihou-specific guidance does NOT live

Kaihou *gameplay* rules (skill conversion, EITR feat overhaul, 20 Perguntas) are vault content, not module content. The vault stays the canonical source for rules text; the module encodes only the mechanical hooks Foundry needs.
