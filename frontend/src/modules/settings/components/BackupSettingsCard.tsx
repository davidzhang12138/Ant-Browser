import type { RefObject } from 'react'
import { Download, RotateCcw, Upload } from 'lucide-react'

import { Button, Card, Modal, Progress } from '../../../shared/components'
import { useI18n } from '../../../shared/i18n'

import type { BackupExportLogItem, BackupExportProgress } from '../progress'

type BackupActionLoading = 'none' | 'init' | 'export' | 'import-reset' | 'import-merge'

interface BackupProgressPanelProps {
  progress: BackupExportProgress
  loadingLabel: string
  logs?: BackupExportLogItem[]
  logsRef?: RefObject<HTMLDivElement>
}

interface BackupSettingsCardProps {
  actionLoading: BackupActionLoading
  exportProgress: BackupExportProgress | null
  exportLogs: BackupExportLogItem[]
  exportLogsRef: RefObject<HTMLDivElement>
  onInitialize: () => void
  onExport: () => void
  onOpenImport: () => void
}

interface BackupImportModalProps {
  open: boolean
  actionLoading: BackupActionLoading
  importProgress: BackupExportProgress | null
  onClose: () => void
  onImport: (resetFirst: boolean) => void
}

function BackupProgressPanel({ progress, loadingLabel, logs = [], logsRef }: BackupProgressPanelProps) {
  const { t } = useI18n()

  return (
    <div className="rounded-md border border-[var(--color-border-default)] bg-[var(--color-bg-secondary)] px-3 py-2 space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="text-[var(--color-text-secondary)]">{progress.message}</span>
        {progress.phase === 'error' && <span className="text-[var(--color-error)]">{t('common.status.failed')}</span>}
        {progress.phase === 'done' && <span className="text-[var(--color-success)]">{t('settings.backup.progress.done')}</span>}
        {progress.phase !== 'done' && progress.phase !== 'error' && (
          <span className="text-[var(--color-text-muted)]">{loadingLabel}</span>
        )}
      </div>
      {(progress.componentName || progress.componentId || logsRef) && (
        <div className="text-xs text-[var(--color-text-muted)]">
          {t('settings.backup.progress.currentComponent')}
          {' '}
          {progress.componentName || progress.componentId || t('settings.backup.progress.preparing')}
          {progress.entryIndex && progress.entryTotal
            ? `（${progress.entryIndex}/${progress.entryTotal}）`
            : ''}
        </div>
      )}
      <Progress
        percent={progress.progress}
        size="sm"
        status={progress.phase === 'error' ? 'error' : progress.phase === 'done' ? 'success' : 'normal'}
      />
      {logsRef && (
        <div className="rounded border border-[var(--color-border-muted)] bg-[var(--color-bg-primary)] px-2 py-2">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-[var(--color-text-secondary)]">{t('settings.backup.progress.exportLogs')}</span>
            <span className="text-[var(--color-text-muted)]">{logs.length} {t('settings.backup.progress.logCountSuffix')}</span>
          </div>
          <div ref={logsRef} className="max-h-36 overflow-y-auto pr-1 space-y-1">
            {logs.length === 0 && (
              <p className="text-xs text-[var(--color-text-muted)]">{t('settings.backup.progress.waitingForLogs')}</p>
            )}
            {logs.map(item => (
              <div key={item.id} className="text-xs leading-5 font-mono">
                <span className="text-[var(--color-text-muted)] mr-2">{item.time}</span>
                <span className={item.phase === 'error' ? 'text-[var(--color-error)]' : item.phase === 'done' ? 'text-[var(--color-success)]' : 'text-[var(--color-text-secondary)]'}>
                  {item.text}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export function BackupSettingsCard({
  actionLoading,
  exportProgress,
  exportLogs,
  exportLogsRef,
  onInitialize,
  onExport,
  onOpenImport,
}: BackupSettingsCardProps) {
  const { t } = useI18n()

  return (
    <Card title={t('settings.backup.title')} subtitle={t('settings.backup.subtitle')}>
      <div className="space-y-3">
        <p className="text-xs text-[var(--color-text-muted)]">
          {t('settings.backup.description')}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="danger"
            size="sm"
            onClick={onInitialize}
            loading={actionLoading === 'init'}
          >
            <RotateCcw className="w-4 h-4" />
            {t('settings.backup.actions.initialize')}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={onExport}
            loading={actionLoading === 'export'}
          >
            <Download className="w-4 h-4" />
            {t('settings.backup.actions.exportConfig')}
          </Button>
          <Button size="sm" onClick={onOpenImport}>
            <Upload className="w-4 h-4" />
            {t('settings.backup.actions.importConfig')}
          </Button>
        </div>
        {exportProgress && (
          <BackupProgressPanel
            progress={exportProgress}
            loadingLabel={t('settings.backup.progress.processing')}
            logs={exportLogs}
            logsRef={exportLogsRef}
          />
        )}
      </div>
    </Card>
  )
}

export function BackupImportModal({
  open,
  actionLoading,
  importProgress,
  onClose,
  onImport,
}: BackupImportModalProps) {
  const { t } = useI18n()
  const importRunning = actionLoading === 'import-reset' || actionLoading === 'import-merge'

  return (
    <Modal
      open={open}
      onClose={() => {
        if (actionLoading !== 'none') {
          return
        }
        onClose()
      }}
      title={t('settings.backup.importModal.title')}
      width="520px"
      closable={!importRunning}
      footer={(
        <>
          {!importRunning && (
            <Button variant="secondary" onClick={onClose}>
              {t('common.actions.cancel')}
            </Button>
          )}
          <Button
            variant="danger"
            onClick={() => onImport(true)}
            loading={actionLoading === 'import-reset'}
            disabled={actionLoading !== 'none' && actionLoading !== 'import-reset'}
          >
            {t('settings.backup.importModal.resetFirst')}
          </Button>
          <Button
            onClick={() => onImport(false)}
            loading={actionLoading === 'import-merge'}
            disabled={actionLoading !== 'none' && actionLoading !== 'import-merge'}
          >
            {t('settings.backup.importModal.merge')}
          </Button>
        </>
      )}
    >
      <div className="space-y-3 text-sm text-[var(--color-text-secondary)]">
        <p>{t('settings.backup.importModal.question')}</p>
        <p className="text-xs text-[var(--color-text-muted)]">
          {t('settings.backup.importModal.description')}
        </p>
        {importProgress && (
          <BackupProgressPanel progress={importProgress} loadingLabel={t('settings.backup.progress.importing')} />
        )}
        {importRunning && (
          <p className="text-xs text-[var(--color-warning)]">
            {t('settings.backup.importModal.runningWarning')}
          </p>
        )}
      </div>
    </Modal>
  )
}
