import { useState } from 'react'
import { api } from '../lib/api'

const DEFAULT_ATTRIBUTES = {
  reasoning_depth:    50,
  execution_speed:    50,
  reliability:        50,
  creativity:         50,
  autonomy:           50,
  communication:      50,
  collaboration_score:50,
  delegation_quality: 50,
}

const DEFAULT_FORM = {
  tier:           'T1-EXEC',
  name:           '',
  display_name:   '',
  department:     '',
  model_provider: 'claude',
  model_name:     'claude-sonnet-4-6',
  capabilities:   [],
  platform_access:[],
  supervisor_agent_id: null,
}

export function useAgentBuilder() {
  const [step, setStep]         = useState(1) // 1-5
  const [form, setForm]         = useState(DEFAULT_FORM)
  const [attrs, setAttrs]       = useState(DEFAULT_ATTRIBUTES)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState(null)
  const [deployed, setDeployed] = useState(null)

  const updateForm = (key, value) => setForm(prev => ({ ...prev, [key]: value }))
  const updateAttr = (key, value) => setAttrs(prev => ({ ...prev, [key]: value }))

  const nextStep = () => setStep(s => Math.min(s + 1, 5))
  const prevStep = () => setStep(s => Math.max(s - 1, 1))

  const canProceed = () => {
    if (step === 1) return !!form.tier
    if (step === 2) return !!form.name.trim() && !!form.department
    return true
  }

  const deploy = async () => {
    setLoading(true)
    setError(null)
    try {
      // 1. Create agent
      const { data: agentData } = await api.post('/agents', {
        ...form,
        status: 'active',
      })
      const agentId = agentData.agent.id

      // 2. Seed attributes
      await api.post(`/agents/${agentId}/attributes`, attrs)

      // 3. Log creation event
      await api.post(`/agents/${agentId}/development`, {
        event_type: 'attribute_update',
        event_detail: { action: 'initial_deploy', attributes: attrs },
        triggered_by: 'human',
      })

      setDeployed(agentData.agent)
    } catch (err) {
      setError(err.response?.data?.error || err.message)
    } finally {
      setLoading(false)
    }
  }

  const reset = () => {
    setStep(1)
    setForm(DEFAULT_FORM)
    setAttrs(DEFAULT_ATTRIBUTES)
    setDeployed(null)
    setError(null)
  }

  return {
    step, form, attrs, loading, error, deployed,
    updateForm, updateAttr,
    nextStep, prevStep, canProceed,
    deploy, reset,
  }
}
