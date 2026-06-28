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
        // Apply white-label branding as soon as the workspace loads.
        if (data.workspace?.branding?.primary_color) {
          document.documentElement.style.setProperty('--color-primary', data.workspace.branding.primary_color)
        }
        if (data.workspace?.branding?.app_name) {
          document.title = data.workspace.branding.app_name
        }
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
