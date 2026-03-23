import { useFISettings } from '../../hooks/useFISettings'
import PageHeader from '../Layout/PageHeader'
import CoinvestPanel from '../FIPlanner/CoinvestPanel'

export default function CoinvestPage() {
  const { settings, loading, saveSettings } = useFISettings()

  const handleChange = async (fn) => {
    const current = settings.coinvests ?? []
    const newValue = typeof fn === 'function' ? fn(current) : fn
    await saveSettings({ coinvests: newValue })
  }

  if (loading) return <div className="text-muted animate-pulse">Loading…</div>

  return (
    <div className="space-y-6">
      <PageHeader
        title="Co-Investments"
        subtitle="Current fund distribution schedules and future co-invest vehicles — modeled as illiquid capital that unlocks over time"
      />
      <CoinvestPanel
        coinvests={settings.coinvests ?? []}
        onChange={handleChange}
      />
    </div>
  )
}
