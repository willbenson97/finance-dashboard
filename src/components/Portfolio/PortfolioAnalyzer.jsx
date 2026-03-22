import { useState } from 'react'
import { usePositions } from '../../hooks/usePositions'
import { useCategories } from '../../hooks/useCategories'
import { formatCurrency, formatPercent } from '../../lib/format'
import PageHeader from '../Layout/PageHeader'
import PositionForm from './PositionForm'

function GainBadge({ costBasis, currentValue }) {
  if (costBasis == null || costBasis === 0) return null
  const gain = currentValue - costBasis
  const pct = (gain / costBasis) * 100
  const positive = gain >= 0
  return (
    <span className={`text-xs font-medium ${positive ? 'text-positive' : 'text-negative'}`}>
      {positive ? '▲' : '▼'} {formatCurrency(Math.abs(gain))} ({formatPercent(pct)})
    </span>
  )
}

export default function PortfolioAnalyzer() {
  const { positions, loading: posLoading, addPosition, updatePosition, deletePosition } = usePositions()
  const { categories, loading: catsLoading } = useCategories()
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)

  const catMap = Object.fromEntries(categories.map((c) => [c.id, c]))

  const totalValue = positions.reduce((s, p) => s + (p.current_value ?? 0), 0)
  const totalCost  = positions.reduce((s, p) => s + (p.cost_basis ?? 0), 0)
  const totalGain  = totalValue - totalCost

  const handleAdd = async (pos) => {
    await addPosition(pos)
    setShowForm(false)
  }

  const handleUpdate = async (pos) => {
    await updatePosition(editing.id, pos)
    setEditing(null)
  }

  const grouped = positions.reduce((acc, p) => {
    const key = p.category_id ?? 'uncategorized'
    ;(acc[key] = acc[key] ?? []).push(p)
    return acc
  }, {})

  if (posLoading || catsLoading) return <div className="text-muted animate-pulse">Loading…</div>

  return (
    <div>
      <PageHeader title="Portfolio" subtitle="Individual positions with cost basis and gain/loss" />

      {/* Summary row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total Value',      value: formatCurrency(totalValue) },
          { label: 'Total Cost Basis', value: formatCurrency(totalCost) },
          {
            label: 'Total Gain / Loss',
            value: formatCurrency(Math.abs(totalGain)),
            sub: totalCost > 0 ? formatPercent((totalGain / totalCost) * 100) : null,
            positive: totalGain >= 0,
          },
        ].map(({ label, value, sub, positive }) => (
          <div key={label} className="bg-card border border-border rounded-2xl p-5">
            <p className="text-muted text-xs">{label}</p>
            <p className={`text-2xl font-bold mt-1 ${positive === false ? 'text-negative' : positive === true ? 'text-positive' : 'text-white'}`}>
              {value}
            </p>
            {sub && <p className={`text-xs mt-0.5 ${totalGain >= 0 ? 'text-positive' : 'text-negative'}`}>{sub}</p>}
          </div>
        ))}
      </div>

      <div className="flex justify-end mb-4">
        <button
          onClick={() => setShowForm(true)}
          className="bg-accent hover:bg-accent-hover text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          + Add Position
        </button>
      </div>

      {showForm && (
        <div className="bg-card border border-border rounded-2xl p-5 mb-6">
          <h3 className="text-sm font-semibold text-white mb-4">New Position</h3>
          <PositionForm categories={categories} onSubmit={handleAdd} onCancel={() => setShowForm(false)} />
        </div>
      )}

      {positions.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-8 text-center">
          <p className="text-muted text-sm">No positions yet. Add your first position above.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([catId, rows]) => {
            const cat = catMap[catId]
            return (
              <div key={catId} className="bg-card border border-border rounded-2xl overflow-hidden">
                <div className="px-5 py-3 border-b border-border flex items-center gap-2">
                  {cat && <span className="w-2 h-2 rounded-full" style={{ background: cat.color }} />}
                  <span className="text-xs font-semibold text-muted uppercase tracking-wider">
                    {cat?.name ?? 'Uncategorized'}
                  </span>
                </div>
                <table className="w-full">
                  <thead>
                    <tr className="text-xs text-muted border-b border-border">
                      <th className="text-left px-5 py-2.5">Name</th>
                      <th className="text-right px-5 py-2.5">Shares</th>
                      <th className="text-right px-5 py-2.5">Cost Basis</th>
                      <th className="text-right px-5 py-2.5">Current Value</th>
                      <th className="text-right px-5 py-2.5">Gain / Loss</th>
                      <th className="px-5 py-2.5" />
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((pos) =>
                      editing?.id === pos.id ? (
                        <tr key={pos.id}>
                          <td colSpan={6} className="px-5 py-4">
                            <PositionForm
                              categories={categories}
                              initial={{
                                name: pos.name, ticker: pos.ticker ?? '',
                                category_id: pos.category_id,
                                shares: pos.shares ?? '', cost_basis: pos.cost_basis ?? '',
                                current_value: pos.current_value,
                              }}
                              onSubmit={handleUpdate}
                              onCancel={() => setEditing(null)}
                            />
                          </td>
                        </tr>
                      ) : (
                        <tr key={pos.id} className="border-b border-border/50 hover:bg-white/[0.02] group">
                          <td className="px-5 py-3.5">
                            <p className="text-sm font-medium text-white">
                              {pos.name}{pos.ticker ? ` (${pos.ticker})` : ''}
                            </p>
                          </td>
                          <td className="px-5 py-3.5 text-right text-sm text-muted">
                            {pos.shares != null ? pos.shares.toLocaleString() : '—'}
                          </td>
                          <td className="px-5 py-3.5 text-right text-sm text-muted">
                            {pos.cost_basis != null ? formatCurrency(pos.cost_basis) : '—'}
                          </td>
                          <td className="px-5 py-3.5 text-right text-sm font-medium text-white">
                            {formatCurrency(pos.current_value)}
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <GainBadge costBasis={pos.cost_basis} currentValue={pos.current_value} />
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <div className="hidden group-hover:flex justify-end gap-2">
                              <button onClick={() => setEditing(pos)} className="text-xs text-muted hover:text-accent">Edit</button>
                              <button onClick={() => deletePosition(pos.id)} className="text-xs text-muted hover:text-negative">Delete</button>
                            </div>
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
