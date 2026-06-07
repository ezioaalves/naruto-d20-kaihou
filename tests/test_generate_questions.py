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


def test_reputation_kind(tmp_path):
    fp = tmp_path / "q.yaml"
    fp.write_text(
        "name: V\nslug: v-rep\nminor_benefit:\n  kind: reputation\n  value: 1\ntags: []\n"
    )
    data = generate_questions.generate_one(fp, MAPPING_PATH)
    assert data["system"]["flags"]["dictionary"]["reputation"] == 1


def test_action_point_kind_value_2(tmp_path):
    fp = tmp_path / "q.yaml"
    fp.write_text(
        "name: V\nslug: v-ap\nminor_benefit:\n  kind: action_point\n  value: 2\ntags: []\n"
    )
    data = generate_questions.generate_one(fp, MAPPING_PATH)
    assert data["system"]["flags"]["dictionary"]["actionPoints"] == 2


def test_doc_only_kind_has_no_mechanical_effect(tmp_path):
    fp = tmp_path / "q.yaml"
    fp.write_text(
        "name: V\nslug: v-doc\ndescription: |\n  Player picks something at creation.\n"
        "minor_benefit:\n  kind: doc_only\n  value: '+1 of something'\ntags: []\n"
    )
    data = generate_questions.generate_one(fp, MAPPING_PATH)
    # doc_only must NOT produce changes or flags
    assert data["system"].get("changes", []) == []
    assert "flags" not in data["system"]
    # Description survives
    assert "Player picks something" in data["system"]["description"]["value"]


def test_unknown_kind_raises(tmp_path):
    fp = tmp_path / "q.yaml"
    fp.write_text(
        "name: V\nslug: v-bad\nminor_benefit:\n  kind: nonsense\n  value: 1\ntags: []\n"
    )
    with pytest.raises(ValueError, match="nonsense"):
        generate_questions.generate_one(fp, MAPPING_PATH)


def test_img_passed_through_when_present():
    data = generate_questions.generate_one(FIXTURE_PATH, MAPPING_PATH)
    assert data["img"] == "icons/svg/upgrade.svg"


def test_img_absent_when_not_set(tmp_path):
    fp = tmp_path / "q.yaml"
    fp.write_text(
        "name: V\nslug: v-noimg\nminor_benefit:\n  kind: doc_only\n  value: x\ntags: []\n"
    )
    data = generate_questions.generate_one(fp, MAPPING_PATH)
    assert "img" not in data


def test_deterministic_uuid():
    a = generate_questions.generate_one(FIXTURE_PATH, MAPPING_PATH)
    b = generate_questions.generate_one(FIXTURE_PATH, MAPPING_PATH)
    assert a["_id"] == b["_id"]
    import hashlib as h
    expected = h.md5(b"test-question").hexdigest()[:16]
    assert a["_id"] == expected


def test_generate_and_write(tmp_path):
    out_path = generate_questions.generate_and_write(FIXTURE_PATH, MAPPING_PATH, tmp_path)
    assert out_path.exists()
    assert out_path.suffix == ".json"
    assert "Test_Question_Item" in out_path.name
    import json
    loaded = json.loads(out_path.read_text())
    assert loaded["name"] == "Test Question Item"


def test_parse_args_defaults():
    args = generate_questions.parse_args([])
    assert args.dry_run is False
    assert args.vault_path == generate_questions.DEFAULT_VAULT_PATH


def test_parse_args_dry_run():
    args = generate_questions.parse_args(["--dry-run"])
    assert args.dry_run is True
