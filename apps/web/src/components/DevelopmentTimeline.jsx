const EVENT_ICONS = {
  tier_promotion:       '🏆',
  tier_demotion:        '⬇️',
  attribute_update:     '📊',
  training_completed:   '🎓',
  production_graduated: '⚡',
  flagged:              '🚩',
  reactivated:          '✅',
  retired:              '🌅',
  manual_override:      '🔧',
  skill_added:          '➕',
  skill_removed:        '➖',
  training_started:     '🏋️',
}

const EVENT_COLORS = {
  tier_promotion:       'border-amber-400 bg-amber-400/10',
  production_graduated: 'border-cyan-400  bg-cyan-400/10',
  flagged:              'border-red-400   bg-red-400/10',
  retired:              'border-[#94A3B8] bg-white/5',
}

export default function DevelopmentTimeline({ events = [] }) {
  if (events.length === 0) {
    return (
      <div className="text-[#94A3B8] text-sm text-center py-8">No development events yet</div>
    )
  }

  return (
    <div className="relative">
      <div className="absolute left-4 top-0 bottom-0 w-px bg-[#1E1E2E]" />
      <div className="space-y-4">
        {events.map(event => (
          <div key={event.id} className="flex gap-4 relative">
            <div className={`
              w-8 h-8 rounded-full border flex items-center justify-center flex-shrink-0 text-sm z-10
              ${EVENT_COLORS[event.event_type] || 'border-[#1E1E2E] bg-[#12121A]'}
            `}>
              {EVENT_ICONS[event.event_type] || '•'}
            </div>
            <div className="flex-1 pb-4">
              <div className="font-medium text-sm capitalize">
                {event.event_type.replace(/_/g, ' ')}
              </div>
              {event.event_detail?.notification === 'T2_UNLOCK_ELIGIBLE' && (
                <div className="mt-1 text-xs text-amber-400 bg-amber-400/10 border border-amber-400/20 rounded-lg px-3 py-2">
                  🏆 T2-HIGH promotion eligible — {event.event_detail.successful_runs} successful runs
                </div>
              )}
              <div className="text-xs text-[#94A3B8] mt-0.5">
                {event.triggered_by} · {new Date(event.created_at).toLocaleString()}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
