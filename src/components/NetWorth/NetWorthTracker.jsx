import { useState } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { useAssets } from '../../hooks/useAssets'
import { useCategories } from '../../hooks/useCategories'
import { formatCurrency } from '../../lib/format'
import PageHeader from '../Layout/PageHeader'
import AssetForm from './AssetForm'
import CategoryManager from './CategoryManager'

export default function NetWorthTracker() {
  const { assets, loading: assetsLoading, addAsset, updateAsset, deleteAsset } = useAssets()
  const { categories, loading: catsLoading, addCategory, updateCategory, deleteCategory } = useCategories()
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)

  const catMap = Object.fromEntries(categories.map((c) => [c.id, c]))
  const totalNetWorth = assets.reduce((s, a) => s + (a.value ?? 0), 0)

  // Pie data grouped by category
  const pieData = Object.values(
    assets.reduce((acc, a) => {
      const cat = catMap[a.category_id]
      if (!cat) return acc
      if (!acc[cat.id]) acc[cat.id] = { name: cat.name, value: 0, color: cat.color }
      acc[cat.id].value += a.value
      return acc
    }, {})
  )

  // Assets grouped by category for the list
  const grouped = assets.reduce((acc, a) => {
    const key = a.category_id ?? 'uncategorized'
    ;(acc[key] = acc[key] ?? []).push(a)
    return acc
  }, {})

  const handleAdd = async (asset) => {
    await addAsset(asset)
    setShowForm(false)
  }

  const handleUpdate = async (asset) => {
    await updateAsset(editing.id, asset)
    setEditing(null)
  }

  if (assetsLoading || catsLoading) return <div className="text-muted animate-pulse">Loading…</div>

  return (
    <div className="space-y-6">
      <PageHeader title="Net Worth" subtitle="All assets combined into one total" />

      {/* Total card */}
      <div className="bg-card border border-border rounded-2xl p-6 flex items-center justify-between">
        <div>
          <p className="text-muted text-sm">Total Net Worth</p>
          <p className="text-4xl font-bold text-white mt-1">{formatCurrency(totalNetWorth)}</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-accent hover:bg-accent-hover text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          + Add Asset
        </button>
      </div>

      {/* Add asset form */}
      {showForm && (
        <div className="bg-card border border-border rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4">New Asset</h3>
          <AssetForm
            categories={categories}
            onSubmit={handleAdd}
            onCancel={() => setShowForm(false)}
          />
        </div>
      )}

      {assets.length === 0 && categories.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-8 text-center space-y-2">
          <p className="text-white text-sm font-medium">Get started by creating your first category below</p>
          <p className="text-muted text-xs">Categories define how your assets are grouped and their expected returns.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Breakdown chart */}
          <div className="bg-card border border-border rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Asset Breakdown</h3>
            {pieData.length === 0 ? (
              <p className="text-muted text-sm">No assets yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%" cy="50%"
                    innerRadius={70} outerRadius={110}
                    paddingAngle={3} dataKey="value"
                  >
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v) => formatCurrency(v)}
                    contentStyle={{ background: '#222640', border: '1px solid #2e3254', borderRadius: 8 }}
                    labelStyle={{ color: '#e2e4f0' }}
                    itemStyle={{ color: '#e2e4f0' }}
                  />
                  <Legend
                    iconType="circle" iconSize={8}
                    formatter={(v) => <span style={{ color: '#8b8fa8', fontSize: 12 }}>{v}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Asset list grouped by category */}
          <div className="bg-card border border-border rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Assets</h3>
            {assets.length === 0 ? (
              <p className="text-muted text-sm">Add your first asset above.</p>
            ) : (
              <div className="space-y-4">
                {Object.entries(grouped).map(([catId, rows]) => {
                  const cat = catMap[catId]
                  return (
                    <div key={catId}>
                      <div className="flex items-center gap-2 mb-2">
                        {cat && <span className="w-2 h-2 rounded-full" style={{ background: cat.color }} />}
                        <span className="text-xs font-semibold text-muted uppercase tracking-wider">
                          {cat?.name ?? 'Uncategorized'}
                        </span>
                      </div>
                      <div className="space-y-1.5">
                        {rows.map((asset) =>
                          editing?.id === asset.id ? (
                            <div key={asset.id} className="bg-surface rounded-xl p-3">
                              <AssetForm
                                categories={categories}
                                initial={{ name: asset.name, category_id: asset.category_id, value: asset.value }}
                                onSubmit={handleUpdate}
                                onCancel={() => setEditing(null)}
                              />
                            </div>
                          ) : (
                            <div key={asset.id} className="flex items-center justify-between px-3 py-2.5 bg-surface rounded-xl group">
                              <p className="text-sm text-white">{asset.name}</p>
                              <div className="flex items-center gap-3">
                                <span className="text-sm font-semibold text-white">{formatCurrency(asset.value)}</span>
                                <div className="hidden group-hover:flex gap-1">
                                  <button onClick={() => setEditing(asset)} className="text-xs text-muted hover:text-accent px-1">Edit</button>
                                  <button onClick={() => deleteAsset(asset.id)} className="text-xs text-muted hover:text-negative px-1">Delete</button>
                                </div>
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Category manager */}
      <CategoryManager
        categories={categories}
        onAdd={addCategory}
        onUpdate={updateCategory}
        onDelete={deleteCategory}
      />
    </div>
  )
}
