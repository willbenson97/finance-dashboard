import { useFISettings } from '../../hooks/useFISettings'
import PageHeader from '../Layout/PageHeader'
import PropertyPurchasesPanel from '../FIPlanner/PropertyPurchasesPanel'

export default function PropertyPurchasesPage() {
  const { settings, loading, saveSettings } = useFISettings()

  const handleChange = async (fn) => {
    const current = settings.property_purchases ?? []
    const newValue = typeof fn === 'function' ? fn(current) : fn
    await saveSettings({ property_purchases: newValue })
  }

  if (loading) return <div className="text-muted animate-pulse">Loading…</div>

  return (
    <div className="space-y-6">
      <PageHeader
        title="Property Purchases"
        subtitle="Plan future property buys — down payments and mortgages flow into your FI projection"
      />
      <PropertyPurchasesPanel
        properties={settings.property_purchases ?? []}
        onChange={handleChange}
      />
    </div>
  )
}
