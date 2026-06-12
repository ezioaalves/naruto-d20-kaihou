/**
 * Question-feat effects engine.
 *
 * Question feats (generated into the `questions` pack by
 * generators/generate-questions.py) carry their mechanical payload as PF1e
 * dictionary flags — system.flags.dictionary.{reputation, actionPoints,
 * bonusSkillRank} — plus a module marker flags.naruto-d20-kaihou.questionFeat.
 *
 * This engine applies the payload to the hero-stat counters when such a feat
 * lands on an actor (createItem) and reverts it when the feat is removed
 * (deleteItem) — the spec § 5 "effect on acquisition" contract. PF1e's native
 * system.scriptCalls only fire on use/equip, never on acquisition, which is
 * why the trigger is a hook and the payload rides on inspectable dictionary
 * flags. Effects therefore apply identically whether the feat arrives via the
 * wizard or a manual compendium drag, and revert on any deletion path.
 */

import { MODULE_ID } from "./item-grants.mjs";

const REPUTATION_PATH = "flags.naruto-d20.reputation";
const ACTION_POINTS_PATH = "flags.naruto-d20.actionPoints";
const BONUS_SKILL_RANKS_PATH = `flags.${MODULE_ID}.bonusSkillRanks`;

export function effectDeltasFromItem(item) {
  if (!item?.flags?.[MODULE_ID]?.questionFeat) return null;

  const dict = item.system?.flags?.dictionary ?? {};
  const deltas = {
    reputation: Number(dict.reputation ?? 0) || 0,
    actionPoints: Number(dict.actionPoints ?? 0) || 0,
    bonusSkillRanks: Number(dict.bonusSkillRank ?? 0) || 0,
  };
  if (!deltas.reputation && !deltas.actionPoints && !deltas.bonusSkillRanks) return null;
  return deltas;
}

export function buildEffectUpdates(actor, deltas, sign) {
  const updates = {};
  if (deltas.reputation) {
    const current = Number(actor.flags?.["naruto-d20"]?.reputation ?? 0) || 0;
    updates[REPUTATION_PATH] = current + sign * deltas.reputation;
  }
  if (deltas.actionPoints) {
    const current = Number(actor.flags?.["naruto-d20"]?.actionPoints ?? 0) || 0;
    updates[ACTION_POINTS_PATH] = current + sign * deltas.actionPoints;
  }
  if (deltas.bonusSkillRanks) {
    const current = Number(actor.flags?.[MODULE_ID]?.bonusSkillRanks ?? 0) || 0;
    updates[BONUS_SKILL_RANKS_PATH] = current + sign * deltas.bonusSkillRanks;
  }
  return updates;
}

export function registerQuestionFeatEffects() {
  Hooks.on("createItem", async (item, _options, userId) => {
    if (game.user?.id !== userId) return;
    const actor = item.actor ?? (item.parent?.documentName === "Actor" ? item.parent : null);
    if (!actor) return;
    const deltas = effectDeltasFromItem(item);
    if (!deltas) return;
    await actor.update(buildEffectUpdates(actor, deltas, +1));
  });

  Hooks.on("deleteItem", async (item, _options, userId) => {
    if (game.user?.id !== userId) return;
    const actor = item.actor ?? (item.parent?.documentName === "Actor" ? item.parent : null);
    if (!actor) return;
    const deltas = effectDeltasFromItem(item);
    if (!deltas) return;
    await actor.update(buildEffectUpdates(actor, deltas, -1));
  });
}
