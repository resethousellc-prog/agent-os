import { useState, useEffect } from 'react'
import { api } from '../lib/api'
import StatusBadge from '../components/StatusBadge'
import { Bot } from 'lucide-react'

export default function AgentPortal() {
  const [agents, setAgents]       = useState([])
  const [requests, setRequests]   = useState([])
  const [runs, setRuns]           = useState([])
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    Promise.all([
      api.get('/agents'),
      api.get('/workflow-runs?limit=20'),
    ]).then(([agentsRes, runsRes]) => {
      setAgents(agentsRes.data.agents || [])
      setRuns(runsRes.data.runs || [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Bot size={28} className="text-amber-400" />
          Agent Portal
        </h1>
        <p className="text-[#94A3B8] mt-1">All agents and current activity</p>
      </div>

      {loading ? (
        <div className="text-[#94A3B8] animate-pulse">Loading...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Active agents */}
          <div>
            <h2 className="text-lg font-semibold mb-4">Active Agents</h2>
            <div className="space-y-3">
              {agents.filter(a => a.status === 'active').map(agent => (
                <div key={agent.id} className="bg-[#12121A] border border-[#1E1E2E] rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <div className="font-medium">{agent.display_name || agent.name}</div>
                    <div className="text-xs text-[#94A3B8]">{agent.department}</div>
                  </div>
                  <StatusBadge status={agent.status} />
                </div>
              ))}
              {agents.filter(a => a.status === 'active').length === 0 && (
                <div className="text-[#94A3B8] text-sm">No active agents</div>
              )}
            </div>
          </div>

          {/* Recent runs */}
          <div>
            <h2 className="text-lg font-semibold mb-4">Recent Workflow Runs</h2>
            <div className="space-y-2">
              {runs.slice(0, 10).map(run => (
                <div key={run.id} className="bg-[#12121A] border border-[#1E1E2E] rounded-lg px-4 py-3 flex items-center justify-between">
                  <div className="text-sm font-medium truncate flex-1">{run.workflow_id}</div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-[#94A3B8] font-mono">{run.duration_ms ? `${(run.duration_ms/1000).toFixed(1)}s` : '—'}</span>
                    <span className={`text-xs font-medium ${
                      run.status === 'success' ? 'text-green-400' :
                      run.status === 'failed'  ? 'text-red-400' :
                      run.status === 'running' ? 'text-amber-400' : 'text-[#94A3B8]'
                    }`}>{run.status}</span>
                  </div>
                </div>
              ))}
              {runs.length === 0 && (
                <div className="text-[#94A3B8] text-sm">No workflow runs yet</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
