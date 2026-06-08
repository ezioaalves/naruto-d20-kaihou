/**
 * Browse-kind dispatcher for the 20 Questions wizard.
 *
 * Each question's optional `browse` config has a `kind` field. This module
 * dispatches to the right Foundry API based on `kind`:
 *
 *   pack         — open a specific compendium pack's index UI
 *   pf1Browser   — open the PF1 system's named compendium browser (legacy)
 *   compendium   — open a pack and (optionally) scope by folder/type filter
 *
 * Foundry V13 + PF1e v11.11 globals: `game.packs`, `pf1.applications`.
 */

const BROWSE_HANDLERS = {
  pack:       (cfg) => openPack(cfg),
  pf1Browser: (cfg) => openPf1Browser(cfg),
  compendium: (cfg) => openCompendium(cfg),
};

/**
 * Open a browse UI for the given config. Returns a Promise.
 * Throws if `cfg.kind` is unknown.
 */
export async function openBrowse(cfg) {
  const handler = BROWSE_HANDLERS[cfg?.kind];
  if (!handler) {
    throw new Error(`openBrowse: unknown kind ${cfg?.kind}`);
  }
  return handler(cfg);
}

function openPack(cfg) {
  const pack = game.packs.get(cfg.id);
  if (!pack) {
    ui.notifications?.warn(`Compendium pack not found: ${cfg.id}`);
    return null;
  }
  return pack.render(true);
}

function openPf1Browser(cfg) {
  const browser = pf1.applications.compendiumBrowser?.[cfg.browser];
  if (!browser) {
    ui.notifications?.warn(`PF1 browser not found: ${cfg.browser}`);
    return null;
  }
  return browser.render(true);
}

/**
 * Open a compendium pack scoped by optional folder name and filter.
 *
 * The pack is opened via `pack.render(true)`; the folder/filter scoping
 * is applied as a post-render search hint by setting the pack's search
 * filter input. If the pack UI does not yet support search input
 * mutation (older sheets), the user lands on the pack root.
 */
async function openCompendium(cfg) {
  const pack = game.packs.get(cfg.pack);
  if (!pack) {
    ui.notifications?.warn(`Compendium pack not found: ${cfg.pack}`);
    return null;
  }

  const app = await pack.render(true);

  // Apply folder/filter as a search hint after the next render tick.
  // Falls back silently if the search input is not present in this pack UI.
  setTimeout(() => {
    try {
      const root = app?.element ?? document.querySelector(
        `[data-pack="${cfg.pack}"], .compendium[data-pack-id="${cfg.pack}"]`,
      );
      const searchInput = root?.querySelector?.('input[type="search"], input.search, input[name="search"]');
      if (!searchInput) return;
      const hints = [];
      if (cfg.folder) hints.push(cfg.folder);
      if (cfg.filter?.subType) hints.push(cfg.filter.subType);
      if (hints.length > 0) {
        searchInput.value = hints.join(" ");
        searchInput.dispatchEvent(new Event("input", { bubbles: true }));
      }
    } catch (_e) {
      // No-op: best-effort search hint.
    }
  }, 250);

  return app;
}
