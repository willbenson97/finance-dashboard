/**
 * Month-by-month FI projection engine.
 *
 * initialBuckets    — { [categoryId]: { balance, returnRate } }
 * savingsAllocation — [{ categoryId, percent }] summing to 100
 * expenses          — [{ name, amount (monthly $), inflationRate (% / yr) }]
 * propertyPurchases — [{ id, name, purchaseYear, price, downPaymentType,
 *                        downPaymentValue, mortgageRate, termYears, appreciationRate }]
 * currentDebts      — [{ id, name, current_balance, interest_rate, monthly_payment }]
 * coinvests         — [
 *   { id, name, type:'current', investedAmount, distributions:[{year,amount}] }
 *   { id, name, type:'future',  investedAmount, startYear, annualReturnRate, horizonYears }
 * ]
 *
 * Returns { points, yearsToFI, snapshots }
 * snapshots[N] = state at the START of year N (after N years of growth)
 */
export function buildProjection({
  annualIncome,
  effectiveTaxRate,
  salaryGrowthRate = 0,
  salaryJumps = [],
  expenses = [],
  initialBuckets = {},
  savingsAllocation = [],
  propertyPurchases = [],
  currentDebts = [],
  coinvests = [],
  targetNumber,
}) {
  if (targetNumber <= 0) return { points: [], yearsToFI: null, snapshots: [] }

  const maxMonths = 600

  // ── Investment buckets ────────────────────────────────────────────────────
  const buckets = {}
  for (const [catId, { balance, returnRate }] of Object.entries(initialBuckets)) {
    buckets[catId] = { balance, monthlyReturn: returnRate / 100 / 12 }
  }
  const DEFAULT = '__default__'
  if (Object.keys(buckets).length === 0) {
    buckets[DEFAULT] = { balance: 0, monthlyReturn: 0.07 / 12 }
  }

  const allocTotal = savingsAllocation.reduce((s, a) => s + a.percent, 0)
  const useCustomAlloc = savingsAllocation.length > 0 && Math.abs(allocTotal - 100) < 0.5
  const allocMap = useCustomAlloc
    ? Object.fromEntries(savingsAllocation.map((a) => [a.categoryId, a.percent / 100]))
    : null

  // Helper: distribute a cash inflow into buckets using savings allocation
  function injectCash(amount) {
    if (amount <= 0) return
    if (useCustomAlloc) {
      for (const [catId, frac] of Object.entries(allocMap)) {
        const b = buckets[catId] ?? buckets[DEFAULT]
        if (b) b.balance = Math.max(0, b.balance + amount * frac)
      }
    } else {
      const totalBal = Object.values(buckets).reduce((s, b) => s + b.balance, 0)
      if (totalBal > 0) {
        for (const b of Object.values(buckets)) {
          b.balance = Math.max(0, b.balance + amount * (b.balance / totalBal))
        }
      } else {
        const keys = Object.keys(buckets)
        for (const k of keys) buckets[k].balance += amount / keys.length
      }
    }
  }

  // ── Expense state ─────────────────────────────────────────────────────────
  const expState = expenses.map((e) => ({
    name: e.name ?? 'Expense',
    amount: e.amount,
    monthlyFactor: Math.pow(1 + (e.inflationRate ?? 0) / 100, 1 / 12),
  }))

  // ── Property state ────────────────────────────────────────────────────────
  const propState = propertyPurchases.map((p) => {
    const downPmt =
      p.downPaymentType === 'percent'
        ? (p.price * p.downPaymentValue) / 100
        : p.downPaymentValue
    const loan = Math.max(0, p.price - downPmt)
    const r = p.mortgageRate / 100 / 12
    const n = p.termYears * 12
    const monthlyPayment =
      loan <= 0 ? 0
      : r > 0 ? (loan * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)
      : loan / n
    return {
      id: p.id,
      name: p.name ?? 'Property',
      purchaseMonth: Math.round(p.purchaseYear * 12),
      price: p.price,
      downPmt,
      loan,
      loanBalance: loan,
      monthlyRate: r,
      monthlyPayment,
      termMonths: n,
      monthsPaid: 0,
      currentValue: 0,
      monthlyAppreciation: Math.pow(1 + (p.appreciationRate ?? 3) / 100, 1 / 12) - 1,
      purchased: false,
      paidOff: loan <= 0,
    }
  })

  // ── Current debt state ────────────────────────────────────────────────────
  const debtState = currentDebts.map((d) => ({
    id: d.id,
    name: d.name ?? 'Debt',
    balance: d.current_balance ?? 0,
    monthlyRate: (d.interest_rate ?? 0) / 100 / 12,
    monthlyPayment: d.monthly_payment ?? 0,
    paidOff: (d.current_balance ?? 0) <= 0,
  }))

  // ── Co-invest state ───────────────────────────────────────────────────────
  const coinvestState = coinvests.map((c) => {
    if (c.type === 'current') {
      return {
        id: c.id,
        name: c.name ?? 'Co-Invest',
        type: 'current',
        investedAmount: c.investedAmount ?? 0,
        distributions: (c.distributions ?? []).map((d) => ({
          month: Math.round(d.year * 12),
          amount: d.amount,
          paid: false,
        })),
      }
    } else {
      const startMonth = Math.round((c.startYear ?? 0) * 12)
      const horizonMonths = (c.horizonYears ?? 7) * 12
      return {
        id: c.id,
        name: c.name ?? 'Co-Invest',
        type: 'future',
        investedAmount: c.investedAmount ?? 0,
        startMonth,
        endMonth: startMonth + horizonMonths,
        monthlyRate: Math.pow(1 + (c.annualReturnRate ?? 0) / 100, 1 / 12) - 1,
        currentValue: 0,
        deployed: false,
        liquidated: false,
      }
    }
  })

  // ── Salary state ──────────────────────────────────────────────────────────
  let income = annualIncome
  const salaryMonthlyFactor = Math.pow(1 + salaryGrowthRate / 100, 1 / 12)
  const sortedJumps = [...salaryJumps].sort((a, b) => a.year - b.year)
  const appliedJumps = new Set()

  // ── Simulation loop ───────────────────────────────────────────────────────
  const points = []
  const snapshots = []
  let month = 0

  while (month < maxMonths) {
    // ── Year-boundary salary jumps ────────────────────────────────────────
    if (month % 12 === 0 && month > 0) {
      const yr = month / 12
      for (const j of sortedJumps) {
        if (j.year === yr && !appliedJumps.has(j.id)) {
          appliedJumps.add(j.id)
          income = j.type === 'percent' ? income * (1 + j.value / 100) : income + j.value
        }
      }
    }

    // ── Property down payments ────────────────────────────────────────────
    for (const p of propState) {
      if (!p.purchased && month === p.purchaseMonth) {
        p.purchased = true
        p.currentValue = p.price
        const totalBal = Object.values(buckets).reduce((s, b) => s + b.balance, 0)
        if (totalBal > 0 && p.downPmt > 0) {
          const frac = Math.min(1, p.downPmt / totalBal)
          for (const b of Object.values(buckets)) {
            b.balance = Math.max(0, b.balance * (1 - frac))
          }
        }
      }
    }

    // ── Future co-invest deployment ───────────────────────────────────────
    for (const c of coinvestState) {
      if (c.type === 'future' && !c.deployed && month === c.startMonth) {
        c.deployed = true
        c.currentValue = c.investedAmount
        // Deduct invested amount from buckets proportionally
        const totalBal = Object.values(buckets).reduce((s, b) => s + b.balance, 0)
        if (totalBal > 0 && c.investedAmount > 0) {
          const frac = Math.min(1, c.investedAmount / totalBal)
          for (const b of Object.values(buckets)) {
            b.balance = Math.max(0, b.balance * (1 - frac))
          }
        }
      }
    }

    // ── Total portfolio value ─────────────────────────────────────────────
    const investVal = Object.values(buckets).reduce((s, b) => s + b.balance, 0)
    const propEquity = propState
      .filter((p) => p.purchased)
      .reduce((s, p) => s + Math.max(0, p.currentValue - Math.max(0, p.loanBalance)), 0)
    // Co-invest value: remaining distributions (current) or current grown value (future deployed)
    const coinvestVal = coinvestState.reduce((s, c) => {
      if (c.type === 'current') {
        return s + c.distributions.filter((d) => !d.paid).reduce((sum, d) => sum + d.amount, 0)
      }
      if (c.type === 'future' && c.deployed && !c.liquidated) {
        return s + c.currentValue
      }
      return s
    }, 0)
    const totalVal = investVal + propEquity + coinvestVal

    if (totalVal >= targetNumber) break

    // Only emit chart points at integer year boundaries
    if (month % 12 === 0) {
      points.push({ year: month / 12, value: Math.round(totalVal) })
    }

    // ── Yearly snapshot ───────────────────────────────────────────────────
    if (month % 12 === 0) {
      const yearEnd = month + 12
      const activeMortgages = propState
        .filter((p) => p.purchased && !p.paidOff)
        .map((p) => ({ id: p.id, name: p.name, annualAmount: p.monthlyPayment * 12 }))

      const activeDebts = debtState
        .filter((d) => !d.paidOff)
        .map((d) => ({ id: d.id, name: d.name, annualAmount: d.monthlyPayment * 12 }))

      // Co-invest inflows expected this year (distributions + liquidations)
      const coinvestInflows = []
      for (const c of coinvestState) {
        if (c.type === 'current') {
          for (const dist of c.distributions) {
            if (!dist.paid && dist.month >= month && dist.month < yearEnd) {
              coinvestInflows.push({ id: `${c.id}_${dist.month}`, name: c.name, amount: dist.amount })
            }
          }
        } else if (c.type === 'future' && !c.liquidated && c.endMonth >= month && c.endMonth < yearEnd) {
          // Project the value at liquidation
          const monthsToEnd = c.endMonth - month
          const projectedValue = c.deployed
            ? c.currentValue * Math.pow(1 + c.monthlyRate, monthsToEnd)
            : 0
          if (projectedValue > 0) {
            coinvestInflows.push({
              id: `${c.id}_liq`,
              name: `${c.name} (liquidation)`,
              amount: projectedValue,
            })
          }
        }
      }

      snapshots.push({
        year: month / 12,
        grossAnnualIncome: income,
        annualTaxes: income * (effectiveTaxRate / 100),
        expenses: expState.map((e) => ({ name: e.name, annualAmount: e.amount * 12 })),
        mortgages: activeMortgages,
        debts: activeDebts,
        coinvestInflows,
        buckets: Object.fromEntries(
          Object.entries(buckets).map(([k, b]) => [k, Math.max(0, b.balance)])
        ),
        properties: propState
          .filter((p) => p.purchased)
          .map((p) => ({
            id: p.id,
            name: p.name,
            value: p.currentValue,
            loanBalance: Math.max(0, p.loanBalance),
            equity: Math.max(0, p.currentValue - Math.max(0, p.loanBalance)),
          })),
        coinvests: coinvestState
          .filter((c) => c.type === 'current' ? c.distributions.some((d) => !d.paid) : (c.deployed && !c.liquidated))
          .map((c) => ({
            id: c.id,
            name: c.name,
            value: c.type === 'current'
              ? c.distributions.filter((d) => !d.paid).reduce((s, d) => s + d.amount, 0)
              : c.currentValue,
            type: c.type,
          })),
      })
    }

    // ── Monthly processing ────────────────────────────────────────────────
    const netIncome = (income / 12) * (1 - effectiveTaxRate / 100)
    const totalExp = expState.reduce((s, e) => s + e.amount, 0)
    const totalMortgage = propState
      .filter((p) => p.purchased && !p.paidOff)
      .reduce((s, p) => s + p.monthlyPayment, 0)
    const totalDebt = debtState
      .filter((d) => !d.paidOff)
      .reduce((s, d) => s + d.monthlyPayment, 0)
    const savings = netIncome - totalExp - totalMortgage - totalDebt

    // Grow buckets
    for (const b of Object.values(buckets)) b.balance *= 1 + b.monthlyReturn

    // Allocate savings into buckets
    injectCash(savings)

    // Appreciate properties + amortize property loans
    for (const p of propState) {
      if (!p.purchased) continue
      p.currentValue *= 1 + p.monthlyAppreciation
      if (!p.paidOff) {
        const interest = p.loanBalance * p.monthlyRate
        const principal = p.monthlyPayment - interest
        p.loanBalance = Math.max(0, p.loanBalance - principal)
        p.monthsPaid++
        if (p.monthsPaid >= p.termMonths || p.loanBalance <= 0) {
          p.loanBalance = 0
          p.paidOff = true
        }
      }
    }

    // Amortize current debts
    for (const d of debtState) {
      if (d.paidOff) continue
      const interest = d.balance * d.monthlyRate
      const principal = Math.max(0, d.monthlyPayment - interest)
      d.balance = Math.max(0, d.balance - principal)
      if (d.balance <= 0) d.paidOff = true
    }

    // Current co-invest: inject distributions at scheduled months
    for (const c of coinvestState) {
      if (c.type !== 'current') continue
      for (const dist of c.distributions) {
        if (!dist.paid && month === dist.month) {
          dist.paid = true
          injectCash(dist.amount)
        }
      }
    }

    // Future co-invest: grow value; liquidate at end of horizon
    for (const c of coinvestState) {
      if (c.type !== 'future' || !c.deployed || c.liquidated) continue
      c.currentValue *= 1 + c.monthlyRate
      if (month >= c.endMonth) {
        c.liquidated = true
        injectCash(c.currentValue)
        c.currentValue = 0
      }
    }

    // Inflate expenses + grow salary
    for (const e of expState) e.amount *= e.monthlyFactor
    income *= salaryMonthlyFactor

    month++
  }

  // Final point (add only if not already at a year boundary)
  const finalInvest = Object.values(buckets).reduce((s, b) => s + b.balance, 0)
  const finalEquity = propState
    .filter((p) => p.purchased)
    .reduce((s, p) => s + Math.max(0, p.currentValue - Math.max(0, p.loanBalance)), 0)
  const finalYear = Math.round(month / 12)
  if (!points.length || points[points.length - 1].year !== finalYear) {
    points.push({ year: finalYear, value: Math.round(finalInvest + finalEquity) })
  }

  return { points, yearsToFI: +(month / 12).toFixed(1), snapshots }
}
