import { useState } from 'react'
import { useWorkflows } from '../hooks/useWorkflows'
import { useMonitor } from '../hooks/useMonitor'
import WorkflowCard from '../components/WorkflowCard'
import StepBuilder from '../components/StepBuilder'
import VersionDiff from '../components/VersionDiff'
import { api } from '../lib/api'
import { BookOpen, Cpu, BarChart2, Lightbulb } from 'lucide-react'

const TABS = [
  { id: 'library',     label: 'Library',     icon: BookOpen },
  { id: 'design',      label: 'Design Studio', icon: Cpu },
  { id: 'monitor',     label: 'Monitor',     icon: BarChart2 },
  { id: 'improvement', label: 'Improvement Lab', icon: Lightbulb },
]

export default function Playbook() {
  const [tab, setTab]         = useState('library')
  const { workflows, loading, createWorkflow } = useWorkflows()
  const { metrics }           = useMonitor()
  const [selected, setSelected] = useState(null)
  const [improvements, setImprovements] = useState([])
  const [scaffoldForm, setScaffoldForm] = useState({ goal: '', platform: 'ghl', department: '', trigger_type: 'event', complexity: 'medium' })
  const [scaffoldResult, setScaffoldResult] = useState(null)
  const [scaffolding, setScaffolding]       = useState(false)

  const loadImprovements = async () => {
    const { data } = await api.get('/improvements?status=pending')
    setImprovements(data.improvements || [])
  }

  const handleScaffold = async () => {
    setScaffolding(true)
    try {
      const { data } = await api.post('/scaffold', scaffoldForm)
      setScaffoldResult(data.scaffold)
    } catch (err) {
      console.error(err)
    } finally {
      setScaffolding(false)
    }
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Playbook</h1>
        <p className="text-[#94A3B8] mt-1">Workflow library and automation</p>
      </div>

      {/* Tab nav */}
      <div className="flex gap-1 mb-8 bg-[#12121A] border border-[#1E1E2E] rounded-xl p-1">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => { setTab(id); if (id === 'improvement') loadImprovements() }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
              tab === id
                ? 'bg-amber-400/10 text-amber-400'
                : 'text-[#94A3B8] hover:text-white'
            }`}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {/* Library */}
      {tab === 'library' && (
        <div>
          {loading ? (
            <div className="text-[#94A3B8] animate-pulse">Loading workflows...</div>
          ) : workflows.length === 0 ? (
            <div className="bg-[#12121A] border border-[#1E1E2E] rounded-xl p-12 text-center text-[#94A3B8]">
              <div className="text-4xl mb-4">📖</div>
              <div className="font-semibold mb-1">No workflows yet</div>
              <div className="text-xs opacity-60">Use Design Studio to scaffold your first workflow</div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {workflows.map(w => (
                <WorkflowCard key={w.id} workflow={w} onClick={setSelected} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Design Studio */}
      {tab === 'design' && (
        <div className="max-w-2xl">
          {!scaffoldResult ? (
            <div className="space-y-4">
              <div>
                <label className="text-xs text-[#94A3B8] uppercase tracking-wider mb-1.5 block">Describe the goal</label>
                <textarea
                  value={scaffoldForm.goal}
                  onChange={e => setScaffoldForm(p => ({ ...p, goal: e.target.value }))}
                  placeholder="e.g. When a new lead comes in via GHL, tag them and trigger a 3-day follow-up sequence"
                  rows={3}
                  className="w-full bg-[#0A0A0F] border border-[#1E1E2E] rounded-xl px-4 py-3 text-sm text-[#F8FAFC] placeholder-[#94A3B8]/50 focus:outline-none focus:border-amber-400/50 resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { key: 'platform', label: 'Platform', options: ['ghl', 'geelark', 'bullmq', 'make', 'multi'] },
                  { key: 'trigger_type', label: 'Trigger', options: ['event', 'scheduled', 'webhook', 'manual'] },
                  { key: 'complexity', label: 'Complexity', options: ['simple', 'medium', 'complex'] },
                ].map(({ key, label, options }) => (
                  <div key={key}>
                    <label className="text-xs text-[#94A3B8] uppercase tracking-wider mb-1.5 block">{label}</label>
                    <select
                      value={scaffoldForm[key]}
                      onChange={e => setScaffoldForm(p => ({ ...p, [key]: e.target.value }))}
                      className="w-full bg-[#0A0A0F] border border-[#1E1E2E] rounded-lg px-3 py-2.5 text-sm text-[#F8FAFC] focus:outline-none focus:border-amber-400/50"
                    >
                      {options.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                ))}
              </div>
              <button
                onClick={handleScaffold}
                disabled={!scaffoldForm.goal.trim() || scaffolding}
                className="w-full py-3 bg-amber-400 text-black font-bold rounded-xl hover:bg-amber-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {scaffolding ? 'Generating scaffold...' : '⚡ Generate Scaffold'}
              </button>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Review Scaffold</h2>
                <button onClick={() => setScaffoldResult(null)} className="text-sm text-[#94A3B8] hover:text-white">← Back</button>
              </div>
              <StepBuilder
                steps={scaffoldResult.steps || []}
                onChange={(steps) => setScaffoldResult(p => ({ ...p, steps }))}
              />
              <button
                onClick={async () => {
                  await createWorkflow({ ...scaffoldResult, status: 'draft' })
                  setScaffoldResult(null)
                  setTab('library')
                }}
                className="mt-4 w-full py-3 bg-amber-400 text-black font-bold rounded-xl hover:bg-amber-300 transition-all"
              >
                Save to Library
              </button>
            </div>
          )}
        </div>
      )}

      {/* Monitor */}
      {tab === 'monitor' && (
        <div>
          {metrics ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              {[
                { label: 'Total Runs', value: metrics.total_runs ?? 0 },
                { label: 'Success Rate', value: `${(metrics.success_rate ?? 0).toFixed(1)}%` },
                { label: 'Avg Duration', value: `${((metrics.avg_duration_ms ?? 0) / 1000).toFixed(1)}s` },
              ].map(({ label, value }) => (
                <div key={label} className="bg-[#12121A] border border-[#1E1E2E] rounded-xl p-5">
                  <div className="text-sm text-[#94A3B8] mb-1">{label}</div>
                  <div className="text-2xl font-bold font-mono">{value}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-[#94A3B8] animate-pulse mb-8">Loading metrics...</div>
          )}
          <div className="text-sm text-[#94A3B8]">Per-workflow drill-down built in Session 8 Film Room</div>
        </div>
      )}

      {/* Improvement Lab */}
      {tab === 'improvement' && (
        <div className="space-y-4">
          {improvements.length === 0 ? (
            <div className="bg-[#12121A] border border-[#1E1E2E] rounded-xl p-12 text-center text-[#94A3B8]">
              <div className="text-4xl mb-4">💡</div>
              <div className="font-semibold mb-1">No pending improvements</div>
              <div className="text-xs opacity-60">Nightly analysis runs at 2am and flags workflows for improvement</div>
            </div>
          ) : improvements.map(imp => (
            <div key={imp.id} className="bg-[#12121A] border border-[#1E1E2E] rounded-xl p-6">
              <div className="flex items-center gap-2 mb-3">
                <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                  imp.impact_level === 'high'   ? 'bg-red-400/10 text-red-400' :
                  imp.impact_level === 'medium' ? 'bg-amber-400/10 text-amber-400' :
                                                  'bg-[#1E1E2E] text-[#94A3B8]'
                }`}>{imp.impact_level} impact</span>
              </div>
              <p className="text-sm text-[#F8FAFC] mb-4">{imp.analysis}</p>
              {imp.suggestions?.[0]?.updated_steps && (
                <div className="mb-4">
                  <VersionDiff
                    currentSteps={[]}
                    suggestedSteps={imp.suggestions[0].updated_steps}
                  />
                </div>
              )}
              <div className="flex gap-3">
                <button
                  onClick={async () => {
                    await api.post(`/improvements/${imp.id}/apply`)
                    setImprovements(prev => prev.filter(i => i.id !== imp.id))
                  }}
                  className="px-4 py-2 bg-green-400/10 text-green-400 border border-green-400/30 rounded-lg text-sm font-medium hover:bg-green-400/20 transition-all"
                >
                  Apply
                </button>
                <button
                  onClick={async () => {
                    await api.post(`/improvements/${imp.id}/dismiss`)
                    setImprovements(prev => prev.filter(i => i.id !== imp.id))
                  }}
                  className="px-4 py-2 bg-[#1E1E2E] text-[#94A3B8] rounded-lg text-sm font-medium hover:text-white transition-all"
                >
                  Dismiss
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
