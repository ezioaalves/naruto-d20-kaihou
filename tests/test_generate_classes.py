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


def test_deterministic_uuid_generation():
    """UUID is deterministic from slug: test-ninja -> same UUID every time."""
    uuid1 = generate_classes.generate_uuid("test-ninja")
    uuid2 = generate_classes.generate_uuid("test-ninja")
    assert uuid1 == uuid2
    # UUID should be 16 hex chars
    assert len(uuid1) == 16
    assert all(c in "0123456789abcdef" for c in uuid1)


def test_uuid_from_different_slugs_differs():
    """Different slugs produce different UUIDs."""
    uuid_test = generate_classes.generate_uuid("test-ninja")
    uuid_strong = generate_classes.generate_uuid("strong-ninja")
    assert uuid_test != uuid_strong


def test_generate_one_includes_id():
    """Generated class JSON includes _id field with deterministic UUID."""
    yaml_path = FIXTURES_DIR / "synthetic_class.yaml"
    mapping_path = Path(__file__).resolve().parent.parent / "data" / "skill-key-mapping.json"
    out = generate_classes.generate_one(yaml_path, mapping_path)
    # synthetic_class.yaml has slug: test-ninja
    expected_uuid = generate_classes.generate_uuid("test-ninja")
    assert out["_id"] == expected_uuid


def test_write_class_json_creates_file(tmp_path):
    """generate_and_write creates a JSON file in the output directory."""
    yaml_path = FIXTURES_DIR / "synthetic_class.yaml"
    mapping_path = Path(__file__).resolve().parent.parent / "data" / "skill-key-mapping.json"
    output_dir = tmp_path / "output"
    output_dir.mkdir()

    result_path = generate_classes.generate_and_write(yaml_path, mapping_path, output_dir)

    # File should exist and be valid JSON
    assert result_path.exists()
    assert result_path.suffix == ".json"
    assert "_" in result_path.stem  # Format: <Name>_<UUID>

    with open(result_path) as fh:
        data = json.load(fh)
    assert data["name"] == "Test Ninja"
    assert data["type"] == "class"


def test_cli_args_parsing_defaults():
    """CLI parser has sensible defaults: vault defaults to ../Kaihou (Naruto D20), output to packs/_source."""
    args = generate_classes.parse_args([])
    assert "Kaihou (Naruto D20)" in str(args.vault_path)
    assert "packs/_source" in str(args.output_dir)
    assert args.dry_run == False


def test_cli_args_parsing_custom_paths():
    """CLI parser accepts custom --vault-path and --output-dir."""
    args = generate_classes.parse_args(["--vault-path", "/custom/vault", "--output-dir", "/tmp/out"])
    assert args.vault_path == Path("/custom/vault")
    assert args.output_dir == Path("/tmp/out")


def test_cli_args_dry_run_flag():
    """CLI parser accepts --dry-run flag."""
    args = generate_classes.parse_args(["--dry-run"])
    assert args.dry_run == True


def test_main_function_exists():
    """main() function exists and is callable."""
    assert callable(generate_classes.main)


def test_has_foundry_leveldb_key():
    # Foundry CLI silently drops entries missing _key during pack compilation.
    # Must be "!items!<_id>" for items to land in LevelDB.
    yaml_path = FIXTURES_DIR / "synthetic_class.yaml"
    mapping_path = Path(__file__).resolve().parent.parent / "data" / "skill-key-mapping.json"
    cls = generate_classes.generate_one(yaml_path, mapping_path)
    assert cls["_key"] == f"!items!{cls['_id']}"
