import { useState } from 'react'
import TierBadge from './TierBadge'
import { api } from '../lib/api'
import { Check, X, Edit } from 'lucide-react'

export default function DraftPickCard({ build, onAction }) {
  const [notes, setNotes]   = useState('')
  const [loading, setLoading] = useState(false)
  const spec = build.draft_spec || {}

  async function handleAction(action) {
    setLoading(true)
    try {
      await api.post(`/agents/builds/${build.id}/${action}`, { review_notes: notes })
      onAction(build.id, action)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-[#12121A] border border-amber-400/20 rounded-xl p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="text-xs text-amber-400 uppercase tracking-wider mb-1">📬 Draft Pick</div>
          <div className="font-semibold text-lg">{spec.display_name || spec.name || 'Unnamed Agent'}</div>
          <div className="text-sm text-[#94A3B8] mt-0.5">{spec.department}</div>
        </div>
        <TierBadge tier={spec.tier || 'T1-EXEC'} />
      </div>

      {build.justification && (
        <div className="bg-[#0A0A0F] rounded-lg p-4 mb-4 text-sm text-[#94A3B8] italic">
          "{build.justification}"
        </div>
      )}

      <div className="mb-4">
        <div className="text-xs text-[#94A3B8] mb-1.5 uppercase tracking-wider">Review Notes</div>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Optional notes..."
          rows={2}
          className="w-full bg-[#0A0A0F] border border-[#1E1E2E] rounded-lg px-3 py-2 text-sm text-[#F8FAFC] placeholder-[#94A3B8]/50 focus:outline-none focus:border-amber-400/50 resize-none"
        />
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => handleAction('approve')}
          disabled={loading}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-green-400/10 text-green-400 border border-green-400/30 rounded-lg font-semibold hover:bg-green-400/20 transition-all disabled:opacity-50"
        >
          <Check size={16} /> Approve
        </button>
        <button
          onClick={() => handleAction('reject')}
          disabled={loading}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-red-400/10 text-red-400 border border-red-400/30 rounded-lg font-semibold hover:bg-red-400/20 transition-all disabled:opacity-50"
        >
          <X size={16} /> Reject
        </button>
      </div>
    </div>
  )
}
