# Scripts Documentation

This directory contains automation scripts for the naruto-d20-kaihou module.

## Overview

The scripts manage the workflow from vault source files to compiled Foundry compendia:

1. **`generate-classes.py`** — Read Kaihou vault YAML, generate Foundry PF1e class JSON
2. **`validate-output.py`** — Validate generated JSON against PF1e schema

These are integrated into the npm build pipeline via package.json scripts.

## generate-classes.py

### Purpose

Generates Foundry PF1e class-item JSON files from vault YAML templates.

The generator reads 6 YAML files from the vault:
```
<vault>/Mechanics/Character_Options/Classes/Basic/
├── Strong Ninja.yaml
├── Fast Ninja.yaml
├── Tough Ninja.yaml
├── Smart Ninja.yaml
├── Dedicated Ninja.yaml
└── Charismatic Ninja.yaml
```

And emits 6 corresponding JSON files to `packs/_source/classes-basic/`:
```
packs/_source/classes-basic/
├── Strong Ninja_<UUID>.json
├── Fast Ninja_<UUID>.json
├── Tough Ninja_<UUID>.json
├── Smart Ninja_<UUID>.json
├── Dedicated Ninja_<UUID>.json
└── Charismatic Ninja_<UUID>.json
```

**Key property:** UUIDs are deterministic (md5(slug)[:16]). Re-runs produce byte-identical JSON.

### Prerequisites

- Vault YAML files exist at `<vault>/Mechanics/Character_Options/Classes/Basic/*.yaml`
- Each YAML has required fields: `name`, `slug`, `hit_die`, `bab`, `saves`, `defense_progression`, `reputation_progression`, `skill_points_per_level`, `ability`, `class_skills`, `source`
- `data/skill-key-mapping.json` exists and is complete (covers all `class_skills` slugs used in vault YAMLs)
- Vault path is correct (default: `../Kaihou (Naruto D20)` relative to repo root)

### Usage

#### From npm

```bash
# Generate with defaults (vault at ../Kaihou (Naruto D20), output to packs/_source/classes-basic/)
npm run generate-classes

# Dry-run: validate YAML without writing files
npm run generate-classes -- --dry-run
```

#### From command line

```bash
# Generate with defaults
python3 scripts/generate-classes.py

# Dry-run (validate only)
python3 scripts/generate-classes.py --dry-run

# Custom vault path
python3 scripts/generate-classes.py --vault-path /path/to/vault

# Custom output directory
python3 scripts/generate-classes.py --output-dir /path/to/output

# Combination
python3 scripts/generate-classes.py \
  --vault-path /home/user/Kaihou \
  --output-dir ./output \
  --dry-run
```

### Flags

| Flag | Type | Default | Notes |
|------|------|---------|-------|
| `--vault-path` | Path | `../Kaihou (Naruto D20)` | Absolute or relative to repo root |
| `--output-dir` | Path | `packs/_source/classes-basic/` | Where to write generated JSON |
| `--dry-run` | Boolean | False | Parse and validate YAML without writing |

### Output

- Success: Prints one line per class with ✓ checkmark
  ```
  Generating 6 base classes from /home/user/Kaihou (Naruto D20)...
  ✓ Strong Ninja_a1b2c3d4e5f6g7h8.json
  ✓ Fast Ninja_...
  ...
  Done. Generated 6 class JSON files.
  ```

- Exit code: 0 on success, 1 on failure

### Error handling

Fails loudly (exits 1) on:

- **Vault path not found:** `Error: No YAML files found in <path>`
- **Mapping file missing:** `Error: Mapping file not found at data/skill-key-mapping.json`
- **Unknown skill slug:** `Error: <ClassName>: Unknown skill slug in mapping: 'acr'` (example)
- **Invalid YAML syntax:** `Error: <ClassName>: YAML parse error`
- **Missing vault YAML field:** `Error: <ClassName>: KeyError: 'saves'` (example)

### Field translation rules

The generator translates vault YAML fields to Foundry PF1e schema:

| Vault field | Foundry field | Translation rule |
|---|---|---|
| `hit_die` (e.g., `d8`) | `system.hd` | Strip `d` prefix, convert to int |
| `bab` (`low`/`mid`/`high`) | `system.bab` | Map `mid` → `med` |
| `saves.fort/ref/will` | `system.save.{fort\|ref\|will}` | Special handling (see below) |
| `class_skills` (slugs) | `system.classSkills` | Translate slugs to 3-letter keys via mapping |
| `defense_progression` | `system.defense` | Pass through (`low`/`mid`/`high`) |
| `reputation_progression` | `system.reputation` | Pass through (`low`/`mid`/`high`) |
| `skill_points_per_level` (formula) | `system.skillPointsPerLevel` | Pass through as string |
| `ability` (3-letter code) | `system.ability` | Pass through |
| `source` (URL or text) | `system.source` | Pass through |

#### Save progression special handling

Per Kaihou house rule (CLAUDE.md Hard Rule 4):

```python
# Vault input:        Foundry output:
low   →  {value: "low"}
mid   →  {value: "low", custom: "floor((2 * @level + 6) / 5)"}
high  →  {value: "high"}
```

This applies to all three save types (fort, ref, will). Example: Fast Ninja has Ref = mid, so:
```json
{
  "ref": {
    "value": "low",
    "custom": "floor((2 * @level + 6) / 5)"
  }
}
```

#### Skill slug translation

The mapping at `data/skill-key-mapping.json` translates vault skill slugs to 3-letter PF1e keys. Example:

```json
{
  "acrobatics": "acr",
  "climb": "clm",
  "craft_alchemy": "cra",
  "concentration": "con",
  "knowledge_ninja_lore": "kni",
  ...
}
```

If a vault YAML references an unmapped slug (e.g., `"balance"`), the generator fails with:
```
✗ Fast Ninja: Unknown skill slug in mapping: 'balance'
```

Solution: Add the slug to `data/skill-key-mapping.json` and re-run.

### Example walkthrough

Suppose you edit `Strong Ninja.yaml` in the vault to change the BAB from `mid` to `high`:

```yaml
# Strong Ninja.yaml (vault)
name: Strong Ninja
slug: strong-ninja
bab: high  # ← Changed from "mid"
...
```

Then:

```bash
# Preview changes (dry-run)
npm run generate-classes -- --dry-run

# Generate for real
npm run generate-classes

# Validate the output
npm run validate-output

# Recompile the LevelDB compendia
npm run pack
```

The resulting JSON at `packs/_source/classes-basic/Strong Ninja_*.json` will have `"bab": "high"`.

## validate-output.py

### Purpose

Validates generated class JSON files against the PF1e class-item schema.

Checks:
- Required fields: `_id`, `name`, `type`, `system`
- `system.hd` is an integer in range [4, 12]
- `system.bab` is one of `low`, `med`, `high`
- `system.save.{fort|ref|will}` have correct structure:
  - `value` is one of `low`, `mid`, `high`
  - Optional `custom` is a string (formula)
- `system.classSkills` is a dict of boolean values
- `system.defense`, `system.reputation` are `low`/`mid`/`high`
- `system.skillPointsPerLevel` is a non-empty string (formula)
- `system.ability` is a valid 3-letter ability code
- `system.source` is a string or null

### Usage

#### From npm

```bash
# Validate default directory (packs/_source/classes-basic/)
npm run validate-output

# Verbose (print all files, including valid ones)
npm run validate-output -- --verbose
```

#### From command line

```bash
# Validate default directory
python3 scripts/validate-output.py

# Verbose output
python3 scripts/validate-output.py --verbose

# Custom directory
python3 scripts/validate-output.py --directory ./output

# Combination
python3 scripts/validate-output.py \
  --directory ./packs/_source/classes-basic \
  --verbose
```

### Flags

| Flag | Type | Default | Notes |
|------|------|---------|-------|
| `--directory` | Path | `packs/_source/classes-basic/` | Directory containing JSON files to validate |
| `--verbose` | Boolean | False | Print result for each file (even valid ones) |

### Output

- Success:
  ```
  All 6 files valid.
  ```
  Exit code: 0

- Failure:
  ```
  ✗ Strong Ninja_a1b2c3d4e5f6g7h8.json (invalid)
    - system.hd must be 4-12, got 2
    - missing required field: system.save.fort
  
  6/6 files failed validation.
  ```
  Exit code: 1

- Verbose output:
  ```
  ✓ Strong Ninja_a1b2c3d4e5f6g7h8.json (valid)
  ✓ Fast Ninja_i9j0k1l2m3n4o5p6.json (valid)
  ...
  All 6 files valid.
  ```

### Error messages

| Error | Cause | Fix |
|-------|-------|-----|
| `_id must be 16-char hex string` | UUID is wrong format | Re-run generator (produces deterministic UUIDs) |
| `system.hd must be 4-12` | Hit die out of range | Edit vault YAML `hit_die` field |
| `system.bab must be 'low'\|'med'\|'high'` | BAB value invalid | Generator should have caught this; check vault YAML |
| `system.classSkills.{code} must be boolean` | Skill value is not true/false | Check mapping and generator output |
| `missing required field: system.save.fort` | Save block incomplete | Re-run generator; check vault YAML has all three saves |
| `system.save.{type}.value must be 'low'\|'mid'\|'high'` | Save value invalid | Check vault YAML `saves` field |

## Typical workflow

### During development

After editing vault YAML classes:

```bash
# 1. Preview changes
npm run generate-classes -- --dry-run

# 2. Generate for real
npm run generate-classes

# 3. Validate schema
npm run validate-output

# 4. Run full test suite
npm test

# 5. Recompile LevelDB
npm run pack
```

### Before release

```bash
# 1. Ensure generator is up to date
npm run generate-classes

# 2. Validate all output
npm run validate-output

# 3. Run linting
npm run lint

# 4. Run tests
npm test

# 5. Recompile and prepare for packaging
npm run pack:all

# 6. Commit if all passes
git add packs/_source/ packs/classes-basic/ ...
git commit -m "chore: regenerate classes for v1.0.1"

# 7. Tag and release (see RELEASE.md)
```

## Related files

- `data/skill-key-mapping.json` — Vault skill slug → Foundry key mapping
- `packs/_source/classes-basic/` — Generated class JSON (source)
- `packs/classes-basic/` — Compiled LevelDB (output of `npm run pack`)
- `tests/test_generate_classes.py` — Generator unit tests
- `tests/test_skill_mapping.py` — Mapping completeness tests
- `RELEASE.md` — Release process (uses these scripts)
- `README.md` — Installation and usage
- `../Kaihou (Naruto D20)/Mechanics/Character_Options/Classes/Basic/` — Vault source YAMLs

## See also

- [Foundry VTT Module Development](https://foundryvtt.com/article/manifest/) — Module spec
- [PF1e System GitHub](https://github.com/foundryvtt-pathfinder1e/pf1-foundryvtt) — Class schema reference
