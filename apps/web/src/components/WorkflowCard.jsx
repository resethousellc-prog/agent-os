const PLATFORM_COLORS = {
  ghl:     'bg-blue-400/10 text-blue-400',
  geelark: 'bg-purple-400/10 text-purple-400',
  bullmq:  'bg-orange-400/10 text-orange-400',
  make:    'bg-pink-400/10 text-pink-400',
  multi:   'bg-cyan-400/10 text-cyan-400',
}

const STATUS_COLORS = {
  active:   'text-green-400',
  draft:    'text-[#94A3B8]',
  paused:   'text-amber-400',
  archived: 'text-red-400',
}

export default function WorkflowCard({ workflow, onClick }) {
  const successRate = workflow.success_rate ?? null

  return (
    <div
      onClick={() => onClick?.(workflow)}
      className="bg-[#12121A] border border-[#1E1E2E] rounded-xl p-5 hover:border-white/20 transition-all cursor-pointer"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="font-semibold truncate">{workflow.name}</div>
          <div className="text-xs text-[#94A3B8] mt-0.5">{workflow.department}</div>
        </div>
        <span className={`text-xs font-medium ${STATUS_COLORS[workflow.status] || 'text-[#94A3B8]'}`}>
          {workflow.status}
        </span>
      </div>

      <div className="flex items-center gap-2 mb-3">
        <span className={`text-xs px-2 py-0.5 rounded font-medium ${PLATFORM_COLORS[workflow.platform] || 'bg-white/5 text-[#94A3B8]'}`}>
          {workflow.platform}
        </span>
        <span className="text-xs text-[#94A3B8]">
          {(workflow.steps || []).length} steps
        </span>
      </div>

      {successRate !== null && (
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-[#94A3B8]">Success rate</span>
            <span className={successRate >= 80 ? 'text-green-400' : successRate >= 60 ? 'text-amber-400' : 'text-red-400'}>
              {successRate.toFixed(1)}%
            </span>
          </div>
          <div className="h-1 bg-[#1E1E2E] rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${successRate >= 80 ? 'bg-green-400' : successRate >= 60 ? 'bg-amber-400' : 'bg-red-400'}`}
              style={{ width: `${successRate}%` }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
