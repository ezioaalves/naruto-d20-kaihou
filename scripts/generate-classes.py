#!/usr/bin/env python3
"""Generate Foundry PF1e class JSON from Kaihou vault YAML.

Usage:
    python3 scripts/generate-classes.py [--vault-path <abs path>] [--output-dir <path>] [--dry-run]

Reads vault YAML at <vault>/Mechanics/Character_Options/Classes/Basic/*.yaml
and emits one JSON per class to packs/_source/classes-basic/.

Source of truth: vault YAML. Re-run any time YAML changes; generator is
deterministic (md5(slug)[:16] UUIDs) so re-runs produce byte-identical output.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import sys
from pathlib import Path
from typing import Any

import yaml


_BAB_MAP = {"low": "low", "mid": "med", "high": "high"}

# Kaihou house rule: mid-custom formula for saves
_MID_CUSTOM_FORMULA = "floor((2 * @level + 6) / 5)"

# Default vault path: user home directory
DEFAULT_VAULT_PATH = Path.home() / "Documents" / "Kaihou (Naruto D20)"


def generate_uuid(slug: str) -> str:
    """Generate a deterministic 16-character UUID from a slug using md5.

    Returns first 16 hex characters of md5(slug), ensuring re-runs produce
    byte-identical output (no random UUIDs, no timestamps).
    """
    hash_obj = hashlib.md5(slug.encode("utf-8"))
    return hash_obj.hexdigest()[:16]


def translate_bab(vault_bab: str) -> str:
    """Vault `low/mid/high` -> Foundry PF1e `low/med/high`."""
    try:
        return _BAB_MAP[vault_bab]
    except KeyError as e:
        raise ValueError(f"Unknown BAB value: {vault_bab!r}") from e


def translate_save(vault_save: str) -> dict[str, Any]:
    """Vault `low/mid/high` -> Foundry PF1e save dict with custom formula for mid.

    Kaihou house rule (per CLAUDE.md Hard Rule 4):
    - low/high translate to {value: "low"/"high"} with no custom override
    - mid translates to {value: "low", custom: "floor((2 * @level + 6) / 5)"}
    """
    if vault_save == "low":
        return {"value": "low"}
    elif vault_save == "mid":
        return {"value": "low", "custom": _MID_CUSTOM_FORMULA}
    elif vault_save == "high":
        return {"value": "high"}
    else:
        raise ValueError(f"Unknown save progression: {vault_save!r}")


class SkillKeyMapper:
    """Load and use the skill-key mapping table."""

    def __init__(self, mapping_path: Path):
        """Load the mapping from data/skill-key-mapping.json."""
        with open(mapping_path) as fh:
            self._mapping = json.load(fh)

    def translate(self, slug: str) -> str:
        """Translate a vault skill slug to a PF1e 3-letter key.

        Raises ValueError if the slug is not in the mapping (fail-loud per CLAUDE.md Hard Rule 5).
        """
        if slug not in self._mapping:
            raise ValueError(f"Unknown skill slug in mapping: {slug!r}")
        return self._mapping[slug]


def _hd_from_hit_die(hit_die: str) -> int:
    """Strip leading 'd' from 'd6'/'d8'/'d10' and return the integer."""
    if not hit_die.startswith("d"):
        raise ValueError(f"Unexpected hit_die format: {hit_die!r}")
    return int(hit_die[1:])


def generate_one(yaml_path: Path, mapping_path: Path) -> dict[str, Any]:
    """Read one class YAML and return its Foundry JSON dict.

    `mapping_path` is the path to data/skill-key-mapping.json.
    """
    with open(yaml_path) as fh:
        cls = yaml.safe_load(fh)

    mapper = SkillKeyMapper(mapping_path)
    class_skills = {}
    for slug in cls.get("class_skills", []):
        key = mapper.translate(slug)  # Raises ValueError if slug is not in mapping
        class_skills[key] = True

    uuid = generate_uuid(cls["slug"])

    return {
        "_id": uuid,
        "_key": f"!items!{uuid}",
        "name": cls["name"],
        "type": "class",
        "system": {
            "hd": _hd_from_hit_die(cls["hit_die"]),
            "bab": translate_bab(cls["bab"]),
            "save": {
                "fort": translate_save(cls["saves"]["fort"]),
                "ref": translate_save(cls["saves"]["ref"]),
                "will": translate_save(cls["saves"]["will"]),
            },
            "classSkills": class_skills,
            "defense": cls["defense_progression"],
            "reputation": cls["reputation_progression"],
            "skillPointsPerLevel": cls["skill_points_per_level"],
            "ability": cls["ability"],
            "source": cls["source"],
        },
    }


def generate_and_write(yaml_path: Path, mapping_path: Path, output_dir: Path) -> Path:
    """Generate one class JSON and write it to a file.

    Returns the path to the written file: output_dir/<Class Name>_<UUID>.json
    """
    cls_json = generate_one(yaml_path, mapping_path)

    # Filename format: <Class Name>_<UUID>.json
    filename = f"{cls_json['name']}_{cls_json['_id']}.json"
    output_path = output_dir / filename

    # Write as JSON with 2-space indent for readability
    with open(output_path, "w") as fh:
        json.dump(cls_json, fh, indent=2)

    return output_path


def parse_args(args: list[str] | None = None) -> argparse.Namespace:
    """Parse command-line arguments."""
    parser = argparse.ArgumentParser(
        description="Generate Foundry PF1e class JSON from Kaihou vault YAML."
    )
    parser.add_argument(
        "--vault-path",
        type=Path,
        default=DEFAULT_VAULT_PATH,
        help=f"Path to Kaihou vault root (default: {DEFAULT_VAULT_PATH})",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=None,
        help="Output directory for generated JSON (default: repo's packs/_source/classes-basic/)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Parse and validate YAML without writing files",
    )

    parsed = parser.parse_args(args)

    # Set default output dir if not specified
    if parsed.output_dir is None:
        repo_root = Path(__file__).resolve().parent.parent
        parsed.output_dir = repo_root / "packs" / "_source" / "classes-basic"

    return parsed


def main(
    vault_path: Path | None = None,
    output_dir: Path | None = None,
    dry_run: bool = False,
) -> int:
    """Main entry point: generate all 6 base classes from vault YAML.

    Args:
        vault_path: Path to Kaihou vault root
        output_dir: Output directory for generated JSON
        dry_run: If True, parse and validate without writing

    Returns:
        0 on success, 1 on failure
    """
    if vault_path is None:
        vault_path = DEFAULT_VAULT_PATH
    if output_dir is None:
        repo_root = Path(__file__).resolve().parent.parent
        output_dir = repo_root / "packs" / "_source" / "classes-basic"

    # Find all base class YAML files
    classes_dir = vault_path / "Mechanics" / "Character_Options" / "Classes" / "Basic"
    yaml_files = sorted(classes_dir.glob("*.yaml"))

    if not yaml_files:
        print(f"Error: No YAML files found in {classes_dir}", file=sys.stderr)
        return 1

    # Path to mapping
    repo_root = Path(__file__).resolve().parent.parent
    mapping_path = repo_root / "data" / "skill-key-mapping.json"

    if not mapping_path.exists():
        print(f"Error: Mapping file not found at {mapping_path}", file=sys.stderr)
        return 1

    print(f"Generating {len(yaml_files)} base classes from {vault_path}...")

    for yaml_file in yaml_files:
        try:
            if dry_run:
                # Just validate by loading
                generate_one(yaml_file, mapping_path)
                print(f"✓ {yaml_file.stem} (validated)")
            else:
                output_path = generate_and_write(yaml_file, mapping_path, output_dir)
                print(f"✓ {output_path.name}")
        except Exception as e:
            print(f"✗ {yaml_file.stem}: {e}", file=sys.stderr)
            return 1

    print(f"Done. Generated {len(yaml_files)} class JSON files.")
    return 0


if __name__ == "__main__":
    parsed = parse_args()
    sys.exit(main(
        vault_path=parsed.vault_path,
        output_dir=parsed.output_dir,
        dry_run=parsed.dry_run,
    ))
