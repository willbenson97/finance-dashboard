import { useState, useMemo } from 'react'
import {
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer,
} from 'recharts'
import { Link } from 'react-router-dom'
import { useFISettings } from '../../hooks/useFISettings'
import { useAssets } from '../../hooks/useAssets'
import { useCategories } from '../../hooks/useCategories'
import { useBudget } from '../../hooks/useBudget'
import { useDebts } from '../../hooks/useDebts'
import { formatCurrency } from '../../lib/format'
import { buildProjection } from '../../lib/projection'
import PageHeader from '../Layout/PageHeader'
import SavingsAllocationPanel from './SavingsAllocationPanel'
import ProjectionSnapshot from './ProjectionSnapshot'

// ─── Subcomponents ────────────────────────────────────────────────────────────

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-card border border-border rounded-xl px-4 py-3 text-sm shadow-xl space-y-1">
      <p className="text-muted mb-1">Year {label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} style={{ color: p.color }} className="font-semibold">
          {p.name}: {formatCurrency(p.value)}
        </p>
      ))}
    </div>
  )
}

function ReadOnlyField({ label, value, sub }) {
  return (
    <div>
      <label className="block text-xs text-muted mb-1">{label}</label>
      <div className="bg-white/5 border border-border rounded-lg px-3 py-2">
        <span className="text-sm text-muted">{value}</span>
        {sub && <span className="text-xs text-muted/60 ml-2">{sub}</span>}
      </div>
    </div>
  )
}

function EarningsGrowthPanel({ growthRate, onGrowthRateChange, jumps, onJumpsChange }) {
  const [newYear, setNewYear] = useState('2')
  const [newType, setNewType] = useState('percent')
  const [newValue, setNewValue] = useState('')

  const addJump = () => {
    const year = Number(newYear)
    const value = Number(newValue)
    if (!value || year < 1) return
    onJumpsChange((prev) =>
      [...prev, { id: crypto.randomUUID(), year, type: newType, value }].sort(
        (a, b) => a.year - b.year
      )
    )
    setNewValue('')
  }

  const removeJump = (id) => onJumpsChange((prev) => prev.filter((j) => j.id !== id))

  return (
    <div className="bg-card border border-border rounded-2xl p-5">
      <h3 className="text-sm font-semibold text-white mb-4">Earnings Growth</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-xs text-muted mb-1">Annual Salary Growth</label>
          <div className="relative">
            <input
              type="number" step="0.1" min="0" max="50"
              value={growthRate}
              onChange={(e) => onGrowthRateChange(Number(e.target.value))}
              className="w-full bg-surface border border-border rounded-lg px-3 pr-8 py-2 text-sm text-white focus:outline-none focus:border-accent"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted text-sm">%</span>
          </div>
          <p className="text-xs text-muted mt-2">
            Compounds each year on top of your current budget income.
          </p>
        </div>

        <div>
          <label className="block text-xs text-muted mb-2">One-Time Salary Jumps</label>
          <div className="flex gap-2 mb-3">
            <input
              type="number" min="1" step="1" placeholder="Yr"
              value={newYear}
              onChange={(e) => setNewYear(e.target.value)}
              className="w-16 bg-surface border border-border rounded-lg px-2 py-1.5 text-sm text-white focus:outline-none focus:border-accent"
            />
            <select
              value={newType}
              onChange={(e) => setNewType(e.target.value)}
              className="bg-surface border border-border rounded-lg px-2 py-1.5 text-sm text-white focus:outline-none focus:border-accent"
            >
              <option value="percent">%</option>
              <option value="amount">$</option>
            </select>
            <div className="relative flex-1">
              {newType === 'amount' && (
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted text-xs">$</span>
              )}
              <input
                type="number" min="0" step={newType === 'percent' ? '0.1' : '1000'}
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addJump()}
                placeholder={newType === 'percent' ? '20' : '25000'}
                className={`w-full bg-surface border border-border rounded-lg py-1.5 text-sm text-white focus:outline-none focus:border-accent ${newType === 'amount' ? 'pl-5 pr-2' : 'px-2 pr-6'}`}
              />
              {newType === 'percent' && (
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-muted text-xs">%</span>
              )}
            </div>
            <button
              onClick={addJump}
              className="bg-accent hover:bg-accent-hover text-white text-sm px-3 rounded-lg transition-colors font-bold"
            >
              +
            </button>
          </div>
          {jumps.length === 0 ? (
            <p className="text-xs text-muted italic">No jumps added — e.g. a promotion in year 3.</p>
          ) : (
            <div className="space-y-1.5">
              {jumps.map((j) => (
                <div key={j.id} className="flex items-center justify-between bg-white/5 border border-border/50 rounded-lg px-3 py-1.5">
                  <span className="text-xs text-muted">Year {j.year}</span>
                  <span className="text-xs text-white font-semibold">
                    +{j.type === 'percent' ? `${j.value}%` : formatCurrency(j.value)}
                  </span>
                  <button onClick={() => removeJump(j.id)} className="text-muted hover:text-white text-sm ml-3">×</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function FIPlanner() {
  const { settings, loading: settingsLoading, saveSettings } = useFISettings()
  const { assets, loading: assetsLoading } = useAssets()
  const { categories, loading: catsLoading } = useCategories()
  const { items: budgetItems, totals, loading: budgetLoading } = useBudget()
  const { debts, loading: debtsLoading } = useDebts()
  const [local, setLocal] = useState(null)
  const [saved, setSaved] = useState(false)

  const vals = local ?? settings
  const set = (k) => (v) => setLocal((prev) => ({ ...(prev ?? settings), [k]: v }))

  // ── Derived earnings growth state ─────────────────────────────────────────
  const growthRate = vals.salary_growth_rate ?? 0
  const salaryJumps = vals.salary_jumps ?? []
  const setGrowthRate = (v) =>
    setLocal((prev) => ({ ...(prev ?? settings), salary_growth_rate: v }))
  const setSalaryJumps = (fn) =>
    setLocal((prev) => {
      const base = prev ?? settings
      return { ...base, salary_jumps: typeof fn === 'function' ? fn(base.salary_jumps ?? []) : fn }
    })

  // ── Savings allocation state ──────────────────────────────────────────────
  const savingsAllocation = vals.savings_allocation ?? []
  const setSavingsAllocation = (fn) =>
    setLocal((prev) => {
      const base = prev ?? settings
      return {
        ...base,
        savings_allocation:
          typeof fn === 'function' ? fn(base.savings_allocation ?? []) : fn,
      }
    })

  // Property purchases + co-invests are managed on their own pages — read directly from settings
  const propertyPurchases = settings.property_purchases ?? []
  const coinvests = settings.coinvests ?? []

  // ── Derived values ────────────────────────────────────────────────────────
  const initialBuckets = useMemo(() => {
    const catMap = Object.fromEntries(categories.map((c) => [c.id, c]))
    const result = {}
    for (const asset of assets) {
      const cat = catMap[asset.category_id]
      if (!cat) continue
      if (!result[cat.id]) result[cat.id] = { balance: 0, returnRate: cat.return_rate ?? 7 }
      result[cat.id].balance += asset.value ?? 0
    }
    return result
  }, [assets, categories])

  const annualIncome = totals.annualIncome
  const effectiveTaxRate = vals.effective_tax_rate ?? 25

  const expenseItems = useMemo(
    () =>
      budgetItems
        .filter((i) => i.type === 'expense')
        .map((i) => ({ name: i.name, amount: i.amount, inflationRate: i.inflation_rate ?? 3 })),
    [budgetItems]
  )

  const totalMonthlyDebt = debts.reduce((s, d) => s + (d.monthly_payment ?? 0), 0)

  // Flat monthly savings (for display)
  const monthlySavings = useMemo(() => {
    const net = (annualIncome / 12) * (1 - effectiveTaxRate / 100) - totals.expenses - totalMonthlyDebt
    return net
  }, [annualIncome, effectiveTaxRate, totals.expenses, totalMonthlyDebt])

  const currentNetWorth = useMemo(
    () => assets.reduce((s, a) => s + (a.value ?? 0), 0),
    [assets]
  )

  // Blended return (for display only)
  const blendedReturn = useMemo(() => {
    const total = Object.values(initialBuckets).reduce((s, b) => s + b.balance, 0)
    if (total === 0) return 7
    return Object.values(initialBuckets).reduce(
      (sum, b) => sum + (b.returnRate * b.balance) / total,
      0
    )
  }, [initialBuckets])

  const hasEnhancements =
    growthRate > 0 ||
    salaryJumps.length > 0 ||
    expenseItems.some((e) => e.inflationRate > 0) ||
    propertyPurchases.length > 0 ||
    coinvests.length > 0

  // ── Projection (with all enhancements) ───────────────────────────────────
  const { points, yearsToFI, snapshots } = useMemo(() => {
    if ((vals.target_number ?? 0) <= 0) return { points: [], yearsToFI: null }
    return buildProjection({
      annualIncome,
      effectiveTaxRate,
      salaryGrowthRate: growthRate,
      salaryJumps,
      expenses: expenseItems,
      initialBuckets,
      savingsAllocation,
      propertyPurchases,
      currentDebts: debts,
      coinvests,
      targetNumber: vals.target_number,
    })
  }, [annualIncome, effectiveTaxRate, growthRate, salaryJumps, expenseItems, initialBuckets, savingsAllocation, propertyPurchases, debts, coinvests, vals.target_number])

  // ── Baseline (no enhancements) ────────────────────────────────────────────
  const { points: baselinePoints, yearsToFI: baselineYearsToFI } = useMemo(() => {
    if ((vals.target_number ?? 0) <= 0 || !hasEnhancements) return { points: [], yearsToFI: null }
    return buildProjection({
      annualIncome,
      effectiveTaxRate,
      salaryGrowthRate: 0,
      salaryJumps: [],
      expenses: expenseItems.map((e) => ({ ...e, inflationRate: 0 })),
      initialBuckets,
      savingsAllocation: [],
      propertyPurchases: [],
      currentDebts: debts,
      coinvests: [],
      targetNumber: vals.target_number,
    })
  }, [annualIncome, effectiveTaxRate, expenseItems, initialBuckets, vals.target_number, hasEnhancements])

  // Merge into single chart dataset
  const chartData = useMemo(() => {
    if (!hasEnhancements) return points
    return points.map((p, i) => ({
      ...p,
      baseline: baselinePoints[i]?.value ?? null,
    }))
  }, [points, baselinePoints, hasEnhancements])

  const impliedTarget = useMemo(
    () => (monthlySavings * 12) / ((vals.safe_withdrawal_rate ?? 4) / 100) || 0,
    [monthlySavings, vals]
  )

  const handleSave = async () => {
    if (!local) return
    await saveSettings(local)
    setLocal(null)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (settingsLoading || assetsLoading || catsLoading || budgetLoading || debtsLoading)
    return <div className="text-muted animate-pulse">Loading…</div>

  const yearsSaved =
    hasEnhancements && yearsToFI != null && baselineYearsToFI != null
      ? (baselineYearsToFI - yearsToFI).toFixed(1)
      : null

  return (
    <div>
      <PageHeader
        title="Retirement Planning"
        subtitle="Project your path to financial independence"
      />

      {/* Row 1: Inputs + Key Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-white">Inputs</h3>

          <ReadOnlyField
            label="Current Net Worth (synced from assets)"
            value={formatCurrency(currentNetWorth)}
          />
          <ReadOnlyField
            label="Monthly Savings (synced from budget)"
            value={formatCurrency(monthlySavings)}
            sub="net income after taxes & expenses"
          />
          <ReadOnlyField
            label="Blended Return (from category rates)"
            value={`${blendedReturn.toFixed(2)}%`}
            sub="weighted by asset allocation"
          />

          <div className="border-t border-border pt-4 space-y-3">
            <div>
              <label className="block text-xs text-muted mb-1">Target Retirement Number</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm">$</span>
                <input
                  type="number" step="1"
                  value={vals.target_number ?? 0}
                  onChange={(e) => set('target_number')(Number(e.target.value))}
                  className="w-full bg-surface border border-border rounded-lg pl-7 pr-3 py-2 text-sm text-white focus:outline-none focus:border-accent"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">Safe Withdrawal Rate</label>
              <div className="relative">
                <input
                  type="number" step="0.1"
                  value={vals.safe_withdrawal_rate ?? 4}
                  onChange={(e) => set('safe_withdrawal_rate')(Number(e.target.value))}
                  className="w-full bg-surface border border-border rounded-lg px-3 pr-8 py-2 text-sm text-white focus:outline-none focus:border-accent"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted text-sm">%</span>
              </div>
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={!local}
            className="w-full bg-accent hover:bg-accent-hover text-white text-sm font-medium py-2 rounded-lg transition-colors disabled:opacity-40"
          >
            {saved ? 'Saved!' : 'Save Settings'}
          </button>
        </div>

        <div className="lg:col-span-2 grid grid-cols-2 gap-4 content-start">
          {[
            { label: 'Current Net Worth', value: formatCurrency(currentNetWorth), sub: 'from assets' },
            { label: 'Monthly Savings',   value: formatCurrency(monthlySavings),  sub: 'from budget' },
            {
              label: hasEnhancements ? 'Years to Retirement (with enhancements)' : 'Years to Retirement',
              value: yearsToFI != null ? `${yearsToFI} yrs` : '—',
              sub: yearsToFI != null
                ? `~${new Date().getFullYear() + Math.ceil(yearsToFI)}`
                : 'set a target',
            },
            yearsSaved != null
              ? {
                  label: 'Years to Retirement (no enhancements)',
                  value: `${baselineYearsToFI} yrs`,
                  sub: `${yearsSaved > 0 ? `${yearsSaved} yrs faster` : `${Math.abs(yearsSaved)} yrs slower`} with enhancements`,
                }
              : {
                  label: 'Implied Target (from savings)',
                  value: formatCurrency(impliedTarget),
                  sub: `at ${vals.safe_withdrawal_rate ?? 4}% SWR`,
                },
          ].map(({ label, value, sub }) => (
            <div key={label} className="bg-card border border-border rounded-2xl p-5">
              <p className="text-xs text-muted">{label}</p>
              <p className="text-2xl font-bold text-white mt-1">{value}</p>
              {sub && <p className="text-xs text-muted mt-0.5">{sub}</p>}
            </div>
          ))}
        </div>
      </div>

      {/* Row 2: Earnings Growth */}
      <div className="mb-6">
        <EarningsGrowthPanel
          growthRate={growthRate}
          onGrowthRateChange={setGrowthRate}
          jumps={salaryJumps}
          onJumpsChange={setSalaryJumps}
        />
      </div>

      {/* Row 3: Savings Allocation */}
      <div className="mb-6">
        <SavingsAllocationPanel
          categories={categories}
          allocation={savingsAllocation}
          onChange={setSavingsAllocation}
          initialBuckets={initialBuckets}
        />
      </div>

      {/* Row 4: Links to dedicated pages */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {[
          { to: '/property-purchases', label: 'Property Purchases', count: propertyPurchases.length, icon: '🏠', desc: 'future buys modeled in projection' },
          { to: '/co-investments',     label: 'Co-Investments',     count: coinvests.length,          icon: '🤝', desc: 'fund distributions & future vehicles' },
        ].map(({ to, label, count, icon, desc }) => (
          <Link
            key={to}
            to={to}
            className="bg-card border border-border rounded-2xl p-5 flex items-center gap-4 hover:border-accent/50 transition-colors group"
          >
            <span className="text-2xl">{icon}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white group-hover:text-accent transition-colors">{label}</p>
              <p className="text-xs text-muted mt-0.5">{desc}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-lg font-bold text-white">{count}</p>
              <p className="text-xs text-muted">{count === 1 ? 'item' : 'items'}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Row 5: Projection Chart + Snapshot */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-white">Portfolio Projection</h3>
          <div className="flex items-center gap-4 text-xs text-muted">
            {hasEnhancements && (
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-4" style={{ borderTop: '2px dashed #8b8fa8' }} />
                No enhancements
              </span>
            )}
            <span>
              Blended return:{' '}
              <span className="text-accent font-medium">{blendedReturn.toFixed(2)}%/yr</span>
            </span>
          </div>
        </div>

        {chartData.length < 2 ? (
          <p className="text-muted text-sm">
            Set a target retirement number above to see your projection.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
              <defs>
                <linearGradient id="projGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#2e3254" />
              <XAxis
                dataKey="year" stroke="#8b8fa8" tick={{ fontSize: 11 }}
                ticks={Array.from({ length: Math.ceil(yearsToFI ?? 0) + 1 }, (_, i) => i)}
                label={{ value: 'Years', position: 'insideBottom', offset: -2, fill: '#8b8fa8', fontSize: 11 }}
              />
              <YAxis
                stroke="#8b8fa8" tick={{ fontSize: 11 }}
                tickFormatter={(v) => `$${(v / 1e6).toFixed(1)}M`}
              />
              <Tooltip content={<CustomTooltip />} />
              {(vals.target_number ?? 0) > 0 && (
                <ReferenceLine
                  y={vals.target_number} stroke="#22c55e" strokeDasharray="5 3"
                  label={{ value: 'Target', fill: '#22c55e', fontSize: 11, position: 'insideTopRight' }}
                />
              )}
              {hasEnhancements && (
                <Line
                  type="monotone" dataKey="baseline" name="No enhancements"
                  stroke="#8b8fa8" strokeWidth={1.5} strokeDasharray="4 3"
                  dot={false} connectNulls
                />
              )}
              <Area
                type="monotone" dataKey="value" name="Projection"
                stroke="#6366f1" strokeWidth={2} fill="url(#projGrad)" dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Row 6: Year-by-Year Snapshot */}
      {snapshots.length > 0 && (
        <div className="mt-6">
          <ProjectionSnapshot snapshots={snapshots} categories={categories} />
        </div>
      )}
    </div>
  )
}
