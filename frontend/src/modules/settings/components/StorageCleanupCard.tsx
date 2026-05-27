import { useState } from 'react'
import { Database, HardDrive, RefreshCw, Trash2 } from 'lucide-react'
import { Button, Card, Modal } from '../../../shared/components'
import { useI18n } from '../../../shared/i18n'
import type { StorageCleanupOverview, StoragePathUsage } from '../api'

type StorageCleanupBusy = 'none' | 'refresh' | 'legacy' | 'browser'

interface StorageCleanupCardProps {
  overview: StorageCleanupOverview
  busy: StorageCleanupBusy
  onRefresh: () => void
  onClearLegacy: () => void
  onClearBrowserCaches: () => void
}

function formatBytes(value: number) {
  const bytes = Number.isFinite(value) ? Math.max(0, value) : 0
  if (bytes < 1024) return `${bytes} B`
  const units = ['KB', 'MB', 'GB', 'TB']
  let current = bytes
  for (const unit of units) {
    current /= 1024
    if (current < 1024) return `${current.toFixed(2)} ${unit}`
  }
  return `${(current / 1024).toFixed(2)} PB`
}

function StorageUsageRow({ item }: { item: StoragePathUsage }) {
  const { t } = useI18n()

  return (
    <div className="rounded-lg border border-[var(--color-border-default)] px-4 py-3">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <HardDrive className="h-4 w-4 text-[var(--color-text-muted)] shrink-0" />
            <span className="text-sm font-medium text-[var(--color-text-primary)]">{item.label}</span>
            <span className={`text-xs ${item.exists ? 'text-[var(--color-success)]' : 'text-[var(--color-text-muted)]'}`}>
              {item.exists ? t('settings.storage.status.exists') : t('settings.storage.status.notFound')}
            </span>
          </div>
          <p className="mt-1 truncate text-xs text-[var(--color-text-muted)]" title={item.path || '-'}>
            {item.path || '-'}
          </p>
          {item.description && (
            <p className="mt-2 text-xs text-[var(--color-text-secondary)]">{item.description}</p>
          )}
          {item.warning && (
            <p className="mt-2 text-xs text-[var(--color-warning)]">{item.warning}</p>
          )}
        </div>
        <div className="text-right shrink-0">
          <p className="text-base font-semibold text-[var(--color-text-primary)]">{formatBytes(item.sizeBytes)}</p>
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">{item.cleanable ? t('settings.storage.status.cleanable') : t('settings.storage.status.keep')}</p>
        </div>
      </div>
    </div>
  )
}

export function StorageCleanupCard({
  overview,
  busy,
  onRefresh,
  onClearLegacy,
  onClearBrowserCaches,
}: StorageCleanupCardProps) {
  const { t } = useI18n()
  const [pendingAction, setPendingAction] = useState<'legacy' | 'browser' | null>(null)
  const actionRunning = busy === 'legacy' || busy === 'browser'
  const legacyDisabled = actionRunning
  const browserDisabled = actionRunning
  const confirmLegacy = pendingAction === 'legacy'
  const confirmTitle = confirmLegacy ? t('settings.storage.confirm.legacyTitle') : t('settings.storage.confirm.browserTitle')

  const handleConfirm = () => {
    if (pendingAction === 'legacy') {
      onClearLegacy()
    } else if (pendingAction === 'browser') {
      onClearBrowserCaches()
    }
    setPendingAction(null)
  }

  return (
    <>
      <Card
        title={t('settings.storage.title')}
        subtitle={t('settings.storage.subtitle')}
        actions={
          <Button variant="secondary" size="sm" onClick={onRefresh} loading={busy === 'refresh'} disabled={actionRunning}>
            <RefreshCw className="h-4 w-4" />
            {t('settings.storage.actions.rescan')}
          </Button>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <StorageUsageRow item={overview.currentDataRoot} />
            <StorageUsageRow item={overview.legacyCacheRoot} />
          </div>

          <div className="rounded-lg border border-[var(--color-border-default)] px-4 py-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4 text-[var(--color-text-muted)]" />
                  <p className="text-sm font-medium text-[var(--color-text-primary)]">{t('settings.storage.browserCacheTitle')}</p>
                </div>
                <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                  {t('settings.storage.scannedPrefix')}{overview.currentProfileCount}{t('settings.storage.scannedMiddle')}{formatBytes(overview.currentCacheBytes)}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setPendingAction('browser')}
                  loading={busy === 'browser'}
                  disabled={browserDisabled}
                >
                  <Trash2 className="h-4 w-4" />
                  {t('settings.storage.actions.clearBrowser')}
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => setPendingAction('legacy')}
                  loading={busy === 'legacy'}
                  disabled={legacyDisabled}
                >
                  <Trash2 className="h-4 w-4" />
                  {t('settings.storage.actions.clearLegacy')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Modal
        open={pendingAction !== null}
        onClose={() => setPendingAction(null)}
        title={confirmTitle}
        width="520px"
        footer={
          <>
            <Button variant="secondary" onClick={() => setPendingAction(null)}>{t('common.actions.cancel')}</Button>
            <Button variant={confirmLegacy ? 'danger' : 'primary'} onClick={handleConfirm}>
              {t('settings.storage.actions.confirmClear')}
            </Button>
          </>
        }
      >
        {confirmLegacy ? (
          <div className="space-y-3 text-sm text-[var(--color-text-secondary)]">
            <p>{t('settings.storage.confirm.legacyBody')}</p>
            <p className="break-all rounded-md bg-[var(--color-bg-secondary)] px-3 py-2 text-xs text-[var(--color-text-muted)]">
              {overview.legacyCacheRoot.path || '~/Library/Caches/ant-browser'}
            </p>
            <p className="text-xs text-[var(--color-warning)]">
              {t('settings.storage.confirm.legacyWarning')}
            </p>
          </div>
        ) : (
          <div className="space-y-3 text-sm text-[var(--color-text-secondary)]">
            <p>{t('settings.storage.confirm.browserBody')}</p>
            <p className="text-xs text-[var(--color-text-muted)]">
              {t('settings.storage.confirm.browserDescription')}
            </p>
          </div>
        )}
      </Modal>
    </>
  )
}
