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

## [0.80.0] — 2026-11-16

- FINC-130 The rent vs own calculator now has a "rent, then buy" path: rent for N years while investing, then buy the same home at its appreciated price, shown as a third net worth line next to buy now and rent forever.
- FINC-138 The rent vs own calculator now says "Too close to call" instead of naming a winner when the gap at the end of your stay is under $5,000 or 5% of the larger side's net worth; the gap is still shown.

## [0.79.0] — 2026-11-16

- FINC-129 The rent vs own calculator now has investment-return presets (Aggressive 10%, Moderate 8%, Conservative 6%, Savings 4%) that fill the return and a matching tax drag, labelled as long-run nominal averages rather than forecasts.

## [0.78.0] — 2026-11-16

- FINC-134 The rent vs own calculator now reports the break-even to the month ("owning pulls ahead in year 7, month 4"), keeping the year figure alongside, and the chart marks the crossing month.

## [0.77.0] — 2026-11-16

- FINC-133 The rent vs own calculator now shows a price-to-rent line under the headline: the ratio, rent as a share of price per year, and the rent share below which renting wins at your own mortgage rate and stay.

## [0.76.0] — 2026-11-16

- FINC-127 The rent vs own calculator now has an optional assessed value growth for property tax, with California Prop 13 (2%) and Florida (3%) presets; the taxed value is never more than the home's market value.

## [0.75.0] — 2026-11-16

- FINC-131 The rent vs own calculator now solves for the break-even home price and the break-even monthly rent at your chosen stay, and can apply either to the inputs.

## [0.74.0] — 2026-11-16

- FINC-126 The rent vs own calculator now has a loan type choice (Conventional, FHA or VA) that applies FHA mortgage insurance or the VA funding fee, with the upfront fee financed or paid in cash.
- FINC-128 The rent vs own calculator now defaults to the latest Freddie Mac mortgage rate, with the survey week, a source link and the date the defaults were refreshed shown under the inputs.

## [0.73.0] — 2026-11-16

- FINC-124 The rent vs own calculator now taxes the gain on selling the home, after the $250,000 single / $500,000 married primary-residence exclusion (stays of two years or more), so long stays and high appreciation no longer overstate owning.

## [0.72.2] — 2026-11-15

- FINC-122 The payoff date now matches the last row of the monthly schedule when some months of the loan have already been paid.

## [0.72.1] — 2026-11-15

- FINC-121 Dollar amounts on the variable-rate mortgage calculator now show thousands commas while you type, so 1,700,000 is easy to tell from 17,000,000.

## [0.72.0] — 2026-11-15

- FINC-120 The variable-rate mortgage calculator has a new look inspired by the Vanguard personal investor site: a white, near-black and deep-red palette, Helvetica-style type, underline tabs and cleaner charts with larger labels.

## [0.71.0] — 2026-11-15

- FINC-117 The variable-rate mortgage calculator can now make the loan interest-only for its whole life, with the balloon payment due at the end shown in the results, alongside the existing interest-only start period.

## [0.70.1] — 2026-11-15

- FINC-116 The rent vs own page is split into one module and one test file per results card, with contributor notes, so tickets that add a card stop conflicting; the page itself is unchanged.

## [0.70.0] — 2026-11-15

- FINC-107 The rent vs own calculator now itemizes the monthly cost of owning by year, with principal split out as savings rather than cost.

## [0.69.0] — 2026-11-15

- FINC-104 The rent vs own calculator now shows a pure net worth view beside the equal-cash view, with break-even for each, and says when the two disagree.

## [0.68.0] — 2026-11-15

- FINC-111 The shareable link and print output are verified and hardened: every input, including inflation and the dollars basis, survives the round trip.

## [0.67.0] — 2026-11-15

- FINC-113 The rent vs own calculator now ends with a follow-through (the monthly amount a renter should invest, or the extra monthly cost of owning, with a 3-step plan) and a four-question checklist of things it does not model.

## [0.66.0] — 2026-11-15

- FINC-109 The rent vs own chart now runs to the break-even year (or 30 years), with the break-even marked and the stay year marked separately.

## [0.65.0] — 2026-11-15

- FINC-100 The rent vs own calculator now has an inflation input (default 2.5%) and a toggle to show results in today's dollars or future dollars, with the headline gap labelled by its basis.

## [0.64.0] — 2026-11-15

- FINC-114 Added automated regression guardrail tests covering the must-not-lose behaviours of both calculators (no user-visible change).
- FINC-115 The variable rate mortgage calculator now starts from the original loan amount and the payments already made, works out and shows "Balance today", and accepts an optional current-balance override.

## [0.63.0] — 2026-11-15

- FINC-108 The rent vs own calculator now shows a cost breakdown at the end of the stay (upfront, recurring, opportunity cost and money back from the sale) whose buckets add up to the headline gap.

## [0.62.0] — 2026-11-15

- FINC-106 The rent vs own calculator now has a "What drives the verdict" section giving the home growth, rent growth, investment return, mortgage rate and maintenance values at which renting and owning tie.

## [0.61.0] — 2026-11-15

- FINC-098 The rent vs own calculator now taxes the renter's investment gains (a yearly tax drag and a capital gains tax on sale, default 0.7% and 15%) and shows the tax on investments and the return after tax.

## [0.60.0] — 2026-11-15

- FINC-110 The rent vs own calculator now has one-click presets (first-time buyer with 3% or 10% down, 20% down with a 7-year stay, long-term owner with a 15-year stay) that set down payment, rate, term, stay and maintenance together, show the preset name, and read "Custom" after you edit those settings.

## [0.59.0] — 2026-11-15

- FINC-102 The rent vs own calculator now accepts an optional one-time major repair (year and cost) that reduces the Own net worth from that year on and is marked in the chart and table.

## [0.58.0] — 2026-11-15

- FINC-105 The rent vs own calculator now shows expected, good-for-owning and bad-for-owning cases for the home growth, rent growth and investment return, each with its own break-even year and final gap.

## [0.57.0] — 2026-11-15

- FINC-099 The rent vs own calculator now has HOA dues and extra utilities (dollars per month, default $0), each with its own yearly growth rate.

## [0.56.0] — 2026-11-15

- FINC-101 The rent vs own calculator now shows the cash needed to buy (down payment, closing costs, moving and a reserve) and, if you enter cash saved, tells you when you are short instead of naming a winner.

## [0.55.0] — 2026-11-15

- FINC-096 The rent vs own calculator now includes mortgage insurance (PMI, default 0.6% of the loan per year), charged only while the loan is above 80% of the home's value and itemized in the monthly cost.

## [0.54.0] — 2026-11-15

- FINC-093 The variable-rate mortgage calculator has a new layout: the payment range up front, grouped inputs, optional extras collapsed, tabbed charts with best, expected and worst cases, and a sticky payment bar on mobile.

## [0.53.0] — 2026-11-15

- FINC-082 The variable-rate mortgage calculator now accepts optional home price, closing costs, PMI, property tax, homeowners insurance and HOA dues, and shows a full monthly payment breakdown and the cash needed at closing.

## [0.52.2] — 2026-11-15

- FINC-090 The variable-rate mortgage calculator now says whether its totals and schedules cover the whole loan or only the remaining part, based on Months already elapsed.

## [0.52.1] — 2026-11-15

- FINC-094 The variable-rate mortgage calculator now accepts a lowest possible rate above the starting rate; the floor applies only at rate adjustments.

## [0.52.0] — 2026-11-15

- FINC-081 The variable-rate mortgage calculator now shows how much the highest payment exceeds the first (dollars and percent), the year it first hits, and the jump at the first rate change, including for a loan that is already part-way through.

## [0.51.0] — 2026-11-15

- FINC-078 The variable-rate mortgage calculator now has 3/1, 5/1, 7/1 and 10/1 ARM preset buttons that fill in the months before the first rate change and the months between changes.
- FINC-095 There is a new rent vs own calculator in the hamburger menu: enter a home price and today's rent to see whether buying or renting leaves you with more money after the years you plan to stay, with a break-even year, chart and year-by-year table.

## [0.50.0] — 2026-11-15

- FINC-089 The variable-rate mortgage calculator has a "Months already elapsed" input, so a loan you already have starts where it is today: the remaining term, the fixed-period countdown, interest-only period, extra payments and the year-by-year table all reflect its age.

## [0.49.0] — 2026-11-15

- FINC-086 The variable-rate mortgage calculator now models a monthly extra payment, an interest-only period at the start, and a refinance-timing comparison with its break-even point.

## [0.48.1] — 2026-11-15

- FINC-092 The variable-rate mortgage calculator's sliders now match the typed value exactly, and still snap to their steps when dragged.

## [0.48.0] — 2026-11-15

- FINC-084 The variable-rate mortgage calculator now keeps your inputs in the page link and in this browser, so you can share a scenario, reload without losing it, or print it.

## [0.47.0] — 2026-11-15

- FINC-088 The variable-rate mortgage calculator now has a slider on every input, shows the loan amount as $400,000, and states the absolute lifetime maximum rate.

## [0.46.0] — 2026-11-15

- FINC-080 The variable-rate mortgage calculator now shows the total of all payments, a payoff date (enter an optional loan start month), and a toggle between the annual and monthly schedules.

## [0.45.0] — 2026-11-15

- FINC-075 The variable-rate mortgage calculator now lets you pick an index (1-year Treasury, SOFR, COFI or other) and enter a margin, so each rate reset is the index plus the margin within the caps and floor.

## [0.44.1] — 2026-11-15

- FINC-087 The variable-rate mortgage calculator now has a Definitions glossary (index, margin, caps, floor, payment shock) and a short guide to how ARMs work and who they suit.

## [0.44.0] — 2026-11-15

- FINC-079 The variable-rate mortgage calculator now charts the interest rate and the monthly payment by year, marking the peak, so the year-15 peak payment is visible at a glance.
- FINC-083 The variable-rate mortgage calculator now takes the time before the first rate change and the time between rate changes in months (for example 60 and 12) instead of whole years.

## [0.43.1] — 2026-11-15

- FINC-085 The variable-rate mortgage calculator now links to current adjustable-rate mortgage rates so you have a reference for the starting rate.

## [0.43.0] — 2026-11-15

- FINC-076 The variable-rate mortgage calculator now shows best, expected and worst-case scenarios, with a payment-shock warning when the worst-case payment rises 25% or more.

## [0.42.0] — 2026-11-15

- FINC-073 The variable-rate mortgage calculator's form now keeps each label next to its input, Reset to defaults sits below the inputs, and the page no longer scrolls sideways.
- FINC-074 The variable-rate mortgage calculator now notes when the first rate change comes after the loan term, so no reset occurs and the loan behaves as fixed.
- FINC-077 The variable-rate mortgage calculator now has a separate cap for the first rate adjustment and another for each later adjustment, so a standard 2/1/5 structure can be modelled.

## [0.41.1] — 2026-11-15

- FINC-070 On the variable-rate mortgage calculator, field help is now shown only on demand through a "?" button beside each label, instead of being stuck open and covering other fields.
- FINC-071 The variable-rate mortgage calculator now warns when the lowest possible rate is above the starting rate instead of silently ignoring it.
- FINC-072 The variable-rate mortgage calculator now rejects 0 for "Years before the first rate change", so the first monthly payment always reflects the starting rate.

## [0.41.0] — 2026-11-15

- FINC-069 A hamburger menu now links to every calculator, and a new variable-rate mortgage calculator shows payment, rate and interest year by year, with rate-change, per-adjustment and lifetime caps and a floor.

## [0.40.3] — 2026-11-09

- FINC-067 An invalid new-mortgage term (or other downsize input) no longer hides the whole results area; the results show with downsize figures marked unavailable.

## [0.40.2] — 2026-11-09

- FINC-066 The downsize note no longer claims nothing is invested when proceeds fall short; it states the negative starting capital, and the waterfall always shows "Amount invested at year 0", including when negative.

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
