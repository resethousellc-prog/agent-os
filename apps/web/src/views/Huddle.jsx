import { useState, useEffect, useCallback } from 'react'
import { api } from '../lib/api'
import { supabase } from '../lib/supabase'
import TierBadge from '../components/TierBadge'
import InteractionDesigner from '../components/InteractionDesigner'
import { Plus, RefreshCw } from 'lucide-react'

const THREAD_DOT = {
  active:    'bg-green-400 animate-pulse',
  completed: 'bg-[#94A3B8]',
  failed:    'bg-red-400',
  escalated: 'bg-amber-400',
  timed_out: 'bg-red-400',
  aborted:   'bg-red-400',
}

const MSG_TYPE_COLOR = {
  task: 'text-blue-400', output: 'text-green-400', escalation: 'text-amber-400',
  rejection: 'text-red-400', approval: 'text-green-400', delegation: 'text-cyan-400',
}

function StatusDot({ status }) {
  return <span className={`w-2 h-2 rounded-full inline-block ${THREAD_DOT[status] || 'bg-[#94A3B8]'}`} />
}

export default function Huddle() {
  const [threads, setThreads] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [designing, setDesigning] = useState(false)

  const loadThreads = useCallback(() => {
    api.get('/threads')
      .then(({ data }) => { setThreads(data.threads || []); setLoading(false) })
      .catch(err => { setError(err.message); setLoading(false) })
  }, [])

  useEffect(() => { loadThreads() }, [loadThreads])

  // Live thread list — Supabase Realtime on interaction_threads.
  useEffect(() => {
    const channel = supabase
      .channel('threads-feed')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'interaction_threads' }, loadThreads)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [loadThreads])

  const loadDetail = useCallback((id) => {
    if (!id) return
    api.get(`/threads/${id}`).then(({ data }) => setDetail(data)).catch(() => setDetail(null))
  }, [])

  useEffect(() => { loadDetail(selectedId) }, [selectedId, loadDetail])

  // Live message feed for the selected thread.
  useEffect(() => {
    if (!selectedId) return
    const channel = supabase
      .channel(`messages-${selectedId}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'agent_messages', filter: `thread_id=eq.${selectedId}` },
        () => loadDetail(selectedId))
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [selectedId, loadDetail])

  if (designing) {
    return <InteractionDesigner onClose={() => setDesigning(false)} />
  }

  return (
    <div className="flex flex-col h-screen">
      <div className="flex items-center justify-between p-6 border-b border-[#1E1E2E]">
        <div>
          <h1 className="text-2xl font-bold">The Huddle</h1>
          <p className="text-[#94A3B8] text-sm">Live agent interactions</p>
        </div>
        <div className="flex gap-2">
          <button onClick={loadThreads}
            className="p-2 text-[#94A3B8] hover:text-white border border-[#1E1E2E] rounded-lg">
            <RefreshCw size={16} />
          </button>
          <button onClick={() => setDesigning(true)}
            className="px-4 py-2 bg-amber-400 text-black font-bold rounded-lg hover:bg-amber-300 flex items-center gap-2 text-sm">
            <Plus size={16} /> Design Loop
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left: thread list */}
        <div className="w-72 border-r border-[#1E1E2E] overflow-y-auto flex-shrink-0">
          {loading ? (
            <div className="p-4 text-[#94A3B8] animate-pulse text-sm">Loading threads...</div>
          ) : error ? (
            <div className="p-4 text-red-400 text-sm">{error} — API not connected (Session 2)</div>
          ) : threads.length === 0 ? (
            <div className="p-4 text-[#94A3B8] text-sm">No interaction threads yet</div>
          ) : threads.map(t => (
            <button key={t.id} onClick={() => setSelectedId(t.id)}
              className={`w-full text-left p-4 border-b border-[#1E1E2E] hover:bg-white/5 ${
                selectedId === t.id ? 'bg-amber-400/5 border-l-2 border-l-amber-400' : ''}`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium truncate">{t.interaction_loops?.name || 'Thread'}</span>
                <StatusDot status={t.status} />
              </div>
              <div className="text-xs text-[#94A3B8]">
                {t.interaction_loops?.interaction_type} · round {t.current_round}
                {t.participant_agent_ids?.length ? ` · ${t.participant_agent_ids.length} agents` : ''}
              </div>
            </button>
          ))}
        </div>

        {/* Center: message feed */}
        <div className="flex-1 overflow-y-auto p-6">
          {!detail ? (
            <div className="text-[#94A3B8] text-sm">Select a thread to view its message feed</div>
          ) : (
            <div className="space-y-3 max-w-3xl">
              {(detail.messages || []).length === 0 && (
                <div className="text-[#94A3B8] text-sm">No messages in this thread yet</div>
              )}
              {(detail.messages || []).map(m => (
                <div key={m.id} className="bg-[#12121A] border border-[#1E1E2E] rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-medium">
                      {m.sender?.display_name || m.sender?.name || 'agent'}
                    </span>
                    {m.sender?.tier && <TierBadge tier={m.sender.tier} />}
                    <span className={`text-xs font-mono ${MSG_TYPE_COLOR[m.message_type] || 'text-[#94A3B8]'}`}>
                      {m.message_type}
                    </span>
                    <span className="text-xs text-[#94A3B8] ml-auto">round {m.round_number}</span>
                  </div>
                  <pre className="text-xs text-[#94A3B8] whitespace-pre-wrap break-words font-mono">
                    {JSON.stringify(m.payload, null, 2)}
                  </pre>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: thread context */}
        <div className="w-72 border-l border-[#1E1E2E] overflow-y-auto flex-shrink-0 p-4">
          {detail?.thread ? (
            <>
              <div className="text-xs text-[#94A3B8] uppercase tracking-wider mb-2">Loop Config</div>
              <div className="bg-[#12121A] border border-[#1E1E2E] rounded-lg p-3 mb-4 text-sm">
                <div className="font-medium mb-1">{detail.thread.interaction_loops?.name}</div>
                <div className="text-xs text-[#94A3B8]">
                  Type: {detail.thread.interaction_loops?.interaction_type}<br />
                  Max rounds: {detail.thread.interaction_loops?.max_rounds}<br />
                  Status: {detail.thread.status}
                </div>
              </div>
              <div className="text-xs text-[#94A3B8] uppercase tracking-wider mb-2">Completion</div>
              <div className="bg-[#12121A] border border-[#1E1E2E] rounded-lg p-3 text-xs text-[#94A3B8]">
                <div className="mb-2">
                  Round {detail.thread.current_round} / {detail.thread.interaction_loops?.max_rounds || '?'}
                </div>
                <div className="h-1.5 bg-[#1E1E2E] rounded-full overflow-hidden">
                  <div className="h-full bg-amber-400 rounded-full" style={{
                    width: `${Math.min(100, (detail.thread.current_round /
                      (detail.thread.interaction_loops?.max_rounds || 5)) * 100)}%`
                  }} />
                </div>
              </div>
            </>
          ) : (
            <div className="text-[#94A3B8] text-sm">No thread selected</div>
          )}
        </div>
      </div>
    </div>
  )
}
