import { useMemo } from 'react'

import { Button, Card, Input, Switch, Table } from '../../../../shared/components'
import type { SortOrder, TableColumn } from '../../../../shared/components/Table'
import { useI18n } from '../../../../shared/i18n'
import type { ProxyIPHealthResult } from '../../types'

import { BUILTIN_PROXY_IDS, sourceHostLabel, type ProxyDisplayInfo } from './helpers'

interface ProxyPoolTableCardProps {
  allFilteredSelected: boolean
  checkingIPHealthIds: Set<string>
  data: ProxyDisplayInfo[]
  filterGroup: string
  filterKeyword: string
  filterProtocol: string
  globalAutoRefreshEnabled: boolean
  globalRefreshInterval: number
  globalRefreshIntervalM: string
  groups: string[]
  ipHealthMap: Record<string, ProxyIPHealthResult>
  loading: boolean
  onCheckOneIPHealth: (record: ProxyDisplayInfo) => void
  onClearFilters: () => void
  onDelete: (proxyId: string) => void
  onEdit: (record: ProxyDisplayInfo) => void
  onFilterGroupChange: (nextValue: string) => void
  onFilterKeywordChange: (nextValue: string) => void
  onFilterProtocolChange: (nextValue: string) => void
  onGlobalAutoRefreshEnabledChange: (checked: boolean) => void
  onGlobalRefreshIntervalMChange: (nextValue: string) => void
  onOpenBatchDelete: () => void
  onOpenIPHealthDetail: (proxyId: string) => void
  onRefreshSingleSource: (sourceId: string) => void
  onSort: (next: { column: string; order: SortOrder }) => void
  onTestOne: (record: ProxyDisplayInfo) => void
  onToggleAll: () => void
  onToggleOne: (proxyId: string) => void
  protocolOptions: string[]
  refreshingSourceIds: Set<string>
  selectedCount: number
  selectedIds: Set<string>
  someFilteredSelected: boolean
  sortColumn: string
  sortOrder: SortOrder
  latencyMap: Record<string, number>
}

export function ProxyPoolTableCard({
  allFilteredSelected,
  checkingIPHealthIds,
  data,
  filterGroup,
  filterKeyword,
  filterProtocol,
  globalAutoRefreshEnabled,
  globalRefreshInterval,
  globalRefreshIntervalM,
  groups,
  ipHealthMap,
  loading,
  onCheckOneIPHealth,
  onClearFilters,
  onDelete,
  onEdit,
  onFilterGroupChange,
  onFilterKeywordChange,
  onFilterProtocolChange,
  onGlobalAutoRefreshEnabledChange,
  onGlobalRefreshIntervalMChange,
  onOpenBatchDelete,
  onOpenIPHealthDetail,
  onRefreshSingleSource,
  onSort,
  onTestOne,
  onToggleAll,
  onToggleOne,
  protocolOptions,
  refreshingSourceIds,
  selectedCount,
  selectedIds,
  someFilteredSelected,
  sortColumn,
  sortOrder,
  latencyMap,
}: ProxyPoolTableCardProps) {
  const { t } = useI18n()
  const hasActiveFilters = filterProtocol !== 'all' || !!filterKeyword || filterGroup !== 'all'

  const renderLatency = (record: ProxyDisplayInfo) => {
    if (record.proxyConfig === 'direct://') {
      return <span className="text-[var(--color-text-muted)] text-xs">{t('proxy.notApplicable')}</span>
    }
    const value = latencyMap[record.proxyId]
    if (value === undefined) return <span className="text-[var(--color-text-muted)] text-xs">-</span>
    if (value === -1) return <span className="text-[var(--color-text-muted)] text-xs animate-pulse">{t('proxy.testing')}</span>
    if (value === -2) return <span className="text-red-500 text-xs">{t('proxy.timeout')}</span>
    if (value === -3) return <span className="text-gray-400 text-xs">{t('proxy.unsupported')}</span>
    if (value === -4) return <span className="text-red-500 text-xs">{t('proxy.failure')}</span>
    const color = value < 200 ? 'text-green-500' : value < 500 ? 'text-yellow-500' : 'text-red-500'
    return <span className={`text-xs font-medium ${color}`}>{value} ms</span>
  }

  const renderIPHealth = (record: ProxyDisplayInfo) => {
    if (record.proxyConfig === 'direct://') {
      return <span className="text-[var(--color-text-muted)] text-xs">{t('proxy.notApplicable')}</span>
    }
    if (checkingIPHealthIds.has(record.proxyId)) {
      return <span className="text-[var(--color-text-muted)] text-xs animate-pulse">{t('proxy.checking')}</span>
    }

    const result = ipHealthMap[record.proxyId]
    if (!result) return <span className="text-[var(--color-text-muted)] text-xs">-</span>
    if (!result.ok) {
      return (
        <div className="flex items-center gap-2">
          <span className="text-xs text-red-500 truncate max-w-[120px]" title={result.error || t('proxy.failure')}>{t('proxy.failure')}</span>
          <Button size="sm" variant="ghost" onClick={(event) => { event.stopPropagation(); onOpenIPHealthDetail(record.proxyId) }}>{t('proxy.actions.raw')}</Button>
        </div>
      )
    }

    const location = [result.country, result.region, result.city].filter(Boolean).join(' / ')
    return (
      <div className="flex items-center gap-2 min-w-0">
        <div className="min-w-0">
          <div className="text-xs text-[var(--color-text-primary)] truncate">{result.ip || '-'}</div>
          <div className="text-[11px] text-[var(--color-text-muted)] truncate">
            {`${t('proxy.fraudScore')} ${result.fraudScore} | ${result.isResidential ? t('proxy.residential') : t('proxy.datacenter')}${location ? ` | ${location}` : ''}`}
          </div>
        </div>
        <Button size="sm" variant="ghost" onClick={(event) => { event.stopPropagation(); onOpenIPHealthDetail(record.proxyId) }}>{t('proxy.actions.raw')}</Button>
      </div>
    )
  }

  const columns = useMemo<TableColumn<ProxyDisplayInfo>[]>(() => [
    {
      key: 'checkbox',
      title: '',
      width: '40px',
      render: (_, record) => (
        <input
          type="checkbox"
          checked={selectedIds.has(record.proxyId)}
          disabled={BUILTIN_PROXY_IDS.has(record.proxyId)}
          onChange={() => onToggleOne(record.proxyId)}
          onClick={event => event.stopPropagation()}
          className="w-4 h-4 rounded border-[var(--color-border-default)] accent-[var(--color-accent)] cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
        />
      ),
    },
    { key: 'proxyName', title: t('proxy.columns.proxyName'), width: '180px', sortable: true },
    {
      key: 'groupName',
      title: t('proxy.columns.group'),
      width: '100px',
      sortable: true,
      render: (value) => value ? <span className="px-1.5 py-0.5 text-xs rounded bg-[var(--color-accent)]/10 text-[var(--color-accent)]">{value}</span> : '-',
    },
    {
      key: 'source',
      title: t('proxy.columns.source'),
      width: '180px',
      render: (_, record) => {
        if (!record.sourceUrl) return '-'
        const host = sourceHostLabel(record.sourceUrl)
        return (
          <div className="text-xs leading-5">
            <div className="text-[var(--color-text-primary)] truncate" title={record.sourceUrl}>{host}</div>
            <div className="text-[var(--color-text-muted)]">
              {globalAutoRefreshEnabled ? `${t('proxy.autoRefresh')} ${globalRefreshInterval} ${t('proxy.filters.minutes')}（${t('proxy.global')}）` : t('proxy.manualRefresh')}
            </div>
          </div>
        )
      },
    },
    {
      key: 'instanceCount',
      title: t('proxy.columns.instanceCount'),
      width: '90px',
      sortable: true,
      render: (value) => (
        <span className={value > 0 ? 'text-xs font-medium text-[var(--color-text-primary)]' : 'text-xs text-[var(--color-text-muted)]'}>
          {value || 0}
        </span>
      ),
    },
    { key: 'type', title: t('proxy.columns.type'), width: '90px', sortable: true },
    { key: 'server', title: t('proxy.columns.server'), width: '180px', sortable: true },
    { key: 'port', title: t('proxy.columns.port'), width: '80px', sortable: true, render: (value) => value || '-' },
    {
      key: 'latency',
      title: t('proxy.columns.latency'),
      width: '90px',
      sortable: true,
      render: (_, record) => renderLatency(record),
    },
    {
      key: 'ipHealth',
      title: (
        <div className="leading-tight">
          <div>{t('proxy.columns.ipHealth')}</div>
          <div className="mt-0.5 text-[10px] font-normal text-[var(--color-text-muted)]">
            {t('proxy.columns.ipHealthHint')}
          </div>
        </div>
      ),
      width: '280px',
      render: (_, record) => renderIPHealth(record),
    },
    {
      key: 'actions',
      title: t('proxy.columns.actions'),
      width: '320px',
      render: (_, record) => {
        const isBuiltin = BUILTIN_PROXY_IDS.has(record.proxyId)
        const sourceId = record.sourceId || ''
        const hasSource = !!sourceId && !!record.sourceUrl
        return (
          <div className="flex gap-2">
            {hasSource && (
              <Button
                size="sm"
                variant="secondary"
                onClick={(event) => { event.stopPropagation(); onRefreshSingleSource(sourceId) }}
                loading={refreshingSourceIds.has(sourceId)}
              >
                {t('proxy.actions.refreshSubscriptions')}
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={(event) => { event.stopPropagation(); onTestOne(record) }}
              loading={latencyMap[record.proxyId] === -1}
              disabled={record.proxyConfig === 'direct://'}
            >
              {t('proxy.actions.speedTest')}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={(event) => { event.stopPropagation(); onCheckOneIPHealth(record) }}
              loading={checkingIPHealthIds.has(record.proxyId)}
              disabled={record.proxyConfig === 'direct://'}
            >
              {t('proxy.actions.checkIPHealth')}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={isBuiltin}
              title={isBuiltin ? t('proxy.builtinEditDisabled') : undefined}
              onClick={(event) => {
                event.stopPropagation()
                if (!isBuiltin) onEdit(record)
              }}
            >
              {t('proxy.actions.edit')}
            </Button>
            <Button
              size="sm"
              variant="danger"
              disabled={isBuiltin}
              title={isBuiltin ? t('proxy.builtinDeleteDisabled') : undefined}
              onClick={(event) => {
                event.stopPropagation()
                if (!isBuiltin) onDelete(record.proxyId)
              }}
            >
              {t('proxy.actions.delete')}
            </Button>
          </div>
        )
      },
    },
  ], [
    checkingIPHealthIds,
    globalAutoRefreshEnabled,
    globalRefreshInterval,
    ipHealthMap,
    latencyMap,
    onCheckOneIPHealth,
    onDelete,
    onEdit,
    onOpenIPHealthDetail,
    onRefreshSingleSource,
    onTestOne,
    onToggleOne,
    refreshingSourceIds,
    selectedIds,
    t,
  ])

  return (
    <Card>
      <div className="flex items-center gap-3 mb-4">
        <Input
          value={filterKeyword}
          onChange={event => onFilterKeywordChange(event.target.value)}
          placeholder={t('proxy.filters.searchPlaceholder')}
          style={{ width: '220px' }}
        />
        <select
          value={filterProtocol}
          onChange={event => onFilterProtocolChange(event.target.value)}
          className="h-9 px-3 text-sm rounded-lg border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-border-strong)] focus:ring-1 focus:ring-[var(--color-border-strong)] transition-colors duration-150"
        >
          {protocolOptions.map(protocol => (
            <option key={protocol} value={protocol}>{protocol === 'all' ? t('proxy.filters.allProtocols') : protocol.toUpperCase()}</option>
          ))}
        </select>
        <select
          value={filterGroup}
          onChange={event => onFilterGroupChange(event.target.value)}
          className="h-9 px-3 text-sm rounded-lg border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-border-strong)] focus:ring-1 focus:ring-[var(--color-border-strong)] transition-colors duration-150"
        >
          <option value="all">{t('proxy.filters.allGroups')}</option>
          {groups.map(group => <option key={group} value={group}>{group}</option>)}
        </select>
        {hasActiveFilters && (
          <Button size="sm" variant="ghost" onClick={onClearFilters}>{t('proxy.actions.clearFilters')}</Button>
        )}
        <div className="flex items-center gap-2 rounded-lg border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] px-2 py-1.5">
          <span className="text-xs text-[var(--color-text-muted)]">{t('proxy.filters.globalAutoRefresh')}</span>
          <Switch
            checked={globalAutoRefreshEnabled}
            onChange={onGlobalAutoRefreshEnabledChange}
          />
          <Input
            type="number"
            min={5}
            max={1440}
            value={globalRefreshIntervalM}
            onChange={event => onGlobalRefreshIntervalMChange(event.target.value)}
            className="w-24"
            disabled={!globalAutoRefreshEnabled}
          />
          <span className="text-xs text-[var(--color-text-muted)]">{t('proxy.filters.minutes')}</span>
        </div>
        <div className="flex-1" />
        {data.length > 0 && (
          <label className="flex items-center gap-1.5 text-sm text-[var(--color-text-muted)] cursor-pointer select-none">
            <input
              type="checkbox"
              checked={allFilteredSelected}
              ref={(element) => {
                if (element) {
                  element.indeterminate = someFilteredSelected && !allFilteredSelected
                }
              }}
              onChange={onToggleAll}
              className="w-4 h-4 rounded border-[var(--color-border-default)] accent-[var(--color-accent)] cursor-pointer"
            />
            {t('proxy.filters.selectAll')}
          </label>
        )}
        {selectedCount > 0 && (
          <Button size="sm" variant="danger" onClick={onOpenBatchDelete}>
            {t('proxy.actions.deleteSelected')} ({selectedCount})
          </Button>
        )}
      </div>
      <Table
        columns={columns}
        data={data}
        rowKey="proxyId"
        loading={loading}
        emptyText={t('proxy.empty')}
        sortColumn={sortColumn}
        sortOrder={sortOrder}
        onSort={onSort}
      />
    </Card>
  )
}
