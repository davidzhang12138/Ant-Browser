import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Copy, Key, Play, RotateCcw, Settings, Square, Trash2, Wifi } from 'lucide-react'

import { Badge, Button, Card, Table } from '../../../shared/components'
import type { SortOrder, SorterResult, TableColumn } from '../../../shared/components/Table'
import { useI18n } from '../../../shared/i18n'

import type { BrowserCore, BrowserGroupWithCount, BrowserProfile, BrowserProxy } from '../types'
import type { BrowserViewMode } from './BrowserListLayout'
import { KeywordInlineRow } from './BrowserListWidgets'
import { getBrowserListTableScrollLeft, saveBrowserListTableScrollLeft } from '../utils/listReturnPath'

type ProfileStatusVariant = 'default' | 'success' | 'error' | 'warning' | 'info'

interface ProfileStatus {
  variant: ProfileStatusVariant
  label: string
}

export interface ProfileProxyTestState {
  loading?: boolean
  ok?: boolean
  latencyMs?: number
  error?: string
}

interface BrowserProfilesPanelProps {
  loading: boolean
  viewMode: BrowserViewMode
  profiles: BrowserProfile[]
  totalCount: number
  proxies: BrowserProxy[]
  groups: BrowserGroupWithCount[]
  selectedIds: Set<string>
  serialNumbers: Map<string, number>
  sortColumn: string
  sortOrder: SortOrder
  currentPage: number
  pageSize: number
  resolveProfileCore: (profile: BrowserProfile) => BrowserCore | null
  getProfileCoreLabel: (profile: BrowserProfile) => string
  getProfileStatus: (profile: BrowserProfile) => ProfileStatus
  isProfileStarting: (profileId: string) => boolean
  isProfileStopping: (profileId: string) => boolean
  isProfileBusy: (profileId: string) => boolean
  proxyTestStates: Record<string, ProfileProxyTestState>
  onToggleSelect: (profileId: string) => void
  onSelectAll: () => void
  onDeselectAll: () => void
  onSortChange: (sorter: SorterResult) => void
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
  onStart: (profileId: string) => void
  onStop: (profileId: string) => void
  onRestart: (profileId: string) => void
  onTestProxy: (profile: BrowserProfile) => void
  onOpenKeywords: (profile: BrowserProfile) => void
  onOpenCopy: (profile: BrowserProfile) => void
  onDelete: (profileId: string) => void
}

const formatTime = (value: string | undefined, locale: string) => {
  if (!value) return '-'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString(locale)
}

function formatProxyLabel(profile: BrowserProfile, proxy: BrowserProxy | undefined, t: (key: string) => string): string {
  if (proxy?.proxyName) {
    return proxy.proxyName
  }
  if (profile.proxyId) {
    return profile.proxyId
  }
  const customProxy = (profile.proxyConfig || '').trim()
  if (customProxy) {
    return `${t('browserList.cards.customProxy')}: ${customProxy}`
  }
  return '-'
}

function isDirectProxy(profile: BrowserProfile, proxy?: BrowserProxy) {
  const value = (proxy?.proxyConfig || profile.proxyConfig || '').trim()
  return value === 'direct://'
}

function hasProxyConfig(profile: BrowserProfile, proxy?: BrowserProxy) {
  return Boolean((profile.proxyId || '').trim() || (proxy?.proxyConfig || profile.proxyConfig || '').trim())
}

function ProxyTestStatus({ state }: { state?: ProfileProxyTestState }) {
  const { t } = useI18n()
  if (!state) return null
  if (state.loading) {
    return <span className="text-[11px] text-[var(--color-text-muted)] animate-pulse">{t('proxy.checking')}</span>
  }
  if (state.ok) {
    return <span className="text-[11px] font-medium text-[var(--color-success)]">{state.latencyMs || 0} ms</span>
  }
  return <span className="text-[11px] font-medium text-[var(--color-error)]" title={state.error || t('browserList.proxyTestFailed')}>{t('proxy.failure')}</span>
}

function BrowserProfileCard({
  profile,
  serialNumber,
  proxy,
  groupLabel,
  isSelected,
  status,
  coreLabel,
  isStarting,
  isStopping,
  isBusy,
  proxyTestState,
  onToggleSelect,
  onStart,
  onStop,
  onRestart,
  onTestProxy,
  onOpenKeywords,
  onOpenCopy,
  onDelete,
}: {
  profile: BrowserProfile
  serialNumber: number
  proxy: BrowserProxy | undefined
  groupLabel: string
  isSelected: boolean
  status: ProfileStatus
  coreLabel: string
  isStarting: boolean
  isStopping: boolean
  isBusy: boolean
  proxyTestState?: ProfileProxyTestState
  onToggleSelect: (profileId: string) => void
  onStart: (profileId: string) => void
  onStop: (profileId: string) => void
  onRestart: (profileId: string) => void
  onTestProxy: (profile: BrowserProfile) => void
  onOpenKeywords: (profile: BrowserProfile) => void
  onOpenCopy: (profile: BrowserProfile) => void
  onDelete: (profileId: string) => void
}) {
  const { t, language } = useI18n()
  const proxyLabel = formatProxyLabel(profile, proxy, t)
  return (
    <div
      className={`flex flex-col border rounded-xl bg-[var(--color-bg-surface)] p-3 shadow-[0_1px_4px_rgba(0,0,0,0.08)] transition-all duration-200 h-[320px] overflow-hidden
        ${isSelected ? 'border-[var(--color-accent)] ring-1 ring-[var(--color-accent)]/20' : 'border-[var(--color-border-default)] hover:border-[var(--color-accent)]'}
      `}
    >
      <div className="flex flex-col gap-3 pb-3 border-b border-[var(--color-border-muted)]/50 shrink-0">
        <div className="flex justify-between items-start gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <input
              type="checkbox"
              className="w-4 h-4 rounded cursor-pointer accent-[var(--color-accent)] mt-0.5 shrink-0"
              checked={isSelected}
              onChange={() => onToggleSelect(profile.profileId)}
            />
            <Link className="text-[var(--color-accent)] font-medium text-sm hover:text-[var(--color-accent)] transition-colors truncate max-w-[200px]" to={`/browser/detail/${profile.profileId}`}>
              {profile.profileName}
            </Link>
            <span
              className="max-w-[180px] truncate rounded bg-[var(--color-bg-muted)] px-2 py-0.5 text-xs font-medium text-[var(--color-text-muted)]"
            >
              {t('browserList.columns.serial')} {serialNumber}
            </span>
            {profile.tags && profile.tags.length > 0 && (
              <div className="flex gap-1 ml-1">
                {profile.tags.map(tag => <Badge variant="default" key={tag}>{tag}</Badge>)}
              </div>
            )}
          </div>

          <Badge variant={status.variant} dot dotClassName="w-2 h-2 shrink-0">
            {status.label}
          </Badge>
        </div>

        <div className="flex items-center gap-1 flex-wrap">
          {profile.running ? (
            <Button size="sm" variant="secondary" onClick={() => onStop(profile.profileId)} title={isStopping ? t('browserList.status.stopping') : t('browserList.actions.stop')} loading={isStopping}>
              {!isStopping && <Square className="w-4 h-4 mr-1.5" />}
              {isStopping ? t('browserList.status.stopping') : t('browserList.actions.stop')}
            </Button>
          ) : (
            <Button size="sm" onClick={() => onStart(profile.profileId)} title={isStarting ? t('browserList.status.launching') : t('browserList.actions.launch')} loading={isStarting}>
              {!isStarting && <Play className="w-4 h-4 fill-current mr-1.5" />}
              {isStarting ? t('browserList.status.launching') : t('browserList.actions.launch')}
            </Button>
          )}
          <span className="w-px h-4 bg-[var(--color-border-muted)] mx-1"></span>
          <Button size="sm" variant="ghost" onClick={() => onRestart(profile.profileId)} title={t('browserList.actions.restart')} className="px-3" disabled={isBusy}><RotateCcw className="w-4 h-4 mr-1.5" />{t('browserList.actions.restart')}</Button>
          <Button size="sm" variant="ghost" onClick={() => onOpenKeywords(profile)} title={t('browserList.actions.keywordManagement')} className="px-3" disabled={isBusy}><Key className="w-4 h-4 mr-1.5" />{t('browserList.actions.keywords')}</Button>
          <Link to={`/browser/edit/${profile.profileId}`}><Button size="sm" variant="ghost" title={t('browserList.actions.configure')} className="px-3" disabled={isBusy}><Settings className="w-4 h-4 mr-1.5" />{t('browserList.actions.configure')}</Button></Link>
          <Button size="sm" variant="ghost" onClick={() => onOpenCopy(profile)} title={t('browserList.actions.clone')} className="px-3" disabled={isBusy}><Copy className="w-4 h-4 mr-1.5" />{t('browserList.actions.clone')}</Button>
          <Button size="sm" variant="ghost" onClick={() => onDelete(profile.profileId)} title={t('common.actions.delete')} className="px-3 text-red-500 hover:text-red-600 hover:bg-red-50" disabled={isBusy}><Trash2 className="w-4 h-4 mr-1.5" />{t('common.actions.delete')}</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 py-2 shrink-0">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-[var(--color-text-muted)] font-medium">{t('browserList.columns.coreVersion')}</span>
          <span className="text-xs text-[var(--color-text-primary)]">{coreLabel}</span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-[var(--color-text-muted)] font-medium">{t('browserList.columns.proxyConfig')}</span>
          <div className="flex min-w-0 items-center gap-1.5">
            <span className="min-w-0 flex-1 truncate text-xs text-[var(--color-text-primary)]" title={proxyLabel}>
              {proxyLabel}
            </span>
            <button
              type="button"
              className="shrink-0 rounded p-1 text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-bg-muted)] hover:text-[var(--color-accent)] disabled:cursor-not-allowed disabled:opacity-40"
              onClick={() => onTestProxy(profile)}
              disabled={proxyTestState?.loading || !hasProxyConfig(profile, proxy) || isDirectProxy(profile, proxy)}
              title={isDirectProxy(profile, proxy) ? t('browserList.directProxyNoTest') : t('browserList.cards.proxyTestTitle')}
            >
              <Wifi className="h-3.5 w-3.5" />
            </button>
          </div>
          <ProxyTestStatus state={proxyTestState} />
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-[var(--color-text-muted)] font-medium">{t('browserList.columns.group')}</span>
          <span className="text-xs text-[var(--color-text-primary)] truncate" title={groupLabel}>{groupLabel}</span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-[var(--color-text-muted)] font-medium">{t('browserList.columns.time')}</span>
          <span className="text-xs text-[var(--color-text-primary)]">{t('browserList.cards.created')} {formatTime(profile.createdAt, language)}</span>
          <span className="text-xs text-[var(--color-text-secondary)]">{t('browserList.cards.opened')} {formatTime(profile.lastStartAt, language)}</span>
        </div>
      </div>

      <div className="border-t border-[var(--color-border-muted)]/50 pt-2 flex items-start gap-2 flex-1 min-h-0">
        <span className="text-xs font-medium text-[var(--color-text-primary)] shrink-0 pt-0.5">{t('browserList.columns.systemKeywords')}</span>
        <div className="flex-1 min-h-0 overflow-y-auto pr-1">
          <KeywordInlineRow keywords={profile.keywords || []} />
        </div>
      </div>
    </div>
  )
}

export function BrowserProfilesPanel({
  loading,
  viewMode,
  profiles,
  totalCount,
  proxies,
  groups,
  selectedIds,
  serialNumbers,
  sortColumn,
  sortOrder,
  currentPage,
  pageSize,
  resolveProfileCore,
  getProfileCoreLabel,
  getProfileStatus,
  isProfileStarting,
  isProfileStopping,
  isProfileBusy,
  proxyTestStates,
  onToggleSelect,
  onSelectAll,
  onDeselectAll,
  onSortChange,
  onPageChange,
  onPageSizeChange,
  onStart,
  onStop,
  onRestart,
  onTestProxy,
  onOpenKeywords,
  onOpenCopy,
  onDelete,
}: BrowserProfilesPanelProps) {
  const { t, language } = useI18n()
  const tableScrollRef = useRef<HTMLDivElement | null>(null)
  const didRestoreTableScrollRef = useRef(false)
  const allSelected = totalCount > 0 && selectedIds.size === totalCount
  const partiallySelected = selectedIds.size > 0 && selectedIds.size < totalCount
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  const groupNameById = new Map(groups.map(group => [group.groupId, group.groupName]))
  const getGroupLabel = (profile: BrowserProfile) => {
    if (!profile.groupId) return t('browserList.filters.ungrouped')
    return groupNameById.get(profile.groupId) || profile.groupId
  }

  const columns: TableColumn<BrowserProfile>[] = [
    {
      key: 'selection',
      title: (
        <input
          type="checkbox"
          className="w-4 h-4 rounded cursor-pointer accent-[var(--color-accent)]"
          checked={allSelected}
          ref={(input) => {
            if (input) {
              input.indeterminate = partiallySelected
            }
          }}
          onChange={(event) => {
            if (event.target.checked) {
              onSelectAll()
            } else {
              onDeselectAll()
            }
          }}
        />
      ),
      width: 40,
      render: (_, record) => (
        <input
          type="checkbox"
          className="w-4 h-4 rounded cursor-pointer accent-[var(--color-accent)]"
          checked={selectedIds.has(record.profileId)}
          onChange={() => onToggleSelect(record.profileId)}
        />
      ),
    },
    {
      key: 'serial',
      title: t('browserList.columns.serial'),
      width: 76,
      sortable: true,
      render: (_, record) => (
        <span className="inline-flex min-w-8 items-center justify-center rounded-md bg-[var(--color-bg-muted)] px-2.5 py-1 text-xs font-semibold text-[var(--color-text-primary)]">
          {serialNumbers.get(record.profileId) ?? '-'}
        </span>
      ),
    },
    {
      key: 'profileName',
      title: t('browserList.columns.profileName'),
      width: 180,
      render: (value, record) => (
        <div className="flex flex-col gap-1">
          <Link className="text-[var(--color-accent)] text-sm font-medium hover:underline" to={`/browser/detail/${record.profileId}`}>
            {value}
          </Link>
          {record.tags && record.tags.length > 0 && (
            <div className="flex gap-1 flex-wrap">
              {record.tags.map(tag => <Badge variant="default" key={tag}>{tag}</Badge>)}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'running',
      title: t('browserList.columns.status'),
      width: 92,
      render: (_, record) => {
        const status = getProfileStatus(record)
        return <span className="whitespace-nowrap"><Badge variant={status.variant} dot>{status.label}</Badge></span>
      },
    },
    {
      key: 'groupId',
      title: t('browserList.columns.group'),
      width: 120,
      render: (_, record) => (
        <span className="whitespace-nowrap text-xs text-[var(--color-text-primary)]" title={getGroupLabel(record)}>
          {getGroupLabel(record)}
        </span>
      ),
    },
    {
      key: 'coreId',
      title: t('browserList.columns.core'),
      width: 110,
      render: (_, record) => <span className="whitespace-nowrap text-xs">{getProfileCoreLabel(record)}</span>,
    },
    {
      key: 'proxyId',
      title: t('browserList.columns.proxy'),
      width: 190,
      render: (value, record) => {
        const proxy = proxies.find(item => item.proxyId === value)
        const state = proxyTestStates[record.profileId]
        return (
          <div className="flex min-w-0 flex-col gap-1">
            <div className="flex min-w-0 items-center gap-1.5">
              <span className="min-w-0 flex-1 truncate whitespace-nowrap text-xs" title={formatProxyLabel(record, proxy, t)}>
                {formatProxyLabel(record, proxy, t)}
              </span>
              <button
                type="button"
                className="shrink-0 rounded p-1 text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-bg-muted)] hover:text-[var(--color-accent)] disabled:cursor-not-allowed disabled:opacity-40"
                onClick={(event) => {
                  event.stopPropagation()
                  onTestProxy(record)
                }}
                disabled={state?.loading || !hasProxyConfig(record, proxy) || isDirectProxy(record, proxy)}
                title={isDirectProxy(record, proxy) ? t('browserList.directProxyNoTest') : t('browserList.cards.proxyTestTitle')}
              >
                <Wifi className="h-3.5 w-3.5" />
              </button>
            </div>
            <ProxyTestStatus state={state} />
          </div>
        )
      },
    },
    {
      key: 'keywords',
      title: t('browserList.columns.keywords'),
      width: 200,
      render: (value) => <KeywordInlineRow keywords={value || []} />,
    },
    {
      key: 'createdAt',
      title: t('browserList.columns.createdAt'),
      width: 168,
      sortable: true,
      render: (value) => (
        <span className="whitespace-nowrap text-xs text-[var(--color-text-secondary)]">{formatTime(value, language)}</span>
      ),
    },
    {
      key: 'lastStartAt',
      title: t('browserList.columns.lastStartAt'),
      width: 176,
      sortable: true,
      render: (value) => (
        <span className="whitespace-nowrap text-xs text-[var(--color-text-primary)]">{formatTime(value, language)}</span>
      ),
    },
    {
      key: 'actions',
      title: t('browserList.columns.actions'),
      align: 'right',
      width: 220,
      render: (_, record) => {
        const isStarting = isProfileStarting(record.profileId)
        const isStopping = isProfileStopping(record.profileId)
        const isBusy = isProfileBusy(record.profileId)

        return (
          <div className="flex justify-end gap-1">
            {record.running ? (
              <Button size="sm" variant="secondary" onClick={() => onStop(record.profileId)} title={t('browserList.actions.stop')} loading={isStopping}>
                {!isStopping && <Square className="w-3.5 h-3.5" />}
              </Button>
            ) : (
              <Button size="sm" onClick={() => onStart(record.profileId)} title={t('browserList.actions.launch')} loading={isStarting}>
                {!isStarting && <Play className="w-3.5 h-3.5 fill-current" />}
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={() => onRestart(record.profileId)} title={t('browserList.actions.restart')} disabled={isBusy}><RotateCcw className="w-3.5 h-3.5" /></Button>
            <Button size="sm" variant="ghost" onClick={() => onOpenKeywords(record)} title={t('browserList.actions.keywords')} disabled={isBusy}><Key className="w-3.5 h-3.5" /></Button>
            <Link to={`/browser/edit/${record.profileId}`}><Button size="sm" variant="ghost" title={t('browserList.actions.configure')} disabled={isBusy}><Settings className="w-3.5 h-3.5" /></Button></Link>
            <Button size="sm" variant="ghost" onClick={() => onOpenCopy(record)} title={t('browserList.actions.clone')} disabled={isBusy}><Copy className="w-3.5 h-3.5" /></Button>
            <Button size="sm" variant="ghost" onClick={() => onDelete(record.profileId)} title={t('common.actions.delete')} disabled={isBusy}><Trash2 className="w-3.5 h-3.5 text-red-500" /></Button>
          </div>
        )
      },
    },
  ]

  useEffect(() => {
    if (loading || viewMode !== 'table' || didRestoreTableScrollRef.current) return
    didRestoreTableScrollRef.current = true
    const scrollLeft = getBrowserListTableScrollLeft()
    if (scrollLeft <= 0) return
    window.requestAnimationFrame(() => {
      if (tableScrollRef.current) {
        tableScrollRef.current.scrollLeft = scrollLeft
      }
    })
  }, [loading, profiles.length, viewMode])

  return (
    <Card padding="none">
      <div className="overflow-auto" style={{ maxHeight: 'calc(100vh - 320px)' }}>
        {loading ? (
          <div className="py-16 flex items-center justify-center text-sm text-[var(--color-text-muted)]">{t('common.loading')}</div>
        ) : profiles.length === 0 ? (
          <div className="py-16 flex items-center justify-center text-sm text-[var(--color-text-muted)]">{t('common.empty')}</div>
        ) : viewMode === 'table' ? (
          <Table
            columns={columns}
            data={profiles}
            rowKey="profileId"
            tableMinWidth="1180px"
            onSort={onSortChange}
            sortColumn={sortColumn}
            sortOrder={sortOrder}
            scrollContainerRef={tableScrollRef}
            onScroll={(event) => saveBrowserListTableScrollLeft(event.currentTarget.scrollLeft)}
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-[500px] p-4 items-start content-start">
            {profiles.map((profile) => (
              <BrowserProfileCard
                key={profile.profileId}
                profile={profile}
                serialNumber={serialNumbers.get(profile.profileId) ?? 0}
                proxy={proxies.find(item => item.proxyId === profile.proxyId)}
                groupLabel={getGroupLabel(profile)}
                isSelected={selectedIds.has(profile.profileId)}
                status={getProfileStatus(profile)}
                coreLabel={resolveProfileCore(profile)?.coreName || getProfileCoreLabel(profile)}
                isStarting={isProfileStarting(profile.profileId)}
                isStopping={isProfileStopping(profile.profileId)}
                isBusy={isProfileBusy(profile.profileId)}
                proxyTestState={proxyTestStates[profile.profileId]}
                onToggleSelect={onToggleSelect}
                onStart={onStart}
                onStop={onStop}
                onRestart={onRestart}
                onTestProxy={onTestProxy}
                onOpenKeywords={onOpenKeywords}
                onOpenCopy={onOpenCopy}
                onDelete={onDelete}
              />
            ))}
          </div>
        )}
      </div>
      {!loading && totalCount > 0 && (
        <PaginationBar
          totalCount={totalCount}
          currentPage={currentPage}
          pageSize={pageSize}
          totalPages={totalPages}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
        />
      )}
    </Card>
  )
}

function PaginationBar({
  totalCount,
  currentPage,
  pageSize,
  totalPages,
  onPageChange,
  onPageSizeChange,
}: {
  totalCount: number
  currentPage: number
  pageSize: number
  totalPages: number
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
}) {
  const { t } = useI18n()
  const pages = buildVisiblePages(currentPage, totalPages)
  const canPrev = currentPage > 1
  const canNext = currentPage < totalPages

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-border-muted)] bg-[var(--color-bg-surface)] px-4 py-3 text-sm text-[var(--color-text-secondary)]">
      <div className="flex items-center gap-3">
        <span>{t('browserList.pagination.totalPrefix')} {totalCount} {t('browserList.pagination.totalSuffix')}</span>
        <select
          className="h-8 rounded-md border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] px-2 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent)]"
          value={pageSize}
          onChange={(event) => onPageSizeChange(Number(event.target.value))}
        >
          {[10, 20, 50, 100].map((size) => (
            <option key={size} value={size}>{size}{t('browserList.pagination.pageSizeSuffix')}</option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          className="flex h-8 w-8 items-center justify-center rounded-md border border-transparent text-[var(--color-text-muted)] transition-colors hover:border-[var(--color-border-default)] hover:text-[var(--color-text-primary)] disabled:cursor-not-allowed disabled:opacity-40"
          disabled={!canPrev}
          onClick={() => canPrev && onPageChange(currentPage - 1)}
          title={t('browserList.pagination.previous')}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {pages.map((page, index) => (
          page === 'ellipsis' ? (
            <span key={`ellipsis-${index}`} className="px-2 text-[var(--color-text-muted)]">...</span>
          ) : (
            <button
              key={page}
              type="button"
              className={`h-8 min-w-8 rounded-md px-2 text-sm font-medium transition-colors ${
                page === currentPage
                  ? 'bg-[var(--color-accent)] text-[var(--color-text-inverse)]'
                  : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-muted)] hover:text-[var(--color-text-primary)]'
              }`}
              onClick={() => onPageChange(page)}
            >
              {page}
            </button>
          )
        ))}

        <button
          type="button"
          className="flex h-8 w-8 items-center justify-center rounded-md border border-transparent text-[var(--color-text-muted)] transition-colors hover:border-[var(--color-border-default)] hover:text-[var(--color-text-primary)] disabled:cursor-not-allowed disabled:opacity-40"
          disabled={!canNext}
          onClick={() => canNext && onPageChange(currentPage + 1)}
          title={t('browserList.pagination.next')}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

function buildVisiblePages(currentPage: number, totalPages: number): Array<number | 'ellipsis'> {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1)
  }

  const pages = new Set([1, totalPages, currentPage - 1, currentPage, currentPage + 1])
  const sorted = Array.from(pages)
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((a, b) => a - b)

  return sorted.reduce<Array<number | 'ellipsis'>>((result, page) => {
    const previous = result[result.length - 1]
    if (typeof previous === 'number' && page - previous > 1) {
      result.push('ellipsis')
    }
    result.push(page)
    return result
  }, [])
}
