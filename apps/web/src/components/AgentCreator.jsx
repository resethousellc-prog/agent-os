import { useState } from 'react'
import { useAgentBuilder } from '../hooks/useAgentBuilder'
import TierBadge from './TierBadge'
import AttributeBar from './AttributeBar'
import AttributeRadar from './AttributeRadar'
import SkillGrid from './SkillGrid'
import { DEPARTMENTS } from '@agent-os/shared/constants.js'
import { Zap, ChevronRight, ChevronLeft, Check } from 'lucide-react'

const STEPS = ['Tier', 'Info', 'Attributes', 'Skills', 'Deploy']

export default function AgentCreator({ onDeployed, onCancel }) {
  const {
    step, form, attrs, loading, error, deployed,
    updateForm, updateAttr, nextStep, prevStep, canProceed, deploy, reset,
  } = useAgentBuilder()

  if (deployed) {
    return (
      <div className="p-8 max-w-lg mx-auto text-center animate-agent-deploy">
        <div className="text-6xl mb-4">⚡</div>
        <h2 className="text-2xl font-bold text-amber-400 mb-2">Agent Deployed</h2>
        <p className="text-[#94A3B8] mb-6">
          <span className="text-white font-semibold">{deployed.display_name || deployed.name}</span> is now on the roster
        </p>
        <div className="flex gap-3 justify-center">
          <button onClick={reset} className="px-6 py-3 bg-amber-400/10 text-amber-400 border border-amber-400/20 rounded-xl font-semibold hover:bg-amber-400/20 transition-all">
            Draft Another
          </button>
          <button onClick={() => onDeployed(deployed)} className="px-6 py-3 bg-amber-400 text-black rounded-xl font-bold hover:bg-amber-300 transition-all">
            View Roster
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto p-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <button onClick={onCancel} className="text-[#94A3B8] hover:text-white transition-colors">←</button>
        <h1 className="text-2xl font-bold">Draft New Agent</h1>
      </div>

      {/* Step progress */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
              i + 1 < step  ? 'bg-amber-400 text-black' :
              i + 1 === step ? 'bg-amber-400/20 text-amber-400 border border-amber-400' :
                              'bg-[#1E1E2E] text-[#94A3B8]'
            }`}>
              {i + 1 < step ? <Check size={12} /> : i + 1}
            </div>
            <span className={`text-xs ${i + 1 === step ? 'text-amber-400' : 'text-[#94A3B8]'}`}>{label}</span>
            {i < STEPS.length - 1 && <div className="w-4 h-px bg-[#1E1E2E]" />}
          </div>
        ))}
      </div>

      {/* Step 1: Tier selection */}
      {step === 1 && (
        <div>
          <div className="text-sm text-[#94A3B8] mb-4 uppercase tracking-wider">Select Tier</div>
          <div className="flex gap-4">
            {['T1-EXEC', 'T2-HIGH', 'T3-FULL'].map(t => (
              <div key={t} onClick={() => updateForm('tier', t)} className="flex-1">
                <TierBadge tier={t} size="lg" active={form.tier === t} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: Basic info */}
      {step === 2 && (
        <div className="space-y-4">
          <div>
            <label className="text-xs text-[#94A3B8] uppercase tracking-wider mb-1.5 block">Agent Name *</label>
            <input
              value={form.name}
              onChange={e => updateForm('name', e.target.value)}
              placeholder="e.g. content-ops-alpha"
              className="w-full bg-[#0A0A0F] border border-[#1E1E2E] rounded-lg px-4 py-3 text-[#F8FAFC] placeholder-[#94A3B8]/50 focus:outline-none focus:border-amber-400/50 transition-colors"
            />
          </div>
          <div>
            <label className="text-xs text-[#94A3B8] uppercase tracking-wider mb-1.5 block">Display Name</label>
            <input
              value={form.display_name}
              onChange={e => updateForm('display_name', e.target.value)}
              placeholder="e.g. Content Ops Alpha"
              className="w-full bg-[#0A0A0F] border border-[#1E1E2E] rounded-lg px-4 py-3 text-[#F8FAFC] placeholder-[#94A3B8]/50 focus:outline-none focus:border-amber-400/50 transition-colors"
            />
          </div>
          <div>
            <label className="text-xs text-[#94A3B8] uppercase tracking-wider mb-1.5 block">Department *</label>
            <select
              value={form.department}
              onChange={e => updateForm('department', e.target.value)}
              className="w-full bg-[#0A0A0F] border border-[#1E1E2E] rounded-lg px-4 py-3 text-[#F8FAFC] focus:outline-none focus:border-amber-400/50 transition-colors"
            >
              <option value="">Select department...</option>
              {DEPARTMENTS.map(d => (
                <option key={d} value={d}>{d.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-[#94A3B8] uppercase tracking-wider mb-1.5 block">Model Provider</label>
            <div className="flex gap-3">
              {['claude', 'qwen-executor'].map(p => (
                <button
                  key={p}
                  onClick={() => updateForm('model_provider', p)}
                  className={`flex-1 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                    form.model_provider === p
                      ? 'border-amber-400/40 bg-amber-400/10 text-amber-400'
                      : 'border-[#1E1E2E] text-[#94A3B8] hover:border-white/20'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Attribute sliders */}
      {step === 3 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-5">
            {Object.entries(attrs).map(([key, val]) => (
              <AttributeBar key={key} name={key} value={val} onChange={updateAttr} />
            ))}
          </div>
          <div>
            <div className="text-xs text-[#94A3B8] uppercase tracking-wider mb-3">Preview</div>
            <AttributeRadar attributes={attrs} size={280} />
          </div>
        </div>
      )}

      {/* Step 4: Skill assignment */}
      {step === 4 && (
        <div>
          <div className="text-sm text-[#94A3B8] mb-1">Assign tools to this agent's toolbelt</div>
          <div className="text-xs text-[#94A3B8]/60 mb-4">Locked tools require a higher tier</div>
          <SkillGrid
            agentTier={form.tier}
            assigned={form.capabilities}
            onChange={caps => updateForm('capabilities', caps)}
          />
        </div>
      )}

      {/* Step 5: Platform access + deploy */}
      {step === 5 && (
        <div className="space-y-6">
          <div>
            <div className="text-sm text-[#94A3B8] mb-3 uppercase tracking-wider">Platform Access</div>
            <div className="flex gap-3">
              {['ghl', 'geelark'].map(p => (
                <button
                  key={p}
                  onClick={() => {
                    const next = form.platform_access.includes(p)
                      ? form.platform_access.filter(x => x !== p)
                      : [...form.platform_access, p]
                    updateForm('platform_access', next)
                  }}
                  className={`px-4 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                    form.platform_access.includes(p)
                      ? 'border-amber-400/40 bg-amber-400/10 text-amber-400'
                      : 'border-[#1E1E2E] text-[#94A3B8] hover:border-white/20'
                  }`}
                >
                  {p.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Summary */}
          <div className="bg-[#12121A] border border-[#1E1E2E] rounded-xl p-5 space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-[#94A3B8]">Tier</span><TierBadge tier={form.tier} /></div>
            <div className="flex justify-between"><span className="text-[#94A3B8]">Name</span><span>{form.display_name || form.name}</span></div>
            <div className="flex justify-between"><span className="text-[#94A3B8]">Department</span><span>{form.department}</span></div>
            <div className="flex justify-between"><span className="text-[#94A3B8]">Skills</span><span>{form.capabilities.length} assigned</span></div>
            <div className="flex justify-between"><span className="text-[#94A3B8]">Platforms</span><span>{form.platform_access.join(', ') || 'none'}</span></div>
          </div>

          {error && (
            <div className="bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-3 text-red-400 text-sm">{error}</div>
          )}
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between mt-8">
        <button
          onClick={step === 1 ? onCancel : prevStep}
          className="flex items-center gap-2 px-5 py-2.5 text-[#94A3B8] hover:text-white transition-colors"
        >
          <ChevronLeft size={16} />
          {step === 1 ? 'Cancel' : 'Back'}
        </button>

        {step < 5 ? (
          <button
            onClick={nextStep}
            disabled={!canProceed()}
            className="flex items-center gap-2 px-6 py-2.5 bg-amber-400 text-black font-bold rounded-xl hover:bg-amber-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            Next
            <ChevronRight size={16} />
          </button>
        ) : (
          <button
            onClick={deploy}
            disabled={loading || !form.name.trim()}
            className="flex items-center gap-2 px-8 py-2.5 bg-amber-400 text-black font-bold rounded-xl hover:bg-amber-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <Zap size={18} />
            {loading ? 'Deploying...' : 'Deploy Agent'}
          </button>
        )}
      </div>
    </div>
  )
}
