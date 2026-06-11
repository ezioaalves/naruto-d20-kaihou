#!/usr/bin/env python3
"""Generate Foundry PF1e trait JSON from Kaihou vault 20-Questions YAML.

Usage:
    python3 scripts/generate-questions.py [--vault-path <abs path>] [--output-dir <path>] [--dry-run]

Reads vault YAML at <vault>/Mechanics/Character_Options/20_Questions/*.yaml
and emits one PF1e trait JSON per item to packs/_source/questions/.

Source of truth: vault YAML. Re-run any time YAML changes; generator is
deterministic (md5(slug)[:16] UUIDs) so re-runs produce byte-identical output.

Mirrors scripts/generate-villages.py — helpers (_change, translate_minor_benefit,
_description_to_html) are copy-pasted rather than extracted to a shared module
per YAGNI. If/when a 3rd generator appears, refactor at that point.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import sys
from pathlib import Path
from typing import Any

import yaml


DEFAULT_VAULT_PATH = Path.home() / "Documents" / "Kaihou (Naruto D20)"
QUESTIONS_SUBPATH = "Mechanics/Character_Options/20_Questions"


def generate_uuid(slug: str) -> str:
    """Generate a deterministic 16-character UUID from a slug using md5."""
    return hashlib.md5(slug.encode("utf-8")).hexdigest()[:16]


def _change(target: str, value: int) -> dict[str, Any]:
    return {
        "_id": hashlib.md5(f"{target}-{value}".encode()).hexdigest()[:8],
        "formula": str(value),
        "target": target,
        "operator": "add",
        "priority": 0,
    }


def translate_minor_benefit(kind: str, value: Any) -> dict[str, Any]:
    """Translate one minor benefit into PF1e item-system additions.

    Returns a dict with 'changes' (list of PF1e change entries), 'flags'
    (system.flags.dictionary updates), and 'description_extra' (HTML
    snippet appended to description for doc-only benefits).
    """
    out: dict[str, Any] = {"changes": [], "flags": {}, "description_extra": ""}

    if kind == "action_point":
        out["flags"]["actionPoints"] = value
    elif kind == "reputation":
        out["flags"]["reputation"] = value
    elif kind == "doc_only":
        # No mechanical effect; the YAML description already carries the manual-application note.
        pass
    else:
        raise ValueError(f"Unknown minor_benefit.kind: {kind!r}")

    return out


def _description_to_html(text: str) -> str:
    """Render a plain-text description (with line breaks) as basic HTML."""
    if not text:
        return ""
    paragraphs = [p.strip() for p in text.strip().split("\n\n") if p.strip()]
    return "".join(f"<p>{p.replace(chr(10), ' ')}</p>" for p in paragraphs)


def generate_one(yaml_path: Path, mapping_path: Path) -> dict[str, Any]:
    """Generate one PF1e trait JSON dict from a question YAML file."""
    with open(yaml_path) as f:
        vault = yaml.safe_load(f)

    benefit = vault["minor_benefit"]
    parts = translate_minor_benefit(benefit["kind"], benefit["value"])

    description_html = _description_to_html(vault.get("description", "")) + parts["description_extra"]

    system: dict[str, Any] = {
        "subType": "trait",
        "description": {"value": description_html},
        "tags": vault.get("tags", []),
        "changes": parts["changes"],
    }
    if parts["flags"]:
        system["flags"] = {"dictionary": parts["flags"]}

    uuid = generate_uuid(vault["slug"])
    out: dict[str, Any] = {
        "_id": uuid,
        "_key": f"!items!{uuid}",
        "name": vault["name"],
        "type": "feat",
        "system": system,
    }
    if vault.get("img"):
        out["img"] = vault["img"]
    return out


def generate_and_write(yaml_path: Path, mapping_path: Path, output_dir: Path) -> Path:
    """Generate one question trait and write it to a JSON file.

    Filename follows pattern: <Name>_<UUID>.json.
    Returns the Path to the written file.
    """
    data = generate_one(yaml_path, mapping_path)
    output_dir.mkdir(parents=True, exist_ok=True)
    name_safe = data["name"].replace(" ", "_")
    out_path = output_dir / f"{name_safe}_{data['_id']}.json"
    out_path.write_text(json.dumps(data, indent=2) + "\n")
    return out_path


def parse_args(args: list[str]) -> argparse.Namespace:
    """Parse command-line arguments."""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--vault-path", type=Path, default=DEFAULT_VAULT_PATH,
        help=f"Path to vault (default: {DEFAULT_VAULT_PATH})",
    )
    parser.add_argument(
        "--output-dir", type=Path,
        default=Path(__file__).resolve().parent.parent / "packs" / "_source" / "questions",
        help="Where to write generated JSON",
    )
    parser.add_argument(
        "--dry-run", action="store_true",
        help="Print what would be generated, don't write files",
    )
    return parser.parse_args(args)


def main(vault_path: Path, output_dir: Path, dry_run: bool) -> int:
    """Generate question trait JSON files from vault YAML.

    Returns 0 on success, 1 on error.
    """
    questions_dir = vault_path / QUESTIONS_SUBPATH
    mapping_path = Path(__file__).resolve().parent.parent / "data" / "skill-key-mapping.json"

    yaml_files = sorted(questions_dir.glob("*.yaml"))
    if not yaml_files:
        print(f"Error: No YAML files found in {questions_dir}", file=sys.stderr)
        return 1

    print(f"{'Would generate' if dry_run else 'Generating'} {len(yaml_files)} questions from {vault_path}...")
    for yp in yaml_files:
        try:
            if dry_run:
                data = generate_one(yp, mapping_path)
                print(f"  ✓ {data['name']}_{data['_id']}.json")
            else:
                op = generate_and_write(yp, mapping_path, output_dir)
                print(f"  ✓ {op.name}")
        except Exception as e:
            print(f"  ✗ {yp.name}: {e}", file=sys.stderr)
            return 1
    print(f"Done. {'Would generate' if dry_run else 'Generated'} {len(yaml_files)} question JSON files.")
    return 0


if __name__ == "__main__":
    args = parse_args(sys.argv[1:])
    sys.exit(main(args.vault_path, args.output_dir, args.dry_run))
