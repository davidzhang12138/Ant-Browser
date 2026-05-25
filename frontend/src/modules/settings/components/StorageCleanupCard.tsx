import { useState } from 'react'
import { Database, HardDrive, RefreshCw, Trash2 } from 'lucide-react'
import { Button, Card, Modal } from '../../../shared/components'
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
  return (
    <div className="rounded-lg border border-[var(--color-border-default)] px-4 py-3">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <HardDrive className="h-4 w-4 text-[var(--color-text-muted)] shrink-0" />
            <span className="text-sm font-medium text-[var(--color-text-primary)]">{item.label}</span>
            <span className={`text-xs ${item.exists ? 'text-[var(--color-success)]' : 'text-[var(--color-text-muted)]'}`}>
              {item.exists ? '存在' : '未发现'}
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
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">{item.cleanable ? '可清理' : '保留'}</p>
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
  const [pendingAction, setPendingAction] = useState<'legacy' | 'browser' | null>(null)
  const actionRunning = busy === 'legacy' || busy === 'browser'
  const legacyDisabled = actionRunning
  const browserDisabled = actionRunning
  const confirmLegacy = pendingAction === 'legacy'
  const confirmTitle = confirmLegacy ? '确认清理旧缓存' : '确认清理实例缓存'

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
        title="存储清理"
        subtitle="清理旧缓存目录和当前实例的浏览器缓存；不会删除账号、Cookies、Local Storage 或密码库"
        actions={
          <Button variant="secondary" size="sm" onClick={onRefresh} loading={busy === 'refresh'} disabled={actionRunning}>
            <RefreshCw className="h-4 w-4" />
            重新扫描
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
                  <p className="text-sm font-medium text-[var(--color-text-primary)]">当前实例浏览器缓存</p>
                </div>
                <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                  已扫描 {overview.currentProfileCount} 个数据目录，预计可清理 {formatBytes(overview.currentCacheBytes)}
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
                  清理实例缓存
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => setPendingAction('legacy')}
                  loading={busy === 'legacy'}
                  disabled={legacyDisabled}
                >
                  <Trash2 className="h-4 w-4" />
                  清理旧缓存
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
            <Button variant="secondary" onClick={() => setPendingAction(null)}>取消</Button>
            <Button variant={confirmLegacy ? 'danger' : 'primary'} onClick={handleConfirm}>
              确认清理
            </Button>
          </>
        }
      >
        {confirmLegacy ? (
          <div className="space-y-3 text-sm text-[var(--color-text-secondary)]">
            <p>即将清理旧版本或旧运行方式遗留的缓存目录。</p>
            <p className="break-all rounded-md bg-[var(--color-bg-secondary)] px-3 py-2 text-xs text-[var(--color-text-muted)]">
              {overview.legacyCacheRoot.path || '~/Library/Caches/ant-browser'}
            </p>
            <p className="text-xs text-[var(--color-warning)]">
              后端会再次校验该目录不是当前实例数据目录，校验不通过会拒绝清理。
            </p>
          </div>
        ) : (
          <div className="space-y-3 text-sm text-[var(--color-text-secondary)]">
            <p>即将清理当前实例目录内的浏览器缓存文件。</p>
            <p className="text-xs text-[var(--color-text-muted)]">
              只清理 Cache、Code Cache、ShaderCache 等缓存目录；不会删除 Cookies、Local Storage、账号密码或实例配置。正在运行的实例会跳过。
            </p>
          </div>
        )}
      </Modal>
    </>
  )
}
