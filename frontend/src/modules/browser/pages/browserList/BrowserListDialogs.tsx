import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'
import { AlertTriangle, Clock3, FolderTree, HardDrive, KeyRound, Network, RefreshCw, RotateCcw, ShieldCheck, Tags, Trash2, User, XCircle } from 'lucide-react'
import { Button, FormItem, Input, Modal } from '../../../../shared/components'
import { KeywordsModal } from '../../components/KeywordsModal'
import type { BrowserCore, BrowserGroupWithCount, BrowserProfile, BrowserProxy } from '../../types'

interface BrowserListDialogsProps {
  proxyErrorModal: boolean
  pendingStartId: string | null
  proxyErrorMsg: string
  onCloseProxyError: () => void
  onStartDirect: () => void
  startingDirect: boolean
  kwModal: { open: boolean; profile: BrowserProfile | null }
  onCloseKeywords: () => void
  onKeywordsSaved: (keywords: string[]) => void
  copyModal: { open: boolean; profile: BrowserProfile | null }
  copyName: string
  onCopyNameChange: (value: string) => void
  onCloseCopy: () => void
  onConfirmCopy: () => void
  copying: boolean
  deleteModal: { open: boolean; ids: string[]; names: string[] }
  deleting: boolean
  onCloseDelete: () => void
  onConfirmDelete: (skipTrash: boolean) => void
  trashOpen: boolean
  trashProfiles: BrowserProfile[]
  trashCores: BrowserCore[]
  trashProxies: BrowserProxy[]
  trashGroups: BrowserGroupWithCount[]
  trashLoading: boolean
  trashActionId: string | null
  onCloseTrash: () => void
  onRefreshTrash: () => void
  onRestoreTrash: (profileId: string) => void
  onDeleteForeverTrash: (profileId: string) => void
  opError: string
  onCloseOpError: () => void
}

const formatTrashTime = (value?: string) => {
  if (!value) return '-'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString('zh-CN')
}

const getTrashDaysLeft = (value?: string) => {
  if (!value) return '-'
  const timestamp = new Date(value).getTime()
  if (Number.isNaN(timestamp)) return '-'
  const diff = timestamp - Date.now()
  if (diff <= 0) return '已到期'
  const days = Math.ceil(diff / (24 * 60 * 60 * 1000))
  return `${days} 天`
}

const getTrashStatusTone = (value?: string) => {
  if (!value) return 'border-[var(--color-border-muted)] bg-[var(--color-bg-muted)] text-[var(--color-text-muted)]'
  const timestamp = new Date(value).getTime()
  if (Number.isNaN(timestamp)) return 'border-[var(--color-border-muted)] bg-[var(--color-bg-muted)] text-[var(--color-text-muted)]'
  const diff = timestamp - Date.now()
  if (diff <= 0) return 'border-red-200 bg-red-50 text-red-700'
  const days = Math.ceil(diff / (24 * 60 * 60 * 1000))
  if (days <= 3) return 'border-amber-200 bg-amber-50 text-amber-700'
  return 'border-[var(--color-border-muted)] bg-[var(--color-bg-muted)] text-[var(--color-text-primary)]'
}

const formatTrashValue = (value?: string) => {
  const text = (value || '').trim()
  return text || '-'
}

function resolveTrashCoreLabel(profile: BrowserProfile, cores: BrowserCore[]) {
  const coreId = (profile.coreId || '').trim()
  const defaultCore = cores.find(core => core.isDefault) || cores[0]
  if (!coreId || /^default$/i.test(coreId)) return defaultCore?.coreName || '默认内核'
  return cores.find(core => core.coreId === coreId)?.coreName || coreId
}

function resolveTrashGroupLabel(profile: BrowserProfile, groups: BrowserGroupWithCount[]) {
  const groupId = (profile.groupId || '').trim()
  if (!groupId) return '未分组'
  return groups.find(group => group.groupId === groupId)?.groupName || groupId
}

function resolveTrashProxyLabel(profile: BrowserProfile, proxies: BrowserProxy[]) {
  const bindName = (profile.proxyBindName || '').trim()
  if (bindName) return bindName
  const proxyId = (profile.proxyId || '').trim()
  if (proxyId) {
    return proxies.find(proxy => proxy.proxyId === proxyId)?.proxyName || proxyId
  }
  const proxyConfig = (profile.proxyConfig || '').trim()
  return proxyConfig ? maskProxyConfig(proxyConfig) : '未配置代理'
}

function maskProxyConfig(value: string) {
  const text = value.trim()
  if (!text) return ''
  try {
    const parsed = new URL(text)
    parsed.username = parsed.username ? '***' : ''
    parsed.password = ''
    return parsed.toString()
  } catch {
    return text
      .replace(/(\/\/)[^/@\s]+@/g, '$1***@')
      .replace(/(password|passwd|pwd)\s*[:=]\s*[^,\s}]+/gi, '$1=***')
      .slice(0, 120)
  }
}

function compactTrashPath(value?: string) {
  const text = (value || '').trim()
  if (!text) return '-'
  const parts = text.split(/[\\/]+/).filter(Boolean)
  if (parts.length <= 2) return text
  return `.../${parts.slice(-2).join('/')}`
}

function summarizeTrashWarning(profile: BrowserProfile) {
  if (profile.lastError) return '存在最近错误'
  if (profile.runtimeWarning) return '存在运行提示'
  return ''
}

function trashPlatformLabel(profile: BrowserProfile) {
  if (!profile.platform || profile.platform === 'none') return '无平台'
  return profile.platformName || profile.platform
}

function TrashInfoItem({
  icon,
  label,
  value,
  title,
}: {
  icon: ReactNode
  label: string
  value: ReactNode
  title?: string
}) {
  return (
    <div className="min-w-0 rounded-md border border-[var(--color-border-muted)] bg-[var(--color-bg-secondary)] px-3 py-2">
      <div className="mb-1 flex items-center gap-1.5 text-[11px] font-medium text-[var(--color-text-muted)]">
        {icon}
        <span>{label}</span>
      </div>
      <div className="truncate text-xs text-[var(--color-text-primary)]" title={title}>
        {value}
      </div>
    </div>
  )
}

function TrashChip({ children, title }: { children: ReactNode; title?: string }) {
  return (
    <span
      className="inline-flex max-w-full items-center rounded-md border border-[var(--color-border-muted)] bg-[var(--color-bg-muted)] px-2 py-0.5 text-[11px] text-[var(--color-text-secondary)]"
      title={title}
    >
      <span className="truncate">{children}</span>
    </span>
  )
}

export function BrowserListDialogs({
  proxyErrorModal,
  pendingStartId,
  proxyErrorMsg,
  onCloseProxyError,
  onStartDirect,
  startingDirect,
  kwModal,
  onCloseKeywords,
  onKeywordsSaved,
  copyModal,
  copyName,
  onCopyNameChange,
  onCloseCopy,
  onConfirmCopy,
  copying,
  deleteModal,
  deleting,
  onCloseDelete,
  onConfirmDelete,
  trashOpen,
  trashProfiles,
  trashCores,
  trashProxies,
  trashGroups,
  trashLoading,
  trashActionId,
  onCloseTrash,
  onRefreshTrash,
  onRestoreTrash,
  onDeleteForeverTrash,
  opError,
  onCloseOpError,
}: BrowserListDialogsProps) {
  return (
    <>
      <Modal
        open={proxyErrorModal}
        onClose={onCloseProxyError}
        title="代理链路不可用"
        width="420px"
        footer={
          <>
            <Button variant="secondary" onClick={onCloseProxyError} disabled={startingDirect}>取消</Button>
            {pendingStartId && (
              <Button variant="secondary" onClick={onStartDirect} loading={startingDirect}>
                直连启动
              </Button>
            )}
            {pendingStartId && (
              <Link to={`/browser/edit/${pendingStartId}`}>
                <Button onClick={onCloseProxyError} disabled={startingDirect}>去修改代理</Button>
              </Link>
            )}
          </>
        }
      >
        <div className="space-y-3">
          <div className="flex items-start gap-3 p-3 rounded-lg bg-[var(--color-bg-secondary)]">
            <XCircle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
            <p className="text-sm text-[var(--color-text-primary)]">{proxyErrorMsg}</p>
          </div>
          <p className="text-sm text-[var(--color-text-muted)]">请前往编辑页面重新选择可用链路；如果是订阅导入，先刷新订阅并确认该节点仍存在。</p>
        </div>
      </Modal>

      {kwModal.profile && (
        <KeywordsModal
          open={kwModal.open}
          profileId={kwModal.profile.profileId}
          profileName={kwModal.profile.profileName}
          initialKeywords={kwModal.profile.keywords || []}
          onClose={onCloseKeywords}
          onSaved={onKeywordsSaved}
        />
      )}

      <Modal
        open={copyModal.open}
        onClose={onCloseCopy}
        title="复制实例"
        width="420px"
        footer={
          <>
            <Button variant="secondary" onClick={onCloseCopy}>取消</Button>
            <Button onClick={onConfirmCopy} loading={copying}>确认复制</Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-[var(--color-text-muted)]">
            复制实例将保留原有的代理、内核、启动参数、标签等配置，但会生成新的指纹种子。
          </p>
          <FormItem label="新实例名称" required>
            <Input
              value={copyName}
              onChange={e => onCopyNameChange(e.target.value)}
              placeholder="请输入新实例名称"
              autoFocus
            />
          </FormItem>
        </div>
      </Modal>

      <Modal
        open={deleteModal.open}
        onClose={onCloseDelete}
        title={deleteModal.ids.length > 1 ? `删除 ${deleteModal.ids.length} 个实例` : '删除实例'}
        width="460px"
        footer={
          <>
            <Button variant="secondary" onClick={onCloseDelete} disabled={deleting}>取消</Button>
            <Button variant="danger" onClick={() => onConfirmDelete(true)} loading={deleting}>
              不入回收站，彻底删除
            </Button>
            <Button onClick={() => onConfirmDelete(false)} loading={deleting}>
              移入回收站
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-[var(--color-text-secondary)]">
            默认移入回收站并保留 30 天，期间可恢复；选择彻底删除会同时删除实例数据目录，无法恢复。
          </p>
          <div className="max-h-32 overflow-auto rounded-md border border-[var(--color-border-default)] bg-[var(--color-bg-secondary)] p-2">
            {deleteModal.names.slice(0, 8).map((name, index) => (
              <div key={`${name}-${index}`} className="truncate text-xs text-[var(--color-text-primary)]">{name}</div>
            ))}
            {deleteModal.names.length > 8 && (
              <div className="text-xs text-[var(--color-text-muted)]">另有 {deleteModal.names.length - 8} 个实例</div>
            )}
          </div>
        </div>
      </Modal>

      <Modal
        open={trashOpen}
        onClose={onCloseTrash}
        title="回收站"
        width="1120px"
        footer={
          <>
            <Button variant="secondary" onClick={onRefreshTrash} loading={trashLoading}>
              <RefreshCw className="w-4 h-4" />刷新
            </Button>
            <Button onClick={onCloseTrash}>关闭</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-[1fr_180px]">
            <div className="rounded-lg border border-[var(--color-border-muted)] bg-[var(--color-bg-secondary)] px-4 py-3">
              <div className="text-sm font-medium text-[var(--color-text-primary)]">保留策略</div>
              <div className="mt-1 text-xs leading-5 text-[var(--color-text-muted)]">
                删除后默认保留 30 天；到期或手动彻底删除时，会删除实例配置、启动码和用户数据目录。
              </div>
            </div>
            <div className="rounded-lg border border-[var(--color-border-muted)] bg-[var(--color-bg-secondary)] px-4 py-3">
              <div className="text-sm font-medium text-[var(--color-text-primary)]">当前数量</div>
              <div className="mt-1 flex items-end gap-2">
                <span className="text-2xl font-semibold text-[var(--color-text-primary)]">{trashProfiles.length}</span>
                <span className="pb-1 text-xs text-[var(--color-text-muted)]">个待处理实例</span>
              </div>
            </div>
          </div>

          <div className="max-h-[460px] overflow-auto rounded-lg border border-[var(--color-border-default)] bg-[var(--color-bg-surface)]">
            {trashLoading ? (
              <div className="py-12 text-center text-sm text-[var(--color-text-muted)]">加载中...</div>
            ) : trashProfiles.length === 0 ? (
              <div className="py-12 text-center text-sm text-[var(--color-text-muted)]">回收站为空</div>
            ) : (
              <div className="divide-y divide-[var(--color-border-muted)]">
                {trashProfiles.map((profile) => {
                  const platform = trashPlatformLabel(profile)
                  const groupLabel = resolveTrashGroupLabel(profile, trashGroups)
                  const proxyLabel = resolveTrashProxyLabel(profile, trashProxies)
                  const coreLabel = resolveTrashCoreLabel(profile, trashCores)
                  const tags = profile.tags || []
                  const keywords = profile.keywords || []
                  const hasWarning = Boolean(profile.lastError || profile.runtimeWarning)
                  const warningSummary = summarizeTrashWarning(profile)

                  return (
                    <div key={profile.profileId} className="grid gap-4 px-4 py-4 xl:grid-cols-[minmax(220px,1fr)_minmax(0,2.2fr)_156px]">
                      <div className="min-w-0">
                        <div className="flex items-start gap-3">
                          <div
                            className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-xs font-semibold text-white shadow-[var(--shadow-sm)]"
                            style={{ background: profile.iconColor || '#64748b' }}
                          >
                            {profile.id || profile.profileName.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold text-[var(--color-text-primary)]" title={profile.profileName}>
                              {profile.profileName}
                            </div>
                            <div className="mt-1 truncate text-xs text-[var(--color-text-muted)]" title={profile.profileId}>
                              ID {profile.profileId}
                            </div>
                          </div>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-1.5">
                          <TrashChip title={groupLabel}>{groupLabel}</TrashChip>
                          <TrashChip>{profile.running ? '删除时运行中' : '删除时已停止'}</TrashChip>
                          {profile.debugPort ? <TrashChip title={`调试端口 ${profile.debugPort}`}>端口 {profile.debugPort}</TrashChip> : null}
                        </div>

                        {hasWarning && (
                          <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">
                            <div className="flex items-start gap-2">
                              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                              <span>{warningSummary}</span>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 space-y-3">
                        <div className="grid gap-2 md:grid-cols-3">
                          <TrashInfoItem
                            icon={<User className="h-3.5 w-3.5" />}
                            label="账号"
                            value={formatTrashValue(profile.username || profile.profileName)}
                            title={profile.username || profile.profileName}
                          />
                          <TrashInfoItem
                            icon={<KeyRound className="h-3.5 w-3.5" />}
                            label="密码 / 2FA"
                            value={`${profile.password ? '密码已配置' : '无密码'} · ${profile.twoFaSecret ? '2FA已配置' : '无2FA'}`}
                          />
                          <TrashInfoItem
                            icon={<ShieldCheck className="h-3.5 w-3.5" />}
                            label="平台"
                            value={platform}
                            title={profile.platformUrl || platform}
                          />
                        </div>

                        <div className="grid gap-2 md:grid-cols-3">
                          <TrashInfoItem
                            icon={<HardDrive className="h-3.5 w-3.5" />}
                            label="内核"
                            value={coreLabel}
                            title={coreLabel}
                          />
                          <TrashInfoItem
                            icon={<Network className="h-3.5 w-3.5" />}
                            label="代理"
                            value={proxyLabel}
                            title={proxyLabel}
                          />
                          <TrashInfoItem
                            icon={<FolderTree className="h-3.5 w-3.5" />}
                            label="数据目录"
                            value={compactTrashPath(profile.userDataDir)}
                          />
                        </div>

                        <div className="grid gap-2 text-xs text-[var(--color-text-secondary)] md:grid-cols-4">
                          <div><span className="text-[var(--color-text-muted)]">创建</span><br />{formatTrashTime(profile.createdAt)}</div>
                          <div><span className="text-[var(--color-text-muted)]">更新</span><br />{formatTrashTime(profile.updatedAt)}</div>
                          <div><span className="text-[var(--color-text-muted)]">最后打开</span><br />{formatTrashTime(profile.lastStartAt)}</div>
                          <div><span className="text-[var(--color-text-muted)]">最后停止</span><br />{formatTrashTime(profile.lastStopAt)}</div>
                        </div>

                        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--color-text-muted)]">
                            <Tags className="h-3.5 w-3.5" />标签/关键字
                          </span>
                          {tags.length === 0 && keywords.length === 0 ? (
                            <span className="text-[11px] text-[var(--color-text-muted)]">未设置</span>
                          ) : (
                            <>
                              {tags.slice(0, 3).map(tag => <TrashChip key={`tag-${tag}`} title={tag}>{tag}</TrashChip>)}
                              {keywords.slice(0, 3).map(keyword => <TrashChip key={`kw-${keyword}`} title={keyword}>{keyword}</TrashChip>)}
                              {tags.length + keywords.length > 6 && <TrashChip>+{tags.length + keywords.length - 6}</TrashChip>}
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col justify-between gap-3 xl:items-end">
                        <div className="grid grid-cols-2 gap-2 text-xs xl:w-full xl:grid-cols-1">
                          <div className="rounded-md border border-[var(--color-border-muted)] px-3 py-2">
                            <div className="text-[var(--color-text-muted)]">删除时间</div>
                            <div className="mt-1 text-[var(--color-text-primary)]">{formatTrashTime(profile.deletedAt)}</div>
                          </div>
                          <div className="rounded-md border border-[var(--color-border-muted)] px-3 py-2">
                            <div className="text-[var(--color-text-muted)]">到期时间</div>
                            <div className="mt-1 text-[var(--color-text-primary)]">{formatTrashTime(profile.deleteAfterAt)}</div>
                          </div>
                        </div>
                        <div className={`inline-flex w-fit items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${getTrashStatusTone(profile.deleteAfterAt)}`}>
                          <Clock3 className="h-3.5 w-3.5" />
                          剩余 {getTrashDaysLeft(profile.deleteAfterAt)}
                        </div>
                        <div className="flex flex-wrap justify-end gap-2">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => onRestoreTrash(profile.profileId)}
                            loading={trashActionId === profile.profileId}
                            disabled={Boolean(trashActionId && trashActionId !== profile.profileId)}
                            className="whitespace-nowrap"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />恢复
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => onDeleteForeverTrash(profile.profileId)}
                            loading={trashActionId === profile.profileId}
                            disabled={Boolean(trashActionId && trashActionId !== profile.profileId)}
                            className="whitespace-nowrap"
                          >
                            <Trash2 className="w-3.5 h-3.5" />彻底删除
                          </Button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </Modal>

      <Modal
        open={!!opError}
        onClose={onCloseOpError}
        title="操作失败"
        width="420px"
        footer={<Button onClick={onCloseOpError}>知道了</Button>}
      >
        <div className="text-[var(--color-text-secondary)] whitespace-pre-line">{opError}</div>
      </Modal>
    </>
  )
}
