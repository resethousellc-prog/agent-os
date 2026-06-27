import { useState } from 'react'
import TierBadge from '../components/TierBadge'
import AttributeBar from '../components/AttributeBar'
import { Zap } from 'lucide-react'

const DEFAULT_ATTRIBUTES = {
  reasoning_depth:    50,
  execution_speed:    50,
  reliability:        50,
  creativity:         50,
  autonomy:           50,
  communication:      50,
  collaboration_score:50,
  delegation_quality: 50,
}

export default function DraftRoom() {
  const [mode, setMode] = useState('list') // 'list' | 'create'
  const [attrs, setAttrs] = useState(DEFAULT_ATTRIBUTES)
  const [tier, setTier] = useState('T1-EXEC')
  const [agentName, setAgentName] = useState('')

  const updateAttr = (key, val) => setAttrs(prev => ({ ...prev, [key]: val }))

  if (mode === 'create') return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <button
          onClick={() => setMode('list')}
          className="text-[#94A3B8] hover:text-white transition-colors text-lg"
        >
          ←
        </button>
        <h1 className="text-2xl font-bold">Draft New Agent</h1>
      </div>

      {/* Agent name */}
      <div className="bg-[#12121A] border border-[#1E1E2E] rounded-xl p-6 mb-6">
        <div className="text-sm text-[#94A3B8] mb-3 uppercase tracking-wider">Agent Name</div>
        <input
          type="text"
          value={agentName}
          onChange={e => setAgentName(e.target.value)}
          placeholder="e.g. Content Ops Alpha"
          className="w-full bg-[#0A0A0F] border border-[#1E1E2E] rounded-lg px-4 py-3 text-[#F8FAFC] placeholder-[#94A3B8]/50 focus:outline-none focus:border-amber-400/50 transition-colors"
        />
      </div>

      {/* Tier selector */}
      <div className="bg-[#12121A] border border-[#1E1E2E] rounded-xl p-6 mb-6">
        <div className="text-sm text-[#94A3B8] mb-3 uppercase tracking-wider">Select Tier</div>
        <div className="flex gap-3">
          {['T1-EXEC', 'T2-HIGH', 'T3-FULL'].map(t => (
            <button
              key={t}
              onClick={() => setTier(t)}
              className={`flex-1 py-3 rounded-lg border transition-all font-bold font-mono text-sm ${
                tier === t
                  ? t === 'T3-FULL' ? 'bg-amber-400/20 border-amber-400 text-amber-400'
                  : t === 'T2-HIGH' ? 'bg-blue-400/20  border-blue-400  text-blue-400'
                  :                   'bg-green-400/20 border-green-400 text-green-400'
                  : 'border-[#1E1E2E] text-[#94A3B8] hover:border-white/20'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Attribute sliders — all 8 from the schema */}
      <div className="bg-[#12121A] border border-[#1E1E2E] rounded-xl p-6 mb-6">
        <div className="text-sm text-[#94A3B8] mb-4 uppercase tracking-wider">Attributes</div>
        <div className="space-y-5">
          {Object.entries(attrs).map(([key, val]) => (
            <AttributeBar key={key} name={key} value={val} onChange={updateAttr} />
          ))}
        </div>
      </div>

      <button
        disabled={!agentName.trim()}
        className="w-full py-4 bg-amber-400 text-black font-bold rounded-xl hover:bg-amber-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
      >
        <Zap size={20} />
        Deploy Agent
      </button>
      <p className="text-center text-xs text-[#94A3B8] mt-3">
        Full agent creation with system prompt and tool assignment built in Session 6
      </p>
    </div>
  )

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Draft Room</h1>
          <p className="text-[#94A3B8] mt-1">Build your agent roster</p>
        </div>
        <button
          onClick={() => setMode('create')}
          className="px-6 py-3 bg-amber-400 text-black font-bold rounded-xl hover:bg-amber-300 transition-colors flex items-center gap-2"
        >
          <Zap size={18} />
          Draft New Agent
        </button>
      </div>

      {/* Incoming draft picks */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4 text-amber-400">📬 Incoming Draft Picks</h2>
        <div className="bg-[#12121A] border border-[#1E1E2E] rounded-xl p-8 text-center text-[#94A3B8]">
          No pending draft picks
          <p className="text-xs mt-1 text-[#94A3B8]/60">
            Builder agents will submit specs here — built in Session 6
          </p>
        </div>
      </div>
    </div>
  )
}
