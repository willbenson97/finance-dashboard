import { formatCurrency } from '../../lib/format'

export default function SavingsAllocationPanel({ categories, allocation, onChange, initialBuckets }) {
  const allocMap = Object.fromEntries(allocation.map((a) => [a.categoryId, a.percent]))

  const setPercent = (categoryId, percent) => {
    const exists = allocation.some((a) => a.categoryId === categoryId)
    if (exists) {
      onChange(allocation.map((a) => (a.categoryId === categoryId ? { ...a, percent } : a)))
    } else {
      onChange([...allocation, { categoryId, percent }])
    }
  }

  const useCurrentWeights = () => {
    const total = Object.values(initialBuckets).reduce((s, b) => s + b.balance, 0)
    if (total === 0) return
    const next = categories.map((c) => ({
      categoryId: c.id,
      percent: +((((initialBuckets[c.id]?.balance ?? 0) / total) * 100).toFixed(1)),
    }))
    // Normalize to exactly 100
    const sum = next.reduce((s, a) => s + a.percent, 0)
    if (next.length > 0 && sum > 0) next[0].percent = +(next[0].percent + (100 - sum)).toFixed(1)
    onChange(next)
  }

  const allocTotal = allocation.reduce((s, a) => s + a.percent, 0)
  const isValid = Math.abs(allocTotal - 100) < 0.5
  const isEmpty = allocation.length === 0

  return (
    <div className="bg-card border border-border rounded-2xl p-5">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-semibold text-white">Savings Allocation</h3>
        <div className="flex items-center gap-3">
          {!isEmpty && (
            <span className={`text-xs ${isValid ? 'text-positive' : 'text-negative'}`}>
              {allocTotal.toFixed(0)}%{isValid ? ' ✓' : ' — must sum to 100%'}
            </span>
          )}
          <button
            onClick={useCurrentWeights}
            className="text-xs text-muted hover:text-white transition-colors"
          >
            Use current weights
          </button>
        </div>
      </div>
      <p className="text-xs text-muted mb-4">
        Where monthly savings flow — each bucket grows at its own return rate.
        Leave blank to distribute proportionally to current holdings.
      </p>

      {categories.length === 0 ? (
        <p className="text-xs text-muted italic">
          Add asset categories in Net Worth to configure allocation.
        </p>
      ) : (
        <div className="space-y-2.5">
          {categories.map((cat) => {
            const pct = allocMap[cat.id] ?? 0
            const bucketBalance = initialBuckets[cat.id]?.balance ?? 0
            return (
              <div key={cat.id} className="flex items-center gap-3">
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ background: cat.color }}
                />
                <span className="flex-1 text-sm text-white truncate">{cat.name}</span>
                <span className="text-xs text-muted w-24 text-right hidden sm:block">
                  {formatCurrency(bucketBalance)}
                </span>
                <span className="text-xs text-muted w-16 text-right">
                  {cat.return_rate}%/yr
                </span>
                <div className="relative w-20">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={pct}
                    onChange={(e) => setPercent(cat.id, Number(e.target.value))}
                    className="w-full bg-surface border border-border rounded-lg px-2 pr-6 py-1.5 text-sm text-white text-right focus:outline-none focus:border-accent"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-muted text-xs">
                    %
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
