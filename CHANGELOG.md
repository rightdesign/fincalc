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

## [0.28.1] — 2026-11-07

- FINC-043 Loading a scenario saved before the "Use the proceeds" checkbox existed now resets it to checked, and its help button correctly reports the text as open.

## [0.28.0] — 2026-11-07

- FINC-040 The "If you downsize" inputs can now cap how much of the sale proceeds go into the new home, as a dollar amount or a percentage of the net proceeds (default "as much as needed"); the rest stays invested and the proceeds breakdown shows any outside funds.

## [0.27.1] — 2026-11-07

- FINC-038 Downsize shortfalls are flagged: when sale proceeds and the new mortgage do not cover the new home, buying and moving costs, a notice shows the amount and the investable-cash section and methodology say it is drawn from other savings.

## [0.27.0] — 2026-11-07

- FINC-037 The "If you downsize" section now shows a live sale-proceeds breakdown: sale price, selling costs, capital gains tax and mortgage payoff down to net proceeds, then the new home, buying costs, new mortgage and moving costs down to the amount invested at year 0 (or the shortfall).

## [0.26.0] — 2026-11-07

- FINC-036 The "If you downsize" inputs now have a "Use the proceeds from selling my current home to buy the new home" checkbox (checked by default); unchecking it invests all the net proceeds and funds the new home from the new mortgage plus outside money. The choice is kept in share links.

## [0.25.0] — 2026-11-07

- FINC-035 Charts have text descriptions, tables can be expanded all at once, and per-field help text is fully visible instead of truncated.

## [0.24.0] — 2026-11-07

- FINC-034 Home value, appreciation, investment growth, rent and rent growth now have a slider beside the number field, so you can sweep a value and watch the verdict and break-even move.

## [0.23.1] — 2026-11-07

- FINC-033 Added test coverage confirming each chart's Y-axis rescales when the time horizon changes (no user-visible change).

## [0.23.0] — 2026-11-07

- FINC-032 The page now explains its math in a "Methodology and assumptions" section (mortgage amortization, principal versus cost, how costs grow, withdrawals, nominal versus real dollars, break-even) and carries a not-financial-advice disclaimer.

## [0.22.0] — 2026-11-07

- FINC-031 You can now download each year-by-year table as a CSV file and print the whole comparison or save it as a PDF.

## [0.21.0] — 2026-11-07

- FINC-030 Your inputs are now kept in the page address and in this browser, so a reload restores them and a copied link shares your scenario.

## [0.20.0] — 2026-11-07

- FINC-029 A new "Summary of costs by category" section compares staying, selling and renting, and downsizing on initial, recurring and opportunity costs and net proceeds, with the net worth gap at the horizon in dollars and percent and the monthly cost gap in year 1 versus the final year.

## [0.19.0] — 2026-11-07

- FINC-028 The net worth summary always shows the gap against staying at the end of the horizon and, when selling or downsizing never catches up, the closest-approach year and whether the gap is narrowing or widening.

## [0.18.0] — 2026-11-07

- FINC-027 A new "What drives the verdict" section shows the value of home appreciation, investment return, rent growth and capital gains tax rate at which selling and staying swap places.

## [0.17.0] — 2026-11-07

- FINC-026 Scenario comparison test coverage.

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
