import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { ARM_PRESETS, MORTGAGE_FIELDS, addMonths, decodeMortgage, encodeMortgage, extraSavings, groupAmount, invalidFields, loanProblem, maxRate, mortgageDefaults, parseAmount, payment, priceProblem, rateAfter, refinance, scenarios, scopeNote, simulate } from '../site/mortgage.js';
import { mortgageChart, mortgageScenarioChart } from '../site/mortgage-chart.js';
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

test('a floor above the starting rate applies only at resets', () => {
  const v = { ...mortgageDefaults(), initialRate: 2.225, floor: 3, fixedMonths: 20, adjustMonths: 6, firstCap: 5, periodicCap: 1, lifetimeCap: 5, rateBasis: 'change', change: -1 };
  assert.equal(rateAfter(v, 0), 2.225);
  assert.equal(rateAfter(v, 1), 3);
  const r = simulate(v);
  assert.equal(r.years[0].rate, 2.225);
  assert.equal(r.monthly[19].rate, 2.225);
  assert.equal(r.monthly[20].rate, 3);
});

test('the menu lists every calculator, and each page exists', () => {
  const html = menuHtml('mortgage.html');
  for (const c of CALCULATORS) {
    assert.ok(html.includes(`href="${c.href}"`));
    assert.ok(readFileSync(new URL(`../site/${c.href}`, import.meta.url), 'utf8').includes('menu.js'));
  }
  assert.ok(html.includes('aria-current="page">Variable-rate'));
});

test('payment-shock figures: peak year and first reset', () => {
  const r = simulate({ ...mortgageDefaults(), rateBasis: 'change', change: 0.5 });
  assert.equal(r.firstReset.year, 6);
  assert.equal(r.firstReset.payment, r.years[5].payment);
  assert.equal(r.maxPaymentYear, 15);
  assert.equal(simulate(mortgageDefaults()).maxPaymentYear, 20);
  const flat = simulate({ ...mortgageDefaults(), rateBasis: 'change', change: -0.5 });
  assert.equal(flat.maxPaymentYear, 1);
  assert.ok(r.maxPayment > r.firstPayment);
  const short = simulate({ ...mortgageDefaults(), term: 5, fixedMonths: 60 });
  assert.equal(short.firstReset, undefined);
  // A change that falls mid-year reports the payment from the month it takes effect.
  const mid = simulate({ ...mortgageDefaults(), fixedMonths: 18, adjustMonths: 6, rateBasis: 'change', change: 0.5 });
  assert.equal(mid.firstReset.year, 2);
  assert.equal(mid.firstReset.payment, mid.monthly[18].scheduled);
  // An extra payment that clears the loan before the first change leaves no reset to report.
  const early = simulate({ ...mortgageDefaults(), extra: 20000 });
  assert.equal(early.firstReset, undefined);
  assert.equal(early.maxPaymentYear, 1);
});

test('payment-shock figures count from the loan start when months have already elapsed', () => {
  const base = { ...mortgageDefaults(), rateBasis: 'change', change: 0.5 };
  const fresh = simulate(base);
  // The first change is still ahead: 36 months from today, loan month 61.
  const ahead = simulate({ ...base, elapsed: 24 });
  assert.equal(ahead.firstReset.year, 6);
  assert.equal(ahead.firstReset.payment, ahead.monthly[36].scheduled);
  assert.equal(ahead.monthly[36].month, 61);
  // The peak is the same month of the same loan, so it lands in the same loan year.
  assert.equal(ahead.maxPaymentYear, fresh.maxPaymentYear);
  // The change falls on the first month shown.
  const now = simulate({ ...base, elapsed: 60 });
  assert.equal(now.firstReset.payment, now.monthly[0].scheduled);
  // The fixed period is already over: no upcoming first change to report.
  assert.equal(simulate({ ...base, elapsed: 70 }).firstReset, undefined);
  assert.equal(fresh.firstReset.year, 6);
});

test('ARM presets set the months before the first change and a 12-month adjustment', () => {
  assert.deepEqual(ARM_PRESETS.map((p) => p.label), ['3/1 ARM', '5/1 ARM', '7/1 ARM', '10/1 ARM']);
  assert.deepEqual(ARM_PRESETS.map((p) => p.fixedMonths), [36, 60, 84, 120]);
  assert.ok(ARM_PRESETS.every((p) => p.adjustMonths === 12));
  const r = simulate({ ...mortgageDefaults(), fixedMonths: 84, adjustMonths: 12 });
  near(r.years[6].payment, r.years[0].payment);
  assert.ok(r.years[7].payment > r.years[6].payment);
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

test('the scenario chart draws best, expected and worst with direct labels and the first reset', () => {
  const sc = scenarios(mortgageDefaults());
  const series = [['Best', 'best'], ['Expected', 'expected'], ['Worst', 'worst']].map(([name, style]) => ({ name, style, years: sc[style].years }));
  const c = mortgageScenarioChart(series, { key: 'payment', title: 'Monthly payment by year', fmt: (n) => `$${Math.round(n)}`, resetYear: sc.expected.firstReset.year });
  assert.match(c.svg, /<svg[^>]*role="img"/);
  assert.equal((c.svg.match(/<path /g) || []).length, 3);
  for (const name of ['Best', 'Expected', 'Worst']) assert.ok(c.svg.includes(`>${name}</text>`), `${name} is labelled`);
  assert.ok(c.svg.includes(`First reset, year ${sc.expected.firstReset.year}`));
  assert.ok(!c.svg.includes('NaN'));
  assert.ok(c.description.includes('worst ends at'));
  const flat = scenarios({ ...mortgageDefaults(), firstCap: 0, periodicCap: 0 });
  const f = mortgageScenarioChart([{ name: 'Expected', style: 'expected', years: flat.expected.years }], { key: 'rate', title: 'Rate', fmt: String });
  assert.ok(!f.svg.includes('NaN'));
});

test('the mortgage page charts payment, rate and balance and groups its inputs', () => {
  const src = readFileSync(new URL('../site/mortgage-app.js', import.meta.url), 'utf8');
  for (const key of ['payment', 'rate', 'balance']) assert.ok(src.includes(`chart('${key}'`), `${key} chart`);
  for (const id of MORTGAGE_FIELDS.map((f) => f.id)) assert.ok(src.includes(`'${id}'`), `${id} is placed in a group`);
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

test('optional extras default to nothing and leave the payment unchanged', () => {
  const r = simulate(mortgageDefaults());
  assert.equal(r.hasExtras, false);
  assert.equal(r.firstTotal, r.firstPayment);
  assert.equal(r.cashToClose, 0);
});

test('tax, insurance and HOA add to the monthly total', () => {
  const v = { ...mortgageDefaults(), propertyTax: 6000, insurance: 1200, hoa: 100 };
  const r = simulate(v);
  near(r.escrow, 700);
  near(r.firstTotal, r.firstPayment + 700);
  near(r.years[10].total, r.years[10].payment + 700);
});

test('PMI is charged until the balance reaches 80% of the home price, then drops', () => {
  const v = { ...mortgageDefaults(), homePrice: 450000, pmiRate: 0.6, change: 0 };
  const r = simulate(v);
  near(r.firstPmi, 400000 * 0.006 / 12);
  assert.ok(r.pmiMonths > 0 && r.pmiMonths < 360);
  assert.equal(r.years[29].pmi, 0);
  near(r.totalPmi, r.pmiMonths * 200);
  assert.equal(r.downPayment, 50000);
});

test('the first month\'s PMI is reported even when PMI ends within year 1', () => {
  const r = simulate({ ...mortgageDefaults(), homePrice: 497000, pmiRate: 0.6 });
  assert.ok(r.pmiMonths > 0 && r.pmiMonths < 12);
  near(r.firstPmi, 200);
  near(r.firstTotal, r.firstPayment + r.firstPmi + r.escrow);
});

test('the first month\'s PMI is reported when months have already elapsed', () => {
  const base = { ...mortgageDefaults(), loan: 400000, homePrice: 480000, pmiRate: 0.5, propertyTax: 6000, insurance: 1200, hoa: 100 };
  const r = simulate({ ...base, elapsed: 12 });
  near(r.firstPmi, 166.67);
  assert.ok(r.firstTotal > r.firstPayment + r.escrow + 166);
  near(r.firstTotal, r.firstPayment + r.firstPmi + r.escrow);
});

test('cash at closing is the down payment plus closing costs', () => {
  const r = simulate({ ...mortgageDefaults(), homePrice: 500000, closingCosts: 8000 });
  assert.equal(r.cashToClose, 108000);
});

test('PMI needs a home price and the price cannot be below the loan', () => {
  assert.ok(priceProblem({ ...mortgageDefaults(), pmiRate: 0.5 }));
  assert.ok(priceProblem({ ...mortgageDefaults(), homePrice: 300000 }));
  assert.equal(priceProblem({ ...mortgageDefaults(), homePrice: 500000, pmiRate: 0.5 }), '');
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
  const manual = simulate({ ...base, loan: aged.startBalance, term: 25, fixedMonths: 24 });
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

test('the scope note matches where the schedule starts', () => {
  const d = mortgageDefaults();
  assert.match(scopeNote(d), /whole loan as entered/);
  assert.equal(simulate(d).years[0].year, 1);
  const aged = { ...d, elapsed: 60 };
  assert.match(scopeNote(aged), /month 61 .*first 60 months .*year 6/);
  assert.equal(simulate(aged).years[0].year, 6);
});

const SMILEY = { ...mortgageDefaults(), loan: 1155000, term: 30, initialRate: 2, fixedMonths: 84, adjustMonths: 12, indexName: 'custom', indexRate: 4, margin: 2.25, firstCap: 5, periodicCap: 2, floor: 2.25 };
const DRAKE = { ...mortgageDefaults(), loan: 1496000, term: 30, initialRate: 2.225, fixedMonths: 84, adjustMonths: 6, indexName: 'sofr', indexRate: 4.3, margin: 3, firstCap: 5, periodicCap: 1, floor: 3 };

test('the balance today is derived from the original loan and the payments made', () => {
  const smiley = simulate({ ...SMILEY, elapsed: 74 });
  near(smiley.startBalance, 971090, 600); // the servicer's figure differs by a few hundred dollars of rounding
  near(smiley.firstPayment, 4269.11, 0.01);
  assert.equal(smiley.firstReset.year, 8);
  const drake = simulate({ ...DRAKE, elapsed: 63 });
  near(drake.startBalance, 1300681, 150);
  near(drake.firstPayment, 5699.35, 0.01);
  assert.equal(simulate({ ...SMILEY, elapsed: 0 }).startBalance, 1155000);
});

test('a manually entered balance takes precedence over the derived one', () => {
  const r = simulate({ ...SMILEY, elapsed: 74, balance: 900000 });
  assert.equal(r.startBalance, 900000);
  assert.equal(r.monthly[0].balance < 900000, true);
  assert.equal(simulate({ ...SMILEY, elapsed: 74, balance: 0 }).startBalance, simulate({ ...SMILEY, elapsed: 74 }).startBalance);
});

test('the elapsed count and the original amount round-trip through the link', () => {
  const v = { ...SMILEY, elapsed: 74 };
  assert.deepEqual(decodeMortgage(encodeMortgage(v)), v);
  assert.match(encodeMortgage(v), /loan=1155000&elapsed=74/);
});

test('interest-only for the whole loan pays interest every month and a balloon at the end', () => {
  const v = { ...fixedLoan, ioLife: 'yes' };
  const r = simulate(v);
  assert.equal(r.monthly.length, 360);
  near(r.monthly[0].scheduled, 400000 * 0.055 / 12);
  near(r.monthly[358].balance, 400000);
  near(r.monthly[359].scheduled, 400000 * 0.055 / 12);
  near(r.balloon, 400000);
  near(r.monthly[359].balance, 0);
  near(r.totalInterest, 400000 * 0.055 * 30);
  assert.equal(loanProblem({ ...v, ioMonths: 360 }), '');
  assert.equal(simulate(fixedLoan).balloon, 0);
});

test('interest-only for the whole loan survives the shared link round trip', () => {
  const v = { ...mortgageDefaults(), ioLife: 'yes' };
  assert.equal(encodeMortgage(v), 'ioLife=yes');
  assert.equal(decodeMortgage('ioLife=yes').ioLife, 'yes');
  assert.equal(decodeMortgage('ioLife=bogus').ioLife, 'no');
});

test('groupAmount adds commas as digits are typed and leaves non-numbers alone', () => {
  assert.equal(groupAmount('1700000'), '1,700,000');
  assert.equal(groupAmount('17000000'), '17,000,000');
  assert.equal(groupAmount('1,7000'), '17,000');
  assert.equal(groupAmount('$400000.50'), '400,000.50');
  assert.equal(groupAmount('1234.'), '1,234.');
  assert.equal(groupAmount('999'), '999');
  assert.equal(groupAmount(''), '');
  assert.equal(groupAmount('12a3'), '12a3');
  assert.equal(groupAmount('-5000'), '-5000');
  assert.equal(parseAmount(groupAmount('1700000')), 1700000);
});

test('the final schedule row, counted from the loan start, is the payoff month even with elapsed months', () => {
  const r = simulate({ ...mortgageDefaults(), elapsed: 75, ioMonths: 120 });
  const last = r.monthly[r.monthly.length - 1];
  assert.equal(last.month, 360);
  assert.notEqual(r.payoffMonths, last.month); // the row count is only the months still to pay
  assert.equal(addMonths('2020-08', last.month - 1), '2050-07');
});
