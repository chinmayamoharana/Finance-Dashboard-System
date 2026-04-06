import { useEffect, useState } from 'react'

import apiClient from '../api/client'
import ReportActions from '../components/ReportActions'
import { useAuth } from '../context/AuthContext'
import useDebouncedValue from '../hooks/useDebouncedValue'
import { fetchAllRecords, shareTextToWhatsApp } from '../utils/reportExports'
import { currencyFormatter, dateFormatter, titleize } from '../utils/formatters'

const emptyForm = {
  amount: '',
  record_type: 'expense',
  category: '',
  transaction_date: '',
  notes: '',
}

export default function RecordsPage() {
  const { user } = useAuth()
  const [filters, setFilters] = useState({
    search: '',
    record_type: '',
    category: '',
    start_date: '',
    end_date: '',
    page: 1,
  })
  const debouncedSearch = useDebouncedValue(filters.search, 350)
  const debouncedCategory = useDebouncedValue(filters.category, 350)
  const [recordsState, setRecordsState] = useState({
    count: 0,
    total_pages: 1,
    current_page: 1,
    results: [],
  })
  const [formState, setFormState] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [error, setError] = useState('')

  function getRecordParams(overrides = {}) {
    const params = {
      search: debouncedSearch,
      record_type: filters.record_type,
      category: debouncedCategory,
      start_date: filters.start_date,
      end_date: filters.end_date,
      page: filters.page,
      ...overrides,
    }

    return Object.fromEntries(Object.entries(params).filter(([, value]) => value !== ''))
  }

  useEffect(() => {
    const controller = new AbortController()

    async function loadRecords() {
      setIsLoading(true)
      setError('')

      try {
        const response = await apiClient.get('/records/', {
          params: getRecordParams(),
          signal: controller.signal,
        })
        setRecordsState(response.data)
      } catch (requestError) {
        if (requestError.name === 'CanceledError' || requestError.code === 'ERR_CANCELED') {
          return
        }
        setError(requestError.response?.data?.detail || 'Unable to load financial records.')
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false)
        }
      }
    }

    loadRecords()

    return () => {
      controller.abort()
    }
  }, [
    debouncedCategory,
    debouncedSearch,
    filters.end_date,
    filters.page,
    filters.record_type,
    filters.start_date,
  ])

  function resetForm() {
    setEditingId(null)
    setFormState(emptyForm)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setIsSaving(true)

    try {
      const payload = {
        ...formState,
        amount: Number(formState.amount),
      }
      if (editingId) {
        await apiClient.patch(`/records/${editingId}/`, payload)
      } else {
        await apiClient.post('/records/', payload)
      }
      resetForm()
      setFilters((current) => ({ ...current, page: 1 }))
      const response = await apiClient.get('/records/', {
        params: getRecordParams({ page: 1 }),
      })
      setRecordsState(response.data)
    } catch (requestError) {
      const detail =
        requestError.response?.data?.detail ||
        Object.values(requestError.response?.data || {}).flat().join(' ') ||
        'Unable to save the record.'
      setError(detail)
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete(recordId) {
    if (!window.confirm('Delete this financial record?')) {
      return
    }

    try {
      await apiClient.delete(`/records/${recordId}/`)
      setRecordsState((current) => ({
        ...current,
        results: current.results.filter((item) => item.id !== recordId),
        count: Math.max(0, current.count - 1),
      }))
    } catch (requestError) {
      setError(requestError.response?.data?.detail || 'Unable to delete the record.')
    }
  }

  function getShareParams() {
    return {
      ...getRecordParams({ page: 1 }),
    }
  }

  async function handleWhatsAppShare() {
    setError('')
    setIsExporting(true)

    try {
      const allRecords = await fetchAllRecords(getShareParams())
      const activeFilters = [
        debouncedSearch ? `Search: ${debouncedSearch}` : null,
        filters.record_type ? `Type: ${titleize(filters.record_type)}` : null,
        debouncedCategory ? `Category: ${debouncedCategory}` : null,
        filters.start_date ? `From: ${filters.start_date}` : null,
        filters.end_date ? `To: ${filters.end_date}` : null,
      ].filter(Boolean)

      const recordsText = allRecords.length
        ? allRecords
            .map(
              (record, index) =>
                [
                  `${index + 1}. ${titleize(record.record_type)} | ${record.category}`,
                  `Date: ${dateFormatter(record.transaction_date)}`,
                  `Amount: ${currencyFormatter(record.amount)}`,
                  `Notes: ${record.notes || 'No notes'}`,
                  `Created by: ${record.created_by?.name || record.created_by?.username || '-'}`,
                  `Updated by: ${record.updated_by?.name || record.updated_by?.username || '-'}`,
                ].join('\n'),
            )
            .join('\n\n')
        : 'No matching records found.'

      const message = [
        'Finance Dashboard Records',
        `Shared by: ${titleize(user.role)}`,
        `Total records: ${allRecords.length}`,
        activeFilters.length ? `Filters: ${activeFilters.join(', ')}` : 'Filters: All records',
        '',
        recordsText,
      ].join('\n')

      shareTextToWhatsApp(message)
    } catch (requestError) {
      setError(
        requestError.response?.data?.detail ||
          requestError.message ||
          'Unable to share the full records on WhatsApp.',
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
            <p className="text-sm font-semibold uppercase tracking-[0.26em] text-teal-700 dark:text-teal-300">
              Financial Records
            </p>
            <h3 className="mt-2 text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">
              Analysts can share the full filtered records as WhatsApp text. Admins can also create, update, and delete records.
            </h3>
          </div>
          <div className="flex flex-col gap-3 lg:items-end">
            <div className="text-sm text-slate-500 dark:text-slate-400">
              Showing {recordsState.count} record{recordsState.count === 1 ? '' : 's'}
            </div>
            {(user.role === 'admin' || user.role === 'analyst') ? (
              <ReportActions
                isBusy={isExporting}
                onWhatsAppShare={handleWhatsAppShare}
                buttonLabel="Share Full Records on WhatsApp"
              />
            ) : null}
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <input
            placeholder="Search notes or category"
            value={filters.search}
            onChange={(event) =>
              setFilters((current) => ({ ...current, search: event.target.value, page: 1 }))
            }
          />
          <select
            value={filters.record_type}
            onChange={(event) =>
              setFilters((current) => ({ ...current, record_type: event.target.value, page: 1 }))
            }
          >
            <option value="">All types</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </select>
          <input
            placeholder="Category"
            value={filters.category}
            onChange={(event) =>
              setFilters((current) => ({ ...current, category: event.target.value, page: 1 }))
            }
          />
          <input
            type="date"
            value={filters.start_date}
            onChange={(event) =>
              setFilters((current) => ({ ...current, start_date: event.target.value, page: 1 }))
            }
          />
          <input
            type="date"
            value={filters.end_date}
            onChange={(event) =>
              setFilters((current) => ({ ...current, end_date: event.target.value, page: 1 }))
            }
          />
        </div>
      </section>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      ) : null}

      {user.role === 'admin' ? (
        <section className="panel p-5 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="panel-title">{editingId ? 'Edit Record' : 'Create Record'}</h3>
            {editingId ? (
              <button className="action-button-secondary w-full sm:w-auto" onClick={resetForm}>
                Cancel edit
              </button>
            ) : null}
          </div>

          <form className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-5" onSubmit={handleSubmit}>
            <input
              type="number"
              min="0.01"
              step="0.01"
              placeholder="Amount"
              value={formState.amount}
              onChange={(event) =>
                setFormState((current) => ({ ...current, amount: event.target.value }))
              }
              required
            />
            <select
              value={formState.record_type}
              onChange={(event) =>
                setFormState((current) => ({ ...current, record_type: event.target.value }))
              }
            >
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </select>
            <input
              placeholder="Category"
              value={formState.category}
              onChange={(event) =>
                setFormState((current) => ({ ...current, category: event.target.value }))
              }
              required
            />
            <input
              type="date"
              value={formState.transaction_date}
              onChange={(event) =>
                setFormState((current) => ({ ...current, transaction_date: event.target.value }))
              }
              required
            />
            <button
              className="action-button-primary w-full xl:w-auto"
              disabled={isSaving}
              type="submit"
            >
              {isSaving ? 'Saving...' : editingId ? 'Update record' : 'Create record'}
            </button>
            <textarea
              className="md:col-span-2 xl:col-span-5"
              rows="3"
              placeholder="Notes"
              value={formState.notes}
              onChange={(event) =>
                setFormState((current) => ({ ...current, notes: event.target.value }))
              }
            />
          </form>
        </section>
      ) : null}

      <section className="panel overflow-hidden p-5 sm:p-6">
        <div className="overflow-x-auto">
          <table className="min-w-[860px] divide-y divide-slate-100 text-sm dark:divide-slate-800">
            <thead className="bg-slate-50 text-left text-slate-500 dark:bg-slate-950/70 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 font-semibold">Type</th>
                <th className="px-4 py-3 font-semibold">Category</th>
                <th className="px-4 py-3 font-semibold">Notes</th>
                <th className="px-4 py-3 font-semibold text-right">Amount</th>
                {user.role === 'admin' ? <th className="px-4 py-3 font-semibold">Actions</th> : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white dark:divide-slate-800 dark:bg-slate-900/70">
              {isLoading ? (
                <tr>
                  <td className="px-4 py-10 text-center text-slate-500 dark:text-slate-400" colSpan={user.role === 'admin' ? 6 : 5}>
                    Loading records...
                  </td>
                </tr>
              ) : recordsState.results.length ? (
                recordsState.results.map((record) => (
                  <tr key={record.id}>
                    <td className="px-4 py-4 text-slate-600 dark:text-slate-300">{dateFormatter(record.transaction_date)}</td>
                    <td className="px-4 py-4 font-medium text-slate-900 dark:text-white">{titleize(record.record_type)}</td>
                    <td className="px-4 py-4 text-slate-600 dark:text-slate-300">{record.category}</td>
                    <td className="px-4 py-4 text-slate-600 dark:text-slate-300">{record.notes || 'No notes'}</td>
                    <td className="px-4 py-4 text-right font-semibold text-slate-900 dark:text-white">
                      {currencyFormatter(record.amount)}
                    </td>
                    {user.role === 'admin' ? (
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-2">
                          <button
                            className="action-button-secondary"
                            onClick={() => {
                              setEditingId(record.id)
                              setFormState({
                                amount: record.amount,
                                record_type: record.record_type,
                                category: record.category,
                                transaction_date: record.transaction_date,
                                notes: record.notes,
                              })
                            }}
                          >
                            Edit
                          </button>
                          <button
                            className="action-button-secondary border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/40"
                            onClick={() => handleDelete(record.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    ) : null}
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-4 py-10 text-center text-slate-500 dark:text-slate-400" colSpan={user.role === 'admin' ? 6 : 5}>
                    No records found for the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Page {recordsState.current_page} of {recordsState.total_pages}
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              className="action-button-secondary w-full sm:w-auto"
              disabled={recordsState.current_page <= 1}
              onClick={() =>
                setFilters((current) => ({ ...current, page: Math.max(1, current.page - 1) }))
              }
            >
              Previous
            </button>
            <button
              className="action-button-secondary w-full sm:w-auto"
              disabled={recordsState.current_page >= recordsState.total_pages}
              onClick={() =>
                setFilters((current) => ({
                  ...current,
                  page: Math.min(recordsState.total_pages, current.page + 1),
                }))
              }
            >
              Next
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
