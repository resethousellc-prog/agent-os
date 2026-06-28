import { useState, useEffect } from 'react'
import { api } from '../lib/api'

export function useWorkflows(filters = {}) {
  const [workflows, setWorkflows] = useState([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)

  useEffect(() => {
    const params = new URLSearchParams(filters).toString()
    api.get(`/workflows${params ? '?' + params : ''}`)
      .then(({ data }) => {
        setWorkflows(data.workflows || [])
        setLoading(false)
      })
      .catch(err => {
        setError(err.message)
        setLoading(false)
      })
  }, [JSON.stringify(filters)])

  const createWorkflow = async (payload) => {
    const { data } = await api.post('/workflows', payload)
    setWorkflows(prev => [data.workflow, ...prev])
    return data.workflow
  }

  return { workflows, loading, error, createWorkflow }
}
