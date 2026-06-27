import { useState, useEffect } from 'react'
import { api } from '../lib/api'
import { POSTARMY_WORKSPACE_ID } from '@agent-os/shared/constants.js'

export function useWorkspace() {
  const [workspace, setWorkspace] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/workspaces/mine')
      .then(({ data }) => {
        setWorkspace(data.workspace)
        setLoading(false)
      })
      .catch(() => {
        // Fallback to PostArmy workspace during dev
        setWorkspace({ id: POSTARMY_WORKSPACE_ID, name: 'PostArmy Inc.' })
        setLoading(false)
      })
  }, [])

  return { workspace, loading }
}
