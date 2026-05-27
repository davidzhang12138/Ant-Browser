import { Button, FormItem, Input, Modal, Select, Table, Textarea } from '../../../../shared/components'
import type { TableColumn } from '../../../../shared/components/Table'
import { useI18n } from '../../../../shared/i18n'
import type { ProxyIPHealthResult } from '../../types'

import {
  CHAIN_QUICK_IMPORT_TEMPLATE,
  DIRECT_QUICK_IMPORT_TEMPLATE,
  DIRECT_PROXY_PROTOCOL_OPTIONS,
  type ChainImportForm,
  type DirectImportForm,
  type ProxyDisplayInfo,
  type ProxyImportMode,
} from './helpers'

export interface ProxyEditFormValue {
  proxyName: string
  proxyConfig: string
  dnsServers: string
  groupName: string
}

interface ProxyPoolImportModalProps {
  open: boolean
  groups: string[]
  importMode: ProxyImportMode
  importUrl: string
  importResolvedUrl: string
  importText: string
  importDnsServers: string
  importNamePrefix: string
  importGroupName: string
  chainImportText: string
  directImportText: string
  chainImportForm: ChainImportForm
  directImportForm: DirectImportForm
  fetchingImportUrl: boolean
  canParseImport: boolean
  onClose: () => void
  onParse: () => void
  onFetchImportUrl: () => void
  onImportModeChange: (nextMode: ProxyImportMode) => void
  onImportUrlChange: (nextValue: string) => void
  onImportTextChange: (nextValue: string) => void
  onImportDnsServersChange: (nextValue: string) => void
  onImportNamePrefixChange: (nextValue: string) => void
  onImportGroupNameChange: (nextValue: string) => void
  onChainImportTextChange: (nextValue: string) => void
  onDirectImportTextChange: (nextValue: string) => void
  onApplyChainJSON: () => void
  onApplyDirectText: () => void
  onChainImportFormChange: (patch: Partial<ChainImportForm>) => void
  onChainImportHopChange: (hop: 'first' | 'second', field: keyof ChainImportForm['first'], value: string) => void
  onFillChainTemplate: () => void
  onCopyChainTemplate: () => void
  onFillDirectTemplate: () => void
  onCopyDirectTemplate: () => void
  onDirectImportFormChange: (patch: Partial<DirectImportForm>) => void
}

export function ProxyPoolImportModal({
  open,
  groups,
  importMode,
  importUrl,
  importResolvedUrl,
  importText,
  importDnsServers,
  importNamePrefix,
  importGroupName,
  chainImportText,
  directImportText,
  chainImportForm,
  directImportForm,
  fetchingImportUrl,
  canParseImport,
  onClose,
  onParse,
  onFetchImportUrl,
  onImportModeChange,
  onImportUrlChange,
  onImportTextChange,
  onImportDnsServersChange,
  onImportNamePrefixChange,
  onImportGroupNameChange,
  onChainImportTextChange,
  onDirectImportTextChange,
  onApplyChainJSON,
  onApplyDirectText,
  onChainImportFormChange,
  onChainImportHopChange,
  onFillChainTemplate,
  onCopyChainTemplate,
  onFillDirectTemplate,
  onCopyDirectTemplate,
  onDirectImportFormChange,
}: ProxyPoolImportModalProps) {
  const { t } = useI18n()
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('proxy.modals.importTitle')}
      width="600px"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={fetchingImportUrl}>
            {t('common.actions.cancel')}
          </Button>
          <Button onClick={onParse} disabled={fetchingImportUrl || !canParseImport}>
            {t('proxy.actions.parse')}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-2">
          <Button
            variant={importMode === 'clash' ? undefined : 'secondary'}
            onClick={() => onImportModeChange('clash')}
          >
            {t('proxy.modals.clashMode')}
          </Button>
          <Button
            variant={importMode === 'direct' ? undefined : 'secondary'}
            onClick={() => onImportModeChange('direct')}
          >
            {t('proxy.modals.directMode')}
          </Button>
          <Button
            variant={importMode === 'chain' ? undefined : 'secondary'}
            onClick={() => onImportModeChange('chain')}
          >
            {t('proxy.modals.chainMode')}
          </Button>
        </div>
        <p className="text-sm text-[var(--color-text-muted)]">
          {importMode === 'clash'
            ? t('proxy.modals.clashDescription')
            : importMode === 'direct'
              ? t('proxy.modals.directDescription')
              : t('proxy.modals.chainDescription')}
        </p>
        {importMode === 'clash' && (
          <>
            <FormItem label={t('proxy.modals.subscriptionUrl')}>
              <div className="flex gap-2">
                <Input
                  value={importUrl}
                  onChange={(event) => onImportUrlChange(event.target.value)}
                  placeholder={t('proxy.modals.subscriptionUrlPlaceholder')}
                  className="flex-1"
                />
                <Button
                  variant="secondary"
                  onClick={onFetchImportUrl}
                  loading={fetchingImportUrl}
                  disabled={!importUrl.trim()}
                >
                  {t('proxy.actions.fetchFromUrl')}
                </Button>
              </div>
              {importResolvedUrl.trim() && (
                <p className="text-xs text-[var(--color-success)] mt-1 break-all">
                  {t('proxy.modals.boundSubscription')}：{importResolvedUrl}
                </p>
              )}
              <p className="text-xs text-[var(--color-text-muted)] mt-1">
                {t('proxy.modals.subscriptionHelp')}
              </p>
            </FormItem>
            <Textarea
              value={importText}
              onChange={(event) => onImportTextChange(event.target.value)}
              rows={12}
              placeholder={`proxies:\n  - name: vless-v6\n    type: vless\n    server: example.com\n    port: 443\n    uuid: your-uuid\n    ...`}
            />
          </>
        )}
        {importMode === 'direct' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormItem label={t('proxy.modals.proxyProtocol')} required>
                <Select
                  options={[...DIRECT_PROXY_PROTOCOL_OPTIONS]}
                  value={directImportForm.protocol}
                  onChange={(event) =>
                    onDirectImportFormChange({ protocol: event.target.value as DirectImportForm['protocol'] })
                  }
                />
              </FormItem>
              <FormItem label={t('proxy.modals.proxyNameOptional')}>
                <Input
                  value={directImportForm.proxyName}
                  onChange={(event) => onDirectImportFormChange({ proxyName: event.target.value })}
                  placeholder={t('proxy.modals.nodeName')}
                />
              </FormItem>
              <FormItem label={t('proxy.modals.proxyAddress')} required>
                <Input
                  value={directImportForm.server}
                  onChange={(event) => onDirectImportFormChange({ server: event.target.value })}
                  placeholder={t('proxy.modals.proxyAddressExample')}
                />
              </FormItem>
              <FormItem label={t('proxy.modals.proxyPort')} required>
                <Input
                  type="number"
                  min={1}
                  max={65535}
                  value={directImportForm.port}
                  onChange={(event) => onDirectImportFormChange({ port: event.target.value })}
                  placeholder={t('proxy.modals.proxyPortExample')}
                />
              </FormItem>
              <FormItem label={t('proxy.modals.usernameOptional')}>
                <Input
                  value={directImportForm.username}
                  onChange={(event) => onDirectImportFormChange({ username: event.target.value })}
                  placeholder={t('proxy.modals.noAuthPlaceholder')}
                />
              </FormItem>
              <FormItem label={t('proxy.modals.passwordOptional')}>
                <Input
                  type="password"
                  value={directImportForm.password}
                  onChange={(event) => onDirectImportFormChange({ password: event.target.value })}
                  placeholder={t('proxy.modals.noPasswordPlaceholder')}
                />
              </FormItem>
            </div>
            <FormItem label={t('proxy.modals.textHelper')} hint={t('proxy.modals.textHelperHint')}>
              <Textarea
                value={directImportText}
                onChange={(event) => onDirectImportTextChange(event.target.value)}
                rows={8}
                placeholder={DIRECT_QUICK_IMPORT_TEMPLATE}
              />
              <div className="mt-2 flex gap-2">
                <Button size="sm" variant="secondary" onClick={onFillDirectTemplate}>
                  {t('proxy.actions.fillTemplate')}
                </Button>
                <Button size="sm" variant="secondary" onClick={onCopyDirectTemplate}>
                  {t('proxy.actions.copyTemplate')}
                </Button>
                <Button size="sm" variant="secondary" onClick={onApplyDirectText} disabled={!directImportText.trim()}>
                  {t('proxy.actions.applyText')}
                </Button>
              </div>
              <p className="mt-2 text-xs text-[var(--color-text-muted)]">
                {t('proxy.modals.directTextHelp')}
              </p>
            </FormItem>
          </div>
        )}
        {importMode === 'chain' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormItem label={t('proxy.modals.proxyNameOptional')}>
                <Input
                  value={chainImportForm.proxyName}
                  onChange={(event) => onChainImportFormChange({ proxyName: event.target.value })}
                  placeholder={t('proxy.modals.nodeName')}
                />
              </FormItem>
              <FormItem label={t('proxy.modals.localPortOptional')}>
                <Input
                  type="number"
                  min={1}
                  max={65535}
                  value={chainImportForm.localPort}
                  onChange={(event) => onChainImportFormChange({ localPort: event.target.value })}
                  placeholder={t('proxy.modals.autoAssign')}
                />
              </FormItem>
            </div>
            <div className="rounded-md border border-[var(--color-border)] p-3 space-y-3">
              <h4 className="text-sm font-medium text-[var(--color-text-primary)]">{t('proxy.modals.firstHop')}</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormItem label={t('proxy.modals.protocol')}>
                  <Select
                    value={chainImportForm.first.protocol}
                    onChange={(event) => onChainImportHopChange('first', 'protocol', event.target.value)}
                    options={[
                      { value: 'http', label: 'HTTP' },
                      { value: 'socks5', label: 'SOCKS5' },
                    ]}
                  />
                </FormItem>
                <FormItem label={t('proxy.modals.proxyAddress')} required>
                  <Input
                    value={chainImportForm.first.server}
                    onChange={(event) => onChainImportHopChange('first', 'server', event.target.value)}
                    placeholder={t('proxy.modals.proxyAddress')}
                  />
                </FormItem>
                <FormItem label={t('proxy.modals.proxyPort')} required>
                  <Input
                    type="number"
                    min={1}
                    max={65535}
                    value={chainImportForm.first.port}
                    onChange={(event) => onChainImportHopChange('first', 'port', event.target.value)}
                    placeholder={t('proxy.port')}
                  />
                </FormItem>
                <FormItem label={t('proxy.modals.usernameOptional')}>
                  <Input
                    value={chainImportForm.first.username}
                    onChange={(event) => onChainImportHopChange('first', 'username', event.target.value)}
                  />
                </FormItem>
                <FormItem label={t('proxy.modals.passwordOptional')}>
                  <Input
                    type="password"
                    value={chainImportForm.first.password}
                    onChange={(event) => onChainImportHopChange('first', 'password', event.target.value)}
                  />
                </FormItem>
              </div>
            </div>
            <div className="rounded-md border border-[var(--color-border)] p-3 space-y-3">
              <h4 className="text-sm font-medium text-[var(--color-text-primary)]">{t('proxy.modals.secondHop')}</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormItem label={t('proxy.modals.protocol')}>
                  <Select
                    value={chainImportForm.second.protocol}
                    onChange={(event) => onChainImportHopChange('second', 'protocol', event.target.value)}
                    options={[
                      { value: 'http', label: 'HTTP' },
                      { value: 'socks5', label: 'SOCKS5' },
                    ]}
                  />
                </FormItem>
                <FormItem label={t('proxy.modals.proxyAddress')} required>
                  <Input
                    value={chainImportForm.second.server}
                    onChange={(event) => onChainImportHopChange('second', 'server', event.target.value)}
                    placeholder={t('proxy.modals.proxyAddress')}
                  />
                </FormItem>
                <FormItem label={t('proxy.modals.proxyPort')} required>
                  <Input
                    type="number"
                    min={1}
                    max={65535}
                    value={chainImportForm.second.port}
                    onChange={(event) => onChainImportHopChange('second', 'port', event.target.value)}
                    placeholder={t('proxy.port')}
                  />
                </FormItem>
                <FormItem label={t('proxy.modals.usernameOptional')}>
                  <Input
                    value={chainImportForm.second.username}
                    onChange={(event) => onChainImportHopChange('second', 'username', event.target.value)}
                  />
                </FormItem>
                <FormItem label={t('proxy.modals.passwordOptional')}>
                  <Input
                    type="password"
                    value={chainImportForm.second.password}
                    onChange={(event) => onChainImportHopChange('second', 'password', event.target.value)}
                  />
                </FormItem>
              </div>
            </div>
            <FormItem label={t('proxy.modals.jsonHelper')}>
              <Textarea
                value={chainImportText}
                onChange={(event) => onChainImportTextChange(event.target.value)}
                rows={10}
                placeholder={CHAIN_QUICK_IMPORT_TEMPLATE}
              />
              <div className="mt-2 flex gap-2">
                <Button size="sm" variant="secondary" onClick={onFillChainTemplate}>
                  {t('proxy.actions.fillTemplate')}
                </Button>
                <Button size="sm" variant="secondary" onClick={onCopyChainTemplate}>
                  {t('proxy.actions.copyTemplate')}
                </Button>
                <Button size="sm" variant="secondary" onClick={onApplyChainJSON} disabled={!chainImportText.trim()}>
                  {t('proxy.actions.applyJson')}
                </Button>
              </div>
            </FormItem>
          </div>
        )}
        <FormItem label={t('proxy.modals.groupNameOptional')}>
          <Input
            value={importGroupName}
            onChange={(event) => onImportGroupNameChange(event.target.value)}
            placeholder={t('proxy.modals.groupNamePlaceholder')}
            list="proxy-groups-datalist"
          />
          {groups.length > 0 && (
            <datalist id="proxy-groups-datalist">
              {groups.map((group) => (
                <option key={group} value={group} />
              ))}
            </datalist>
          )}
          <p className="text-xs text-[var(--color-text-muted)] mt-1">
            {t('proxy.modals.groupHelp')}
          </p>
        </FormItem>
        {importMode === 'clash' && (
          <FormItem label={t('proxy.modals.namePrefixOptional')}>
            <Input
              value={importNamePrefix}
              onChange={(event) => onImportNamePrefixChange(event.target.value)}
              placeholder={t('proxy.modals.namePrefixExample')}
            />
            <p className="text-xs text-[var(--color-text-muted)] mt-1">
              {t('proxy.modals.namePrefixHelp')} <code className="px-1 bg-[var(--color-bg-secondary)] rounded">{t('proxy.modals.namePrefixCode')}</code>{t('proxy.modals.namePrefixHelpSuffix')}
            </p>
          </FormItem>
        )}
        {importMode === 'clash' && (
          <FormItem label={t('proxy.modals.batchDns')}>
            <Textarea
              value={importDnsServers}
              onChange={(event) => onImportDnsServersChange(event.target.value)}
              rows={5}
              placeholder={`dns:\n  enable: true\n  nameserver:\n    - 119.29.29.29\n    - 223.5.5.5`}
            />
            <p className="text-xs text-[var(--color-text-muted)] mt-1">
              {t('proxy.modals.batchDnsHelp')}
            </p>
          </FormItem>
        )}
      </div>
    </Modal>
  )
}

interface ProxyPoolPreviewModalProps {
  open: boolean
  importMode: ProxyImportMode
  importDnsServers: string
  previewList: ProxyDisplayInfo[]
  removedPreviewProxyNames: string[]
  importing: boolean
  onClose: () => void
  onBack: () => void
  onConfirm: () => void
  onRemoveProxy: (proxyId: string) => void
}

export function ProxyPoolPreviewModal({
  open,
  importMode,
  importDnsServers,
  previewList,
  removedPreviewProxyNames,
  importing,
  onClose,
  onBack,
  onConfirm,
  onRemoveProxy,
}: ProxyPoolPreviewModalProps) {
  const { t } = useI18n()
  const previewColumns: TableColumn<ProxyDisplayInfo>[] = [
    { key: 'proxyName', title: t('proxy.columns.proxyName'), width: '200px' },
    { key: 'type', title: t('proxy.columns.type'), width: '100px' },
    { key: 'server', title: t('proxy.columns.server'), width: '200px' },
    { key: 'port', title: t('proxy.columns.port'), width: '100px', render: (value) => value || '-' },
    {
      key: 'actions',
      title: t('proxy.columns.actions'),
      width: '96px',
      render: (_, record) => (
        <Button size="sm" variant="danger" onClick={() => onRemoveProxy(record.proxyId)}>
          {t('proxy.actions.delete')}
        </Button>
      ),
    },
  ]

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('proxy.modals.previewTitle')}
      width="700px"
      footer={
        <>
          <Button variant="secondary" onClick={onBack}>
            {t('proxy.actions.backToEdit')}
          </Button>
          <Button onClick={onConfirm} loading={importing} disabled={previewList.length === 0}>
            {t('proxy.actions.confirmImport')}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        {importMode === 'clash' && importDnsServers.trim() && (
          <p className="text-xs text-[var(--color-text-muted)] bg-[var(--color-bg-secondary)] px-3 py-2 rounded">
            {t('proxy.modals.batchDnsConfigured')}
          </p>
        )}
        <p className="text-xs text-[var(--color-text-muted)]">
          {t('proxy.modals.keepCount')} {previewList.length}，{t('proxy.modals.deleteCount')} {removedPreviewProxyNames.length} {t('proxy.modals.previewHelpSuffix')}
        </p>
        <Table columns={previewColumns} data={previewList} rowKey="proxyId" maxHeight="380px" emptyText={t('proxy.modals.noProxyData')} />
      </div>
    </Modal>
  )
}

interface ProxyPoolEditModalProps {
  open: boolean
  saving: boolean
  groups: string[]
  editForm: ProxyEditFormValue
  chainEditMode: boolean
  chainEditForm: ChainImportForm
  onClose: () => void
  onSave: () => void
  onChange: (patch: Partial<ProxyEditFormValue>) => void
  onChainEditFormChange: (patch: Partial<ChainImportForm>) => void
  onChainEditHopChange: (hop: 'first' | 'second', field: keyof ChainImportForm['first'], value: string) => void
}

export function ProxyPoolEditModal({
  open,
  saving,
  groups,
  editForm,
  chainEditMode,
  chainEditForm,
  onClose,
  onSave,
  onChange,
  onChainEditFormChange,
  onChainEditHopChange,
}: ProxyPoolEditModalProps) {
  const { t } = useI18n()
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('proxy.modals.editTitle')}
      width="500px"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('common.actions.cancel')}
          </Button>
          <Button onClick={onSave} loading={saving}>
            {t('proxy.actions.save')}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <FormItem label={t('proxy.columns.proxyName')} required>
          <Input
            value={chainEditMode ? chainEditForm.proxyName : editForm.proxyName}
            onChange={(event) => {
              if (chainEditMode) {
                onChainEditFormChange({ proxyName: event.target.value })
                return
              }
              onChange({ proxyName: event.target.value })
            }}
            placeholder={t('proxy.modals.nodeName')}
          />
        </FormItem>
        <FormItem label={t('proxy.modals.groupNameOptional')}>
          <Input
            value={editForm.groupName}
            onChange={(event) => onChange({ groupName: event.target.value })}
            placeholder={t('proxy.modals.groupNamePlaceholder')}
            list="edit-proxy-groups-datalist"
          />
          <datalist id="edit-proxy-groups-datalist">
            {groups.map((group) => (
              <option key={group} value={group} />
            ))}
          </datalist>
        </FormItem>
        {chainEditMode ? (
          <div className="space-y-4">
            <FormItem label={t('proxy.modals.localPortOptional')}>
              <Input
                type="number"
                min={1}
                max={65535}
                value={chainEditForm.localPort}
                onChange={(event) => onChainEditFormChange({ localPort: event.target.value })}
                placeholder={t('proxy.modals.autoAssign')}
              />
            </FormItem>
            <div className="rounded-md border border-[var(--color-border)] p-3 space-y-3">
              <h4 className="text-sm font-medium text-[var(--color-text-primary)]">{t('proxy.modals.firstHop')}</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormItem label={t('proxy.modals.protocol')}>
                  <Select
                    value={chainEditForm.first.protocol}
                    onChange={(event) => onChainEditHopChange('first', 'protocol', event.target.value)}
                    options={[
                      { value: 'http', label: 'HTTP' },
                      { value: 'socks5', label: 'SOCKS5' },
                    ]}
                  />
                </FormItem>
                <FormItem label={t('proxy.modals.proxyAddress')} required>
                  <Input
                    value={chainEditForm.first.server}
                    onChange={(event) => onChainEditHopChange('first', 'server', event.target.value)}
                  />
                </FormItem>
                <FormItem label={t('proxy.modals.proxyPort')} required>
                  <Input
                    type="number"
                    min={1}
                    max={65535}
                    value={chainEditForm.first.port}
                    onChange={(event) => onChainEditHopChange('first', 'port', event.target.value)}
                  />
                </FormItem>
                <FormItem label={t('proxy.modals.usernameOptional')}>
                  <Input
                    value={chainEditForm.first.username}
                    onChange={(event) => onChainEditHopChange('first', 'username', event.target.value)}
                  />
                </FormItem>
                <FormItem label={t('proxy.modals.passwordOptional')}>
                  <Input
                    type="password"
                    value={chainEditForm.first.password}
                    onChange={(event) => onChainEditHopChange('first', 'password', event.target.value)}
                  />
                </FormItem>
              </div>
            </div>
            <div className="rounded-md border border-[var(--color-border)] p-3 space-y-3">
              <h4 className="text-sm font-medium text-[var(--color-text-primary)]">{t('proxy.modals.secondHop')}</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormItem label={t('proxy.modals.protocol')}>
                  <Select
                    value={chainEditForm.second.protocol}
                    onChange={(event) => onChainEditHopChange('second', 'protocol', event.target.value)}
                    options={[
                      { value: 'http', label: 'HTTP' },
                      { value: 'socks5', label: 'SOCKS5' },
                    ]}
                  />
                </FormItem>
                <FormItem label={t('proxy.modals.proxyAddress')} required>
                  <Input
                    value={chainEditForm.second.server}
                    onChange={(event) => onChainEditHopChange('second', 'server', event.target.value)}
                  />
                </FormItem>
                <FormItem label={t('proxy.modals.proxyPort')} required>
                  <Input
                    type="number"
                    min={1}
                    max={65535}
                    value={chainEditForm.second.port}
                    onChange={(event) => onChainEditHopChange('second', 'port', event.target.value)}
                  />
                </FormItem>
                <FormItem label={t('proxy.modals.usernameOptional')}>
                  <Input
                    value={chainEditForm.second.username}
                    onChange={(event) => onChainEditHopChange('second', 'username', event.target.value)}
                  />
                </FormItem>
                <FormItem label={t('proxy.modals.passwordOptional')}>
                  <Input
                    type="password"
                    value={chainEditForm.second.password}
                    onChange={(event) => onChainEditHopChange('second', 'password', event.target.value)}
                  />
                </FormItem>
              </div>
            </div>
          </div>
        ) : (
          <FormItem label={t('proxy.modals.proxyConfig')}>
            <Textarea
              value={editForm.proxyConfig}
              onChange={(event) => onChange({ proxyConfig: event.target.value })}
              rows={10}
              placeholder={t('proxy.modals.proxyConfigPlaceholder')}
            />
          </FormItem>
        )}
        <FormItem label={t('proxy.modals.dnsServersOptional')}>
          <Textarea
            value={editForm.dnsServers}
            onChange={(event) => onChange({ dnsServers: event.target.value })}
            rows={6}
            placeholder={`dns:\n  enable: true\n  nameserver:\n    - 119.29.29.29\n    - 223.5.5.5`}
          />
          <p className="text-xs text-[var(--color-text-muted)] mt-1">
            {t('proxy.modals.dnsHelp')}
          </p>
        </FormItem>
      </div>
    </Modal>
  )
}

interface ProxyPoolIPHealthDetailModalProps {
  open: boolean
  detail: ProxyIPHealthResult | null
  onClose: () => void
}

export function ProxyPoolIPHealthDetailModal({
  open,
  detail,
  onClose,
}: ProxyPoolIPHealthDetailModalProps) {
  const { t } = useI18n()
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('proxy.modals.ipHealthRawTitle')}
      width="760px"
      footer={
        <Button variant="secondary" onClick={onClose}>
          {t('common.actions.close')}
        </Button>
      }
    >
      <div className="space-y-3">
        {detail && (
          <>
            <div className="text-xs text-[var(--color-text-muted)]">
              {t('proxy.modals.proxyId')}：{detail.proxyId} | {t('proxy.modals.source')}：{detail.source} | {t('proxy.modals.time')}：{detail.updatedAt}
            </div>
            {!detail.ok && <div className="text-sm text-red-500">{detail.error || t('proxy.failure')}</div>}
            <pre className="max-h-[420px] overflow-auto text-xs leading-5 rounded-lg bg-[var(--color-bg-secondary)] border border-[var(--color-border)] p-3">
              {JSON.stringify(detail.rawData || {}, null, 2)}
            </pre>
          </>
        )}
      </div>
    </Modal>
  )
}
