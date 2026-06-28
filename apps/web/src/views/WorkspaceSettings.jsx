import { useState, useEffect } from 'react'
import { api } from '../lib/api'
import { useWorkspace } from '../hooks/useWorkspace'
import { Settings } from 'lucide-react'

const PLAN_COLORS = {
  starter:     'text-[#94A3B8] bg-white/5',
  growth:      'text-blue-400  bg-blue-400/10',
  pro:         'text-amber-400 bg-amber-400/10',
  white_label: 'text-purple-400 bg-purple-400/10',
}

export default function WorkspaceSettings() {
  const { workspace } = useWorkspace()
  const [usage, setUsage]         = useState(null)
  const [branding, setBranding]   = useState({ app_name: '', primary_color: '#F59E0B', logo_url: '' })
  const [saving, setSaving]       = useState(false)
  const [clients, setClients]     = useState([])

  useEffect(() => {
    if (!workspace) return
    api.get(`/workspaces/${workspace.id}/usage`).then(({ data }) => setUsage(data)).catch(() => {})
    if (workspace.plan === 'white_label') {
      api.get('/workspaces/clients').then(({ data }) => setClients(data.clients || [])).catch(() => {})
    }
    if (workspace.branding) setBranding(prev => ({ ...prev, ...workspace.branding }))
  }, [workspace?.id])

  const saveBranding = async () => {
    setSaving(true)
    try {
      await api.put(`/workspaces/${workspace.id}/branding`, branding)
      // Apply CSS vars immediately
      applyBranding(branding)
    } finally {
      setSaving(false)
    }
  }

  const isPro        = ['pro', 'white_label'].includes(workspace?.plan)
  const isWhiteLabel = workspace?.plan === 'white_label'

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8 flex items-center gap-3">
        <Settings size={24} className="text-amber-400" />
        <div>
          <h1 className="text-3xl font-bold">Workspace Settings</h1>
          <p className="text-[#94A3B8] mt-1">{workspace?.name}</p>
        </div>
      </div>

      {/* Plan */}
      <div className="bg-[#12121A] border border-[#1E1E2E] rounded-xl p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="font-semibold">Current Plan</div>
          <span className={`text-sm font-bold px-3 py-1 rounded-full capitalize ${PLAN_COLORS[workspace?.plan] || ''}`}>
            {workspace?.plan}
          </span>
        </div>
        {usage && (
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Agents', used: usage.agents_used, max: usage.agents_max },
              { label: 'Workflows', used: usage.workflows_used, max: usage.workflows_max },
            ].map(({ label, used, max }) => (
              <div key={label}>
                <div className="flex justify-between text-xs text-[#94A3B8] mb-1">
                  <span>{label}</span>
                  <span className="font-mono">{used} / {max === 9999 ? '∞' : max}</span>
                </div>
                <div className="h-1.5 bg-[#1E1E2E] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-400 rounded-full"
                    style={{ width: max === 9999 ? '10%' : `${Math.min(100, (used / max) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
        {!isPro && (
          <a
            href="https://staffarmy.app/pricing"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 block w-full text-center py-3 bg-amber-400 text-black font-bold rounded-xl hover:bg-amber-300 transition-all"
          >
            Upgrade Plan →
          </a>
        )}
      </div>

      {/* White-label branding (pro + white_label only) */}
      {isPro && (
        <div className="bg-[#12121A] border border-[#1E1E2E] rounded-xl p-6 mb-6">
          <div className="font-semibold mb-4">White-Label Branding</div>
          <div className="space-y-4">
            {[
              { key: 'app_name',   label: 'App Name',   placeholder: 'My Agency AI' },
              { key: 'logo_url',   label: 'Logo URL',   placeholder: 'https://...' },
              { key: 'favicon_url',label: 'Favicon URL',placeholder: 'https://...' },
              { key: 'custom_domain', label: 'Custom Domain', placeholder: 'ai.myagency.com' },
            ].map(({ key, label, placeholder }) => (
              <div key={key}>
                <label className="text-xs text-[#94A3B8] uppercase tracking-wider mb-1.5 block">{label}</label>
                <input
                  value={branding[key] || ''}
                  onChange={e => setBranding(p => ({ ...p, [key]: e.target.value }))}
                  placeholder={placeholder}
                  className="w-full bg-[#0A0A0F] border border-[#1E1E2E] rounded-lg px-4 py-2.5 text-sm text-[#F8FAFC] placeholder-[#94A3B8]/50 focus:outline-none focus:border-amber-400/50"
                />
              </div>
            ))}
            <div>
              <label className="text-xs text-[#94A3B8] uppercase tracking-wider mb-1.5 block">Primary Color</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={branding.primary_color || '#F59E0B'}
                  onChange={e => setBranding(p => ({ ...p, primary_color: e.target.value }))}
                  className="w-12 h-10 rounded cursor-pointer border border-[#1E1E2E] bg-transparent"
                />
                <input
                  value={branding.primary_color || '#F59E0B'}
                  onChange={e => setBranding(p => ({ ...p, primary_color: e.target.value }))}
                  className="flex-1 bg-[#0A0A0F] border border-[#1E1E2E] rounded-lg px-4 py-2.5 text-sm text-[#F8FAFC] font-mono focus:outline-none focus:border-amber-400/50"
                />
              </div>
            </div>
          </div>
          <button
            onClick={saveBranding}
            disabled={saving}
            className="mt-4 px-6 py-2.5 bg-amber-400 text-black font-bold rounded-xl hover:bg-amber-300 disabled:opacity-50 transition-all"
          >
            {saving ? 'Saving...' : 'Save Branding'}
          </button>
        </div>
      )}

      {/* Client workspaces (white_label only) */}
      {isWhiteLabel && (
        <div className="bg-[#12121A] border border-[#1E1E2E] rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="font-semibold">Client Workspaces</div>
            <button
              onClick={async () => {
                const name = prompt('Client workspace name:')
                if (!name) return
                const { data } = await api.post('/workspaces/client', { name })
                setClients(prev => [data.workspace, ...prev])
              }}
              className="px-4 py-2 bg-amber-400/10 text-amber-400 border border-amber-400/20 rounded-lg text-sm font-medium hover:bg-amber-400/20 transition-all"
            >
              + Add Client
            </button>
          </div>
          {clients.length === 0 ? (
            <div className="text-sm text-[#94A3B8]">No client workspaces yet</div>
          ) : clients.map(c => (
            <div key={c.id} className="flex items-center justify-between py-2 border-b border-[#1E1E2E]">
              <div className="text-sm font-medium">{c.name}</div>
              <span className="text-xs text-[#94A3B8]">{c.plan}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function applyBranding(branding) {
  if (branding.primary_color) {
    document.documentElement.style.setProperty('--color-primary', branding.primary_color)
  }
  if (branding.app_name) {
    document.title = branding.app_name
  }
}
