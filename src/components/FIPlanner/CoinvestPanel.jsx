import { useState, useRef } from 'react'
import { formatCurrency } from '../../lib/format'

const CURRENT_DEFAULTS = {
  name: '',
  investedAmount: '',
  currentMark: '',
  distributions: [{ year: '1', amount: '' }],
}

const FUTURE_DEFAULTS = {
  name: '',
  investedAmount: '',
  startYear: '2',
  annualReturnRate: '15',
  horizonYears: '7',
}

function calcFutureReturn(investedAmount, annualReturnRate, horizonYears) {
  return Number(investedAmount) * Math.pow(1 + Number(annualReturnRate) / 100, Number(horizonYears))
}

export default function CoinvestPanel({ coinvests, onChange }) {
  const [vehicleType, setVehicleType] = useState('current')
  const [showForm, setShowForm] = useState(false)
  const [cf, setCf] = useState(CURRENT_DEFAULTS)   // current form state
  const [ff, setFf] = useState(FUTURE_DEFAULTS)     // future form state

  const currentYear = new Date().getFullYear()

  // ── Current form helpers ──────────────────────────────────────────────────

  const addDistRow = () => {
    const lastYear = cf.distributions[cf.distributions.length - 1]?.year ?? '0'
    setCf((p) => ({
      ...p,
      distributions: [...p.distributions, { year: String(Number(lastYear) + 1), amount: '' }],
    }))
  }

  const removeDistRow = (i) =>
    setCf((p) => ({ ...p, distributions: p.distributions.filter((_, idx) => idx !== i) }))

  const updateDistRow = (i, key, val) =>
    setCf((p) => ({
      ...p,
      distributions: p.distributions.map((d, idx) => (idx === i ? { ...d, [key]: val } : d)),
    }))

  // ── Add vehicle ───────────────────────────────────────────────────────────

  const addCoinvest = () => {
    if (vehicleType === 'current') {
      if (!cf.name.trim() || !cf.investedAmount) return
      const distributions = cf.distributions
        .filter((d) => d.amount && Number(d.amount) > 0)
        .map((d) => ({ year: Number(d.year), amount: Number(d.amount) }))
        .sort((a, b) => a.year - b.year)
      onChange((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          name: cf.name.trim(),
          type: 'current',
          investedAmount: Number(cf.investedAmount),
          currentMark: Number(cf.currentMark) || 0,
          distributions,
        },
      ])
      setCf(CURRENT_DEFAULTS)
    } else {
      if (!ff.name.trim() || !ff.investedAmount) return
      onChange((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          name: ff.name.trim(),
          type: 'future',
          investedAmount: Number(ff.investedAmount),
          startYear: Number(ff.startYear),
          annualReturnRate: Number(ff.annualReturnRate),
          horizonYears: Number(ff.horizonYears),
        },
      ])
      setFf(FUTURE_DEFAULTS)
    }
    setShowForm(false)
  }

  const remove = (id) => onChange((prev) => prev.filter((c) => c.id !== id))

  const updateMark = (id, mark) =>
    onChange((prev) => prev.map((c) => c.id === id ? { ...c, currentMark: Number(mark) || 0 } : c))

  // ── Future preview ────────────────────────────────────────────────────────
  const futureTotal =
    ff.investedAmount && ff.annualReturnRate && ff.horizonYears
      ? calcFutureReturn(ff.investedAmount, ff.annualReturnRate, ff.horizonYears)
      : 0
  const futureMOIC =
    ff.investedAmount && futureTotal
      ? (futureTotal / Number(ff.investedAmount)).toFixed(2)
      : null

  // ── Current form preview ──────────────────────────────────────────────────
  const currentDistTotal = cf.distributions.reduce((s, d) => s + (Number(d.amount) || 0), 0)
  const currentMOIC =
    cf.investedAmount && currentDistTotal
      ? (currentDistTotal / Number(cf.investedAmount)).toFixed(2)
      : null

  return (
    <div className="bg-card border border-border rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-white">Co-Investments</h3>
          <p className="text-xs text-muted mt-0.5">
            Illiquid capital that unlocks via distributions or at liquidation — modeled separately from liquid buckets.
          </p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="text-xs text-accent hover:text-white transition-colors flex-shrink-0 ml-4"
        >
          {showForm ? 'Cancel' : '+ Add'}
        </button>
      </div>

      {showForm && (
        <div className="bg-surface rounded-xl p-4 mb-4 space-y-3">
          {/* Type toggle */}
          <div className="flex gap-2">
            {[
              { key: 'current', label: 'Current Vehicle' },
              { key: 'future',  label: 'Future Vehicle'  },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setVehicleType(key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  vehicleType === key
                    ? 'bg-accent text-white'
                    : 'bg-white/5 text-muted hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {vehicleType === 'current' ? (
            <>
              {/* Name + invested amount + current mark */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-muted mb-1">Fund Name</label>
                  <input
                    type="text"
                    value={cf.name}
                    onChange={(e) => setCf((p) => ({ ...p, name: e.target.value }))}
                    placeholder="Fund III Co-Invest"
                    className="w-full bg-card border border-border rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-accent"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted mb-1">Total Invested</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm">$</span>
                    <input
                      type="number" min="0" step="1000"
                      value={cf.investedAmount}
                      onChange={(e) => setCf((p) => ({ ...p, investedAmount: e.target.value }))}
                      placeholder="100000"
                      className="w-full bg-card border border-border rounded-lg pl-6 pr-3 py-1.5 text-sm text-white focus:outline-none focus:border-accent"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-muted mb-1">Current Mark</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm">$</span>
                    <input
                      type="number" min="0" step="1000"
                      value={cf.currentMark}
                      onChange={(e) => setCf((p) => ({ ...p, currentMark: e.target.value }))}
                      placeholder="0"
                      className="w-full bg-card border border-border rounded-lg pl-6 pr-3 py-1.5 text-sm text-white focus:outline-none focus:border-accent"
                    />
                  </div>
                </div>
              </div>

              {/* Distribution schedule */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs text-muted font-medium">Projected Distributions by Year</label>
                  <button
                    onClick={addDistRow}
                    className="text-xs text-accent hover:text-white transition-colors"
                  >
                    + Add Year
                  </button>
                </div>
                <div className="space-y-2">
                  {cf.distributions.map((d, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <div className="relative w-28 flex-shrink-0">
                        <input
                          type="number" min="0" step="1"
                          value={d.year}
                          onChange={(e) => updateDistRow(i, 'year', e.target.value)}
                          className="w-full bg-card border border-border rounded-lg px-3 pr-8 py-1.5 text-sm text-white focus:outline-none focus:border-accent"
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-muted text-xs">yr</span>
                      </div>
                      <div className="relative flex-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm">$</span>
                        <input
                          type="number" min="0" step="1000"
                          value={d.amount}
                          onChange={(e) => updateDistRow(i, 'amount', e.target.value)}
                          placeholder="50000"
                          className="w-full bg-card border border-border rounded-lg pl-6 pr-3 py-1.5 text-sm text-white focus:outline-none focus:border-accent"
                        />
                      </div>
                      <span className="text-xs text-muted w-12 flex-shrink-0 text-right">
                        ~{currentYear + Number(d.year || 0)}
                      </span>
                      {cf.distributions.length > 1 && (
                        <button
                          onClick={() => removeDistRow(i)}
                          className="text-muted hover:text-negative text-base flex-shrink-0 leading-none"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                {currentDistTotal > 0 && (
                  <p className="text-xs text-muted mt-2">
                    Total: <span className="text-white font-medium">{formatCurrency(currentDistTotal)}</span>
                    {currentMOIC && (
                      <span className="ml-3 text-accent font-medium">{currentMOIC}x MOIC</span>
                    )}
                  </p>
                )}
              </div>
            </>
          ) : (
            <>
              {/* Name + amount */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-muted mb-1">Fund Name</label>
                  <input
                    type="text"
                    value={ff.name}
                    onChange={(e) => setFf((p) => ({ ...p, name: e.target.value }))}
                    placeholder="Fund IV Co-Invest"
                    className="w-full bg-card border border-border rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-accent"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted mb-1">Investment Amount</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm">$</span>
                    <input
                      type="number" min="0" step="1000"
                      value={ff.investedAmount}
                      onChange={(e) => setFf((p) => ({ ...p, investedAmount: e.target.value }))}
                      placeholder="150000"
                      className="w-full bg-card border border-border rounded-lg pl-6 pr-3 py-1.5 text-sm text-white focus:outline-none focus:border-accent"
                    />
                  </div>
                </div>
              </div>

              {/* Return parameters */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-muted mb-1">Invest in Year</label>
                  <div className="relative">
                    <input
                      type="number" min="0" step="1"
                      value={ff.startYear}
                      onChange={(e) => setFf((p) => ({ ...p, startYear: e.target.value }))}
                      className="w-full bg-card border border-border rounded-lg px-3 pr-8 py-1.5 text-sm text-white focus:outline-none focus:border-accent"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-muted text-xs">yrs</span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-muted mb-1">Annual Return</label>
                  <div className="relative">
                    <input
                      type="number" min="0" step="0.5"
                      value={ff.annualReturnRate}
                      onChange={(e) => setFf((p) => ({ ...p, annualReturnRate: e.target.value }))}
                      className="w-full bg-card border border-border rounded-lg px-3 pr-6 py-1.5 text-sm text-white focus:outline-none focus:border-accent"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-muted text-xs">%</span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-muted mb-1">Fund Horizon</label>
                  <div className="relative">
                    <input
                      type="number" min="1" step="1"
                      value={ff.horizonYears}
                      onChange={(e) => setFf((p) => ({ ...p, horizonYears: e.target.value }))}
                      className="w-full bg-card border border-border rounded-lg px-3 pr-8 py-1.5 text-sm text-white focus:outline-none focus:border-accent"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-muted text-xs">yr</span>
                  </div>
                </div>
              </div>

              {futureTotal > 0 && (
                <div className="flex items-center gap-4 text-xs text-muted">
                  <span>
                    Liquidates ~{currentYear + Number(ff.startYear || 0) + Number(ff.horizonYears || 0)}
                  </span>
                  <span>
                    Projected return:{' '}
                    <span className="text-white font-medium">{formatCurrency(futureTotal)}</span>
                  </span>
                  {futureMOIC && (
                    <span className="text-accent font-medium">{futureMOIC}x MOIC</span>
                  )}
                </div>
              )}
            </>
          )}

          <div className="flex justify-end pt-1">
            <button
              onClick={addCoinvest}
              disabled={
                vehicleType === 'current'
                  ? !cf.name.trim() || !cf.investedAmount
                  : !ff.name.trim() || !ff.investedAmount
              }
              className="bg-accent hover:bg-accent-hover text-white text-xs font-medium px-4 py-1.5 rounded-lg transition-colors disabled:opacity-40"
            >
              {vehicleType === 'current' ? 'Add Current Vehicle' : 'Add Future Vehicle'}
            </button>
          </div>
        </div>
      )}

      {coinvests.length === 0 && !showForm ? (
        <p className="text-xs text-muted italic">
          No co-investments added. Model current fund distributions or future vehicles.
        </p>
      ) : (
        <div className="space-y-2">
          {coinvests.map((c) => {
            const totalDist = c.type === 'current'
              ? c.distributions.reduce((s, d) => s + d.amount, 0)
              : calcFutureReturn(c.investedAmount, c.annualReturnRate, c.horizonYears)
            const moic = c.investedAmount > 0 ? (totalDist / c.investedAmount).toFixed(2) : null

            return (
              <div key={c.id} className="bg-white/5 border border-border/50 rounded-xl px-4 py-3">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        c.type === 'current'
                          ? 'bg-blue-500/20 text-blue-400'
                          : 'bg-purple-500/20 text-purple-400'
                      }`}
                    >
                      {c.type === 'current' ? 'Current' : 'Future'}
                    </span>
                    <span className="text-sm font-semibold text-white">{c.name}</span>
                  </div>
                  <button
                    onClick={() => remove(c.id)}
                    className="text-muted hover:text-negative text-xs transition-colors"
                  >
                    Remove
                  </button>
                </div>

                {c.type === 'current' ? (
                  <div className="text-xs text-muted space-y-1.5">
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                      <span>{formatCurrency(c.investedAmount)} invested</span>
                      <span>{formatCurrency(totalDist)} total distributions</span>
                      {moic && <span className="text-accent font-medium">{moic}x MOIC</span>}
                      <span className="flex items-center gap-1.5 ml-auto">
                        <span className="text-muted">Current mark:</span>
                        <div className="relative">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted text-xs">$</span>
                          <input
                            type="number" min="0" step="1000"
                            defaultValue={c.currentMark ?? 0}
                            onBlur={(e) => updateMark(c.id, e.target.value)}
                            className="w-28 bg-card border border-border rounded-lg pl-5 pr-2 py-0.5 text-xs text-white focus:outline-none focus:border-accent"
                          />
                        </div>
                        {(c.currentMark ?? 0) > 0 && (
                          <span className="text-cyan-400 font-medium">{formatCurrency(c.currentMark)}</span>
                        )}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-x-3">
                      {c.distributions.map((d, i) => (
                        <span key={i} className="text-white/70">
                          Yr {d.year}: {formatCurrency(d.amount)}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                    <span>{formatCurrency(c.investedAmount)} at Year {c.startYear}</span>
                    <span>{c.annualReturnRate}%/yr · {c.horizonYears}yr horizon</span>
                    <span>Liquidates ~{currentYear + c.startYear + c.horizonYears}</span>
                    {moic && <span className="text-accent font-medium">{moic}x MOIC</span>}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
