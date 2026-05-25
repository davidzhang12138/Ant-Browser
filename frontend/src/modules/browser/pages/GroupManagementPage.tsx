import { useEffect, useMemo, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { Folder, FolderInput, FolderPlus, Pencil, Plus, RefreshCw, Trash2, X } from 'lucide-react'
import { Badge, Button, Card, FormItem, Input, Modal, Select, toast } from '../../../shared/components'
import type { BrowserGroupInput, BrowserGroupWithCount, BrowserProfile } from '../types'
import { createGroup, deleteGroup, fetchBrowserProfiles, fetchGroups, moveInstancesToGroup, updateGroup } from '../api'

interface GroupNode extends BrowserGroupWithCount {
  children: GroupNode[]
  level: number
}

function buildGroupTree(groups: BrowserGroupWithCount[]): GroupNode[] {
  const map = new Map<string, GroupNode>()
  const roots: GroupNode[] = []

  groups.forEach(group => {
    map.set(group.groupId, { ...group, children: [], level: 0 })
  })

  groups.forEach(group => {
    const node = map.get(group.groupId)
    if (!node) return
    if (group.parentId && map.has(group.parentId)) {
      const parent = map.get(group.parentId)!
      node.level = parent.level + 1
      parent.children.push(node)
    } else {
      roots.push(node)
    }
  })

  const sort = (nodes: GroupNode[]) => {
    nodes.sort((a, b) => a.sortOrder - b.sortOrder || a.groupName.localeCompare(b.groupName, 'zh-CN'))
    nodes.forEach(node => sort(node.children))
  }
  sort(roots)

  return roots
}

function flattenGroupTree(groups: BrowserGroupWithCount[]) {
  const tree = buildGroupTree(groups)
  const result: GroupNode[] = []

  const walk = (nodes: GroupNode[]) => {
    nodes.forEach(node => {
      result.push(node)
      walk(node.children)
    })
  }
  walk(tree)

  return result
}

function groupPath(group: BrowserGroupWithCount, groups: BrowserGroupWithCount[]) {
  const byId = new Map(groups.map(item => [item.groupId, item]))
  const parts = [group.groupName]
  let parentId = group.parentId
  const seen = new Set<string>([group.groupId])
  while (parentId && byId.has(parentId) && !seen.has(parentId)) {
    const parent = byId.get(parentId)!
    parts.unshift(parent.groupName)
    seen.add(parentId)
    parentId = parent.parentId
  }
  return parts.join(' / ')
}

function profilesInGroup(profiles: BrowserProfile[], groupId: string | null) {
  if (groupId === null) return profiles
  if (groupId === '__ungrouped__') return profiles.filter(profile => !profile.groupId)
  return profiles.filter(profile => profile.groupId === groupId)
}

function normalizeGroupName(value: string) {
  return value.trim().replace(/\s+/g, ' ')
}

export function GroupManagementPage() {
  const [groups, setGroups] = useState<BrowserGroupWithCount[]>([])
  const [profiles, setProfiles] = useState<BrowserProfile[]>([])
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)
  const [selectedProfileIds, setSelectedProfileIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [groupModal, setGroupModal] = useState<{ open: boolean; mode: 'create' | 'edit'; group: BrowserGroupWithCount | null; parentId: string }>({
    open: false,
    mode: 'create',
    group: null,
    parentId: '',
  })
  const [groupName, setGroupName] = useState('')
  const [parentId, setParentId] = useState('')

  const flatGroups = useMemo(() => flattenGroupTree(groups), [groups])
  const selectedProfiles = useMemo(() => profilesInGroup(profiles, selectedGroupId), [profiles, selectedGroupId])
  const ungroupedCount = useMemo(() => profiles.filter(profile => !profile.groupId).length, [profiles])
  const selectedGroup = useMemo(() => groups.find(group => group.groupId === selectedGroupId) || null, [groups, selectedGroupId])

  const selectableParentOptions = useMemo(() => {
    const editingId = groupModal.group?.groupId || ''
    const blocked = new Set<string>()
    if (editingId) {
      blocked.add(editingId)
      const collectChildren = (groupId: string) => {
        groups.filter(group => group.parentId === groupId).forEach(child => {
          blocked.add(child.groupId)
          collectChildren(child.groupId)
        })
      }
      collectChildren(editingId)
    }

    return [
      { value: '', label: '根级分组' },
      ...flatGroups
        .filter(group => !blocked.has(group.groupId))
        .map(group => ({
          value: group.groupId,
          label: `${'　'.repeat(group.level)}${group.groupName}`,
        })),
    ]
  }, [flatGroups, groupModal.group, groups])

  const load = async () => {
    setLoading(true)
    try {
      const [groupList, profileList] = await Promise.all([fetchGroups(), fetchBrowserProfiles()])
      setGroups(groupList)
      setProfiles(profileList)
    } catch (error: any) {
      toast.error(error?.message || '加载分组失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])
  useEffect(() => { setSelectedProfileIds(new Set()) }, [selectedGroupId])

  const openCreateGroup = (nextParentId = '') => {
    setGroupName('')
    setParentId(nextParentId)
    setGroupModal({ open: true, mode: 'create', group: null, parentId: nextParentId })
  }

  const openEditGroup = (group: BrowserGroupWithCount) => {
    setGroupName(group.groupName)
    setParentId(group.parentId || '')
    setGroupModal({ open: true, mode: 'edit', group, parentId: group.parentId || '' })
  }

  const closeGroupModal = () => {
    if (saving) return
    setGroupModal({ open: false, mode: 'create', group: null, parentId: '' })
    setGroupName('')
    setParentId('')
  }

  const saveGroup = async () => {
    const name = normalizeGroupName(groupName)
    if (!name) {
      toast.error('请输入分组名称')
      return
    }

    const duplicate = groups.some(group =>
      group.groupId !== groupModal.group?.groupId &&
      group.parentId === parentId &&
      group.groupName.trim().toLowerCase() === name.toLowerCase()
    )
    if (duplicate) {
      toast.error('同级分组名称已存在')
      return
    }

    setSaving(true)
    try {
      const input: BrowserGroupInput = {
        groupName: name,
        parentId,
        sortOrder: groupModal.group?.sortOrder || 0,
      }
      if (groupModal.mode === 'edit' && groupModal.group) {
        await updateGroup(groupModal.group.groupId, input)
        toast.success('分组已更新')
      } else {
        await createGroup(input)
        toast.success('分组已创建')
      }
      setGroupModal({ open: false, mode: 'create', group: null, parentId: '' })
      setGroupName('')
      setParentId('')
      await load()
    } catch (error: any) {
      toast.error(error?.message || '保存分组失败')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteGroup = async (group: BrowserGroupWithCount) => {
    if (!confirm(`确定删除「${group.groupName}」？子分组和实例会移动到上级分组。`)) return
    setSaving(true)
    try {
      await deleteGroup(group.groupId)
      toast.success('分组已删除')
      if (selectedGroupId === group.groupId) setSelectedGroupId(null)
      await load()
    } catch (error: any) {
      toast.error(error?.message || '删除分组失败')
    } finally {
      setSaving(false)
    }
  }

  const toggleProfile = (profileId: string) => {
    setSelectedProfileIds(prev => {
      const next = new Set(prev)
      next.has(profileId) ? next.delete(profileId) : next.add(profileId)
      return next
    })
  }

  const allSelected = selectedProfiles.length > 0 && selectedProfiles.every(profile => selectedProfileIds.has(profile.profileId))
  const partiallySelected = !allSelected && selectedProfiles.some(profile => selectedProfileIds.has(profile.profileId))

  const toggleAllProfiles = () => {
    if (allSelected) {
      setSelectedProfileIds(new Set())
      return
    }
    setSelectedProfileIds(new Set(selectedProfiles.map(profile => profile.profileId)))
  }

  const moveSelected = async (targetGroupId: string) => {
    const ids = Array.from(selectedProfileIds)
    if (ids.length === 0) return
    setSaving(true)
    try {
      await moveInstancesToGroup(ids, targetGroupId)
      toast.success(`已移动 ${ids.length} 个实例`)
      setSelectedProfileIds(new Set())
      await load()
    } catch (error: any) {
      toast.error(error?.message || '移动实例失败')
    } finally {
      setSaving(false)
    }
  }

  const handleGroupKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      void saveGroup()
    }
    if (event.key === 'Escape') {
      closeGroupModal()
    }
  }

  return (
    <div className="flex h-full gap-4 animate-fade-in">
      <Card padding="none" className="w-72 shrink-0 overflow-hidden">
        <div className="flex items-center justify-between border-b border-[var(--color-border-muted)] px-4 py-3">
          <div>
            <h1 className="text-sm font-semibold text-[var(--color-text-primary)]">分组管理</h1>
            <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">维护实例分组和归属</p>
          </div>
          <button
            type="button"
            className="rounded-md p-1.5 text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-bg-muted)] hover:text-[var(--color-accent)]"
            onClick={() => openCreateGroup()}
            title="新建分组"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        <div className="h-[calc(100%-57px)] overflow-auto py-2">
          <button
            type="button"
            className={`flex w-full items-center gap-2 px-4 py-2 text-left text-sm transition-colors ${
              selectedGroupId === null
                ? 'bg-[var(--color-accent-muted)] text-[var(--color-accent)]'
                : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-muted)]'
            }`}
            onClick={() => setSelectedGroupId(null)}
          >
            <Folder className="h-4 w-4 shrink-0" />
            <span className="flex-1 truncate">全部实例</span>
            <span className="text-xs opacity-70">{profiles.length}</span>
          </button>
          <button
            type="button"
            className={`flex w-full items-center gap-2 px-4 py-2 text-left text-sm transition-colors ${
              selectedGroupId === '__ungrouped__'
                ? 'bg-[var(--color-accent-muted)] text-[var(--color-accent)]'
                : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-muted)]'
            }`}
            onClick={() => setSelectedGroupId('__ungrouped__')}
          >
            <FolderInput className="h-4 w-4 shrink-0" />
            <span className="flex-1 truncate">未分组</span>
            <span className="text-xs opacity-70">{ungroupedCount}</span>
          </button>

          <div className="mt-2 border-t border-[var(--color-border-muted)] pt-2">
            {flatGroups.length === 0 ? (
              <div className="px-4 py-8 text-center text-xs text-[var(--color-text-muted)]">暂无分组</div>
            ) : flatGroups.map(group => (
              <div
                key={group.groupId}
                className={`group flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
                  selectedGroupId === group.groupId
                    ? 'bg-[var(--color-accent-muted)] text-[var(--color-accent)]'
                    : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-muted)]'
                }`}
                style={{ paddingLeft: `${12 + group.level * 18}px` }}
              >
                <button
                  type="button"
                  className="flex min-w-0 flex-1 items-center gap-2 text-left"
                  onClick={() => setSelectedGroupId(group.groupId)}
                  title={groupPath(group, groups)}
                >
                  <Folder className="h-4 w-4 shrink-0 text-amber-500" />
                  <span className="truncate">{group.groupName}</span>
                  <span className="ml-auto text-xs opacity-70">{group.instanceCount}</span>
                </button>
                <button
                  type="button"
                  className="rounded p-1 text-[var(--color-text-muted)] opacity-0 transition-opacity hover:bg-[var(--color-bg-surface)] hover:text-[var(--color-text-primary)] group-hover:opacity-100"
                  onClick={() => openCreateGroup(group.groupId)}
                  title="新建子分组"
                >
                  <FolderPlus className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  className="rounded p-1 text-[var(--color-text-muted)] opacity-0 transition-opacity hover:bg-[var(--color-bg-surface)] hover:text-[var(--color-text-primary)] group-hover:opacity-100"
                  onClick={() => openEditGroup(group)}
                  title="编辑分组"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">
              {selectedGroupId === null ? '全部实例' : selectedGroupId === '__ungrouped__' ? '未分组实例' : selectedGroup?.groupName || '分组实例'}
            </h2>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">
              {selectedGroup ? groupPath(selectedGroup, groups) : '选择左侧分组查看和移动实例'}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => { void load() }} loading={loading}>
              <RefreshCw className="h-4 w-4" />刷新
            </Button>
            <Button onClick={() => openCreateGroup()}>
              <Plus className="h-4 w-4" />新建分组
            </Button>
            {selectedGroup && (
              <>
                <Button variant="secondary" onClick={() => openEditGroup(selectedGroup)}>
                  <Pencil className="h-4 w-4" />编辑
                </Button>
                <Button variant="danger" onClick={() => { void handleDeleteGroup(selectedGroup) }}>
                  <Trash2 className="h-4 w-4" />删除
                </Button>
              </>
            )}
          </div>
        </div>

        {selectedProfileIds.size > 0 && (
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-[var(--color-accent)]/20 bg-[var(--color-accent)]/5 px-4 py-3 text-sm">
            <span className="font-medium text-[var(--color-accent)]">已选 {selectedProfileIds.size} 个实例</span>
            <Select
              className="w-64"
              value="__placeholder__"
              onChange={event => {
                if (event.target.value === '__placeholder__') return
                void moveSelected(event.target.value === '__ungrouped__' ? '' : event.target.value)
              }}
              options={[
                { value: '__placeholder__', label: '移动到...' },
                { value: '__ungrouped__', label: '未分组' },
                ...flatGroups.map(group => ({ value: group.groupId, label: `${'　'.repeat(group.level)}${group.groupName}` })),
              ]}
            />
            <Button size="sm" variant="ghost" onClick={() => setSelectedProfileIds(new Set())}>
              <X className="h-3.5 w-3.5" />取消选择
            </Button>
          </div>
        )}

        <Card padding="none" className="min-h-0 flex-1 overflow-hidden">
          <div className="h-full overflow-auto">
            <table className="min-w-full">
              <thead className="sticky top-0 z-10">
                <tr>
                  <th className="w-10 bg-[var(--color-bg-muted)] px-4 py-3">
                    <input
                      type="checkbox"
                      className="h-4 w-4 cursor-pointer rounded accent-[var(--color-accent)]"
                      checked={allSelected}
                      ref={el => { if (el) el.indeterminate = partiallySelected }}
                      onChange={toggleAllProfiles}
                    />
                  </th>
                  <th className="bg-[var(--color-bg-muted)] px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">实例名称</th>
                  <th className="bg-[var(--color-bg-muted)] px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">当前分组</th>
                  <th className="bg-[var(--color-bg-muted)] px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">关键字</th>
                  <th className="bg-[var(--color-bg-muted)] px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">状态</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border-muted)] bg-[var(--color-bg-surface)]">
                {loading ? (
                  <tr><td colSpan={5} className="px-4 py-16 text-center text-sm text-[var(--color-text-muted)]">加载中...</td></tr>
                ) : selectedProfiles.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-16 text-center text-sm text-[var(--color-text-muted)]">暂无实例</td></tr>
                ) : selectedProfiles.map(profile => {
                  const currentGroup = groups.find(group => group.groupId === profile.groupId)
                  return (
                    <tr
                      key={profile.profileId}
                      className={`cursor-pointer transition-colors ${selectedProfileIds.has(profile.profileId) ? 'bg-[var(--color-accent)]/5' : 'hover:bg-[var(--color-bg-muted)]/50'}`}
                      onClick={() => toggleProfile(profile.profileId)}
                    >
                      <td className="px-4 py-3" onClick={event => event.stopPropagation()}>
                        <input
                          type="checkbox"
                          className="h-4 w-4 cursor-pointer rounded accent-[var(--color-accent)]"
                          checked={selectedProfileIds.has(profile.profileId)}
                          onChange={() => toggleProfile(profile.profileId)}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-[var(--color-text-primary)]">{profile.profileName}</div>
                        <div className="mt-0.5 text-xs text-[var(--color-text-muted)]">{profile.username || profile.profileId}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-[var(--color-text-secondary)]">
                        {currentGroup ? groupPath(currentGroup, groups) : '未分组'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex max-w-md flex-wrap gap-1">
                          {(profile.keywords || []).slice(0, 4).map(keyword => (
                            <Badge key={keyword} variant="default">{keyword}</Badge>
                          ))}
                          {(profile.keywords || []).length === 0 && <span className="text-xs text-[var(--color-text-muted)]">-</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={profile.running ? 'success' : 'warning'} dot>{profile.running ? '运行中' : '已停止'}</Badge>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <Modal
        open={groupModal.open}
        onClose={closeGroupModal}
        title={groupModal.mode === 'edit' ? '编辑分组' : '新建分组'}
        width="420px"
        footer={
          <>
            <Button variant="secondary" onClick={closeGroupModal} disabled={saving}>取消</Button>
            <Button onClick={saveGroup} loading={saving}>{groupModal.mode === 'edit' ? '保存' : '创建'}</Button>
          </>
        }
      >
        <div className="space-y-4">
          <FormItem label="分组名称" required>
            <Input
              autoFocus
              value={groupName}
              onChange={event => setGroupName(event.target.value)}
              onKeyDown={handleGroupKeyDown}
              placeholder="例如：Gmail 主号"
            />
          </FormItem>
          <FormItem label="上级分组">
            <Select
              value={parentId}
              onChange={event => setParentId(event.target.value)}
              options={selectableParentOptions}
            />
          </FormItem>
        </div>
      </Modal>

      {saving && (
        <div className="pointer-events-none fixed inset-0 z-40 bg-black/5" />
      )}
    </div>
  )
}
