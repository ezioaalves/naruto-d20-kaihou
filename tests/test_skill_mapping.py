"""Tests for skill-key-mapping exhaustiveness against vault class YAMLs.

Validates that every class_skills slug in the 6 real vault YAML class files
(Mechanics/Character_Options/Classes/Basic/*.yaml) has a corresponding entry
in data/skill-key-mapping.json.
"""
import json
from pathlib import Path

import pytest
import yaml

from conftest import DEFAULT_VAULT_PATH, VAULT_PATH_ENV
import os


@pytest.fixture
def vault_class_yamls():
    """Return paths to the 6 vault class YAML files.

    Reads from KAIHOU_VAULT_PATH env var if set, else defaults to
    /home/ezioaalves/Documents/Kaihou (Naruto D20).
    """
    vault_path = Path(os.getenv(VAULT_PATH_ENV, DEFAULT_VAULT_PATH))
    classes_dir = vault_path / "Mechanics" / "Character_Options" / "Classes" / "Basic"

    if not classes_dir.exists():
        pytest.skip(f"Vault classes directory not found: {classes_dir}")

    # Collect all .yaml files (should be exactly 6)
    yaml_files = sorted(classes_dir.glob("*.yaml"))
    assert len(yaml_files) == 6, f"Expected 6 class YAML files, found {len(yaml_files)}: {yaml_files}"

    return yaml_files


@pytest.fixture
def skill_mapping():
    """Load and return the skill-key-mapping.json dict."""
    mapping_path = Path(__file__).resolve().parent.parent / "data" / "skill-key-mapping.json"

    if not mapping_path.exists():
        pytest.skip(f"Mapping file not found: {mapping_path}")

    with open(mapping_path) as fh:
        mapping = json.load(fh)

    return mapping


def test_all_vault_class_skills_have_mappings(vault_class_yamls, skill_mapping):
    """Verify every skill slug in vault class YAMLs has a mapping entry.

    For each of the 6 vault class YAML files:
    - Load the YAML
    - Extract the class_skills list (if present)
    - Collect all unique skill slugs
    - Assert each slug exists in skill_mapping keys

    Prints a summary of found skills and their mappings.
    """
    all_skills = set()
    skills_by_class = {}

    for yaml_path in vault_class_yamls:
        with open(yaml_path) as fh:
            class_data = yaml.safe_load(fh)

        class_name = class_data.get("name", yaml_path.stem)
        class_skills = class_data.get("class_skills", [])

        # class_skills is a list of strings (skill slugs)
        if class_skills:
            skills_by_class[class_name] = set(class_skills)
            all_skills.update(class_skills)

    # Verify each skill slug is in the mapping
    unmapped_skills = []
    for skill_slug in sorted(all_skills):
        if skill_slug not in skill_mapping:
            unmapped_skills.append(skill_slug)

    if unmapped_skills:
        pytest.fail(
            f"Found {len(unmapped_skills)} unmapped skill slug(s):\n"
            + "\n".join(f"  - {slug}" for slug in unmapped_skills)
        )

    # Print summary
    print(f"\nFound {len(all_skills)} unique skills across {len(vault_class_yamls)} classes:")
    for class_name in sorted(skills_by_class.keys()):
        print(f"  {class_name}: {len(skills_by_class[class_name])} skills")
    print(f"\nAll {len(all_skills)} skills have mappings in data/skill-key-mapping.json")


def test_mapping_has_minimum_entries(skill_mapping):
    """Sanity check: mapping should have at least 42 entries (excluding _meta)."""
    # Filter out the _meta key
    actual_mappings = {k: v for k, v in skill_mapping.items() if k != "_meta"}
    assert len(actual_mappings) >= 42, (
        f"Expected at least 42 skill mappings, found {len(actual_mappings)}"
    )
