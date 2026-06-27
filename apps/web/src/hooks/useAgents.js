import { useState, useEffect } from 'react'
import { api } from '../lib/api'

export function useAgents() {
  const [agents, setAgents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    api.get('/agents')
      .then(({ data }) => {
        setAgents(data.agents || [])
        setLoading(false)
      })
      .catch(err => {
        setError(err.message)
        setLoading(false)
      })
  }, [])

  return { agents, loading, error }
}
