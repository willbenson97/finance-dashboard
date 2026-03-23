/**
 * Month-by-month FI projection engine.
 *
 * initialBuckets    — { [categoryId]: { balance, returnRate } }
 * savingsAllocation — [{ categoryId, percent }] summing to 100
 * expenses          — [{ name, amount (monthly $), inflationRate (% / yr) }]
 * propertyPurchases — [{ id, name, purchaseYear, price, downPaymentType,
 *                        downPaymentValue, mortgageRate, termYears, appreciationRate }]
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
    // ── Year-boundary events (before value computation & snapshot) ──────────
    if (month % 12 === 0 && month > 0) {
      const yr = month / 12
      for (const j of sortedJumps) {
        if (j.year === yr && !appliedJumps.has(j.id)) {
          appliedJumps.add(j.id)
          income = j.type === 'percent' ? income * (1 + j.value / 100) : income + j.value
        }
      }
    }

    // Property purchases: deduct down payment from buckets proportionally
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

    // ── Total portfolio value ─────────────────────────────────────────────
    const investVal = Object.values(buckets).reduce((s, b) => s + b.balance, 0)
    const propEquity = propState
      .filter((p) => p.purchased)
      .reduce((s, p) => s + Math.max(0, p.currentValue - Math.max(0, p.loanBalance)), 0)
    const totalVal = investVal + propEquity

    if (totalVal >= targetNumber) break

    points.push({ year: +(month / 12).toFixed(1), value: Math.round(totalVal) })

    // ── Yearly snapshot ───────────────────────────────────────────────────
    if (month % 12 === 0) {
      const activeMortgages = propState
        .filter((p) => p.purchased && !p.paidOff)
        .map((p) => ({ id: p.id, name: p.name, annualAmount: p.monthlyPayment * 12 }))

      snapshots.push({
        year: month / 12,
        grossAnnualIncome: income,
        annualTaxes: income * (effectiveTaxRate / 100),
        expenses: expState.map((e) => ({ name: e.name, annualAmount: e.amount * 12 })),
        mortgages: activeMortgages,
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
      })
    }

    // ── Monthly processing ────────────────────────────────────────────────
    const netIncome = (income / 12) * (1 - effectiveTaxRate / 100)
    const totalExp = expState.reduce((s, e) => s + e.amount, 0)
    const totalMortgage = propState
      .filter((p) => p.purchased && !p.paidOff)
      .reduce((s, p) => s + p.monthlyPayment, 0)
    const savings = netIncome - totalExp - totalMortgage

    // Grow buckets
    for (const b of Object.values(buckets)) b.balance *= 1 + b.monthlyReturn

    // Allocate savings
    if (useCustomAlloc) {
      for (const [catId, frac] of Object.entries(allocMap)) {
        const b = buckets[catId] ?? buckets[DEFAULT]
        if (b) b.balance = Math.max(0, b.balance + savings * frac)
      }
    } else {
      const totalBal = Object.values(buckets).reduce((s, b) => s + b.balance, 0)
      if (totalBal > 0) {
        for (const b of Object.values(buckets)) {
          b.balance = Math.max(0, b.balance + savings * (b.balance / totalBal))
        }
      } else if (savings > 0) {
        const keys = Object.keys(buckets)
        for (const k of keys) buckets[k].balance += savings / keys.length
      }
    }

    // Appreciate properties + amortize loans
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

    // Inflate expenses + grow salary
    for (const e of expState) e.amount *= e.monthlyFactor
    income *= salaryMonthlyFactor

    month++
  }

  // Final point
  const finalInvest = Object.values(buckets).reduce((s, b) => s + b.balance, 0)
  const finalEquity = propState
    .filter((p) => p.purchased)
    .reduce((s, p) => s + Math.max(0, p.currentValue - Math.max(0, p.loanBalance)), 0)
  points.push({ year: +(month / 12).toFixed(1), value: Math.round(finalInvest + finalEquity) })

  return { points, yearsToFI: +(month / 12).toFixed(1), snapshots }
}
