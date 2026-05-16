import { useLocation } from 'react-router-dom'
import { Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { businessNavSections, adminNavSections, type NavItem } from '@/components/layout/navigation'
import { useAppContext } from '@/context/useAppContext'
import { NavLink } from 'react-router-dom'

function NavItemLink({ item, onClick }: { item: NavItem; onClick?: () => void }) {
  return (
    <NavLink
      to={item.href}
      onClick={onClick}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
          isActive && 'bg-emerald-50 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-200',
        )
      }
    >
      <item.icon className="h-4 w-4 shrink-0" />
      <span>{item.label}</span>
    </NavLink>
  )
}

function NavSection({ section, onClick }: { section: { title: string; items: NavItem[] }; onClick?: () => void }) {
  return (
    <div>
      <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
        {section.title}
      </p>
      <div className="space-y-0.5">
        {section.items.map((item) => (
          <NavItemLink key={item.href} item={item} onClick={onClick} />
        ))}
      </div>
    </div>
  )
}

export function Sidebar() {
  const { hasModule } = useAppContext()
  const location = useLocation()
  const isAdmin = location.pathname.startsWith('/admin')
  const sections = isAdmin ? adminNavSections : businessNavSections

  const filteredSections = sections
    .map((s) => ({
      ...s,
      items: s.items.filter((item) => !item.module || hasModule(item.module)),
    }))
    .filter((s) => s.items.length > 0)

  return (
    <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white lg:flex lg:flex-col dark:border-slate-800 dark:bg-slate-950">
      <div className="flex h-16 shrink-0 items-center gap-3 border-b border-slate-200 px-5 dark:border-slate-800">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-700 text-white">
          <Sparkles className="h-4 w-4" />
        </div>
        <div className="leading-tight">
          <p className="text-sm font-bold text-slate-900 dark:text-white">Luxantara</p>
          <p className="text-[11px] text-slate-500">Business suite</p>
        </div>
      </div>
      <nav className="flex-1 space-y-5 overflow-y-auto p-4">
        {filteredSections.map((section) => (
          <NavSection key={section.title} section={section} />
        ))}
      </nav>
    </aside>
  )
}
