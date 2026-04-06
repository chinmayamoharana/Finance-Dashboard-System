import { NavLink, Outlet, useNavigate } from 'react-router-dom'

import { useAuth } from '../context/AuthContext'
import ThemeToggle from './ThemeToggle'

const navigation = [
  { label: 'Dashboard', to: '/dashboard', roles: ['viewer', 'analyst', 'admin'] },
  { label: 'Records', to: '/records', roles: ['analyst', 'admin'] },
  { label: 'Users', to: '/users', roles: ['admin'] },
]

export default function AppShell() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const links = navigation.filter((item) => item.roles.includes(user.role))

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <div className="relative min-h-screen overflow-hidden px-3 py-4 sm:px-5 lg:px-6 xl:px-8">
      <div className="ambient-orb left-[-80px] top-10 h-44 w-44 bg-orange-300/30 dark:bg-orange-500/20" />
      <div className="ambient-orb right-[-60px] top-32 h-52 w-52 bg-teal-300/25 dark:bg-teal-500/20" />

      <div className="mx-auto grid max-w-7xl gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="panel scrollbar-hidden relative overflow-hidden p-5 sm:p-6 xl:sticky xl:top-6 xl:max-h-[calc(100vh-3rem)] xl:overflow-y-auto">
          <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-r from-orange-400/20 via-white to-teal-500/20 dark:from-orange-500/15 dark:via-slate-950 dark:to-teal-500/20" />
          <div className="relative flex h-full flex-col gap-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between xl:flex-col xl:items-start">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.32em] text-orange-600 dark:text-orange-300">
                  Finance Dashboard
                </p>
                <h1 className="mt-3 text-2xl font-extrabold leading-tight text-slate-900 dark:text-white sm:text-3xl">
                  Smarter money operations with a cleaner workflow.
                </h1>
              </div>
            </div>

            <div className="floating-card rounded-[26px] bg-slate-900 p-5 text-white dark:bg-slate-950">
              <p className="text-sm text-slate-300">Signed in as</p>
              <p className="mt-2 text-lg font-semibold">{user.name}</p>
              <p className="break-all text-sm text-slate-300">{user.email}</p>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="inline-flex rounded-full border border-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-orange-300">
                  {user.role}
                </span>
                <span className="inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-slate-200">
                  Secure session
                </span>
              </div>
            </div>

            <nav className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
              {links.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex min-h-[52px] items-center justify-between rounded-2xl px-4 py-3 text-sm font-semibold ${
                      isActive
                        ? 'bg-slate-900 text-white dark:bg-teal-500 dark:text-slate-950'
                        : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800'
                    }`
                  }
                >
                  <span>{item.label}</span>
                  <span className="text-xs uppercase tracking-[0.2em]">
                    {item.label.slice(0, 2)}
                  </span>
                </NavLink>
              ))}
            </nav>

            <div className="mt-auto rounded-[24px] border border-slate-200/70 bg-white/70 p-3 dark:border-slate-800 dark:bg-slate-950/60">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-1">
                <ThemeToggle className="w-full justify-center" />
                <button
                  className="action-button-secondary min-h-[48px] w-full justify-center whitespace-nowrap border-slate-300 bg-slate-50 text-slate-900 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800"
                  onClick={handleLogout}
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </aside>

        <main className="fade-in-up min-w-0 space-y-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
