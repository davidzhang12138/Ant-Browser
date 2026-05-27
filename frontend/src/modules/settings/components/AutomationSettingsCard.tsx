import { Badge, Button, Card, FormItem, Input, Progress, Select, Switch } from '../../../shared/components'
import { useI18n } from '../../../shared/i18n'

import type { AutomationNodeSource, AutomationRuntimeCheck, AutomationState, AutomationSystemNodeProbe } from '../api'
import type { AutomationRuntimeProgress } from '../progress'

type AutomationBusyState = 'none' | 'toggle' | 'probe' | 'runtime' | 'package' | 'install' | 'check'
type AutomationStatusVariant = 'default' | 'success' | 'error' | 'warning' | 'info'

interface AutomationSettingsCardProps {
  automationState: AutomationState
  automationProgress: AutomationRuntimeProgress | null
  automationBusy: AutomationBusyState
  automationCheck: AutomationRuntimeCheck | null
  automationProbe: AutomationSystemNodeProbe | null
  automationNodeSourceDraft: AutomationNodeSource
  automationSystemNodePathDraft: string
  automationRuntimeDirty: boolean
  onEnabledChange: (enabled: boolean) => void
  onHeadlessChange: (headlessDefault: boolean) => void
  onNodeSourceDraftChange: (value: AutomationNodeSource) => void
  onSystemNodePathDraftChange: (value: string) => void
  onTypeScriptBuildChange: (allowTypeScriptBuild: boolean) => void
  onProbeSystemNode: () => void
  onSaveRuntimeSettings: () => void
  onInstall: () => void
  onSelfCheck: () => void
}

function resolveAutomationStatus(state: AutomationState, t: (key: string) => string): {
  enabled: boolean
  ready: boolean
  installing: boolean
  statusLabel: string
  statusVariant: AutomationStatusVariant
  nodeSource: string
  nodeSourceLabel: string
  systemNodePath: string
  systemNodeLabel: string
} {
  const enabled = state.settings.enabled
  const ready = state.status.ready
  const installing = state.status.installing
  const statusLabel = installing
    ? t('settings.automation.status.preparing')
    : ready
      ? t('settings.automation.status.ready')
      : state.status.installed
        ? t('settings.automation.status.installed')
        : state.status.lastError
          ? t('settings.automation.status.error')
          : t('settings.automation.status.notInstalled')
  const statusVariant = installing
    ? 'warning'
    : ready
      ? 'success'
      : state.status.lastError
        ? 'error'
        : 'default'
  const nodeSource = state.status.nodeSource || state.settings.nodeSource || 'auto'
  const nodeSourceLabel = nodeSource === 'system'
    ? t('settings.automation.nodeSourceLabels.system')
    : nodeSource === 'bundled'
      ? t('settings.automation.nodeSourceLabels.bundled')
      : t('settings.automation.nodeSourceLabels.auto')
  const systemNodePath = state.status.systemNodePath || state.settings.systemNodePath
  const systemNodeLabel = state.status.systemNodeDetected
    ? t('settings.automation.systemNode.detected')
    : systemNodePath
      ? t('settings.automation.systemNode.configuredPending')
      : t('settings.automation.systemNode.notDetected')

  return {
    enabled,
    ready,
    installing,
    statusLabel,
    statusVariant,
    nodeSource,
    nodeSourceLabel,
    systemNodePath,
    systemNodeLabel,
  }
}

export function AutomationSettingsCard({
  automationState,
  automationProgress,
  automationBusy,
  automationCheck,
  automationProbe,
  automationNodeSourceDraft,
  automationSystemNodePathDraft,
  automationRuntimeDirty,
  onEnabledChange,
  onHeadlessChange,
  onNodeSourceDraftChange,
  onSystemNodePathDraftChange,
  onTypeScriptBuildChange,
  onProbeSystemNode,
  onSaveRuntimeSettings,
  onInstall,
  onSelfCheck,
}: AutomationSettingsCardProps) {
  const { t } = useI18n()
  const automationNodeSourceOptions: Array<{ value: AutomationNodeSource; label: string }> = [
    { value: 'auto', label: t('settings.automation.nodeSourceOptions.auto') },
    { value: 'system', label: t('settings.automation.nodeSourceOptions.system') },
    { value: 'bundled', label: t('settings.automation.nodeSourceOptions.bundled') },
  ]
  const {
    enabled,
    ready,
    installing,
    statusLabel,
    statusVariant,
    nodeSource,
    nodeSourceLabel,
    systemNodePath,
    systemNodeLabel,
  } = resolveAutomationStatus(automationState, t)

  return (
    <Card title={t('settings.automation.title')} subtitle={t('settings.automation.subtitle')}>
      <div className="space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-medium text-[var(--color-text-primary)]">{t('settings.automation.enableLabel')}</p>
              <Badge variant={statusVariant} size="sm" dot>{statusLabel}</Badge>
            </div>
            <p className="text-xs text-[var(--color-text-muted)] mt-1">
              {t('settings.automation.enableHint')}
            </p>
          </div>
          <Switch
            checked={enabled}
            onChange={onEnabledChange}
            disabled={automationBusy === 'toggle'}
          />
        </div>

        <div className="h-px bg-[var(--color-border-muted)]" />

        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-[var(--color-text-primary)]">{t('settings.automation.headlessLabel')}</p>
            <p className="text-xs text-[var(--color-text-muted)] mt-1">
              {t('settings.automation.headlessHint')}
            </p>
          </div>
          <Switch
            checked={automationState.settings.headlessDefault}
            onChange={onHeadlessChange}
            disabled={automationBusy === 'toggle'}
          />
        </div>

        <div className="h-px bg-[var(--color-border-muted)]" />

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,220px)_minmax(0,1fr)] gap-4">
          <FormItem label={t('settings.automation.nodeSourceLabel')}>
            <Select
              value={automationNodeSourceDraft}
              onChange={event => onNodeSourceDraftChange(event.target.value as AutomationNodeSource)}
              disabled={automationBusy !== 'none'}
              options={automationNodeSourceOptions}
            />
          </FormItem>
          <FormItem label={t('settings.automation.systemNodePathLabel')} hint={t('settings.automation.systemNodePathHint')}>
            <Input
              value={automationSystemNodePathDraft}
              onChange={event => onSystemNodePathDraftChange(event.target.value)}
              placeholder={t('settings.automation.systemNodePathPlaceholder')}
              disabled={automationBusy !== 'none' || automationNodeSourceDraft === 'bundled'}
            />
          </FormItem>
        </div>

        <div className="h-px bg-[var(--color-border-muted)]" />

        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-[var(--color-text-primary)]">{t('settings.automation.typescriptBuildLabel')}</p>
            <p className="text-xs text-[var(--color-text-muted)] mt-1">
              {t('settings.automation.typescriptBuildHint')}
            </p>
          </div>
          <Switch
            checked={automationState.settings.allowTypeScriptBuild}
            onChange={onTypeScriptBuildChange}
            disabled={automationBusy !== 'none'}
          />
        </div>

        <div className="flex items-center justify-between gap-4 rounded-md border border-[var(--color-border-default)] bg-[var(--color-bg-secondary)] px-3 py-3">
          <p className="text-xs text-[var(--color-text-muted)]">
            {t('settings.automation.nodeSourceHelp')}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={onProbeSystemNode}
              loading={automationBusy === 'probe'}
              disabled={automationBusy !== 'none' || automationNodeSourceDraft === 'bundled'}
            >
              {t('settings.automation.actions.probeSystemNode')}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={onSaveRuntimeSettings}
              loading={automationBusy === 'runtime' && automationRuntimeDirty}
              disabled={!automationRuntimeDirty || automationBusy !== 'none'}
            >
              {t('settings.automation.actions.saveRuntimeSettings')}
            </Button>
          </div>
        </div>

        {automationProbe && (
          <div className="rounded-md border border-[var(--color-border-default)] bg-[var(--color-bg-secondary)] px-3 py-2 text-xs text-[var(--color-text-secondary)] break-all">
            {t('settings.automation.probeResultPrefix')}<code>{automationProbe.version}</code> · <code>{automationProbe.path}</code>
          </div>
        )}

        <div className="rounded-md border border-[var(--color-border-default)] bg-[var(--color-bg-secondary)] px-3 py-3 space-y-2 text-xs">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[var(--color-text-secondary)]">
            <span>{t('settings.automation.rows.installPolicy')}<code>{automationState.settings.installPolicy}</code></span>
            <span>Runtime：<code>{automationState.settings.runtimeVersion}</code></span>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[var(--color-text-secondary)]">
            <span>{t('settings.automation.rows.nodeSource')}<code>{nodeSourceLabel}</code></span>
            <span>Node：<code>{automationState.status.nodeVersion || automationState.settings.nodeVersion}</code></span>
            <span>playwright-core：<code>{automationState.status.playwrightVersion || automationState.settings.playwrightVersion}</code></span>
            <span>{t('settings.automation.rows.tsBuild')}<code>{automationState.settings.allowTypeScriptBuild ? t('common.enabled') : t('common.disabled')}</code></span>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[var(--color-text-secondary)]">
            <span>{t('settings.automation.rows.systemNode')}<code>{systemNodeLabel}</code></span>
          </div>
          {automationState.status.nodeResolution && (
            <div className="text-[var(--color-text-muted)] break-all">
              {t('settings.automation.rows.nodeResolution')}{automationState.status.nodeResolution}
            </div>
          )}
          {automationState.status.runtimeDir && (
            <div className="text-[var(--color-text-muted)] break-all">
              {t('settings.automation.rows.runtimeDir')}<code>{automationState.status.runtimeDir}</code>
            </div>
          )}
          {automationState.status.nodePath && (
            <div className="text-[var(--color-text-muted)] break-all">
              {t('settings.automation.rows.nodePath')}<code>{automationState.status.nodePath}</code>
            </div>
          )}
          {systemNodePath && (
            <div className="text-[var(--color-text-muted)] break-all">
              {t('settings.automation.rows.systemNodePath')}<code>{systemNodePath}</code>
            </div>
          )}
          {automationState.status.systemNodeError && (
            <div className="text-[var(--color-warning)] break-all">
              {t('settings.automation.rows.systemNodeError')}{automationState.status.systemNodeError}
            </div>
          )}
          {automationState.status.lastError && (
            <div className="text-[var(--color-error)] break-all">
              {t('settings.automation.rows.lastError')}{automationState.status.lastError}
            </div>
          )}
        </div>

        {automationProgress && (
          <div className="rounded-md border border-[var(--color-border-default)] bg-[var(--color-bg-secondary)] px-3 py-3 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[var(--color-text-secondary)]">{automationProgress.message}</span>
              <span className="text-[var(--color-text-muted)]">
                {automationProgress.component ? `${automationProgress.component} · ` : ''}
                {automationProgress.phase}
              </span>
            </div>
            <Progress
              percent={automationProgress.progress}
              size="sm"
              status={automationProgress.phase === 'error' ? 'error' : automationProgress.phase === 'done' ? 'success' : 'normal'}
            />
          </div>
        )}

        {automationCheck && (
          <div className="rounded-md border border-[var(--color-border-default)] bg-[var(--color-bg-secondary)] px-3 py-2 text-xs text-[var(--color-text-secondary)]">
            {t('settings.automation.rows.lastSelfCheck')}<code>{automationCheck.nodeSource || nodeSource}</code> / Node <code>{automationCheck.nodeVersion}</code> / playwright-core <code>{automationCheck.playwrightVersion}</code>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={onInstall}
            loading={automationBusy === 'install'}
            disabled={installing}
          >
            {automationState.status.installed ? t('settings.automation.actions.repairRuntime') : t('settings.automation.actions.prepareRuntime')}
          </Button>
          <Button
            size="sm"
            onClick={onSelfCheck}
            loading={automationBusy === 'check'}
            disabled={!ready}
          >
            {t('settings.automation.actions.selfCheck')}
          </Button>
        </div>
      </div>
    </Card>
  )
}
