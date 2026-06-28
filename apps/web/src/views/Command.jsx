import { useState, useEffect, useRef } from 'react'
import { api } from '../lib/api'
import { Building2, GitBranch, LayoutTemplate, Activity, Plus, Zap } from 'lucide-react'

const TABS = [
  { id: 'departments',     label: 'Departments',     icon: Building2 },
  { id: 'infrastructure',  label: 'Infrastructure',  icon: GitBranch },
  { id: 'templates',       label: 'Templates',       icon: LayoutTemplate },
  { id: 'fleet',           label: 'Fleet',           icon: Activity },
]

// ── Department Builder ──────────────────────────────────────────
function DepartmentBuilder() {
  const [departments, setDepartments] = useState([])
  const [agents, setAgents]           = useState([])
  const [form, setForm]               = useState({ name: '', display_name: '', description: '' })
  const [creating, setCreating]       = useState(false)

  useEffect(() => {
    api.get('/departments').then(({ data }) => setDepartments(data.departments || [])).catch(() => {})
    api.get('/agents').then(({ data }) => setAgents(data.agents || [])).catch(() => {})
  }, [])

  const create = async () => {
    setCreating(true)
    try {
      const { data } = await api.post('/departments', form)
      setDepartments(prev => [data.department, ...prev])
      setForm({ name: '', display_name: '', description: '' })
    } finally {
      setCreating(false)
    }
  }

  return (
    <div>
      {/* Create form */}
      <div className="bg-[#12121A] border border-[#1E1E2E] rounded-xl p-6 mb-6">
        <div className="text-sm text-amber-400 font-semibold mb-4">New Department</div>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <input
            value={form.name}
            onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
            placeholder="name (e.g. content_intelligence)"
            className="bg-[#0A0A0F] border border-[#1E1E2E] rounded-lg px-3 py-2.5 text-sm text-[#F8FAFC] placeholder-[#94A3B8]/50 focus:outline-none focus:border-amber-400/50"
          />
          <input
            value={form.display_name}
            onChange={e => setForm(p => ({ ...p, display_name: e.target.value }))}
            placeholder="Display Name"
            className="bg-[#0A0A0F] border border-[#1E1E2E] rounded-lg px-3 py-2.5 text-sm text-[#F8FAFC] placeholder-[#94A3B8]/50 focus:outline-none focus:border-amber-400/50"
          />
        </div>
        <button
          onClick={create}
          disabled={!form.name.trim() || creating}
          className="px-5 py-2.5 bg-amber-400 text-black font-bold rounded-xl hover:bg-amber-300 disabled:opacity-50 transition-all flex items-center gap-2"
        >
          <Plus size={16} />
          {creating ? 'Creating...' : 'Create Department'}
        </button>
      </div>

      {/* Department list */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {departments.map(dept => {
          const deptAgents = agents.filter(a => a.department === dept.name)
          return (
            <div key={dept.id} className="bg-[#12121A] border border-[#1E1E2E] rounded-xl p-5">
              <div className="font-semibold mb-1">{dept.display_name || dept.name}</div>
              <div className="text-xs text-[#94A3B8] mb-3">{dept.description || 'No description'}</div>
              <div className="flex items-center gap-4 text-xs text-[#94A3B8]">
                <span>{deptAgents.length} agents</span>
                <span className={`${dept.status === 'active' ? 'text-green-400' : 'text-[#94A3B8]'}`}>{dept.status}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Infrastructure Canvas ───────────────────────────────────────
function InfrastructureCanvas() {
  const [infrastructures, setInfrastructures] = useState([])
  const [nodes, setNodes]                     = useState([])
  const [dragging, setDragging]               = useState(null)
  const [offset, setOffset]                   = useState({ x: 0, y: 0 })
  const svgRef                                = useRef(null)

  useEffect(() => {
    api.get('/infrastructures').then(({ data }) => {
      setInfrastructures(data.infrastructures || [])
    }).catch(() => {})
    api.get('/departments').then(({ data }) => {
      const depts = data.departments || []
      setNodes(depts.map((d, i) => ({
        id:    d.id,
        label: d.display_name || d.name,
        x:     80 + (i % 4) * 180,
        y:     80 + Math.floor(i / 4) * 120,
      })))
    }).catch(() => {})
  }, [])

  const onMouseDown = (e, nodeId) => {
    const svgRect = svgRef.current.getBoundingClientRect()
    const node    = nodes.find(n => n.id === nodeId)
    setDragging(nodeId)
    setOffset({ x: e.clientX - svgRect.left - node.x, y: e.clientY - svgRect.top - node.y })
  }

  const onMouseMove = (e) => {
    if (!dragging) return
    const svgRect = svgRef.current.getBoundingClientRect()
    setNodes(prev => prev.map(n =>
      n.id === dragging
        ? { ...n, x: e.clientX - svgRect.left - offset.x, y: e.clientY - svgRect.top - offset.y }
        : n
    ))
  }

  return (
    <div>
      <div className="text-sm text-[#94A3B8] mb-4">
        Drag departments to arrange your infrastructure
        {infrastructures.length > 0 && (
          <span className="ml-2 text-[#94A3B8]/60">· {infrastructures.length} saved</span>
        )}
      </div>
      <div className="bg-[#12121A] border border-[#1E1E2E] rounded-xl overflow-hidden" style={{ height: 500 }}>
        <svg
          ref={svgRef}
          width="100%" height="100%"
          onMouseMove={onMouseMove}
          onMouseUp={() => setDragging(null)}
          onMouseLeave={() => setDragging(null)}
        >
          {nodes.map(node => (
            <g
              key={node.id}
              transform={`translate(${node.x},${node.y})`}
              onMouseDown={e => onMouseDown(e, node.id)}
              style={{ cursor: 'grab', userSelect: 'none' }}
            >
              <rect x="-60" y="-20" width="120" height="40" rx="8"
                fill="#1E1E2E" stroke="#F59E0B" strokeOpacity="0.4" strokeWidth="1" />
              <text textAnchor="middle" dy="5" fill="#F8FAFC" fontSize="11" fontFamily="sans-serif">
                {node.label.length > 16 ? node.label.slice(0, 14) + '…' : node.label}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  )
}

// ── Template Gallery ────────────────────────────────────────────
function TemplateGallery() {
  const [templates, setTemplates] = useState([])
  const [deploying, setDeploying] = useState(null)

  useEffect(() => {
    api.get('/infrastructures/templates').then(({ data }) => setTemplates(data.templates || [])).catch(() => {})
  }, [])

  const deploy = async (template) => {
    const name = prompt(`Name for this infrastructure (from "${template.name}"):`)
    if (!name) return
    setDeploying(template.id)
    try {
      await api.post('/infrastructures/from-template', { template_id: template.id, name })
      alert(`Infrastructure "${name}" created from template!`)
    } catch (err) {
      alert('Error: ' + (err.response?.data?.error || err.message))
    } finally {
      setDeploying(null)
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {templates.map(t => (
        <div key={t.id} className="bg-[#12121A] border border-[#1E1E2E] rounded-xl p-6">
          <div className="font-semibold mb-1">{t.name}</div>
          <div className="text-xs text-[#94A3B8] mb-4">{t.description}</div>
          <div className="flex items-center justify-between">
            <span className="text-xs px-2 py-0.5 bg-amber-400/10 text-amber-400 rounded">
              {t.use_case}
            </span>
            <button
              onClick={() => deploy(t)}
              disabled={deploying === t.id}
              className="flex items-center gap-2 px-4 py-2 bg-amber-400 text-black font-bold rounded-lg text-sm hover:bg-amber-300 disabled:opacity-50 transition-all"
            >
              <Zap size={14} />
              {deploying === t.id ? 'Deploying...' : 'Deploy'}
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Fleet Dashboard ─────────────────────────────────────────────
function FleetDashboard() {
  const [health, setHealth] = useState(null)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    api.get('/geelark/fleet/health').then(({ data }) => setHealth(data)).catch(() => {})
  }, [])

  if (!health) return <div className="text-[#94A3B8] animate-pulse">Loading fleet data...</div>

  const STATUS_COLORS = {
    active:    'text-green-400 bg-green-400/10',
    flagged:   'text-amber-400 bg-amber-400/10',
    suspended: 'text-red-400   bg-red-400/10',
    offline:   'text-[#94A3B8] bg-white/5',
    warmup:    'text-cyan-400  bg-cyan-400/10',
  }

  const filtered = filter === 'all'
    ? health.cells
    : (health.cells || []).filter(c => c.status === filter)

  return (
    <div>
      {/* KPI row */}
      <div className="grid grid-cols-5 gap-3 mb-6">
        {Object.entries(health.by_status || {}).map(([status, count]) => (
          <div key={status} className="bg-[#12121A] border border-[#1E1E2E] rounded-xl p-4 text-center">
            <div className="text-xl font-bold font-mono">{count}</div>
            <div className={`text-xs capitalize mt-1 ${STATUS_COLORS[status]?.split(' ')[0] || 'text-[#94A3B8]'}`}>{status}</div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {['all', 'active', 'flagged', 'suspended', 'warmup', 'offline'].map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
              filter === s
                ? 'bg-amber-400/20 text-amber-400 border border-amber-400/30'
                : 'bg-[#1E1E2E] text-[#94A3B8] hover:text-white'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Cell table */}
      <div className="bg-[#12121A] border border-[#1E1E2E] rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#1E1E2E]">
              {['Name', 'Pod', 'Platform', 'Status', 'Health', 'Posts Today'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs text-[#94A3B8] uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(filtered || []).slice(0, 50).map(cell => (
              <tr key={cell.id} className="border-b border-[#1E1E2E]/50 hover:bg-white/2">
                <td className="px-4 py-3 font-medium">{cell.name}</td>
                <td className="px-4 py-3 text-[#94A3B8]">{cell.pod || '—'}</td>
                <td className="px-4 py-3 text-[#94A3B8]">{cell.platform || '—'}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded font-medium ${STATUS_COLORS[cell.status] || 'text-[#94A3B8] bg-white/5'}`}>
                    {cell.status}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono">
                  <span className={cell.health_score >= 80 ? 'text-green-400' : cell.health_score >= 60 ? 'text-amber-400' : 'text-red-400'}>
                    {cell.health_score ?? 100}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono text-[#94A3B8]">{cell.posts_today ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered?.length === 0 && (
          <div className="p-8 text-center text-[#94A3B8] text-sm">No cells match filter</div>
        )}
      </div>
    </div>
  )
}

// ── Main Command view ───────────────────────────────────────────
export default function Command() {
  const [tab, setTab] = useState('departments')

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Command</h1>
        <p className="text-[#94A3B8] mt-1">Department builder and infrastructure canvas</p>
      </div>

      {/* Tab nav */}
      <div className="flex gap-1 mb-8 bg-[#12121A] border border-[#1E1E2E] rounded-xl p-1">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
              tab === id ? 'bg-amber-400/10 text-amber-400' : 'text-[#94A3B8] hover:text-white'
            }`}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {tab === 'departments'    && <DepartmentBuilder />}
      {tab === 'infrastructure' && <InfrastructureCanvas />}
      {tab === 'templates'      && <TemplateGallery />}
      {tab === 'fleet'          && <FleetDashboard />}
    </div>
  )
}
