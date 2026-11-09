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

## [0.40.1] — 2026-11-09

- FINC-065 The net worth, pure net worth and equal-cash summaries now show a year-0 reconciliation of Downsize net worth (invested plus new home, less outside funds), explaining why it stays the same when the "use sale proceeds" checkbox is toggled.

## [0.40.0] — 2026-11-09

- FINC-064 The final-year net worth point is now presented as a net-of-sale value, with a terminal sale adjustment shown in the table and chart.

## [0.39.1] — 2026-11-09

- FINC-068 Results tabs wrap onto extra rows at desktop widths so every tab is fully visible without scroll buttons.

## [0.39.0] — 2026-11-09

- FINC-063 Cost Summary now breaks out the cash deployed at sale and purchase (including the downsize home price and any shortfall) and the opportunity costs by component, and its bullets use the same monthly-cash measure as the table.

## [0.38.2] — 2026-11-08

- FINC-061 Result tabs no longer show scrollbars; edge indicators appear when more tabs are off-screen and can be clicked to scroll, and the strip pans by wheel or touch.

## [0.38.1] — 2026-11-08

- FINC-062 Chart legends no longer overlap the "Year" axis labels; the legend now has its own row (wrapping if needed) below them.

## [0.38.0] — 2026-11-08

- FINC-058 A new "Equal cash contributions" tab (chart and table) and headline card compare net worth for staying, selling and renting, and downsizing when every path receives the same yearly cash contribution, the amount staying needs for its mortgage and carrying costs.

## [0.37.0] — 2026-11-08

- FINC-057 Added a "Pure net worth" result (chart, table and CSV) where withdrawals are spent and no cash-flow difference is credited to the sell paths.
- FINC-059 The "Cash you must supply" table now shows each path's monthly contribution versus staying, the same equal-cash-out definition behind the net worth comparison, so the cash figures and the equalized results reconcile.

## [0.36.3] — 2026-11-08

- FINC-060 A new mortgage amount now requires a new mortgage term of at least 1 year, and the payment calculation is guarded against zero or invalid terms.

## [0.36.2] — 2026-11-08

- FINC-056 Rent is now paid once: the household pays the part the withdrawals do not cover, and the portfolio is charged only the withdrawals, so the out-of-pocket figures and investment balances no longer double-count the shortfall.

## [0.36.1] — 2026-11-08

- FINC-055 The Methodology "Withdrawals" section now correctly states that the gross withdrawal is spent and deducted from capital each year, matching the calculation.

## [0.36.0] — 2026-11-08

- FINC-052 Withdrawals from the sell and downsize investments are now spent rather than compounding, and when withdrawals are set to cover the rent the housing bill is deducted only once.

## [0.35.0] — 2026-11-08

- FINC-053 Under the stay scenario the home's value now compounds before selling costs and taxes; those are applied only at the end of the period, when the home is sold.

## [0.34.0] — 2026-11-07

- FINC-054 An optional checkbox sets the yearly withdrawal to just cover the rent (or the new home's housing costs when downsizing), overriding the flat withdrawal percentage.

## [0.33.0] — 2026-11-07

- FINC-048 When you would buy the new home with no mortgage, the downsize inputs and the monthly cash summary now say so: no mortgage payment, a monthly cash need of carrying costs only, and the monthly withdrawal the remaining invested proceeds generate.
- FINC-049 "What drives the verdict" gains a "self-funding rent" breakeven: the withdrawal rate, or starting rent, at which the invested proceeds fully cover the rent, and the monthly top-up at your current inputs.

## [0.32.2] — 2026-11-07

- FINC-047 The cost summary now shows the total cash the household must supply over the full time horizon for each path.

## [0.32.1] — 2026-11-07

- FINC-046 The Investable cash table now shows the monthly rent, how much of it the withdrawal income covers (flagged when under 100%) and the amount left out of pocket.

## [0.32.0] — 2026-11-07

- FINC-045 A new "Cash you must supply" chart and cost-summary rows show the monthly cash the household must come up with under staying, selling and renting, and downsizing, after portfolio withdrawals applied to housing.

## [0.31.0] — 2026-11-07

- FINC-044 The calculator layout is redesigned: inputs are collapsible groups in a sticky left rail with saved scenarios as chips, results sit under a headline strip and tabs (one chart at a time, full width), and printing now uses the full page width with optional data tables and a summary of the changed inputs.

## [0.30.1] — 2026-11-07

- FINC-050 The methodology now has a section explaining the cash-flow lens versus the net-worth lens: principal builds equity and is not a cost, rent is fully unrecoverable, withdrawals applied to housing are equity converted into income, and staying converts income into equity while selling does the reverse.

## [0.30.0] — 2026-11-07

- FINC-041 "What drives the verdict" now also shows the values at which downsizing flips against staying, and it follows the "Use the proceeds" checkbox and cap like the charts and tables do.

## [0.29.0] — 2026-11-07

- FINC-039 With "Use the proceeds from selling my current home" unchecked, or capped, the downsize net worth, verdict and summary table now leave out the money from outside the model that pays for the new home, so the three paths stay comparable.
- FINC-042 The downsize methodology and help text now describe both modes of the "Use the proceeds" checkbox, the funding order (sale proceeds, then new mortgage, then other savings), the shortfall rule and how negative starting capital is treated.

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
