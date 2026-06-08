/**
 * Question Definitions for Naruto D20 Kaihou Wizard
 * Compiled from: Mechanics/House_Rules/20 Perguntas.md
 * Source spec: docs/superpowers/specs/2026-06-07-d2.3b-question-behavior.md
 *
 * Every question has:
 * - id (q1..q20)
 * - pickType: "none" | "radio" | "select" | "nested" | "drag-drop" | "drag-drop-coupled" | "roll-table"
 * - stateField: wizard state key (or null for narrative-only)
 * - required: boolean (only Q1, Q4, Q7, Q8)
 * - questionText: full question for player
 * - sidebarLabel: short label for sidebar
 * - narrativePrompt: textarea prompt
 * - options: array of {value, label, icon?, mechanicalNote?, markerItemId?} if pickType != "none"
 * - subPicker: {stateField, type, label, options, revealWhen} if pickType === "nested"
 * - markerFlag: the marker flag key (or array)
 */

// Q1 — Village options
const Q1_VILLAGE_OPTIONS = [
  {value: "bc053d4ef2995ea0", label: "Hisuigakure (Jade)"},
  {value: "033fcee4e14089b8", label: "Houohgakure (Phoenix)"},
  {value: "ffac9cdf75b27810", label: "Kanigakure (Iron Shell)"},
  {value: "021058ee37acb649", label: "Kiringakure (Kirin)"},
  {value: "d93ae7cd1e0ba7e2", label: "Ryuugakure (Dragon)"},
  {value: "a18ed55e5e90130b", label: "Sasorigakure (Scorpion)"},
  {value: "a8318ef3f955ee6f", label: "Shishigakure (Lion)"},
  {value: "bf4e2f24f90bb464", label: "Tsurugakure (Crane)"},
];

// Q4 — Affinity options
const Q4_AFFINITY_OPTIONS = [
  {
    value: "Fire",
    label: "Fire (Katon)",
    icon: "modules/naruto-d20-kaihou/assets/questions/elements/fire.svg",
  },
  {
    value: "Water",
    label: "Water (Suiton)",
    icon: "modules/naruto-d20-kaihou/assets/questions/elements/water.svg",
  },
  {
    value: "Earth",
    label: "Earth (Doton)",
    icon: "modules/naruto-d20-kaihou/assets/questions/elements/earth.svg",
  },
  {
    value: "Wind",
    label: "Wind (Fuuton)",
    icon: "modules/naruto-d20-kaihou/assets/questions/elements/wind.svg",
  },
  {
    value: "Lightning",
    label: "Lightning (Raiton)",
    icon: "modules/naruto-d20-kaihou/assets/questions/elements/lightning.png",
  },
];

// All PF1e + Naruto D20 skills (40 total)
export const ALL_SKILL_OPTIONS = [
  {value: "acr", label: "Acrobatics"},
  {value: "ani", label: "Animal Handling"},
  {value: "arc", label: "Arcana"},
  {value: "ath", label: "Athletics"},
  {value: "blu", label: "Bluff"},
  {value: "cha", label: "Chakra Control"},
  {value: "crf", label: "Craft"},
  {value: "dip", label: "Diplomacy"},
  {value: "dis", label: "Disguise"},
  {value: "esc", label: "Escape Artist"},
  {value: "fly", label: "Fly"},
  {value: "fuj", label: "Fuinjutsu"},
  {value: "gen", label: "Genjutsu"},
  {value: "han", label: "Handle Animal"},
  {value: "hea", label: "Heal"},
  {value: "int", label: "Intimidate"},
  {value: "kn0", label: "Knowledge (Arcana)"},
  {value: "kn1", label: "Knowledge (Dungeoneering)"},
  {value: "kn2", label: "Knowledge (Engineering)"},
  {value: "kn3", label: "Knowledge (Geography)"},
  {value: "kn4", label: "Knowledge (History)"},
  {value: "kn5", label: "Knowledge (Local)"},
  {value: "kn6", label: "Knowledge (Nature)"},
  {value: "kn7", label: "Knowledge (Ninja Lore)"},
  {value: "kn8", label: "Knowledge (Religion)"},
  {value: "kn9", label: "Knowledge (Royalty)"},
  {value: "lin", label: "Linguistics"},
  {value: "mus", label: "Perception"},
  {value: "prf", label: "Perform"},
  {value: "nin", label: "Ninjutsu"},
  {value: "pro", label: "Profession"},
  {value: "rid", label: "Ride"},
  {value: "sen", label: "Sense Motive"},
  {value: "sle", label: "Sleight of Hand"},
  {value: "spl", label: "Spellcraft"},
  {value: "ste", label: "Stealth"},
  {value: "sur", label: "Survival"},
  {value: "swm", label: "Swim"},
  {value: "taj", label: "Taijutsu"},
  {value: "umd", label: "Use Magic Device"},
];

// Q7 Outsider sub-picker — same as Q17 and Q13 class skill options
const CLASS_SKILL_OPTIONS = ALL_SKILL_OPTIONS;

// Q8 Sceptic sub-picker — Craft and Profession subskills
export const SCEPTIC_SUBSKILL_OPTIONS = [
  // Craft group
  {group: "Craft", value: "crf.subSkills.armor", label: "Craft (Armor)"},
  {group: "Craft", value: "crf.subSkills.calligraphy", label: "Craft (Calligraphy)"},
  {group: "Craft", value: "crf.subSkills.chemical", label: "Craft (Chemical)"},
  {group: "Craft", value: "crf.subSkills.explosives", label: "Craft (Explosives)"},
  {group: "Craft", value: "crf.subSkills.mechanics", label: "Craft (Mechanics)"},
  {group: "Craft", value: "crf.subSkills.pharmaceutical", label: "Craft (Pharmaceutical)"},
  {group: "Craft", value: "crf.subSkills.weapons", label: "Craft (Weapons)"},
  {group: "Craft", value: "crf.subSkills.<other>", label: "Craft (Other…)"},
  // Profession group
  {group: "Profession", value: "pro.subSkills.sailor", label: "Profession (Sailor)"},
  {group: "Profession", value: "pro.subSkills.scribe", label: "Profession (Scribe)"},
  {group: "Profession", value: "pro.subSkills.merchant", label: "Profession (Merchant)"},
  {group: "Profession", value: "pro.subSkills.herbalist", label: "Profession (Herbalist)"},
  {group: "Profession", value: "pro.subSkills.courtesan", label: "Profession (Courtesan)"},
  {group: "Profession", value: "pro.subSkills.librarian", label: "Profession (Librarian)"},
  {group: "Profession", value: "pro.subSkills.<other>", label: "Profession (Other…)"},
];

// Q7 Loyalist/Outsider options
const Q7_RELATIONSHIP_OPTIONS = [
  {
    value: "loyalist",
    label: "Village Loyalist (Positive)",
    icon: "icons/svg/upgrade.svg",
  },
  {
    value: "outsider",
    label: "Village Outsider (Negative / Friction)",
    icon: "icons/svg/downgrade.svg",
  },
];

// Q8 Adherent/Sceptic options
const Q8_CODE_OPTIONS = [
  {
    value: "adherent",
    label: "Code Adherent (Conviction)",
    icon: "icons/svg/holy-shield.svg",
  },
  {
    value: "sceptic",
    label: "Code Sceptic (Pragmatism)",
    icon: "icons/svg/book.svg",
  },
];

// Q18 Heritage table outcomes (snapshot from Namesake_Heritage.md as of 2026-06-07)
const Q18_HERITAGE_OUTCOMES = [
  {
    roll: 1,
    outcome: "Famous Deed",
    modifier: "+1 Reputation",
    deltaRep: 1,
    deltaAP: 0,
    otherEffects: "Roll d10 again → starting item type (1-3 weapon, 4-6 armor, 7-8 other, 9 vehicle, 10 boat/estate); worth ≤15",
  },
  {
    roll: 2,
    outcome: "Glorious Sacrifice",
    modifier: "+2 Action Points, +2 Reputation",
    deltaRep: 2,
    deltaAP: 2,
    otherEffects: "Lost family heirloom (d10 type as above); exists somewhere in the world",
  },
  {
    roll: 3,
    outcome: "Wondrous Work",
    modifier: "+2 Reputation",
    deltaRep: 2,
    deltaAP: 0,
    otherEffects: "Perform is a class skill; pick an untrained Perform subskill, +1 rank",
  },
  {
    roll: 4,
    outcome: "Dynasty Builder",
    modifier: "−1 Reputation",
    deltaRep: -1,
    deltaAP: 0,
    otherEffects: "Roll d4 → social skill (1 Diplomacy, 2 Bluff, 3 Intimidate, 4 Sense Motive); class skill, OR +1 trait if already class",
  },
  {
    roll: 5,
    outcome: "Discovery",
    modifier: "+1 Reputation",
    deltaRep: 1,
    deltaAP: 0,
    otherEffects: "Pick a Knowledge skill → class skill; pick an untrained Perform subskill, +1 rank (OR +1 trait if already class)",
  },
  {
    roll: 6,
    outcome: "Ruthless Victor",
    modifier: "−2 Reputation",
    deltaRep: -2,
    deltaAP: 0,
    otherEffects: "Roll d4 → chakra skill (1 Chakra Control, 2 Genjutsu, 3 Ninjutsu, 4 Taijutsu); class skill, OR +1 trait if already class",
  },
  {
    roll: 7,
    outcome: "Elevated for Service",
    modifier: "−1 Reputation, +1 Action Point",
    deltaRep: -1,
    deltaAP: 1,
    otherEffects: "Craft is a class skill; pick an untrained Craft subskill, +1 rank",
  },
  {
    roll: 8,
    outcome: "Stolen Knowledge",
    modifier: "−2 Action Points",
    deltaRep: 0,
    deltaAP: -2,
    otherEffects: "Learn a Rank 3 technique (d10 type roll: 1-2 Ninjutsu, 3 Chakra Control, 4-6 Taijutsu, 7 Fuinjutsu, 8 Genjutsu, 9 Hijutsu, 10 Kinjutsu); pick one technique of that type",
  },
  {
    roll: 9,
    outcome: "Imperial Heritage",
    modifier: "+3 Action Points",
    deltaRep: 0,
    deltaAP: 3,
    otherEffects: "Gain [[Action Boost]] as bonus feat",
  },
  {
    roll: 10,
    outcome: "Unusual Name Origin",
    modifier: "−1 Reputation",
    deltaRep: -1,
    deltaAP: 0,
    otherEffects: "Reduce one ability score by 2, increase another by 2; OR start with one mastercraft +1 item",
  },
];

export const QUESTION_DEFINITIONS = [
  // Q1 — Village
  {
    id: "q1",
    pickType: "select",
    stateField: "q1_village_uuid",
    required: true,
    questionText: "Which Great Village does your character come from?",
    sidebarLabel: "Village",
    narrativePrompt: "What does this village feel like in your character's bones? Memories of the streets, the academy, the household — what shaped them before they were a shinobi?",
    options: Q1_VILLAGE_OPTIONS,
    markerFlag: "q1Village",
  },

  // Q2 — Clan / Starting Occupation (drag-drop from occupations pack)
  {
    id: "q2",
    pickType: "drag-drop",
    stateField: "q2_occupation_uuid",
    required: false,
    questionText: "Which Clan does your character descend from? (If clanless, describe how they reached the academy.)",
    sidebarLabel: "Clan",
    narrativePrompt: "",
    pack: "naruto-d20-kaihou.occupations",
    markerFlag: "q2OccupationItem",
    dropAccepts: {type: "feat"},
    browse: {kind: "pack", id: "naruto-d20-kaihou.occupations", label: "Browse Occupations"},
  },

  // Q3 — Biggest Talent / Human Bonus Feat (drag-drop)
  {
    id: "q3",
    pickType: "drag-drop",
    stateField: "q3_human_bonus_feat_uuid",
    required: false,
    questionText: "What is your biggest talent?",
    sidebarLabel: "Talent",
    narrativePrompt: "",
    markerFlag: "q3HumanBonusFeat",
    dropAccepts: {type: "feat"},
    browse: {kind: "pf1Browser", browser: "feats", label: "Browse Feats"},
  },

  // Q4 — Nature Affinity (radio)
  {
    id: "q4",
    pickType: "radio",
    stateField: "q4_affinity",
    required: true,
    questionText: "What is your Nature Affinity?",
    sidebarLabel: "Affinity",
    narrativePrompt: "What was the one thing your character was naturally good at? The moment the element first answered them?",
    options: Q4_AFFINITY_OPTIONS,
  },

  // Q5 — Shinobido (narrative only)
  {
    id: "q5",
    pickType: "none",
    stateField: null,
    required: false,
    questionText: "What is your Shinobido (Caminho Ninja)?",
    sidebarLabel: "Shinobido",
    narrativePrompt: "An obligation to your lord, clan, or family — something that can conflict with your personal desires. Examples: \"Protect the heir.\" \"Retrieve the lost scroll.\" \"Clear my father's name.\"",
  },

  // Q6 — Desire (narrative only)
  {
    id: "q6",
    pickType: "none",
    stateField: null,
    required: false,
    questionText: "What is your Desire (Seu Jeito Ninja! Tô certo!)?",
    sidebarLabel: "Desire",
    narrativePrompt: "Your personal code or ambition — the source of your internal fire. Examples: \"I will never go back on my word.\" \"I will become the strongest.\" \"Hard work beats genius.\"",
  },

  // Q7 — Village Relationship (nested: loyalist/outsider + class skill)
  {
    id: "q7",
    pickType: "nested",
    stateField: "q7_relationship",
    required: true,
    questionText: "What is your relationship with your village?",
    sidebarLabel: "Relationship",
    narrativePrompt: "Doors open for you in the village — or doors close. Friction or favour? Tell us how the village reads your name.",
    options: Q7_RELATIONSHIP_OPTIONS,
    markerFlag: ["q7Loyalist", "q7Outsider"],
    subPicker: {
      stateField: "q7_outsider_class_skill",
      type: "select",
      label: "Which class skill does your self-reliance grant?",
      options: CLASS_SKILL_OPTIONS,
      revealWhen: {field: "q7_relationship", value: "outsider"},
    },
  },

  // Q8 — Shinobi Code Stance (nested: adherent/sceptic + craft/profession)
  {
    id: "q8",
    pickType: "nested",
    stateField: "q8_code",
    required: true,
    questionText: "What does your character think of the Shinobi Code (Shinobido)?",
    sidebarLabel: "Code",
    narrativePrompt: "Is the Shinobido the path your character walks — or a weight they carry? Conviction or pragmatism, and what shaped that view?",
    options: Q8_CODE_OPTIONS,
    markerFlag: ["q8Adherent", "q8Sceptic"],
    subPicker: {
      stateField: "q8_sceptic_subskill",
      type: "select",
      label: "Which Craft or Profession subskill do you invest the rank in?",
      options: SCEPTIC_SUBSKILL_OPTIONS,
      revealWhen: {field: "q8_code", value: "sceptic"},
      allowCustom: true,
    },
  },

  // Q9 — Greatest Achievement / Level 1 Feat (drag-drop)
  {
    id: "q9",
    pickType: "drag-drop",
    stateField: "q9_level1_feat_uuid",
    required: false,
    questionText: "What is your greatest achievement so far?",
    sidebarLabel: "Achievement",
    narrativePrompt: "",
    markerFlag: "q9Level1Feat",
    dropAccepts: {type: "feat"},
    browse: {kind: "compendium", pack: "pf1.feats", filter: {subType: "feat"}, label: "Browse Feats"},
  },

  // Q10 — Resentment / Flaw + Bonus Feat (drag-drop-coupled)
  {
    id: "q10",
    pickType: "drag-drop-coupled",
    stateField: ["q10_flaw_uuid", "q10_bonus_feat_uuid"],
    required: false,
    questionText: "What does your character resent or regret?",
    sidebarLabel: "Flaw",
    narrativePrompt: "The weight that doesn't leave. Optional: pick a Character Flaw from the community compendium and the Bonus Feat it grants — drag both here. Then name the wound.",
    markerFlag: ["q10Flaw", "q10BonusFeat"],
    zones: [
      {
        stateField: "q10_flaw_uuid", label: "Flaw", dropAccepts: {type: "feat"},
        browse: {kind: "compendium", pack: "naruto-d20.feats", folder: "Misc", label: "Browse Flaws"},
      },
      {
        stateField: "q10_bonus_feat_uuid", label: "Bonus Feat", dropAccepts: {type: "feat"},
        browse: {kind: "compendium", pack: "pf1.feats", filter: {subType: "feat"}, label: "Browse Feats"},
      },
    ],
  },

  // Q11 — Peace (narrative only)
  {
    id: "q11",
    pickType: "none",
    stateField: null,
    required: false,
    questionText: "What brings your character peace?",
    sidebarLabel: "Peace",
    narrativePrompt: "A hobby, a person, a place — the still point in the turning. Animal Bond, Tea Ceremony, a roof at sundown.",
  },

  // Q12 — Fear (narrative only)
  {
    id: "q12",
    pickType: "none",
    stateField: null,
    required: false,
    questionText: "What frightens or disturbs your character?",
    sidebarLabel: "Fear",
    narrativePrompt: "A phobia, a deep-seated worry — Fear of Thunder, Distrust of Doctors. It doesn't need to be rational; it needs to be true.",
  },

  // Q13 — Mentor (drag-drop technique + class-skill sub-picker)
  {
    id: "q13",
    pickType: "drag-drop",
    stateField: "q13_mentor_technique_uuid",
    required: false,
    questionText: "Who was your mentor?",
    sidebarLabel: "Mentor",
    narrativePrompt: "Name them. What they taught — drag the Rank 2 Technique here — and pick the related Class Skill.",
    markerFlag: "q13Mentor",
    dropAccepts: {type: "naruto-d20.technique"},
    browse: {kind: "pack", id: "naruto-d20.techniques", label: "Browse Techniques"},
    subPicker: {
      stateField: "q13_class_skill",
      type: "select",
      label: "Which class skill did your mentor teach?",
      options: CLASS_SKILL_OPTIONS,
      revealWhen: {field: "q13_mentor_technique_uuid", notNull: true},
    },
  },

  // Q14 — Distinctive Trait (narrative only)
  {
    id: "q14",
    pickType: "none",
    stateField: null,
    required: false,
    questionText: "What do people first notice about you?",
    sidebarLabel: "Distinctive",
    narrativePrompt: "A distinctive physical trait or mannerism. A scar, a tic, a way of standing. The first thing that lands in a stranger's eye.",
  },

  // Q15 — Stress Reaction (narrative only)
  {
    id: "q15",
    pickType: "none",
    stateField: null,
    required: false,
    questionText: "How do you react under stress?",
    sidebarLabel: "Stress",
    narrativePrompt: "Cold and analytical, loud and reckless, frozen, dissociated, manic — name your stress-mode. Roleplay guidance, not a mechanic.",
  },

  // Q16 — Prior Relationships / Restricted Item (drag-drop)
  {
    id: "q16",
    pickType: "drag-drop",
    stateField: "q16_restricted_item_uuid",
    required: false,
    questionText: "What are your prior relationships?",
    sidebarLabel: "Connections",
    narrativePrompt: "Family, rivals, childhood friends. One of them gave you a Restricted Item (non-sealed) — name them, and drag the item here.",
    markerFlag: "q16RestrictedItem",
    dropAccepts: {typeIn: ["equipment", "weapon", "consumable", "loot"]},
    browse: {kind: "pf1Browser", browser: "items", label: "Browse Items"},
  },

  // Q17 — Parents / 0-Rank Skill Bump (select, filtered)
  {
    id: "q17",
    pickType: "select",
    stateField: "q17_skill_key",
    required: false,
    questionText: "Who are your parents?",
    sidebarLabel: "Parents",
    narrativePrompt: "Name them — or name their absence. They tried to teach you something you may have ignored: pick a skill you have 0 ranks in, and tell us what that lesson was.",
    optionsFromActor: "zeroRankSkills",
  },

  // Q18 — Namesake / Heritage Table (roll-table d10)
  {
    id: "q18",
    pickType: "roll-table",
    stateField: ["q18_heritage_roll", "q18_heritage_locked_modifier"],
    required: false,
    questionText: "Who were you named to honor?",
    sidebarLabel: "Namesake",
    narrativePrompt: "Ancestor, hero, hope, omen, joke — whose name became yours? Roll the d10 to see what flavour rides with it, or pick an outcome manually. Apply the Other Effects yourself via the PF1e sheet — the wizard handles only the Reputation / Action Point bumps.",
    rollFormula: "1d10",
    outcomes: Q18_HERITAGE_OUTCOMES,
  },

  // Q19 — Name (narrative only)
  {
    id: "q19",
    pickType: "none",
    stateField: null,
    required: false,
    questionText: "What is your name?",
    sidebarLabel: "Name",
    narrativePrompt: "Shinobi names have meanings — nature, virtue, clan tradition. What does yours mean, and who chose it?",
  },

  // Q20 — Death (narrative only)
  {
    id: "q20",
    pickType: "none",
    stateField: null,
    required: false,
    questionText: "How does your character wish to die?",
    sidebarLabel: "Death",
    narrativePrompt: "A true shinobi accepts death. Envisioning it defines how they live. Where, when, for whom, against what?",
  },
];

// Re-export as `questions` for Phase 2 wizard compatibility.
export { QUESTION_DEFINITIONS as questions };
