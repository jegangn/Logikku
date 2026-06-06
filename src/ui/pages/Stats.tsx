import { useEffect } from 'react'
import { useStatsStore } from '@/state/statsStore'
import { useT } from '@/i18n'
import { BackButton } from '@/ui/components/BackButton'
import { formatBand } from './statsFormat'
import { putStats } from '@/storage/db'

function formatMs(ms: number | null): string {
  if (ms === null) return '—'
  const totalSec = Math.floor(ms / 1000)
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${m}m ${String(s).padStart(2, '0')}s`
}

export function Stats() {
  const t = useT()
  const byBand = useStatsStore((s) => s.byBand)
  const loaded = useStatsStore((s) => s.loaded)
  const loadFromDb = useStatsStore((s) => s.loadFromDb)

  useEffect(() => {
    void loadFromDb()
  }, [loadFromDb])

  const entries = Object.entries(byBand)
  const total = entries.reduce((sum, [, s]) => sum + s.completed, 0)

  async function reset() {
    if (!confirm(t.stats.confirmReset)) return
    await putStats({ key: 'v1', byBand: {} })
    useStatsStore.setState({ byBand: {} })
  }

  return (
    <main className="min-h-dvh flex flex-col items-center pad-page">
      <div className="w-full max-w-md">
        <BackButton className="mb-6" />
        <h1 className="text-3xl font-semibold tracking-tight">
          {t.stats.title}
        </h1>

        {loaded && total === 0 && (
          <p
            data-testid="stats-empty"
            className="mt-8 text-sm text-[var(--color-text-muted)]"
          >
            {t.stats.noData}
          </p>
        )}

        {total > 0 && (
          <table className="mt-8 w-full text-sm" data-testid="stats-table">
            <thead>
              <tr className="text-left text-[var(--color-text-faint)] text-xs uppercase tracking-wider">
                <th className="pb-2 font-medium">{t.stats.headerBand}</th>
                <th className="pb-2 font-medium text-right">{t.stats.headerCompleted}</th>
                <th className="pb-2 font-medium text-right">{t.stats.headerBest}</th>
                <th className="pb-2 font-medium text-right">{t.stats.headerAverage}</th>
              </tr>
            </thead>
            <tbody>
              {entries
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([k, s]) => (
                  <tr key={k} className="border-t border-[var(--color-border)]">
                    <td className="py-3">{formatBand(k, t)}</td>
                    <td className="py-3 text-right tabular-nums">{s.completed}</td>
                    <td className="py-3 text-right tabular-nums">{formatMs(s.bestTimeMs)}</td>
                    <td className="py-3 text-right tabular-nums">
                      {s.completed > 0 ? formatMs(s.totalTimeMs / s.completed) : '—'}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}

        {total > 0 && (
          <button
            type="button"
            data-testid="stats-reset"
            onClick={() => {
              void reset()
            }}
            className="mt-8 min-h-[44px] w-full rounded-xl border border-[var(--color-conflict-soft)] text-[var(--color-conflict)] text-sm font-medium hover:bg-[var(--color-conflict-soft)] active:scale-[0.99] transition-transform"
          >
            {t.stats.reset}
          </button>
        )}
      </div>
    </main>
  )
}
