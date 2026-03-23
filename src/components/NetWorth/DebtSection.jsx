import { useState } from 'react'
import { formatCurrency } from '../../lib/format'

export const DEBT_TYPES = [
  { value: 'credit_card',   label: 'Credit Card',   color: '#ef4444' },
  { value: 'auto_loan',     label: 'Auto Loan',      color: '#f97316' },
  { value: 'student_loan',  label: 'Student Loan',   color: '#3b82f6' },
  { value: 'personal_loan', label: 'Personal Loan',  color: '#a855f7' },
  { value: 'medical',       label: 'Medical',        color: '#ec4899' },
  { value: 'mortgage',      label: 'Mortgage',       color: '#f59e0b' },
  { value: 'other',         label: 'Other',          color: '#6b7280' },
]
const TYPE_MAP = Object.fromEntries(DEBT_TYPES.map((t) => [t.value, t]))

function calcMortgagePayment(p) {
  const downPmt =
    p.downPaymentType === 'percent'
      ? (p.price * p.downPaymentValue) / 100
      : (p.downPaymentValue ?? 0)
  const loan = Math.max(0, p.price - downPmt)
  if (loan <= 0) return 0
  const r = (p.mortgageRate ?? 0) / 100 / 12
  const n = (p.termYears ?? 30) * 12
  if (r === 0) return loan / n
  return (loan * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)
}

function DebtForm({ initial, onSubmit, onCancel }) {
  const [name, setName] = useState(initial?.name ?? '')
  const [type, setType] = useState(initial?.type ?? 'other')
  const [balance, setBalance] = useState(initial?.current_balance?.toString() ?? '')
  const [rate, setRate] = useState(initial?.interest_rate?.toString() ?? '')
  const [payment, setPayment] = useState(initial?.monthly_payment?.toString() ?? '')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim()) return setErr('Name is required.')
    if (!balance || isNaN(Number(balance)) || Number(balance) < 0)
      return setErr('Enter a valid balance.')
    if (!payment || isNaN(Number(payment)) || Number(payment) < 0)
      return setErr('Enter a valid monthly payment.')
    setSaving(true)
    try {
      await onSubmit({
        name: name.trim(),
        type,
        current_balance: Number(balance),
        interest_rate: Number(rate) || 0,
        monthly_payment: Number(payment),
      })
      onCancel()
    } catch (e) {
      setErr(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-card border border-border rounded-2xl p-4 space-y-3">
      {err && <p className="text-negative text-xs">{err}</p>}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-muted mb-1">Name</label>
          <input
            autoFocus
            className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent"
            placeholder="e.g. Chase Sapphire"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs text-muted mb-1">Type</label>
          <select
            className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            {DEBT_TYPES.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-xs text-muted mb-1">Current Balance ($)</label>
          <input
            type="number" min="0" step="0.01"
            className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent"
            placeholder="0"
            value={balance}
            onChange={(e) => setBalance(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs text-muted mb-1">Interest Rate (%/yr)</label>
          <input
            type="number" min="0" step="0.01"
            className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent"
            placeholder="0"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs text-muted mb-1">Monthly Payment ($)</label>
          <input
            type="number" min="0" step="0.01"
            className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent"
            placeholder="0"
            value={payment}
            onChange={(e) => setPayment(e.target.value)}
          />
        </div>
      </div>
      <div className="flex gap-2">
        <button
          type="submit" disabled={saving}
          className="flex-1 bg-accent hover:bg-accent-hover text-white text-xs font-medium py-2 rounded-lg disabled:opacity-50"
        >
          {saving ? 'Saving…' : initial ? 'Update' : 'Add Debt'}
        </button>
        <button
          type="button" onClick={onCancel}
          className="flex-1 bg-white/5 text-muted text-xs py-2 rounded-lg"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

export default function DebtSection({ debts, onAdd, onUpdate, onDelete, propertyPurchases = [] }) {
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)

  const currentYear = new Date().getFullYear()

  const futureMortgages = propertyPurchases.map((p) => {
    const downPmt =
      p.downPaymentType === 'percent'
        ? (p.price * p.downPaymentValue) / 100
        : (p.downPaymentValue ?? 0)
    return {
      id: p.id,
      name: p.name ?? 'Property',
      purchaseYear: p.purchaseYear ?? 0,
      calendarYear: currentYear + (p.purchaseYear ?? 0),
      loan: Math.max(0, p.price - downPmt),
      monthlyPayment: calcMortgagePayment(p),
      mortgageRate: p.mortgageRate ?? 0,
      termYears: p.termYears ?? 30,
    }
  })

  const handleAdd = async (debt) => {
    await onAdd(debt)
    setShowForm(false)
  }

  const handleUpdate = async (debt) => {
    await onUpdate(editing.id, debt)
    setEditing(null)
  }

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <h3 className="text-sm font-semibold text-white">Liabilities</h3>
        {!showForm && !editing && (
          <button
            onClick={() => setShowForm(true)}
            className="bg-accent hover:bg-accent-hover text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
          >
            + Add Debt
          </button>
        )}
      </div>

      <div className="p-5 space-y-3">
        {showForm && (
          <DebtForm onSubmit={handleAdd} onCancel={() => setShowForm(false)} />
        )}

        {debts.length === 0 && futureMortgages.length === 0 && !showForm && (
          <p className="text-muted text-sm">No liabilities added yet.</p>
        )}

        {/* Current debts */}
        {debts.map((debt) => {
          const typeInfo = TYPE_MAP[debt.type] ?? TYPE_MAP.other
          return editing?.id === debt.id ? (
            <DebtForm
              key={debt.id}
              initial={debt}
              onSubmit={handleUpdate}
              onCancel={() => setEditing(null)}
            />
          ) : (
            <div
              key={debt.id}
              className="flex items-center gap-3 bg-surface rounded-xl px-4 py-3 group"
            >
              <span
                className="text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0"
                style={{ background: typeInfo.color + '22', color: typeInfo.color }}
              >
                {typeInfo.label}
              </span>
              <span className="flex-1 text-sm text-white truncate">{debt.name}</span>
              <div className="text-right mr-2">
                <p className="text-sm font-semibold text-white">{formatCurrency(debt.current_balance)}</p>
                <p className="text-xs text-muted">
                  {formatCurrency(debt.monthly_payment)}/mo · {debt.interest_rate}% APR
                </p>
              </div>
              <div className="hidden group-hover:flex gap-1 flex-shrink-0">
                <button
                  onClick={() => setEditing(debt)}
                  className="text-xs text-muted hover:text-accent px-1"
                >
                  Edit
                </button>
                <button
                  onClick={() => onDelete(debt.id)}
                  className="text-xs text-muted hover:text-negative px-1"
                >
                  Delete
                </button>
              </div>
            </div>
          )
        })}

        {/* Future mortgages from property purchases (read-only) */}
        {futureMortgages.length > 0 && (
          <>
            {debts.length > 0 && <div className="border-t border-border/50 pt-1" />}
            <p className="text-xs text-muted font-semibold uppercase tracking-wider">
              Future Mortgages — from Retirement Planning
            </p>
            {futureMortgages.map((m) => (
              <div
                key={m.id}
                className="flex items-center gap-3 bg-surface/50 border border-border/40 rounded-xl px-4 py-3 opacity-75"
              >
                <span
                  className="text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0"
                  style={{ background: '#f59e0b22', color: '#f59e0b' }}
                >
                  Mortgage
                </span>
                <span className="flex-1 text-sm text-white truncate">{m.name}</span>
                <div className="text-right mr-2">
                  <p className="text-sm font-semibold text-white">{formatCurrency(m.loan)}</p>
                  <p className="text-xs text-muted">
                    {formatCurrency(m.monthlyPayment)}/mo · {m.mortgageRate}% · {m.termYears}yr term
                  </p>
                </div>
                <span className="text-xs text-muted italic flex-shrink-0">~{m.calendarYear}</span>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  )
}
