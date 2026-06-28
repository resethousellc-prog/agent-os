import { useState, useEffect } from 'react'
import { useAgents } from '../hooks/useAgents'
import { api } from '../lib/api'
import RunHistory from '../components/RunHistory'
import AttributeTrends from '../components/AttributeTrends'
import DevelopmentTimeline from '../components/DevelopmentTimeline'
import TierBadge from '../components/TierBadge'
import StatusBadge from '../components/StatusBadge'
import { TrendingUp } from 'lucide-react'

function TrainingDashboard({ agent }) {
  const [results, setResults]     = useState([])
  const [training, setTraining]   = useState(false)
  const [approving, setApproving] = useState(false)
  const [passRate, setPassRate]   = useState(null)

  const refresh = () => {
    api.get(`/agents/${agent.id}/training-status`)
      .then(({ data }) => {
        setResults(data.recent_results || data.recent_runs || [])
        setPassRate(data.pass_rate ?? null)
      })
      .catch(() => {})
  }

  useEffect(() => { refresh() }, [agent.id])

  const runTraining = async () => {
    setTraining(true)
    try {
      await api.post(`/agents/${agent.id}/train`, { platform: agent.platform_access?.[0] || 'ghl', batch_size: 20 })
      setTimeout(refresh, 3000)
    } finally {
      setTraining(false)
    }
  }

  const approveForProduction = async () => {
    setApproving(true)
    try {
      await api.put(`/agents/${agent.id}/promote-status`, { status: 'production_ready' })
    } finally {
      setApproving(false)
    }
  }

  const threshold = 95

  return (
    <div>
      {/* Pass rate gauge */}
      <div className="bg-[#12121A] border border-[#1E1E2E] rounded-xl p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-sm text-[#94A3B8] uppercase tracking-wider mb-1">Pass Rate</div>
            <div className={`text-4xl font-bold font-mono ${
              passRate === null ? 'text-[#94A3B8]' :
              passRate >= threshold ? 'text-green-400' :
              passRate >= 80 ? 'text-amber-400' : 'text-red-400'
            }`}>
              {passRate === null ? '—' : `${passRate.toFixed(1)}%`}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-[#94A3B8] mb-1">Threshold</div>
            <div className="text-2xl font-bold font-mono text-amber-400">{threshold}%</div>
          </div>
        </div>
        {passRate !== null && (
          <div className="h-3 bg-[#1E1E2E] rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                passRate >= threshold ? 'bg-green-400' : passRate >= 80 ? 'bg-amber-400' : 'bg-red-400'
              }`}
              style={{ width: `${Math.min(100, passRate)}%` }}
            />
          </div>
        )}
      </div>

      {/* Last 10 training runs */}
      <div className="bg-[#12121A] border border-[#1E1E2E] rounded-xl p-5 mb-6">
        <div className="text-sm text-[#94A3B8] uppercase tracking-wider mb-3">Last Training Runs</div>
        {results.length === 0 ? (
          <div className="text-sm text-[#94A3B8]">No training runs yet</div>
        ) : (
          <div className="flex gap-2 flex-wrap">
            {results.slice(0, 10).map((r, i) => (
              <div
                key={i}
                title={r.failure_reason || (r.passed ? 'Passed' : 'Failed')}
                className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                  r.passed ? 'bg-green-400/20 text-green-400' : 'bg-red-400/20 text-red-400'
                }`}
              >
                {r.passed ? '✓' : '✗'}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={runTraining}
          disabled={training}
          className="px-6 py-3 bg-amber-400/10 text-amber-400 border border-amber-400/20 rounded-xl font-semibold hover:bg-amber-400/20 disabled:opacity-50 transition-all"
        >
          {training ? 'Running...' : 'Run Training Batch'}
        </button>
        {passRate !== null && passRate >= 90 && agent.status !== 'production_ready' && (
          <button
            onClick={approveForProduction}
            disabled={approving}
            className="px-6 py-3 bg-green-400/10 text-green-400 border border-green-400/30 rounded-xl font-semibold hover:bg-green-400/20 disabled:opacity-50 transition-all"
          >
            {approving ? 'Approving...' : 'Approve for Production'}
          </button>
        )}
      </div>
    </div>
  )
}

export default function FilmRoom() {
  const { agents, loading } = useAgents()
  const [selected, setSelected]     = useState(null)
  const [runs, setRuns]             = useState([])
  const [attrHistory, setAttrHistory] = useState([])
  const [devLog, setDevLog]         = useState([])
  const [tab, setTab]               = useState('runs')
  const [loadingDetail, setLoadingDetail] = useState(false)

  useEffect(() => {
    if (!selected) return
    setLoadingDetail(true)
    Promise.all([
      api.get(`/workflow-runs?agent_id=${selected.id}&limit=30`),
      api.get(`/agents/${selected.id}/attributes/history`),
      api.get(`/agents/${selected.id}/development`),
    ]).then(([runsRes, attrsRes, devRes]) => {
      setRuns(runsRes.data.runs || [])
      setAttrHistory(attrsRes.data.history || [])
      setDevLog(devRes.data.events || [])
      setLoadingDetail(false)
    }).catch(() => setLoadingDetail(false))
  }, [selected?.id])

  const latestAttrs = attrHistory[0] || {}
  const successRate = runs.length > 0
    ? (runs.filter(r => r.status === 'success').length / runs.length * 100).toFixed(1)
    : null
  const avgDuration = runs.length > 0
    ? (runs.reduce((s, r) => s + (r.duration_ms || 0), 0) / runs.length / 1000).toFixed(2)
    : null

  const promotionEligible = Object.values(latestAttrs).some(v => typeof v === 'number' && v >= 90)

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Agent selector sidebar */}
      <div className="w-72 bg-[#12121A] border-r border-[#1E1E2E] overflow-y-auto flex-shrink-0">
        <div className="p-4 border-b border-[#1E1E2E]">
          <h2 className="font-semibold text-sm uppercase tracking-wider text-[#94A3B8]">Select Agent</h2>
        </div>
        {loading ? (
          <div className="p-4 text-[#94A3B8] text-sm animate-pulse">Loading...</div>
        ) : agents.map(agent => (
          <div
            key={agent.id}
            onClick={() => setSelected(agent)}
            className={`px-4 py-3 border-b border-[#1E1E2E] cursor-pointer transition-all hover:bg-white/2 ${
              selected?.id === agent.id ? 'bg-amber-400/5 border-l-2 border-l-amber-400' : ''
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <div className="font-medium text-sm truncate">{agent.display_name || agent.name}</div>
              <TierBadge tier={agent.tier} />
            </div>
            <div className="text-xs text-[#94A3B8]">{agent.department}</div>
          </div>
        ))}
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto">
        {!selected ? (
          <div className="flex items-center justify-center h-full text-[#94A3B8]">
            <div className="text-center">
              <div className="text-4xl mb-4">🎬</div>
              <div className="font-medium">Select an agent to review their film</div>
            </div>
          </div>
        ) : (
          <div className="p-8">
            {/* Agent header */}
            <div className="flex items-start justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold">{selected.display_name || selected.name}</h1>
                <div className="flex items-center gap-2 mt-2">
                  <TierBadge tier={selected.tier} />
                  <StatusBadge status={selected.status} />
                </div>
              </div>
              {promotionEligible && selected.tier !== 'T3-FULL' && (
                <div className="bg-amber-400/10 border border-amber-400/30 rounded-xl px-4 py-3 flex items-center gap-2">
                  <TrendingUp size={16} className="text-amber-400" />
                  <span className="text-sm text-amber-400 font-semibold">Promotion Available</span>
                </div>
              )}
            </div>

            {/* Season stats */}
            {loadingDetail ? (
              <div className="text-[#94A3B8] animate-pulse mb-6">Loading...</div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {[
                  { label: 'Total Runs',   value: runs.length },
                  { label: 'Success Rate', value: successRate ? `${successRate}%` : '—' },
                  { label: 'Avg Duration', value: avgDuration ? `${avgDuration}s` : '—' },
                  { label: 'Skills',       value: (selected.capabilities || []).length },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-[#12121A] border border-[#1E1E2E] rounded-xl p-4">
                    <div className="text-xs text-[#94A3B8] mb-1">{label}</div>
                    <div className="text-xl font-bold font-mono">{value}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Tabs */}
            <div className="flex gap-1 mb-6 bg-[#12121A] border border-[#1E1E2E] rounded-xl p-1">
              {[
                { id: 'runs',     label: 'Run History' },
                { id: 'trends',   label: 'Attribute Trends' },
                { id: 'dev',      label: 'Development Log' },
                { id: 'training', label: 'Training' },
              ].map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                    tab === id ? 'bg-amber-400/10 text-amber-400' : 'text-[#94A3B8] hover:text-white'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {tab === 'runs'     && <RunHistory runs={runs} />}
            {tab === 'trends'   && <AttributeTrends history={attrHistory} />}
            {tab === 'dev'      && <DevelopmentTimeline events={devLog} />}
            {tab === 'training' && <TrainingDashboard agent={selected} />}
          </div>
        )}
      </div>
    </div>
  )
}
