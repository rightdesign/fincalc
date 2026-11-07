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

## [0.16.0] — 2026-11-07

- FINC-025 You can now compare a third path, selling and buying a smaller home (optionally with a new mortgage), on the same net worth, cash flow and investable cash charts.

## [0.15.0] — 2026-11-07

- FINC-024 You can now add one-time major repairs (such as a new roof or HVAC) by year and cost; they count as an owning cost in that year on the stay path.

## [0.14.0] — 2026-11-07

- FINC-023 The sell path now charges optional one-time moving costs and rental deposit/upfront rent, taken out of the proceeds before investing.

## [0.13.0] — 2026-11-07

- FINC-022 Added monthly HOA dues with their own annual growth rate to the owning costs.

## [0.12.0] — 2026-11-07

- FINC-021 Property tax, insurance and maintenance can each grow at their own annual rate.

## [0.11.0] — 2026-11-07

- FINC-020 The stay path now nets out selling costs and capital-gains tax at the end of the horizon, so both paths are compared after sale and after tax.

## [0.10.0] — 2026-11-07

- FINC-019 The calculator now has an inflation rate and an option to show all results in today's dollars.

## [0.9.0] — 2026-11-07

- FINC-018 The sell path now taxes investment growth and withdrawals, with separate rates for each so taxable, Roth and tax-deferred money can be modelled.

## [0.8.0] — 2026-11-07

- FINC-017 The stay path now includes the tax benefit of deducting mortgage interest and property tax, using your marginal tax rate, the standard deduction and the SALT cap.

## [0.7.1] — 2026-11-07

- FINC-015 The monthly cash flow cost of owning now includes principal as well as interest, property tax, insurance and maintenance.

## [0.7.0] — 2026-11-06

- FINC-014 The page now has a night theme that follows the phone's (or computer's) dark mode setting, including the charts, hints and hover cards.

## [0.6.0] — 2026-11-05

- FINC-013 Hovering a chart (or using the arrow keys on it) now shows the values for the nearest year in a card with a crosshair, and the charts have lighter gridlines and thicker lines.

## [0.5.0] — 2026-11-05

- FINC-012 Each input now has a "?" hint beside its label that shows a short definition and typical range on hover or focus, and stays within the screen on narrow devices.

## [0.4.5] — 2026-11-05

- FINC-011 Each input now stays on the same line as its label; long labels wrap their own text instead.

## [0.4.4] — 2026-11-05

- FINC-010 The page title and heading now read "Keep your home or sell and rent".

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
