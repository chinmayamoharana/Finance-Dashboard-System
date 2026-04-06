import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { currencyFormatter } from '../utils/formatters'

export default function MonthlyTrendChart({ data }) {
  if (!data.length) {
    return (
      <p className="rounded-2xl bg-slate-50 px-4 py-10 text-sm text-slate-500 dark:bg-slate-950/60 dark:text-slate-400">
        No trend data available for the current filters.
      </p>
    )
  }

  return (
    <div className="min-w-0">
      <div className="h-[280px] min-h-[280px] min-w-0 sm:h-[320px] sm:min-h-[320px]">
      <ResponsiveContainer width="100%" height="100%" minWidth={280} minHeight={280}>
        <LineChart data={data} margin={{ top: 12, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="#e2e8f0" strokeDasharray="4 4" />
          <XAxis dataKey="month" tick={{ fill: '#475569', fontSize: 12 }} />
          <YAxis
            tick={{ fill: '#475569', fontSize: 12 }}
            tickFormatter={(value) => `${Math.round(value / 1000)}k`}
          />
          <Tooltip
            formatter={(value) => currencyFormatter(value)}
            contentStyle={{
              borderRadius: '18px',
              border: '1px solid #e2e8f0',
            }}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="income"
            stroke="#0f766e"
            strokeWidth={3}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
          <Line
            type="monotone"
            dataKey="expenses"
            stroke="#f97316"
            strokeWidth={3}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
          <Line
            type="monotone"
            dataKey="net_balance"
            stroke="#0f172a"
            strokeWidth={3}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
      </div>
    </div>
  )
}
