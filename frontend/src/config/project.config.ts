/**
 * 项目配置文件
 * 
 * 基于此脚手架创建新项目时，修改此文件即可完成定制
 */

// 项目基础信息
export const projectConfig = {
  name: 'Ant Browser',
  shortName: 'Ant',
  description: '面向多账号隔离、代理绑定和本地环境管理的桌面浏览器工具',
  primaryColor: 'primary',
}

// 导航菜单配置
export interface NavItem {
  name: string
  labelKey: string
  path: string
  icon: string
}

export interface NavSection {
  title: string
  labelKey: string
  items: NavItem[]
}

export const navigationConfig: NavSection[] = [
  {
    title: '主菜单',
    labelKey: 'nav.sections.main',
    items: [
      { name: '控制台', labelKey: 'nav.dashboard', path: '/', icon: 'LayoutDashboard' },
    ]
  },
  {
    title: '指纹浏览器',
    labelKey: 'nav.sections.browser',
    items: [
      { name: '实例列表', labelKey: 'nav.browserList', path: '/browser/list', icon: 'Monitor' },
      { name: '自动化脚本', labelKey: 'nav.automation', path: '/browser/automation', icon: 'Bot' },
      { name: '内核管理', labelKey: 'nav.cores', path: '/browser/cores', icon: 'Cpu' },
      { name: '代理池配置', labelKey: 'nav.proxyPool', path: '/browser/proxy-pool', icon: 'Globe' },
      { name: '默认书签', labelKey: 'nav.bookmarks', path: '/browser/bookmarks', icon: 'Bookmark' },
      { name: '分组管理', labelKey: 'nav.groups', path: '/browser/groups', icon: 'Layers' },
      { name: '标签管理', labelKey: 'nav.tags', path: '/browser/tags', icon: 'Tag' },
    ]
  },
  {
    title: '系统维护',
    labelKey: 'nav.sections.system',
    items: [
      { name: '系统设置', labelKey: 'nav.settings', path: '/settings', icon: 'Settings' },
      { name: '文档中心', labelKey: 'nav.docs', path: '/system/docs', icon: 'BookOpen' },
      { name: '日志查看', labelKey: 'nav.logs', path: '/browser/logs', icon: 'FileText' },
    ]
  },
]

// 功能开关
export const featuresConfig = {
  dashboard: true,
  data: true,
  settings: true,
}

// UI 配置
export const uiConfig = {
  pagination: {
    defaultPageSize: 20,
    pageSizeOptions: [10, 20, 50, 100],
  },
  dateFormat: 'YYYY-MM-DD HH:mm:ss',
  locale: 'zh-CN',
}

export default {
  project: projectConfig,
  navigation: navigationConfig,
  features: featuresConfig,
  ui: uiConfig,
}
