const browserListReturnPathKey = 'browser:listReturnPath'
const browserListScrollTopKey = 'browser:listScrollTop'
const browserListTableScrollLeftKey = 'browser:listTableScrollLeft'

export function getBrowserListReturnPath(): string {
  return sessionStorage.getItem(browserListReturnPathKey) || '/browser/list'
}

export function saveBrowserListReturnPath(path: string): void {
  sessionStorage.setItem(browserListReturnPathKey, path)
}

export function getBrowserListScrollTop(): number {
  const value = Number(sessionStorage.getItem(browserListScrollTopKey))
  return Number.isFinite(value) && value > 0 ? value : 0
}

export function saveBrowserListScrollTop(scrollTop: number): void {
  sessionStorage.setItem(browserListScrollTopKey, String(Math.max(0, Math.floor(scrollTop || 0))))
}

export function getBrowserListTableScrollLeft(): number {
  const value = Number(sessionStorage.getItem(browserListTableScrollLeftKey))
  return Number.isFinite(value) && value > 0 ? value : 0
}

export function saveBrowserListTableScrollLeft(scrollLeft: number): void {
  sessionStorage.setItem(browserListTableScrollLeftKey, String(Math.max(0, Math.floor(scrollLeft || 0))))
}
