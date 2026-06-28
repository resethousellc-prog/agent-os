import { useState, useEffect, useCallback } from 'react'
import { api } from '../lib/api'
import { supabase } from '../lib/supabase'
import { AlertTriangle, ChevronUp, ChevronDown, Check, Zap } from 'lucide-react'

// Persistent bottom tray showing pending escalations awaiting a human decision.
export default function EscalationTray() {
  const [escalations, setEscalations] = useState([])
  const [open, setOpen] = useState(false)
  const [decisions, setDecisions] = useState({}) // id -> text input
  const [busy, setBusy] = useState(null)

  const load = useCallback(() => {
    api.get('/escalations?status=pending')
      .then(({ data }) => setEscalations(data.escalations || []))
      .catch(() => setEscalations([]))
  }, [])

  useEffect(() => { load() }, [load])

  // Live updates as escalations are created/resolved.
  useEffect(() => {
    const channel = supabase
      .channel('escalations-tray')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'escalations' }, load)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [load])

  async function act(id, kind) {
    setBusy(id)
    try {
      await api.put(`/escalations/${id}/${kind}`, { resolution: decisions[id] || '' })
      setEscalations(prev => prev.filter(e => e.id !== id))
    } catch { /* leave in list on failure */ }
    setBusy(null)
  }

  const count = escalations.length
  if (count === 0 && !open) {
    return (
      <div className="fixed bottom-0 left-64 right-0 border-t border-[#1E1E2E] bg-[#12121A] px-6 py-2 text-xs text-[#94A3B8]">
        No pending escalations
      </div>
    )
  }

  return (
    <div className="fixed bottom-0 left-64 right-0 border-t border-[#1E1E2E] bg-[#12121A] z-40">
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 px-6 py-2 text-sm">
        <AlertTriangle size={16} className="text-amber-400" />
        <span className="font-medium text-amber-400">{count} pending escalation{count === 1 ? '' : 's'}</span>
        <span className="ml-auto text-[#94A3B8]">{open ? <ChevronDown size={16} /> : <ChevronUp size={16} />}</span>
      </button>

      {open && (
        <div className="max-h-72 overflow-y-auto px-6 pb-4 space-y-3">
          {escalations.map(e => (
            <div key={e.id} className="bg-[#0A0A0F] border border-[#1E1E2E] rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1 text-sm">
                <span className="font-medium">
                  {e.escalated_by_agent?.display_name || e.escalated_by_agent?.name || 'agent'}
                </span>
                <span className="text-[#94A3B8] text-xs">escalated</span>
              </div>
              <div className="text-sm text-[#F8FAFC] mb-2">{e.reason}</div>
              {e.context && (
                <pre className="text-xs text-[#94A3B8] bg-[#12121A] rounded p-2 mb-2 max-h-24 overflow-y-auto whitespace-pre-wrap">
                  {JSON.stringify(e.context, null, 2)}
                </pre>
              )}
              <input
                type="text"
                value={decisions[e.id] || ''}
                onChange={ev => setDecisions(d => ({ ...d, [e.id]: ev.target.value }))}
                placeholder="Decision / resolution..."
                className="w-full bg-[#0A0A0F] border border-[#1E1E2E] rounded px-3 py-2 text-sm mb-2 focus:outline-none focus:border-amber-400/50"
              />
              <div className="flex gap-2">
                <button disabled={busy === e.id} onClick={() => act(e.id, 'resolve')}
                  className="flex items-center gap-1 px-3 py-1.5 bg-green-400/10 text-green-400 border border-green-400/30 rounded text-xs font-medium hover:bg-green-400/20 disabled:opacity-50">
                  <Check size={14} /> Resolve
                </button>
                <button disabled={busy === e.id} onClick={() => act(e.id, 'override')}
                  className="flex items-center gap-1 px-3 py-1.5 bg-red-400/10 text-red-400 border border-red-400/30 rounded text-xs font-medium hover:bg-red-400/20 disabled:opacity-50">
                  <Zap size={14} /> Override
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
