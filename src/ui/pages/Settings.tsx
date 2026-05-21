import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useSettingsStore, type Theme } from '@/state/settingsStore'
import {
  buildBackup,
  backupToBlob,
  defaultBackupFilename,
  clearAllData,
  parseBackup,
  restoreBackup,
} from '@/storage/backup'
import { useOnboardingStore } from '@/state/onboardingStore'
import { t } from '@/i18n/en'

const THEMES: ReadonlyArray<{ value: Theme; label: string }> = [
  { value: 'light', label: t.settings.themeLight },
  { value: 'dark', label: t.settings.themeDark },
  { value: 'system', label: t.settings.themeSystem },
]

export function Settings() {
  const navigate = useNavigate()
  const theme = useSettingsStore((s) => s.theme)
  const strictMode = useSettingsStore((s) => s.strictMode)
  const highlightConflicts = useSettingsStore((s) => s.highlightConflicts)
  const highlightPeers = useSettingsStore((s) => s.highlightPeers)
  const pencilAutoClean = useSettingsStore((s) => s.pencilAutoClean)
  const setSetting = useSettingsStore((s) => s.set)
  const fileInput = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState<{ kind: 'ok' | 'err'; msg: string } | null>(null)
  const resetOnboarding = useOnboardingStore((s) => s.reset)
  const [onboardingResetMsg, setOnboardingResetMsg] = useState<string | null>(null)

  async function handleResetOnboarding() {
    await resetOnboarding()
    setOnboardingResetMsg(t.settings.resetOnboardingDone)
    setTimeout(() => setOnboardingResetMsg(null), 2000)
  }

  async function handleBackup() {
    const backup = await buildBackup()
    const blob = backupToBlob(backup)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = defaultBackupFilename()
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleRestoreClick() {
    if (!confirm(t.settings.confirmRestore)) return
    fileInput.current?.click()
  }

  async function handleRestoreFile(ev: React.ChangeEvent<HTMLInputElement>) {
    const file = ev.target.files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      const parsed = parseBackup(text)
      await restoreBackup(parsed)
      setStatus({ kind: 'ok', msg: t.settings.restoreOk })
    } catch (e) {
      setStatus({ kind: 'err', msg: `${t.settings.restoreError} (${String(e)})` })
    } finally {
      ev.target.value = ''
    }
  }

  async function handleClear() {
    if (!confirm(t.settings.confirmClearFirst)) return
    if (!confirm(t.settings.confirmClearSecond)) return
    await clearAllData()
    setStatus({ kind: 'ok', msg: 'Data cleared.' })
  }

  return (
    <main className="min-h-dvh flex flex-col items-center px-6 py-8">
      <div className="w-full max-w-md">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="mb-6 text-sm text-[var(--color-text-faint)] hover:text-[var(--color-text-muted)]"
        >
          {t.play.back}
        </button>
        <h1 className="text-3xl font-semibold tracking-tight">
          {t.settings.title}
        </h1>

        <section className="mt-8 space-y-4">
          <div>
            <Label>{t.settings.theme}</Label>
            <div className="mt-2 grid grid-cols-3 gap-2" role="tablist">
              {THEMES.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  role="tab"
                  aria-selected={theme === value}
                  data-testid={`theme-${value}`}
                  onClick={() => {
                    void setSetting('theme', value)
                  }}
                  className={`min-h-[44px] rounded-xl border text-sm font-medium transition-colors ${
                    theme === value
                      ? 'border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-[var(--color-accent-strong)]'
                      : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <ToggleRow
            label={t.settings.strictMode}
            hint={t.settings.strictModeHint}
            value={strictMode}
            onChange={(v) => {
              void setSetting('strictMode', v)
            }}
            testId="toggle-strictMode"
          />
          <ToggleRow
            label={t.settings.highlightConflicts}
            value={highlightConflicts}
            onChange={(v) => {
              void setSetting('highlightConflicts', v)
            }}
            testId="toggle-highlightConflicts"
          />
          <ToggleRow
            label={t.settings.highlightPeers}
            value={highlightPeers}
            onChange={(v) => {
              void setSetting('highlightPeers', v)
            }}
            testId="toggle-highlightPeers"
          />
          <ToggleRow
            label={t.settings.pencilAutoClean}
            hint={t.settings.pencilAutoCleanHint}
            value={pencilAutoClean}
            onChange={(v) => {
              void setSetting('pencilAutoClean', v)
            }}
            testId="toggle-pencilAutoClean"
          />
        </section>

        <section className="mt-10">
          <Label>{t.settings.dataSection}</Label>
          <div className="mt-2 space-y-2">
            <ActionRow
              label={t.settings.backup}
              hint={t.settings.backupHint}
              onClick={() => {
                void handleBackup()
              }}
              testId="action-backup"
            />
            <ActionRow
              label={t.settings.restore}
              hint={t.settings.restoreHint}
              onClick={handleRestoreClick}
              testId="action-restore"
            />
            <ActionRow
              label={t.settings.resetOnboarding}
              hint={t.settings.resetOnboardingHint}
              onClick={() => {
                void handleResetOnboarding()
              }}
              testId="action-reset-onboarding"
            />
            {onboardingResetMsg && (
              <p
                data-testid="onboarding-reset-status"
                aria-live="polite"
                className="mt-2 text-sm text-[var(--color-accent-strong)]"
              >
                {onboardingResetMsg}
              </p>
            )}
            <ActionRow
              label={t.settings.clear}
              hint={t.settings.clearHint}
              onClick={() => {
                void handleClear()
              }}
              destructive
              testId="action-clear"
            />
            <input
              ref={fileInput}
              type="file"
              accept="application/json"
              data-testid="restore-input"
              className="hidden"
              onChange={(ev) => {
                void handleRestoreFile(ev)
              }}
            />
          </div>
          {status && (
            <p
              data-testid="status"
              aria-live="polite"
              className={`mt-3 text-sm ${
                status.kind === 'ok'
                  ? 'text-[var(--color-accent-strong)]'
                  : 'text-[var(--color-conflict)]'
              }`}
            >
              {status.msg}
            </p>
          )}
        </section>

        <p className="mt-10 text-center text-xs text-[var(--color-text-faint)]">
          <Link to="/stats" className="hover:text-[var(--color-text-muted)]">
            {t.home.stats}
          </Link>
        </p>
      </div>
    </main>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-sm uppercase tracking-wider text-[var(--color-text-faint)]">
      {children}
    </h2>
  )
}

function ToggleRow({
  label,
  hint,
  value,
  onChange,
  testId,
}: {
  label: string
  hint?: string
  value: boolean
  onChange: (next: boolean) => void
  testId: string
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
      <div className="flex-1">
        <div className="text-sm font-medium">{label}</div>
        {hint && (
          <div className="text-xs text-[var(--color-text-muted)] mt-1">
            {hint}
          </div>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        data-testid={testId}
        onClick={() => onChange(!value)}
        className={`relative h-7 w-12 rounded-full transition-colors ${
          value
            ? 'bg-[var(--color-accent)]'
            : 'bg-[var(--color-border-strong)]'
        }`}
      >
        <span
          className={`absolute top-0.5 h-6 w-6 rounded-full bg-white transition-transform ${
            value ? 'translate-x-5' : 'translate-x-0.5'
          }`}
        />
      </button>
    </div>
  )
}

function ActionRow({
  label,
  hint,
  onClick,
  destructive,
  testId,
}: {
  label: string
  hint?: string
  onClick: () => void
  destructive?: boolean
  testId: string
}) {
  return (
    <button
      type="button"
      data-testid={testId}
      onClick={onClick}
      className={`flex w-full items-center justify-between gap-4 rounded-xl border bg-[var(--color-surface)] px-4 py-3 text-left hover:bg-[var(--color-surface-2)] active:scale-[0.99] transition-transform ${
        destructive
          ? 'border-[var(--color-conflict-soft)] text-[var(--color-conflict)]'
          : 'border-[var(--color-border)]'
      }`}
    >
      <div className="flex-1">
        <div className="text-sm font-medium">{label}</div>
        {hint && (
          <div className={`text-xs mt-1 ${destructive ? 'text-[var(--color-conflict)] opacity-70' : 'text-[var(--color-text-muted)]'}`}>
            {hint}
          </div>
        )}
      </div>
      <span className="text-[var(--color-text-faint)]">→</span>
    </button>
  )
}
