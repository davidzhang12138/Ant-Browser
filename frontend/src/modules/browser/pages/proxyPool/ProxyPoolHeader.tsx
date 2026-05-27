import { Button } from '../../../../shared/components'
import { useI18n } from '../../../../shared/i18n'

interface ProxyPoolHeaderProps {
  checkingAllIPHealth: boolean
  cleaningUnused: boolean
  hasURLImportSources: boolean
  onCheckAllIPHealth: () => void
  onCleanupUnused: () => void
  onOpenImport: () => void
  onOpenSettings: () => void
  onRefreshAllSources: () => void
  onTestAll: () => void
  refreshingAllSources: boolean
  testingAll: boolean
  totalCount: number
  unusedCount: number
}

export function ProxyPoolHeader({
  checkingAllIPHealth,
  cleaningUnused,
  hasURLImportSources,
  onCheckAllIPHealth,
  onCleanupUnused,
  onOpenImport,
  onOpenSettings,
  onRefreshAllSources,
  onTestAll,
  refreshingAllSources,
  testingAll,
  totalCount,
  unusedCount,
}: ProxyPoolHeaderProps) {
  const { t } = useI18n()
  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">{t('proxy.title')}</h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">{t('proxy.subtitle')}</p>
      </div>
      <div className="flex flex-wrap justify-end gap-2">
        <Button
          size="sm"
          variant="secondary"
          onClick={onOpenSettings}
        >
          {t('proxy.actions.settings')}
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={onRefreshAllSources}
          loading={refreshingAllSources}
          disabled={!hasURLImportSources}
        >
          {t('proxy.actions.refreshSubscriptions')}
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={onCheckAllIPHealth}
          loading={checkingAllIPHealth}
          disabled={totalCount === 0}
        >
          {t('proxy.actions.checkIPHealth')}
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={onTestAll}
          loading={testingAll}
          disabled={totalCount === 0}
        >
          {t('proxy.actions.testAll')}
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={onCleanupUnused}
          loading={cleaningUnused}
          disabled={unusedCount === 0}
        >
          {t('proxy.actions.cleanupUnused')}{unusedCount > 0 ? ` (${unusedCount})` : ''}
        </Button>
        <Button size="sm" onClick={onOpenImport}>{t('proxy.actions.import')}</Button>
      </div>
    </div>
  )
}
