export default function VersionDiff({ currentSteps = [], suggestedSteps = [] }) {
  const maxLen = Math.max(currentSteps.length, suggestedSteps.length)
  const rows = Array.from({ length: maxLen }, (_, i) => {
    const curr = currentSteps[i]
    const next = suggestedSteps[i]
    let status = 'unchanged'
    if (!curr && next) status = 'added'
    else if (curr && !next) status = 'removed'
    else if (JSON.stringify(curr) !== JSON.stringify(next)) status = 'changed'
    return { curr, next, status }
  })

  const STATUS_STYLES = {
    added:     'bg-green-400/5 border-l-2 border-green-400',
    removed:   'bg-red-400/5   border-l-2 border-red-400',
    changed:   'bg-amber-400/5 border-l-2 border-amber-400',
    unchanged: '',
  }

  const STATUS_LABELS = {
    added:     '+ Added',
    removed:   '− Removed',
    changed:   '~ Changed',
    unchanged: '',
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <div className="text-xs text-[#94A3B8] uppercase tracking-wider mb-2">Current</div>
        {rows.map((row, i) => (
          <div key={i} className={`p-3 rounded mb-2 text-xs font-mono ${STATUS_STYLES[row.status]}`}>
            {row.curr ? (
              <pre className="text-[#F8FAFC] whitespace-pre-wrap overflow-auto">
                {JSON.stringify(row.curr, null, 2)}
              </pre>
            ) : (
              <span className="text-[#94A3B8] italic">— removed —</span>
            )}
          </div>
        ))}
      </div>
      <div>
        <div className="text-xs text-[#94A3B8] uppercase tracking-wider mb-2">Suggested</div>
        {rows.map((row, i) => (
          <div key={i} className={`p-3 rounded mb-2 text-xs font-mono ${STATUS_STYLES[row.status]}`}>
            <div className="flex justify-between items-start mb-1">
              {row.status !== 'unchanged' && (
                <span className={`text-xs font-sans ${
                  row.status === 'added' ? 'text-green-400' :
                  row.status === 'removed' ? 'text-red-400' : 'text-amber-400'
                }`}>{STATUS_LABELS[row.status]}</span>
              )}
            </div>
            {row.next ? (
              <pre className="text-[#F8FAFC] whitespace-pre-wrap overflow-auto">
                {JSON.stringify(row.next, null, 2)}
              </pre>
            ) : (
              <span className="text-[#94A3B8] italic">— removed —</span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
