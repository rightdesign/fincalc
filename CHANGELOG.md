# Changelog

All notable changes to Paul's Financial Calculators. Versions are the
`version` field in `package.json`.

## How this file is maintained

Nobody edits this file or bumps `package.json` on a ticket branch. Each ticket
branch records, in its own commit message, a `Bump: patch|minor` trailer
(never `major`, that stays a manual call) and one or more `Changelog: <line>`
trailers worded as they should read here, each with its ticket reference.

Each cycle the release phase (`release.mode: local` in `.crew.yaml`) merges
every verified ticket, then in one following commit adds one
`## [x.y.z] — YYYY-MM-DD` section here (newest first, a bullet per
`Changelog:` line across the batch) and bumps `package.json`, sized by the
largest `Bump:` in the batch. It pushes `master`, then the `deploy` hook runs
`.github/workflows/pages.yml`, which publishes the site to GitHub Pages.

## [0.4.3] — 2026-11-05

- FINC-009 Added a footer link to the feedback form for requesting calculator enhancements.

## [0.4.1] — 2026-11-05

- FINC-006 The calculator page now shows the variables on the left and the charts and tables on the right (stacked on narrow screens)

## [0.4.0] — 2026-11-05

- FINC-005 Added a results view with net worth (breakeven year called out), monthly cash flow and investable cash, each as a chart and a table that update as you edit the inputs

## [0.3.0] — 2026-11-05

- FINC-004 Added the stay vs. sell-and-rent calculation engine (mortgage amortization, net sale proceeds, yearly projection and breakeven year)

## [0.2.0] — 2026-11-05

- FINC-003 Added the homeowner inputs form for the stay vs. sell-and-rent calculator

## [0.1.1] — 2026-11-05

- FINC-002 Scaffold the single-page calculator shell (layout, styles, entry script)
