import {
  FEAT_PACK_IDS,
  MODULE_ID,
  TECHNIQUE_PACK_IDS,
  buildEmbeddedGrantData,
  findCompendiumItemByName,
  linkRowFromDocument,
  normalizeItemName,
} from "./item-grants.mjs";

const SCHOOL_FLAG = "school";
const SCHOOL_GRANT_FLAG = "schoolGrant";

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
  const linkRows = [];

  for (const grant of grants) {
    const doc = await findCompendiumItemByName(grant.name, grant.packIds, grant.type);
    if (!doc) {
      missing.push(grant.name);
      console.warn(`${MODULE_ID} | school grant missing from compendia: ${grant.name}`);
      continue;
    }

    // Always record the link, even if the actor already has a matching item
    // from elsewhere (e.g. a different wizard step) — the school should still
    // show what it grants. Only the embedded-item creation is skipped for dupes.
    linkRows.push(linkRowFromDocument(doc));

    if (actorHasGrant(actor, school.slug, grant.name)) continue;

    const itemData = buildEmbeddedGrantData(
      doc,
      `flags.${MODULE_ID}.${SCHOOL_GRANT_FLAG}`,
      {
        sourceSchoolSlug: school.slug,
        sourceSchoolItemId: schoolItem.id,
        grantKind: grant.kind,
        grantName: grant.name,
      },
    );
    created.push(itemData);
  }

  if (created.length) {
    await actor.createEmbeddedDocuments("Item", created);
  }
  if (linkRows.length) {
    await schoolItem.update({ "system.links.supplements": linkRows });
  }

  if (missing.length) {
    console.warn(`${MODULE_ID} | ${schoolItem.name}: could not find in compendia: ${missing.join(", ")}`);
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
  return Array.from(actor.items ?? []).some((item) => {
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
