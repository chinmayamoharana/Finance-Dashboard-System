export default function ReportActions({
  isBusy = false,
  onWhatsAppShare,
  buttonLabel = 'Share on WhatsApp',
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        className="action-button-primary border border-green-200 bg-green-600 text-white hover:bg-green-500 dark:border-green-900 dark:bg-green-600 dark:text-white dark:hover:bg-green-500"
        disabled={isBusy}
        onClick={onWhatsAppShare}
        type="button"
      >
        {buttonLabel}
      </button>
    </div>
  )
}
