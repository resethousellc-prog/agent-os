const TIER_STYLES = {
  'T3-FULL': 'bg-amber-400/10 text-amber-400 border border-amber-400/30',
  'T2-HIGH': 'bg-blue-400/10  text-blue-400  border border-blue-400/30',
  'T1-EXEC': 'bg-green-400/10 text-green-400 border border-green-400/30',
}

export default function TierBadge({ tier, size = 'sm' }) {
  const style = TIER_STYLES[tier] || TIER_STYLES['T1-EXEC']
  const sizeClass = size === 'lg'
    ? 'text-base px-3 py-1.5 font-bold'
    : 'text-xs px-2 py-0.5 font-semibold'
  return (
    <span className={`rounded-full font-mono ${sizeClass} ${style}`}>{tier}</span>
  )
}
