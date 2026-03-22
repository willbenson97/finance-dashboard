import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function usePositions() {
  const [positions, setPositions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('positions')
      .select('*')
      .order('created_at', { ascending: true })
    if (error) setError(error.message)
    else setPositions(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])

  const addPosition = async (position) => {
    const { error } = await supabase.from('positions').insert([position])
    if (error) throw error
    await fetch()
  }

  const updatePosition = async (id, updates) => {
    const { error } = await supabase.from('positions').update(updates).eq('id', id)
    if (error) throw error
    await fetch()
  }

  const deletePosition = async (id) => {
    const { error } = await supabase.from('positions').delete().eq('id', id)
    if (error) throw error
    await fetch()
  }

  return { positions, loading, error, addPosition, updatePosition, deletePosition, refetch: fetch }
}
