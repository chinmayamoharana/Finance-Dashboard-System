import { useEffect, useState } from 'react'

import apiClient from '../api/client'
import CategoryPieChart from '../components/CategoryPieChart'
import MonthlyTrendChart from '../components/MonthlyTrendChart'
import StatCard from '../components/StatCard'
import { currencyFormatter, dateFormatter, titleize } from '../utils/formatters'

const initialFilters = {
  record_type: '',
  category: '',
  start_date: '',
  end_date: '',
}

export default function DashboardPage() {
  const [filters, setFilters] = useState(initialFilters)
  const [appliedFilters, setAppliedFilters] = useState(initialFilters)
  const [summary, setSummary] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadSummary() {
      setIsLoading(true)
      setError('')

      try {
        const response = await apiClient.get('/dashboard/summary/', {
          params: Object.fromEntries(
            Object.entries(appliedFilters).filter(([, value]) => value),
          ),
        })
        setSummary(response.data)
      } catch (requestError) {
        setError(requestError.response?.data?.detail || 'Unable to load dashboard summary.')
      } finally {
        setIsLoading(false)
      }
    }

    loadSummary()
  }, [appliedFilters])

  const monthlyTrendData = (summary?.monthly_trends || []).map((item) => ({
    ...item,
    income: Number(item.income || 0),
    expenses: Number(item.expenses || 0),
    net_balance: Number(item.net_balance || 0),
  }))

  const categoryChartData = (summary?.category_totals || []).map((item) => ({
    label: `${item.category} (${titleize(item.type)})`,
    total: Number(item.total || 0),
  }))

  return (
    <div className="space-y-6">
      <section className="panel p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.26em] text-orange-600 dark:text-orange-300">
              Dashboard Summary
            </p>
            <h3 className="mt-2 text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">
              Aggregated financial insights for the selected period.
            </h3>
          </div>

          <form
            className="grid w-full gap-3 sm:grid-cols-2 xl:max-w-3xl xl:grid-cols-4"
            onSubmit={(event) => {
              event.preventDefault()
              setAppliedFilters(filters)
            }}
          >
            <select
              value={filters.record_type}
              onChange={(event) =>
                setFilters((current) => ({ ...current, record_type: event.target.value }))
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
                setFilters((current) => ({ ...current, category: event.target.value }))
              }
            />
            <input
              type="date"
              value={filters.start_date}
              onChange={(event) =>
                setFilters((current) => ({ ...current, start_date: event.target.value }))
              }
            />
            <input
              type="date"
              value={filters.end_date}
              onChange={(event) =>
                setFilters((current) => ({ ...current, end_date: event.target.value }))
              }
            />
            <div className="flex flex-col gap-3 sm:col-span-2 sm:flex-row xl:col-span-4">
              <button className="action-button-primary w-full sm:w-auto" type="submit">
                Apply filters
              </button>
              <button
                className="action-button-secondary w-full sm:w-auto"
                type="button"
                onClick={() => {
                  setFilters(initialFilters)
                  setAppliedFilters(initialFilters)
                }}
              >
                Reset
              </button>
            </div>
          </form>
        </div>
      </section>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
        <StatCard
          label="Total Income"
          value={summary?.totals?.income}
          tone="success"
        />
        <StatCard
          label="Total Expenses"
          value={summary?.totals?.expenses}
          tone="warning"
        />
        <StatCard
          label="Net Balance"
          value={summary?.totals?.net_balance}
          tone="default"
        />
        <StatCard
          label="Records"
          value={summary?.totals?.record_count || 0}
          tone="neutral"
          currency={false}
        />
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <section className="panel min-w-0 p-5 sm:p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="panel-title">Monthly Trends</h3>
            {isLoading ? <span className="text-sm text-slate-500 dark:text-slate-400">Loading...</span> : null}
          </div>
          <div className="mt-6">
            <MonthlyTrendChart data={monthlyTrendData} />
          </div>
        </section>

        <section className="panel min-w-0 p-5 sm:p-6">
          <h3 className="panel-title">Category Breakdown</h3>
          <div className="mt-6">
            <CategoryPieChart data={categoryChartData} />
          </div>
        </section>
      </div>

      <section className="panel p-5 sm:p-6">
        <h3 className="panel-title">Category Totals</h3>
          <div className="mt-5 overflow-hidden rounded-[22px] border border-slate-100 dark:border-slate-800">
            <div className="overflow-x-auto">
            <table className="min-w-[520px] divide-y divide-slate-100 text-sm dark:divide-slate-800">
              <thead className="bg-slate-50 text-left text-slate-500 dark:bg-slate-950/70 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-semibold">Category</th>
                  <th className="px-4 py-3 font-semibold">Type</th>
                  <th className="px-4 py-3 font-semibold text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white dark:divide-slate-800 dark:bg-slate-900/70">
                {(summary?.category_totals || []).length ? (
                  summary.category_totals.map((item) => (
                    <tr key={`${item.category}-${item.type}`}>
                      <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{item.category}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{titleize(item.type)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-900 dark:text-white">
                        {currencyFormatter(item.total)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="px-4 py-6 text-center text-slate-500 dark:text-slate-400" colSpan="3">
                      No category totals available.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            </div>
          </div>
      </section>

      <section className="panel p-5 sm:p-6">
        <h3 className="panel-title">Recent Activity</h3>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
          {(summary?.recent_activity || []).length ? (
            summary.recent_activity.map((item) => (
              <article key={item.id} className="rounded-[24px] border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-700 dark:text-teal-300">
                  {titleize(item.record_type)}
                </p>
                <p className="mt-3 text-lg font-bold text-slate-900 dark:text-white">{item.category}</p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{dateFormatter(item.transaction_date)}</p>
                <p className="mt-4 text-xl font-bold text-slate-900 dark:text-white">{currencyFormatter(item.amount)}</p>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{item.notes || 'No notes provided.'}</p>
              </article>
            ))
          ) : (
            <p className="rounded-2xl bg-slate-50 px-4 py-6 text-sm text-slate-500 dark:bg-slate-950/60 dark:text-slate-400">
              No recent transactions available.
            </p>
          )}
        </div>
      </section>
    </div>
  )
}
