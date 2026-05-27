import { useEffect, useRef, useState } from 'react'
import { Save, RotateCcw } from 'lucide-react'
import { Card, Button, FormItem, Input, Select, Switch, ThemeSwitcher, toast } from '../../shared/components'
import {
  fetchSettings,
  saveSettings,
  resetSettings,
  initializeSystemData,
  exportSystemConfig,
  importSystemConfig,
  fetchStorageCleanupOverview,
  clearLegacyCacheRoot,
  clearCurrentBrowserCaches,
  fetchAutomationState,
  saveAutomationScriptPackageSettings,
  saveAutomationSettings,
  saveAutomationRuntimeSettings,
  installAutomationRuntime,
  automationProbeSystemNode,
  automationRuntimeSelfCheck,
  defaultAutomationState,
  defaultStorageCleanupOverview,
} from './api'
import type { AppSettings } from './types'
import type { AutomationNodeSource, AutomationRuntimeCheck, AutomationState, AutomationSystemNodeProbe, StorageCleanupOverview } from './api'
import { defaultSettings } from './types'
import { AutomationSettingsCard } from './components/AutomationSettingsCard'
import { BackupImportModal, BackupSettingsCard } from './components/BackupSettingsCard'
import { StorageCleanupCard } from './components/StorageCleanupCard'
import type { AutomationRuntimeProgress, BackupExportLogItem, BackupExportProgress } from './progress'
import { useSettingsProgressEffects } from './hooks/useSettingsProgressEffects'
import { normalizeLanguage, useI18n } from '../../shared/i18n'

export function SettingsPage() {
  const { t, setLanguage, supportedLanguages } = useI18n()
  const [settings, setSettings] = useState<AppSettings>(defaultSettings)
  const [automationState, setAutomationState] = useState<AutomationState>(defaultAutomationState)
  const [storageOverview, setStorageOverview] = useState<StorageCleanupOverview>(defaultStorageCleanupOverview)
  const [automationProgress, setAutomationProgress] = useState<AutomationRuntimeProgress | null>(null)
  const [automationBusy, setAutomationBusy] = useState<'none' | 'toggle' | 'probe' | 'runtime' | 'package' | 'install' | 'check'>('none')
  const [automationCheck, setAutomationCheck] = useState<AutomationRuntimeCheck | null>(null)
  const [automationProbe, setAutomationProbe] = useState<AutomationSystemNodeProbe | null>(null)
  const [automationNodeSourceDraft, setAutomationNodeSourceDraft] = useState<AutomationNodeSource>('auto')
  const [automationSystemNodePathDraft, setAutomationSystemNodePathDraft] = useState('')
  const [automationRuntimeDirty, setAutomationRuntimeDirty] = useState(false)
  const [storageScanLoading, setStorageScanLoading] = useState(false)
  const [storageActionLoading, setStorageActionLoading] = useState<'none' | 'legacy' | 'browser'>('none')
  const [storageScanned, setStorageScanned] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [actionLoading, setActionLoading] = useState<'none' | 'init' | 'export' | 'import-reset' | 'import-merge'>('none')
  const [exportProgress, setExportProgress] = useState<BackupExportProgress | null>(null)
  const [importProgress, setImportProgress] = useState<BackupExportProgress | null>(null)
  const [exportLogs, setExportLogs] = useState<BackupExportLogItem[]>([])
  const exportLogsRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    loadSettings()
  }, [])

  useEffect(() => {
    if (!loading && !storageScanned && !storageScanLoading) {
      void refreshStorageOverview()
    }
  }, [loading, storageScanLoading, storageScanned])

  useSettingsProgressEffects({
    actionLoading,
    exportLogs,
    exportLogsRef,
    importProgress,
    setAutomationProgress,
    setAutomationState,
    setExportLogs,
    setExportProgress,
    setImportProgress,
  })

  useEffect(() => {
    setAutomationNodeSourceDraft((automationState.settings.nodeSource || 'auto') as AutomationNodeSource)
    setAutomationSystemNodePathDraft(automationState.settings.systemNodePath || '')
    setAutomationProbe(null)
    setAutomationRuntimeDirty(false)
  }, [automationState.settings.nodeSource, automationState.settings.systemNodePath])

  const loadSettings = async () => {
    setLoading(true)
    try {
      const [data, automation] = await Promise.all([
        fetchSettings(),
        fetchAutomationState(),
      ])
      setSettings({ ...data, language: normalizeLanguage(data.language) })
      setAutomationState(automation)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }))
    setHasChanges(true)
  }

  const handleLanguageChange = (value: string) => {
    const language = normalizeLanguage(value)
    setLanguage(language)
    handleChange('language', language)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const success = await saveSettings(settings)
      if (success) {
        setHasChanges(false)
        toast.success(t('settings.messages.saved'))
      }
    } catch (error: any) {
      toast.error(error?.message || t('settings.messages.saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  const handleReset = async () => {
    if (confirm(t('settings.messages.resetConfirm'))) {
      const data = await resetSettings()
      const language = normalizeLanguage(data.language)
      setLanguage(language)
      setSettings({ ...data, language })
      setHasChanges(false)
    }
  }

  const handleAutomationEnabledChange = async (enabled: boolean) => {
    setAutomationBusy('toggle')
    setAutomationCheck(null)
    try {
      const next = await saveAutomationSettings(enabled, automationState.settings.headlessDefault)
      setAutomationState(next)
      if (!enabled) {
        setAutomationProgress(null)
        toast.success('自动化支持已关闭')
        return
      }
      if (!next.status.ready) {
        setAutomationProgress({
          phase: 'checking',
          progress: 0,
          message: '已开启自动化支持，正在准备运行时...',
        })
        toast.success('自动化支持已开启，正在准备运行时')
        return
      }
      toast.success('自动化支持已开启')
    } catch (error: any) {
      toast.error(error?.message || '自动化配置保存失败')
    } finally {
      setAutomationBusy('none')
    }
  }

  const handleAutomationHeadlessChange = async (headlessDefault: boolean) => {
    setAutomationBusy('toggle')
    try {
      const next = await saveAutomationSettings(automationState.settings.enabled, headlessDefault)
      setAutomationState(next)
      toast.success(headlessDefault ? '默认无头模式已开启' : '默认无头模式已关闭')
    } catch (error: any) {
      toast.error(error?.message || '自动化配置保存失败')
    } finally {
      setAutomationBusy('none')
    }
  }

  const handleAutomationRuntimeSettingsSave = async () => {
    setAutomationBusy('runtime')
    setAutomationCheck(null)
    try {
      const next = await saveAutomationRuntimeSettings(automationNodeSourceDraft, automationSystemNodePathDraft)
      setAutomationState(next)
      setAutomationRuntimeDirty(false)

      if (next.settings.enabled && next.status.installing) {
        setAutomationProgress({
          phase: 'checking',
          progress: 0,
          message: '运行时策略已保存，正在重新检查自动化运行时...',
        })
        toast.success('运行时策略已保存，正在重新检查')
        return
      }

      toast.success('运行时策略已保存')
    } catch (error: any) {
      toast.error(error?.message || '运行时策略保存失败')
    } finally {
      setAutomationBusy('none')
    }
  }

  const handleAutomationTypeScriptBuildChange = async (allowTypeScriptBuild: boolean) => {
    setAutomationBusy('package')
    try {
      const next = await saveAutomationScriptPackageSettings(allowTypeScriptBuild)
      setAutomationState(next)
      toast.success(allowTypeScriptBuild ? 'TypeScript 导入构建已开启' : 'TypeScript 导入构建已关闭')
    } catch (error: any) {
      toast.error(error?.message || '脚本包配置保存失败')
    } finally {
      setAutomationBusy('none')
    }
  }

  const handleAutomationProbeSystemNode = async () => {
    setAutomationBusy('probe')
    try {
      const result = await automationProbeSystemNode(automationSystemNodePathDraft)
      setAutomationProbe(result)
      toast.success(`系统 Node 可用：${result.version}`)
    } catch (error: any) {
      setAutomationProbe(null)
      toast.error(error?.message || '系统 Node 检测失败')
    } finally {
      setAutomationBusy('none')
    }
  }

  const handleAutomationInstall = async () => {
    setAutomationBusy('install')
    try {
      const next = await installAutomationRuntime()
      setAutomationState(next)
      setAutomationProgress({
        phase: 'checking',
        progress: 0,
        message: '正在准备自动化运行时...',
      })
      toast.success('已开始准备自动化运行时')
    } catch (error: any) {
      toast.error(error?.message || '启动自动化运行时安装失败')
    } finally {
      setAutomationBusy('none')
    }
  }

  const handleAutomationSelfCheck = async () => {
    setAutomationBusy('check')
    try {
      const result = await automationRuntimeSelfCheck()
      setAutomationCheck(result)
      if (result.ok) {
        toast.success(`自检通过：Node ${result.nodeVersion} / playwright-core ${result.playwrightVersion}`)
      } else {
        toast.warning('自检未通过')
      }
    } catch (error: any) {
      setAutomationCheck(null)
      toast.error(error?.message || '自动化运行时自检失败')
    } finally {
      setAutomationBusy('none')
    }
  }

  const handleInitializeSystem = async () => {
    if (!confirm('初始化会清空当前数据并恢复默认状态，是否继续？')) {
      return
    }
    setActionLoading('init')
    try {
      const res = await initializeSystemData()
      if (res.cancelled) {
        toast.info('已取消初始化')
        return
      }
      toast.success(res.message || '初始化完成')
    } catch (error: any) {
      toast.error(error?.message || '初始化失败')
    } finally {
      setActionLoading('none')
    }
  }

  const handleExportSystem = async () => {
    setActionLoading('export')
    setExportLogs([])
    setExportProgress({ phase: 'starting', progress: 0, message: '准备导出...' })
    try {
      const res = await exportSystemConfig()
      if (res.cancelled) {
        setExportProgress(null)
        setExportLogs([])
        toast.info('已取消导出')
        return
      }
      setExportProgress(prev => prev?.phase === 'done'
        ? prev
        : { phase: 'done', progress: 100, message: res.message || '导出完成' })
      toast.success(res.message || '导出完成')
    } catch (error: any) {
      setExportProgress(prev => ({
        phase: 'error',
        progress: prev?.progress ?? 0,
        message: error?.message || '导出失败',
      }))
      setExportLogs(prev => {
        const timestamp = new Date().toLocaleTimeString('zh-CN', { hour12: false })
        const text = error?.message || '导出失败'
        const next = [...prev, { id: Date.now() + Math.floor(Math.random() * 1000), phase: 'error', time: timestamp, text }]
        return next.length > 120 ? next.slice(next.length - 120) : next
      })
      toast.error(error?.message || '导出失败')
    } finally {
      setActionLoading('none')
    }
  }

  const handleImportSystem = async (resetFirst: boolean) => {
    setActionLoading(resetFirst ? 'import-reset' : 'import-merge')
    setImportProgress({
      phase: 'starting',
      progress: 0,
      message: resetFirst ? '等待选择 ZIP 配置（先初始化后加载）...' : '等待选择 ZIP 配置（判重合并）...',
    })
    try {
      const res = await importSystemConfig(resetFirst)
      if (res.cancelled) {
        setImportProgress(null)
        toast.info('已取消加载')
        return
      }
      const imported = res.imported ?? 0
      const skipped = res.skipped ?? 0
      const conflicts = res.conflicts ?? 0
      const componentFailed = Number.isFinite(res.componentFailed) ? Math.max(0, Math.round(res.componentFailed || 0)) : 0
      const componentTotal = Number.isFinite(res.componentTotal) ? Math.max(0, Math.round(res.componentTotal || 0)) : 0
      const failedComponents = Array.isArray(res.failedComponents) ? res.failedComponents : []

      if (res.partial || componentFailed > 0) {
        const moduleNames = failedComponents
          .map(item => (item?.componentName || item?.componentId || '').trim())
          .filter(Boolean)
        const moduleHint = moduleNames.length > 0
          ? `：${moduleNames.slice(0, 3).join('、')}${moduleNames.length > 3 ? ` 等 ${moduleNames.length} 个模块` : ''}`
          : ''
        if (componentTotal > 0) {
          const componentSuccess = Math.max(0, componentTotal - componentFailed)
          toast.warning(`加载完成（部分成功）：模块成功 ${componentSuccess}/${componentTotal}，异常 ${componentFailed}${moduleHint}`)
        } else {
          toast.warning(`加载完成（部分成功）：异常模块 ${componentFailed}${moduleHint}`)
        }
      } else {
        toast.success(`加载完成：导入 ${imported}，跳过 ${skipped}，冲突 ${conflicts}`)
      }
      setImportModalOpen(false)
      setImportProgress(null)
    } catch (error: any) {
      setImportProgress(prev => ({
        phase: 'error',
        progress: prev?.progress ?? 0,
        message: error?.message || '加载失败',
      }))
      toast.error(error?.message || '加载失败')
    } finally {
      setActionLoading('none')
    }
  }

  const refreshStorageOverview = async () => {
    setStorageScanLoading(true)
    try {
      const overview = await fetchStorageCleanupOverview()
      setStorageOverview(overview)
      setStorageScanned(true)
    } catch (error: any) {
      toast.error(error?.message || '存储扫描失败')
    } finally {
      setStorageScanLoading(false)
    }
  }

  const handleClearLegacyCache = async () => {
    setStorageActionLoading('legacy')
    try {
      const result = await clearLegacyCacheRoot()
      toast.success(result.message || '旧缓存已清理')
      const overview = await fetchStorageCleanupOverview()
      setStorageOverview(overview)
    } catch (error: any) {
      toast.error(error?.message || '旧缓存清理失败')
    } finally {
      setStorageActionLoading('none')
    }
  }

  const handleClearBrowserCaches = async () => {
    setStorageActionLoading('browser')
    try {
      const result = await clearCurrentBrowserCaches()
      toast.success(result.message || '实例缓存已清理')
      const overview = await fetchStorageCleanupOverview()
      setStorageOverview(overview)
    } catch (error: any) {
      toast.error(error?.message || '实例缓存清理失败')
    } finally {
      setStorageActionLoading('none')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-[var(--color-border-default)] border-t-[var(--color-accent)] rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6 w-full animate-fade-in">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">{t('settings.title')}</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">{t('settings.subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={handleReset}>
            <RotateCcw className="w-4 h-4" />
            {t('common.actions.reset')}
          </Button>
          <Button variant="danger" size="sm" onClick={handleSave} loading={saving} disabled={!hasChanges}>
            <Save className="w-4 h-4" />
            {t('common.actions.save')}
          </Button>
        </div>
      </div>

      {/* 主题设置 */}
      <Card title={t('settings.theme.title')} subtitle={t('settings.theme.subtitle')}>
        <ThemeSwitcher />
      </Card>

      {/* 基础设置 */}
      <Card title={t('settings.basic')} subtitle={t('settings.basicSubtitle')}>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormItem label={t('settings.appName')} required>
              <Input
                value={settings.appName}
                onChange={e => handleChange('appName', e.target.value)}
                placeholder={t('settings.placeholders.appName')}
              />
            </FormItem>
            <FormItem label={t('settings.language')}>
              <Select
                value={settings.language}
                onChange={e => handleLanguageChange(e.target.value)}
                options={supportedLanguages.map(language => ({
                  value: language.value,
                  label: language.label,
                }))}
              />
            </FormItem>
          </div>
          <FormItem label={t('settings.appDescription')}>
            <Input
              value={settings.appDescription}
              onChange={e => handleChange('appDescription', e.target.value)}
              placeholder={t('settings.placeholders.appDescription')}
            />
          </FormItem>
        </div>
      </Card>

      {/* 功能设置 */}
      <Card title={t('settings.features')} subtitle={t('settings.featuresSubtitle')}>
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[var(--color-text-primary)]">{t('settings.notifications')}</p>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{t('settings.notificationsDescription')}</p>
            </div>
            <Switch
              checked={settings.enableNotifications}
              onChange={v => handleChange('enableNotifications', v)}
            />
          </div>
          
          <div className="h-px bg-[var(--color-border-muted)]" />
          
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[var(--color-text-primary)]">{t('settings.autoSave')}</p>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{t('settings.autoSaveDescription')}</p>
            </div>
            <Switch
              checked={settings.enableAutoSave}
              onChange={v => handleChange('enableAutoSave', v)}
            />
          </div>
          
          {settings.enableAutoSave && (
            <div className="pl-4 border-l-2 border-[var(--color-border-muted)]">
              <FormItem label={t('settings.autoSaveIntervalSeconds')}>
                <Input
                  type="number"
                  value={settings.autoSaveInterval}
                  onChange={e => handleChange('autoSaveInterval', parseInt(e.target.value) || 30)}
                  min={5}
                  max={300}
                  className="max-w-[120px]"
                />
              </FormItem>
            </div>
          )}
          
          <div className="h-px bg-[var(--color-border-muted)]" />
          
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[var(--color-text-primary)]">{t('settings.cache')}</p>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{t('settings.cacheDescription')}</p>
            </div>
            <Switch
              checked={settings.cacheEnabled}
              onChange={v => handleChange('cacheEnabled', v)}
            />
          </div>
        </div>
      </Card>

      <AutomationSettingsCard
        automationState={automationState}
        automationProgress={automationProgress}
        automationBusy={automationBusy}
        automationCheck={automationCheck}
        automationProbe={automationProbe}
        automationNodeSourceDraft={automationNodeSourceDraft}
        automationSystemNodePathDraft={automationSystemNodePathDraft}
        automationRuntimeDirty={automationRuntimeDirty}
        onEnabledChange={handleAutomationEnabledChange}
        onHeadlessChange={handleAutomationHeadlessChange}
        onNodeSourceDraftChange={(value) => {
          setAutomationNodeSourceDraft(value)
          setAutomationProbe(null)
          setAutomationRuntimeDirty(true)
        }}
        onSystemNodePathDraftChange={(value) => {
          setAutomationSystemNodePathDraft(value)
          setAutomationProbe(null)
          setAutomationRuntimeDirty(true)
        }}
        onTypeScriptBuildChange={handleAutomationTypeScriptBuildChange}
        onProbeSystemNode={() => { void handleAutomationProbeSystemNode() }}
        onSaveRuntimeSettings={() => { void handleAutomationRuntimeSettingsSave() }}
        onInstall={() => { void handleAutomationInstall() }}
        onSelfCheck={() => { void handleAutomationSelfCheck() }}
      />

      <StorageCleanupCard
        overview={storageOverview}
        busy={storageActionLoading !== 'none' ? storageActionLoading : storageScanLoading ? 'refresh' : 'none'}
        onRefresh={() => { void refreshStorageOverview() }}
        onClearLegacy={() => { void handleClearLegacyCache() }}
        onClearBrowserCaches={() => { void handleClearBrowserCaches() }}
      />

      {/* 高级设置 */}
      <Card title={t('settings.advanced')} subtitle={t('settings.advancedSubtitle')}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <FormItem label={t('settings.maxUploadSizeMB')}>
            <Input
              type="number"
              value={settings.maxUploadSize}
              onChange={e => handleChange('maxUploadSize', parseInt(e.target.value) || 10)}
              min={1}
              max={100}
            />
          </FormItem>
          <FormItem label={t('settings.sessionTimeoutMinutes')}>
            <Input
              type="number"
              value={settings.sessionTimeout}
              onChange={e => handleChange('sessionTimeout', parseInt(e.target.value) || 30)}
              min={5}
              max={120}
            />
          </FormItem>
          <FormItem label={t('settings.logLevel')}>
            <Select
              value={settings.logLevel}
              onChange={e => handleChange('logLevel', e.target.value as AppSettings['logLevel'])}
              options={[
                { value: 'debug', label: 'Debug' },
                { value: 'info', label: 'Info' },
                { value: 'warn', label: 'Warning' },
                { value: 'error', label: 'Error' },
              ]}
            />
          </FormItem>
        </div>
      </Card>

      <BackupSettingsCard
        actionLoading={actionLoading}
        exportProgress={exportProgress}
        exportLogs={exportLogs}
        exportLogsRef={exportLogsRef}
        onInitialize={() => { void handleInitializeSystem() }}
        onExport={() => { void handleExportSystem() }}
        onOpenImport={() => {
          setImportProgress(null)
          setImportModalOpen(true)
        }}
      />

      <BackupImportModal
        open={importModalOpen}
        actionLoading={actionLoading}
        importProgress={importProgress}
        onClose={() => {
          setImportModalOpen(false)
          setImportProgress(null)
        }}
        onImport={(resetFirst) => { void handleImportSystem(resetFirst) }}
      />

    </div>
  )
}
