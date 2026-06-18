# Kaihou Databook Visual Identity

Foundation for the databook character sheet redesign. The implementation lives
in `scss/_databook-tokens.scss` under the `--db-*` namespace.

## Audit

- `scss/_databook-tokens.scss` already defined the core palette, fonts, and radar
  colours, but it did not expose semantic type or spacing tokens.
- `scss/_tokens.scss` defines the broader `--zen-*` theme system. The databook
  sheet currently maps several `--zen-*` values to `--db-*` values inside
  `.kaihou-databook-form` for PF1e compatibility.
- `scss/theme/_kaihou-character-sheet.scss` still contains older raw spacing,
  sizing, and colour values. Those are Claude-owned during this split; new work
  should migrate them to the tokens below during integration.

## Direction

The databook should read as a field registry dossier: cream paper, compact ink
tables, red stamped accents, and measured spacing. It should not inherit the
looser handwritten zen-theme rhythm except where PF1e legacy surfaces require
theme-token compatibility.

## Colour Roles

- `--db-color-ink`: primary body text and hard rules.
- `--db-color-ink-muted`: metadata, hints, inactive labels.
- `--db-color-accent`: red stamp accent, active controls, section emphasis.
- `--db-color-accent-strong`: hover and danger emphasis.
- `--db-color-surface`: base parchment surface.
- `--db-color-panel`: normal card and table panel surface.
- `--db-color-panel-raised`: highlighted or editable panel surface.
- `--db-color-border`: standard panel border.
- `--db-color-border-soft`: internal dividers.
- `--db-color-rule`: low-emphasis ink rule.
- `--db-color-stamp`: warm focus/editable field surface.
- `--db-color-void`: KKG / void special-state accent.

## Type Scale

- `--db-type-display`: character name and top-level identity.
- `--db-type-heading`: section headings.
- `--db-type-body`: normal table and prose text.
- `--db-type-label`: uppercase labels and compact controls.
- `--db-type-numeric`: HP, AC, chakra, and other readout numbers.
- `--db-type-caption`: secondary captions and dense metadata.

Line-height tokens: `--db-line-tight`, `--db-line-heading`, `--db-line-body`.
Tracking tokens: `--db-track-label`, `--db-track-kanji`.

## Spacing Scale

Use the 4px-based scale: `--db-space-0`, `--db-space-1`, `--db-space-2`,
`--db-space-3`, `--db-space-4`, `--db-space-5`, `--db-space-6`,
`--db-space-8`, `--db-space-10`.

Rules of thumb:

- Dense row gaps: `--db-space-1` or `--db-space-2`.
- Panel padding: `--db-space-2` or `--db-space-3`.
- Major layout gaps: `--db-space-4` or `--db-space-6`.
- Avoid one-off pixel values in databook tab CSS unless matching an icon asset.

## Shape And Rules

- `--db-radius-sm`: small chips, pips, and buttons.
- `--db-radius-md`: larger panels.
- `--db-rule-hair`: internal row dividers.
- `--db-rule-base`: panel borders.
- `--db-rule-accent`: red section rules.
- `--db-shadow-stamp`: small stamped icon / badge elevation.
