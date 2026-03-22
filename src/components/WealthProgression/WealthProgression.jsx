import { useState, useMemo } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer, Legend,
} from 'recharts'
import { useAssets } from '../../hooks/useAssets'
import { useCategories } from '../../hooks/useCategories'
import { useBudget, calcNetSavings } from '../../hooks/useBudget'
import { useFISettings } from '../../hooks/useFISettings'
import { formatCurrency } from '../../lib/format'
import PageHeader from '../Layout/PageHeader'

const HORIZONS = [10, 20, 30, 50]
const MILESTONES = [100_000, 250_000, 500_000, 1_000_000, 2_000_000, 5_000_000, 10_000_000]

const formatY = (v) => {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000)     return `$${(v / 1_000).toFixed(0)}k`
  return `$${v}`
}

function projectWealth({ assets, categories, monthlySavings, years }) {
  const catMap = Object.fromEntries(categories.map((c) => [c.id, c]))

  // Only include categories that have assets
  const activeCatIds = [...new Set(assets.map((a) => a.category_id).filter(Boolean))]
  const activeCategories = activeCatIds.map((id) => catMap[id]).filter(Boolean)

  // Initial balances
  let balances = {}
  for (const catId of activeCatIds) {
    balances[catId] = assets
      .filter((a) => a.category_id === catId)
      .reduce((s, a) => s + (a.value ?? 0), 0)
  }

  const initialTotal = Object.values(balances).reduce((s, v) => s + v, 0)
  let totalContributions = initialTotal
  const months = years * 12
  const dataPoints = []

  for (let m = 0; m <= months; m++) {
    // Sample every quarter
    if (m % 3 === 0) {
      const total = Object.values(balances).reduce((s, v) => s + v, 0)
      const point = {
        year: parseFloat((m / 12).toFixed(2)),
        total: Math.round(total),
        contributions: Math.round(Math.max(totalContributions, 0)),
        growth: Math.round(Math.max(total - totalContributions, 0)),
      }
      for (const catId of activeCatIds) {
        point[catId] = Math.round(Math.max(balances[catId] ?? 0, 0))
      }
      dataPoints.push(point)
    }

    if (m < months) {
      const total = Object.values(balances).reduce((s, v) => s + v, 0)
      const newBalances = {}
      for (const catId of activeCatIds) {
        const cat = catMap[catId]
        const monthlyReturn = (cat?.return_rate ?? 7) / 100 / 12
        const weight = total > 0 ? (balances[catId] ?? 0) / total : 1 / activeCatIds.length
        newBalances[catId] = (balances[catId] ?? 0) * (1 + monthlyReturn) + monthlySavings * weight
      }
      balances = newBalances
      totalContributions += monthlySavings
    }
  }

  return { dataPoints, activeCategories }
}

function findMilestones(dataPoints, targetNumber) {
  const targets = [...MILESTONES]
  if (targetNumber > 0 && !targets.includes(targetNumber)) {
    targets.push(targetNumber)
    targets.sort((a, b) => a - b)
  }
  return targets
    .filter((t) => t > (dataPoints[0]?.total ?? 0))
    .map((t) => {
      const hit = dataPoints.find((p) => p.total >= t)
      return hit ? { amount: t, year: hit.year } : null
    })
    .filter(Boolean)
}

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  const sorted = [...payload].sort((a, b) => b.value - a.value)
  return (
    <div className="bg-card border border-border rounded-xl px-4 py-3 text-sm shadow-xl min-w-[180px]">
      <p className="text-muted text-xs mb-2">Year {label}</p>
      {sorted.map((entry) => (
        <div key={entry.dataKey} className="flex justify-between gap-6 py-0.5">
          <span style={{ color: entry.color }} className="text-xs">{entry.name}</span>
          <span className="text-white font-medium text-xs">{formatCurrency(entry.value)}</span>
        </div>
      ))}
    </div>
  )
}

export default function WealthProgression() {
  const { assets, loading: assetsLoading } = useAssets()
  const { categories, loading: catsLoading } = useCategories()
  const { totals, loading: budgetLoading } = useBudget()
  const { settings, loading: settingsLoading } = useFISettings()
  const [horizon, setHorizon] = useState(20)

  const effectiveTaxRate = settings.effective_tax_rate ?? 25
  const monthlySavings   = calcNetSavings(totals, effectiveTaxRate)

  const { dataPoints, activeCategories } = useMemo(
    () => projectWealth({ assets, categories, monthlySavings, years: horizon }),
    [assets, categories, monthlySavings, horizon]
  )

  const milestones = useMemo(
    () => findMilestones(dataPoints, settings.target_number ?? 0),
    [dataPoints, settings.target_number]
  )

  const finalTotal = dataPoints[dataPoints.length - 1]?.total ?? 0
  const finalGrowth = dataPoints[dataPoints.length - 1]?.growth ?? 0
  const currentTotal = dataPoints[0]?.total ?? 0

  if (assetsLoading || catsLoading || budgetLoading || settingsLoading)
    return <div className="text-muted animate-pulse">Loading…</div>

  const hasData = dataPoints.length > 1 && activeCategories.length > 0

  return (
    <div>
      <PageHeader
        title="Wealth Progression"
        subtitle="How your total wealth and its composition evolves over time"
      />

      {/* Controls + summary */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex gap-2">
          {HORIZONS.map((h) => (
            <button
              key={h}
              onClick={() => setHorizon(h)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                horizon === h
                  ? 'bg-accent text-white'
                  : 'bg-card border border-border text-muted hover:text-white'
              }`}
            >
              {h}yr
            </button>
          ))}
        </div>
        <div className="flex gap-4 text-sm">
          <span className="text-muted">
            Monthly surplus: <span className={monthlySavings >= 0 ? 'text-positive font-medium' : 'text-negative font-medium'}>
              {formatCurrency(monthlySavings)}/mo
            </span>
          </span>
          <span className="text-muted">
            Blended return: <span className="text-accent font-medium">
              {activeCategories.length > 0
                ? (activeCategories.reduce((s, c) => {
                    const val = assets.filter(a => a.category_id === c.id).reduce((sv, a) => sv + a.value, 0)
                    return s + (val / (currentTotal || 1)) * c.return_rate
                  }, 0)).toFixed(1)
                : '—'}%
            </span>
          </span>
        </div>
      </div>

      {!hasData ? (
        <div className="bg-card border border-border rounded-2xl p-10 text-center">
          <p className="text-white text-sm font-medium">No data to project yet</p>
          <p className="text-muted text-xs mt-1">Add assets and categories to see your wealth progression.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Chart 1: Total Wealth */}
          <div className="bg-card border border-border rounded-2xl p-5">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-semibold text-white">Total Wealth Over Time</h3>
              <span className="text-xs text-muted">
                {formatCurrency(currentTotal)} → <span className="text-accent font-medium">{formatCurrency(finalTotal)}</span> in {horizon}yr
              </span>
            </div>
            <p className="text-xs text-muted mb-4">
              {formatCurrency(finalGrowth)} of that ({((finalGrowth / (finalTotal || 1)) * 100).toFixed(0)}%) from compound growth
            </p>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={dataPoints} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="totalGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#2e3254" />
                <XAxis dataKey="year" stroke="#8b8fa8" tick={{ fontSize: 11 }}
                  label={{ value: 'Years', position: 'insideBottom', offset: -2, fill: '#8b8fa8', fontSize: 11 }} />
                <YAxis stroke="#8b8fa8" tick={{ fontSize: 11 }} tickFormatter={formatY} width={60} />
                <Tooltip content={<ChartTooltip />} />
                {(settings.target_number ?? 0) > 0 && (
                  <ReferenceLine y={settings.target_number} stroke="#22c55e" strokeDasharray="5 3"
                    label={{ value: 'FI Target', fill: '#22c55e', fontSize: 11, position: 'insideTopRight' }} />
                )}
                <Area type="monotone" dataKey="total" name="Total Wealth"
                  stroke="#6366f1" strokeWidth={2} fill="url(#totalGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Chart 2: Wealth Composition (stacked) */}
            <div className="bg-card border border-border rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-white mb-1">Wealth Composition</h3>
              <p className="text-xs text-muted mb-4">How each asset category grows over time</p>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={dataPoints} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <defs>
                    {activeCategories.map((cat) => (
                      <linearGradient key={cat.id} id={`grad-${cat.id}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor={cat.color} stopOpacity={0.6} />
                        <stop offset="95%" stopColor={cat.color} stopOpacity={0.1} />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2e3254" />
                  <XAxis dataKey="year" stroke="#8b8fa8" tick={{ fontSize: 11 }}
                    label={{ value: 'Years', position: 'insideBottom', offset: -2, fill: '#8b8fa8', fontSize: 11 }} />
                  <YAxis stroke="#8b8fa8" tick={{ fontSize: 11 }} tickFormatter={formatY} width={60} />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend
                    iconType="circle" iconSize={8}
                    formatter={(v) => <span style={{ color: '#8b8fa8', fontSize: 11 }}>{v}</span>}
                  />
                  {activeCategories.map((cat) => (
                    <Area
                      key={cat.id}
                      type="monotone"
                      dataKey={cat.id}
                      name={cat.name}
                      stackId="composition"
                      stroke={cat.color}
                      strokeWidth={1.5}
                      fill={`url(#grad-${cat.id})`}
                      dot={false}
                    />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Chart 3: Contributions vs Growth */}
            <div className="bg-card border border-border rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-white mb-1">Contributions vs. Compound Growth</h3>
              <p className="text-xs text-muted mb-4">How much of your wealth is earned vs. saved</p>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={dataPoints} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="contribGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.5} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0.1} />
                    </linearGradient>
                    <linearGradient id="growthGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#22c55e" stopOpacity={0.5} />
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0.1} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2e3254" />
                  <XAxis dataKey="year" stroke="#8b8fa8" tick={{ fontSize: 11 }}
                    label={{ value: 'Years', position: 'insideBottom', offset: -2, fill: '#8b8fa8', fontSize: 11 }} />
                  <YAxis stroke="#8b8fa8" tick={{ fontSize: 11 }} tickFormatter={formatY} width={60} />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend
                    iconType="circle" iconSize={8}
                    formatter={(v) => <span style={{ color: '#8b8fa8', fontSize: 11 }}>{v}</span>}
                  />
                  <Area type="monotone" dataKey="contributions" name="Contributions"
                    stackId="cg" stroke="#6366f1" strokeWidth={1.5} fill="url(#contribGrad)" dot={false} />
                  <Area type="monotone" dataKey="growth" name="Compound Growth"
                    stackId="cg" stroke="#22c55e" strokeWidth={1.5} fill="url(#growthGrad)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Milestones */}
          {milestones.length > 0 && (
            <div className="bg-card border border-border rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-white mb-4">Milestones</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {milestones.map(({ amount, year }) => {
                  const isTarget = amount === settings.target_number
                  return (
                    <div
                      key={amount}
                      className={`rounded-xl p-3 border ${
                        isTarget
                          ? 'border-positive/40 bg-positive/10'
                          : 'border-border bg-surface'
                      }`}
                    >
                      <p className={`text-sm font-bold ${isTarget ? 'text-positive' : 'text-white'}`}>
                        {formatCurrency(amount)}
                      </p>
                      <p className="text-xs text-muted mt-0.5">
                        Year {year} · ~{Math.round(new Date().getFullYear() + year)}
                      </p>
                      {isTarget && (
                        <p className="text-xs text-positive mt-0.5">FI Target</p>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
