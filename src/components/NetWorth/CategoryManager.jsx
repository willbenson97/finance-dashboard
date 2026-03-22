import { useState } from 'react'
import { CATEGORY_PRESETS, COLOR_PALETTE } from '../../lib/presets'

function nextColor(existing) {
  const used = new Set(existing.map((c) => c.color))
  return COLOR_PALETTE.find((c) => !used.has(c)) ?? COLOR_PALETTE[existing.length % COLOR_PALETTE.length]
}

export default function CategoryManager({ categories, onAdd, onUpdate, onDelete }) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(null) // null = hidden, {} = new, {id,...} = editing
  const [presetKey, setPresetKey] = useState('')
  const [err, setErr] = useState('')
  const [saving, setSaving] = useState(false)

  const alreadyAdded = new Set(categories.map((c) => c.name))
  const availablePresets = CATEGORY_PRESETS.filter((p) => !alreadyAdded.has(p.name))

  const startNew = () => {
    setPresetKey('')
    setForm({ name: '', return_rate: 7, color: nextColor(categories) })
    setErr('')
  }

  const selectPreset = (name) => {
    setPresetKey(name)
    const preset = CATEGORY_PRESETS.find((p) => p.name === name)
    if (preset) setForm({ name: preset.name, return_rate: preset.return_rate, color: preset.color })
  }

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) return setErr('Name is required.')
    setSaving(true)
    try {
      if (form.id) {
        await onUpdate(form.id, { name: form.name, return_rate: Number(form.return_rate), color: form.color })
      } else {
        await onAdd({ name: form.name, return_rate: Number(form.return_rate), color: form.color })
      }
      setForm(null)
      setPresetKey('')
    } catch (e) {
      setErr(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-4 text-sm font-semibold text-white hover:bg-white/[0.02] transition-colors"
      >
        <span>Manage Asset Categories</span>
        <span className="text-muted text-xs">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="border-t border-border px-5 py-4 space-y-4">
          {/* Existing categories */}
          {categories.length > 0 && (
            <div className="space-y-2">
              {categories.map((cat) =>
                form?.id === cat.id ? (
                  <form key={cat.id} onSubmit={handleSubmit} className="bg-surface rounded-xl p-3 space-y-3">
                    <CategoryFormFields
                      form={form} set={set}
                      presetKey={presetKey} setPresetKey={selectPreset}
                      availablePresets={availablePresets}
                      err={err}
                    />
                    <div className="flex gap-2">
                      <button type="submit" disabled={saving} className="flex-1 bg-accent hover:bg-accent-hover text-white text-xs font-medium py-1.5 rounded-lg disabled:opacity-50">
                        {saving ? 'Saving…' : 'Update'}
                      </button>
                      <button type="button" onClick={() => setForm(null)} className="flex-1 bg-white/5 text-muted text-xs py-1.5 rounded-lg">
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <div key={cat.id} className="flex items-center gap-3 px-3 py-2.5 bg-surface rounded-xl group">
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ background: cat.color }} />
                    <span className="text-sm text-white flex-1">{cat.name}</span>
                    <span className="text-xs text-muted">{cat.return_rate}% return</span>
                    <div className="hidden group-hover:flex gap-2 ml-2">
                      <button
                        onClick={() => { setForm({ ...cat }); setPresetKey(''); setErr('') }}
                        className="text-xs text-muted hover:text-accent"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => onDelete(cat.id)}
                        className="text-xs text-muted hover:text-negative"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )
              )}
            </div>
          )}

          {/* Add new form */}
          {form && !form.id ? (
            <form onSubmit={handleSubmit} className="bg-surface rounded-xl p-4 space-y-3">
              <p className="text-xs font-semibold text-white">New Category</p>
              <CategoryFormFields
                form={form} set={set}
                presetKey={presetKey} setPresetKey={selectPreset}
                availablePresets={availablePresets}
                err={err}
              />
              <div className="flex gap-2">
                <button type="submit" disabled={saving} className="flex-1 bg-accent hover:bg-accent-hover text-white text-xs font-medium py-1.5 rounded-lg disabled:opacity-50">
                  {saving ? 'Saving…' : 'Add Category'}
                </button>
                <button type="button" onClick={() => setForm(null)} className="flex-1 bg-white/5 text-muted text-xs py-1.5 rounded-lg">
                  Cancel
                </button>
              </div>
            </form>
          ) : !form && (
            <button
              onClick={startNew}
              className="w-full border border-dashed border-border rounded-xl py-2.5 text-xs text-muted hover:text-white hover:border-accent transition-colors"
            >
              + Add Category
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function CategoryFormFields({ form, set, presetKey, setPresetKey, availablePresets, err }) {
  return (
    <>
      {err && <p className="text-negative text-xs">{err}</p>}
      {availablePresets.length > 0 && (
        <div>
          <label className="block text-xs text-muted mb-1">Quick-fill from preset</label>
          <select
            className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent"
            value={presetKey}
            onChange={(e) => setPresetKey(e.target.value)}
          >
            <option value="">— Select a preset —</option>
            {availablePresets.map((p) => (
              <option key={p.name} value={p.name}>{p.name} ({p.return_rate}%)</option>
            ))}
          </select>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-muted mb-1">Name</label>
          <input
            className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent"
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder="e.g. My 401(k)"
          />
        </div>
        <div>
          <label className="block text-xs text-muted mb-1">Expected Return (%)</label>
          <input
            type="number" step="0.1"
            className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent"
            value={form.return_rate}
            onChange={(e) => set('return_rate', e.target.value)}
          />
        </div>
      </div>
      <div>
        <label className="block text-xs text-muted mb-2">Color</label>
        <div className="flex gap-2 flex-wrap">
          {COLOR_PALETTE.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => set('color', c)}
              className="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110"
              style={{
                background: c,
                borderColor: form.color === c ? 'white' : 'transparent',
              }}
            />
          ))}
        </div>
      </div>
    </>
  )
}
