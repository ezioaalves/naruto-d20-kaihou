/**
 * Heritage table for D2.3b wizard.
 * Data sourced from Mechanics/Character_Options/20_Questions/Namesake_Heritage.md
 */

export const HERITAGE_OUTCOMES = [
  {
    roll: 1,
    name: "Famous Deed",
    modifier: "+1 Reputation",
    otherEffects:
      "Roll a ten-sided die again and add the resulting family heirloom to your starting items (1–3: a weapon, 4–6: a set of armor, 7–8: another item, 9: a vehicle, 10: a boat or estate). The item should be worth less than 15.",
  },
  {
    roll: 2,
    name: "Glorious Sacrifice",
    modifier: "+2 Action Points, +2 Reputation",
    otherEffects:
      "Roll a ten-sided die again to determine your lost family heirloom (1–3: a weapon, 4–6: a set of armor, 7–8: another item, 9: a vehicle, 10: a boat or estate), which exists somewhere in the world.",
  },
  {
    roll: 3,
    name: "Wondrous Work",
    modifier: "+2 Reputation",
    otherEffects:
      "Perform is a class skill. Choose any peform skill that you are not trained and add a rank to it.",
  },
  {
    roll: 4,
    name: "Dynasty Builder",
    modifier: "-1 Reputation",
    otherEffects:
      "Roll a four-sided die to determine a social skill (1: Diplomacy, 2: Bluff, 3: intimidate, 4: Sense Motive); The skill is a class skill for you, if the skill is already a class skill for you, gain +1 trait bonus on the skill",
  },
  {
    roll: 5,
    name: "Discovery",
    modifier: "+1 Reputation",
    otherEffects:
      "Pick a knowledge skill that skill is a class skill for you. Choose any peform skill that you are not trained and add a rank to it, if the skill is already a class skill for you, gain +1 trait bonus on the skill",
  },
  {
    roll: 6,
    name: "Ruthless Victor",
    modifier: "-2 Reputation",
    otherEffects:
      "Roll a four-sided die to determine a chakra skill (1: Chakra Control, 2: Genjutsu, 3: Ninjutsu, 4: Taijutsu); The skill is a class skill for you, if the skill is already a class skill for you, gain +1 trait bonus on the skill",
  },
  {
    roll: 7,
    name: "Elevated for Service",
    modifier: "-1 Reputation, +1 Action Point",
    otherEffects:
      "Craft is a class skill. Choose any craft skill that you are not trained and add a rank to it.",
  },
  {
    roll: 8,
    name: "Stolen Knowledge",
    modifier: "-2 Action Point",
    otherEffects:
      "You know a level 3 technique roll a ten-sided die to determine the kind of technique (1-2: Ninjutsu, 3: Chakra Control, 4-6: Taijutsu, 7: Fuinjutsu, 8: Genjutsu, 9: Hijutsu, 10: Kinjutsu), select one technique from the determined type and learn it even if you would not normally allowed to.",
  },
  {
    roll: 9,
    name: "Imperial Heritage",
    modifier: "+3 Action Point",
    otherEffects:
      "You start the game with [[Action Boost]] as bonus feat",
  },
  {
    roll: 10,
    name: "Unusual Name Origin",
    modifier: "-1 Reputation",
    otherEffects:
      "You may decrease one character ability score by 2 to increase another one by two. If you do not do so, you start the game with one item of mastercraft +1 quality.",
  },
];

/**
 * Retrieve a heritage outcome by d10 roll (1-10).
 * @param {number} roll - The d10 roll result (1-10)
 * @returns {Object|null} The outcome object, or null if not found
 */
export function getOutcomeByRoll(roll) {
  return HERITAGE_OUTCOMES.find((o) => o.roll === roll) || null;
}

/**
 * Extract Reputation and Action Point deltas from a Modifier string.
 * Parses strings like "+1 Reputation", "-2 Action Points", "+2 Action Points, +2 Reputation", etc.
 *
 * Handles ASCII minus (-), Unicode minus (−, U+2212), and em-dash (—) as negative signs.
 *
 * @param {string} modifier - The modifier string to parse
 * @returns {Object} { deltaRep: number, deltaAP: number }
 */
export function extractModifierDeltas(modifier) {
  let deltaRep = 0;
  let deltaAP = 0;

  if (!modifier || typeof modifier !== "string") {
    return { deltaRep, deltaAP };
  }

  // Normalize unicode minus and em-dash to ASCII minus
  const normalized = modifier.replace(/[−—]/g, "-");

  // Match pattern: [+-]N (Reputation|Action Point[s]?)
  const repPattern = /([+-])(\d+)\s+Reputation/i;
  const apPattern = /([+-])(\d+)\s+Action\s+Points?/i;

  const repMatch = normalized.match(repPattern);
  if (repMatch) {
    const sign = repMatch[1] === "+" ? 1 : -1;
    const value = parseInt(repMatch[2], 10);
    deltaRep = sign * value;
  }

  const apMatch = normalized.match(apPattern);
  if (apMatch) {
    const sign = apMatch[1] === "+" ? 1 : -1;
    const value = parseInt(apMatch[2], 10);
    deltaAP = sign * value;
  }

  return { deltaRep, deltaAP };
}
