import { useEffect, useState } from 'react'

import apiClient from '../api/client'
import ReportActions from '../components/ReportActions'
import useDebouncedValue from '../hooks/useDebouncedValue'
import { fetchAllUsers, shareTextToWhatsApp } from '../utils/reportExports'
import { dateFormatter, titleize } from '../utils/formatters'

const emptyForm = {
  username: '',
  email: '',
  name: '',
  role: 'viewer',
  is_active: true,
  password: '',
}

export default function UsersPage() {
  const [filters, setFilters] = useState({
    search: '',
    role: '',
    status: '',
  })
  const debouncedSearch = useDebouncedValue(filters.search, 350)
  const [users, setUsers] = useState([])
  const [formState, setFormState] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [error, setError] = useState('')

  function getUserParams() {
    return Object.fromEntries(
      Object.entries({
        search: debouncedSearch,
        role: filters.role,
        status: filters.status,
      }).filter(([, value]) => value !== ''),
    )
  }

  useEffect(() => {
    const controller = new AbortController()

    async function loadUsers() {
      setIsLoading(true)
      setError('')

      try {
        const response = await apiClient.get('/users/', {
          params: getUserParams(),
          signal: controller.signal,
        })
        setUsers(response.data)
      } catch (requestError) {
        if (requestError.name === 'CanceledError' || requestError.code === 'ERR_CANCELED') {
          return
        }
        setError(requestError.response?.data?.detail || 'Unable to load users.')
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false)
        }
      }
    }

    loadUsers()

    return () => {
      controller.abort()
    }
  }, [debouncedSearch, filters.role, filters.status])

  function resetForm() {
    setEditingId(null)
    setFormState(emptyForm)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setIsSaving(true)

    const payload = {
      ...formState,
      ...(formState.password ? {} : { password: undefined }),
    }

    try {
      if (editingId) {
        await apiClient.patch(`/users/${editingId}/`, payload)
      } else {
        await apiClient.post('/users/', payload)
      }
      resetForm()
      const response = await apiClient.get('/users/', {
        params: getUserParams(),
      })
      setUsers(response.data)
    } catch (requestError) {
      const detail =
        requestError.response?.data?.detail ||
        Object.values(requestError.response?.data || {}).flat().join(' ') ||
        'Unable to save the user.'
      setError(detail)
    } finally {
      setIsSaving(false)
    }
  }

  function getShareParams() {
    return getUserParams()
  }

  async function handleWhatsAppShare() {
    setError('')
    setIsExporting(true)

    try {
      const allUsers = await fetchAllUsers(getShareParams())
      const activeFilters = [
        debouncedSearch ? `Search: ${debouncedSearch}` : null,
        filters.role ? `Role: ${titleize(filters.role)}` : null,
        filters.status ? `Status: ${titleize(filters.status)}` : null,
      ].filter(Boolean)

      const usersText = allUsers.length
        ? allUsers
            .map(
              (user, index) =>
                [
                  `${index + 1}. ${user.name}`,
                  `Username: ${user.username}`,
                  `Email: ${user.email}`,
                  `Role: ${titleize(user.role)}`,
                  `Status: ${user.is_active ? 'Active' : 'Inactive'}`,
                  `Joined: ${dateFormatter(user.date_joined)}`,
                ].join('\n'),
            )
            .join('\n\n')
        : 'No matching users found.'

      const message = [
        'Finance Dashboard Users',
        `Total users: ${allUsers.length}`,
        activeFilters.length ? `Filters: ${activeFilters.join(', ')}` : 'Filters: All users',
        '',
        usersText,
      ].join('\n')

      shareTextToWhatsApp(message)
    } catch (requestError) {
      setError(
        requestError.response?.data?.detail ||
          requestError.message ||
          'Unable to share the full user list on WhatsApp.',
      )
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="space-y-6">
      <section className="panel p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.26em] text-orange-600 dark:text-orange-300">
              Access Control
            </p>
            <h3 className="mt-2 text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">
              Create users, assign roles, manage status, and share the full user list as WhatsApp text.
            </h3>
          </div>
          <div className="flex flex-col gap-3 lg:items-end">
            <div className="text-sm text-slate-500 dark:text-slate-400">Total users: {users.length}</div>
            <ReportActions
              isBusy={isExporting}
              onWhatsAppShare={handleWhatsAppShare}
              buttonLabel="Share Full Users on WhatsApp"
            />
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <input
            placeholder="Search users"
            value={filters.search}
            onChange={(event) =>
              setFilters((current) => ({ ...current, search: event.target.value }))
            }
          />
          <select
            value={filters.role}
            onChange={(event) =>
              setFilters((current) => ({ ...current, role: event.target.value }))
            }
          >
            <option value="">All roles</option>
            <option value="viewer">Viewer</option>
            <option value="analyst">Analyst</option>
            <option value="admin">Admin</option>
          </select>
          <select
            value={filters.status}
            onChange={(event) =>
              setFilters((current) => ({ ...current, status: event.target.value }))
            }
          >
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </section>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      ) : null}

      <section className="panel p-5 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="panel-title">{editingId ? 'Edit User' : 'Create User'}</h3>
          {editingId ? (
            <button className="action-button-secondary w-full sm:w-auto" onClick={resetForm}>
              Cancel edit
            </button>
          ) : null}
        </div>

        <form className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3" onSubmit={handleSubmit}>
          <input
            placeholder="Username"
            value={formState.username}
            disabled={Boolean(editingId)}
            onChange={(event) =>
              setFormState((current) => ({ ...current, username: event.target.value }))
            }
            required
          />
          <input
            type="email"
            placeholder="Email"
            value={formState.email}
            onChange={(event) =>
              setFormState((current) => ({ ...current, email: event.target.value }))
            }
            required
          />
          <input
            placeholder="Full name"
            value={formState.name}
            onChange={(event) =>
              setFormState((current) => ({ ...current, name: event.target.value }))
            }
            required
          />
          <select
            value={formState.role}
            onChange={(event) =>
              setFormState((current) => ({ ...current, role: event.target.value }))
            }
          >
            <option value="viewer">Viewer</option>
            <option value="analyst">Analyst</option>
            <option value="admin">Admin</option>
          </select>
          <input
            type="password"
            placeholder={editingId ? 'Leave blank to keep current password' : 'Password'}
            value={formState.password}
            onChange={(event) =>
              setFormState((current) => ({ ...current, password: event.target.value }))
            }
            required={!editingId}
          />
          <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
            <input
              className="h-4 w-4 rounded border-slate-300 p-0 dark:border-slate-600"
              type="checkbox"
              checked={formState.is_active}
              onChange={(event) =>
                setFormState((current) => ({ ...current, is_active: event.target.checked }))
              }
            />
            Active user
          </label>
          <button className="action-button-primary w-full sm:col-span-2 xl:col-span-3" disabled={isSaving} type="submit">
            {isSaving ? 'Saving...' : editingId ? 'Update user' : 'Create user'}
          </button>
        </form>
      </section>

      <section className="panel overflow-hidden p-5 sm:p-6">
        <div className="overflow-x-auto">
          <table className="min-w-[760px] divide-y divide-slate-100 text-sm dark:divide-slate-800">
            <thead className="bg-slate-50 text-left text-slate-500 dark:bg-slate-950/70 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3 font-semibold">User</th>
                <th className="px-4 py-3 font-semibold">Role</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Joined</th>
                <th className="px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white dark:divide-slate-800 dark:bg-slate-900/70">
              {isLoading ? (
                <tr>
                  <td className="px-4 py-10 text-center text-slate-500 dark:text-slate-400" colSpan="5">
                    Loading users...
                  </td>
                </tr>
              ) : users.length ? (
                users.map((user) => (
                  <tr key={user.id}>
                    <td className="px-4 py-4">
                      <p className="font-semibold text-slate-900 dark:text-white">{user.name}</p>
                      <p className="text-slate-500 dark:text-slate-400">{user.email}</p>
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">{user.username}</p>
                    </td>
                    <td className="px-4 py-4 text-slate-600 dark:text-slate-300">{titleize(user.role)}</td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${
                          user.is_active
                            ? 'bg-teal-100 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300'
                            : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                        }`}
                      >
                        {user.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-slate-600 dark:text-slate-300">{dateFormatter(user.date_joined)}</td>
                    <td className="px-4 py-4">
                      <button
                        className="action-button-secondary"
                        onClick={() => {
                          setEditingId(user.id)
                          setFormState({
                            username: user.username,
                            email: user.email,
                            name: user.name,
                            role: user.role,
                            is_active: user.is_active,
                            password: '',
                          })
                        }}
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-4 py-10 text-center text-slate-500 dark:text-slate-400" colSpan="5">
                    No users match the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
