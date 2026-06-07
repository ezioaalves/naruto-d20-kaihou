#!/usr/bin/env python3
"""Generate Foundry PF1e trait JSON from Kaihou vault village YAML.

Usage:
    python3 scripts/generate-villages.py [--vault-path <abs path>] [--output-dir <path>] [--dry-run]

Reads vault YAML at <vault>/Mechanics/Character_Options/Villages/*.yaml
and emits one PF1e trait JSON per village to packs/_source/villages/.

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


DEFAULT_VAULT_PATH = Path.home() / "Documents" / "Kaihou (Naruto D20)"
VILLAGES_SUBPATH = "Mechanics/Character_Options/Villages"


def generate_uuid(slug: str) -> str:
    """Generate a deterministic 16-character UUID from a slug using md5."""
    return hashlib.md5(slug.encode("utf-8")).hexdigest()[:16]


def generate_one(yaml_path: Path, mapping_path: Path) -> dict[str, Any]:
    """Generate one PF1e trait JSON dict from a village YAML file."""
    with open(yaml_path) as f:
        vault = yaml.safe_load(f)

    return {
        "_id": generate_uuid(vault["slug"]),
        "name": vault["name"],
        "type": "feat",
        "system": {
            "subType": "trait",
        },
    }


if __name__ == "__main__":
    pass  # CLI added in Task 13
