#!/usr/bin/env python3
"""Generate Foundry PF1e trait JSON from Kaihou occupation markdown files.

Reads every markdown occupation under
<vault>/Mechanics/Character_Options/Occupations/, excluding
Homebrew/Occupation Formula.md, and emits one PF1e trait JSON per occupation to
packs/_source/occupations/ while mirroring the source folder structure.
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
OCCUPATIONS_SUBPATH = "Mechanics/Character_Options/Occupations"
# Occupations migrated to the public "naruto-d20" module are listed here (keyed
# by source category) and skipped during generation so the kaihou pack only
# carries homebrew + not-yet-migrated exclusives. See published-to-public.json.
PUBLISHED_LIST_PATH = Path(__file__).resolve().parent / "published-to-public.json"
# Kaihou bundles its own theme icons (the zen theme was absorbed in v2.0.0);
# never reference the deprecated standalone naruto-d20-zen-theme module here.
ICON_BASE = "modules/naruto-d20-kaihou/assets/theme/icons"
DEFAULT_ICON = f"{ICON_BASE}/items/title.svg"
ALL_SKILLS_TOKEN = "__all__"

OLD_SKILL_SLUGS = {
    "athletics": "acrobatics",
    "balance": "acrobatics",
    "concentration": "chakra-control",
    "decipher-script": "linguistics",
    "demolitions": "craft-explosives",
    "drive": "ride",
    "forgery": "linguistics",
    "gamble": "profession",
    "gather-information": "diplomacy",
    "hide": "stealth",
    "iaijutsu-focus": "taijutsu",
    "investigate": "perception",
    "jump": "acrobatics",
    "listen": "perception",
    "move-silently": "stealth",
    "navigate": "survival",
    "read-language": "linguistics",
    "read-write-language": "linguistics",
    "repair": "craft-mechanics",
    "research": "linguistics",
    "search": "perception",
    "speak-language": "linguistics",
    "spot": "perception",
    "treat-injury": "heal",
    "tumble": "acrobatics",
    "use-computer": "knowledge-engineering",
    "use-rope": "survival",
    "knowledge-arcane-lore": "knowledge-arcana",
    "knowledge-art": "knowledge-history",
    "knowledge-behavioral-science": "sense-motive",
    "knowledge-behavioral-sciences": "sense-motive",
    "knowledge-business": "profession",
    "knowledge-civics": "knowledge-nobility",
    "knowledge-current-events": "knowledge-local",
    "knowledge-earth-and-life-science": "knowledge-nature",
    "knowledge-earth-and-life-sciences": "knowledge-nature",
    "knowledge-geography": "knowledge-local",
    "knowledge-nin-lore": "knowledge-ninja-lore",
    "knowledge-physical-science": "knowledge-engineering",
    "knowledge-physical-sciences": "knowledge-engineering",
    "knowledge-popular-culture": "knowledge-local",
    "knowledge-streetwise": "knowledge-local",
    "knowledge-tactics": "knowledge-arcana",
    "knowledge-technology": "knowledge-engineering",
    "knowledge-the-underworld": "knowledge-religion",
    "knowledge-theology-and-philosophy": "knowledge-religion",
    "knowledge-theology": "knowledge-religion",
    "knowledge-philosophy": "knowledge-religion",
    "craft-mechanical": "craft-mechanics",
    "craft-painting": "craft-calligraphy",
    "craft-puppets": "craft-mechanics",
    "craft-sculpting": "craft-calligraphy",
    "craft-writing": "craft-calligraphy",
    "perform-any": "perform",
    "perform-dance": "perform",
    "perform-singing": "perform",
    "profession-gambler": "profession",
}


def generate_uuid(slug: str) -> str:
    """Generate a deterministic 16-character UUID from a slug using md5."""
    return hashlib.md5(slug.encode("utf-8")).hexdigest()[:16]


def slugify(value: str) -> str:
    """Convert text to a stable kebab-case slug."""
    value = value.strip().lower().replace("&", "and")
    value = re.sub(r"\s+", " ", value)
    value = value.replace("/", " ")
    value = value.replace("(", " ").replace(")", " ")
    return re.sub(r"[^a-z0-9]+", "-", value).strip("-")


class SkillKeyMapper:
    """Translate vault skill slugs to PF1e actor skill keys."""

    def __init__(self, mapping_path: Path):
        with open(mapping_path, encoding="utf-8") as f:
            raw = json.load(f)
        self._mapping = {k: v for k, v in raw.items() if k != "_meta" and not k.startswith("_")}

    def translate(self, slug: str) -> str:
        translated_slug = OLD_SKILL_SLUGS.get(slug, slug)
        if translated_slug not in self._mapping:
            raise ValueError(
                f"Unknown skill slug: {slug!r} -> {translated_slug!r}. "
                "Add it to data/skill-key-mapping.json."
            )
        return self._mapping[translated_slug]

    def all_skill_options(self) -> list[dict[str, str]]:
        options = []
        for slug, key in sorted(self._mapping.items()):
            label = slug.replace("-", " ").title()
            options.append({"label": label, "slug": slug, "key": key})
        return _dedupe_skill_options(options)


def _fix_broken_words(text: str) -> str:
    replacements = {
        "Balanc e": "Balance",
        "Comb at": "Combat",
        "Combat Ma rtial": "Combat Martial",
        "Concen tration": "Concentration",
        "Concentra tion": "Concentration",
        "T aijutsu": "Taijutsu",
        "arou nd": "around",
        "bon us": "bonus",
        "c hallenge": "challenge",
        "charact er": "character",
        "com bat": "combat",
        "eith er": "either",
        "fig hting": "fighting",
        "fo llowing": "following",
        "gra nted": "granted",
        "In timidate": "Intimidate",
        "Improved Ch akra": "Improved Chakra",
        "Improved Tri ck": "Improved Trick",
        "lis ted": "listed",
        "Mind -Affecting": "Mind-Affecting",
        "P oint": "Point",
        "pen alties": "penalties",
        "Res earch": "Research",
        "Ride -By": "Ride-By",
        "Searc h": "Search",
        "sel ects": "selects",
        "Whirlwin d": "Whirlwind",
        "class sk ill": "class skill",
        "co mpetence": "competence",
        "followin g": "following",
        "th e following": "the following",
        "usin g": "using",
    }
    for old, new in replacements.items():
        text = text.replace(old, new)
    return text


def _source_parts(path: Path, occupations_dir: Path) -> tuple[str, str | None, str]:
    rel = path.relative_to(occupations_dir)
    if len(rel.parts) == 1:
        return "Core", None, str(rel)
    if rel.parts[0] == "Community Compendium" and len(rel.parts) > 2:
        return "Community Compendium", rel.parts[1], str(rel)
    return rel.parts[0], None, str(rel)


def _section(text: str, label: str) -> str:
    pattern = rf"\*\*{re.escape(label)}:\*\*(.*?)(?=\n\*\*|(?:\n|^)Feat:|\Z)"
    match = re.search(pattern, text, flags=re.IGNORECASE | re.DOTALL)
    if match:
        return match.group(1).strip()
    if label.lower() == "feat":
        match = re.search(r"(?:^|\n)Feat:\s*(.*?)(?=\n\*\*|\Z)", text, flags=re.I | re.S)
        if match:
            return match.group(1).strip()
    return ""


def _extract_prerequisite(text: str) -> str:
    return _section(text, "Prerequisite").rstrip(".")


def _extract_description(text: str) -> str:
    first_rule = re.search(r"\n\*\*(?:Prerequisite|Skills|Pre-Selected Skills|Feat):", text, re.I)
    preamble = text[: first_rule.start()] if first_rule else text
    preamble = re.sub(r"^\s*#\s+.*$", "", preamble, flags=re.M)
    preamble = re.sub(r"\*\*.*?\(Occupation\)\*\*", "", preamble, flags=re.I | re.S)
    preamble = re.sub(r"\*\*[^*]+:\*\*", "", preamble)
    return re.sub(r"\s+", " ", preamble).strip()


def _choice_count(text: str, default: int = 0) -> int:
    text_l = text.lower()
    words = {"one": 1, "two": 2, "three": 3, "four": 4}
    match = re.search(r"select any(?:\s+of)?\s+(\d+|one|two|three|four)", text_l)
    if not match:
        return default
    token = match.group(1)
    return int(token) if token.isdigit() else words[token]


def _split_top_level(text: str) -> list[str]:
    text = text.replace("\n", ", ")
    out: list[str] = []
    buf = ""
    depth = 0
    for ch in text:
        if ch in "([":
            depth += 1
        elif ch in ")]" and depth > 0:
            depth -= 1
        if ch == "," and depth == 0:
            if buf.strip():
                out.append(buf.strip(" ."))
            buf = ""
        else:
            buf += ch
    if buf.strip():
        out.append(buf.strip(" ."))
    return out


def _split_inner_skill_list(text: str) -> list[str]:
    text = text.replace("&", "and").replace("/", ", ")
    protected = {
        "earth and life sciences": "earth & life sciences",
        "earth and life science": "earth & life science",
        "theology and philosophy": "theology & philosophy",
    }
    for old, new in protected.items():
        text = re.sub(old, new, text, flags=re.I)
    text = re.sub(r"\s+or\s+", ", ", text, flags=re.I)
    text = re.sub(r"\s+and\s+", ", ", text, flags=re.I)
    parts = [p.strip(" .").replace("&", "and") for p in _split_top_level(text) if p.strip(" .")]
    return parts


def _expand_skill_token(token: str) -> list[str]:
    token = re.sub(r"\s+", " ", token.strip(" ."))
    token = re.sub(r"^(and|or)\s+", "", token, flags=re.I)
    token = token.replace("Sleight of Hands", "Sleight of Hand")
    if not token:
        return []
    match = re.match(r"^(Knowledge|Craft|Perform|Profession)\s*\((.*?)\)$", token, flags=re.I)
    if match:
        base = match.group(1).title()
        return [f"{base} ({part})" for part in _split_inner_skill_list(match.group(2))]
    if re.search(r"\s+(and|or)\s+", token, flags=re.I) and "(" not in token:
        return [p.strip() for p in re.split(r"\s+(?:and|or)\s+", token, flags=re.I) if p.strip()]
    return [token]


def _parse_skill_options(block: str, mapper: SkillKeyMapper) -> tuple[int, list[dict[str, str]], str]:
    original = block
    count = _choice_count(block)
    if "Pre-Selected Skills" in block or re.search(r"\d+\s+ranks?", block, flags=re.I):
        return 0, [], original
    if "select any two skills as permanent class skills" in block.lower():
        return count or 2, mapper.all_skill_options(), original

    if ":" in block:
        block = block.split(":", 1)[1]
    block = re.sub(r"If a skill.*$", "", block, flags=re.I | re.S)
    options = []
    for token in _split_top_level(block):
        for label in _expand_skill_token(token):
            label = label.strip(" .")
            if not label:
                continue
            slug = slugify(label)
            key = mapper.translate(slug)
            options.append({"label": label, "slug": OLD_SKILL_SLUGS.get(slug, slug), "key": key})
    return count, _dedupe_skill_options(options), original


def _parse_fixed_skill_options(block: str, mapper: SkillKeyMapper) -> list[dict[str, str]]:
    fixed = []
    for match in re.finditer(
        r"([A-Za-z][^.;:]*)\s+is\s+a\s+permanent class skill",
        block,
        flags=re.I,
    ):
        for label in _expand_skill_token(match.group(1)):
            label = label.strip(" .")
            if not label:
                continue
            slug = slugify(label)
            key = mapper.translate(slug)
            fixed.append({"label": label, "slug": OLD_SKILL_SLUGS.get(slug, slug), "key": key})
    return _dedupe_skill_options(fixed)


def _dedupe_skill_options(options: list[dict[str, str]]) -> list[dict[str, str]]:
    out = []
    seen = set()
    for option in options:
        key = option["key"]
        if key in seen:
            continue
        seen.add(key)
        out.append(option)
    return out


def _parse_options_list(text: str) -> list[str]:
    text = _fix_broken_words(text)
    text = re.sub(r"\s+", " ", text).strip(" .")
    if re.match(r"^Select one of(?: the)? following\b", text, flags=re.I) and ":" in text:
        text = text.split(":", 1)[1].strip()
    text = re.sub(r"^Select one of(?: the)? following(?: feats?| techniques)?\s*:\s*", "", text, flags=re.I)
    text = re.sub(r"^A technician must choose either\s+", "", text, flags=re.I)
    text = re.sub(r"\s+feat at 1st level\.?$", "", text, flags=re.I)
    if " gains the " in text.lower() and " feat" in text.lower():
        match = re.search(r"gains the\s+(.+?)\s+feat", text, flags=re.I)
        if match:
            return [_clean_option_label(match.group(1))]
    text = re.sub(r"\s+or\s+", ", ", text, flags=re.I)
    text = re.sub(r"\s+and\s+", ", ", text, flags=re.I)
    options = []
    for option in _split_top_level(text):
        option = _clean_option_label(option)
        if option:
            options.append(option)
    return _dedupe_strings(options)


def _clean_option_label(option: str) -> str:
    option = _fix_broken_words(option)
    option = re.sub(r"^(and|or|the)\s+", "", option, flags=re.I).strip(" .")
    option = re.sub(r"\s+", " ", option)
    option = re.sub(r"\s+([),.])", r"\1", option)
    option = re.sub(r"([(])\s+", r"\1", option)
    option = re.sub(r",\s*,", ",", option)
    return option.strip()


def _dedupe_strings(values: list[str]) -> list[str]:
    out = []
    seen = set()
    for value in values:
        key = value.lower()
        if key in seen:
            continue
        seen.add(key)
        out.append(value)
    return out


def _extract_int(text: str, label: str) -> int:
    match = re.search(rf"\*\*{re.escape(label)}(?: Increase)?:\*\*\s*([+-]?\d+)", text, re.I)
    return int(match.group(1)) if match else 0


def parse_occupation(path: Path, occupations_dir: Path, mapper: SkillKeyMapper) -> dict[str, Any]:
    """Parse one occupation markdown file into canonical structured data."""
    text = _fix_broken_words(path.read_text(encoding="utf-8"))
    category, subcategory, rel_source = _source_parts(path, occupations_dir)
    name = path.stem.replace("_", " ")
    slug = slugify(rel_source.removesuffix(".md"))
    skill_block = _section(text, "Skills") or _section(text, "Pre-Selected Skills")
    feat_block = _section(text, "Feat") or _section(text, "Pre-Selected Feat")
    technique_block = _section(text, "Techniques")
    fixed_skill_options = _parse_fixed_skill_options(skill_block, mapper)
    skill_select_count, skill_options, skill_text = _parse_skill_options(skill_block, mapper)
    feat_options = _parse_options_list(feat_block)
    technique_options = _parse_options_list(technique_block) if technique_block else []
    return {
        "name": name,
        "slug": slug,
        "status": "active",
        "source_md": f"{OCCUPATIONS_SUBPATH}/{rel_source}",
        "source_category": category,
        "source_subcategory": subcategory,
        "description": _extract_description(text),
        "prerequisite": _extract_prerequisite(text),
        "skill_select_count": skill_select_count,
        "fixed_class_skills": fixed_skill_options,
        "class_skill_options": skill_options,
        "raw_skills": skill_text,
        "feat_select_count": 1 if feat_options else 0,
        "feat_options": [{"name": name, "source_uuid": None} for name in feat_options],
        "technique_options": [{"name": name, "source_uuid": None} for name in technique_options],
        "wealth_bonus": _extract_int(text, "Wealth Bonus"),
        "reputation_bonus": _extract_int(text, "Reputation Bonus"),
        "affiliation": _section(text, "Affiliation"),
        "expertise": _section(text, "Expertise"),
        "tags": [tag for tag in ["Occupation", category, subcategory] if tag],
        "foundry_source": None,
        "house_rules_applied": ["kaihou-occupation-selector"],
        "created": "2026-06-07",
        "updated": "2026-06-07",
    }


def load_published_slugs(list_path: Path = PUBLISHED_LIST_PATH) -> set[tuple[str, str]]:
    """Load the set of (category, slug) pairs migrated to the public naruto-d20 module."""
    if not list_path.exists():
        return set()
    data = json.loads(list_path.read_text(encoding="utf-8"))
    published: set[tuple[str, str]] = set()
    for category, slugs in data.items():
        if category.startswith("_") or not isinstance(slugs, list):
            continue
        for slug in slugs:
            published.add((category, slug))
    return published


def _is_published(path: Path, occupations_dir: Path, published: set[tuple[str, str]]) -> bool:
    category, _subcategory, _rel = _source_parts(path, occupations_dir)
    return (category, slugify(path.stem)) in published


def load_occupations(occupations_dir: Path, mapping_path: Path) -> list[dict[str, Any]]:
    """Load every occupation markdown file under the vault source directory."""
    mapper = SkillKeyMapper(mapping_path)
    published = load_published_slugs()
    files = sorted(
        p for p in occupations_dir.rglob("*.md")
        if p.name != "Occupation Formula.md"
        and not _is_published(p, occupations_dir, published)
    )
    if not files:
        raise ValueError(f"No occupation markdown files found in {occupations_dir}")
    return [parse_occupation(path, occupations_dir, mapper) for path in files]


def _description_to_html(occupation: dict[str, Any]) -> str:
    lines = []
    if occupation["description"]:
        lines.append(f"<p>{html.escape(occupation['description'])}</p>")
    lines.append(f"<p><b>Source:</b> {html.escape(occupation['source_md'])}</p>")
    lines.append(f"<p><b>Category:</b> {html.escape(occupation['source_category'])}</p>")
    if occupation.get("source_subcategory"):
        lines.append(f"<p><b>Folder:</b> {html.escape(occupation['source_subcategory'])}</p>")
    if occupation["prerequisite"]:
        lines.append(f"<p><b>Prerequisite:</b> {html.escape(occupation['prerequisite'])}</p>")
    if occupation.get("fixed_class_skills"):
        fixed_labels = ", ".join(option["label"] for option in occupation["fixed_class_skills"])
        lines.append(f"<p><b>Fixed Class Skills:</b> {html.escape(fixed_labels)}.</p>")
    if occupation["skill_select_count"]:
        labels = ", ".join(option["label"] for option in occupation["class_skill_options"])
        lines.append(
            f"<p><b>Class Skills:</b> Select {occupation['skill_select_count']} from "
            f"{html.escape(labels)}.</p>"
        )
    elif occupation["raw_skills"]:
        lines.append(f"<p><b>Skills:</b> {html.escape(occupation['raw_skills'])}</p>")
    if occupation["feat_options"]:
        feats = ", ".join(feat["name"] for feat in occupation["feat_options"])
        lines.append(f"<p><b>Feat:</b> Select one from {html.escape(feats)}.</p>")
    if occupation["technique_options"]:
        techniques = ", ".join(tech["name"] for tech in occupation["technique_options"])
        lines.append(f"<p><b>Technique Option:</b> {html.escape(techniques)}.</p>")
    if occupation["wealth_bonus"]:
        lines.append(f"<p><b>Wealth Bonus Increase:</b> +{occupation['wealth_bonus']}</p>")
    if occupation["reputation_bonus"]:
        lines.append(f"<p><b>Reputation Bonus Increase:</b> +{occupation['reputation_bonus']}</p>")
    if occupation["affiliation"]:
        lines.append(f"<p><b>Affiliation:</b> {html.escape(occupation['affiliation'])}</p>")
    if occupation["expertise"]:
        lines.append(f"<p><b>Expertise:</b> {html.escape(occupation['expertise'])}</p>")
    return "".join(lines)


def generate_one(occupation: dict[str, Any]) -> dict[str, Any]:
    """Generate one PF1e trait item from canonical occupation data."""
    uuid = generate_uuid(occupation["slug"])
    system = {
        "subType": "trait",
        "description": {"value": _description_to_html(occupation)},
        "tags": occupation.get("tags", []),
        "classSkills": {},
        "changes": [],
        "links": {"supplements": []},
    }
    return {
        "_id": uuid,
        "_key": f"!items!{uuid}",
        "name": occupation["name"],
        "type": "feat",
        "system": system,
        "img": occupation.get("img") or DEFAULT_ICON,
        "flags": {
            "naruto-d20-kaihou": {
                "occupation": {
                    "slug": occupation["slug"],
                    "sourceMd": occupation["source_md"],
                    "sourceCategory": occupation["source_category"],
                    "sourceSubcategory": occupation.get("source_subcategory"),
                    "skillSelectCount": occupation["skill_select_count"],
                    "fixedClassSkills": occupation["fixed_class_skills"],
                    "classSkillOptions": occupation["class_skill_options"],
                    "featSelectCount": occupation["feat_select_count"],
                    "featOptions": [feat["name"] for feat in occupation["feat_options"]],
                    "techniqueOptions": [tech["name"] for tech in occupation["technique_options"]],
                    "wealthBonus": occupation["wealth_bonus"],
                    "reputationBonus": occupation["reputation_bonus"],
                }
            }
        },
    }


def _safe_filename(name: str, uuid: str) -> str:
    safe_name = re.sub(r"[^A-Za-z0-9_-]+", "_", name).strip("_")
    return f"{safe_name}_{uuid}.json"


def _output_subdir(output_dir: Path, occupation: dict[str, Any]) -> Path:
    subdir = output_dir / occupation["source_category"]
    if occupation.get("source_subcategory"):
        subdir = subdir / occupation["source_subcategory"]
    return subdir


def generate_and_write(
    occupations: list[dict[str, Any]],
    output_dir: Path,
    catalog_path: Path | None,
) -> list[Path]:
    """Write generated JSON files and, optionally, a canonical YAML catalog."""
    if output_dir.exists():
        for stale in output_dir.rglob("*.json"):
            stale.unlink()
    written = []
    for occupation in occupations:
        data = generate_one(occupation)
        subdir = _output_subdir(output_dir, occupation)
        subdir.mkdir(parents=True, exist_ok=True)
        out_path = subdir / _safe_filename(data["name"], data["_id"])
        out_path.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
        written.append(out_path)
    if catalog_path:
        catalog_path.write_text(
            yaml.safe_dump(
                {"spec_version": 1, "occupations": occupations},
                sort_keys=False,
                allow_unicode=True,
            ),
            encoding="utf-8",
        )
    return written


def parse_args(args: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--vault-path", type=Path, default=DEFAULT_VAULT_PATH)
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=Path(__file__).resolve().parent.parent / "packs" / "_source" / "occupations",
    )
    parser.add_argument("--catalog", type=Path, default=None)
    parser.add_argument("--no-catalog", action="store_true")
    parser.add_argument("--dry-run", action="store_true")
    return parser.parse_args(args)


def main(vault_path: Path, output_dir: Path, catalog: Path | None, no_catalog: bool, dry_run: bool) -> int:
    occupations_dir = vault_path / OCCUPATIONS_SUBPATH
    mapping_path = Path(__file__).resolve().parent.parent / "data" / "skill-key-mapping.json"
    catalog_path = None if no_catalog else catalog or occupations_dir / "occupations.yaml"
    try:
        occupations = load_occupations(occupations_dir, mapping_path)
        print(
            f"{'Would generate' if dry_run else 'Generating'} "
            f"{len(occupations)} occupations from {occupations_dir}..."
        )
        if dry_run:
            for occupation in occupations:
                data = generate_one(occupation)
                subdir = _output_subdir(output_dir, occupation)
                print(f"  - {subdir.relative_to(output_dir) / _safe_filename(data['name'], data['_id'])}")
        else:
            for path in generate_and_write(occupations, output_dir, catalog_path):
                print(f"  - {path.relative_to(output_dir)}")
            if catalog_path:
                print(f"  - {catalog_path.relative_to(vault_path)}")
        print(f"Done. {'Would generate' if dry_run else 'Generated'} {len(occupations)} occupations.")
        return 0
    except Exception as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    args = parse_args(sys.argv[1:])
    sys.exit(main(args.vault_path, args.output_dir, args.catalog, args.no_catalog, args.dry_run))
