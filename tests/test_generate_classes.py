"""Tests for scripts/generate-classes.py."""
import json
from pathlib import Path

import pytest

from conftest import FIXTURES_DIR  # noqa: F401

# Import the module under test. We use importlib because the script
# filename has a dash, which is not a legal Python identifier.
import importlib.util
_script_path = Path(__file__).resolve().parent.parent / "scripts" / "generate-classes.py"
if not _script_path.exists():
    raise FileNotFoundError(f"Generator script not found: {_script_path}")
_spec = importlib.util.spec_from_file_location(
    "generate_classes",
    _script_path,
)
generate_classes = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(generate_classes)


def test_synthetic_class_basic_fields():
    """Generator reads a YAML and emits a JSON with name + type=class."""
    yaml_path = FIXTURES_DIR / "synthetic_class.yaml"
    mapping_path = Path(__file__).resolve().parent.parent / "data" / "skill-key-mapping.json"
    out = generate_classes.generate_one(yaml_path, mapping_path)
    assert out["name"] == "Test Ninja"
    assert out["type"] == "class"


def test_synthetic_class_hd_and_bab():
    """hit_die `d6` -> system.hd 6; bab `low` -> system.bab `low`."""
    yaml_path = FIXTURES_DIR / "synthetic_class.yaml"
    mapping_path = Path(__file__).resolve().parent.parent / "data" / "skill-key-mapping.json"
    out = generate_classes.generate_one(yaml_path, mapping_path)
    assert out["system"]["hd"] == 6
    assert out["system"]["bab"] == "low"


def test_bab_string_mapping():
    """vault `mid` -> PF1e `med` (Pathfinder uses `med`, not `mid`)."""
    assert generate_classes.translate_bab("low") == "low"
    assert generate_classes.translate_bab("mid") == "med"
    assert generate_classes.translate_bab("high") == "high"


def test_synthetic_class_saves():
    """Saves translate: fort low, ref mid (custom), will high."""
    yaml_path = FIXTURES_DIR / "synthetic_class.yaml"
    mapping_path = Path(__file__).resolve().parent.parent / "data" / "skill-key-mapping.json"
    out = generate_classes.generate_one(yaml_path, mapping_path)
    # synthetic has fort: low, ref: mid, will: high
    assert out["system"]["save"]["fort"]["value"] == "low"
    assert "custom" not in out["system"]["save"]["fort"]
    # mid should have the custom formula
    assert out["system"]["save"]["ref"]["value"] == "low"
    assert out["system"]["save"]["ref"]["custom"] == "floor((2 * @level + 6) / 5)"
    # high should have no custom
    assert out["system"]["save"]["will"]["value"] == "high"
    assert "custom" not in out["system"]["save"]["will"]


def test_save_low_translation():
    """vault `low` -> {value: low}."""
    assert generate_classes.translate_save("low") == {"value": "low"}


def test_save_mid_custom_translation():
    """vault `mid` -> {value: low, custom: mid-custom formula}."""
    result = generate_classes.translate_save("mid")
    assert result["value"] == "low"
    assert result["custom"] == "floor((2 * @level + 6) / 5)"


def test_save_high_translation():
    """vault `high` -> {value: high}."""
    assert generate_classes.translate_save("high") == {"value": "high"}


def test_synthetic_class_skills():
    """Class skills: acrobatics, chakra-control, ninjutsu -> mapped PF1e keys."""
    yaml_path = FIXTURES_DIR / "synthetic_class.yaml"
    mapping_path = Path(__file__).resolve().parent.parent / "data" / "skill-key-mapping.json"
    out = generate_classes.generate_one(yaml_path, mapping_path)
    # synthetic has 3 skills: acrobatics, chakra-control, ninjutsu
    skills = out["system"]["classSkills"]
    assert skills["acr"] == True
    assert skills["ckc"] == True
    assert skills["nin"] == True
    assert len(skills) == 3


def test_skill_slug_to_key_mapping():
    """Translate skill slug -> PF1e key using the mapping."""
    mapping_path = Path(__file__).resolve().parent.parent / "data" / "skill-key-mapping.json"
    mapper = generate_classes.SkillKeyMapper(mapping_path)
    assert mapper.translate("acrobatics") == "acr"
    assert mapper.translate("chakra-control") == "ckc"
    assert mapper.translate("ninjutsu") == "nin"


def test_missing_skill_mapping_fails_loud():
    """Generator raises ValueError if a slug has no mapping."""
    mapping_path = Path(__file__).resolve().parent.parent / "data" / "skill-key-mapping.json"
    mapper = generate_classes.SkillKeyMapper(mapping_path)
    with pytest.raises(ValueError, match="unknown-skill"):
        mapper.translate("unknown-skill")


def test_synthetic_class_pass_through_fields():
    """Pass-through fields: defense_progression, reputation_progression, skill_points_per_level, ability, source."""
    yaml_path = FIXTURES_DIR / "synthetic_class.yaml"
    mapping_path = Path(__file__).resolve().parent.parent / "data" / "skill-key-mapping.json"
    out = generate_classes.generate_one(yaml_path, mapping_path)
    # synthetic has defense_progression: low, reputation_progression: mid, skill_points_per_level: "4 + Int", ability: int, source: "Test Fixture v1"
    assert out["system"]["defense"] == "low"
    assert out["system"]["reputation"] == "mid"
    assert out["system"]["skillPointsPerLevel"] == "4 + Int"
    assert out["system"]["ability"] == "int"
    assert out["system"]["source"] == "Test Fixture v1"
