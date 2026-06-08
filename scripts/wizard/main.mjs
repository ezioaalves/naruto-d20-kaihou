/**
 * naruto-d20-kaihou module entry point.
 *
 * D2.3b adds the 20 Questions Sheet Wizard. The wizard is launched
 * from a button injected into the PF1e actor sheet header.
 *
 * Architecture: docs/superpowers/specs/2026-06-07-d2.3b-wizard-design.md
 */

const MODULE_ID = "naruto-d20-kaihou";

Hooks.once("init", () => {
  console.log(`${MODULE_ID} | init`);
});

Hooks.once("ready", () => {
  console.log(`${MODULE_ID} | ready (D2.3b wizard bootstrap)`);
});
