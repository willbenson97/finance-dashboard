export const formatCurrency = (value) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value ?? 0)

export const formatPercent = (value) =>
  `${value >= 0 ? '+' : ''}${value?.toFixed(2) ?? '0.00'}%`

export const formatMultiple = (value) =>
  `${value >= 0 ? '+' : ''}${value?.toFixed(2) ?? '0.00'}x`
