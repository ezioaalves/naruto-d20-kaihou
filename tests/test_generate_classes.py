"""Tests for scripts/generate-classes.py."""
import json
from pathlib import Path

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
