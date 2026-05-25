import { browserMajorFromChromeVersion } from './fingerprintSerializer'

interface CoreVersionCandidate {
  coreId: string
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
    const coreMajor = Number(browserMajorFromChromeVersion(coreChromeVersions[core.coreId] || ''))
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
