const MODULE_BASE = "modules/naruto-d20-kaihou/assets/theme/icons/conditions/";

const CONDITION_ICON_MAP = {
  dying:       `${MODULE_BASE}dying_1.webp`,
  unconscious: `${MODULE_BASE}unconscious.webp`,
  exhausted:   `${MODULE_BASE}exhausted.webp`,
  stunned:     `${MODULE_BASE}dazed.webp`,
  nauseated:   `${MODULE_BASE}intoxicated.webp`,
  confused:    `${MODULE_BASE}disoriented.webp`,
  paralyzed:   `${MODULE_BASE}incapacitated.webp`,
  entangled:   `${MODULE_BASE}immobilized.webp`,
  prone:       `${MODULE_BASE}prone.webp`,
  bleeding:    `${MODULE_BASE}bleeding.webp`,
  burning:     `${MODULE_BASE}burning.webp`,
  silenced:    `${MODULE_BASE}silenced.webp`,
};

export function remapStatusEffectIcons(statusEffects) {
  return statusEffects.map((effect) => {
    const newIcon = CONDITION_ICON_MAP[effect.id];
    return newIcon ? { ...effect, icon: newIcon } : effect;
  });
}

export function registerStatusEffects() {
  Hooks.once("init", () => {
    CONFIG.statusEffects = remapStatusEffectIcons(CONFIG.statusEffects ?? []);
  });
}
