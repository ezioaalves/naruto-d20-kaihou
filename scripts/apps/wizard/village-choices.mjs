export const NUKENIN_ORIGIN = "4dc6f82ae8e07048";
export const MANTIS_ORIGIN = "f76623ecdf172b6b";

export const VILLAGE_CHOICES = [
  { value: "bc053d4ef2995ea0", name: "Hisuigakure", label: "Hisuigakure (Jade)", frame: "imperial" },
  { value: "033fcee4e14089b8", name: "Houohgakure", label: "Houohgakure (Phoenix)", frame: "phoenix" },
  { value: MANTIS_ORIGIN, name: "Kamakirigakure", label: "Kamakirigakure (Mantis)", frame: "mantis" },
  { value: "ffac9cdf75b27810", name: "Kanigakure", label: "Kanigakure (Crab)", frame: "crab" },
  { value: "021058ee37acb649", name: "Kiringakure", label: "Kiringakure (Kirin)", frame: "kirin" },
  { value: "d93ae7cd1e0ba7e2", name: "Ryuugakure", label: "Ryuugakure (Dragon)", frame: "dragon" },
  { value: "a18ed55e5e90130b", name: "Sasorigakure", label: "Sasorigakure (Scorpion)", frame: "scorpion" },
  { value: "a8318ef3f955ee6f", name: "Shishigakure", label: "Shishigakure (Lion)", frame: "lion" },
  { value: "bf4e2f24f90bb464", name: "Tsurugakure", label: "Tsurugakure (Crane)", frame: "crane" },
  { value: NUKENIN_ORIGIN, name: "Nukenin", label: "Nukenin", frame: "nukenin" },
];

export function villageChoice(item) {
  if (!item) return undefined;
  const source = item._stats?.compendiumSource ?? item.flags?.core?.sourceId;
  const ids = [item._id ?? item.id, source?.split(".").at(-1)];
  const name = item.name?.trim().toLowerCase();
  return VILLAGE_CHOICES.find((choice) => ids.includes(choice.value))
    ?? VILLAGE_CHOICES.find((choice) => name === choice.name.toLowerCase());
}
