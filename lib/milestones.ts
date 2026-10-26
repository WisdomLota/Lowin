// Price milestones that trigger an alert, highest first
const MILESTONES = [
  { value: 1, label: '$1.00' },
  { value: 0.1, label: '$0.10' },
]

// Only the highest milestone reached counts
export function highestMilestone(price: number) {
  return MILESTONES.find((m) => price >= m.value) ?? null
}

export function milestoneTitle(symbol: string, label: string) {
  return `${symbol} hit ${label}`
}

export function formatMilestonePrice(price: number) {
  return `$${price < 0.01 ? price.toFixed(8) : price.toFixed(4)}`
}
