import { startTransition, useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'

import ThemeToggle from '../components/ThemeToggle'
import { useAuth } from '../context/AuthContext'

const demoUsers = [
  {
    role: 'Admin',
    username: 'admin',
    password: 'Password123!',
    description: 'Full access to records, users, and audit-driven governance.',
  },
  {
    role: 'Analyst',
    username: 'analyst',
    password: 'Password123!',
    description: 'Read records, review summaries, and work with insight-heavy views.',
  },
  {
    role: 'Viewer',
    username: 'viewer',
    password: 'Password123!',
    description: 'Track high-level metrics in a read-only dashboard experience.',
  },
]

const emptyRegisterForm = {
  name: '',
  username: '',
  email: '',
  role: 'viewer',
  password: '',
}

function normalizeErrors(data) {
  if (!data || typeof data !== 'object') {
    return {}
  }

  return Object.fromEntries(
    Object.entries(data).map(([key, value]) => [
      key,
      Array.isArray(value) ? value.join(' ') : String(value),
    ]),
  )
}

function PasswordField({ label, value, onChange, error, placeholder }) {
  const [isVisible, setIsVisible] = useState(false)

  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">{label}</span>
      <div className="relative">
        <input
          type={isVisible ? 'text' : 'password'}
          value={value}
          placeholder={placeholder}
          onChange={onChange}
          className="pr-24"
        />
        <button
          type="button"
          onClick={() => setIsVisible((current) => !current)}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full px-3 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
        >
          {isVisible ? 'Hide' : 'Show'}
        </button>
      </div>
      {error ? <span className="mt-2 block text-sm text-red-600 dark:text-red-400">{error}</span> : null}
    </label>
  )
}

export default function LoginPage() {
  const { isAuthenticated, login, register } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const isRegisterMode = location.pathname === '/register'

  const [loginForm, setLoginForm] = useState({
    username: '',
    password: '',
  })
  const [registerForm, setRegisterForm] = useState(emptyRegisterForm)
  const [successMessage, setSuccessMessage] = useState(location.state?.registeredMessage || '')
  const [generalError, setGeneralError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    setSuccessMessage(location.state?.registeredMessage || '')
    setGeneralError('')
    setFieldErrors({})
  }, [location.pathname, location.state])

  const pageCopy = useMemo(
    () =>
      isRegisterMode
        ? {
            eyebrow: 'Create Account',
            title: 'Start with the role that fits your workflow.',
            subtitle:
              'Create a new account, choose an access level, and continue to login once registration succeeds.',
            primaryCta: 'Create account',
          }
        : {
            eyebrow: 'Welcome Back',
            title: 'Step into a sharper finance dashboard.',
            subtitle:
              'Use a seeded account or your registered credentials to enter the workspace.',
            primaryCta: 'Sign in',
          },
    [isRegisterMode],
  )

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  async function handleLoginSubmit(event) {
    event.preventDefault()
    setGeneralError('')
    setFieldErrors({})
    setSuccessMessage('')
    setIsSubmitting(true)

    try {
      await login(loginForm)
      const targetPath = location.state?.from?.pathname || '/dashboard'
      startTransition(() => {
        navigate(targetPath, { replace: true })
      })
    } catch (requestError) {
      const normalizedErrors = normalizeErrors(requestError.response?.data)
      setFieldErrors(normalizedErrors)
      setGeneralError(normalizedErrors.detail || 'Unable to sign in with these credentials.')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleRegisterSubmit(event) {
    event.preventDefault()
    setGeneralError('')
    setFieldErrors({})
    setSuccessMessage('')
    setIsSubmitting(true)

    try {
      await register(registerForm)
      setRegisterForm(emptyRegisterForm)
      startTransition(() => {
        navigate('/login', {
          replace: true,
          state: {
            registeredMessage: 'Registration successful. Please log in with your new account.',
          },
        })
      })
    } catch (requestError) {
      const normalizedErrors = normalizeErrors(requestError.response?.data)
      setFieldErrors(normalizedErrors)
      setGeneralError(normalizedErrors.detail || 'Unable to complete registration right now.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden px-4 py-5 sm:px-6 lg:px-8">
      <div className="ambient-orb left-[-70px] top-14 h-48 w-48 bg-orange-300/35 dark:bg-orange-500/20" />
      <div className="ambient-orb right-[-70px] top-24 h-56 w-56 bg-teal-300/30 dark:bg-teal-500/20" />
      <div className="ambient-orb bottom-[-40px] left-[12%] h-44 w-44 bg-cyan-200/30 dark:bg-cyan-500/10" />

      <div className="mx-auto flex max-w-7xl justify-end pb-4">
        <ThemeToggle />
      </div>

      <div className="mx-auto grid max-w-7xl items-stretch gap-6 lg:grid-cols-[1.08fr_0.92fr]">
        <section className="panel fade-in-up relative overflow-hidden p-6 sm:p-8 lg:p-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(249,115,22,0.13),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(20,184,166,0.12),transparent_24%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(249,115,22,0.12),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(20,184,166,0.16),transparent_24%)]" />
          <div className="relative">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.36em] text-orange-600 dark:text-orange-300">
                Finance Dashboard System
              </p>
              <h1 className="mt-4 text-4xl font-extrabold leading-tight text-slate-900 dark:text-white sm:text-5xl">
                Finance operations, redesigned for clarity and control.
              </h1>
              <p className="mt-5 max-w-xl text-base leading-7 text-slate-600 dark:text-slate-300 sm:text-lg">
                Review financial performance, manage records securely, and move through the system with
                role-aware access that stays elegant across every screen size.
              </p>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {demoUsers.map((user, index) => (
                <button
                  key={user.role}
                  type="button"
                  className="floating-card rounded-[28px] border border-white/60 bg-white/80 p-5 text-left shadow-panel backdrop-blur hover:-translate-y-1 hover:border-orange-300 dark:border-slate-800 dark:bg-slate-900/85"
                  style={{ animationDelay: `${index * 120}ms` }}
                  onClick={() => {
                    setLoginForm({
                      username: user.username,
                      password: user.password,
                    })
                    navigate('/login')
                  }}
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700 dark:text-teal-300">
                    {user.role}
                  </p>
                  <p className="mt-3 text-lg font-bold text-slate-900 dark:text-white">{user.username}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{user.description}</p>
                </button>
              ))}
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <div className="rounded-[24px] border border-slate-200/70 bg-white/70 p-4 dark:border-slate-800 dark:bg-slate-900/70">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">
                  Security
                </p>
                <p className="mt-3 text-sm font-medium text-slate-700 dark:text-slate-200">
                  JWT sessions, refresh rotation, throttling, and audit-friendly operations.
                </p>
              </div>
              <div className="rounded-[24px] border border-slate-200/70 bg-white/70 p-4 dark:border-slate-800 dark:bg-slate-900/70">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">
                  Analytics
                </p>
                <p className="mt-3 text-sm font-medium text-slate-700 dark:text-slate-200">
                  Income, expense, trend, and category views designed for quick decision-making.
                </p>
              </div>
              <div className="rounded-[24px] border border-slate-200/70 bg-white/70 p-4 dark:border-slate-800 dark:bg-slate-900/70">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">
                  Access
                </p>
                <p className="mt-3 text-sm font-medium text-slate-700 dark:text-slate-200">
                  Viewer, Analyst, and Admin journeys stay server-enforced and easy to understand.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="panel fade-in-up relative p-5 sm:p-8 lg:p-10">
          <div className="flex flex-col gap-2 rounded-[24px] bg-slate-100/90 p-1 sm:flex-row dark:bg-slate-950/70">
            <Link
              className={`flex-1 rounded-[18px] px-4 py-3 text-center text-sm font-semibold ${
                !isRegisterMode
                  ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
              to="/login"
            >
              Sign In
            </Link>
            <Link
              className={`flex-1 rounded-[18px] px-4 py-3 text-center text-sm font-semibold ${
                isRegisterMode
                  ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
              to="/register"
            >
              Register
            </Link>
          </div>

          <div className="mt-7">
            <p className="text-xs font-semibold uppercase tracking-[0.34em] text-teal-700 dark:text-teal-300">
              {pageCopy.eyebrow}
            </p>
            <h2 className="mt-3 text-3xl font-bold leading-tight text-slate-900 dark:text-white sm:text-4xl">
              {pageCopy.title}
            </h2>
            <p className="mt-4 max-w-lg text-sm leading-6 text-slate-600 dark:text-slate-300">
              {pageCopy.subtitle}
            </p>
          </div>

          {successMessage ? (
            <div className="mt-6 rounded-2xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-700 dark:border-teal-900 dark:bg-teal-950/50 dark:text-teal-200">
              {successMessage}
            </div>
          ) : null}

          {generalError ? (
            <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
              {generalError}
            </div>
          ) : null}

          {!isRegisterMode ? (
            <form className="mt-8 space-y-5" onSubmit={handleLoginSubmit}>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">Username</span>
                <input
                  value={loginForm.username}
                  onChange={(event) =>
                    setLoginForm((current) => ({ ...current, username: event.target.value }))
                  }
                />
                {fieldErrors.username ? (
                  <span className="mt-2 block text-sm text-red-600 dark:text-red-400">{fieldErrors.username}</span>
                ) : null}
              </label>

              <PasswordField
                label="Password"
                value={loginForm.password}
                onChange={(event) =>
                  setLoginForm((current) => ({ ...current, password: event.target.value }))
                }
                error={fieldErrors.password}
              />

              <button
                type="submit"
                disabled={isSubmitting}
                className="action-button-primary w-full py-3.5 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting ? 'Signing in...' : pageCopy.primaryCta}
              </button>
            </form>
          ) : (
            <form className="mt-8 grid gap-5 sm:grid-cols-2" onSubmit={handleRegisterSubmit}>
              <label className="block sm:col-span-2">
                <span className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">Full name</span>
                <input
                  value={registerForm.name}
                  onChange={(event) =>
                    setRegisterForm((current) => ({ ...current, name: event.target.value }))
                  }
                  required
                />
                {fieldErrors.name ? (
                  <span className="mt-2 block text-sm text-red-600 dark:text-red-400">{fieldErrors.name}</span>
                ) : null}
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">Username</span>
                <input
                  value={registerForm.username}
                  onChange={(event) =>
                    setRegisterForm((current) => ({ ...current, username: event.target.value }))
                  }
                  required
                />
                {fieldErrors.username ? (
                  <span className="mt-2 block text-sm text-red-600 dark:text-red-400">{fieldErrors.username}</span>
                ) : null}
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">Role</span>
                <select
                  value={registerForm.role}
                  onChange={(event) =>
                    setRegisterForm((current) => ({ ...current, role: event.target.value }))
                  }
                >
                  <option value="viewer">Viewer</option>
                  <option value="analyst">Analyst</option>
                  <option value="admin">Admin</option>
                </select>
                {fieldErrors.role ? (
                  <span className="mt-2 block text-sm text-red-600 dark:text-red-400">{fieldErrors.role}</span>
                ) : null}
              </label>

              <label className="block sm:col-span-2">
                <span className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">Email</span>
                <input
                  type="email"
                  value={registerForm.email}
                  onChange={(event) =>
                    setRegisterForm((current) => ({ ...current, email: event.target.value }))
                  }
                  required
                />
                {fieldErrors.email ? (
                  <span className="mt-2 block text-sm text-red-600 dark:text-red-400">{fieldErrors.email}</span>
                ) : null}
              </label>

              <div className="sm:col-span-2">
                <PasswordField
                  label="Password"
                  value={registerForm.password}
                  onChange={(event) =>
                    setRegisterForm((current) => ({ ...current, password: event.target.value }))
                  }
                  error={fieldErrors.password}
                  placeholder="Use a strong password"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="action-button-primary w-full py-3.5 sm:col-span-2 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting ? 'Creating account...' : pageCopy.primaryCta}
              </button>
            </form>
          )}
        </section>
      </div>
    </div>
  )
}
