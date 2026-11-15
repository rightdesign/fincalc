# Paul's Financial Calculators



## Contributor notes

### Adding a results card to the rent vs own page

Each card on `site/rent-vs-own.html` is its own module, so branches that add or change different cards do not touch the same lines.

1. Add `site/rentown/<name>.js` exporting one function that takes the context from `site/rentown/context.js` (`v` inputs, `r` result, `today`, `final`, `label`, `span`) and returns the card's markup. Shared formatting lives in `site/rentown/format.js`.
2. Add one import and one line to `CARDS` in `site/rentown/cards.js`, in the position the card should appear.
3. If the card needs new model output, add it to `compareRentOwn()` in `site/rentown.js` as one new line in the returned object.
4. Add one new `<li>` to the methodology list in `site/rent-vs-own.html`. Do not extend an existing item.
5. Add `test/rentown-<name>.test.mjs` for the feature. `test/rentown.test.mjs` is only for the core model. `npm test` picks up every `test/*.test.mjs`.
