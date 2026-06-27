const STATUS_STYLES = {
  active:           'bg-green-400/10 text-green-400 border border-green-400/30',
  in_training:      'bg-amber-400/10 text-amber-400 border border-amber-400/30',
  production_ready: 'bg-cyan-400/10  text-cyan-400  border border-cyan-400/30',
  suspended:        'bg-red-400/10   text-red-400   border border-red-400/30',
  retired:          'bg-[#94A3B8]/10 text-[#94A3B8] border border-[#94A3B8]/30',
}

const STATUS_DOTS = {
  active:           'bg-green-400',
  in_training:      'bg-amber-400 animate-pulse',
  production_ready: 'bg-cyan-400',
  suspended:        'bg-red-400',
  retired:          'bg-[#94A3B8]',
}

export default function StatusBadge({ status }) {
  const style = STATUS_STYLES[status] || STATUS_STYLES['retired']
  const dot = STATUS_DOTS[status] || STATUS_DOTS['retired']
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full text-xs px-2 py-0.5 font-medium ${style}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`}></span>
      {status.replace(/_/g, ' ')}
    </span>
  )
}
