import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'

import { currencyFormatter } from '../utils/formatters'

const COLORS = ['#0f766e', '#f97316', '#0f172a', '#14b8a6', '#f59e0b', '#475569']

export default function CategoryPieChart({ data }) {
  if (!data.length) {
    return (
      <p className="rounded-2xl bg-slate-50 px-4 py-10 text-sm text-slate-500 dark:bg-slate-950/60 dark:text-slate-400">
        No category totals available for the current filters.
      </p>
    )
  }

  const total = data.reduce((sum, item) => sum + Number(item.total || 0), 0)
  const chartData = [...data]
    .sort((left, right) => Number(right.total || 0) - Number(left.total || 0))
    .map((item, index) => ({
      ...item,
      color: COLORS[index % COLORS.length],
      percent: total ? (Number(item.total || 0) / total) * 100 : 0,
    }))

  return (
    <div className="rounded-[28px] border border-slate-100 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-950/60 sm:p-5">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-teal-700 dark:text-teal-300">
            Total tracked
          </p>
          <p className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-white">
            {currencyFormatter(total)}
          </p>
        </div>
        <p className="rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-right text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-300">
          {chartData.length} categories
        </p>
      </div>

      <div className="rounded-[24px] border border-white/70 bg-white/80 p-3 dark:border-slate-800 dark:bg-slate-950/70">
        <div className="h-[300px] min-h-[300px] min-w-0 sm:h-[360px] sm:min-h-[360px]">
          <ResponsiveContainer width="100%" height="100%" minWidth={280} minHeight={300}>
            <PieChart>
              <Pie
                data={chartData}
                dataKey="total"
                nameKey="label"
                innerRadius="58%"
                outerRadius="82%"
                paddingAngle={4}
                strokeWidth={0}
              >
                {chartData.map((entry) => (
                  <Cell key={entry.label} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) => currencyFormatter(value)}
                contentStyle={{
                  borderRadius: '18px',
                  border: '1px solid #e2e8f0',
                }}
              />
              <Legend
                verticalAlign="bottom"
                align="center"
                iconType="circle"
                wrapperStyle={{
                  paddingTop: '18px',
                  fontSize: '12px',
                  lineHeight: '20px',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
