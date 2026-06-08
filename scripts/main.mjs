const MODULE_ID = "naruto-d20-kaihou";
const SCHOOL_FLAG = "school";
const SCHOOL_GRANT_FLAG = "schoolGrant";

const FEAT_PACK_IDS = ["naruto-d20.feats", "pf1.feats"];
const TECHNIQUE_PACK_IDS = ["naruto-d20.techniques"];

Hooks.once("ready", () => {
  registerSchoolAutoApply();
  console.log(`${MODULE_ID} | school auto-apply ready`);
});

export function registerSchoolAutoApply() {
  Hooks.on("createItem", async (item, _options, userId) => {
    if (game.user?.id !== userId) return;

    const actor = item.actor ?? (item.parent?.documentName === "Actor" ? item.parent : null);
    if (!actor) return;

    const school = item.getFlag?.(MODULE_ID, SCHOOL_FLAG);
    if (!school?.slug) return;

    await applySchoolPackage(actor, item, school);
  });
}

export async function applySchoolPackage(actor, schoolItem, school) {
  const grants = [
    { kind: "feat", name: school.bonusFeat, packIds: FEAT_PACK_IDS, type: "feat" },
    ...(school.startingTechniques ?? []).map((name) => ({
      kind: "technique",
      name,
      packIds: TECHNIQUE_PACK_IDS,
      type: null,
    })),
  ].filter((grant) => grant.name);

  const created = [];
  const missing = [];

  for (const grant of grants) {
    if (actorHasGrant(actor, school.slug, grant.name)) continue;

    const doc = await findCompendiumItemByName(grant.name, grant.packIds, grant.type);
    if (!doc) {
      missing.push(grant.name);
      continue;
    }

    const itemData = doc.toObject();
    delete itemData._id;
    foundry.utils.setProperty(itemData, "flags.core.sourceId", doc.uuid);
    foundry.utils.setProperty(itemData, `flags.${MODULE_ID}.${SCHOOL_GRANT_FLAG}`, {
      sourceSchoolSlug: school.slug,
      sourceSchoolItemId: schoolItem.id,
      grantKind: grant.kind,
      grantName: grant.name,
      sourceUuid: doc.uuid,
    });
    created.push(itemData);
  }

  if (created.length) {
    await actor.createEmbeddedDocuments("Item", created);
  }

  if (missing.length) {
    ui.notifications?.warn(
      `${schoolItem.name}: could not find in compendia: ${missing.join(", ")}`,
    );
  }

  if (created.length) {
    ui.notifications?.info(`${schoolItem.name}: added ${created.length} school grant(s).`);
  }
}

function actorHasGrant(actor, schoolSlug, grantName) {
  const grantKey = normalizeItemName(grantName);
  return actor.items.some((item) => {
    const existingGrant = item.getFlag?.(MODULE_ID, SCHOOL_GRANT_FLAG);
    if (
      existingGrant?.sourceSchoolSlug === schoolSlug &&
      normalizeItemName(existingGrant?.grantName) === grantKey
    ) {
      return true;
    }

    return normalizeItemName(item.name) === grantKey;
  });
}

async function findCompendiumItemByName(name, packIds, type) {
  for (const packId of packIds) {
    const pack = game.packs.get(packId);
    if (!pack) continue;

    const index = await pack.getIndex({ fields: ["name", "type"] });
    const entry = findBestIndexMatch(index, name, type);
    if (!entry) continue;

    return pack.getDocument(entry._id);
  }

  return null;
}

function findBestIndexMatch(index, targetName, type) {
  const target = normalizeItemName(targetName);
  const candidates = [...index].filter((entry) => {
    if (!type) return true;
    return entry.type === type || String(entry.type ?? "").endsWith(`.${type}`);
  });

  return (
    candidates.find((entry) => normalizeItemName(entry.name) === target) ??
    candidates.find((entry) => normalizeItemName(entry.name).includes(target)) ??
    candidates.find((entry) => target.includes(normalizeItemName(entry.name)))
  );
}

function normalizeItemName(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
