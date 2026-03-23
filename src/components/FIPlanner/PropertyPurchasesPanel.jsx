import { useState } from 'react'
import { formatCurrency } from '../../lib/format'

function calcMonthlyPayment(price, dpType, dpValue, rate, termYears) {
  const downPmt = dpType === 'percent' ? (price * dpValue) / 100 : dpValue
  const loan = Math.max(0, price - downPmt)
  if (loan <= 0) return 0
  const r = rate / 100 / 12
  const n = termYears * 12
  if (r === 0) return loan / n
  return (loan * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)
}

const DEFAULTS = {
  name: '',
  purchaseYear: '3',
  price: '',
  downPaymentType: 'percent',
  downPaymentValue: '20',
  mortgageRate: '6.5',
  termYears: '30',
  appreciationRate: '3',
}

export default function PropertyPurchasesPanel({ properties, onChange }) {
  const [form, setForm] = useState(DEFAULTS)
  const [showForm, setShowForm] = useState(false)

  const f = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))

  const price = Number(form.price)
  const previewPayment =
    price > 0
      ? calcMonthlyPayment(
          price,
          form.downPaymentType,
          Number(form.downPaymentValue),
          Number(form.mortgageRate),
          Number(form.termYears)
        )
      : 0

  const addProperty = () => {
    if (!form.name.trim() || price <= 0) return
    onChange((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        name: form.name.trim(),
        purchaseYear: Number(form.purchaseYear),
        price,
        downPaymentType: form.downPaymentType,
        downPaymentValue: Number(form.downPaymentValue),
        mortgageRate: Number(form.mortgageRate),
        termYears: Number(form.termYears),
        appreciationRate: Number(form.appreciationRate),
      },
    ])
    setForm(DEFAULTS)
    setShowForm(false)
  }

  const removeProperty = (id) => onChange((prev) => prev.filter((p) => p.id !== id))

  return (
    <div className="bg-card border border-border rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-white">Property Purchases</h3>
          <p className="text-xs text-muted mt-0.5">
            Down payments reduce your investment buckets; mortgages reduce monthly savings; equity
            counts toward your total portfolio.
          </p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="text-xs text-accent hover:text-white transition-colors flex-shrink-0 ml-4"
        >
          {showForm ? 'Cancel' : '+ Add Property'}
        </button>
      </div>

      {showForm && (
        <div className="bg-surface rounded-xl p-4 mb-4 space-y-3">
          {/* Row 1 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-muted mb-1">Property Name</label>
              <input
                type="text"
                value={form.name}
                onChange={f('name')}
                placeholder="Primary Residence"
                className="w-full bg-card border border-border rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">Purchase in Year</label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={form.purchaseYear}
                  onChange={f('purchaseYear')}
                  className="w-full bg-card border border-border rounded-lg px-3 pr-12 py-1.5 text-sm text-white focus:outline-none focus:border-accent"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted text-xs">
                  yrs
                </span>
              </div>
            </div>
          </div>

          {/* Row 2 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-muted mb-1">Purchase Price</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm">$</span>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={form.price}
                  onChange={f('price')}
                  placeholder="500000"
                  className="w-full bg-card border border-border rounded-lg pl-6 pr-3 py-1.5 text-sm text-white focus:outline-none focus:border-accent"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">Down Payment</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  {form.downPaymentType === 'amount' && (
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted text-xs">$</span>
                  )}
                  <input
                    type="number"
                    min="0"
                    step={form.downPaymentType === 'percent' ? '1' : '1000'}
                    value={form.downPaymentValue}
                    onChange={f('downPaymentValue')}
                    className={`w-full bg-card border border-border rounded-lg py-1.5 text-sm text-white focus:outline-none focus:border-accent ${form.downPaymentType === 'amount' ? 'pl-5 pr-2' : 'px-3 pr-6'}`}
                  />
                  {form.downPaymentType === 'percent' && (
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-muted text-xs">%</span>
                  )}
                </div>
                <select
                  value={form.downPaymentType}
                  onChange={f('downPaymentType')}
                  className="bg-card border border-border rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-accent"
                >
                  <option value="percent">%</option>
                  <option value="amount">$</option>
                </select>
              </div>
            </div>
          </div>

          {/* Row 3 */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-muted mb-1">Mortgage Rate</label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={form.mortgageRate}
                  onChange={f('mortgageRate')}
                  className="w-full bg-card border border-border rounded-lg px-3 pr-6 py-1.5 text-sm text-white focus:outline-none focus:border-accent"
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-muted text-xs">%</span>
              </div>
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">Loan Term</label>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={form.termYears}
                  onChange={f('termYears')}
                  className="w-full bg-card border border-border rounded-lg px-3 pr-8 py-1.5 text-sm text-white focus:outline-none focus:border-accent"
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-muted text-xs">yr</span>
              </div>
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">Appreciation</label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={form.appreciationRate}
                  onChange={f('appreciationRate')}
                  className="w-full bg-card border border-border rounded-lg px-3 pr-6 py-1.5 text-sm text-white focus:outline-none focus:border-accent"
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-muted text-xs">%</span>
              </div>
            </div>
          </div>

          {/* Preview + Add */}
          <div className="flex items-center justify-between pt-1">
            {previewPayment > 0 ? (
              <span className="text-xs text-muted">
                Est. monthly payment:{' '}
                <span className="text-white font-semibold">{formatCurrency(previewPayment)}/mo</span>
              </span>
            ) : (
              <span />
            )}
            <button
              onClick={addProperty}
              disabled={!form.name.trim() || price <= 0}
              className="bg-accent hover:bg-accent-hover text-white text-xs font-medium px-4 py-1.5 rounded-lg transition-colors disabled:opacity-40"
            >
              Add Property
            </button>
          </div>
        </div>
      )}

      {properties.length === 0 && !showForm ? (
        <p className="text-xs text-muted italic">
          No properties planned. Add one to model its impact on your FI timeline.
        </p>
      ) : (
        <div className="space-y-2">
          {properties.map((p) => {
            const monthly = calcMonthlyPayment(
              p.price,
              p.downPaymentType,
              p.downPaymentValue,
              p.mortgageRate,
              p.termYears
            )
            const downPmt =
              p.downPaymentType === 'percent'
                ? (p.price * p.downPaymentValue) / 100
                : p.downPaymentValue
            return (
              <div
                key={p.id}
                className="bg-white/5 border border-border/50 rounded-xl px-4 py-3"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-semibold text-white">{p.name}</span>
                  <button
                    onClick={() => removeProperty(p.id)}
                    className="text-muted hover:text-negative text-xs transition-colors"
                  >
                    Remove
                  </button>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                  <span>Year {p.purchaseYear}</span>
                  <span>{formatCurrency(p.price)}</span>
                  <span>{formatCurrency(downPmt)} down</span>
                  <span>
                    {p.mortgageRate}% · {p.termYears}yr
                  </span>
                  <span>{p.appreciationRate}%/yr appreciation</span>
                  {monthly > 0 && (
                    <span className="text-accent font-medium">
                      {formatCurrency(monthly)}/mo payment
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
