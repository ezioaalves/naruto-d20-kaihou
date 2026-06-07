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


class SkillKeyMapper:
    """Translate vault skill slugs to PF1e 3-letter keys via JSON mapping."""

    def __init__(self, mapping_path: Path):
        with open(mapping_path) as f:
            raw = json.load(f)
        self._mapping = {k: v for k, v in raw.items() if k != "_meta" and not k.startswith("_")}

    def translate(self, slug: str) -> str:
        if slug not in self._mapping:
            raise ValueError(
                f"Unknown skill slug: {slug!r}. Add it to data/skill-key-mapping.json."
            )
        return self._mapping[slug]


def generate_one(yaml_path: Path, mapping_path: Path) -> dict[str, Any]:
    """Generate one PF1e trait JSON dict from a village YAML file."""
    with open(yaml_path) as f:
        vault = yaml.safe_load(f)

    mapper = SkillKeyMapper(mapping_path)
    class_skills = {mapper.translate(slug): True for slug in vault.get("class_skills", [])}

    return {
        "_id": generate_uuid(vault["slug"]),
        "name": vault["name"],
        "type": "feat",
        "system": {
            "subType": "trait",
            "classSkills": class_skills,
        },
    }


if __name__ == "__main__":
    pass  # CLI added in Task 13
