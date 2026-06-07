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


def test_class_skills_translated_to_pf1e_keys():
    data = generate_villages.generate_one(FIXTURE_PATH, MAPPING_PATH)
    # fixture uses acrobatics + knowledge-history → acr + khi
    assert data["system"]["classSkills"] == {"acr": True, "khi": True}


def test_unknown_skill_slug_raises():
    bad_yaml = FIXTURE_PATH.parent / "synthetic_village_bad.yaml"
    bad_yaml.write_text(
        "name: Bad\nslug: bad\nminor_benefit:\n  kind: hp\n  value: 1\n"
        "class_skills:\n  - not-a-real-skill\ntags: []\n"
    )
    try:
        with pytest.raises(ValueError, match="not-a-real-skill"):
            generate_villages.generate_one(bad_yaml, MAPPING_PATH)
    finally:
        bad_yaml.unlink()


def _make_fixture(tmp_path: Path, kind: str, value: int = 1) -> Path:
    fp = tmp_path / "v.yaml"
    fp.write_text(
        f"name: V\nslug: v\nminor_benefit:\n  kind: {kind}\n  value: {value}\n"
        f"class_skills: []\ntags: []\n"
    )
    return fp


def test_minor_benefit_hp(tmp_path):
    fp = _make_fixture(tmp_path, "hp", 2)
    data = generate_villages.generate_one(fp, MAPPING_PATH)
    changes = data["system"]["changes"]
    assert any(c["target"] == "mhp" and c["formula"] == "2" and c["operator"] == "add" for c in changes)


def test_minor_benefit_init(tmp_path):
    fp = _make_fixture(tmp_path, "init", 1)
    data = generate_villages.generate_one(fp, MAPPING_PATH)
    assert any(c["target"] == "init" and c["formula"] == "1" for c in data["system"]["changes"])


@pytest.mark.parametrize("kind,target", [("will", "saves.will"), ("fort", "saves.fort"), ("ref", "saves.ref")])
def test_minor_benefit_saves(tmp_path, kind, target):
    fp = _make_fixture(tmp_path, kind, 1)
    data = generate_villages.generate_one(fp, MAPPING_PATH)
    assert any(c["target"] == target and c["formula"] == "1" for c in data["system"]["changes"])


def test_minor_benefit_action_point(tmp_path):
    fp = _make_fixture(tmp_path, "action_point", 1)
    data = generate_villages.generate_one(fp, MAPPING_PATH)
    flags = data["system"].get("flags", {}).get("dictionary", {})
    assert flags.get("actionPoints") == 1


def test_minor_benefit_reputation(tmp_path):
    fp = _make_fixture(tmp_path, "reputation", 1)
    data = generate_villages.generate_one(fp, MAPPING_PATH)
    flags = data["system"].get("flags", {}).get("dictionary", {})
    assert flags.get("reputation") == 1


def test_minor_benefit_point_build_doc_only(tmp_path):
    fp = _make_fixture(tmp_path, "point_build", 2)
    data = generate_villages.generate_one(fp, MAPPING_PATH)
    # No mechanical change for point_build
    assert data["system"].get("changes", []) == []
    # But description should mention the +2 point-buy
    desc = data["system"].get("description", {}).get("value", "")
    assert "+2" in desc and ("point" in desc.lower() or "build" in desc.lower())


def test_deterministic_uuid():
    a = generate_villages.generate_one(FIXTURE_PATH, MAPPING_PATH)
    b = generate_villages.generate_one(FIXTURE_PATH, MAPPING_PATH)
    assert a["_id"] == b["_id"]
    # Specifically: md5("test-village")[:16]
    import hashlib as h
    expected = h.md5(b"test-village").hexdigest()[:16]
    assert a["_id"] == expected


def test_generate_and_write(tmp_path):
    out_path = generate_villages.generate_and_write(FIXTURE_PATH, MAPPING_PATH, tmp_path)
    assert out_path.exists()
    assert out_path.suffix == ".json"
    assert "Test Village" in out_path.name
    import json
    loaded = json.loads(out_path.read_text())
    assert loaded["name"] == "Test Village"
