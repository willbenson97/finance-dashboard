import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '../lib/supabase'

export function useBudget() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('budget_items')
      .select('*')
      .in('type', ['income', 'expense'])   // tax items no longer used
      .order('type', { ascending: true })
    if (error) setError(error.message)
    else setItems(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])

  const addItem = async (item) => {
    const { error } = await supabase.from('budget_items').insert([item])
    if (error) throw error
    await fetch()
  }

  const updateItem = async (id, updates) => {
    const { error } = await supabase.from('budget_items').update(updates).eq('id', id)
    if (error) throw error
    await fetch()
  }

  const deleteItem = async (id) => {
    const { error } = await supabase.from('budget_items').delete().eq('id', id)
    if (error) throw error
    await fetch()
  }

  const totals = useMemo(() => {
    // Income stored as annual → divide by 12 for monthly
    const annualIncome  = items.filter((i) => i.type === 'income').reduce((s, i) => s + i.amount, 0)
    const monthlyIncome = annualIncome / 12
    const expenses      = items.filter((i) => i.type === 'expense').reduce((s, i) => s + i.amount, 0)
    return { annualIncome, monthlyIncome, expenses }
  }, [items])

  return { items, loading, error, addItem, updateItem, deleteItem, totals }
}

// Call this wherever net savings are needed given a tax rate
export function calcNetSavings(totals, effectiveTaxRate) {
  const monthlyTax = (totals.annualIncome * ((effectiveTaxRate ?? 0) / 100)) / 12
  return totals.monthlyIncome - monthlyTax - totals.expenses
}
