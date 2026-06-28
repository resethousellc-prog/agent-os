import { NavLink } from 'react-router-dom'
import { Users, BarChart3, BookOpen, Building2, MessageSquare, Zap, LogOut, Bot, Settings } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useWorkspace } from '../hooks/useWorkspace'
import EscalationTray from './EscalationTray'

const NAV_ITEMS = [
  { path: '/draft-room', icon: Zap,           label: 'Draft Room',  sub: 'Build agents' },
  { path: '/roster',     icon: Users,          label: 'Roster',      sub: 'Full depth chart' },
  { path: '/film-room',  icon: BarChart3,      label: 'Film Room',   sub: 'Performance & dev' },
  { path: '/playbook',   icon: BookOpen,       label: 'Playbook',    sub: 'Workflows' },
  { path: '/command',    icon: Building2,      label: 'Command',     sub: 'Departments' },
  { path: '/huddle',     icon: MessageSquare,  label: 'The Huddle',  sub: 'Live interactions' },
  { path: '/agent-portal', icon: Bot,          label: 'Agent Portal', sub: 'Activity & tools' },
  { path: '/settings',   icon: Settings,       label: 'Settings',     sub: 'Workspace & branding' },
]

export default function Layout({ children }) {
  const { signOut } = useAuth()
  const { workspace } = useWorkspace()

  return (
    <div className="flex min-h-screen bg-[#0A0A0F] text-[#F8FAFC]">
      {/* Sidebar */}
      <aside className="w-64 bg-[#12121A] border-r border-[#1E1E2E] flex flex-col flex-shrink-0">
        {/* Logo + workspace */}
        <div className="p-6 border-b border-[#1E1E2E]">
          <div className="text-xl font-bold text-amber-400 tracking-wide">AGENT OS</div>
          {workspace && (
            <div className="text-xs text-[#94A3B8] mt-1 truncate">{workspace.name}</div>
          )}
        </div>

        {/* Nav items */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                  isActive
                    ? 'bg-amber-400/10 text-amber-400 border border-amber-400/20'
                    : 'text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-white/5'
                }`
              }
            >
              <item.icon size={18} />
              <div>
                <div className="text-sm font-medium">{item.label}</div>
                <div className="text-xs opacity-60">{item.sub}</div>
              </div>
            </NavLink>
          ))}
        </nav>

        {/* Tier legend */}
        <div className="p-4 border-t border-[#1E1E2E]">
          <div className="text-xs text-[#94A3B8] mb-2 uppercase tracking-wider">Tier System</div>
          <div className="space-y-1.5">
            {[
              { tier: 'T3-FULL', color: 'bg-amber-400', text: 'text-amber-400', label: 'Franchise' },
              { tier: 'T2-HIGH', color: 'bg-blue-400',  text: 'text-blue-400',  label: 'Veteran' },
              { tier: 'T1-EXEC', color: 'bg-green-400', text: 'text-green-400', label: 'Rookie' },
            ].map(({ tier, color, text, label }) => (
              <div key={tier} className="flex items-center gap-2 text-xs">
                <span className={`w-2 h-2 rounded-full ${color}`}></span>
                <span className={`${text} font-bold`}>{tier}</span>
                <span className="text-[#94A3B8]">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Sign out */}
        <button
          onClick={signOut}
          className="m-4 flex items-center gap-2 text-sm text-[#94A3B8] hover:text-red-400 transition-colors"
        >
          <LogOut size={16} />
          Sign out
        </button>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto pb-10">{children}</main>

      {/* Persistent escalation tray */}
      <EscalationTray />
    </div>
  )
}
