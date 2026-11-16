// "Rent now, buy in N years": a third path next to buy-now and rent-forever. Pure functions, no DOM.
// For the first N years it is the equal-cash renter (rent paid, the rest of the owning budget invested,
// same tax drag and sale tax). At the start of month N * 12 + 1 it sells the investments (paying the
// capital gains tax), buys the same home at its appreciated price with that cash as closing costs plus
// down payment, and takes a new loan on the balance at `waitRate` (blank: the mortgage rate). From then
// on it owns, and the budget stays the buy-now owning cost, so any difference from the new loan is
// invested or drawn from the investments just as the renter's is. Years run to the end of the model.
import { compareRentOwn } from './rentown.js';
import { payment } from './mortgage.js';

// The first year after which buying now is never the lowest of the three, or null if it still is at the end.
function stopsBeingWorst(rows) {
  const worst = rows.map((y) => y.own < y.rent && y.own < y.later);
  const last = worst.lastIndexOf(true);
  return last === rows.length - 1 ? null : rows[last + 1].year;
}

export function compareRentThenBuy(v, base = compareRentOwn(v)) {
  const wait = v.waitYears * 12;
  const rate = v.waitRate ?? v.rate;
  const monthlyRate = rate / 100 / 12;
  const growth = (1 + v.growth / 100) ** (1 / 12);
  const invest = (1 + v.investment / 100) ** (1 / 12);
  const dragRate = v.investDrag / 100 / 12;
  const capGains = v.capGains / 100;
  let portfolio = v.price * (v.down / 100 + v.closing / 100);
  let basis = portfolio;
  let value = v.price;
  let owned = false;
  let boughtAt = null;
  let balance = 0;
  let loan = 0;
  let pay = 0;
  let repairs = 0;
  let homeBasis = 0;
  let monthsOwned = 0;
  const rows = [];
  for (let m = 1; m <= base.series.length; m += 1) {
    if (!owned && m === wait + 1) {
      // Buy: the investments are sold, so the gain is taxed, and what is left pays closing costs and the down payment.
      const cash = Math.max(0, portfolio - Math.max(0, portfolio - basis) * capGains);
      const closing = (value * v.closing) / 100;
      const down = Math.min(value, Math.max(0, cash - closing));
      loan = value - down + Math.max(0, closing - cash);
      balance = loan;
      pay = payment(loan, rate, v.term * 12);
      portfolio = Math.max(0, cash - closing - down);
      basis = portfolio;
      homeBasis = value + closing;
      boughtAt = m;
      owned = true;
    }
    const { own: budget, rent, carry } = base.series[m - 1];
    let spend = rent;
    if (owned) {
      monthsOwned += 1;
      const pmi = balance > value * 0.8 + 0.005 ? (loan * v.pmi) / 100 / 12 : 0;
      const interest = balance * monthlyRate;
      const mortgage = monthsOwned <= v.term * 12 ? pay : 0;
      balance = Math.max(0, balance + interest - mortgage);
      const repair = v.repairYear > 0 && monthsOwned === (v.repairYear - 1) * 12 + 1 ? v.repairCost : 0;
      repairs = repairs * invest + repair;
      spend = mortgage + pmi + carry;
    }
    const gain = portfolio * (invest - 1);
    portfolio += gain - Math.min(portfolio * dragRate, Math.max(0, gain));
    const put = budget - spend;
    if (put < 0 && portfolio > 0) basis *= Math.max(0, portfolio + put) / portfolio;
    else basis += put;
    portfolio += put;
    value *= growth;
    if (m % 12 === 0) {
      const saved = portfolio - Math.max(0, portfolio - basis) * capGains;
      let later = saved;
      if (owned) {
        const homeGain = value * (1 - v.selling / 100) - homeBasis;
        const homeTax = Math.max(0, homeGain - (monthsOwned >= 24 ? v.exclusion : 0)) * capGains;
        later = saved + value * (1 - v.selling / 100) - balance - repairs - homeTax;
      }
      rows.push({ year: m / 12, later, owning: owned });
    }
  }
  const years = rows.slice(0, v.years).map((y, i) => ({ ...y, own: base.years[i].own, rent: base.years[i].rent }));
  const chartYears = rows.slice(0, base.chartYears.length).map((y, i) => ({ ...y, own: base.chartYears[i].own, rent: base.chartYears[i].rent }));
  const deflate = (list) => list.map((y) => {
    const d = (1 + v.inflation / 100) ** y.year;
    return { ...y, own: y.own / d, rent: y.rent / d, later: y.later / d };
  });
  const real = deflate(years);
  const final = years[years.length - 1];
  const finalReal = real[real.length - 1];
  return {
    // Year of the purchase (0 = at the start), or null when the stay ends before it.
    buyYear: boughtAt == null || boughtAt > v.years * 12 ? null : v.waitYears,
    years,
    real,
    chartYears,
    chartReal: deflate(chartYears),
    final,
    finalReal,
    loan,
    monthlyPayment: pay,
    stopsBeingWorst: stopsBeingWorst(years),
  };
}
