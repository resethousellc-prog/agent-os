import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'

const STATUS_COLORS = {
  success: 'text-green-400',
  failed:  'text-red-400',
  running: 'text-amber-400',
  partial: 'text-orange-400',
}

export default function RunHistory({ runs = [] }) {
  const [expanded, setExpanded] = useState(null)

  if (runs.length === 0) {
    return (
      <div className="bg-[#12121A] border border-[#1E1E2E] rounded-xl p-8 text-center text-[#94A3B8]">
        <div className="text-3xl mb-3">📼</div>
        <div className="font-medium">No runs yet</div>
        <div className="text-xs mt-1 opacity-60">Workflow executions will appear here</div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {runs.map(run => (
        <div key={run.id} className="bg-[#12121A] border border-[#1E1E2E] rounded-xl overflow-hidden">
          <div
            className="flex items-center gap-4 px-4 py-3 cursor-pointer hover:bg-white/2 transition-all"
            onClick={() => setExpanded(expanded === run.id ? null : run.id)}
          >
            {expanded === run.id ? <ChevronDown size={14} className="text-[#94A3B8]" /> : <ChevronRight size={14} className="text-[#94A3B8]" />}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{run.workflow_id || 'Workflow'}</div>
              <div className="text-xs text-[#94A3B8]">{new Date(run.started_at).toLocaleString()}</div>
            </div>
            <div className="text-xs text-[#94A3B8] font-mono">
              {run.duration_ms ? `${(run.duration_ms / 1000).toFixed(2)}s` : '—'}
            </div>
            <span className={`text-xs font-semibold ${STATUS_COLORS[run.status] || 'text-[#94A3B8]'}`}>
              {run.status}
            </span>
          </div>
          {expanded === run.id && (
            <div className="px-4 pb-4 border-t border-[#1E1E2E] pt-3">
              <div className="text-xs text-[#94A3B8] mb-2">Steps completed: {run.steps_completed}/{run.steps_total}</div>
              {run.error_log?.length > 0 && (
                <div className="bg-red-400/5 border border-red-400/20 rounded-lg p-3">
                  <div className="text-xs text-red-400 font-medium mb-1">Errors</div>
                  {run.error_log.map((e, i) => (
                    <div key={i} className="text-xs text-[#94A3B8] font-mono">{JSON.stringify(e)}</div>
                  ))}
                </div>
              )}
              {run.output_payload && Object.keys(run.output_payload).length > 0 && (
                <pre className="text-xs text-[#94A3B8] font-mono mt-2 overflow-auto max-h-32">
                  {JSON.stringify(run.output_payload, null, 2)}
                </pre>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
