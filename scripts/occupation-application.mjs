import {
  FEAT_PACK_IDS,
  MODULE_ID,
  TECHNIQUE_PACK_IDS,
  buildEmbeddedGrantData,
  findCompendiumItemByName,
  linkRowFromDocument,
  normalizeItemName,
} from "./item-grants.mjs";

const OCCUPATION_FLAG = "occupation";
const OCCUPATION_GRANT_FLAG = "occupationGrant";

export function registerOccupationAutoApply() {
  Hooks.on("createItem", async (item, _options, userId) => {
    if (game.user?.id !== userId) return;

    const actor = item.actor ?? (item.parent?.documentName === "Actor" ? item.parent : null);
    if (!actor) return;

    const occupation = item.getFlag?.(MODULE_ID, OCCUPATION_FLAG);
    if (!occupation?.slug) return;

    await applyOccupationFromItem(actor, item, occupation);
  });
}

export function registerOccupationAutoRevert() {
  Hooks.on("deleteItem", async (item, _options, userId) => {
    if (game.user?.id !== userId) return;

    const actor = item.actor ?? (item.parent?.documentName === "Actor" ? item.parent : null);
    if (!actor) return;

    const grant = item.getFlag?.(MODULE_ID, OCCUPATION_GRANT_FLAG);
    if (!grant?.applied) return;

    await revertOccupationFromItem(actor, item, grant);
  });
}

export async function revertOccupationFromItem(actor, occupationItem, grant) {
  const linkedFeats = Array.from(actor.items ?? []).filter((it) => {
    const featGrant = it.getFlag?.(MODULE_ID, OCCUPATION_GRANT_FLAG);
    return featGrant?.sourceOccupationItemId === occupationItem.id && featGrant?.grantKind === "feat";
  });
  const featIds = linkedFeats.map((it) => it.id).filter(Boolean);
  if (featIds.length) {
    await actor.deleteEmbeddedDocuments("Item", featIds);
  }

  const updates = {};
  const wealthBonus = Number(grant.wealthBonus ?? 0) || 0;
  if (wealthBonus) {
    const current = Number(foundry.utils.getProperty(actor, "flags.naruto-d20.wealth") ?? 0) || 0;
    updates["flags.naruto-d20.wealth"] = current - wealthBonus;
  }
  const reputationBonus = Number(grant.reputationBonus ?? 0) || 0;
  if (reputationBonus) {
    const current = Number(foundry.utils.getProperty(actor, "flags.naruto-d20.reputation") ?? 0) || 0;
    updates["flags.naruto-d20.reputation"] = current - reputationBonus;
  }
  if (Object.keys(updates).length) {
    await actor.update(updates);
  }
}

export async function applyOccupationFromItem(actor, occupationItem, occupation) {
  if (occupationItem.getFlag?.(MODULE_ID, `${OCCUPATION_GRANT_FLAG}.applied`)) return;

  const selections = await resolveOccupationSelections(occupationItem, occupation);
  if (!selections) {
    ui.notifications?.warn(`${occupationItem.name}: occupation application was cancelled.`);
    return;
  }

  const selectedFeatDoc = selections.featName
    ? await findCompendiumItemByName(selections.featName, FEAT_PACK_IDS, "feat")
    : null;
  if (selections.featName && !selectedFeatDoc) {
    ui.notifications?.warn(`${occupationItem.name}: could not find feat in compendia: ${selections.featName}`);
  }
  const selectedTechniqueDoc = selections.techniqueName
    ? await findCompendiumItemByName(selections.techniqueName, TECHNIQUE_PACK_IDS)
    : null;
  if (selections.techniqueName && !selectedTechniqueDoc) {
    ui.notifications?.warn(
      `${occupationItem.name}: could not find technique in compendia: ${selections.techniqueName}`,
    );
  }

  // Update the occupation item first so the Details tab (classSkills) and
  // Links tab (supplements) reflect the player's choices. PF1e aggregates
  // occupation.system.classSkills into the actor's class skill set; the
  // supplements list is what we mirror the feat into below for visibility.
  const itemUpdate = buildOccupationItemUpdate(
    occupationItem,
    occupation,
    selections,
    selectedFeatDoc,
    selectedTechniqueDoc,
  );
  await occupationItem.update(itemUpdate);

  // Wealth and reputation are actor-level flags, not item data — apply them
  // directly to the actor (and reversed in the deleteItem hook).
  const plan = planOccupationApplication(actor, occupation);
  await dispatchOccupationPlan(actor, plan);

  // Create the feat on the actor as a PF1e supplement of the occupation item.
  // PF1e does not auto-create supplements when system.links.supplements is
  // updated post-creation, so we materialise it here with flags.pf1.source
  // (PF1e supplement convention) and our occupationGrant back-reference so
  // the deleteItem hook can clean it up when the occupation is removed.
  if (selectedFeatDoc && !actorHasNamedItem(actor, selectedFeatDoc.name)) {
    const featData = buildEmbeddedGrantData(
      selectedFeatDoc,
      `flags.${MODULE_ID}.${OCCUPATION_GRANT_FLAG}`,
      {
        sourceOccupationSlug: occupation.slug,
        sourceOccupationItemId: occupationItem.id,
        grantKind: "feat",
        grantName: selections.featName,
      },
    );
    foundry.utils.setProperty(featData, "flags.pf1.source", selectedFeatDoc.uuid);
    await actor.createEmbeddedDocuments("Item", [featData], { _pf1NoSupplements: true });
  }

  const appliedCount =
    mergedClassSkillKeys(occupation, selections).length +
    (selectedFeatDoc ? 1 : 0) +
    (occupation.wealthBonus ? 1 : 0) +
    (occupation.reputationBonus ? 1 : 0);
  ui.notifications?.info(`${occupationItem.name}: applied ${appliedCount} occupation grant(s).`);
}

export function planOccupationApplication(actor, occupation) {
  const updates = {};

  const wealthBonus = Number(occupation.wealthBonus ?? 0) || 0;
  if (wealthBonus) {
    const current = Number(foundry.utils.getProperty(actor, "flags.naruto-d20.wealth") ?? 0) || 0;
    updates["flags.naruto-d20.wealth"] = current + wealthBonus;
  }

  const reputationBonus = Number(occupation.reputationBonus ?? 0) || 0;
  if (reputationBonus) {
    const current = Number(foundry.utils.getProperty(actor, "flags.naruto-d20.reputation") ?? 0) || 0;
    updates["flags.naruto-d20.reputation"] = current + reputationBonus;
  }

  return { updates, creates: [], deletes: [] };
}

async function dispatchOccupationPlan(actor, plan) {
  if (Object.keys(plan.updates).length) {
    await actor.update(plan.updates);
  }
}

function buildOccupationItemUpdate(occupationItem, occupation, selections, selectedFeatDoc, selectedTechniqueDoc) {
  const classSkills = {};
  for (const key of mergedClassSkillKeys(occupation, selections)) {
    classSkills[key] = true;
  }

  const links = [selectedFeatDoc, selectedTechniqueDoc].filter(Boolean).map((doc) => linkRowFromDocument(doc));
  return {
    "system.classSkills": classSkills,
    "system.links.supplements": links,
    [`flags.${MODULE_ID}.${OCCUPATION_GRANT_FLAG}`]: {
      applied: true,
      sourceOccupationSlug: occupation.slug,
      fixedClassSkillKeys: fixedClassSkillKeys(occupation),
      selectedClassSkillKeys: selections.classSkillKeys,
      selectedFeatName: selections.featName ?? null,
      selectedFeatUuid: selectedFeatDoc?.uuid ?? null,
      selectedTechniqueName: selections.techniqueName ?? null,
      selectedTechniqueUuid: selectedTechniqueDoc?.uuid ?? null,
      wealthBonus: occupation.wealthBonus ?? 0,
      reputationBonus: occupation.reputationBonus ?? 0,
      sourceOccupationItemId: occupationItem.id,
    },
  };
}

async function resolveOccupationSelections(occupationItem, occupation) {
  const classSkillOptions = occupation.classSkillOptions ?? [];
  const skillSelectCount = Number(occupation.skillSelectCount ?? 0) || 0;
  const featOptions = occupation.featOptions ?? [];
  const techniqueOptions = occupation.techniqueOptions ?? [];
  const needsSkillPicker = skillSelectCount > 0;
  const needsFeatPicker = featOptions.length > 1;
  const needsTechniquePicker = techniqueOptions.length > 1;

  if (!needsSkillPicker && !needsFeatPicker && !needsTechniquePicker) {
    return {
      classSkillKeys: [],
      featName: featOptions[0] ?? null,
      techniqueName: techniqueOptions[0] ?? null,
    };
  }

  return promptOccupationSelections(occupationItem, {
    classSkillOptions,
    skillSelectCount,
    featOptions,
    techniqueOptions,
  });
}

function promptOccupationSelections(
  occupationItem,
  { classSkillOptions, skillSelectCount, featOptions, techniqueOptions },
) {
  const content = renderOccupationSelectionContent({
    classSkillOptions,
    skillSelectCount,
    featOptions,
    techniqueOptions,
  });

  return new Promise((resolve) => {
    new Dialog({
      title: `${occupationItem.name}: Select Occupation Grants`,
      content,
      buttons: {
        apply: {
          label: "Apply",
          callback: (html) => {
            const root = html[0] ?? html;
            const selectedSkillKeys = [...root.querySelectorAll("input[name='classSkill']:checked")].map(
              (input) => input.value,
            );
            const selectedFeat = root.querySelector("input[name='featOption']:checked")?.value ?? null;
            const selectedTechnique =
              root.querySelector("input[name='techniqueOption']:checked")?.value ?? null;
            resolve({
              classSkillKeys: selectedSkillKeys,
              featName: selectedFeat ?? featOptions[0] ?? null,
              techniqueName: selectedTechnique ?? techniqueOptions[0] ?? null,
            });
            return true;
          },
        },
        cancel: {
          label: "Cancel",
          callback: () => resolve(null),
        },
      },
      render: (html) => {
        wireOccupationDialogConstraints(html[0] ?? html, {
          skillSelectCount,
          requireFeat: featOptions.length > 1,
          requireTechnique: techniqueOptions.length > 1,
        });
      },
      default: "apply",
      close: () => resolve(null),
    }).render(true);
  });
}

function renderOccupationSelectionContent({ classSkillOptions, skillSelectCount, featOptions, techniqueOptions }) {
  const skillRows = classSkillOptions
    .map((option) => {
      const label = escapeHtml(option.label);
      const key = escapeHtml(option.key);
      return `<label class="kaihou-choice"><input type="checkbox" name="classSkill" value="${key}"> ${label}</label>`;
    })
    .join("");
  const featRows = featOptions
    .map((name, index) => {
      const checked = featOptions.length === 1 || index === 0 ? " checked" : "";
      const value = escapeHtml(name);
      return `<label class="kaihou-choice"><input type="radio" name="featOption" value="${value}"${checked}> ${value}</label>`;
    })
    .join("");
  const techniqueRows = techniqueOptions
    .map((name, index) => {
      const checked = techniqueOptions.length === 1 || index === 0 ? " checked" : "";
      const value = escapeHtml(name);
      return `<label class="kaihou-choice"><input type="radio" name="techniqueOption" value="${value}"${checked}> ${value}</label>`;
    })
    .join("");

  return `
    <form class="kaihou-occupation-selector">
      ${
        skillSelectCount
          ? `<section><h3>Class Skills</h3><p>Select exactly ${skillSelectCount}.</p><div class="kaihou-choice-grid">${skillRows}</div></section>`
          : ""
      }
      ${
        featOptions.length
          ? `<section><h3>Bonus Feat</h3><div class="kaihou-choice-grid">${featRows}</div></section>`
          : ""
      }
      ${
        techniqueOptions.length
          ? `<section><h3>Technique Link</h3><div class="kaihou-choice-grid">${techniqueRows}</div></section>`
          : ""
      }
    </form>
  `;
}

function wireOccupationDialogConstraints(root, { skillSelectCount, requireFeat, requireTechnique }) {
  const skillBoxes = [...root.querySelectorAll("input[name='classSkill']")];
  const featRadios = [...root.querySelectorAll("input[name='featOption']")];
  const techniqueRadios = [...root.querySelectorAll("input[name='techniqueOption']")];

  // Apply button lives in the dialog's footer, sibling to the .dialog-content/.window-content
  const applyButton =
    root.closest(".app")?.querySelector("button[data-button='apply']") ??
    root.parentElement?.querySelector("button[data-button='apply']");

  const refresh = () => {
    const checked = skillBoxes.filter((cb) => cb.checked).length;
    const atLimit = skillSelectCount > 0 && checked >= skillSelectCount;
    for (const cb of skillBoxes) {
      cb.disabled = atLimit && !cb.checked;
      cb.parentElement?.classList.toggle("kaihou-choice-disabled", cb.disabled);
    }

    const skillsOk = skillSelectCount === 0 || checked === skillSelectCount;
    const featOk = !requireFeat || featRadios.some((r) => r.checked);
    const techniqueOk = !requireTechnique || techniqueRadios.some((r) => r.checked);
    if (applyButton) {
      applyButton.disabled = !(skillsOk && featOk && techniqueOk);
    }
  };

  for (const cb of skillBoxes) cb.addEventListener("change", refresh);
  for (const r of featRadios) r.addEventListener("change", refresh);
  for (const r of techniqueRadios) r.addEventListener("change", refresh);
  refresh();
}

function actorHasNamedItem(actor, name) {
  const grantKey = normalizeItemName(name);
  return Array.from(actor.items ?? []).some((item) => normalizeItemName(item.name) === grantKey);
}

function fixedClassSkillKeys(occupation) {
  return (occupation.fixedClassSkills ?? []).map((option) => option.key).filter(Boolean);
}

function mergedClassSkillKeys(occupation, selections) {
  return [...new Set([...fixedClassSkillKeys(occupation), ...(selections?.classSkillKeys ?? [])])];
}

function escapeHtml(value) {
  const div = document.createElement("div");
  div.textContent = String(value ?? "");
  return div.innerHTML;
}
