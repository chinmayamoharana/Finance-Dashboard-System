import { currencyFormatter } from '../utils/formatters'

export default function StatCard({ label, value, tone = 'default', currency = true }) {
  const toneClasses = {
    default: 'from-slate-900 via-slate-800 to-slate-700 text-white',
    success: 'from-teal-700 via-teal-600 to-emerald-500 text-white',
    warning: 'from-orange-500 via-amber-500 to-yellow-400 text-slate-950',
    neutral: 'from-white via-slate-50 to-slate-100 text-slate-900 dark:from-slate-900 dark:via-slate-800 dark:to-slate-700 dark:text-white',
  }

  return (
    <article
      className={`rounded-[28px] bg-gradient-to-br p-5 shadow-panel ${toneClasses[tone] || toneClasses.default}`}
    >
      <p className="text-sm font-semibold uppercase tracking-[0.24em] opacity-75">{label}</p>
      <p className="mt-5 text-3xl font-extrabold">
        {currency ? currencyFormatter(value) : value}
      </p>
    </article>
  )
}
