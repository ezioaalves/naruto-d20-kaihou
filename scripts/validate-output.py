#!/usr/bin/env python3
"""
Validation script for generated trait JSON files.

Walks every pack-source directory under packs/_source/ and validates each
item against the PF1e trait-item schema.
Usage:
  npm run validate-output
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


def validate_trait_item(data: dict, filename: str) -> tuple[bool, list[str]]:
    """
    Validate a trait item against the PF1e trait schema.

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
    elif data["type"] != "feat":
        errors.append(f"type must be 'feat', got '{data['type']}'")

    if "system" not in data:
        errors.append("missing required field: system")
        return (False, errors)  # Can't validate system without it

    system = data["system"]
    if not isinstance(system, dict):
        errors.append("system must be an object")
        return (False, errors)

    # Validate system.subType
    if "subType" not in system:
        errors.append("missing required field: system.subType")
    elif system["subType"] != "trait":
        errors.append(f"system.subType must be 'trait', got '{system['subType']}'")

    # Validate system.changes (required, must be list)
    if "changes" not in system:
        errors.append("missing required field: system.changes")
    elif not isinstance(system["changes"], list):
        errors.append(
            f"system.changes must be array, got {type(system['changes']).__name__}"
        )

    # Validate system.description (required)
    if "description" not in system:
        errors.append("missing required field: system.description")
    else:
        desc = system["description"]
        if not isinstance(desc, dict):
            errors.append(
                f"system.description must be an object, "
                f"got {type(desc).__name__}"
            )
        elif "value" not in desc:
            errors.append("missing required field: system.description.value")
        elif not isinstance(desc["value"], str):
            errors.append(
                f"system.description.value must be string, "
                f"got {type(desc['value']).__name__}"
            )

    # Validate system.classSkills (optional, but if present must be dict)
    if "classSkills" in system:
        class_skills = system["classSkills"]
        if not isinstance(class_skills, dict):
            errors.append(
                f"system.classSkills must be object or absent, "
                f"got {type(class_skills).__name__}"
            )
        else:
            # Each key should be a 3-letter skill code, each value should be boolean
            for code, enabled in class_skills.items():
                if not isinstance(enabled, bool):
                    errors.append(
                        f"system.classSkills.{code} must be boolean, "
                        f"got {type(enabled).__name__}"
                    )

    return (len(errors) == 0, errors)


def validate_all(verbose: bool = False) -> int:
    """
    Validate all JSON files under packs/_source/*/.

    Args:
        verbose: If True, print all checks for valid files too

    Returns:
        Exit code: 0 if all valid, 1 if any invalid
    """
    # Discover every pack source dir under packs/_source/
    items_to_validate = []
    sources_root = Path("packs/_source")
    if sources_root.is_dir():
        for source_dir in sorted(p for p in sources_root.iterdir() if p.is_dir()):
            items_to_validate.extend(sorted(source_dir.glob("*.json")))

    if not items_to_validate:
        print("No JSON files found in packs/_source/")
        return 0

    all_valid = True

    for json_file in items_to_validate:
        data = load_json(json_file)
        if data is None:
            all_valid = False
            continue

        # Dispatch validation based on item type
        item_type = data.get("type")
        if item_type == "feat" and data.get("system", {}).get("subType") == "trait":
            is_valid, errors = validate_trait_item(data, json_file.name)
        else:
            is_valid, errors = False, [f"Unsupported item type: '{item_type}'"]

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
        print(f"\n✓ All {len(items_to_validate)} files valid.")
        return 0
    else:
        valid_count = sum(1 for f in items_to_validate if load_json(f) is not None)
        print(f"\n✗ {valid_count}/{len(items_to_validate)} files failed validation.")
        return 1


def main():
    """CLI entry point."""
    parser = argparse.ArgumentParser(
        description="Validate generated class and trait JSON files against PF1e schema."
    )
    parser.add_argument(
        "--verbose",
        action="store_true",
        help="Print results for all files, including valid ones",
    )

    args = parser.parse_args()
    exit_code = validate_all(args.verbose)
    sys.exit(exit_code)


if __name__ == "__main__":
    main()
