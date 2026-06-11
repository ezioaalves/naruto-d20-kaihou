"""TDD test suite for scripts/generate-schools.py."""
from __future__ import annotations

import importlib.util
import json
import sys
from pathlib import Path

import pytest


REPO_ROOT = Path(__file__).resolve().parent.parent
GENERATOR_PATH = REPO_ROOT / "generators" / "generate-schools.py"
FIXTURE_PATH = REPO_ROOT / "tests" / "fixtures" / "synthetic_schools.yaml"

if not GENERATOR_PATH.exists():
    raise FileNotFoundError(f"Generator not found at {GENERATOR_PATH}")

spec = importlib.util.spec_from_file_location("generate_schools", GENERATOR_PATH)
generate_schools = importlib.util.module_from_spec(spec)
sys.modules["generate_schools"] = generate_schools
spec.loader.exec_module(generate_schools)


def _active_fixture_school():
    return generate_schools.load_catalog(FIXTURE_PATH)[0]


def test_load_catalog_validates_and_loads_schools():
    schools = generate_schools.load_catalog(FIXTURE_PATH)
    assert len(schools) == 2
    assert schools[0]["name"] == "Test School"


def test_generate_one_basic_shape():
    data = generate_schools.generate_one(_active_fixture_school())
    assert data["name"] == "Test School"
    assert data["type"] == "feat"
    assert data["system"]["subType"] == "trait"
    assert data["system"]["changes"] == []
    assert len(data["_id"]) == 16


def test_has_foundry_leveldb_key():
    data = generate_schools.generate_one(_active_fixture_school())
    assert data["_key"] == f"!items!{data['_id']}"


def test_description_lists_static_package_without_internal_notes():
    data = generate_schools.generate_one(_active_fixture_school())
    desc = data["system"]["description"]["value"]
    assert "Bonus Feat" in desc
    assert "Test Feat" in desc
    assert "Test Technique One" in desc
    assert "Starting Outfit" not in desc
    assert "Application" not in desc
    assert "Legacy Name" not in desc
    assert "Source:" not in desc


def test_img_defaults_to_zen_theme_asset():
    data = generate_schools.generate_one(_active_fixture_school())
    assert data["img"].startswith("modules/naruto-d20-zen-theme/assets/icons/")


def test_known_village_icon_uses_existing_zen_theme_asset():
    school = _active_fixture_school()
    school["village"] = "Houohgakure"
    data = generate_schools.generate_one(school)
    assert data["img"] == "modules/naruto-d20-zen-theme/assets/icons/clans/phoenix.svg"


def test_item_flag_carries_school_payload():
    data = generate_schools.generate_one(_active_fixture_school())
    payload = data["flags"]["naruto-d20-kaihou"]["school"]
    assert payload["slug"] == "test-school"
    assert payload["bonusFeat"] == "Test Feat"
    assert payload["startingTechniques"] == [
        "Test Technique One",
        "Test Technique Two",
        "Test Technique Three",
    ]


def test_exactly_three_techniques_required(tmp_path):
    bad = tmp_path / "bad.yaml"
    bad.write_text(
        """
spec_version: 1
schools:
  - name: Bad School
    slug: bad-school
    status: active
    village: Testgakure
    clan: Test Clan
    source_md: x.md
    focus: Bad
    description: Bad
    bonus_feat: {name: Bad Feat, source_uuid: null}
    starting_techniques:
      - {name: One, source_uuid: null}
      - {name: Two, source_uuid: null}
    starting_outfit: Bad outfit.
    tags: [School]
""",
        encoding="utf-8",
    )
    with pytest.raises(ValueError, match="exactly 3"):
        generate_schools.load_catalog(bad)


def test_generate_and_write_only_active(tmp_path):
    written = generate_schools.generate_and_write(FIXTURE_PATH, tmp_path)
    assert len(written) == 1
    assert written[0].exists()
    loaded = json.loads(written[0].read_text(encoding="utf-8"))
    assert loaded["name"] == "Test School"


def test_deterministic_uuid():
    data = generate_schools.generate_one(_active_fixture_school())
    assert data["_id"] == generate_schools.generate_uuid("test-school")


def test_parse_args_defaults():
    args = generate_schools.parse_args([])
    assert args.dry_run is False
    assert args.vault_path == generate_schools.DEFAULT_VAULT_PATH


def test_parse_args_dry_run():
    args = generate_schools.parse_args(["--dry-run"])
    assert args.dry_run is True
