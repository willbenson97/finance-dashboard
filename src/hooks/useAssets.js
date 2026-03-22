import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useAssets() {
  const [assets, setAssets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('assets')
      .select('*')
      .order('created_at', { ascending: true })
    if (error) setError(error.message)
    else setAssets(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])

  const addAsset = async (asset) => {
    const { error } = await supabase.from('assets').insert([asset])
    if (error) throw error
    await fetch()
  }

  const updateAsset = async (id, updates) => {
    const { error } = await supabase.from('assets').update(updates).eq('id', id)
    if (error) throw error
    await fetch()
  }

  const deleteAsset = async (id) => {
    const { error } = await supabase.from('assets').delete().eq('id', id)
    if (error) throw error
    await fetch()
  }

  return { assets, loading, error, addAsset, updateAsset, deleteAsset, refetch: fetch }
}
