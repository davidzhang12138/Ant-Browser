import { useEffect, useRef, useState } from 'react'
import { ChevronDown, ChevronUp, Copy, Pencil, Play, RefreshCw, Square, Trash2 } from 'lucide-react'

import { Button, toast } from '../../../shared/components'
import { useI18n } from '../../../shared/i18n'
import { regenerateBrowserProfileCode, setBrowserProfileCode } from '../api'

interface BatchToolbarProps {
  selectedCount: number
  totalCount: number
  onSelectAll: () => void
  onDeselectAll: () => void
  onBatchStart: () => void
  onBatchStop: () => void
  onBatchDelete: () => void
  batchLoading: boolean
}

export function BatchToolbar({
  selectedCount,
  totalCount,
  onSelectAll,
  onDeselectAll,
  onBatchStart,
  onBatchStop,
  onBatchDelete,
  batchLoading,
}: BatchToolbarProps) {
  const { t } = useI18n()
  if (selectedCount === 0) return null

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/20 rounded-lg">
      <span className="text-sm font-medium text-[var(--color-accent)]">{t('browserList.widgets.selected')} {selectedCount} / {totalCount}</span>
      <div className="flex gap-1.5 ml-auto">
        <Button size="sm" variant="ghost" onClick={onSelectAll}>{t('browserList.actions.selectAll')}</Button>
        <Button size="sm" variant="ghost" onClick={onDeselectAll}>{t('browserList.actions.deselectAll')}</Button>
        <Button size="sm" onClick={onBatchStart} loading={batchLoading} title={t('browserList.actions.batchStart')}>
          <Play className="w-3.5 h-3.5" />{t('browserList.actions.launch')}
        </Button>
        <Button size="sm" variant="secondary" onClick={onBatchStop} loading={batchLoading} title={t('browserList.actions.batchStop')}>
          <Square className="w-3.5 h-3.5" />{t('browserList.actions.stop')}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={onBatchDelete}
          title={t('browserList.actions.batchDelete')}
          className="text-red-500 hover:text-red-600"
        >
          <Trash2 className="w-3.5 h-3.5" />{t('common.actions.delete')}
        </Button>
      </div>
    </div>
  )
}

interface LaunchCodeCellProps {
  profileId: string
  code: string
  onRefresh: () => void
}

export function LaunchCodeCell({ profileId, code, onRefresh }: LaunchCodeCellProps) {
  const { t } = useI18n()
  const [loading, setLoading] = useState(false)

  const handleCopy = () => {
    if (!code) return
    navigator.clipboard.writeText(code).then(() => toast.success(t('browserList.widgets.launchCodeCopied')))
  }

  const handleRegenerate = async () => {
    setLoading(true)
    try {
      await regenerateBrowserProfileCode(profileId)
      onRefresh()
      toast.success(t('browserList.widgets.launchCodeRegenerated'))
    } catch {
      toast.error(t('browserList.widgets.launchCodeRegenerateFailed'))
    } finally {
      setLoading(false)
    }
  }

  const handleCustomCode = async () => {
    const next = prompt(t('browserList.widgets.customCodePrompt'), code || '')
    if (next == null) return

    const value = next.trim()
    if (!value) {
      toast.error(t('browserList.widgets.codeRequired'))
      return
    }

    setLoading(true)
    try {
      const applied = await setBrowserProfileCode(profileId, value)
      onRefresh()
      toast.success(`${t('browserList.widgets.codeUpdated')} ${applied}`)
    } catch (error: any) {
      toast.error(error?.message || t('browserList.widgets.customCodeFailed'))
    } finally {
      setLoading(false)
    }
  }

  if (!code) {
    return <span className="text-[var(--color-text-muted)] text-xs">-</span>
  }

  return (
    <div className="flex items-center gap-1">
      <code className="text-xs font-mono bg-[var(--color-bg-secondary)] px-1.5 py-0.5 rounded text-[var(--color-accent)]">{code}</code>
      <button onClick={handleCopy} className="p-0.5 hover:text-[var(--color-accent)] text-[var(--color-text-muted)] transition-colors" title={t('common.actions.copy')}>
        <Copy className="w-3 h-3" />
      </button>
      <button onClick={handleRegenerate} disabled={loading} className="p-0.5 hover:text-[var(--color-accent)] text-[var(--color-text-muted)] transition-colors disabled:opacity-50" title={t('browserList.actions.regenerate')}>
        <RefreshCw className="w-3 h-3" />
      </button>
      <button onClick={handleCustomCode} disabled={loading} className="p-0.5 hover:text-[var(--color-accent)] text-[var(--color-text-muted)] transition-colors disabled:opacity-50" title={t('browserList.actions.custom')}>
        <Pencil className="w-3 h-3" />
      </button>
    </div>
  )
}

interface KeywordInlineRowProps {
  keywords: string[]
}

export function KeywordInlineRow({ keywords }: KeywordInlineRowProps) {
  const { t } = useI18n()
  const [expanded, setExpanded] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [isOverflowing, setIsOverflowing] = useState(false)

  useEffect(() => {
    if (containerRef.current) {
      setIsOverflowing(containerRef.current.scrollHeight > 36)
    }
  }, [keywords])

  if (!keywords?.length) {
    return <span className="text-xs text-[var(--color-text-muted)] italic">{t('browserList.widgets.noKeywords')}</span>
  }

  return (
    <div className="flex items-start gap-4 w-full">
      <div
        ref={containerRef}
        className={`flex flex-wrap gap-2 flex-1 transition-all duration-300 ${expanded ? '' : 'overflow-hidden max-h-[32px]'}`}
      >
        {keywords.map((keyword, index) => (
          <span
            key={index}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs bg-[var(--color-bg-surface)] border border-[var(--color-border-default)] text-[var(--color-text-secondary)] max-w-[200px]"
            title={keyword}
          >
            <span className="text-[var(--color-text-muted)] font-mono shrink-0">{index + 1}.</span>
            <span className="truncate">{keyword}</span>
          </span>
        ))}
      </div>
      {isOverflowing && (
        <button
          onClick={() => setExpanded((prev) => !prev)}
          className="shrink-0 flex items-center gap-1 text-xs font-medium text-[var(--color-accent)] hover:text-indigo-400 mt-1 focus:outline-none"
        >
          {expanded ? (
            <>{t('browserList.widgets.collapse')} <ChevronUp className="w-3.5 h-3.5" /></>
          ) : (
            <>{t('browserList.widgets.expandDetails')} <ChevronDown className="w-3.5 h-3.5" /></>
          )}
        </button>
      )}
    </div>
  )
}
