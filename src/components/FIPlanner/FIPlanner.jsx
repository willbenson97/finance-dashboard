import { useState, useMemo } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer,
} from 'recharts'
import { useFISettings } from '../../hooks/useFISettings'
import { useAssets } from '../../hooks/useAssets'
import { useCategories } from '../../hooks/useCategories'
import { useBudget, calcNetSavings } from '../../hooks/useBudget'
import { formatCurrency, formatPercent } from '../../lib/format'
import PageHeader from '../Layout/PageHeader'

function buildProjection({ currentNetWorth, monthlySavings, blendedReturn, targetNumber }) {
  const monthlyReturn = blendedReturn / 100 / 12
  const points = []
  let balance = currentNetWorth
  let month = 0
  const maxMonths = 600

  while (balance < targetNumber && month < maxMonths) {
    points.push({ year: +(month / 12).toFixed(1), value: Math.round(balance) })
    balance = balance * (1 + monthlyReturn) + monthlySavings
    month++
  }
  points.push({ year: +(month / 12).toFixed(1), value: Math.round(balance) })
  return { points, yearsToFI: +(month / 12).toFixed(1) }
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-card border border-border rounded-xl px-4 py-3 text-sm shadow-xl">
      <p className="text-muted mb-1">Year {label}</p>
      <p className="text-white font-semibold">{formatCurrency(payload[0].value)}</p>
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

export default function FIPlanner() {
  const { settings, loading: settingsLoading, saveSettings } = useFISettings()
  const { assets, loading: assetsLoading } = useAssets()
  const { categories, loading: catsLoading } = useCategories()
  const { totals, loading: budgetLoading } = useBudget()
  const [local, setLocal] = useState(null)
  const [saved, setSaved] = useState(false)

  const vals = local ?? settings
  const set = (k) => (v) => setLocal((prev) => ({ ...(prev ?? settings), [k]: v }))

  const currentNetWorth = useMemo(
    () => assets.reduce((s, a) => s + (a.value ?? 0), 0),
    [assets]
  )

  const monthlySavings = calcNetSavings(totals, settings.effective_tax_rate ?? 25)

  // Weighted blended return from categories
  const blendedReturn = useMemo(() => {
    const catMap = Object.fromEntries(categories.map((c) => [c.id, c]))
    const total = assets.reduce((s, a) => s + (a.value ?? 0), 0)
    if (total === 0) return 7
    return assets.reduce((sum, a) => {
      const cat = catMap[a.category_id]
      const weight = (a.value ?? 0) / total
      return sum + weight * (cat?.return_rate ?? 7)
    }, 0)
  }, [assets, categories])

  const { points, yearsToFI } = useMemo(() => {
    if ((vals.target_number ?? 0) <= 0) return { points: [], yearsToFI: null }
    return buildProjection({
      currentNetWorth,
      monthlySavings,
      blendedReturn,
      targetNumber: vals.target_number,
    })
  }, [currentNetWorth, monthlySavings, blendedReturn, vals])

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

  if (settingsLoading || assetsLoading || catsLoading || budgetLoading)
    return <div className="text-muted animate-pulse">Loading…</div>

  return (
    <div>
      <PageHeader title="Retirement Planning" subtitle="Project your path to financial independence" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Inputs */}
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

        {/* Key metrics */}
        <div className="lg:col-span-2 grid grid-cols-2 gap-4 content-start">
          {[
            { label: 'Current Net Worth',    value: formatCurrency(currentNetWorth),  sub: 'from assets' },
            { label: 'Monthly Savings',      value: formatCurrency(monthlySavings),   sub: 'from budget' },
            {
              label: 'Years to Retirement',
              value: yearsToFI != null ? `${yearsToFI} yrs` : '—',
              sub: yearsToFI != null ? `~${new Date().getFullYear() + Math.ceil(yearsToFI)}` : 'set a target',
            },
            {
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

      {/* Projection chart */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-white">Portfolio Projection</h3>
          <span className="text-xs text-muted">
            Blended return: <span className="text-accent font-medium">{blendedReturn.toFixed(2)}%/yr</span>
            {' · '}{formatCurrency(monthlySavings)}/mo saved
          </span>
        </div>
        {points.length < 2 ? (
          <p className="text-muted text-sm">Set a target retirement number above to see your projection.</p>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={points} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
              <defs>
                <linearGradient id="projGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#2e3254" />
              <XAxis
                dataKey="year" stroke="#8b8fa8" tick={{ fontSize: 11 }}
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
              <Area type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={2} fill="url(#projGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
