import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import Layout from './components/Layout'
import DraftRoom from './views/DraftRoom'
import Roster from './views/Roster'
import FilmRoom from './views/FilmRoom'
import Playbook from './views/Playbook'
import Command from './views/Command'
import Huddle from './views/Huddle'
import AgentPortal from './views/AgentPortal'
import WorkspaceSettings from './views/WorkspaceSettings'
import AuthPage from './views/AuthPage'

export default function App() {
  const { user, loading } = useAuth()

  if (loading) return (
    <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center">
      <div className="text-center">
        <div className="text-amber-400 text-2xl font-bold mb-2">AGENT OS</div>
        <div className="text-[#94A3B8] text-sm animate-pulse">Initializing...</div>
      </div>
    </div>
  )

  if (!user) return <AuthPage />

  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/draft-room" replace />} />
          <Route path="/draft-room" element={<DraftRoom />} />
          <Route path="/roster"     element={<Roster />} />
          <Route path="/film-room"  element={<FilmRoom />} />
          <Route path="/playbook"   element={<Playbook />} />
          <Route path="/command"    element={<Command />} />
          <Route path="/huddle"     element={<Huddle />} />
          <Route path="/agent-portal" element={<AgentPortal />} />
          <Route path="/settings"   element={<WorkspaceSettings />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}
