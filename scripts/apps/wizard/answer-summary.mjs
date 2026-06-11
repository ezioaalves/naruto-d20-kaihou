/**
 * Biography-panel answer summary — pure (node-testable) projection of an
 * actor's 20 Questions answers: mechanical picks from wizard marker items /
 * flags, narratives from module flags (legacy bio-region parse as fallback).
 */

import { QUESTION_DEFINITIONS, ALL_SKILL_OPTIONS } from "./question-definitions.mjs";
import { getOutcomeByRoll } from "./heritage-table.mjs";
import { parse as parseBiography } from "./biography-renderer.mjs";

const MODULE_ID = "naruto-d20-kaihou";

function itemNameByMarker(actor, markerKey) {
  const item = Array.from(actor.items ?? []).find(
    (i) => i.flags?.[MODULE_ID]?.wizard?.[markerKey] === true
  );
  return item?.name ?? null;
}

function wizardFlag(actor, key) {
  return actor.flags?.[MODULE_ID]?.wizard?.[key] ?? null;
}

function skillLabel(key) {
  return ALL_SKILL_OPTIONS.find((s) => s.value === key)?.label ?? key;
}

function affinityLabel(value) {
  const q4 = QUESTION_DEFINITIONS.find((q) => q.id === "q4");
  return q4?.options?.find((o) => o.value === value)?.label ?? value;
}

function mechanicalSummary(actor, qid) {
  switch (qid) {
    case "q1": return itemNameByMarker(actor, "q1Village");
    case "q2": return itemNameByMarker(actor, "q2OccupationItem");
    case "q3": return itemNameByMarker(actor, "q3School");
    case "q4": {
      const v = actor.flags?.["naruto-d20"]?.chakra?.nature?.primary;
      return v ? affinityLabel(v) : null;
    }
    case "q7": {
      const loyalist = itemNameByMarker(actor, "q7Loyalist");
      if (loyalist) return loyalist;
      const outsider = itemNameByMarker(actor, "q7Outsider");
      if (!outsider) return null;
      const skill = wizardFlag(actor, "q7OutsiderClassSkill");
      return skill ? `${outsider} (${skillLabel(skill)})` : outsider;
    }
    case "q8": return itemNameByMarker(actor, "q8Adherent") ?? itemNameByMarker(actor, "q8Sceptic");
    case "q9": return itemNameByMarker(actor, "q9Level1Feat");
    case "q10": {
      const flaw = itemNameByMarker(actor, "q10Flaw");
      const bonus = itemNameByMarker(actor, "q10BonusFeat");
      if (flaw && bonus) return `${flaw} + ${bonus}`;
      return flaw ?? bonus;
    }
    case "q13": {
      const tech = itemNameByMarker(actor, "q13Mentor");
      if (!tech) return null;
      const skill = wizardFlag(actor, "q13ClassSkill");
      return skill ? `${tech} (${skillLabel(skill)})` : tech;
    }
    case "q16": return itemNameByMarker(actor, "q16RestrictedItem");
    case "q18": {
      const snapshot = wizardFlag(actor, "q18Heritage");
      if (typeof snapshot?.roll !== "number") return null;
      const outcome = getOutcomeByRoll(snapshot.roll);
      return outcome ? `Namesake: ${outcome.name}` : null;
    }
    default: return null;
  }
}

export function buildAnswerRows(actor) {
  const flagNarratives = actor.flags?.[MODULE_ID]?.wizard?.narratives ?? {};
  const hasFlagAnswers = Object.values(flagNarratives).some(
    (v) => typeof v === "string" && v.trim()
  );
  const narratives = hasFlagAnswers
    ? flagNarratives
    : parseBiography(actor.system?.details?.biography?.value ?? "").narratives;

  const rows = [];
  for (const q of QUESTION_DEFINITIONS) {
    const mechanical = mechanicalSummary(actor, q.id);
    const narrative = (narratives?.[q.id] ?? "").trim();
    if (!mechanical && !narrative) continue;
    rows.push({
      qid: q.id,
      label: q.sidebarLabel,
      question: q.questionText,
      mechanical,
      narrative,
    });
  }
  return rows;
}
