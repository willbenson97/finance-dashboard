import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useDebts() {
  const [debts, setDebts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('debts')
      .select('*')
      .order('created_at', { ascending: true })
    if (error) setError(error.message)
    else setDebts(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])

  const addDebt = async (debt) => {
    const { error } = await supabase.from('debts').insert([debt])
    if (error) throw error
    await fetch()
  }

  const updateDebt = async (id, updates) => {
    const { error } = await supabase.from('debts').update(updates).eq('id', id)
    if (error) throw error
    await fetch()
  }

  const deleteDebt = async (id) => {
    const { error } = await supabase.from('debts').delete().eq('id', id)
    if (error) throw error
    await fetch()
  }

  return { debts, loading, error, addDebt, updateDebt, deleteDebt, refetch: fetch }
}
