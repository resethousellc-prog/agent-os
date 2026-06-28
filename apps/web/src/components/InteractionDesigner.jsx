import { useState, useEffect, useRef } from 'react'
import { api } from '../lib/api'
import TierBadge from './TierBadge'
import { X, Save } from 'lucide-react'

const INTERACTION_TYPES = [
  { key: 'handoff',       label: 'Handoff' },
  { key: 'collaborative', label: 'Collaborative' },
  { key: 'delegation',    label: 'Delegation' },
  { key: 'escalation',    label: 'Escalation' },
  { key: 'peer_review',   label: 'Peer Review' },
  { key: 'swarm',         label: 'Swarm' },
]

// Canvas-based interaction loop builder. Draggable agent nodes on an SVG canvas.
export default function InteractionDesigner({ onClose }) {
  const [agents, setAgents] = useState([])
  const [nodes, setNodes] = useState([]) // { agent_id, name, tier, x, y }
  const [type, setType] = useState('handoff')
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const drag = useRef(null)
  const svgRef = useRef(null)

  useEffect(() => {
    api.get('/agents').then(({ data }) => setAgents(data.agents || [])).catch(() => setAgents([]))
  }, [])

  function addNode(agent) {
    if (nodes.find(n => n.agent_id === agent.id)) return
    setNodes(prev => [...prev, {
      agent_id: agent.id,
      name: agent.display_name || agent.name,
      tier: agent.tier,
      x: 120 + (prev.length % 4) * 160,
      y: 100 + Math.floor(prev.length / 4) * 140,
    }])
  }

  function onPointerDown(e, idx) {
    const rect = svgRef.current.getBoundingClientRect()
    drag.current = { idx, offX: e.clientX - rect.left - nodes[idx].x, offY: e.clientY - rect.top - nodes[idx].y }
  }
  function onPointerMove(e) {
    if (drag.current == null) return
    const rect = svgRef.current.getBoundingClientRect()
    const { idx, offX, offY } = drag.current
    const x = e.clientX - rect.left - offX
    const y = e.clientY - rect.top - offY
    setNodes(prev => prev.map((n, i) => i === idx ? { ...n, x, y } : n))
  }
  function onPointerUp() { drag.current = null }

  async function save() {
    if (!name.trim() || nodes.length === 0) return
    setSaving(true)
    try {
      await api.post('/loops', {
        name,
        interaction_type: type,
        participant_roles: nodes.map((n, i) => ({
          agent_id: n.agent_id, role: i === 0 ? 'initiator' : 'participant', position: { x: n.x, y: n.y },
        })),
        max_rounds: 5,
      })
      setSaved(true)
      setTimeout(onClose, 800)
    } catch { /* keep editing on failure */ }
    setSaving(false)
  }

  return (
    <div className="flex flex-col h-screen">
      <div className="flex items-center justify-between p-6 border-b border-[#1E1E2E]">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="text-[#94A3B8] hover:text-white"><X size={20} /></button>
          <h1 className="text-2xl font-bold">Interaction Designer</h1>
        </div>
        <button onClick={save} disabled={saving || !name.trim() || nodes.length === 0}
          className="px-4 py-2 bg-amber-400 text-black font-bold rounded-lg hover:bg-amber-300 flex items-center gap-2 text-sm disabled:opacity-50">
          <Save size={16} /> {saved ? 'Saved' : saving ? 'Saving...' : 'Save Loop'}
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 px-6 py-3 border-b border-[#1E1E2E]">
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Loop name..."
          className="bg-[#0A0A0F] border border-[#1E1E2E] rounded-lg px-3 py-2 text-sm w-64 focus:outline-none focus:border-amber-400/50" />
        <div className="flex gap-1.5">
          {INTERACTION_TYPES.map(t => (
            <button key={t.key} onClick={() => setType(t.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${
                type === t.key ? 'bg-amber-400/20 border-amber-400 text-amber-400'
                               : 'border-[#1E1E2E] text-[#94A3B8] hover:border-white/20'}`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Agent palette */}
        <div className="w-56 border-r border-[#1E1E2E] overflow-y-auto p-3 flex-shrink-0">
          <div className="text-xs text-[#94A3B8] uppercase tracking-wider mb-2">Agents</div>
          {agents.length === 0 && <div className="text-xs text-[#94A3B8]">No agents on roster</div>}
          {agents.map(a => (
            <button key={a.id} onClick={() => addNode(a)}
              className="w-full text-left p-2 mb-1 rounded-lg hover:bg-white/5 flex items-center justify-between gap-2">
              <span className="text-sm truncate">{a.display_name || a.name}</span>
              <TierBadge tier={a.tier} />
            </button>
          ))}
        </div>

        {/* SVG canvas */}
        <div className="flex-1 overflow-hidden bg-[#0A0A0F]">
          <svg ref={svgRef} className="w-full h-full"
            onMouseMove={onPointerMove} onMouseUp={onPointerUp} onMouseLeave={onPointerUp}>
            {/* edges between consecutive nodes */}
            {nodes.slice(1).map((n, i) => {
              const prev = nodes[i]
              return <line key={`e${i}`} x1={prev.x} y1={prev.y} x2={n.x} y2={n.y}
                stroke="#1E1E2E" strokeWidth="2" markerEnd="url(#arrow)" />
            })}
            <defs>
              <marker id="arrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto" markerUnits="strokeWidth">
                <path d="M0,0 L0,6 L9,3 z" fill="#475569" />
              </marker>
            </defs>
            {nodes.map((n, idx) => (
              <g key={n.agent_id} transform={`translate(${n.x},${n.y})`}
                onMouseDown={e => onPointerDown(e, idx)} style={{ cursor: 'grab' }}>
                <rect x="-60" y="-26" width="120" height="52" rx="10" fill="#12121A" stroke="#1E1E2E" />
                <text x="0" y="-4" textAnchor="middle" fill="#F8FAFC" fontSize="11">
                  {n.name.length > 16 ? n.name.slice(0, 15) + '…' : n.name}
                </text>
                <text x="0" y="12" textAnchor="middle" fill="#94A3B8" fontSize="9" fontFamily="monospace">
                  {n.tier}
                </text>
              </g>
            ))}
          </svg>
        </div>
      </div>
    </div>
  )
}
