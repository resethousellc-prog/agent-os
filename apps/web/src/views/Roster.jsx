import TierBadge from '../components/TierBadge'
import StatusBadge from '../components/StatusBadge'
import { useAgents } from '../hooks/useAgents'

export default function Roster() {
  const { agents, loading, error } = useAgents()

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Roster</h1>
        <p className="text-[#94A3B8] mt-1">Your full depth chart</p>
      </div>

      {loading ? (
        <div className="text-[#94A3B8] animate-pulse">Loading roster...</div>
      ) : error ? (
        <div className="bg-red-400/10 border border-red-400/20 rounded-xl p-6 text-red-400 text-sm">
          {error} — API not connected yet (Session 2)
        </div>
      ) : agents.length === 0 ? (
        <div className="bg-[#12121A] border border-[#1E1E2E] rounded-xl p-12 text-center text-[#94A3B8]">
          <div className="text-4xl mb-4">👤</div>
          <div className="font-semibold mb-1">No agents on the roster yet</div>
          <div className="text-xs text-[#94A3B8]/60">Draft agents from the Draft Room to build your depth chart</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {agents.map(agent => (
            <div
              key={agent.id}
              className="bg-[#12121A] border border-[#1E1E2E] rounded-xl p-5 hover:border-white/20 transition-all cursor-pointer"
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
    </div>
  )
}
