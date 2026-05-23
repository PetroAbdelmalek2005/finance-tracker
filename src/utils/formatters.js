export function formatCurrency(amount, currency = 'CAD') {
  return new Intl.NumberFormat('en-CA', {
    style:                 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function formatDate(date) {
  return new Intl.DateTimeFormat('en-CA', {
    year:  'numeric',
    month: 'long',
    day:   'numeric',
  }).format(new Date(date))
}

export function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

export function checkPasswordStrength(password) {
  const checks = {
    length:    password.length >= 12,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number:    /[0-9]/.test(password),
    special:   /[^A-Za-z0-9]/.test(password),
  }
  const score = Object.values(checks).filter(Boolean).length
  return { checks, score, strong: score === 5 }
}
