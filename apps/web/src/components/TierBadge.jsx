const TIER_STYLES = {
  'T3-FULL': {
    base:  'bg-amber-400/10 text-amber-400 border border-amber-400/30',
    glow:  'shadow-[0_0_20px_rgba(251,191,36,0.4)] border-amber-400',
    dot:   'bg-amber-400',
    color: 'text-amber-400',
  },
  'T2-HIGH': {
    base:  'bg-blue-400/10 text-blue-400 border border-blue-400/30',
    glow:  'shadow-[0_0_20px_rgba(96,165,250,0.4)] border-blue-400',
    dot:   'bg-blue-400',
    color: 'text-blue-400',
  },
  'T1-EXEC': {
    base:  'bg-green-400/10 text-green-400 border border-green-400/30',
    glow:  'shadow-[0_0_20px_rgba(74,222,128,0.4)] border-green-400',
    dot:   'bg-green-400',
    color: 'text-green-400',
  },
}

export default function TierBadge({ tier, size = 'sm', active = false }) {
  const style = TIER_STYLES[tier] || TIER_STYLES['T1-EXEC']
  if (size === 'lg') {
    return (
      <div className={`
        rounded-2xl px-6 py-4 border-2 transition-all duration-300 cursor-pointer
        ${active ? style.glow + ' animate-tier-glow' : style.base}
      `}>
        <div className={`text-2xl font-black font-mono ${style.color}`}>{tier}</div>
        <div className="text-xs text-[#94A3B8] mt-1">
          {tier === 'T3-FULL' ? 'Franchise Player' : tier === 'T2-HIGH' ? 'Veteran' : 'Rookie'}
        </div>
      </div>
    )
  }
  return (
    <span className={`rounded-full font-mono font-semibold text-xs px-2 py-0.5 ${style.base}`}>
      {tier}
    </span>
  )
}
