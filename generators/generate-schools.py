#!/usr/bin/env python3
"""Generate Foundry PF1e trait JSON from Kaihou school catalog YAML.

Usage:
    python3 scripts/generate-schools.py [--vault-path <abs path>] [--catalog <path>] [--output-dir <path>] [--dry-run]

Reads the canonical catalog at
<vault>/Mechanics/Character_Options/Schools/schools.yaml and emits one PF1e
trait JSON per active school to packs/_source/schools/.
"""
from __future__ import annotations

import argparse
import hashlib
import html
import json
import re
import sys
from pathlib import Path
from typing import Any

import yaml


DEFAULT_VAULT_PATH = Path.home() / "Documents" / "Kaihou (Naruto D20)"
SCHOOLS_SUBPATH = "Mechanics/Character_Options/Schools/schools.yaml"
ZEN_ICON_BASE = "modules/naruto-d20-zen-theme/assets/icons"
VILLAGE_ICONS = {
    "Houohgakure": f"{ZEN_ICON_BASE}/clans/phoenix.svg",
    "Kanigakure": f"{ZEN_ICON_BASE}/clans/crab.svg",
    "Kiringakure": f"{ZEN_ICON_BASE}/clans/unicorn.svg",
    "Ryuugakure": f"{ZEN_ICON_BASE}/clans/dragon.svg",
    "Sasorigakure": f"{ZEN_ICON_BASE}/clans/scorpion.svg",
    "Shishigakure": f"{ZEN_ICON_BASE}/clans/lion.svg",
    "Tsurugakure": f"{ZEN_ICON_BASE}/clans/crane.svg",
}


def generate_uuid(slug: str) -> str:
    """Generate a deterministic 16-character UUID from a slug using md5."""
    return hashlib.md5(slug.encode("utf-8")).hexdigest()[:16]


def default_icon(school: dict[str, Any]) -> str:
    """Pick a stable icon from the local zen theme assets."""
    if school.get("village") in VILLAGE_ICONS:
        return VILLAGE_ICONS[school["village"]]
    if "Ronin" in school.get("tags", []):
        return f"{ZEN_ICON_BASE}/clans/ronin.svg"
    if "Puppeteer" in school.get("tags", []):
        return f"{ZEN_ICON_BASE}/items/technique.svg"
    return f"{ZEN_ICON_BASE}/items/advancement.svg"


def _description_to_html(school: dict[str, Any]) -> str:
    """Render a school package as compact item description HTML."""
    lines = [
        f"<p><b>Focus:</b> {html.escape(school['focus'])}</p>",
        f"<p>{html.escape(school['description'])}</p>",
        f"<p><b>Village:</b> {html.escape(str(school.get('village') or 'Generic'))}</p>",
        f"<p><b>Clan:</b> {html.escape(str(school.get('clan') or 'None'))}</p>",
        f"<p><b>Bonus Feat:</b> {html.escape(school['bonus_feat']['name'])}</p>",
        "<p><b>Starting Techniques:</b></p>",
        "<ul>",
    ]
    for technique in school["starting_techniques"]:
        lines.append(f"<li>{html.escape(technique['name'])}</li>")
    lines.append("</ul>")
    return "".join(lines)


def _safe_filename(name: str, uuid: str) -> str:
    safe_name = re.sub(r"[^A-Za-z0-9_-]+", "_", name).strip("_")
    return f"{safe_name}_{uuid}.json"


def validate_school(school: dict[str, Any]) -> None:
    """Validate one school catalog entry before generation."""
    required = [
        "name",
        "slug",
        "status",
        "source_md",
        "focus",
        "description",
        "bonus_feat",
        "starting_techniques",
        "starting_outfit",
        "tags",
    ]
    for field in required:
        if field not in school:
            raise ValueError(f"{school.get('name', '<unnamed>')}: missing {field}")

    if school["status"] not in {"active", "draft", "retired"}:
        raise ValueError(f"{school['name']}: invalid status {school['status']!r}")

    if not re.fullmatch(r"[a-z0-9-]+", school["slug"]):
        raise ValueError(f"{school['name']}: slug must be kebab-case")

    if not isinstance(school["bonus_feat"], dict) or not school["bonus_feat"].get("name"):
        raise ValueError(f"{school['name']}: bonus_feat.name is required")

    techniques = school["starting_techniques"]
    if not isinstance(techniques, list) or len(techniques) != 3:
        raise ValueError(f"{school['name']}: exactly 3 starting_techniques required")
    for technique in techniques:
        if not isinstance(technique, dict) or not technique.get("name"):
            raise ValueError(f"{school['name']}: each starting technique needs a name")


def load_catalog(catalog_path: Path) -> list[dict[str, Any]]:
    """Load and validate the school catalog."""
    with open(catalog_path, encoding="utf-8") as f:
        data = yaml.safe_load(f)
    schools = data.get("schools", [])
    if not isinstance(schools, list) or not schools:
        raise ValueError(f"No schools found in {catalog_path}")
    for school in schools:
        validate_school(school)
    return schools


def generate_one(school: dict[str, Any]) -> dict[str, Any]:
    """Generate one PF1e trait JSON dict from a school catalog entry."""
    validate_school(school)
    uuid = generate_uuid(school["slug"])
    techniques = [t["name"] for t in school["starting_techniques"]]
    system: dict[str, Any] = {
        "subType": "trait",
        "description": {"value": _description_to_html(school)},
        "tags": school.get("tags", []),
        "changes": [],
    }
    out: dict[str, Any] = {
        "_id": uuid,
        "_key": f"!items!{uuid}",
        "name": school["name"],
        "type": "feat",
        "system": system,
        "img": school.get("img") or default_icon(school),
        "flags": {
            "naruto-d20-kaihou": {
                "school": {
                    "slug": school["slug"],
                    "village": school.get("village"),
                    "clan": school.get("clan"),
                    "legacyName": school.get("legacy_name"),
                    "bonusFeat": school["bonus_feat"]["name"],
                    "startingTechniques": techniques,
                }
            }
        },
    }
    return out


def generate_and_write(catalog_path: Path, output_dir: Path) -> list[Path]:
    """Generate all active school items and write one JSON file per school."""
    schools = load_catalog(catalog_path)
    active = [school for school in schools if school["status"] == "active"]
    output_dir.mkdir(parents=True, exist_ok=True)
    written = []
    for school in active:
        data = generate_one(school)
        out_path = output_dir / _safe_filename(data["name"], data["_id"])
        out_path.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
        written.append(out_path)
    return written


def parse_args(args: list[str]) -> argparse.Namespace:
    """Parse command-line arguments."""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--vault-path",
        type=Path,
        default=DEFAULT_VAULT_PATH,
        help=f"Path to vault (default: {DEFAULT_VAULT_PATH})",
    )
    parser.add_argument(
        "--catalog",
        type=Path,
        default=None,
        help="Path to schools.yaml. Defaults to --vault-path/Mechanics/Character_Options/Schools/schools.yaml",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=Path(__file__).resolve().parent.parent / "packs" / "_source" / "schools",
        help="Where to write generated JSON",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print what would be generated, don't write files",
    )
    return parser.parse_args(args)


def main(vault_path: Path, catalog: Path | None, output_dir: Path, dry_run: bool) -> int:
    """Generate school trait JSON files from the canonical school catalog."""
    catalog_path = catalog or vault_path / SCHOOLS_SUBPATH
    try:
        schools = load_catalog(catalog_path)
        active = [school for school in schools if school["status"] == "active"]
        print(f"{'Would generate' if dry_run else 'Generating'} {len(active)} schools from {catalog_path}...")
        if dry_run:
            for school in active:
                data = generate_one(school)
                print(f"  - {data['name']}_{data['_id']}.json")
        else:
            for path in generate_and_write(catalog_path, output_dir):
                print(f"  - {path.name}")
        print(f"Done. {'Would generate' if dry_run else 'Generated'} {len(active)} school JSON files.")
        return 0
    except Exception as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    args = parse_args(sys.argv[1:])
    sys.exit(main(args.vault_path, args.catalog, args.output_dir, args.dry_run))
