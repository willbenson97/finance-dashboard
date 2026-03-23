import { NavLink } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

const links = [
  { to: '/',                   label: 'Net Worth',           icon: '💰' },
  { to: '/portfolio',          label: 'Portfolio',           icon: '📈' },
  { to: '/budget',             label: 'Budget',              icon: '📊' },
  { to: '/wealth-progression', label: 'Wealth Progression',  icon: '🌱' },
  { to: '/retirement-planning',label: 'Retirement Planning', icon: '🎯' },
  { to: '/property-purchases', label: 'Property Purchases',  icon: '🏠' },
  { to: '/co-investments',     label: 'Co-Investments',      icon: '🤝' },
]

export default function Sidebar() {
  const { signOut } = useAuth()
  return (
    <aside className="w-56 min-h-screen bg-card border-r border-border flex flex-col">
      <div className="px-6 py-5 border-b border-border">
        <span className="text-accent font-bold text-lg tracking-tight">FinDash</span>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {links.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-accent/20 text-accent'
                  : 'text-muted hover:bg-white/5 hover:text-white'
              }`
            }
          >
            <span>{icon}</span>
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="px-4 py-4 border-t border-border">
        <button
          onClick={signOut}
          className="w-full text-left px-3 py-2 rounded-lg text-xs text-muted hover:text-white hover:bg-white/5 transition-colors"
        >
          Sign out
        </button>
      </div>
    </aside>
  )
}
