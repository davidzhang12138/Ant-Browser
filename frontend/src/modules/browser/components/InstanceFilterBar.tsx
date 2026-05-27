import { useState } from 'react'
import { ChevronDown, ChevronRight, Filter, X } from 'lucide-react'
import { Input, Select } from '../../../shared/components'
import { useI18n } from '../../../shared/i18n'
import { TagFilterBar } from './TagFilterBar'
import type { BrowserCore, BrowserProxy, BrowserGroupWithCount } from '../types'

export interface InstanceFilters {
  keyword: string
  status: '' | 'running' | 'stopped'
  proxyId: string
  coreId: string
  tags: Set<string>
  kwSearch: string
  groupId: string   // '' = 全部, '__ungrouped__' = 未分组, 其他 = 具体分组ID
}

export const EMPTY_FILTERS: InstanceFilters = {
  keyword: '',
  status: '',
  proxyId: '',
  coreId: '',
  tags: new Set(),
  kwSearch: '',
  groupId: '',
}

export function isFiltersEmpty(f: InstanceFilters) {
  return !f.keyword && !f.status && !f.proxyId && !f.coreId && f.tags.size === 0 && !f.kwSearch && !f.groupId
}

interface Props {
  filters: InstanceFilters
  onChange: (f: InstanceFilters) => void
  proxies: BrowserProxy[]
  cores: BrowserCore[]
  allTags: string[]
  groups: BrowserGroupWithCount[]
}

export function InstanceFilterBar({ filters, onChange, proxies, cores, allTags, groups }: Props) {
  const { t } = useI18n()
  const [collapsed, setCollapsed] = useState(false)

  const set = <K extends keyof InstanceFilters>(key: K, value: InstanceFilters[K]) =>
    onChange({ ...filters, [key]: value })

  const hasFilter = !isFiltersEmpty(filters)
  const activeCount = [filters.keyword, filters.status, filters.proxyId, filters.coreId, filters.kwSearch, filters.groupId].filter(Boolean).length + filters.tags.size

  return (
    <div className="space-y-2">
      <div
        className="flex items-center gap-1.5 cursor-pointer select-none text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
        onClick={() => setCollapsed(prev => !prev)}
      >
        {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        <Filter className="w-3.5 h-3.5" />
        <span>{t('browserList.filters.title')}</span>
        {collapsed && activeCount > 0 && (
          <span className="ml-1 px-1.5 py-0.5 text-[10px] font-medium bg-[var(--color-accent)]/10 text-[var(--color-accent)] rounded-full">
            {activeCount}
          </span>
        )}
      </div>

      {!collapsed && (
        <>
          <div className="flex items-center gap-2 flex-wrap">
            <Input
              value={filters.keyword}
              onChange={e => set('keyword', e.target.value)}
              placeholder={t('browserList.filters.keywordPlaceholder')}
              style={{ width: '180px' }}
            />
            <Select
              value={filters.status}
              onChange={e => set('status', e.target.value as InstanceFilters['status'])}
              options={[
                { value: '', label: t('browserList.filters.allStatus') },
                { value: 'running', label: t('browserList.status.running') },
                { value: 'stopped', label: t('browserList.status.stopped') },
              ]}
              style={{ width: '120px' }}
            />
            <Select
              value={filters.proxyId}
              onChange={e => set('proxyId', e.target.value)}
              options={[
                { value: '', label: t('browserList.filters.allProxy') },
                { value: '__none__', label: t('browserList.filters.noneProxy') },
                ...proxies.map(p => ({ value: p.proxyId, label: p.proxyName || p.proxyId })),
              ]}
              style={{ width: '150px' }}
            />
            <Select
              value={filters.coreId}
              onChange={e => set('coreId', e.target.value)}
              options={[
                { value: '', label: t('browserList.filters.allCore') },
                ...cores.map(c => ({ value: c.coreId, label: c.coreName })),
              ]}
              style={{ width: '140px' }}
            />
            <Select
              value={filters.groupId}
              onChange={e => set('groupId', e.target.value)}
              options={[
                { value: '', label: t('browserList.filters.allGroup') },
                { value: '__ungrouped__', label: t('browserList.filters.ungrouped') },
                ...groups.map(g => ({ value: g.groupId, label: g.groupName })),
              ]}
              style={{ width: '140px' }}
            />
            <Input
              value={filters.kwSearch}
              onChange={e => set('kwSearch', e.target.value)}
              placeholder={t('browserList.filters.keywordValuePlaceholder')}
              className="flex-1 min-w-[160px]"
            />
            {hasFilter && (
              <button
                onClick={() => onChange({ ...EMPTY_FILTERS, tags: new Set() })}
                className="flex items-center gap-1 px-2 py-1 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-error)] hover:bg-[var(--color-bg-muted)] rounded transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                {t('browserList.filters.clear')}
              </button>
            )}
          </div>
          <TagFilterBar
            tags={allTags}
            selected={filters.tags}
            onChange={tags => set('tags', tags)}
          />
        </>
      )}
    </div>
  )
}
