import { useState, useEffect } from 'react'
import { api } from '../lib/api'

export function useMonitor(workflowId = null) {
  const [metrics, setMetrics] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const url = workflowId ? `/monitor/${workflowId}` : '/monitor'
    api.get(url)
      .then(({ data }) => {
        setMetrics(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [workflowId])

  return { metrics, loading }
}
