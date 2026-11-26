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

## [0.115.3] — 2026-11-26

- FINC-191 The rent vs own calculator no longer lets a renter who runs out of money earn the investment return on debt: the shortfall now accrues at the mortgage rate and the investment tax drag is never negative.

## [0.115.2] — 2026-11-26

- FINC-189 The rent vs own calculator now warns when your after-tax salary is higher than your gross income, so the Ramsey 25%, 33% and 28/36 checks can't silently contradict each other.

## [0.115.1] — 2026-11-26

- FINC-186 The rent vs own calculator's tax drag on investments now defaults to 0.4% per year, and a "?" tip on the field explains it (about 0.4% of the balance per year for a top-bracket California taxpayer holding a taxable S&P 500 index fund).
- FINC-187 The rent vs own calculator's "Home-sale gain excluded from tax" field now has Single ($250,000) and Married ($500,000) preset buttons that set the amount and update the results.

## [0.115.0] — 2026-11-24

- FINC-185 The rent vs own calculator's preset buttons no longer overlap, filing status is now a Single / Married filing jointly button pair that also sets the home-sale exclusion, and a new Your mortgage card tabulates each year's mortgage payments, principal, interest and remaining balance.

## [0.114.0] — 2026-11-22

- FINC-180 The rent vs own calculator now checks your first-year housing cost (principal, interest, property tax, insurance, PMI and HOA dues) against Dave Ramsey's 25% of take-home pay guideline, using your optional after-tax salary divided by 12, flags it when over, and notes his assumptions (15-year fixed, 20% down, other debt paid off, 3-6 month emergency fund).

## [0.113.0] — 2026-11-22

- FINC-182 The rent vs own calculator now has an optional 28/36 affordability check (Ramit Sethi's rule of thumb): enter your gross yearly income and other monthly debt payments to see housing and total debt as a share of gross monthly income, each flagged when over its 28% or 36% cap.

## [0.112.0] — 2026-11-22

- FINC-183 The rent vs own calculator has a new 5% Rule card on the Monthly cost tab, from Ben Felix's PWL Capital research: unrecoverable ownership costs of 5% of the home's value a year (1% property tax, 1% maintenance, 3% cost of capital) as a monthly figure next to your rent, offered as a quick rule of thumb alongside the detailed breakdown.

## [0.111.0] — 2026-11-22

- FINC-181 The rent vs own calculator now has optional after-tax salary and emergency savings inputs that show your housing cost as a share of after-tax pay against Kevin O'Leary's 33% rule, and how many months of payments your savings would cover if you lost your job (flagged under six months).

## [0.110.0] — 2026-11-19

- FINC-168 The rent vs own calculator's ZIP code field now also pre-fills home insurance from your state's Census ACS median yearly premium for owners with a mortgage (2019-2023, table B25141) as a share of median home value, with a note that premiums vary widely within a state.

## [0.109.0] — 2026-11-19

- FINC-169 The rent vs own calculator's ZIP code field now also pre-fills rent growth from your state's annualised change in Census ACS median gross rent (2014-2018 to 2019-2023), noted as a past, non-inflation-adjusted change and not a forecast.

## [0.108.0] — 2026-11-19

- FINC-178 The compound interest calculator has an optional "Increase contribution each year (%)" input that raises the monthly contribution every year while you are still contributing.

## [0.107.1] — 2026-11-19

- FINC-179 The compound interest calculator's text, selects and result tables now stay inside the margins on narrow screens: selects stack under their labels and result tables restack as cards.

## [0.107.0] — 2026-11-19

- FINC-176 The compound interest calculator has an optional marginal tax rate on interest that gives after-tax balances, chart and table.

## [0.106.0] — 2026-11-19

- FINC-177 The compound interest calculator has an optional "Return variance" input that shades a best-case/worst-case band on the chart and states the balance range.

## [0.105.0] — 2026-11-19

- FINC-175 The compound interest calculator's Compounding input now offers semiannual, quarterly, daily and continuous compounding alongside monthly and annual.

## [0.104.0] — 2026-11-18

- FINC-173 The compound interest calculator has a "contribute 20 years, then let it grow" example, a "What if I stop contributing?" FAQ answer that quotes your numbers, and a methodology note on the two-phase formula.

## [0.103.0] — 2026-11-18

- FINC-172 The compound calculator's explainer, cost-of-waiting comparison and "what moves the needle" table now follow the Contribute-for period, and say when contributions have stopped.
- FINC-170 The compound interest calculator has a "Contribute for" input: contributions stop after that many years while the balance keeps compounding to the end of Years; the headline, chart, table and link follow it.

## [0.102.1] — 2026-11-18

- FINC-171 The compound interest chart marks the year contributions stop, and years after it show $0 put in plus that year's interest on hover.

## [0.102.0] — 2026-11-18

- FINC-170 The compound interest calculator has a "Contribute for" input: contributions stop after that many years while the balance keeps compounding to the end of Years; the headline, chart, table and link follow it.

## [0.101.0] — 2026-11-18

- FINC-159 Compound calculator: choose whether contributions are made at the beginning or end of each month, and see a table of what your timing and compounding choices are worth.

## [0.100.0] — 2026-11-18

- FINC-164 The compound interest calculator has an FAQ below the results that quotes your own numbers, a sources list with as-of dates, and the standard footer.

## [0.99.0] — 2026-11-18

- FINC-158 The compound interest calculator now has a "what moves the needle" table showing the end balance for +$100 a month, +1 point of return and +5 years, each on its own.

## [0.98.0] — 2026-11-18

- FINC-157 The compound interest calculator has a cost-of-waiting comparison: the same plan started now versus 10 years later, with both end balances, contributions, the gap and two bars; it follows the today's-dollars view.

## [0.97.0] — 2026-11-18

- FINC-163 The compound interest calculator's year-by-year table now emphasizes the interest columns and highlights the crossover year, where interest to date first passes contributions to date.
- FINC-166 The home-page calculator now has the same Vanguard-style layout as the mortgage page: inputs rail with collapsible groups, a hero showing the highest net worth at the end of the horizon, summary tiles and underline tabs.
- FINC-167 Charts share one Vanguard-style treatment across all calculators: red primary line, near-black dashed comparison, grey for the rest, labels on the lines instead of a legend, hairline gridlines and 12px text.

## [0.96.0] — 2026-11-18

- FINC-156 The compound interest calculator has a "Why compounding is so powerful" section below the results that uses your own numbers: interest earning interest, the Rule of 72, how much the last years add versus the first, and when your balance passes each doubling milestone.

## [0.95.1] — 2026-11-18

- FINC-162 Compound calculator presets now state what they set

## [0.95.0] — 2026-11-18

- FINC-155 The compound interest calculator's chart is now a large stacked area of contributions and interest, with the crossover year marked and a hover tooltip that matches the year-by-year table.
- FINC-165 The rent vs own calculator has a new layout: inputs in a left rail with collapsible groups, the answer in a hero card with three headline figures, and the results in tabs (Net worth, Monthly cost, Where the difference comes from, What moves it, Table); on narrow screens the inputs stack above the results.

## [0.94.0] — 2026-11-18

- FINC-160 The compound interest calculator can show results in today's dollars: enter an inflation rate (default 3%) and switch "Show results in" to restate the future value, chart and table; the choice is saved in the shareable link.
- FINC-161 The Calculators (hamburger) menu now lists Compound interest first on every page, followed by the existing calculators in their current order.

## [0.93.0] — 2026-11-18

- FINC-153 The rent vs own, home-page and variable-rate mortgage calculators now share one Vanguard-style look (colours, fonts, square corners, red accents, dark mode), and the rent vs own preset chips are outlined with a clearly marked active one.

## [0.92.0] — 2026-11-18

- FINC-154 There is a new compound interest calculator (compound.html): enter a starting balance, monthly contribution, annual return, years and compounding frequency to see the future value, total contributed and interest earned, with a chart, year-by-year table and shareable link.

## [0.91.0] — 2026-11-18

- FINC-112 The rent vs own calculator has an optional ZIP code field that pre-fills the property tax rate from your state's average (Tax Foundation, 2024), with its source shown; clear it to return to the national default.

## [0.90.0] — 2026-11-18

- FINC-097 The rent vs own calculator now models the mortgage-interest and property-tax deduction (filing status, marginal rate, standard deduction, SALT cap) with an itemize/standard-deduction choice, and shows the Year-1 tax benefit.

## [0.89.1] — 2026-11-18

- FINC-147 Added a test that checks the rent vs own equal-cash and pure net worth summaries (winner, gap, break-even year and month) against the year-by-year table across many inputs, so a summary that contradicts its table is caught in CI. No user-visible change.

## [0.89.0] — 2026-11-18

- FINC-125 The rent vs own calculator now models the renter's security deposit (default one month's rent, editable, $0 allowed): it is returned at the end of the stay and the return it forgoes while held counts against renting.

## [0.88.0] — 2026-11-18

- FINC-103 The rent vs own headline is now the break-even point ("Buying wins if you stay at least X years Y months", or "Renting wins at every stay up to 30 years on these numbers"), found over at least 30 years whatever the length of stay, with an equivalent-rent line: the rent below which renting is better for your stay.

## [0.87.4] — 2026-11-17

- FINC-150 The rent vs own "Where the difference comes from" table now lists only the four buckets (upfront, recurring, opportunity, money back) and the total, so the values add up to the total; the parts of Recurring and the sale-tax detail moved to a separate detail table below.

## [0.87.3] — 2026-11-17

- FINC-148 The rent vs own calculator's mortgage-rate slider now matches the typed rate exactly (7.32% shows at 7.32, not 7.375), and still snaps to its steps when dragged.
- FINC-149 Backspace or delete next to a thousands comma in a dollar input now removes the digit beside the comma instead of stepping over it.

## [0.87.2] — 2026-11-17

- FINC-145 The rent vs own monthly breakdown totals are now summed from the rounded amounts shown, so the listed components always add up to the displayed total (no more $1 gaps).
- FINC-146 A bare rent vs own link (no #hash) now opens with the default inputs instead of restoring values from browser storage; links with an explicit hash and Reset behave as before.

## [0.87.1] — 2026-11-17

- FINC-144 The starting-point presets on the rent vs own calculator no longer change your mortgage rate; they set only down payment, term, length of stay and maintenance.

## [0.87.0] — 2026-11-17

- FINC-143 Dollar amount inputs on every calculator now show thousands separators (1,000,000) live as you type or paste, with the caret kept in place and backspace removing the digit beside a comma; calculations and shared links are unchanged.

## [0.86.0] — 2026-11-16

- FINC-136 The rent vs own calculator now has a Realized / Unrealized net worth toggle above the results; Realized (the default, and the basis of the verdict) deducts selling costs and sale tax, Unrealized shows home value minus loan balance, and the choice is carried in the shareable URL.

## [0.85.0] — 2026-11-16

- FINC-141 The rent vs own calculator now lets you enter the down payment as a percentage or in dollars and maintenance as a percentage of value or dollars per month, shows the loan amount beside the down payment, and keeps the choice in the shareable link.

## [0.84.0] — 2026-11-16

- FINC-135 The rent vs own calculator now has a monthly-cost chart comparing what owning and renting cost each month, with the month owning becomes cheaper marked.

## [0.83.0] — 2026-11-16

- FINC-139 The rent vs own calculator now has a "Download table (CSV)" button under the year-by-year table, exporting the columns shown, in the dollars basis shown, as rent-vs-own.csv.

## [0.82.0] — 2026-11-16

- FINC-137 The rent vs own calculator now shows which input moves the answer most: mortgage rate, home growth, rent growth, investment return and stay length each moved down and up, with the break-even year and a bar for the swing in the end-of-stay gap.
- FINC-140 The rent vs own calculator now has an FAQ answering seven common questions with the page's own live numbers, plus a sources list with links and as-of dates.
- FINC-142 The rent vs own "Where the difference comes from" table now shows the parts of the Recurring bucket (and the home-sale tax detail) in a separate column, so the four bucket lines add up to the total.

## [0.81.0] — 2026-11-16

- FINC-132 The rent vs own calculator now has an adjustable-rate mortgage option that reuses the variable-rate calculator's fields (start rate, fixed months, index and margin, caps and floor), with fixed vs ARM shown side by side.

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
