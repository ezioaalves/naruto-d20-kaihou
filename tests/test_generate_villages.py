"""TDD test suite for scripts/generate-villages.py."""
from __future__ import annotations

import importlib.util
import sys
from pathlib import Path

import pytest

# Load the generator (dash-named module) via importlib
REPO_ROOT = Path(__file__).resolve().parent.parent
GENERATOR_PATH = REPO_ROOT / "scripts" / "generate-villages.py"
MAPPING_PATH = REPO_ROOT / "data" / "skill-key-mapping.json"
FIXTURE_PATH = REPO_ROOT / "tests" / "fixtures" / "synthetic_village.yaml"

if not GENERATOR_PATH.exists():
    raise FileNotFoundError(f"Generator not found at {GENERATOR_PATH}")

spec = importlib.util.spec_from_file_location("generate_villages", GENERATOR_PATH)
generate_villages = importlib.util.module_from_spec(spec)
sys.modules["generate_villages"] = generate_villages
spec.loader.exec_module(generate_villages)


def test_generate_one_basic_shape():
    data = generate_villages.generate_one(FIXTURE_PATH, MAPPING_PATH)
    assert data["name"] == "Test Village"
    assert data["type"] == "feat"
    assert data["system"]["subType"] == "trait"
    assert len(data["_id"]) == 16
