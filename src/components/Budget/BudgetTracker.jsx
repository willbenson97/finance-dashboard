import { useState } from 'react'
import { useBudget, calcNetSavings } from '../../hooks/useBudget'
import { useFISettings } from '../../hooks/useFISettings'
import { useDebts } from '../../hooks/useDebts'
import { formatCurrency } from '../../lib/format'
import PageHeader from '../Layout/PageHeader'
import { INCOME_PRESETS, EXPENSE_PRESETS } from '../../lib/presets'

const SECTION_CONFIG = {
  income:  { label: 'Income',   color: 'text-positive', presets: INCOME_PRESETS },
  expense: { label: 'Expenses', color: 'text-negative', presets: EXPENSE_PRESETS },
}

const isAnnual = (type) => type === 'income'

function AddItemForm({ type, onSubmit, onCancel }) {
  const { presets } = SECTION_CONFIG[type]
  const [preset, setPreset] = useState('')
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [inflationRate, setInflationRate] = useState('3')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const resolvedName = preset === '__custom__' ? name : preset

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!resolvedName.trim()) return setErr('Name is required.')
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) return setErr('Enter a valid amount.')
    setSaving(true)
    try {
      const item = { type, name: resolvedName.trim(), amount: Number(amount) }
      if (type === 'expense') item.inflation_rate = Number(inflationRate)
      await onSubmit(item)
      onCancel()
    } catch (e) {
      setErr(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-surface rounded-xl p-4 space-y-3 mt-2">
      {err && <p className="text-negative text-xs">{err}</p>}
      <div>
        <label className="block text-xs text-muted mb-1">Select or name</label>
        <select
          className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent"
          value={preset}
          onChange={(e) => { setPreset(e.target.value); if (e.target.value !== '__custom__') setName('') }}
        >
          <option value="">— Choose preset —</option>
          {presets.map((p) => <option key={p} value={p}>{p}</option>)}
          <option value="__custom__">Custom…</option>
        </select>
      </div>
      {preset === '__custom__' && (
        <div>
          <label className="block text-xs text-muted mb-1">Custom name</label>
          <input
            className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent"
            placeholder="e.g. Consulting income"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
      )}
      <div className={`grid gap-3 ${type === 'expense' ? 'grid-cols-2' : 'grid-cols-1'}`}>
        <div>
          <label className="block text-xs text-muted mb-1">
            {isAnnual(type) ? 'Annual amount ($)' : 'Monthly amount ($)'}
          </label>
          <input
            type="number" min="0" step="0.01"
            className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent"
            placeholder="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          {isAnnual(type) && amount && !isNaN(Number(amount)) && (
            <p className="text-xs text-muted mt-1">= {formatCurrency(Number(amount) / 12)}/mo</p>
          )}
        </div>
        {type === 'expense' && (
          <div>
            <label className="block text-xs text-muted mb-1">Inflation rate</label>
            <div className="relative">
              <input
                type="number" min="0" step="0.5"
                className="w-full bg-card border border-border rounded-lg px-3 pr-7 py-2 text-sm text-white focus:outline-none focus:border-accent"
                value={inflationRate}
                onChange={(e) => setInflationRate(e.target.value)}
              />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted text-xs">%</span>
            </div>
            <p className="text-xs text-muted mt-1">used in FI projection</p>
          </div>
        )}
      </div>
      <div className="flex gap-2">
        <button type="submit" disabled={saving}
          className="flex-1 bg-accent hover:bg-accent-hover text-white text-xs font-medium py-2 rounded-lg disabled:opacity-50">
          {saving ? 'Saving…' : 'Add'}
        </button>
        <button type="button" onClick={onCancel}
          className="flex-1 bg-white/5 text-muted text-xs py-2 rounded-lg">
          Cancel
        </button>
      </div>
    </form>
  )
}

function BudgetSection({ type, items, onAdd, onUpdate, onDelete }) {
  const { label, color } = SECTION_CONFIG[type]
  const [showAdd, setShowAdd] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editAmount, setEditAmount] = useState('')
  const [editInflation, setEditInflation] = useState('3')

  const rawTotal = items.reduce((s, i) => s + i.amount, 0)
  const displayTotal = isAnnual(type) ? rawTotal / 12 : rawTotal

  const startEdit = (item) => {
    setEditingId(item.id)
    setEditAmount(String(item.amount))
    setEditInflation(String(item.inflation_rate ?? 3))
  }

  const saveEdit = async (item) => {
    const updates = { amount: Number(editAmount) }
    if (type === 'expense') updates.inflation_rate = Number(editInflation)
    await onUpdate(item.id, updates)
    setEditingId(null)
  }

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div>
          <span className="text-sm font-semibold text-white">{label}</span>
          <span className={`ml-3 text-sm font-bold ${color}`}>{formatCurrency(displayTotal)}/mo</span>
          {isAnnual(type) && rawTotal > 0 && (
            <span className="ml-2 text-xs text-muted">({formatCurrency(rawTotal)}/yr)</span>
          )}
        </div>
        <button onClick={() => setShowAdd((v) => !v)} className="text-xs text-accent hover:text-white transition-colors">
          {showAdd ? 'Cancel' : '+ Add'}
        </button>
      </div>

      <div className="divide-y divide-border/50">
        {items.length === 0 && !showAdd && (
          <p className="px-5 py-3 text-xs text-muted">No {label.toLowerCase()} added yet.</p>
        )}
        {items.map((item) => (
          <div key={item.id} className="flex items-center gap-3 px-5 py-3 group hover:bg-white/[0.02]">
            <span className="flex-1 text-sm text-white">{item.name}</span>
            {editingId === item.id ? (
              <div className="flex items-center gap-2">
                <div className="flex flex-col items-end gap-1">
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted text-xs">$</span>
                    <input
                      type="number" step="0.01" autoFocus
                      value={editAmount}
                      onChange={(e) => setEditAmount(e.target.value)}
                      className="w-32 bg-surface border border-accent rounded-lg pl-6 pr-3 py-1 text-sm text-white focus:outline-none"
                    />
                  </div>
                  {isAnnual(type) && editAmount && !isNaN(Number(editAmount)) && (
                    <span className="text-xs text-muted">{formatCurrency(Number(editAmount) / 12)}/mo</span>
                  )}
                  {type === 'expense' && (
                    <div className="relative">
                      <input
                        type="number" step="0.5" min="0"
                        value={editInflation}
                        onChange={(e) => setEditInflation(e.target.value)}
                        className="w-24 bg-surface border border-border rounded-lg pl-3 pr-7 py-1 text-xs text-white focus:outline-none focus:border-accent"
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-muted text-xs">%/yr</span>
                    </div>
                  )}
                </div>
                <button onClick={() => saveEdit(item)} className="text-xs text-accent hover:text-white">Save</button>
                <button onClick={() => setEditingId(null)} className="text-xs text-muted hover:text-white">✕</button>
              </div>
            ) : (
              <>
                <div className="text-right">
                  <span className="text-sm font-medium text-white">
                    {formatCurrency(item.amount)}
                    <span className="text-muted font-normal">{isAnnual(type) ? '/yr' : '/mo'}</span>
                  </span>
                  {isAnnual(type) && <p className="text-xs text-muted">{formatCurrency(item.amount / 12)}/mo</p>}
                  {type === 'expense' && (
                    <p className="text-xs text-muted">{item.inflation_rate ?? 3}% inflation</p>
                  )}
                </div>
                <div className="hidden group-hover:flex gap-2">
                  <button onClick={() => startEdit(item)} className="text-xs text-muted hover:text-accent">Edit</button>
                  <button onClick={() => onDelete(item.id)} className="text-xs text-muted hover:text-negative">Delete</button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {showAdd && (
        <div className="px-5 pb-4">
          <AddItemForm type={type} onSubmit={onAdd} onCancel={() => setShowAdd(false)} />
        </div>
      )}
    </div>
  )
}

export default function BudgetTracker() {
  const { items, loading: budgetLoading, addItem, updateItem, deleteItem, totals } = useBudget()
  const { settings, loading: settingsLoading, saveSettings } = useFISettings()
  const { debts, loading: debtsLoading } = useDebts()
  const [taxRate, setTaxRate] = useState(null)
  const [savingTax, setSavingTax] = useState(false)

  const effectiveTaxRate = taxRate ?? settings.effective_tax_rate ?? 25
  const monthlyTax = (totals.annualIncome * (effectiveTaxRate / 100)) / 12
  const totalDebtPayments = debts.reduce((s, d) => s + (d.monthly_payment ?? 0), 0)
  const netSavings = calcNetSavings(totals, effectiveTaxRate) - totalDebtPayments

  const byType = {
    income:  items.filter((i) => i.type === 'income'),
    expense: items.filter((i) => i.type === 'expense'),
  }

  const handleSaveTaxRate = async () => {
    if (taxRate === null) return
    setSavingTax(true)
    await saveSettings({ effective_tax_rate: taxRate })
    setTaxRate(null)
    setSavingTax(false)
  }

  if (budgetLoading || settingsLoading || debtsLoading)
    return <div className="text-muted animate-pulse">Loading…</div>

  return (
    <div>
      <PageHeader title="Budget" subtitle="Annual income, taxes, expenses, and debt payments — drives your savings rate" />

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-6">
        {[
          { label: 'Gross Income',    value: totals.monthlyIncome,  sub: `${formatCurrency(totals.annualIncome)}/yr`, color: 'text-white' },
          { label: `Taxes (${effectiveTaxRate}%)`, value: monthlyTax, color: 'text-negative' },
          { label: 'Expenses',        value: totals.expenses,       color: 'text-negative' },
          { label: 'Debt Payments',   value: totalDebtPayments,     color: totalDebtPayments > 0 ? 'text-negative' : 'text-muted' },
          { label: 'Net Savings',     value: netSavings,            color: netSavings >= 0 ? 'text-positive' : 'text-negative' },
        ].map(({ label, value, sub, color }) => (
          <div key={label} className="bg-card border border-border rounded-2xl p-5">
            <p className="text-xs text-muted">{label}</p>
            <p className={`text-xl font-bold mt-1 ${color}`}>
              {formatCurrency(value)}<span className="text-muted text-xs font-normal">/mo</span>
            </p>
            {sub && <p className="text-xs text-muted mt-0.5">{sub}</p>}
          </div>
        ))}
      </div>

      <div className="bg-card border border-border rounded-2xl px-5 py-4 mb-6 flex flex-wrap items-center gap-6">
        <div>
          {totals.monthlyIncome > 0 ? (
            <>
              <span className="text-sm text-white">
                Savings rate: <span className="font-bold text-accent">
                  {((netSavings / totals.monthlyIncome) * 100).toFixed(1)}%
                </span>
              </span>
              <span className="text-xs text-muted ml-3">auto-syncs to Retirement Planning</span>
            </>
          ) : (
            <span className="text-sm text-muted">Add income to see your savings rate</span>
          )}
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <label className="text-xs text-muted whitespace-nowrap">Effective tax rate</label>
          <div className="relative">
            <input
              type="number" min="0" max="100" step="0.1"
              value={effectiveTaxRate}
              onChange={(e) => setTaxRate(Number(e.target.value))}
              className="w-20 bg-surface border border-border rounded-lg px-3 pr-6 py-1.5 text-sm text-white focus:outline-none focus:border-accent"
            />
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted text-xs">%</span>
          </div>
          <button
            onClick={handleSaveTaxRate}
            disabled={taxRate === null || savingTax}
            className="bg-accent hover:bg-accent-hover text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors disabled:opacity-40"
          >
            {savingTax ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <BudgetSection type="income"  items={byType.income}  onAdd={addItem} onUpdate={updateItem} onDelete={deleteItem} />
        <BudgetSection type="expense" items={byType.expense} onAdd={addItem} onUpdate={updateItem} onDelete={deleteItem} />

        {/* Debt payments — read-only, managed on Net Worth page */}
        {debts.length > 0 && (
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div>
                <span className="text-sm font-semibold text-white">Debt Payments</span>
                <span className="ml-3 text-sm font-bold text-negative">{formatCurrency(totalDebtPayments)}/mo</span>
              </div>
              <span className="text-xs text-muted">Manage debts on the Net Worth page</span>
            </div>
            <div className="divide-y divide-border/50">
              {debts.map((d) => (
                <div key={d.id} className="flex items-center gap-3 px-5 py-3">
                  <span className="flex-1 text-sm text-white">{d.name}</span>
                  <div className="text-right">
                    <span className="text-sm font-medium text-white">
                      {formatCurrency(d.monthly_payment)}<span className="text-muted font-normal">/mo</span>
                    </span>
                    <p className="text-xs text-muted">
                      {formatCurrency(d.current_balance)} balance · {d.interest_rate}% APR
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
