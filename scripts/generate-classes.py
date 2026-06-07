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

import json
from pathlib import Path
from typing import Any

import yaml


_BAB_MAP = {"low": "low", "mid": "med", "high": "high"}

# Kaihou house rule: mid-custom formula for saves
_MID_CUSTOM_FORMULA = "floor((2 * @level + 6) / 5)"


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

    return {
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
        },
    }


if __name__ == "__main__":
    raise SystemExit("CLI not yet implemented; see Task 13.")
