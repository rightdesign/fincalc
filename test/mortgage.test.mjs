import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { MORTGAGE_FIELDS, addMonths, decodeMortgage, encodeMortgage, extraSavings, floorProblem, invalidFields, loanProblem, maxRate, mortgageDefaults, parseAmount, payment, rateAfter, refinance, scenarios, simulate } from '../site/mortgage.js';
import { mortgageChart } from '../site/mortgage-chart.js';
import { CALCULATORS, menuHtml } from '../site/menu.js';

const near = (a, b, eps = 0.01) => assert.ok(Math.abs(a - b) < eps, `${a} != ${b}`);

test('payment matches the standard amortizing formula and handles 0%', () => {
  near(payment(100000, 6, 360), 599.55);
  near(payment(1200, 0, 12), 100);
});

test('with no rate change the loan equals a fixed loan and pays off exactly', () => {
  const v = { ...mortgageDefaults(), rateBasis: 'change', change: 0 };
  const r = simulate(v);
  near(r.extraInterest, 0, 0.5);
  assert.equal(r.years.length, 30);
  near(r.years[29].balance, 0);
  near(r.years.reduce((s, y) => s + y.principal, 0), v.loan, 0.5);
});

test('rising rates raise the payment after the initial period and total interest', () => {
  const r = simulate(mortgageDefaults());
  near(r.years[0].payment, r.years[4].payment);
  assert.ok(r.years[5].payment > r.years[4].payment);
  assert.ok(r.extraInterest > 0);
  near(r.years[29].balance, 0);
});

test('caps and floor limit the rate', () => {
  const v = { ...mortgageDefaults(), rateBasis: 'change', change: 3, firstCap: 1, periodicCap: 1, lifetimeCap: 2.5 };
  assert.equal(rateAfter(v, 1), 6.5);
  assert.equal(rateAfter(v, 10), 8);
  assert.equal(rateAfter({ ...v, change: -5, firstCap: 5, periodicCap: 5 }, 10), 2);
});

test('the first adjustment has its own cap', () => {
  const v = { ...mortgageDefaults(), rateBasis: 'change', change: 3, firstCap: 2, periodicCap: 1, lifetimeCap: 5 };
  assert.equal(rateAfter(v, 1), 7.5);
  assert.equal(rateAfter(v, 2), 8.5);
  assert.equal(rateAfter(v, 3), 9.5);
  assert.equal(rateAfter(v, 4), 10.5);
});

test('index + margin sets the rate at each reset, within the caps and floor', () => {
  const v = { ...mortgageDefaults(), rateBasis: 'index', indexRate: 4, margin: 2.75, indexChange: 0.25, initialRate: 5.5, firstCap: 2, periodicCap: 2, lifetimeCap: 5, floor: 2 };
  near(rateAfter(v, 1), 7, 1e-9); // 4.25 + 2.75
  near(rateAfter(v, 2), 7.25, 1e-9);
  assert.equal(rateAfter({ ...v, indexRate: 8 }, 1), 7.5); // target 11 limited by the 2-point cap
  assert.equal(rateAfter({ ...v, indexRate: 8, firstCap: 10, periodicCap: 10 }, 1), 10.5); // limited by the lifetime cap
  assert.equal(rateAfter({ ...v, indexRate: 0, indexChange: 0, margin: 0, firstCap: 10, periodicCap: 10 }, 1), 2); // floor
  const r = simulate(v);
  near(r.years[5].rate, 7);
  near(r.years[29].balance, 0);
});

test('hidden fields are not validated, and an unknown index is rejected', () => {
  const v = { ...mortgageDefaults(), change: NaN };
  assert.deepEqual(invalidFields(v), []);
  assert.equal(invalidFields({ ...v, rateBasis: 'nope' }).length, 1);
});

test('invalid values are named', () => {
  assert.deepEqual(invalidFields(mortgageDefaults()), []);
  assert.equal(invalidFields({ ...mortgageDefaults(), loan: NaN, term: 2.5 }).length, 2);
  assert.deepEqual(invalidFields({ ...mortgageDefaults(), fixedMonths: 0 }), ['Months before the first rate change']);
});

test('a floor above the starting rate is reported', () => {
  assert.equal(floorProblem(mortgageDefaults()), '');
  assert.equal(floorProblem({ ...mortgageDefaults(), floor: 5.5 }), '');
  assert.match(floorProblem({ ...mortgageDefaults(), floor: 7 }), /above the starting rate/);
});

test('the menu lists every calculator, and each page exists', () => {
  const html = menuHtml('mortgage.html');
  for (const c of CALCULATORS) {
    assert.ok(html.includes(`href="${c.href}"`));
    assert.ok(readFileSync(new URL(`../site/${c.href}`, import.meta.url), 'utf8').includes('menu.js'));
  }
  assert.ok(html.includes('aria-current="page">Variable-rate'));
});

test('total paid is principal plus interest and the monthly schedule matches the yearly one', () => {
  const v = mortgageDefaults();
  const r = simulate(v);
  near(r.totalPaid, v.loan + r.totalInterest);
  assert.equal(r.monthly.length, 360);
  near(r.monthly.reduce((s, m) => s + m.interest, 0), r.totalInterest);
  near(r.monthly.reduce((s, m) => s + m.payment, 0), r.totalPaid, 1);
  near(r.monthly[359].balance, 0);
});

test('addMonths gives the calendar month and rejects a bad start', () => {
  assert.equal(addMonths('2026-11', 359), '2056-10');
  assert.equal(addMonths('2026-01', 0), '2026-01');
  assert.equal(addMonths('', 5), '');
});

test('the mortgage charts mark the peak payment and describe themselves', () => {
  const r = simulate({ ...mortgageDefaults(), rateBasis: 'change' });
  const c = mortgageChart(r.years, { key: 'payment', title: 'Monthly payment by year', fmt: (n) => `$${Math.round(n)}` });
  assert.match(c.svg, /<svg[^>]*role="img"/);
  assert.ok(c.svg.includes(`Peak: $${Math.round(r.maxPayment)}, year 15`));
  assert.ok(c.description.includes(`peaks at $${Math.round(r.maxPayment)} in year 15`));
  const flat = mortgageChart(simulate({ ...mortgageDefaults(), rateBasis: 'change', change: 0 }).years, { key: 'rate', title: 'Rate', fmt: String });
  assert.ok(!flat.svg.includes('NaN'));
  const rate = mortgageChart(r.years, { key: 'rate', title: 'Rate', fmt: (n) => `${n.toFixed(1)}%` });
  assert.ok(rate.svg.includes('Peak: 10.5%, year 15'));
});

test('the mortgage page renders both charts', () => {
  const src = readFileSync(new URL('../site/mortgage-app.js', import.meta.url), 'utf8');
  assert.match(src, /key: 'rate'/);
  assert.match(src, /key: 'payment'/);
});

test('best, expected and worst cases bracket the expected path', () => {
  const sc = scenarios(mortgageDefaults());
  assert.equal(sc.worst.maxRate, 10.5);
  assert.equal(sc.best.maxRate, 5.5);
  assert.equal(sc.best.years[29].rate, 2);
  assert.ok(sc.best.maxPayment <= sc.expected.maxPayment && sc.expected.maxPayment < sc.worst.maxPayment);
  assert.ok(sc.best.totalInterest < sc.expected.totalInterest && sc.expected.totalInterest < sc.worst.totalInterest);
  assert.ok(sc.worst.shock > 0.25);
  near(sc.worst.years[29].balance, 0);
});

test('best and worst cases ignore the index path; expected follows it', () => {
  const d = mortgageDefaults();
  const idx = scenarios({ ...d, rateBasis: 'index' });
  const chg = scenarios({ ...d, rateBasis: 'change' });
  assert.equal(idx.worst.maxRate, chg.worst.maxRate);
  assert.equal(idx.best.maxRate, chg.best.maxRate);
  assert.equal(idx.expected.maxRate, simulate({ ...d, rateBasis: 'index' }).maxRate);
});

test('a first rate change at or past the end of the term never resets', () => {
  const d = mortgageDefaults();
  assert.equal(simulate(d).noReset, false);
  assert.equal(simulate({ ...d, fixedMonths: 480 }).noReset, true);
  assert.equal(simulate({ ...d, fixedMonths: 360 }).noReset, true);
  near(simulate({ ...d, fixedMonths: 480 }).extraInterest, 0);
});

test('rate changes can fall on month counts that are not whole years', () => {
  const d = { ...mortgageDefaults(), rateBasis: 'change', fixedMonths: 18, adjustMonths: 6 };
  const r = simulate(d);
  assert.equal(r.years[0].rate, 5.5);
  assert.equal(r.years[1].rate, 6); // the reset at month 18 falls inside year 2
  assert.equal(invalidFields({ ...d, fixedMonths: 18.5 }).length, 1);
});

test('inputs round-trip through the URL fragment and only changed values are written', () => {
  assert.equal(encodeMortgage(mortgageDefaults()), '');
  const v = { ...mortgageDefaults(), loan: 650000, change: -0.25 };
  assert.equal(encodeMortgage(v), 'loan=650000&change=-0.25');
  assert.deepEqual(decodeMortgage('#loan=650000&change=-0.25'), v);
});

test('select inputs round-trip and an unknown option falls back to the default', () => {
  const v = { ...mortgageDefaults(), rateBasis: 'change', indexName: 'sofr', indexRate: 4.3 };
  assert.equal(encodeMortgage(v), 'rateBasis=change&indexName=sofr&indexRate=4.3');
  assert.deepEqual(decodeMortgage(encodeMortgage(v)), v);
  assert.deepEqual(decodeMortgage('#rateBasis=bogus&indexName=nope'), mortgageDefaults());
});

test('decoding ignores unknown, blank and non-numeric values', () => {
  assert.deepEqual(decodeMortgage('?loan=abc&term=&bogus=1'), mortgageDefaults());
  assert.deepEqual(decodeMortgage(undefined), mortgageDefaults());
});

test('parseAmount reads formatted dollar amounts and rejects blanks', () => {
  assert.equal(parseAmount('$400,000'), 400000);
  assert.equal(parseAmount(' 400000 '), 400000);
  assert.equal(parseAmount('5.5'), 5.5);
  assert.ok(Number.isNaN(parseAmount('')));
  assert.ok(Number.isNaN(parseAmount('abc')));
});

test('maxRate is the starting rate plus the lifetime cap', () => {
  assert.equal(maxRate(mortgageDefaults()), 10.5);
});

test('every numeric mortgage input has a slider that holds its default within the field limits', () => {
  for (const f of MORTGAGE_FIELDS.filter((x) => x.type !== 'select')) {
    assert.ok(f.slider, `${f.id} has a slider`);
    assert.ok(f.value >= f.slider.min && f.value <= f.slider.max, `${f.id} default is on its slider`);
    assert.ok(f.slider.min >= f.min && (f.max === undefined || f.slider.max <= f.max), `${f.id} slider stays within limits`);
  }
});

test('months already elapsed shortens the term and the fixed period', () => {
  const base = { ...mortgageDefaults(), loan: 1516256, term: 30, initialRate: 2.25, fixedMonths: 84, lifetimeCap: 5 };
  const aged = simulate({ ...base, elapsed: 60 });
  const manual = simulate({ ...base, term: 25, fixedMonths: 24 });
  assert.equal(aged.remaining, 300);
  assert.equal(aged.months, 360);
  assert.ok(Math.abs(aged.totalInterest - manual.totalInterest) < 1e-6);
  assert.equal(aged.years[0].year, 6); // starts in year 6 of the original loan
  assert.equal(aged.monthly[0].month, 61);
  assert.equal(aged.monthly.length, 300);
});

test('a loan already past its fixed period starts at the reset rate', () => {
  const d = { ...mortgageDefaults(), rateBasis: 'change', change: 0.5, fixedMonths: 12, adjustMonths: 12, elapsed: 30 };
  const r = simulate(d);
  assert.equal(r.monthly[0].rate, 6.5); // resets at months 12 and 24 already happened
  assert.equal(r.monthly.find((m) => m.month === 37).rate, 7); // next reset at month 36
});

test('elapsed months must be a whole number below the term', () => {
  const d = mortgageDefaults();
  assert.equal(invalidFields({ ...d, elapsed: 360 }).length, 1);
  assert.equal(invalidFields({ ...d, elapsed: 359 }).length, 0);
  assert.equal(invalidFields({ ...d, elapsed: -1 }).length, 1);
  assert.equal(encodeMortgage({ ...d, elapsed: 60 }), 'elapsed=60');
});

const fixedLoan = { ...mortgageDefaults(), rateBasis: 'change', change: 0 };

test('an extra monthly payment shortens the loan, saves interest and leaves the required payment alone', () => {
  const base = simulate(fixedLoan);
  const r = simulate({ ...fixedLoan, extra: 500 });
  assert.ok(r.payoffMonths < 360);
  assert.equal(r.monthly.length, r.payoffMonths);
  near(r.monthly[r.payoffMonths - 1].balance, 0);
  near(r.monthly.reduce((s, m) => s + m.principal, 0), fixedLoan.loan, 0.5);
  near(r.firstPayment, base.firstPayment);
  near(r.monthly[0].payment, base.firstPayment + 500);
  assert.ok(r.totalInterest < base.totalInterest);
  const s = extraSavings({ ...fixedLoan, extra: 500 });
  near(s.interestSaved, base.totalInterest - r.totalInterest);
  assert.equal(s.monthsSaved, 360 - r.payoffMonths);
  assert.equal(extraSavings(fixedLoan).monthsSaved, 0);
});

test('an interest-only period pays interest first, then jumps to a payment that repays the loan', () => {
  const v = { ...fixedLoan, ioMonths: 60 };
  const r = simulate(v);
  near(r.monthly[0].payment, 400000 * 0.055 / 12);
  near(r.monthly[59].balance, 400000);
  assert.ok(r.monthly[60].payment > r.monthly[59].payment);
  near(r.monthly[60].payment, payment(400000, 5.5, 300));
  near(r.monthly[359].balance, 0);
  assert.equal(r.firstPayment, r.monthly[0].scheduled);
  assert.ok(r.totalInterest > simulate(fixedLoan).totalInterest);
});

test('interest-only combines with resets and extra payments', () => {
  const r = simulate({ ...mortgageDefaults(), ioMonths: 72, extra: 200 });
  near(r.monthly[0].principal, 200);
  assert.ok(r.monthly[71].balance < 400000);
  near(r.monthly[r.payoffMonths - 1].balance, 0);
});

test('an interest-only period as long as the loan is reported', () => {
  assert.equal(loanProblem(mortgageDefaults()), '');
  assert.match(loanProblem({ ...mortgageDefaults(), ioMonths: 360 }), /shorter than the loan term/);
  assert.match(loanProblem({ ...mortgageDefaults(), refiMonth: 400 }), /nothing to refinance/);
});

test('refinancing reports the balance, the new payment, the totals and the break-even month', () => {
  assert.equal(refinance(mortgageDefaults()), null);
  const v = { ...fixedLoan, refiMonth: 60, refiRate: 4.5, refiTerm: 25, refiCosts: 4000 };
  const r = refinance(v);
  near(r.balance, simulate(fixedLoan).monthly[59].balance);
  near(r.refiPayment, payment(r.balance, 4.5, 300));
  near(r.stayPayment, payment(400000, 5.5, 360));
  assert.ok(r.refiPayment < r.stayPayment);
  assert.equal(r.refiMonths, 300);
  assert.equal(r.stayMonths, 300);
  near(r.savings, r.stayTotal - r.refiTotal);
  assert.ok(r.savings > 0);
  assert.ok(r.breakEvenMonths > 0 && r.breakEvenMonths < 60);
  const cum = (rate) => refinance({ ...v, refiRate: rate });
  assert.equal(cum(5.5).breakEvenMonths, null); // same rate, so the costs are never recovered
  assert.equal(refinance({ ...v, refiCosts: 0 }).breakEvenMonths, 0);
});

test('refinancing keeps the monthly extra payment on both loans', () => {
  const v = { ...fixedLoan, extra: 300, refiMonth: 36, refiRate: 5, refiTerm: 30, refiCosts: 0 };
  const r = refinance(v);
  assert.ok(r.refiMonths < 360 && r.stayMonths < 360 - 36);
  near(r.refiPayment, payment(r.balance, 5, 360) + 300);
});

test('the new options round-trip and only show the refinance fields when asked', () => {
  const v = { ...mortgageDefaults(), extra: 250, ioMonths: 24, refiMonth: 48 };
  assert.equal(encodeMortgage(v), 'extra=250&ioMonths=24&refiMonth=48');
  assert.deepEqual(decodeMortgage(encodeMortgage(v)), v);
  assert.deepEqual(invalidFields(mortgageDefaults()), []);
  assert.deepEqual(invalidFields({ ...mortgageDefaults(), refiRate: NaN }), []);
  assert.deepEqual(invalidFields({ ...mortgageDefaults(), refiMonth: 12, refiRate: NaN }), ['New fixed rate (%)']);
  assert.deepEqual(invalidFields({ ...mortgageDefaults(), extra: -5 }), ['Extra payment each month ($)']);
});

test('elapsed months combine with an interest-only period and extra payments', () => {
  const v = { ...mortgageDefaults(), rateBasis: 'change', change: 0, ioMonths: 24, elapsed: 12, extra: 100 };
  const r = simulate(v);
  assert.equal(r.monthly[0].month, 13);
  near(r.monthly[0].scheduled, 400000 * 0.055 / 12); // still interest-only for 12 more months
  assert.ok(r.monthly[12].scheduled > r.monthly[11].scheduled); // month 25 starts repaying
  near(r.monthly[r.payoffMonths - 1].balance, 0);
});
