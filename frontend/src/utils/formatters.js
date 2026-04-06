const currency = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
})

const shortDate = new Intl.DateTimeFormat('en-IN', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
})

export function currencyFormatter(value) {
  return currency.format(Number(value || 0))
}

export function dateFormatter(value) {
  if (!value) {
    return '-'
  }
  return shortDate.format(new Date(value))
}

export function titleize(value) {
  if (!value) {
    return '-'
  }
  return value
    .split(/[_\s-]+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}
