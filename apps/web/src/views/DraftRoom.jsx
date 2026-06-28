import { useState } from 'react'
import { useAgents } from '../hooks/useAgents'
import { api } from '../lib/api'
import AgentCreator from '../components/AgentCreator'
import DraftPickCard from '../components/DraftPickCard'
import AgentProfile from '../components/AgentProfile'
import TierBadge from '../components/TierBadge'
import StatusBadge from '../components/StatusBadge'
import { Zap, Search } from 'lucide-react'
import { useEffect } from 'react'

export default function DraftRoom() {
  const { agents, loading, error } = useAgents()
  const [mode, setMode]             = useState('list') // 'list' | 'create'
  const [builds, setBuilds]         = useState([])
  const [selected, setSelected]     = useState(null)
  const [search, setSearch]         = useState('')
  const [agentList, setAgentList]   = useState(agents)

  useEffect(() => { setAgentList(agents) }, [agents])

  useEffect(() => {
    api.get('/agents/builds/pending')
      .then(({ data }) => setBuilds(data.builds || []))
      .catch(() => {})
  }, [])

  const filtered = agentList.filter(a =>
    (a.display_name || a.name).toLowerCase().includes(search.toLowerCase())
  )

  if (mode === 'create') {
    return (
      <AgentCreator
        onDeployed={(agent) => {
          setAgentList(prev => [agent, ...prev])
          setMode('list')
        }}
        onCancel={() => setMode('list')}
      />
    )
  }

  return (
    <div className="p-8">
      {/* Header */}
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
      {builds.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4 text-amber-400">📬 Incoming Draft Picks</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {builds.map(build => (
              <DraftPickCard
                key={build.id}
                build={build}
                onAction={(id, action) => setBuilds(prev => prev.filter(b => b.id !== id))}
              />
            ))}
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative mb-6">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search agents..."
          className="w-full bg-[#12121A] border border-[#1E1E2E] rounded-xl pl-9 pr-4 py-2.5 text-sm text-[#F8FAFC] placeholder-[#94A3B8]/50 focus:outline-none focus:border-amber-400/50 transition-colors"
        />
      </div>

      {/* Agent grid */}
      {loading ? (
        <div className="text-[#94A3B8] animate-pulse">Loading roster...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-[#12121A] border border-[#1E1E2E] rounded-xl p-12 text-center text-[#94A3B8]">
          <div className="text-4xl mb-4">👤</div>
          <div className="font-semibold mb-1">No agents yet</div>
          <div className="text-xs opacity-60">Draft your first agent to get started</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(agent => (
            <div
              key={agent.id}
              onClick={() => setSelected(agent)}
              className="bg-[#12121A] border border-[#1E1E2E] rounded-xl p-5 hover:border-white/20 transition-all cursor-pointer animate-agent-deploy"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">{agent.display_name || agent.name}</div>
                  <div className="text-xs text-[#94A3B8] mt-0.5">{agent.department}</div>
                </div>
                <TierBadge tier={agent.tier} />
              </div>
              <StatusBadge status={agent.status} />
            </div>
          ))}
        </div>
      )}

      {/* Agent profile slide-in */}
      <AgentProfile
        agent={selected}
        onClose={() => setSelected(null)}
        onUpdate={(updated) => {
          setAgentList(prev => prev.map(a => a.id === updated.id ? updated : a))
          setSelected(updated)
        }}
      />
    </div>
  )
}
