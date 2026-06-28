import TierBadge from './TierBadge'
import { Lock, Check } from 'lucide-react'

const PLATFORM_COLORS = {
  geelark:  'text-purple-400 bg-purple-400/10',
  ghl:      'text-blue-400  bg-blue-400/10',
  bullmq:   'text-orange-400 bg-orange-400/10',
  s3:       'text-yellow-400 bg-yellow-400/10',
  supabase: 'text-green-400 bg-green-400/10',
  wis:      'text-cyan-400  bg-cyan-400/10',
  comms:    'text-pink-400  bg-pink-400/10',
}

export default function AgentToolCard({ tool, assigned, agentTier, onToggle }) {
  const TIER_ORDER = { 'T1-EXEC': 1, 'T2-HIGH': 2, 'T3-FULL': 3 }
  const locked = TIER_ORDER[agentTier] < TIER_ORDER[tool.tier_minimum]
  const platformStyle = PLATFORM_COLORS[tool.platform] || 'text-[#94A3B8] bg-white/5'

  return (
    <div
      onClick={() => !locked && onToggle(tool.name)}
      className={`
        relative p-4 rounded-xl border transition-all
        ${locked ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:border-white/20'}
        ${assigned ? 'border-amber-400/40 bg-amber-400/5' : 'border-[#1E1E2E] bg-[#12121A]'}
      `}
    >
      {locked && (
        <Lock size={12} className="absolute top-2 right-2 text-[#94A3B8]" />
      )}
      {assigned && !locked && (
        <Check size={12} className="absolute top-2 right-2 text-amber-400" />
      )}
      <div className={`inline-flex px-2 py-0.5 rounded text-xs font-medium mb-2 ${platformStyle}`}>
        {tool.platform}
      </div>
      <div className="text-sm font-medium text-[#F8FAFC] mb-1">
        {tool.display_name || tool.name}
      </div>
      <div className="text-xs text-[#94A3B8] line-clamp-2">{tool.description}</div>
      {tool.requires_approval && (
        <div className="mt-2 text-xs text-amber-400/70">⚠ Requires approval</div>
      )}
    </div>
  )
}
