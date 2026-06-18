// scripts/sheets/view-model.mjs
//
// Pure actor → databook view-model. No Foundry globals — unit-tested in node.
// Reads PF1e ability/skill data + naruto-d20 nature flags + Kaihou lore flags;
// writes nothing.

const ND = "naruto-d20";
const KH = "naruto-d20-kaihou";

export const ABILITY_AXES = ["str", "dex", "con", "int", "wis", "cha"];

export const DISCIPLINE_AXES = [
  { key: "nin", label: "Ninjutsu",      slug: "Nin",  icon: "ninjutsu"       },
  { key: "fui", label: "Fūinjutsu",     slug: "Fūin", icon: "fuinjutsu"      },
  { key: "ckc", label: "Chakra Control", slug: "C·C",  icon: "chakra_control" },
  { key: "gnj", label: "Genjutsu",      slug: "Gen",  icon: "genjutsu"       },
  { key: "tai", label: "Taijutsu",      slug: "Tai",  icon: "taijutsu"       },
];

export const BASIC_NATURES = [
  { key: "fire", kanji: "火" },
  { key: "water", kanji: "水" },
  { key: "wind", kanji: "風" },
  { key: "earth", kanji: "土" },
  { key: "lightning", kanji: "雷" },
];

export const MISSION_RANKS = ["D", "C", "B", "A", "S"];

// Animal-themed villages → crest basename (assets/theme/icons/villages/<x>.svg).
// Hisuigakure is the capital → imperial mon. Matched by name prefix.
export const VILLAGE_CRESTS = {
  hisui: "imperial",
  houoh: "phoenix",
  kani: "crab",
  kirin: "unicorn",
  ryuu: "dragon",
  sasori: "scorpion",
  shishi: "lion",
  tsuru: "crane",
};

/** Crest basename for a village name, or null if none maps. */
export function villageCrest(villageName) {
  const n = String(villageName ?? "").toLowerCase();
  for (const [key, crest] of Object.entries(VILLAGE_CRESTS)) {
    if (n.startsWith(key)) return crest;
  }
  return null;
}

const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const int = (v) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : 0;
};

function buildMissions(m = {}) {
  const counts = Object.fromEntries(MISSION_RANKS.map((r) => [r, int(m?.[r])]));
  const total = MISSION_RANKS.reduce((s, r) => s + counts[r], 0);
  return { counts, total };
}

function buildResources(sys = {}, nd = {}) {
  const hp = sys.attributes?.hp ?? {};
  const pool = nd?.chakra?.pool ?? {};
  return {
    hp: { value: num(hp.value), max: num(hp.max) },
    ac: num(sys.attributes?.ac?.normal?.total),
    chakra: { value: num(pool.value), max: num(pool.max) },
    level: num(sys.attributes?.hd?.total),
  };
}

function buildNatures(nd = {}, kh = {}) {
  const nature = nd?.chakra?.nature ?? {};
  const owned = new Set(
    [nature.primary, ...(Array.isArray(nature.secondary) ? nature.secondary : [])]
      .filter(Boolean)
      .map((s) => String(s).toLowerCase()),
  );
  const basic = BASIC_NATURES.map((n) => ({ ...n, on: owned.has(n.key) }));
  const adv = kh?.advancedNature ?? null;
  const primary = nature.primary ? String(nature.primary).toLowerCase() : null;
  return {
    basic,
    primary,
    advanced: adv && adv.kanji ? { kanji: adv.kanji, label: adv.label ?? "" } : null,
  };
}

export function buildKaihouViewModel(actor) {
  const sys = actor?.system ?? {};
  const flags = actor?.flags ?? {};
  const kh = flags[KH] ?? {};
  const nd = flags[ND] ?? {};
  return {
    identity: {
      alias: kh.alias ?? "",
      rank: kh.rank ?? kh.allegiance ?? "",
      clan: kh.clan ?? "",
      info: kh.info ?? "",
      missions: buildMissions(kh.missions),
      details: {
        gender: sys.details?.gender ?? "",
        age:    sys.details?.age    ?? "",
        height: sys.details?.height ?? "",
        weight: sys.details?.weight ?? "",
        race:   sys.details?.race   ?? "",
      },
    },
    radars: {
      abilities: ABILITY_AXES.map((k) => ({ key: k, label: k.toUpperCase(), value: num(sys.abilities?.[k]?.total) })),
      disciplines: DISCIPLINE_AXES.map((a) => ({ ...a, value: num(sys.skills?.[a.key]?.rank) })),
    },
    natures: buildNatures(nd, kh),
    resources: buildResources(sys, nd),
  };
}
