import { useState, useEffect } from 'react'
import { api } from '../lib/api'

function scoreColor(score) {
  if (score >= 70) return 'text-green-400'
  if (score >= 40) return 'text-amber-400'
  return 'text-red-400'
}

// Shows an agent's strongest and weakest chemistry partners.
// Props: agentId (required), agentNames (optional { [id]: name } map).
export default function ChemistryDisplay({ agentId, agentNames = {} }) {
  const [pairs, setPairs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!agentId) return
    api.get(`/chemistry?agent_id=${agentId}`)
      .then(({ data }) => { setPairs(data.chemistry || []); setLoading(false) })
      .catch(() => { setPairs([]); setLoading(false) })
  }, [agentId])

  function partnerId(p) {
    return (p.agent_ids || []).find(id => id !== agentId) || '—'
  }
  function partnerName(p) {
    const id = partnerId(p)
    return agentNames[id] || `${String(id).slice(0, 8)}…`
  }

  if (loading) return <div className="text-[#94A3B8] text-sm animate-pulse">Loading chemistry...</div>
  if (pairs.length === 0) return <div className="text-[#94A3B8] text-sm">No chemistry data yet</div>

  const sorted = [...pairs].sort((a, b) => b.chemistry_score - a.chemistry_score)
  const top = sorted.slice(0, 3)
  const bottom = sorted.slice(-3).reverse()

  const Row = ({ p }) => (
    <div className="flex items-center justify-between text-sm py-1.5">
      <span className="text-[#F8FAFC] truncate">{partnerName(p)}</span>
      <span className={`font-mono font-bold ${scoreColor(p.chemistry_score)}`}>{p.chemistry_score}</span>
    </div>
  )

  return (
    <div className="space-y-4">
      <div>
        <div className="text-xs text-green-400 uppercase tracking-wider mb-1">Best Chemistry</div>
        {top.map(p => <Row key={p.id} p={p} />)}
      </div>
      <div>
        <div className="text-xs text-red-400 uppercase tracking-wider mb-1">Needs Work</div>
        {bottom.map(p => <Row key={p.id} p={p} />)}
      </div>
    </div>
  )
}
