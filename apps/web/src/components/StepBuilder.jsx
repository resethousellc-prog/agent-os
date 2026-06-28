import { useState } from 'react'
import { GripVertical, Trash2, Plus } from 'lucide-react'

export default function StepBuilder({ steps = [], onChange }) {
  const [localSteps, setLocalSteps] = useState(steps)

  const update = (next) => {
    setLocalSteps(next)
    onChange?.(next)
  }

  const addStep = () => update([...localSteps, { action: '', description: '', error_handling: 'escalate' }])
  const removeStep = (i) => update(localSteps.filter((_, idx) => idx !== i))
  const updateStep = (i, key, val) => update(localSteps.map((s, idx) => idx === i ? { ...s, [key]: val } : s))

  return (
    <div>
      <div className="space-y-3 mb-4">
        {localSteps.map((step, i) => (
          <div key={i} className="flex items-start gap-3 bg-[#12121A] border border-[#1E1E2E] rounded-xl p-4">
            <div className="text-[#94A3B8] cursor-grab mt-1"><GripVertical size={16} /></div>
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#94A3B8] font-mono w-6">{i + 1}.</span>
                <input
                  value={step.action || ''}
                  onChange={e => updateStep(i, 'action', e.target.value)}
                  placeholder="Action (e.g. ghl:create_contact)"
                  className="flex-1 bg-[#0A0A0F] border border-[#1E1E2E] rounded px-3 py-1.5 text-sm text-[#F8FAFC] placeholder-[#94A3B8]/50 focus:outline-none focus:border-amber-400/50"
                />
              </div>
              <input
                value={step.description || ''}
                onChange={e => updateStep(i, 'description', e.target.value)}
                placeholder="Description..."
                className="w-full bg-[#0A0A0F] border border-[#1E1E2E] rounded px-3 py-1.5 text-sm text-[#F8FAFC] placeholder-[#94A3B8]/50 focus:outline-none focus:border-amber-400/50"
              />
              <select
                value={step.error_handling || 'escalate'}
                onChange={e => updateStep(i, 'error_handling', e.target.value)}
                className="bg-[#0A0A0F] border border-[#1E1E2E] rounded px-3 py-1.5 text-xs text-[#F8FAFC] focus:outline-none"
              >
                <option value="escalate">On error: escalate</option>
                <option value="retry">On error: retry</option>
                <option value="skip">On error: skip</option>
                <option value="abort">On error: abort</option>
              </select>
            </div>
            <button onClick={() => removeStep(i)} className="text-[#94A3B8] hover:text-red-400 transition-colors mt-1">
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
      <button
        onClick={addStep}
        className="flex items-center gap-2 text-sm text-[#94A3B8] hover:text-amber-400 transition-colors"
      >
        <Plus size={14} />
        Add step
      </button>
    </div>
  )
}
