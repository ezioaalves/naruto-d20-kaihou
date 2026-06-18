"""TDD test suite for scripts/generate-occupations.py."""
from __future__ import annotations

import importlib.util
import json
import sys
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parent.parent
GENERATOR_PATH = REPO_ROOT / "generators" / "generate-occupations.py"
FIXTURE_PATH = REPO_ROOT / "tests" / "fixtures" / "synthetic_occupation.md"
MAPPING_PATH = REPO_ROOT / "data" / "skill-key-mapping.json"

if not GENERATOR_PATH.exists():
    raise FileNotFoundError(f"Generator not found at {GENERATOR_PATH}")

spec = importlib.util.spec_from_file_location("generate_occupations", GENERATOR_PATH)
generate_occupations = importlib.util.module_from_spec(spec)
sys.modules["generate_occupations"] = generate_occupations
spec.loader.exec_module(generate_occupations)


def _fixture_occupation():
    mapper = generate_occupations.SkillKeyMapper(MAPPING_PATH)
    return generate_occupations.parse_occupation(
        FIXTURE_PATH,
        FIXTURE_PATH.parent,
        mapper,
    )


def test_parse_occupation_extracts_choices_and_source():
    occupation = _fixture_occupation()
    assert occupation["name"] == "synthetic occupation"
    assert occupation["source_category"] == "Core"
    assert occupation["skill_select_count"] == 2
    assert occupation["feat_options"] == [
        {"name": "Alertness", "source_uuid": None},
        {"name": "Nin Weapons Proficiency", "source_uuid": None},
    ]
    assert occupation["wealth_bonus"] == 1
    assert occupation["reputation_bonus"] == 1


def test_old_skill_names_translate_to_current_actor_keys():
    occupation = _fixture_occupation()
    options = {option["label"]: option["key"] for option in occupation["class_skill_options"]}
    assert options["Balance"] == "acr"
    assert options["Gather Information"] == "dip"
    assert options["Knowledge (tactics)"] == "kar"
    assert options["Treat Injury"] == "hea"


def test_fixed_class_skill_and_select_any_of_count_are_parsed():
    mapper = generate_occupations.SkillKeyMapper(MAPPING_PATH)
    block = (
        "Perform (dance) is a permanent class skill. Select any of two skills from the list "
        "as permanent class skill: Balance, Taijutsu."
    )
    fixed = generate_occupations._parse_fixed_skill_options(block, mapper)
    count, options, _raw = generate_occupations._parse_skill_options(block, mapper)
    assert fixed == [{"label": "Perform (dance)", "slug": "perform", "key": "prf"}]
    assert count == 2
    assert [option["key"] for option in options] == ["acr", "tai"]


def test_generate_one_uses_trait_item_shape_without_preselecting_all_skills():
    data = generate_occupations.generate_one(_fixture_occupation())
    assert data["type"] == "feat"
    assert data["system"]["subType"] == "trait"
    assert data["system"]["classSkills"] == {}
    assert data["system"]["links"]["supplements"] == []
    assert data["img"].startswith("modules/naruto-d20-kaihou/assets/theme/icons/")


def test_description_notes_source():
    data = generate_occupations.generate_one(_fixture_occupation())
    desc = data["system"]["description"]["value"]
    assert "<b>Source:</b>" in desc
    assert "synthetic_occupation.md" in desc


def test_item_flag_carries_occupation_payload():
    data = generate_occupations.generate_one(_fixture_occupation())
    payload = data["flags"]["naruto-d20-kaihou"]["occupation"]
    assert payload["skillSelectCount"] == 2
    assert payload["featSelectCount"] == 1
    assert payload["featOptions"] == ["Alertness", "Nin Weapons Proficiency"]
    assert payload["wealthBonus"] == 1
    assert payload["reputationBonus"] == 1


def test_generate_and_write_mirrors_source_folder(tmp_path):
    occupation = _fixture_occupation()
    written = generate_occupations.generate_and_write([occupation], tmp_path, None)
    assert len(written) == 1
    assert written[0].parent.name == "Core"
    loaded = json.loads(written[0].read_text(encoding="utf-8"))
    assert loaded["flags"]["naruto-d20-kaihou"]["occupation"]["sourceCategory"] == "Core"


def test_option_parser_strips_sentence_prefixes_and_articles():
    assert generate_occupations._parse_options_list(
        "Select one of the following techniques as bonus technique: Goukakyuu no Jutsu or Chakra no Ito."
    ) == ["Goukakyuu no Jutsu", "Chakra no Ito"]
    assert generate_occupations._parse_options_list(
        "A technician must choose either the Genjutsu Adept or Ninjutsu Adept feat at 1st level."
    ) == ["Genjutsu Adept", "Ninjutsu Adept"]


def test_option_parser_normalizes_broken_source_words():
    assert generate_occupations._parse_options_list(
        "Select one of the fo llowing: Combat Ma rtial Arts, Improved Ch akra Pool, P oint Blank Shot."
    ) == ["Combat Martial Arts", "Improved Chakra Pool", "Point Blank Shot"]
