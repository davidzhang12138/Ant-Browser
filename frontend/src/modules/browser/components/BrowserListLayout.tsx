import { Link } from 'react-router-dom'
import { CheckCircle, ChevronRight, ChevronUp, Edit2, LayoutGrid, List, Play, Plus, RefreshCw, Sliders, Star, Trash2, XCircle } from 'lucide-react'

import { Button, Card, FormItem, Input, Modal, Switch, Table, Textarea } from '../../../shared/components'
import type { TableColumn } from '../../../shared/components/Table'
import { useI18n } from '../../../shared/i18n'

import type { BrowserCore, BrowserCoreInput, BrowserGroupWithCount, BrowserProxy, BrowserSettings } from '../types'
import { InstanceFilterBar } from './InstanceFilterBar'
import type { InstanceFilters } from './InstanceFilterBar'

export type BrowserViewMode = 'card' | 'table'

interface BrowserListHeaderProps {
  profileCount: number
  filteredProfileCount: number
  headerCollapsed: boolean
  viewMode: BrowserViewMode
  proxies: BrowserProxy[]
  cores: BrowserCore[]
  groups: BrowserGroupWithCount[]
  allTags: string[]
  filters: InstanceFilters
  onFiltersChange: (next: InstanceFilters) => void
  onToggleHeaderCollapsed: () => void
  onRefresh: () => void
  onOpenTrash: () => void
  onOpenSettings: () => void
  onViewModeChange: (next: BrowserViewMode) => void
}

export function BrowserListHeader({
  profileCount,
  filteredProfileCount,
  headerCollapsed,
  viewMode,
  proxies,
  cores,
  groups,
  allTags,
  filters,
  onFiltersChange,
  onToggleHeaderCollapsed,
  onRefresh,
  onOpenTrash,
  onOpenSettings,
  onViewModeChange,
}: BrowserListHeaderProps) {
  const { t } = useI18n()
  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">{t('browserList.title')}</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">
            {t('browserList.totalCount')} {profileCount}
            {filteredProfileCount !== profileCount && (
              <span className="ml-1 text-[var(--color-accent)]">（{t('browserList.filteredCount')} {filteredProfileCount}）</span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={onToggleHeaderCollapsed}>
            {headerCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            {headerCollapsed ? t('browserList.actions.expandPanel') : t('browserList.actions.collapsePanel')}
          </Button>
          <Button variant="secondary" size="sm" onClick={onRefresh}>
            <RefreshCw className="w-4 h-4" />{t('browserList.actions.refresh')}
          </Button>
          <Button variant="secondary" size="sm" onClick={onOpenTrash}>
            <Trash2 className="w-4 h-4" />{t('browserList.actions.recycleBin')}
          </Button>
          <Button variant="secondary" size="sm" onClick={onOpenSettings}>
            <Sliders className="w-4 h-4" />{t('browserList.actions.basicSettings')}
          </Button>
          <div className="flex items-center bg-[var(--color-bg-secondary)] rounded-md border border-[var(--color-border-default)] p-0.5 ml-2">
            <button
              className={`p-1.5 rounded text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors ${viewMode === 'card' ? 'bg-[var(--color-bg-surface)] shadow-sm text-[var(--color-accent)]' : ''}`}
              onClick={() => onViewModeChange('card')}
              title={t('browserList.actions.cardView')}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              className={`p-1.5 rounded text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors ${viewMode === 'table' ? 'bg-[var(--color-bg-surface)] shadow-sm text-[var(--color-accent)]' : ''}`}
              onClick={() => onViewModeChange('table')}
              title={t('browserList.actions.tableView')}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
          <span className="w-px h-4 bg-[var(--color-border-muted)] mx-1 self-center"></span>
          <Link to="/browser/edit/new">
            <Button size="sm">
              <Play className="w-4 h-4" />{t('browserList.actions.newConfig')}
            </Button>
          </Link>
        </div>
      </div>

      {!headerCollapsed && (
        <InstanceFilterBar
          filters={filters}
          onChange={onFiltersChange}
          proxies={proxies}
          cores={cores}
          allTags={allTags}
          groups={groups}
        />
      )}
    </>
  )
}

interface BrowserListSettingsModalProps {
  open: boolean
  settings: BrowserSettings
  fingerprintText: string
  launchText: string
  startUrlsText: string
  savingSettings: boolean
  cores: BrowserCore[]
  onClose: () => void
  onSave: () => void
  onSettingsChange: (patch: Partial<BrowserSettings>) => void
  onFingerprintTextChange: (next: string) => void
  onLaunchTextChange: (next: string) => void
  onStartUrlsTextChange: (next: string) => void
  onAddCore: () => void
  onEditCore: (core: BrowserCore) => void
  onDeleteCore: (coreId: string) => void
  onSetDefaultCore: (coreId: string) => void
}

export function BrowserListSettingsModal({
  open,
  settings,
  fingerprintText,
  launchText,
  startUrlsText,
  savingSettings,
  cores,
  onClose,
  onSave,
  onSettingsChange,
  onFingerprintTextChange,
  onLaunchTextChange,
  onStartUrlsTextChange,
  onAddCore,
  onEditCore,
  onDeleteCore,
  onSetDefaultCore,
}: BrowserListSettingsModalProps) {
  const { t } = useI18n()
  const coreColumns: TableColumn<BrowserCore>[] = [
    { key: 'coreName', title: t('browserList.columns.name') },
    { key: 'corePath', title: t('browserList.columns.path') },
    {
      key: 'isDefault',
      title: t('browserList.columns.default'),
      render: (value) => (value ? <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" /> : null),
    },
    {
      key: 'actions',
      title: t('browserList.columns.actions'),
      align: 'right',
      render: (_, record) => (
        <div className="flex justify-end gap-1">
          {!record.isDefault && (
            <Button size="sm" variant="ghost" onClick={() => onSetDefaultCore(record.coreId)} title={t('browserList.actions.setDefault')}>
              <Star className="w-4 h-4" />
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={() => onEditCore(record)} title={t('browserList.actions.edit')}>
            <Edit2 className="w-4 h-4" />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => onDeleteCore(record.coreId)} title={t('common.actions.delete')}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('browserList.actions.basicSettings')}
      width="700px"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>{t('common.actions.cancel')}</Button>
          <Button onClick={onSave} loading={savingSettings}>{t('common.actions.save')}</Button>
        </>
      }
    >
      <div className="space-y-6">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-[var(--color-text-primary)]">{t('core.title')}</span>
            <div className="flex gap-2">
              <Button size="sm" onClick={onAddCore}>
                <Plus className="w-4 h-4" />{t('core.actions.add')}
              </Button>
            </div>
          </div>
          <Card padding="none">
            <Table columns={coreColumns} data={cores} rowKey="coreId" />
          </Card>
        </div>

        <FormItem label={t('core.userDataRoot')}>
          <Input
            value={settings.userDataRoot}
            onChange={(event) => onSettingsChange({ userDataRoot: event.target.value })}
            placeholder="data"
          />
        </FormItem>
        <FormItem label={t('browserList.settingsModal.defaultFingerprintArgsLines')}>
          <Textarea
            value={fingerprintText}
            onChange={(event) => onFingerprintTextChange(event.target.value)}
            rows={3}
            placeholder="--fingerprint-brand=Chrome"
          />
        </FormItem>
        <FormItem label={t('browserList.settingsModal.defaultLaunchArgsLines')}>
          <Textarea
            value={launchText}
            onChange={(event) => onLaunchTextChange(event.target.value)}
            rows={3}
            placeholder="--disable-sync"
          />
        </FormItem>
        <FormItem label={t('browserList.settingsModal.defaultStartUrlsLines')} hint={t('browserList.settingsModal.startUrlsHint')}>
          <Textarea
            value={startUrlsText}
            onChange={(event) => onStartUrlsTextChange(event.target.value)}
            rows={4}
            placeholder={t('core.modals.startUrlPlaceholder')}
          />
        </FormItem>
        <FormItem label={t('browserList.settingsModal.restoreTabsLabel')} hint={t('browserList.settingsModal.restoreTabsHint')}>
          <div className="flex items-center justify-between rounded-lg border border-[var(--color-border-default)] px-3 py-2">
            <div>
              <p className="text-sm text-[var(--color-text-primary)]">{t('browserList.settingsModal.allowRestoreOldTabs')}</p>
              <p className="text-xs text-[var(--color-text-muted)] mt-1">{t('browserList.settingsModal.restoreOldTabsDescription')}</p>
            </div>
            <Switch
              checked={settings.restoreLastSession}
              onChange={(checked) => onSettingsChange({ restoreLastSession: checked })}
            />
          </div>
        </FormItem>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormItem label={t('browserList.settingsModal.readyTimeoutLabel')} hint={t('browserList.settingsModal.readyTimeoutHint')}>
            <Input
              type="number"
              min={1000}
              step={500}
              value={settings.startReadyTimeoutMs}
              onChange={(event) =>
                onSettingsChange({
                  startReadyTimeoutMs: Math.max(1000, Number(event.target.value) || 3000),
                })
              }
              placeholder="3000"
            />
          </FormItem>
          <FormItem label={t('browserList.settingsModal.stableWindowLabel')} hint={t('browserList.settingsModal.stableWindowHint')}>
            <Input
              type="number"
              min={0}
              step={100}
              value={settings.startStableWindowMs}
              onChange={(event) =>
                onSettingsChange({
                  startStableWindowMs: Math.max(0, Number(event.target.value) || 1200),
                })
              }
              placeholder="1200"
            />
          </FormItem>
        </div>
      </div>
    </Modal>
  )
}

interface BrowserCoreEditorModalProps {
  open: boolean
  coreForm: BrowserCoreInput
  coreValidation: { valid: boolean; message: string } | null
  savingCore: boolean
  onClose: () => void
  onSave: () => void
  onValidate: () => void
  onCoreFormChange: (patch: Partial<BrowserCoreInput>) => void
}

export function BrowserCoreEditorModal({
  open,
  coreForm,
  coreValidation,
  savingCore,
  onClose,
  onSave,
  onValidate,
  onCoreFormChange,
}: BrowserCoreEditorModalProps) {
  const { t } = useI18n()
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={coreForm.coreId ? t('core.modals.editCore') : t('core.modals.addCore')}
      width="500px"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>{t('common.actions.cancel')}</Button>
          <Button onClick={onSave} loading={savingCore}>{t('common.actions.save')}</Button>
        </>
      }
    >
      <div className="space-y-4">
        <FormItem label={t('core.coreName')} required>
          <Input
            value={coreForm.coreName}
            onChange={(event) => onCoreFormChange({ coreName: event.target.value })}
            placeholder="Chrome 142"
          />
        </FormItem>
        <FormItem label={t('core.corePath')} required>
          <div className="flex gap-2">
            <Input
              value={coreForm.corePath}
              onChange={(event) => onCoreFormChange({ corePath: event.target.value })}
              placeholder={t('browserList.settingsModal.corePathPlaceholder')}
              className="flex-1"
            />
            <Button variant="secondary" onClick={onValidate}>{t('browserList.actions.validate')}</Button>
          </div>
          {coreValidation && (
            <div className={`flex items-center gap-1 mt-1 text-sm ${coreValidation.valid ? 'text-green-600' : 'text-red-600'}`}>
              {coreValidation.valid ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
              {coreValidation.message}
            </div>
          )}
        </FormItem>
      </div>
    </Modal>
  )
}
