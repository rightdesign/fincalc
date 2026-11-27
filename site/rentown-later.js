// "Rent now, buy in N years": a third path next to buy-now and rent-forever. Pure functions, no DOM.
// For the first N years it is the equal-cash renter (rent paid, the rest of the owning budget invested,
// same tax drag and sale tax). At the start of month N * 12 + 1 it sells the investments (paying the
// capital gains tax), buys the same home at its appreciated price with that cash as closing costs plus
// down payment, and takes a new loan on the balance at `waitRate` (blank: the mortgage rate). From then
// on it owns, and the budget stays the buy-now owning cost, so any difference from the new loan is
// invested or drawn from the investments just as the renter's is. Years run to the end of the model.
import { compareRentOwn, financing, taxBenefit, withdraw } from './rentown.js';
import { payment, rateAfter } from './mortgage.js';

// The first year after which buying now is never the lowest of the three, or null if it still is at the end.
function stopsBeingWorst(rows) {
  const worst = rows.map((y) => y.own < y.rent && y.own < y.later);
  const last = worst.lastIndexOf(true);
  return last === rows.length - 1 ? null : rows[last + 1].year;
}

export function compareRentThenBuy(v, base = compareRentOwn(v)) {
  const wait = v.waitYears * 12;
  const arm = v.arm === 1;
  // A rate entered for the later purchase replaces the starting rate, fixed or adjustable.
  const startRate = v.waitRate ?? (arm ? v.armRate : v.rate);
  const armLoan = arm
    ? {
        rateBasis: 'index',
        initialRate: startRate,
        indexRate: v.armIndexRate,
        margin: v.armMargin,
        indexChange: v.armIndexChange,
        firstCap: v.armFirstCap,
        periodicCap: v.armPeriodicCap,
        lifetimeCap: v.armLifetimeCap,
        floor: v.armFloor,
      }
    : null;
  const growth = (1 + v.growth / 100) ** (1 / 12);
  const invest = (1 + v.investment / 100) ** (1 / 12);
  const dragRate = v.investDrag / 100 / 12;
  const capGains = v.capGains / 100;
  // The renter's security deposit comes out of the starting cash and is returned untaxed when the renting ends.
  const deposit = v.deposit ?? v.rent;
  let portfolio = base.startPortfolio;
  let basis = portfolio;
  let value = v.price;
  let owned = false;
  let boughtAt = null;
  let fin = null;
  let loanRate = startRate;
  let monthlyRate = 0;
  let balance = 0;
  let loan = 0;
  let pay = 0;
  let resets = 0;
  let repairs = 0;
  let homeBasis = 0;
  let homeCost = 0;
  let monthsOwned = 0;
  let yearInterest = 0;
  let yearBalance = 0;
  let yearPropertyTax = 0;
  const rows = [];
  for (let m = 1; m <= base.series.length; m += 1) {
    const point = base.series[m - 1];
    if (!owned && m === wait + 1) {
      // Buy: the investments are sold, so the gain is taxed, and what is left pays closing costs, any upfront
      // loan fee paid in cash and the down payment. The loan program works as it does for buying now.
      const cash = Math.max(0, portfolio - Math.max(0, portfolio - basis) * capGains) + deposit;
      const closing = (value * v.closing) / 100;
      let downPct = v.down;
      let down = 0;
      for (let i = 0; i < 12; i += 1) {
        fin = financing({ ...v, price: value, down: downPct });
        down = Math.min(value, Math.max(0, cash - closing - fin.cashFee));
        const next = (down / value) * 100;
        if (Math.abs(next - downPct) < 1e-9) break;
        downPct = next;
      }
      fin = financing({ ...v, price: value, down: (down / value) * 100 });
      const short = Math.max(0, closing + fin.cashFee - cash);
      loan = fin.loan + short;
      balance = loan;
      pay = payment(loan, loanRate, v.term * 12);
      monthlyRate = loanRate / 100 / 12;
      portfolio = Math.max(0, cash - closing - fin.cashFee - down);
      basis = portfolio;
      homeBasis = value + closing;
      homeCost = value;
      boughtAt = m;
      owned = true;
    }
    if (!owned) {
      portfolio = point.portfolio;
      basis = point.basis;
      value *= growth;
    } else {
      monthsOwned += 1;
      // An ARM re-amortizes the balance over the months left at each reset, as buying now does.
      const sinceFixed = monthsOwned - 1 - v.armFixedMonths;
      if (
        arm &&
        sinceFixed >= 0 &&
        sinceFixed % v.armAdjustMonths === 0 &&
        monthsOwned <= v.term * 12
      ) {
        resets += 1;
        loanRate = rateAfter(armLoan, resets);
        monthlyRate = loanRate / 100 / 12;
        pay = payment(balance, loanRate, v.term * 12 - (monthsOwned - 1));
      }
      const insured =
        fin.insuranceMonths == null
          ? fin.base > homeCost * 0.8 + 0.005 && balance > homeCost * 0.78 + 0.005
          : monthsOwned <= fin.insuranceMonths;
      const pmi = insured ? (fin.base * fin.insurancePct) / 100 / 12 : 0;
      const interest = balance * monthlyRate;
      const mortgage = monthsOwned <= v.term * 12 ? pay : 0;
      yearInterest += balance > 0 ? Math.min(interest, mortgage) : 0;
      yearBalance += balance;
      yearPropertyTax += point.tax;
      balance = Math.max(0, balance + interest - mortgage);
      const repair =
        v.repairYear > 0 && monthsOwned === (v.repairYear - 1) * 12 + 1 ? v.repairCost : 0;
      repairs = repairs * invest + repair;
      homeBasis += repair;
      // A renter or owner who runs out of money borrows the shortfall at the mortgage rate and owes no drag.
      const gain = portfolio < 0 ? portfolio * monthlyRate : portfolio * (invest - 1);
      const drag = portfolio > 0 ? Math.min(portfolio * dragRate, Math.max(0, gain)) : 0;
      portfolio += gain - drag;
      const put = point.own - (mortgage + pmi + point.carry);
      if (put < 0)
        ({ portfolio, basis } = withdraw(
          portfolio,
          basis,
          -put,
          v.view === 'unrealized' ? 0 : capGains,
        ));
      else {
        basis += put;
        portfolio += put;
      }
      value *= growth;
    }
    if (m % 12 === 0) {
      // The budget is buy-now's cost before any tax refund; the owner's refund is invested like any other saving.
      const refund = owned
        ? taxBenefit(v, yearInterest, yearPropertyTax, m / 12 - 1, yearBalance / 12)
        : 0;
      yearInterest = 0;
      yearBalance = 0;
      yearPropertyTax = 0;
      if (owned) {
        basis += refund;
        portfolio += refund;
      }
      const paper = v.view === 'unrealized';
      const saved = paper ? portfolio : portfolio - Math.max(0, portfolio - basis) * capGains;
      let later = saved + (owned ? 0 : deposit);
      if (owned) {
        const sale = paper ? value : value * (1 - v.selling / 100);
        const homeTax = paper
          ? 0
          : Math.max(0, sale - homeBasis - (monthsOwned >= 24 ? v.exclusion : 0)) * capGains;
        later = saved + sale - balance - repairs - homeTax;
      }
      rows.push({ year: m / 12, later, owning: owned });
    }
  }
  const years = rows
    .slice(0, v.years)
    .map((y, i) => ({ ...y, own: base.years[i].own, rent: base.years[i].rent }));
  const chartYears = rows
    .slice(0, base.chartYears.length)
    .map((y, i) => ({ ...y, own: base.chartYears[i].own, rent: base.chartYears[i].rent }));
  const deflate = (list) =>
    list.map((y) => {
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
    rate: startRate,
    monthlyPayment: pay,
    stopsBeingWorst: stopsBeingWorst(years),
  };
}
