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


def translate_bab(vault_bab: str) -> str:
    """Vault `low/mid/high` -> Foundry PF1e `low/med/high`."""
    try:
        return _BAB_MAP[vault_bab]
    except KeyError as e:
        raise ValueError(f"Unknown BAB value: {vault_bab!r}") from e


def _hd_from_hit_die(hit_die: str) -> int:
    """Strip leading 'd' from 'd6'/'d8'/'d10' and return the integer."""
    if not hit_die.startswith("d"):
        raise ValueError(f"Unexpected hit_die format: {hit_die!r}")
    return int(hit_die[1:])


def generate_one(yaml_path: Path, mapping_path: Path) -> dict[str, Any]:
    """Read one class YAML and return its Foundry JSON dict.

    `mapping_path` is the path to data/skill-key-mapping.json. Currently
    unused by this minimal implementation; later tasks add field translations
    that consume it.
    """
    with open(yaml_path) as fh:
        cls = yaml.safe_load(fh)
    return {
        "name": cls["name"],
        "type": "class",
        "system": {
            "hd": _hd_from_hit_die(cls["hit_die"]),
            "bab": translate_bab(cls["bab"]),
        },
    }


if __name__ == "__main__":
    raise SystemExit("CLI not yet implemented; see Task 13.")
