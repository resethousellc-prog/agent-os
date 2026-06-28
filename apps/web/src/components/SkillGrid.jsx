import { useState, useEffect } from 'react'
import AgentToolCard from './AgentToolCard'
import { api } from '../lib/api'

export default function SkillGrid({ agentTier, assigned = [], onChange }) {
  const [tools, setTools] = useState([])
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    api.get('/tools').then(({ data }) => setTools(data.tools || []))
  }, [])

  const platforms = ['all', ...new Set(tools.map(t => t.platform))]
  const filtered = filter === 'all' ? tools : tools.filter(t => t.platform === filter)

  const toggle = (toolName) => {
    const next = assigned.includes(toolName)
      ? assigned.filter(n => n !== toolName)
      : [...assigned, toolName]
    onChange(next)
  }

  return (
    <div>
      {/* Platform filter tabs */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {platforms.map(p => (
          <button
            key={p}
            onClick={() => setFilter(p)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
              filter === p
                ? 'bg-amber-400/20 text-amber-400 border border-amber-400/30'
                : 'bg-[#1E1E2E] text-[#94A3B8] hover:text-white'
            }`}
          >
            {p}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {filtered.map(tool => (
          <AgentToolCard
            key={tool.name}
            tool={tool}
            assigned={assigned.includes(tool.name)}
            agentTier={agentTier}
            onToggle={toggle}
          />
        ))}
      </div>
    </div>
  )
}
