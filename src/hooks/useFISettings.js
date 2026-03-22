import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const DEFAULTS = {
  target_number: 0,
  safe_withdrawal_rate: 4,
  effective_tax_rate: 25,
}

export function useFISettings() {
  const [settings, setSettings] = useState(DEFAULTS)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('fi_settings')
      .select('*')
      .limit(1)
      .single()
    if (error && error.code !== 'PGRST116') setError(error.message)
    else if (data) setSettings(data)
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])

  const saveSettings = async (updates) => {
    const { data: existing } = await supabase.from('fi_settings').select('id').limit(1).single()
    if (existing) {
      const { error } = await supabase.from('fi_settings').update(updates).eq('id', existing.id)
      if (error) throw error
    } else {
      const { error } = await supabase.from('fi_settings').insert([updates])
      if (error) throw error
    }
    setSettings((s) => ({ ...s, ...updates }))
  }

  return { settings, loading, error, saveSettings }
}
