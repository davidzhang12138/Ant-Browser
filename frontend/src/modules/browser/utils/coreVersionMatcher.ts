import { browserMajorFromChromeVersion } from './fingerprintSerializer'

interface CoreVersionCandidate {
  coreId: string
  coreName?: string
}

function browserMajorFromCore(core: CoreVersionCandidate, coreChromeVersions: Record<string, string>): number {
  const versionMajor = Number(browserMajorFromChromeVersion(coreChromeVersions[core.coreId] || ''))
  if (Number.isFinite(versionMajor) && versionMajor > 0) {
    return versionMajor
  }
  const nameMajor = String(core.coreName || '').match(/\b(\d{2,3})\b/)?.[1] || ''
  return Number(nameMajor)
}

export function resolveNearestCoreForBrowserMajor(
  browserMajor: string,
  cores: CoreVersionCandidate[],
  coreChromeVersions: Record<string, string>,
): string {
  const target = Number(String(browserMajor || '').trim())
  if (!Number.isFinite(target) || target <= 0) {
    return ''
  }

  let bestCoreId = ''
  let bestDistance = Number.POSITIVE_INFINITY
  for (const core of cores) {
    const coreMajor = browserMajorFromCore(core, coreChromeVersions)
    if (!Number.isFinite(coreMajor) || coreMajor <= 0) {
      continue
    }
    const distance = Math.abs(coreMajor - target)
    if (distance < bestDistance) {
      bestDistance = distance
      bestCoreId = core.coreId
    }
  }
  return bestCoreId
}
