import { useState } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { formatCurrency } from '../../lib/format'

const PROPERTY_COLORS = ['#f97316', '#f59e0b', '#ef4444', '#ec4899', '#a855f7']

// ── Income flow breakdown ─────────────────────────────────────────────────────

function FlowRow({ label, value, maxVal, color, bold = false, indent = false }) {
  const pct = maxVal > 0 ? Math.min(100, (Math.abs(value) / maxVal) * 100) : 0
  const isPositive = value >= 0
  return (
    <div className={`flex items-center gap-3 ${indent ? 'pl-4' : ''}`}>
      <div className="w-40 flex-shrink-0 text-right">
        <span className={`text-xs ${bold ? 'text-white font-semibold' : 'text-muted'}`}>
          {label}
        </span>
      </div>
      <div className="flex-1 h-4 bg-white/5 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <div className="w-28 text-right flex-shrink-0">
        <span
          className={`text-xs font-mono ${
            bold ? 'font-bold' : ''
          } ${isPositive ? (bold ? 'text-accent' : 'text-positive') : 'text-negative'}`}
        >
          {isPositive ? '' : '−'}{formatCurrency(Math.abs(value))}/yr
        </span>
      </div>
    </div>
  )
}

function IncomeFlow({ snapshot }) {
  const gross = snapshot.grossAnnualIncome
  const taxes = snapshot.annualTaxes
  const totalExpenses = snapshot.expenses.reduce((s, e) => s + e.annualAmount, 0)
  const totalMortgages = snapshot.mortgages.reduce((s, m) => s + m.annualAmount, 0)
  const netSavings = gross - taxes - totalExpenses - totalMortgages

  return (
    <div className="space-y-2">
      <FlowRow label="Gross Income" value={gross} maxVal={gross} color="#22c55e" bold />

      <FlowRow
        label={`Income Tax (${((taxes / gross) * 100).toFixed(0)}%)`}
        value={-taxes}
        maxVal={gross}
        color="#ef4444"
        indent
      />

      {snapshot.expenses.map((e) => (
        <FlowRow
          key={e.name}
          label={e.name}
          value={-e.annualAmount}
          maxVal={gross}
          color="#f97316"
          indent
        />
      ))}

      {snapshot.mortgages.map((m) => (
        <FlowRow
          key={m.id}
          label={`${m.name} mortgage`}
          value={-m.annualAmount}
          maxVal={gross}
          color="#f59e0b"
          indent
        />
      ))}

      <div className="border-t border-border pt-2 mt-1">
        <FlowRow
          label="Net Savings"
          value={netSavings}
          maxVal={gross}
          color={netSavings >= 0 ? '#6366f1' : '#ef4444'}
          bold
        />
      </div>

      {/* Summary numbers */}
      <div className="grid grid-cols-3 gap-2 pt-3 mt-1">
        {[
          { label: 'Gross', value: gross, color: 'text-positive' },
          { label: 'Expenses + Tax', value: taxes + totalExpenses + totalMortgages, color: 'text-negative' },
          { label: 'Net Savings', value: netSavings, color: netSavings >= 0 ? 'text-accent' : 'text-negative' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white/5 rounded-lg px-3 py-2 text-center">
            <p className="text-xs text-muted mb-0.5">{label}</p>
            <p className={`text-sm font-bold ${color}`}>{formatCurrency(value)}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Asset composition donut ───────────────────────────────────────────────────

const DonutTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  const { name, value } = payload[0].payload
  return (
    <div className="bg-card border border-border rounded-xl px-3 py-2 text-xs shadow-xl">
      <p className="text-muted mb-0.5">{name}</p>
      <p className="text-white font-semibold">{formatCurrency(value)}</p>
    </div>
  )
}

function AssetDonut({ snapshot, categories }) {
  const catMap = Object.fromEntries(categories.map((c) => [c.id, c]))

  const bucketSlices = Object.entries(snapshot.buckets)
    .filter(([, bal]) => bal > 0)
    .map(([catId, bal]) => ({
      name: catMap[catId]?.name ?? (catId === '__default__' ? 'Investments' : catId),
      value: Math.round(bal),
      color: catMap[catId]?.color ?? '#6366f1',
    }))

  const propertySlices = snapshot.properties
    .filter((p) => p.equity > 0)
    .map((p, i) => ({
      name: `${p.name} (equity)`,
      value: Math.round(p.equity),
      color: PROPERTY_COLORS[i % PROPERTY_COLORS.length],
    }))

  const data = [...bucketSlices, ...propertySlices]
  const total = data.reduce((s, d) => s + d.value, 0)

  if (data.length === 0) {
    return <p className="text-xs text-muted text-center py-8">No assets yet at this year.</p>
  }

  return (
    <div>
      <ResponsiveContainer width="100%" height={240}>
        <PieChart>
          <Pie
            data={data}
            cx="50%" cy="50%"
            innerRadius={65} outerRadius={105}
            paddingAngle={2}
            dataKey="value"
          >
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<DonutTooltip />} />
          <Legend
            iconType="circle"
            iconSize={7}
            formatter={(v) => <span style={{ color: '#8b8fa8', fontSize: 11 }}>{v}</span>}
          />
        </PieChart>
      </ResponsiveContainer>

      {/* Breakdown list */}
      <div className="space-y-1.5 mt-2">
        {data.map((d) => (
          <div key={d.name} className="flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ background: d.color }}
            />
            <span className="flex-1 text-xs text-muted truncate">{d.name}</span>
            <span className="text-xs text-white font-medium">{formatCurrency(d.value)}</span>
            <span className="text-xs text-muted w-10 text-right">
              {total > 0 ? ((d.value / total) * 100).toFixed(1) : 0}%
            </span>
          </div>
        ))}
        <div className="border-t border-border pt-1.5 flex items-center justify-between">
          <span className="text-xs text-muted font-semibold">Total Net Worth</span>
          <span className="text-xs text-white font-bold">{formatCurrency(total)}</span>
        </div>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ProjectionSnapshot({ snapshots, categories }) {
  const [selectedYear, setSelectedYear] = useState(0)

  if (!snapshots || snapshots.length === 0) return null

  const maxYear = snapshots[snapshots.length - 1].year
  const snapshot = snapshots[Math.min(selectedYear, snapshots.length - 1)]
  const calendarYear = new Date().getFullYear() + selectedYear

  return (
    <div className="bg-card border border-border rounded-2xl p-5">
      {/* Header + year slider */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
        <div>
          <h3 className="text-sm font-semibold text-white">Year-by-Year Snapshot</h3>
          <p className="text-xs text-muted mt-0.5">
            Income breakdown and asset composition at a specific point in your projection.
          </p>
        </div>
        <div className="sm:ml-auto flex items-center gap-3 flex-shrink-0">
          <span className="text-xs text-muted whitespace-nowrap">
            Year {selectedYear}
            <span className="text-muted/60 ml-1">(~{calendarYear})</span>
          </span>
          <input
            type="range"
            min={0}
            max={maxYear}
            step={1}
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="w-40 accent-accent"
          />
        </div>
      </div>

      {/* Two-panel layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Income / Expense breakdown */}
        <div>
          <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">
            Annual Income &amp; Expenses
          </h4>
          <IncomeFlow snapshot={snapshot} />
        </div>

        {/* Asset composition */}
        <div>
          <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">
            Asset Composition
          </h4>
          <AssetDonut snapshot={snapshot} categories={categories} />
        </div>
      </div>
    </div>
  )
}
