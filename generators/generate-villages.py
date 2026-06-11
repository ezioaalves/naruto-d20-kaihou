#!/usr/bin/env python3
"""Generate Foundry PF1e trait JSON from Kaihou vault village YAML.

Usage:
    python3 scripts/generate-villages.py [--vault-path <abs path>] [--output-dir <path>] [--dry-run]

Reads vault YAML at <vault>/Mechanics/Character_Options/Villages/*.yaml
and emits one PF1e trait JSON per village to packs/_source/villages/.

Source of truth: vault YAML. Re-run any time YAML changes; generator is
deterministic (md5(slug)[:16] UUIDs) so re-runs produce byte-identical output.
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
VILLAGES_SUBPATH = "Mechanics/Character_Options/Villages"


def generate_uuid(slug: str) -> str:
    """Generate a deterministic 16-character UUID from a slug using md5."""
    return hashlib.md5(slug.encode("utf-8")).hexdigest()[:16]


class SkillKeyMapper:
    """Translate vault skill slugs to PF1e 3-letter keys via JSON mapping."""

    def __init__(self, mapping_path: Path):
        with open(mapping_path) as f:
            raw = json.load(f)
        self._mapping = {k: v for k, v in raw.items() if k != "_meta" and not k.startswith("_")}

    def translate(self, slug: str) -> str:
        if slug not in self._mapping:
            raise ValueError(
                f"Unknown skill slug: {slug!r}. Add it to data/skill-key-mapping.json."
            )
        return self._mapping[slug]


def _change(target: str, value: int) -> dict[str, Any]:
    """Create a PF1e change entry for a given target and value."""
    return {
        "_id": hashlib.md5(f"{target}-{value}".encode()).hexdigest()[:8],
        "formula": str(value),
        "target": target,
        "operator": "add",
        "priority": 0,
    }


def translate_minor_benefit(kind: str, value: int) -> dict[str, Any]:
    """Translate one minor benefit into PF1e item-system additions.

    Returns a dict with 'changes' (list of PF1e change entries), 'flags'
    (system.flags.dictionary updates), and 'description_extra' (HTML
    snippet appended to description for doc-only benefits).
    """
    out: dict[str, Any] = {"changes": [], "flags": {}, "description_extra": ""}

    if kind == "hp":
        out["changes"].append(_change("mhp", value))
    elif kind == "init":
        out["changes"].append(_change("init", value))
    elif kind == "will":
        out["changes"].append(_change("saves.will", value))
    elif kind == "fort":
        out["changes"].append(_change("saves.fort", value))
    elif kind == "ref":
        out["changes"].append(_change("saves.ref", value))
    elif kind == "action_point":
        out["flags"]["actionPoints"] = value
    elif kind == "reputation":
        out["flags"]["reputation"] = value
    elif kind == "point_build":
        out["description_extra"] = (
            f"<p><b>Point Build:</b> +{value} to point-buy at character creation "
            f"(apply manually; Foundry has no point-buy hook).</p>"
        )
    else:
        raise ValueError(f"Unknown minor_benefit.kind: {kind!r}")

    return out


def _description_to_html(text: str) -> str:
    """Render a plain-text description (with line breaks) as basic HTML."""
    if not text:
        return ""
    # Simple: wrap each paragraph in <p>, preserve line breaks within
    paragraphs = [p.strip() for p in text.strip().split("\n\n") if p.strip()]
    return "".join(f"<p>{p.replace(chr(10), ' ')}</p>" for p in paragraphs)


def generate_one(yaml_path: Path, mapping_path: Path) -> dict[str, Any]:
    """Generate one PF1e trait JSON dict from a village YAML file."""
    with open(yaml_path) as f:
        vault = yaml.safe_load(f)

    mapper = SkillKeyMapper(mapping_path)
    class_skills = {mapper.translate(slug): True for slug in vault.get("class_skills", [])}

    benefit = vault["minor_benefit"]
    parts = translate_minor_benefit(benefit["kind"], benefit["value"])

    description_html = _description_to_html(vault.get("description", "")) + parts["description_extra"]

    system: dict[str, Any] = {
        "subType": "trait",
        "description": {"value": description_html},
        "tags": vault.get("tags", []),
        "classSkills": class_skills,
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
    """Generate one village trait and write it to a JSON file.

    Filename follows pattern: <Name>_<UUID>.json.
    Returns the Path to the written file.
    """
    data = generate_one(yaml_path, mapping_path)
    output_dir.mkdir(parents=True, exist_ok=True)
    out_path = output_dir / f"{data['name']}_{data['_id']}.json"
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
        default=Path(__file__).resolve().parent.parent / "packs" / "_source" / "villages",
        help="Where to write generated JSON",
    )
    parser.add_argument(
        "--dry-run", action="store_true",
        help="Print what would be generated, don't write files",
    )
    return parser.parse_args(args)


def main(vault_path: Path, output_dir: Path, dry_run: bool) -> int:
    """Generate village trait JSON files from vault YAML.

    Returns 0 on success, 1 on error.
    """
    villages_dir = vault_path / VILLAGES_SUBPATH
    mapping_path = Path(__file__).resolve().parent.parent / "data" / "skill-key-mapping.json"

    yaml_files = sorted(villages_dir.glob("*.yaml"))
    if not yaml_files:
        print(f"Error: No YAML files found in {villages_dir}", file=sys.stderr)
        return 1

    print(f"{'Would generate' if dry_run else 'Generating'} {len(yaml_files)} villages from {vault_path}...")
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
    print(f"Done. {'Would generate' if dry_run else 'Generated'} {len(yaml_files)} village JSON files.")
    return 0


if __name__ == "__main__":
    args = parse_args(sys.argv[1:])
    sys.exit(main(args.vault_path, args.output_dir, args.dry_run))
