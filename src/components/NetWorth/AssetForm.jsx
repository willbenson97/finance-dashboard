import { useState } from 'react'

export default function AssetForm({ onSubmit, onCancel, initial, categories }) {
  const [form, setForm] = useState(
    initial ?? { name: '', category_id: categories[0]?.id ?? '', value: '' }
  )
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) return setErr('Name is required.')
    if (!form.category_id) return setErr('Select a category.')
    if (!form.value || isNaN(Number(form.value))) return setErr('Enter a valid dollar value.')
    setSaving(true)
    try {
      await onSubmit({ ...form, value: Number(form.value) })
    } catch (e) {
      setErr(e.message)
    } finally {
      setSaving(false)
    }
  }

  if (categories.length === 0) {
    return (
      <p className="text-muted text-sm">
        Create at least one category before adding assets.
      </p>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {err && <p className="text-negative text-sm">{err}</p>}
      <div>
        <label className="block text-xs text-muted mb-1">Name</label>
        <input
          className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent"
          placeholder="e.g. Fidelity 401(k)"
          value={form.name}
          onChange={(e) => set('name', e.target.value)}
        />
      </div>
      <div>
        <label className="block text-xs text-muted mb-1">Category</label>
        <select
          className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent"
          value={form.category_id}
          onChange={(e) => set('category_id', e.target.value)}
        >
          <option value="">— Select —</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs text-muted mb-1">Current Value ($)</label>
        <input
          type="number" min="0" step="0.01"
          className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent"
          placeholder="0"
          value={form.value}
          onChange={(e) => set('value', e.target.value)}
        />
      </div>
      <div className="flex gap-2 pt-1">
        <button
          type="submit" disabled={saving}
          className="flex-1 bg-accent hover:bg-accent-hover text-white text-sm font-medium py-2 rounded-lg transition-colors disabled:opacity-50"
        >
          {saving ? 'Saving…' : initial ? 'Update' : 'Add Asset'}
        </button>
        {onCancel && (
          <button
            type="button" onClick={onCancel}
            className="flex-1 bg-white/5 hover:bg-white/10 text-muted text-sm font-medium py-2 rounded-lg transition-colors"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  )
}
