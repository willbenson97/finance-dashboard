import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useCategories() {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('asset_categories')
      .select('*')
      .order('name', { ascending: true })
    if (error) setError(error.message)
    else setCategories(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])

  const addCategory = async (cat) => {
    const { error } = await supabase.from('asset_categories').insert([cat])
    if (error) throw error
    await fetch()
  }

  const updateCategory = async (id, updates) => {
    const { error } = await supabase.from('asset_categories').update(updates).eq('id', id)
    if (error) throw error
    await fetch()
  }

  const deleteCategory = async (id) => {
    const { error } = await supabase.from('asset_categories').delete().eq('id', id)
    if (error) throw error
    await fetch()
  }

  return { categories, loading, error, addCategory, updateCategory, deleteCategory, refetch: fetch }
}
