import { useState, useEffect } from 'react'
import TierBadge from './TierBadge'
import StatusBadge from './StatusBadge'
import AttributeBar from './AttributeBar'
import AttributeRadar from './AttributeRadar'
import { api } from '../lib/api'
import { X, TrendingUp } from 'lucide-react'

export default function AgentProfile({ agent, onClose, onUpdate }) {
  const [attrs, setAttrs]   = useState(null)
  const [devLog, setDevLog] = useState([])
  const [tab, setTab]       = useState('attributes')
  const [promoting, setPromoting] = useState(false)

  useEffect(() => {
    if (!agent) return
    api.get(`/agents/${agent.id}/attributes/history`)
      .then(({ data }) => setAttrs(data.latest || {}))
    api.get(`/agents/${agent.id}/development`)
      .then(({ data }) => setDevLog(data.events || []))
  }, [agent?.id])

  if (!agent) return null

  async function handlePromote() {
    setPromoting(true)
    const nextTier = agent.tier === 'T1-EXEC' ? 'T2-HIGH' : 'T3-FULL'
    try {
      await api.put(`/agents/${agent.id}/promote`, { tier: nextTier })
      onUpdate({ ...agent, tier: nextTier })
    } finally {
      setPromoting(false)
    }
  }

  const TABS = ['attributes', 'development', 'workflows', 'keys']

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-xl bg-[#12121A] border-l border-[#1E1E2E] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-[#12121A] border-b border-[#1E1E2E] p-6 flex items-start justify-between z-10">
          <div>
            <div className="font-bold text-xl">{agent.display_name || agent.name}</div>
            <div className="text-sm text-[#94A3B8] mt-0.5">{agent.department}</div>
            <div className="flex items-center gap-2 mt-2">
              <TierBadge tier={agent.tier} />
              <StatusBadge status={agent.status} />
            </div>
          </div>
          <button onClick={onClose} className="text-[#94A3B8] hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#1E1E2E]">
          {TABS.map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-3 text-sm font-medium capitalize transition-colors ${
                tab === t
                  ? 'text-amber-400 border-b-2 border-amber-400'
                  : 'text-[#94A3B8] hover:text-white'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="p-6">
          {tab === 'attributes' && (
            <div>
              {attrs ? (
                <>
                  <AttributeRadar attributes={attrs} size={250} />
                  <div className="mt-6 space-y-4">
                    {Object.entries(attrs).filter(([k]) => k !== 'escalation_rate').map(([key, val]) => (
                      <AttributeBar key={key} name={key} value={val} />
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-[#94A3B8] text-sm">No attribute data yet</div>
              )}
              {agent.tier !== 'T3-FULL' && (
                <button
                  onClick={handlePromote}
                  disabled={promoting}
                  className="mt-6 w-full flex items-center justify-center gap-2 py-3 bg-amber-400/10 text-amber-400 border border-amber-400/20 rounded-xl font-semibold hover:bg-amber-400/20 transition-all disabled:opacity-50"
                >
                  <TrendingUp size={16} />
                  {promoting ? 'Promoting...' : `Promote to ${agent.tier === 'T1-EXEC' ? 'T2-HIGH' : 'T3-FULL'}`}
                </button>
              )}
            </div>
          )}

          {tab === 'development' && (
            <div className="space-y-3">
              {devLog.length === 0 ? (
                <div className="text-[#94A3B8] text-sm">No development events yet</div>
              ) : devLog.map(event => (
                <div key={event.id} className="flex gap-3">
                  <div className="w-2 h-2 rounded-full bg-amber-400 mt-1.5 flex-shrink-0" />
                  <div>
                    <div className="text-sm font-medium capitalize">{event.event_type.replace(/_/g, ' ')}</div>
                    <div className="text-xs text-[#94A3B8]">{event.triggered_by} · {new Date(event.created_at).toLocaleDateString()}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'workflows' && (
            <div className="text-[#94A3B8] text-sm">
              Assigned workflows: {(agent.assigned_workflows || []).length || 'none'}
            </div>
          )}

          {tab === 'keys' && (
            <div className="text-[#94A3B8] text-sm">
              API key management — coming in Session 13
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
