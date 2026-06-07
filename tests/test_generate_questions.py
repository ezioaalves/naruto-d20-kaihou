"""TDD test suite for scripts/generate-questions.py.

Mirrors tests/test_generate_villages.py — the generator follows the
same vault-YAML -> PF1e trait JSON pattern as D2.2's villages generator.
"""
from __future__ import annotations

import importlib.util
import sys
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parent.parent
GENERATOR_PATH = REPO_ROOT / "scripts" / "generate-questions.py"
MAPPING_PATH = REPO_ROOT / "data" / "skill-key-mapping.json"
FIXTURE_PATH = REPO_ROOT / "tests" / "fixtures" / "synthetic_question.yaml"

if not GENERATOR_PATH.exists():
    raise FileNotFoundError(f"Generator not found at {GENERATOR_PATH}")

spec = importlib.util.spec_from_file_location("generate_questions", GENERATOR_PATH)
generate_questions = importlib.util.module_from_spec(spec)
sys.modules["generate_questions"] = generate_questions
spec.loader.exec_module(generate_questions)


def test_generate_one_basic_shape():
    data = generate_questions.generate_one(FIXTURE_PATH, MAPPING_PATH)
    assert data["name"] == "Test Question Item"
    assert data["type"] == "feat"
    assert data["system"]["subType"] == "trait"
    assert len(data["_id"]) == 16


def test_has_foundry_leveldb_key():
    # Foundry CLI silently drops entries missing _key during pack compilation.
    # Must be "!items!<_id>" for items to land in LevelDB.
    data = generate_questions.generate_one(FIXTURE_PATH, MAPPING_PATH)
    assert data["_key"] == f"!items!{data['_id']}"


@pytest.mark.parametrize("element", ["fire", "water", "earth", "wind", "lightning"])
def test_affinity_kind_sets_flag(tmp_path, element):
    fp = tmp_path / "q.yaml"
    fp.write_text(
        f"name: V\nslug: v-{element}\nminor_benefit:\n  kind: affinity\n  value: {element}\n"
        f"tags: []\n"
    )
    data = generate_questions.generate_one(fp, MAPPING_PATH)
    assert data["system"]["flags"]["dictionary"]["affinity"] == element


def test_invalid_affinity_raises(tmp_path):
    fp = tmp_path / "q.yaml"
    fp.write_text(
        "name: V\nslug: v-plasma\nminor_benefit:\n  kind: affinity\n  value: plasma\n"
        "tags: []\n"
    )
    with pytest.raises(ValueError, match="plasma"):
        generate_questions.generate_one(fp, MAPPING_PATH)
