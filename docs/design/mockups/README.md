# Databook UI — design mockups

Durable copies of the static HTML mockups produced during the 2026-06-13 databook
brainstorm. Originals lived in the gitignored `.superpowers/brainstorm/` scratch
and would otherwise have been lost. Open them in a browser to view.

| File | What it shows |
|---|---|
| `01-actor-sheet-direction.html` | Early exploration of the three directions (reskin / reflow / bespoke). Direction **C** (bespoke) was chosen. |
| `02-sheet-databook.html` | First databook-aesthetic pass of the header + body. |
| `03-sheet-layout.html` | Layout iteration (tab order, panel arrangement). |
| `04-sheet-final-approved.html` | **The approved front-matter design** the implemented Identity tab is based on: header band (portrait, kanji, alias 「」, village/rank/allegiance badges, natures + void/KKG), two radars, mission record, origin & path. |

These are reference artifacts, not living code. The implemented sheet is
`templates/actor/kaihou-character-sheet.hbs` + `scss/theme/_kaihou-character-sheet.scss`.
New surfaces (NPC sheet, item sheets, re-skinned tabs) should get their own
mockups added here before implementation — see
`docs/superpowers/roadmap-databook-overhaul.md`.
