#!/usr/bin/env python3
"""
Validation script for generated class JSON files.

Validates all JSON files in a given directory against the PF1e class-item schema.
Usage:
  python3 scripts/validate-output.py [--directory DIR] [--verbose]
"""

import argparse
import json
import sys
from pathlib import Path


def load_json(path: Path) -> dict | None:
    """
    Load and parse a JSON file.

    Args:
        path: Path to JSON file

    Returns:
        Parsed dict on success, None on error
    """
    try:
        with open(path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except json.JSONDecodeError as e:
        print(f"✗ {path.name} (JSON decode error: {e})")
        return None
    except Exception as e:
        print(f"✗ {path.name} (error reading file: {e})")
        return None


def validate_class_item(data: dict, filename: str) -> tuple[bool, list[str]]:
    """
    Validate a class item against the PF1e class schema.

    Args:
        data: Parsed JSON object
        filename: Name of the file (for error reporting)

    Returns:
        Tuple of (is_valid: bool, errors: list of error messages)
    """
    errors = []

    # Check top-level required fields
    if "_id" not in data:
        errors.append("missing required field: _id")
    elif not isinstance(data["_id"], str):
        errors.append("_id must be a string")
    elif len(data["_id"]) != 16 or not all(c in "0123456789abcdef" for c in data["_id"]):
        errors.append(f"_id must be 16-char hex string, got '{data['_id']}'")

    if "name" not in data:
        errors.append("missing required field: name")
    elif not isinstance(data["name"], str):
        errors.append("name must be a string")
    elif not data["name"]:
        errors.append("name must not be empty")

    if "type" not in data:
        errors.append("missing required field: type")
    elif data["type"] != "class":
        errors.append(f"type must be 'class', got '{data['type']}'")

    if "system" not in data:
        errors.append("missing required field: system")
        return (False, errors)  # Can't validate system without it

    system = data["system"]
    if not isinstance(system, dict):
        errors.append("system must be an object")
        return (False, errors)

    # Validate system.hd
    if "hd" not in system:
        errors.append("missing required field: system.hd")
    elif not isinstance(system["hd"], int):
        errors.append(f"system.hd must be integer, got {type(system['hd']).__name__}")
    elif system["hd"] < 4 or system["hd"] > 12:
        errors.append(f"system.hd must be 4-12, got {system['hd']}")

    # Validate system.bab
    if "bab" not in system:
        errors.append("missing required field: system.bab")
    elif system["bab"] not in ["low", "med", "high"]:
        errors.append(f"system.bab must be 'low'|'med'|'high', got '{system['bab']}'")

    # Validate system.save (fort, ref, will)
    if "save" not in system:
        errors.append("missing required field: system.save")
    else:
        save = system["save"]
        if not isinstance(save, dict):
            errors.append("system.save must be an object")
        else:
            for save_type in ["fort", "ref", "will"]:
                if save_type not in save:
                    errors.append(f"missing required field: system.save.{save_type}")
                elif not isinstance(save[save_type], dict):
                    errors.append(f"system.save.{save_type} must be an object")
                else:
                    save_obj = save[save_type]
                    if "value" not in save_obj:
                        errors.append(f"missing required field: system.save.{save_type}.value")
                    elif save_obj["value"] not in ["low", "mid", "high"]:
                        errors.append(
                            f"system.save.{save_type}.value must be 'low'|'mid'|'high', "
                            f"got '{save_obj['value']}'"
                        )
                    if "custom" in save_obj and not isinstance(save_obj["custom"], str):
                        errors.append(
                            f"system.save.{save_type}.custom must be string, "
                            f"got {type(save_obj['custom']).__name__}"
                        )

    # Validate system.classSkills
    if "classSkills" not in system:
        errors.append("missing required field: system.classSkills")
    elif not isinstance(system["classSkills"], dict):
        errors.append("system.classSkills must be an object")
    else:
        # Each key should be a 3-letter skill code, each value should be boolean
        for code, enabled in system["classSkills"].items():
            if not isinstance(enabled, bool):
                errors.append(
                    f"system.classSkills.{code} must be boolean, "
                    f"got {type(enabled).__name__}"
                )

    # Validate system.defense
    if "defense" not in system:
        errors.append("missing required field: system.defense")
    elif system["defense"] not in ["low", "mid", "high"]:
        errors.append(f"system.defense must be 'low'|'mid'|'high', got '{system['defense']}'")

    # Validate system.reputation
    if "reputation" not in system:
        errors.append("missing required field: system.reputation")
    elif system["reputation"] not in ["low", "mid", "high"]:
        errors.append(
            f"system.reputation must be 'low'|'mid'|'high', got '{system['reputation']}'"
        )

    # Validate system.skillPointsPerLevel
    if "skillPointsPerLevel" not in system:
        errors.append("missing required field: system.skillPointsPerLevel")
    elif not isinstance(system["skillPointsPerLevel"], str):
        errors.append(
            f"system.skillPointsPerLevel must be string, "
            f"got {type(system['skillPointsPerLevel']).__name__}"
        )
    elif not system["skillPointsPerLevel"]:
        errors.append("system.skillPointsPerLevel must not be empty")

    # Validate system.ability
    if "ability" not in system:
        errors.append("missing required field: system.ability")
    elif system["ability"] not in ["str", "dex", "con", "int", "wis", "cha"]:
        errors.append(
            f"system.ability must be valid 3-letter ability code, got '{system['ability']}'"
        )

    # Validate system.source (optional, string or null)
    if "source" in system:
        if system["source"] is not None and not isinstance(system["source"], str):
            errors.append(
                f"system.source must be string or null, "
                f"got {type(system['source']).__name__}"
            )

    return (len(errors) == 0, errors)


def validate_all(directory: Path, verbose: bool = False) -> int:
    """
    Validate all JSON files in a directory.

    Args:
        directory: Path to directory containing JSON files
        verbose: If True, print all checks for valid files too

    Returns:
        Exit code: 0 if all valid, 1 if any invalid
    """
    if not directory.exists():
        print(f"Error: directory '{directory}' does not exist", file=sys.stderr)
        return 1

    json_files = sorted(directory.glob("*.json"))
    if not json_files:
        print(f"No JSON files found in {directory}")
        return 0

    all_valid = True

    for json_file in json_files:
        data = load_json(json_file)
        if data is None:
            all_valid = False
            continue

        is_valid, errors = validate_class_item(data, json_file.name)

        if is_valid:
            if verbose:
                print(f"✓ {json_file.name} (valid)")
        else:
            print(f"✗ {json_file.name} (invalid)")
            for error in errors:
                print(f"  - {error}")
            all_valid = False

    # Summary
    if all_valid:
        print(f"\nAll {len(json_files)} files valid.")
        return 0
    else:
        invalid_count = len([f for f in json_files if load_json(f) is not None])
        print(f"\n{invalid_count}/{len(json_files)} files failed validation.")
        return 1


def main():
    """CLI entry point."""
    parser = argparse.ArgumentParser(
        description="Validate generated class JSON files against PF1e schema."
    )
    parser.add_argument(
        "--directory",
        type=Path,
        default=Path("packs/_source/classes-basic"),
        help="Directory containing JSON files to validate (default: packs/_source/classes-basic/)",
    )
    parser.add_argument(
        "--verbose",
        action="store_true",
        help="Print results for all files, including valid ones",
    )

    args = parser.parse_args()
    exit_code = validate_all(args.directory, args.verbose)
    sys.exit(exit_code)


if __name__ == "__main__":
    main()
