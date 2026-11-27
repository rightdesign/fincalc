# Paul's Financial Calculators

## Contributor notes

### Formatting and the commit check

The JavaScript, HTML, CSS and tests are formatted with [Prettier](https://prettier.io) (`.prettierrc.json`). Formatting keeps lines short and puts one import, one object property or one argument per line where they do not fit, so two branches that touch the same area conflict far less often.

- `npm run format` rewrites the files. Run it before you commit.
- `npm run lint` checks them and changes nothing. `npm test` runs it first, so the crew's test gate and the Pages workflow both fail on unformatted code.
- `npm ci` (or `npm install`) points git at `.githooks/`, whose `pre-commit` hook runs `npm run lint` and refuses the commit if it fails. In a checkout where the dependencies are not installed the hook says so and lets the commit through; `npm test` still catches it.
- `CHANGELOG.md` and `site/data/` are not formatted (`.prettierignore`): the release and the update scripts write them.

A branch cut before the formatting landed conflicts with it on nearly every line. To bring one up to date: merge the commit just before the formatting commit and resolve as usual, run `npm run format` and commit, then merge the formatting commit with `git merge -s ours <sha>` (the branch is already formatted, so its side is the right one), and finally merge the rest of the base branch.

### Adding to the compound interest calculator

Put a feature's tests in their own file, `test/compound-<name>.test.mjs`, the way the rent vs own page does. `test/compound.test.mjs` is for the core model; every branch appending to the end of it is what made them all conflict there.

### Adding a results card to the rent vs own page

Each card on `site/rent-vs-own.html` is its own module, so branches that add or change different cards do not touch the same lines.

1. Add `site/rentown/<name>.js` exporting one function that takes the context from `site/rentown/context.js` (`v` inputs, `r` result, `today`, `final`, `label`, `span`) and returns the card's markup. Shared formatting lives in `site/rentown/format.js`.
2. Add one import and one line to `CARDS` in `site/rentown/cards.js`, in the position the card should appear.
3. If the card needs new model output, add it to `compareRentOwn()` in `site/rentown.js` as one new line in the returned object.
4. Add one new `<li>` to the methodology list in `site/rent-vs-own.html`. Do not extend an existing item.
5. Add `test/rentown-<name>.test.mjs` for the feature. `test/rentown.test.mjs` is only for the core model. `npm test` picks up every `test/*.test.mjs`.

### Refreshing the default mortgage rate

The rent vs own page defaults its mortgage rate to the latest Freddie Mac 30-year fixed average, read from `site/data/rates.json` (falling back to a built-in 6.5% if the file cannot be read). Update it weekly, or at least monthly, with `node scripts/update-rate.mjs` (pulls the FRED series `MORTGAGE30US`), commit the change and release as usual.
